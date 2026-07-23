package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.privacy.PrivacyLockTimeout
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun PrivacySecurityDashboard(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) {
    val local by preferences.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var timeoutDialog by remember { mutableStateOf(false) }

    fun announce(message: String) {
        scope.launch { snackbar.showSnackbar(message) }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                title = {
                    Column {
                        Text("Privacy & App Lock", fontWeight = FontWeight.Bold)
                        Text(
                            "Device-level protection for personal finance",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(18.dp, 16.dp, 18.dp, 32.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { PersonalSectionLabel("Protection") }
            item {
                PersonalPrivacyCard(
                    local = local,
                    deviceSecurityAvailable = preferences.deviceSecurityAvailable,
                    busy = false,
                    onAppLockChanged = { enabled ->
                        if (enabled && !preferences.deviceSecurityAvailable) {
                            announce("Set a PIN, pattern, password, or biometric screen lock in Android settings first.")
                        } else {
                            preferences.setAppLockEnabled(enabled)
                            if (!enabled) announce("App Lock disabled on this device.")
                        }
                    },
                    onTimeout = { timeoutDialog = true },
                    onScreenshotsChanged = { enabled ->
                        preferences.setBlockScreenshots(enabled)
                        announce(
                            if (enabled) {
                                "Screenshots and recent-app previews are blocked."
                            } else {
                                "Screenshot protection disabled on this device."
                            },
                        )
                    },
                    onLockNow = preferences::requestLockNow,
                )
            }

            item { PersonalSectionLabel("Privacy model") }
            item {
                PrivacyPanel {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text("Local device protection", fontWeight = FontWeight.Bold)
                        Text(
                            "App Lock settings stay on this device. Your Supabase password, session tokens, finance records, and backup data are not copied into the lock preference store.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            "Android Keystore continues protecting the saved login session, while database Row Level Security continues protecting every finance request.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }

    if (timeoutDialog) {
        PersonalChoiceDialog(
            title = "Auto-lock timing",
            values = PrivacyLockTimeout.entries.toList(),
            selected = local.autoLockTimeout,
            label = { it.label },
            onSelect = {
                preferences.setAutoLockTimeout(it)
                timeoutDialog = false
                announce("Auto-lock set to ${it.label.lowercase()}.")
            },
            onDismiss = { timeoutDialog = false },
        )
    }
}
