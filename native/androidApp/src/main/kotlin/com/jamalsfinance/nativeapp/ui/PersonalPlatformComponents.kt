package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.personal.AlertSource
import com.jamalsfinance.shared.personal.AlertTone
import com.jamalsfinance.shared.personal.AlertUrgency
import com.jamalsfinance.shared.personal.PersonalAlert
import com.jamalsfinance.shared.personal.PersonalPlatformSnapshot

@Composable
internal fun PersonalSectionLabel(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
    )
}

@Composable
internal fun PersonalPanel(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
    ) {
        content()
    }
}

@Composable
internal fun PersonalProfileCard(
    snapshot: PersonalPlatformSnapshot,
    avatarBitmap: ImageBitmap?,
    busy: Boolean,
    onChoosePhoto: () -> Unit,
    onEditName: () -> Unit,
) {
    PersonalPanel {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Surface(
                    modifier = Modifier.size(66.dp).clickable(enabled = !busy, onClick = onChoosePhoto),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    if (avatarBitmap != null) {
                        Image(
                            bitmap = avatarBitmap,
                            contentDescription = "Profile image",
                            modifier = Modifier.size(66.dp),
                            contentScale = ContentScale.Crop,
                        )
                    } else {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                initials(snapshot.profile.displayName),
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        snapshot.profile.displayName,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        snapshot.profile.email,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                OutlinedButton(onClick = onEditName, enabled = !busy) {
                    Text("Edit")
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PersonalStat("Accounts", snapshot.profile.accounts, Modifier.weight(1f))
                PersonalStat("Transactions", snapshot.profile.transactions, Modifier.weight(1f))
                PersonalStat("Categories", snapshot.profile.categories, Modifier.weight(1f))
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PersonalStat("Goals", snapshot.profile.goals, Modifier.weight(1f))
                PersonalStat("Investments", snapshot.profile.investments, Modifier.weight(1f))
                PersonalStat("Currency", snapshot.profile.preferredCurrency, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PersonalStat(label: String, value: Any, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                value.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
internal fun PersonalPreferencesCard(
    snapshot: PersonalPlatformSnapshot,
    local: NativeLocalPreferences,
    busy: Boolean,
    onCurrency: () -> Unit,
    onTheme: () -> Unit,
    onDateFormat: () -> Unit,
    onCompactChanged: (Boolean) -> Unit,
) {
    PersonalPanel {
        Column(modifier = Modifier.fillMaxWidth()) {
            PersonalActionRow(
                title = "Currency",
                description = "Account default on every device",
                value = snapshot.profile.preferredCurrency,
                enabled = !busy,
                onClick = onCurrency,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            PersonalActionRow(
                title = "Theme",
                description = "System, light or dark appearance",
                value = when (local.themeMode) {
                    NativeThemeMode.System -> "System"
                    NativeThemeMode.Light -> "Light"
                    NativeThemeMode.Dark -> "Dark"
                },
                enabled = !busy,
                onClick = onTheme,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            PersonalActionRow(
                title = "Date format",
                description = "How dates appear on this device",
                value = local.dateFormat.sample,
                enabled = !busy,
                onClick = onDateFormat,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Compact mode", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Reduce vertical spacing across this native app",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = local.compactMode,
                    onCheckedChange = onCompactChanged,
                    enabled = !busy,
                )
            }
        }
    }
}

@Composable
internal fun PersonalNotificationCard(
    snapshot: PersonalPlatformSnapshot,
    busy: Boolean,
    onGoalAlerts: (Boolean) -> Unit,
    onPayableAlerts: (Boolean) -> Unit,
    onAlertClick: (PersonalAlert) -> Unit,
) {
    PersonalPanel {
        Column(modifier = Modifier.fillMaxWidth()) {
            PersonalToggleRow(
                title = "Goal deadline alerts",
                description = "Overdue, today and next 7 days",
                checked = snapshot.notificationPreferences.goalAlertsEnabled,
                enabled = !busy,
                onCheckedChange = onGoalAlerts,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            PersonalToggleRow(
                title = "Payable due alerts",
                description = "Outstanding payables due within 7 days",
                checked = snapshot.notificationPreferences.payableAlertsEnabled,
                enabled = !busy,
                onCheckedChange = onPayableAlerts,
            )

            HorizontalDivider()
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Current alerts", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (snapshot.unreadAlertCount > 0) {
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                    ) {
                        Text(
                            "${snapshot.unreadAlertCount} unread",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            }

            if (snapshot.alerts.isEmpty()) {
                Text(
                    "All caught up. No goal or payable alerts right now.",
                    modifier = Modifier.padding(start = 18.dp, end = 18.dp, bottom = 18.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                snapshot.alerts.forEachIndexed { index, alert ->
                    if (index > 0) HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
                    PersonalAlertRow(alert, enabled = !busy, onClick = { onAlertClick(alert) })
                }
            }
        }
    }
}

@Composable
private fun PersonalAlertRow(alert: PersonalAlert, enabled: Boolean, onClick: () -> Unit) {
    val toneColor = when (alert.tone) {
        AlertTone.Danger -> MaterialTheme.colorScheme.error
        AlertTone.Warning -> MaterialTheme.colorScheme.tertiary
        AlertTone.Info -> MaterialTheme.colorScheme.primary
    }
    Row(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Surface(
            modifier = Modifier.size(10.dp),
            shape = CircleShape,
            color = if (alert.read) MaterialTheme.colorScheme.outlineVariant else toneColor,
        ) {}
        Column(modifier = Modifier.weight(1f)) {
            Text(
                alert.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (alert.read) FontWeight.Medium else FontWeight.Bold,
            )
            Text(
                "${if (alert.source == AlertSource.Goal) "Goal" else "Payable"} · ${urgencyLabel(alert.urgency)} · ${alert.dateKey}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (!alert.read) Text("New", style = MaterialTheme.typography.labelSmall, color = toneColor)
    }
}

@Composable
internal fun PersonalDataCard(
    busy: Boolean,
    onExport: () -> Unit,
    onImport: () -> Unit,
) {
    PersonalPanel {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Text("Complete finance data", fontWeight = FontWeight.Bold)
            Text(
                "Backup accounts, categories, transactions, goals, payables and investments. Import is duplicate-safe.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(14.dp))
            Button(onClick = onExport, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Export .jfinance backup")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onImport, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Import finance backup")
            }
        }
    }
}

@Composable
internal fun PersonalSecurityCard(
    email: String,
    busy: Boolean,
    onPassword: () -> Unit,
    onSignOut: () -> Unit,
) {
    PersonalPanel {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
            Text("Signed in as", style = MaterialTheme.typography.labelSmall)
            Text(email, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(14.dp))
            OutlinedButton(onClick = onPassword, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Change password")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onSignOut, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Sign out")
            }
        }
    }
}

@Composable
private fun PersonalActionRow(
    title: String,
    description: String,
    value: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(value, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun PersonalToggleRow(
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
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange, enabled = enabled)
    }
}

private fun initials(name: String): String = name.trim().split(Regex("\\s+"))
    .filter(String::isNotBlank)
    .take(2)
    .mapNotNull { it.firstOrNull()?.uppercaseChar() }
    .joinToString("")
    .ifBlank { "JF" }

private fun urgencyLabel(urgency: AlertUrgency): String = when (urgency) {
    AlertUrgency.Overdue -> "Overdue"
    AlertUrgency.DueToday -> "Due today"
    AlertUrgency.DueSoon -> "Due soon"
}
