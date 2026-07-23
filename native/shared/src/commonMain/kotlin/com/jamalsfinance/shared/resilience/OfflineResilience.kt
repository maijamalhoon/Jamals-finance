package com.jamalsfinance.shared.resilience

import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable

const val DEFAULT_OFFLINE_CACHE_MAX_AGE_MILLIS: Long = 30L * 24L * 60L * 60L * 1_000L
const val DEFAULT_REFRESH_FRESHNESS_MILLIS: Long = 2L * 60L * 1_000L

@Serializable
data class OfflineSnapshotRecord(
    val payload: String,
    val savedAtMillis: Long,
    val schemaVersion: Int = 1,
)

interface OfflineSnapshotStore {
    suspend fun read(namespace: String, userId: String): OfflineSnapshotRecord?
    suspend fun write(namespace: String, userId: String, record: OfflineSnapshotRecord)
    suspend fun clear(namespace: String, userId: String)
}

interface NetworkMonitor {
    val online: StateFlow<Boolean>
}

fun shouldUseOfflineSnapshot(
    savedAtMillis: Long,
    nowMillis: Long,
    maxAgeMillis: Long = DEFAULT_OFFLINE_CACHE_MAX_AGE_MILLIS,
): Boolean {
    if (savedAtMillis <= 0L || nowMillis <= 0L || maxAgeMillis < 0L) return false
    if (savedAtMillis > nowMillis) return false
    return nowMillis - savedAtMillis <= maxAgeMillis
}

fun shouldRefreshSnapshot(
    lastSuccessfulAtMillis: Long?,
    nowMillis: Long,
    freshnessMillis: Long = DEFAULT_REFRESH_FRESHNESS_MILLIS,
): Boolean {
    val last = lastSuccessfulAtMillis ?: return true
    if (last <= 0L || nowMillis <= 0L || freshnessMillis < 0L) return true
    if (last > nowMillis) return true
    return nowMillis - last >= freshnessMillis
}

fun offlineReadOnlyMessage(hasCachedData: Boolean): String =
    if (hasCachedData) {
        "You're offline. Showing the last securely saved data. Connect to the internet to refresh or make changes."
    } else {
        "You're offline and no saved data is available yet. Connect to the internet and refresh once."
    }

fun offlineWriteMessage(): String =
    "You're offline. Financial changes are not queued; connect to the internet and try again."
