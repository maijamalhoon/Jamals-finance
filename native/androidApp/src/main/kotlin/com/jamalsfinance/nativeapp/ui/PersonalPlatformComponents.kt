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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
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
        title,
        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun PersonalPanel(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
    ) { content() }
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
            verticalArrangement = Arrangement.spacedBy(14.dp),
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
                    if (avatarBitmap == null) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                initials(snapshot.profile.displayName),
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                        }
                    } else {
                        Image(
                            bitmap = avatarBitmap,
                            contentDescription = "Profile image",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(66.dp),
                        )
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
                OutlinedButton(onClick = onEditName, enabled = !busy) { Text("Edit") }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Stat("Accounts", snapshot.profile.accounts, Modifier.weight(1f))
                Stat("Transactions", snapshot.profile.transactions, Modifier.weight(1f))
                Stat("Categories", snapshot.profile.categories, Modifier.weight(1f))
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Stat("Goals", snapshot.profile.goals, Modifier.weight(1f))
                Stat("Investments", snapshot.profile.investments, Modifier.weight(1f))
                Stat("Currency", snapshot.profile.preferredCurrency, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: Any, modifier: Modifier) {
    Surface(modifier = modifier, shape = RoundedCornerShape(16.dp)) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 11.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(value.toString(), fontWeight = FontWeight.Bold, maxLines = 1)
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
        Column {
            ActionRow("Currency", "Account default on every device", snapshot.profile.preferredCurrency, !busy, onCurrency)
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ActionRow(
                "Theme",
                "System, light or dark appearance",
                local.themeMode.name,
                !busy,
                onTheme,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ActionRow("Date format", "How dates appear on this device", local.dateFormat.sample, !busy, onDateFormat)
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ToggleRow(
                "Compact mode",
                "Reduce spacing across the native app",
                local.compactMode,
                !busy,
                onCompactChanged,
            )
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
        Column {
            ToggleRow(
                "Goal deadline alerts",
                "Overdue, today and next 7 days",
                snapshot.notificationPreferences.goalAlertsEnabled,
                !busy,
                onGoalAlerts,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ToggleRow(
                "Payable due alerts",
                "Outstanding payables due within 7 days",
                snapshot.notificationPreferences.payableAlertsEnabled,
                !busy,
                onPayableAlerts,
            )
            HorizontalDivider()
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Current alerts", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (snapshot.unreadAlertCount > 0) Text(
                    "${snapshot.unreadAlertCount} unread",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            if (snapshot.alerts.isEmpty()) {
                Text(
                    "All caught up. No goal or payable alerts right now.",
                    modifier = Modifier.padding(start = 18.dp, end = 18.dp, bottom = 18.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                snapshot.alerts.forEachIndexed { index, alert ->
                    if (index > 0) HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
                    AlertRow(alert, !busy) { onAlertClick(alert) }
                }
            }
        }
    }
}

@Composable
private fun AlertRow(alert: PersonalAlert, enabled: Boolean, onClick: () -> Unit) {
    val color = when (alert.tone) {
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
            modifier = Modifier.size(9.dp),
            shape = CircleShape,
            color = if (alert.read) MaterialTheme.colorScheme.outlineVariant else color,
        ) {}
        Column(modifier = Modifier.weight(1f)) {
            Text(alert.title, fontWeight = if (alert.read) FontWeight.Medium else FontWeight.Bold)
            Text(
                "${if (alert.source == AlertSource.Goal) "Goal" else "Payable"} · ${urgency(alert.urgency)} · ${alert.dateKey}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (!alert.read) Text("New", style = MaterialTheme.typography.labelSmall, color = color)
    }
}

@Composable
internal fun PersonalDataCard(busy: Boolean, onExport: () -> Unit, onImport: () -> Unit) {
    PersonalPanel {
        Column(modifier = Modifier.padding(18.dp)) {
            Text("Complete finance data", fontWeight = FontWeight.Bold)
            Text(
                "Backup personal accounts, categories, transactions, goals, payables and investments. Restore is duplicate-safe.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
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
        Column(modifier = Modifier.padding(18.dp)) {
            Text("Signed in as", style = MaterialTheme.typography.labelSmall)
            Text(email, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(12.dp))
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
private fun ActionRow(
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
private fun ToggleRow(
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

private fun urgency(value: AlertUrgency): String = when (value) {
    AlertUrgency.Overdue -> "Overdue"
    AlertUrgency.DueToday -> "Due today"
    AlertUrgency.DueSoon -> "Due soon"
}
