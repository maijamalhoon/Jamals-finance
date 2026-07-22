package com.jamalsfinance.nativeapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import kotlinx.coroutines.launch

private enum class NativeWorkspace { Launcher, AccountsTransactions, GoalsPayables }

@Composable
fun NativeModuleRootShell(
    email: String,
    financeRepository: FinanceRepository,
    goalsPayablesRepository: GoalsPayablesRepository,
    onSignOut: suspend () -> Unit,
) {
    var workspace by remember { mutableStateOf(NativeWorkspace.Launcher) }
    BackHandler(enabled = workspace != NativeWorkspace.Launcher) {
        workspace = NativeWorkspace.Launcher
    }

    when (workspace) {
        NativeWorkspace.Launcher -> NativeModuleLauncher(
            email = email,
            onAccountsTransactions = { workspace = NativeWorkspace.AccountsTransactions },
            onGoalsPayables = { workspace = NativeWorkspace.GoalsPayables },
            onSignOut = onSignOut,
        )
        NativeWorkspace.AccountsTransactions -> NativeDashboardShell(
            email = email,
            financeRepository = financeRepository,
            onSignOut = onSignOut,
        )
        NativeWorkspace.GoalsPayables -> GoalsPayablesDashboard(
            repository = goalsPayablesRepository,
            onBack = { workspace = NativeWorkspace.Launcher },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NativeModuleLauncher(
    email: String,
    onAccountsTransactions: () -> Unit,
    onGoalsPayables: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val scope = rememberCoroutineScope()
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Jamal's Finance", fontWeight = FontWeight.Bold)
                        Text(
                            "Native modules",
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
            contentPadding = PaddingValues(18.dp, 16.dp, 18.dp, 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Text("Signed in as", style = MaterialTheme.typography.labelLarge)
                Text(email, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Choose a native workspace. Press Android Back inside a workspace to return here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            item {
                ModuleCard(
                    title = "Accounts & Transactions",
                    description = "Accounts, balances, income, expenses, transfers, search and deleted history.",
                    action = "Open core finance",
                    onClick = onAccountsTransactions,
                )
            }
            item {
                ModuleCard(
                    title = "Goals & Payables",
                    description = "Savings goals, contribution history, payables, repayments and due-status tracking.",
                    action = "Open goals & payables",
                    onClick = onGoalsPayables,
                )
            }
            item {
                OutlinedButton(
                    onClick = { scope.launch { onSignOut() } },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                ) {
                    Text("Sign out")
                }
            }
        }
    }
}

@Composable
private fun ModuleCard(
    title: String,
    description: String,
    action: String,
    onClick: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                description,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(18.dp))
            Button(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Text(action)
            }
        }
    }
}
