package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import com.jamalsfinance.shared.goals.GoalContribution
import com.jamalsfinance.shared.goals.GoalContributionDraft
import com.jamalsfinance.shared.goals.GoalDraft
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.goals.GoalsPayablesResult
import com.jamalsfinance.shared.goals.GoalsPayablesSnapshot
import com.jamalsfinance.shared.goals.GoalsPayablesState
import com.jamalsfinance.shared.goals.LiabilityPayment
import com.jamalsfinance.shared.goals.LiabilityPaymentDraft
import com.jamalsfinance.shared.goals.ModuleAccount
import com.jamalsfinance.shared.goals.NativeGoal
import com.jamalsfinance.shared.goals.NativePayable
import com.jamalsfinance.shared.goals.PayableDraft
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch

private enum class GoalPayableSection { Goals, Payables }
private enum class PayableFilter { All, Pending, Partial, Overdue, Completed }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalsPayablesDashboard(
    repository: GoalsPayablesRepository,
    onBack: () -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var section by remember { mutableStateOf(GoalPayableSection.Goals) }
    var addGoal by remember { mutableStateOf(false) }
    var editGoal by remember { mutableStateOf<NativeGoal?>(null) }
    var contributionGoal by remember { mutableStateOf<NativeGoal?>(null) }
    var deleteGoal by remember { mutableStateOf<NativeGoal?>(null) }
    var deleteContribution by remember { mutableStateOf<GoalContribution?>(null) }
    var addPayable by remember { mutableStateOf(false) }
    var editPayable by remember { mutableStateOf<NativePayable?>(null) }
    var paymentPayable by remember { mutableStateOf<NativePayable?>(null) }
    var deletePayable by remember { mutableStateOf<NativePayable?>(null) }
    var deletePayment by remember { mutableStateOf<LiabilityPayment?>(null) }

    LaunchedEffect(repository) { repository.refresh(force = true) }

    val snapshot = when (val current = state) {
        is GoalsPayablesState.Ready -> current.snapshot
        is GoalsPayablesState.Loading -> current.previous
        is GoalsPayablesState.Failure -> current.previous
        GoalsPayablesState.Idle -> null
    }

    fun report(result: GoalsPayablesResult, success: String) {
        scope.launch {
            snackbar.showSnackbar(
                when (result) {
                    GoalsPayablesResult.Success -> success
                    is GoalsPayablesResult.Failure -> result.message
                },
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = { TextButton(onClick = onBack) { Text("Modules") } },
                title = {
                    Column {
                        Text(if (section == GoalPayableSection.Goals) "Goals" else "Payables", fontWeight = FontWeight.Bold)
                        Text("Native milestone 0.3", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    TextButton(onClick = { scope.launch { report(repository.refresh(force = true), "Data refreshed") } }) {
                        Text("Refresh")
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                GoalPayableSection.entries.forEach { item ->
                    NavigationBarItem(
                        selected = section == item,
                        onClick = { section = item },
                        icon = { Text(if (item == GoalPayableSection.Goals) "G" else "P", fontWeight = FontWeight.Bold) },
                        label = { Text(item.name) },
                    )
                }
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    if (section == GoalPayableSection.Goals) addGoal = true else addPayable = true
                },
                text = { Text(if (section == GoalPayableSection.Goals) "Add goal" else "Add payable") },
                icon = { Text("+") },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                state is GoalsPayablesState.Loading && snapshot == null -> CenterProgress()
                state is GoalsPayablesState.Failure && snapshot == null -> EmptyPanel(
                    title = "Could not load goals and payables",
                    description = (state as GoalsPayablesState.Failure).message,
                    action = "Try again",
                    onAction = { scope.launch { repository.refresh(force = true) } },
                )
                snapshot != null && section == GoalPayableSection.Goals -> GoalsScreen(
                    snapshot = snapshot,
                    onEdit = { editGoal = it },
                    onContribute = { contributionGoal = it },
                    onDelete = { deleteGoal = it },
                    onDeleteContribution = { deleteContribution = it },
                )
                snapshot != null -> PayablesScreen(
                    snapshot = snapshot,
                    onEdit = { editPayable = it },
                    onPayment = { paymentPayable = it },
                    onDelete = { deletePayable = it },
                    onDeletePayment = { deletePayment = it },
                )
                else -> CenterProgress()
            }
        }
    }

    if (addGoal && snapshot != null) {
        GoalDialog(
            existing = null,
            accounts = snapshot.activeAccounts,
            onDismiss = { addGoal = false },
        ) { draft ->
            val result = repository.createGoal(draft)
            if (result is GoalsPayablesResult.Success) addGoal = false
            report(result, "Goal created")
        }
    }

    editGoal?.let { goal ->
        GoalDialog(
            existing = goal,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { editGoal = null },
        ) { draft ->
            val result = repository.updateGoal(goal, draft)
            if (result is GoalsPayablesResult.Success) editGoal = null
            report(result, "Goal updated")
        }
    }

    contributionGoal?.let { goal ->
        GoalContributionDialog(
            goal = goal,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { contributionGoal = null },
        ) { draft ->
            val result = repository.recordGoalContribution(goal, draft)
            if (result is GoalsPayablesResult.Success) contributionGoal = null
            report(result, "Contribution recorded")
        }
    }

    if (addPayable && snapshot != null) {
        PayableDialog(
            existing = null,
            accounts = snapshot.activeAccounts,
            onDismiss = { addPayable = false },
        ) { draft ->
            val result = repository.createPayable(draft)
            if (result is GoalsPayablesResult.Success) addPayable = false
            report(result, "Payable created")
        }
    }

    editPayable?.let { payable ->
        PayableDialog(
            existing = payable,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { editPayable = null },
        ) { draft ->
            val result = repository.updatePayable(payable, draft)
            if (result is GoalsPayablesResult.Success) editPayable = null
            report(result, "Payable updated")
        }
    }

    paymentPayable?.let { payable ->
        LiabilityPaymentDialog(
            payable = payable,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { paymentPayable = null },
        ) { draft ->
            val result = repository.recordLiabilityPayment(payable, draft)
            if (result is GoalsPayablesResult.Success) paymentPayable = null
            report(result, "Payment recorded")
        }
    }

    deleteGoal?.let { goal ->
        ConfirmActionDialog(
            title = "Delete goal?",
            text = "${goal.row.name} and its contribution source records will be removed. Ledger history remains archived by the database.",
            confirmLabel = "Delete",
            onDismiss = { deleteGoal = null },
        ) {
            scope.launch {
                val result = repository.deleteGoal(goal.row.id)
                deleteGoal = null
                report(result, "Goal deleted")
            }
        }
    }

    deleteContribution?.let { contribution ->
        ConfirmActionDialog(
            title = "Remove contribution?",
            text = "The goal total and linked ledger history will be recalculated securely.",
            confirmLabel = "Remove",
            onDismiss = { deleteContribution = null },
        ) {
            scope.launch {
                val result = repository.deleteGoalContribution(contribution.id)
                deleteContribution = null
                report(result, "Contribution removed")
            }
        }
    }

    deletePayable?.let { payable ->
        ConfirmActionDialog(
            title = "Delete payable?",
            text = "${payable.row.personName} will be removed. Linked transaction history remains archived.",
            confirmLabel = "Delete",
            onDismiss = { deletePayable = null },
        ) {
            scope.launch {
                val result = repository.deletePayable(payable.row.id)
                deletePayable = null
                report(result, "Payable deleted")
            }
        }
    }

    deletePayment?.let { payment ->
        ConfirmActionDialog(
            title = "Remove payment?",
            text = "The payable balance and source account balance will be restored through the dedicated database RPC.",
            confirmLabel = "Remove",
            onDismiss = { deletePayment = null },
        ) {
            scope.launch {
                val result = repository.deleteLiabilityPayment(payment)
                deletePayment = null
                report(result, "Payment removed")
            }
        }
    }
}

@Composable
private fun GoalsScreen(
    snapshot: GoalsPayablesSnapshot,
    onEdit: (NativeGoal) -> Unit,
    onContribute: (NativeGoal) -> Unit,
    onDelete: (NativeGoal) -> Unit,
    onDeleteContribution: (GoalContribution) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SummaryCard(
                title = "Savings progress",
                primary = formatPkr(snapshot.totalGoalSaved),
                secondary = "of ${formatPkr(snapshot.totalGoalTarget)} • ${snapshot.completedGoals}/${snapshot.goals.size} completed",
                progress = if (snapshot.totalGoalTarget > 0) snapshot.totalGoalSaved / snapshot.totalGoalTarget else 0.0,
            )
        }
        if (snapshot.goals.isEmpty()) {
            item { EmptyPanel("No goals yet", "Use Add goal to create your first savings target.") }
        } else {
            items(snapshot.goals, key = { it.row.id }) { goal ->
                GoalCard(goal, snapshot.accounts, onEdit, onContribute, onDelete, onDeleteContribution)
            }
        }
    }
}

@Composable
private fun GoalCard(
    goal: NativeGoal,
    accounts: List<ModuleAccount>,
    onEdit: (NativeGoal) -> Unit,
    onContribute: (NativeGoal) -> Unit,
    onDelete: (NativeGoal) -> Unit,
    onDeleteContribution: (GoalContribution) -> Unit,
) {
    var history by remember { mutableStateOf(false) }
    Card(shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.fillMaxWidth(0.72f)) {
                    Text(goal.row.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        when {
                            goal.completed -> "Completed"
                            goal.row.deadline == null -> "No deadline"
                            else -> "Due ${goal.row.deadline}"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text("${(goal.progress * 100).toInt()}%", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(progress = { goal.progress.toFloat() }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            Text("${formatPkr(goal.currentAmount)} saved", fontWeight = FontWeight.SemiBold)
            Text("${formatPkr(goal.remainingAmount)} remaining of ${formatPkr(goal.row.targetAmount)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            goal.linkedAccount?.let {
                Text("Linked account: ${it.name}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Button(onClick = { onContribute(goal) }, enabled = !goal.completed) { Text("Contribute") }
                TextButton(onClick = { onEdit(goal) }) { Text("Edit") }
                TextButton(onClick = { onDelete(goal) }) { Text("Delete") }
            }
            if (goal.contributions.isNotEmpty()) {
                TextButton(onClick = { history = !history }) {
                    Text(if (history) "Hide history" else "History (${goal.contributions.size})")
                }
                if (history) {
                    HorizontalDivider()
                    goal.contributions.forEach { contribution ->
                        val accountName = contribution.accountId?.let { id -> accounts.firstOrNull { it.id == id }?.name }
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.fillMaxWidth(0.72f)) {
                                Text(formatPkr(contribution.amount), fontWeight = FontWeight.SemiBold)
                                Text(
                                    listOfNotNull(contribution.contributedAt, accountName).joinToString(" • "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                contribution.note?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            }
                            TextButton(onClick = { onDeleteContribution(contribution) }) { Text("Remove") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PayablesScreen(
    snapshot: GoalsPayablesSnapshot,
    onEdit: (NativePayable) -> Unit,
    onPayment: (NativePayable) -> Unit,
    onDelete: (NativePayable) -> Unit,
    onDeletePayment: (LiabilityPayment) -> Unit,
) {
    var filter by remember { mutableStateOf(PayableFilter.All) }
    var search by remember { mutableStateOf("") }
    val today = remember { todayIso() }
    val filtered = snapshot.payables.filter { payable ->
        val status = payable.displayStatus(today)
        val matchesStatus = filter == PayableFilter.All || status.equals(filter.name, ignoreCase = true)
        val text = listOfNotNull(payable.row.personName, payable.row.itemName, payable.row.reason, payable.row.notes).joinToString(" ").lowercase()
        matchesStatus && (search.isBlank() || text.contains(search.trim().lowercase()))
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SummaryCard(
                title = "Repayment pulse",
                primary = formatPkr(snapshot.totalPayableRemaining),
                secondary = "remaining • ${formatPkr(snapshot.totalPayablePaid)} paid of ${formatPkr(snapshot.totalPayableValue)}",
                progress = if (snapshot.totalPayableValue > 0) snapshot.totalPayablePaid / snapshot.totalPayableValue else 0.0,
            )
        }
        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search payables") },
                singleLine = true,
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PayableFilter.entries.forEach { item ->
                    FilterChip(selected = filter == item, onClick = { filter = item }, label = { Text(item.name) })
                }
            }
        }
        if (filtered.isEmpty()) {
            item { EmptyPanel("No matching payables", "Change the filter or add a payable.") }
        } else {
            items(filtered, key = { it.row.id }) { payable ->
                PayableCard(payable, snapshot.accounts, today, onEdit, onPayment, onDelete, onDeletePayment)
            }
        }
    }
}

@Composable
private fun PayableCard(
    payable: NativePayable,
    accounts: List<ModuleAccount>,
    today: String,
    onEdit: (NativePayable) -> Unit,
    onPayment: (NativePayable) -> Unit,
    onDelete: (NativePayable) -> Unit,
    onDeletePayment: (LiabilityPayment) -> Unit,
) {
    var history by remember { mutableStateOf(false) }
    val status = payable.displayStatus(today)
    Card(shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.fillMaxWidth(0.7f)) {
                    Text(payable.row.personName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(payable.row.reason, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.secondaryContainer) {
                    Text(status.replaceFirstChar { it.uppercase() }, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), style = MaterialTheme.typography.labelMedium)
                }
            }
            payable.row.itemName?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(progress = { payable.progress.toFloat() }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            Text("${formatPkr(payable.row.paidAmount)} paid", fontWeight = FontWeight.SemiBold)
            Text("${formatPkr(payable.remainingAmount)} remaining of ${formatPkr(payable.row.originalValue)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            payable.row.dueDate?.let { Text("Due $it", style = MaterialTheme.typography.bodySmall) }
            payable.linkedAccount?.let { Text("Default account: ${it.name}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            payable.row.notes?.let { Text(it, modifier = Modifier.padding(top = 6.dp), style = MaterialTheme.typography.bodySmall) }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Button(onClick = { onPayment(payable) }, enabled = payable.remainingAmount > 0 && accounts.any { it.status == "active" }) { Text("Payment") }
                TextButton(onClick = { onEdit(payable) }) { Text("Edit") }
                TextButton(onClick = { onDelete(payable) }) { Text("Delete") }
            }
            if (payable.payments.isNotEmpty()) {
                TextButton(onClick = { history = !history }) { Text(if (history) "Hide history" else "History (${payable.payments.size})") }
                if (history) {
                    HorizontalDivider()
                    payable.payments.forEach { payment ->
                        val accountName = payment.accountId?.let { id -> accounts.firstOrNull { it.id == id }?.name }
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.fillMaxWidth(0.72f)) {
                                Text(formatPkr(payment.amount), fontWeight = FontWeight.SemiBold)
                                Text(listOfNotNull(payment.paidAt, accountName).joinToString(" • "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                payment.note?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            }
                            TextButton(onClick = { onDeletePayment(payment) }, enabled = payment.transactionId != null) { Text("Remove") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(title: String, primary: String, secondary: String, progress: Double) {
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp)) {
            Text(title, style = MaterialTheme.typography.labelLarge)
            Text(primary, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(secondary, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(progress = { progress.coerceIn(0.0, 1.0).toFloat() }, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun GoalDialog(
    existing: NativeGoal?,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (GoalDraft) -> Unit,
) {
    var name by remember(existing) { mutableStateOf(existing?.row?.name.orEmpty()) }
    var target by remember(existing) { mutableStateOf(existing?.row?.targetAmountOriginal?.editable().orEmpty()) }
    var current by remember(existing) { mutableStateOf(if (existing == null) "0" else existing.currentAmount.editable()) }
    var currency by remember(existing) { mutableStateOf(existing?.row?.currency ?: "PKR") }
    var rate by remember(existing) { mutableStateOf(existing?.row?.exchangeRateToPkr?.editable() ?: "1") }
    var deadline by remember(existing) { mutableStateOf(existing?.row?.deadline.orEmpty()) }
    var accountId by remember(existing) { mutableStateOf(existing?.row?.accountId.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    FormDialog(title = if (existing == null) "Create Goal" else "Edit Goal", onDismiss = onDismiss) {
        OutlinedTextField(name, { name = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Goal name") }, singleLine = true)
        MoneyFields(target, { target = it }, currency, { currency = it }, rate, { rate = it })
        if (existing == null) {
            OutlinedTextField(current, { current = it }, Modifier.fillMaxWidth(), label = { Text("Saved amount") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
        } else {
            Text("Already saved: ${formatPkr(existing.currentAmount)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        SelectionField("Linked account (optional)", accountId, accounts.map { it.id to it.name }, "No linked account", allowEmpty = true) { accountId = it }
        OutlinedTextField(deadline, { deadline = it }, Modifier.fillMaxWidth(), label = { Text("Deadline YYYY-MM-DD (optional)") }, singleLine = true)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = {
                val targetValue = target.toDoubleOrNull()
                val currentValue = current.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                if (targetValue == null || currentValue == null || rateValue == null) {
                    error = "Enter valid amounts and exchange rate."
                } else {
                    scope.launch {
                        saving = true
                        onSave(GoalDraft(name, targetValue, currentValue, currency, rateValue, deadline, accountId))
                        saving = false
                    }
                }
            },
            enabled = !saving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text(if (existing == null) "Create goal" else "Update goal")
        }
    }
}

@Composable
private fun GoalContributionDialog(
    goal: NativeGoal,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (GoalContributionDraft) -> Unit,
) {
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var rate by remember { mutableStateOf("1") }
    var accountId by remember { mutableStateOf(goal.row.accountId.orEmpty()) }
    var date by remember { mutableStateOf(todayIso()) }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    FormDialog("Goal Contribution", onDismiss) {
        Text(goal.row.name, fontWeight = FontWeight.Bold)
        Text("Remaining ${formatPkr(goal.remainingAmount)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        MoneyFields(amount, { amount = it }, currency, { currency = it }, rate, { rate = it })
        SelectionField("Linked account (optional)", accountId, accounts.map { it.id to it.name }, "No linked account", allowEmpty = true) { accountId = it }
        OutlinedTextField(date, { date = it }, Modifier.fillMaxWidth(), label = { Text("Contribution date YYYY-MM-DD") }, singleLine = true)
        OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("Note (optional)") }, minLines = 2)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = {
                val amountValue = amount.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                if (amountValue == null || rateValue == null) error = "Enter a valid amount and exchange rate."
                else scope.launch {
                    saving = true
                    onSave(GoalContributionDraft(goal.row.id, accountId, amountValue, currency, rateValue, date, note))
                    saving = false
                }
            },
            enabled = !saving && goal.remainingAmount > 0,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Save contribution")
        }
    }
}

@Composable
private fun PayableDialog(
    existing: NativePayable?,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (PayableDraft) -> Unit,
) {
    var person by remember(existing) { mutableStateOf(existing?.row?.personName.orEmpty()) }
    var item by remember(existing) { mutableStateOf(existing?.row?.itemName.orEmpty()) }
    var reason by remember(existing) { mutableStateOf(existing?.row?.reason.orEmpty()) }
    var amount by remember(existing) { mutableStateOf(existing?.row?.originalValueInput?.editable().orEmpty()) }
    var currency by remember(existing) { mutableStateOf(existing?.row?.currency ?: "PKR") }
    var rate by remember(existing) { mutableStateOf(existing?.row?.exchangeRateToPkr?.editable() ?: "1") }
    var accountId by remember(existing, accounts) { mutableStateOf(existing?.row?.accountId ?: accounts.firstOrNull()?.id.orEmpty()) }
    var dueDate by remember(existing) { mutableStateOf(existing?.row?.dueDate.orEmpty()) }
    var notes by remember(existing) { mutableStateOf(existing?.row?.notes.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    FormDialog(if (existing == null) "Add Payable" else "Edit Payable", onDismiss) {
        MoneyFields(amount, { amount = it }, currency, { currency = it }, rate, { rate = it })
        OutlinedTextField(person, { person = it }, Modifier.fillMaxWidth(), label = { Text("Name") }, singleLine = true)
        OutlinedTextField(reason, { reason = it }, Modifier.fillMaxWidth(), label = { Text("Purpose") }, singleLine = true)
        OutlinedTextField(item, { item = it }, Modifier.fillMaxWidth(), label = { Text("Item (optional)") }, singleLine = true)
        SelectionField("Account", accountId, accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" }, "Select account") { accountId = it }
        OutlinedTextField(dueDate, { dueDate = it }, Modifier.fillMaxWidth(), label = { Text("Due date YYYY-MM-DD (optional)") }, singleLine = true)
        OutlinedTextField(notes, { notes = it }, Modifier.fillMaxWidth(), label = { Text("Notes (optional)") }, minLines = 2)
        existing?.let { Text("Already paid: ${formatPkr(it.row.paidAmount)}", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = {
                val amountValue = amount.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                if (amountValue == null || rateValue == null) error = "Enter a valid amount and exchange rate."
                else scope.launch {
                    saving = true
                    onSave(PayableDraft(person, item, reason, amountValue, currency, rateValue, accountId, dueDate, notes))
                    saving = false
                }
            },
            enabled = !saving && accounts.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text(if (existing == null) "Save payable" else "Update payable")
        }
    }
}

@Composable
private fun LiabilityPaymentDialog(
    payable: NativePayable,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (LiabilityPaymentDraft) -> Unit,
) {
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var rate by remember { mutableStateOf("1") }
    var accountId by remember(accounts) { mutableStateOf(payable.row.accountId ?: accounts.firstOrNull()?.id.orEmpty()) }
    var date by remember { mutableStateOf(todayIso()) }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    FormDialog("Record Payment", onDismiss) {
        Text(payable.row.personName, fontWeight = FontWeight.Bold)
        Text("Remaining ${formatPkr(payable.remainingAmount)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        MoneyFields(amount, { amount = it }, currency, { currency = it }, rate, { rate = it })
        SelectionField("Paid from account", accountId, accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" }, "Select account") { accountId = it }
        OutlinedTextField(date, { date = it }, Modifier.fillMaxWidth(), label = { Text("Payment date YYYY-MM-DD") }, singleLine = true)
        OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("Note (optional)") }, minLines = 2)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = {
                val amountValue = amount.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                if (amountValue == null || rateValue == null) error = "Enter a valid amount and exchange rate."
                else scope.launch {
                    saving = true
                    onSave(LiabilityPaymentDraft(payable.row.id, accountId, amountValue, currency, rateValue, date, note))
                    saving = false
                }
            },
            enabled = !saving && accounts.isNotEmpty() && payable.remainingAmount > 0,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Record payment")
        }
    }
}

@Composable
private fun MoneyFields(
    amount: String,
    onAmount: (String) -> Unit,
    currency: String,
    onCurrency: (String) -> Unit,
    rate: String,
    onRate: (String) -> Unit,
) {
    OutlinedTextField(
        value = amount,
        onValueChange = onAmount,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Amount ($currency)") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        singleLine = true,
    )
    SelectionField("Currency", currency, SupportedFinanceCurrencies.map { it to it }, "Select currency") { onCurrency(it) }
    if (currency != "PKR") {
        OutlinedTextField(
            value = rate,
            onValueChange = onRate,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("1 $currency in PKR") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
        )
    }
}

@Composable
private fun SelectionField(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    placeholder: String,
    allowEmpty: Boolean = false,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.firstOrNull { it.first == value }?.second ?: if (allowEmpty && value.isBlank()) placeholder else placeholder
    Box(Modifier.fillMaxWidth()) {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.fillMaxWidth()) {
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(selected, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            if (allowEmpty) {
                DropdownMenuItem(text = { Text(placeholder) }, onClick = { onSelect(""); expanded = false })
            }
            options.forEach { option ->
                DropdownMenuItem(text = { Text(option.second) }, onClick = { onSelect(option.first); expanded = false })
            }
        }
    }
}

@Composable
private fun FormDialog(title: String, onDismiss: () -> Unit, content: @Composable () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(26.dp), tonalElevation = 6.dp) {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(max = 720.dp).verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    TextButton(onClick = onDismiss) { Text("Close") }
                }
                content()
            }
        }
    }
}

@Composable
private fun ConfirmActionDialog(
    title: String,
    text: String,
    confirmLabel: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(text) },
        confirmButton = { Button(onClick = onConfirm) { Text(confirmLabel) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun EmptyPanel(
    title: String,
    description: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        Text(description, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (action != null && onAction != null) {
            Spacer(Modifier.height(12.dp))
            Button(onClick = onAction) { Text(action) }
        }
    }
}

@Composable
private fun CenterProgress() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

private fun formatPkr(value: Double): String = NumberFormat.getCurrencyInstance(Locale("en", "PK")).apply {
    currency = java.util.Currency.getInstance("PKR")
    maximumFractionDigits = 2
}.format(if (value.isFinite()) value else 0.0)

private fun Double.editable(): String = if (!isFinite()) "" else toString().removeSuffix(".0")
private fun todayIso(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
