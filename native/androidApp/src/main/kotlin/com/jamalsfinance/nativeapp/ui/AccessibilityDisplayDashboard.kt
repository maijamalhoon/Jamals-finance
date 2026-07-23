package com.jamalsfinance.nativeapp.ui

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AccessibilityDisplayDashboard(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) {
    val local by preferences.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }

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
                        Text(
                            "Accessibility & Display",
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            "Readable and adaptive personal finance",
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
            item { PersonalSectionLabel("Display") }
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer,
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        AccessibilityToggleRow(
                            title = "High contrast",
                            description = "Stronger text, surface and outline separation",
                            checked = local.highContrast,
                            onCheckedChange = {
                                preferences.setHighContrast(it)
                                announce(if (it) "High contrast enabled." else "Standard contrast enabled.")
                            },
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
                        AccessibilityToggleRow(
                            title = "Compact spacing",
                            description = "Reduce vertical spacing while keeping touch targets usable",
                            checked = local.compactMode,
                            onCheckedChange = {
                                preferences.setCompactMode(it)
                                announce(if (it) "Compact spacing enabled." else "Comfortable spacing enabled.")
                            },
                        )
                    }
                }
            }

            item { PersonalSectionLabel("Automatic support") }
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer,
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(
                            "Built for Android accessibility",
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        AccessibilityStatus(
                            "Large text safe",
                            "Tablet layouts return to one column when Android font scaling is above 125%.",
                        )
                        AccessibilityStatus(
                            "TalkBack ready",
                            "Workspace cards, loading states and errors expose grouped labels and live announcements.",
                        )
                        AccessibilityStatus(
                            "Adaptive windows",
                            "Phones use one column; tablets and large windows use two columns when text remains readable.",
                        )
                        Spacer(Modifier.height(4.dp))
                        Button(
                            onClick = {
                                runCatching {
                                    context.startActivity(
                                        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        },
                                    )
                                }.onFailure {
                                    announce("Android accessibility settings could not be opened.")
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                        ) {
                            Text("Open Android accessibility settings")
                        }
                    }
                }
            }

            item {
                Text(
                    "These preferences stay on this device and do not change your Supabase finance data.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
            }
        }
    }
}

@Composable
private fun AccessibilityToggleRow(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                stateDescription = if (checked) "$title enabled" else "$title disabled"
            }
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun AccessibilityStatus(title: String, description: String) {
    Column {
        Text(title, fontWeight = FontWeight.SemiBold)
        Text(
            description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
