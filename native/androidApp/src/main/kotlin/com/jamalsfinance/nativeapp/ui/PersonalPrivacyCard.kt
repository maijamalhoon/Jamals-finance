package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
internal fun PersonalPrivacyCard(
    local: NativeLocalPreferences,
    deviceSecurityAvailable: Boolean,
    busy: Boolean,
    onAppLockChanged: (Boolean) -> Unit,
    onTimeout: () -> Unit,
    onScreenshotsChanged: (Boolean) -> Unit,
    onLockNow: () -> Unit,
) {
    PersonalPanel {
        Column(modifier = Modifier.fillMaxWidth()) {
            PrivacyToggleRow(
                title = "App Lock",
                description = if (deviceSecurityAvailable) {
                    "Require biometrics, device PIN, pattern, or password"
                } else {
                    "Set an Android screen lock before enabling"
                },
                checked = local.appLockEnabled,
                enabled = !busy,
                onCheckedChange = onAppLockChanged,
            )

            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        enabled = local.appLockEnabled && !busy,
                        onClick = onTimeout,
                    )
                    .padding(horizontal = 18.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Auto-lock", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Lock after the app leaves the foreground",
                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                        color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    local.autoLockTimeout.label,
                    style = androidx.compose.material3.MaterialTheme.typography.labelMedium,
                    color = if (local.appLockEnabled) {
                        androidx.compose.material3.MaterialTheme.colorScheme.primary
                    } else {
                        androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }

            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))

            PrivacyToggleRow(
                title = "Block screenshots",
                description = "Hide finance screens from screenshots and recent-app previews",
                checked = local.blockScreenshots,
                enabled = !busy,
                onCheckedChange = onScreenshotsChanged,
            )

            if (local.appLockEnabled) {
                HorizontalDivider()
                Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
                    Text(
                        "App Lock is active on this device.",
                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                        color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = onLockNow,
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Lock now")
                    }
                }
            }
        }
    }
}

@Composable
private fun PrivacyToggleRow(
    title: String,
    description: String,
    checked: Boolean,
    enabled: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                description,
                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
        )
    }
}
