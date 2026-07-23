package com.jamalsfinance.nativeapp.resilience

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.jamalsfinance.shared.resilience.OfflineSnapshotRecord
import com.jamalsfinance.shared.resilience.OfflineSnapshotStore
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AndroidEncryptedSnapshotStore(context: Context) : OfflineSnapshotStore {
    private val directory = File(context.applicationContext.noBackupFilesDir, DIRECTORY).apply { mkdirs() }
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override suspend fun read(namespace: String, userId: String): OfflineSnapshotRecord? =
        withContext(Dispatchers.IO) {
            runCatching {
                val file = cacheFile(namespace, userId)
                if (!file.isFile || file.length() <= 0L || file.length() > MAX_ENCRYPTED_BYTES.toLong()) {
                    return@runCatching null
                }
                val bytes = file.readBytes()
                val ivSize = bytes.firstOrNull()?.toInt()?.and(0xFF) ?: return@runCatching null
                if (ivSize !in 12..32 || bytes.size <= 1 + ivSize) return@runCatching null
                val iv = bytes.copyOfRange(1, 1 + ivSize)
                val encrypted = bytes.copyOfRange(1 + ivSize, bytes.size)
                val cipher = Cipher.getInstance(TRANSFORMATION)
                cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
                val clear = cipher.doFinal(encrypted)
                json.decodeFromString<OfflineSnapshotRecord>(clear.decodeToString())
            }.getOrNull()
        }

    override suspend fun write(namespace: String, userId: String, record: OfflineSnapshotRecord) {
        withContext(Dispatchers.IO) {
            val clear = json.encodeToString(record).encodeToByteArray()
            require(clear.size <= MAX_CLEAR_BYTES) { "Offline snapshot is too large to save safely." }
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
            val encrypted = cipher.doFinal(clear)
            val output = byteArrayOf(cipher.iv.size.toByte()) + cipher.iv + encrypted
            require(output.size <= MAX_ENCRYPTED_BYTES) { "Encrypted offline snapshot is too large." }

            val target = cacheFile(namespace, userId)
            val temporary = File(target.parentFile, "${target.name}.tmp")
            temporary.outputStream().use { stream ->
                stream.write(output)
                stream.fd.sync()
            }
            if (!temporary.renameTo(target)) {
                target.outputStream().use { stream ->
                    stream.write(output)
                    stream.fd.sync()
                }
                temporary.delete()
            }
        }
    }

    override suspend fun clear(namespace: String, userId: String) {
        withContext(Dispatchers.IO) { cacheFile(namespace, userId).delete() }
    }

    private fun cacheFile(namespace: String, userId: String): File {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$namespace|$userId".encodeToByteArray())
            .joinToString("") { byte -> "%02x".format(byte.toInt() and 0xFF) }
        return File(directory, "$digest.cache")
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build(),
            )
            generateKey()
        }
    }

    private companion object {
        const val DIRECTORY = "jamals-finance-offline-cache-v1"
        const val KEY_ALIAS = "jamals_finance_offline_cache_key_v1"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val MAX_CLEAR_BYTES = 8 * 1024 * 1024
        const val MAX_ENCRYPTED_BYTES = MAX_CLEAR_BYTES + 64 * 1024
    }
}
