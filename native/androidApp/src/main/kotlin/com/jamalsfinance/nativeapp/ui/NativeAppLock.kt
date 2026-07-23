package com.jamalsfinance.nativeapp.ui

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.ContextWrapper
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.hardware.fingerprint.FingerprintManager
import android.os.Build
import android.os.CancellationSignal
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.util.concurrent.atomic.AtomicBoolean

private data class NativeAuthenticator(
    val available: Boolean,
    val authenticate: (
        onSuccess: () -> Unit,
        onFailure: (String) -> Unit,
    ) -> Unit,
)

@Composable
internal fun NativeAppLockGate(
    preferences: AndroidNativePreferences,
    content: @Composable () -> Unit,
) {
    val localPreferences by preferences.state.collectAsStateWithLifecycleCompat()
    val lifecycleOwner = LocalLifecycleOwner.current
    val authenticator = rememberNativeAuthenticator()
    var unlocked by rememberSaveable(localPreferences.appLockEnabled) {
        mutableStateOf(!localPreferences.appLockEnabled)
    }
    var unlocking by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(preferences) {
        preferences.lockRequests.collect {
            if (preferences.state.value.appLockEnabled) {
                unlocked = false
                message = null
            }
        }
    }

    DisposableEffect(
        lifecycleOwner,
        localPreferences.appLockEnabled,
        localPreferences.autoLockTimeout,
    ) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> preferences.markBackgrounded()
                Lifecycle.Event.ON_START -> {
                    if (preferences.shouldLockOnResume()) {
                        unlocked = false
                        message = null
                    }
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (!localPreferences.appLockEnabled || unlocked) {
        content()
        return
    }

    NativeAppLockScreen(
        available = authenticator.available,
        unlocking = unlocking,
        message = message,
        onUnlock = {
            if (unlocking) return@NativeAppLockScreen
            unlocking = true
            message = null
            authenticator.authenticate(
                onSuccess = {
                    preferences.clearBackgroundTimestamp()
                    unlocking = false
                    unlocked = true
                },
                onFailure = {
                    unlocking = false
                    message = it
                },
            )
        },
    )
}

@Composable
private fun NativeAppLockScreen(
    available: Boolean,
    unlocking: Boolean,
    message: String?,
    onUnlock: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    Text(
                        text = "JF",
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
                Spacer(Modifier.height(18.dp))
                Text(
                    "Jamal's Finance is locked",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    if (available) {
                        "Verify with biometrics, device PIN, pattern, or password to open your personal finance data."
                    } else {
                        "Set a secure screen lock in Android settings before using App Lock."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                message?.let {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center,
                    )
                }
                Spacer(Modifier.height(22.dp))
                Button(
                    onClick = onUnlock,
                    enabled = available && !unlocking,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text(if (unlocking) "Verifying…" else "Unlock securely")
                }
                if (!available) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = {},
                        enabled = false,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Device security required")
                    }
                }
            }
        }
    }
}

@Composable
private fun rememberNativeAuthenticator(): NativeAuthenticator {
    val context = LocalContext.current
    val activity = remember(context) { context.findComponentActivity() }
    val keyguard = remember(context) {
        context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    }
    val pendingSuccess = remember { mutableStateOf<(() -> Unit)?>(null) }
    val pendingFailure = remember { mutableStateOf<((String) -> Unit)?>(null) }
    val credentialLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val success = pendingSuccess.value
        val failure = pendingFailure.value
        pendingSuccess.value = null
        pendingFailure.value = null
        if (result.resultCode == Activity.RESULT_OK) {
            success?.invoke()
        } else {
            failure?.invoke("Unlock cancelled. Your finance data remains locked.")
        }
    }

    val available = activity != null && keyguard?.isDeviceSecure == true

    return remember(activity, keyguard, available, credentialLauncher) {
        NativeAuthenticator(
            available = available,
            authenticate = { onSuccess, onFailure ->
                val currentActivity = activity
                val currentKeyguard = keyguard
                if (currentActivity == null || currentKeyguard?.isDeviceSecure != true) {
                    onFailure("A secure Android screen lock is required.")
                    return@NativeAuthenticator
                }

                fun launchCredential() {
                    val intent = currentKeyguard.createConfirmDeviceCredentialIntent(
                        "Unlock Jamal's Finance",
                        "Confirm your device screen lock to continue.",
                    )
                    if (intent == null) {
                        onFailure("Device credential confirmation is unavailable.")
                    } else {
                        pendingSuccess.value = onSuccess
                        pendingFailure.value = onFailure
                        credentialLauncher.launch(intent)
                    }
                }

                when {
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> authenticateApi30(
                        activity = currentActivity,
                        onSuccess = onSuccess,
                        onFailure = onFailure,
                    )
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> authenticateApi29(
                        activity = currentActivity,
                        onSuccess = onSuccess,
                        onFailure = onFailure,
                    )
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
                        hasEnrolledFingerprintApi28(currentActivity) -> authenticateApi28(
                        activity = currentActivity,
                        onSuccess = onSuccess,
                        onFailure = onFailure,
                        onCredentialFallback = ::launchCredential,
                    )
                    else -> launchCredential()
                }
            },
        )
    }
}

@RequiresApi(Build.VERSION_CODES.R)
private fun authenticateApi30(
    activity: ComponentActivity,
    onSuccess: () -> Unit,
    onFailure: (String) -> Unit,
) {
    val prompt = BiometricPrompt.Builder(activity)
        .setTitle("Unlock Jamal's Finance")
        .setSubtitle("Use biometrics or your device screen lock")
        .setAllowedAuthenticators(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL,
        )
        .build()
    prompt.authenticate(
        CancellationSignal(),
        activity.mainExecutor,
        nativeAuthenticationCallback(onSuccess, onFailure),
    )
}

@RequiresApi(Build.VERSION_CODES.Q)
private fun authenticateApi29(
    activity: ComponentActivity,
    onSuccess: () -> Unit,
    onFailure: (String) -> Unit,
) {
    val prompt = BiometricPrompt.Builder(activity)
        .setTitle("Unlock Jamal's Finance")
        .setSubtitle("Use biometrics or your device screen lock")
        .setDeviceCredentialAllowed(true)
        .build()
    prompt.authenticate(
        CancellationSignal(),
        activity.mainExecutor,
        nativeAuthenticationCallback(onSuccess, onFailure),
    )
}

@RequiresApi(Build.VERSION_CODES.P)
private fun authenticateApi28(
    activity: ComponentActivity,
    onSuccess: () -> Unit,
    onFailure: (String) -> Unit,
    onCredentialFallback: () -> Unit,
) {
    val fallbackRequested = AtomicBoolean(false)
    val prompt = BiometricPrompt.Builder(activity)
        .setTitle("Unlock Jamal's Finance")
        .setSubtitle("Verify your identity to continue")
        .setNegativeButton("Use device PIN", activity.mainExecutor) { _, _ ->
            fallbackRequested.set(true)
            onCredentialFallback()
        }
        .build()
    prompt.authenticate(
        CancellationSignal(),
        activity.mainExecutor,
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult?) {
                onSuccess()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
                if (!fallbackRequested.get()) {
                    onFailure(errString?.toString()?.takeIf { it.isNotBlank() }
                        ?: "Identity verification failed.")
                }
            }
        },
    )
}

@RequiresApi(Build.VERSION_CODES.P)
private fun hasEnrolledFingerprintApi28(activity: ComponentActivity): Boolean {
    val manager = activity.getSystemService(FingerprintManager::class.java)
    return manager?.isHardwareDetected == true && manager.hasEnrolledFingerprints()
}

@RequiresApi(Build.VERSION_CODES.P)
private fun nativeAuthenticationCallback(
    onSuccess: () -> Unit,
    onFailure: (String) -> Unit,
): BiometricPrompt.AuthenticationCallback = object : BiometricPrompt.AuthenticationCallback() {
    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult?) {
        onSuccess()
    }

    override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
        onFailure(
            errString?.toString()?.takeIf { it.isNotBlank() }
                ?: "Identity verification failed.",
        )
    }
}

private fun Context.findComponentActivity(): ComponentActivity? {
    var current: Context? = this
    while (current is ContextWrapper) {
        if (current is ComponentActivity) return current
        current = current.baseContext
    }
    return current as? ComponentActivity
}

@Composable
private fun <T> kotlinx.coroutines.flow.StateFlow<T>.collectAsStateWithLifecycleCompat() =
    androidx.lifecycle.compose.collectAsStateWithLifecycle()
