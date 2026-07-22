package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.weight
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
import com.jamalsfinance.shared.finance.AccountDraft
import com.jamalsfinance.shared.finance.AccountUpdate
import com.jamalsfinance.shared.finance.EditableTransaction
import com.jamalsfinance.shared.finance.FinanceAccount
import com.jamalsfinance.shared.finance.FinanceCategory
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.finance.FinanceResult
import com.jamalsfinance.shared.finance.FinanceSnapshot
import com.jamalsfinance.shared.finance.FinanceState
import com.jamalsfinance.shared.finance.LedgerEntry
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import com.jamalsfinance.shared.finance.TransactionDraft
import com.jamalsfinance.shared.finance.TransferDraft
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlinx.coroutines.launch

private enum class NativeSection { Accounts, Transactions, Profile }
private enum class LedgerFilter { All, Income, Expense, Transfer }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NativeDashboardShell(
    email: String,
    financeRepository: FinanceRepository,
    onSignOut: suspend () -> Unit,
) {
    val state by financeRepository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var section by remember { mutableStateOf(NativeSection.Accounts) }
    var newAccount by remember { mutableStateOf(false) }
    var editAccount by remember { mutableStateOf<FinanceAccount?>(null) }
    var transfer by remember { mutableStateOf(false) }
    var newTransaction by remember { mutableStateOf(false) }
    var editTransaction by remember { mutableStateOf<EditableTransaction?>(null) }
    var archiveAccount by remember { mutableStateOf<FinanceAccount?>(null) }
    var deleteEntry by remember { mutableStateOf<LedgerEntry?>(null) }

    LaunchedEffect(financeRepository) { financeRepository.refresh(force = true) }

    val snapshot = when (val current = state) {
        is FinanceState.Ready -> current.snapshot
        is FinanceState.Loading -> current.previous
        is FinanceState.Failure -> current.previous
        FinanceState.Idle -> null
    }

    fun report(result: FinanceResult, success: String) {
        scope.launch {
            snackbar.showSnackbar(
                when (result) {
                    FinanceResult.Success -> success
                    is FinanceResult.Failure -> result.message
                },
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            when (section) {
                                NativeSection.Accounts -> "Accounts"
                                NativeSection.Transactions -> "Transactions"
                                NativeSection.Profile -> "Profile"
                            },
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "Jamal's Finance Native",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    TextButton(onClick = {
                        scope.launch {
                            report(financeRepository.refresh(force = true), "Finance data refreshed")
                        }
                    }) { Text("Refresh") }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                NativeSection.entries.forEach { item ->
                    NavigationBarItem(
                        selected = section == item,
                        onClick = { section = item },
                        icon = { Text(item.name.take(1), fontWeight = FontWeight.Bold) },
                        label = { Text(item.name) },
                    )
                }
            }
        },
        floatingActionButton = {
            when (section) {
                NativeSection.Accounts -> ExtendedFloatingActionButton(
                    onClick = { newAccount = true },
                    text = { Text("Add account") },
                    icon = { Text("+") },
                )
                NativeSection.Transactions -> ExtendedFloatingActionButton(
                    onClick = { newTransaction = true },
                    text = { Text("Add transaction") },
                    icon = { Text("+") },
                )
                NativeSection.Profile -> Unit
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                state is FinanceState.Loading && snapshot == null -> Progress()
                state is FinanceState.Failure && snapshot == null -> EmptyMessage(
                    "Finance data could not load",
                    (state as FinanceState.Failure).message,
                    "Try again",
                ) { scope.launch { financeRepository.refresh(force = true) } }
                snapshot != null -> when (section) {
                    NativeSection.Accounts -> AccountsScreen(
                        snapshot,
                        onEdit = { editAccount = it },
                        onArchive = { archiveAccount = it },
                        onTransfer = { transfer = true },
                    )
                    NativeSection.Transactions -> TransactionsScreen(
                        snapshot,
                        onEdit = { entry ->
                            scope.launch {
                                val editable = financeRepository.loadEditableTransaction(entry.id)
                                if (editable == null) snackbar.showSnackbar("Transaction could not be edited.")
                                else editTransaction = editable
                            }
                        },
                        onDelete = { deleteEntry = it },
                    )
                    NativeSection.Profile -> ProfileScreen(email) { scope.launch { onSignOut() } }
                }
                else -> Progress()
            }
        }
    }

    if (newAccount) AccountDialog(null, { newAccount = false }) { draft ->
        val result = financeRepository.createAccount(draft)
        if (result is FinanceResult.Success) newAccount = false
        report(result, "Account created")
    }

    editAccount?.let { account ->
        AccountDialog(account, { editAccount = null }) { draft ->
            val result = financeRepository.updateAccount(
                account.id,
                AccountUpdate(draft.name, draft.accountNumber, draft.accountKind),
            )
            if (result is FinanceResult.Success) editAccount = null
            report(result, "Account updated")
        }
    }

    if (transfer && snapshot != null) TransferDialog(snapshot.activeAccounts, { transfer = false }) { draft ->
        val result = financeRepository.createTransfer(draft)
        if (result is FinanceResult.Success) transfer = false
        report(result, "Transfer recorded")
    }

    if (newTransaction && snapshot != null) TransactionDialog(
        editable = null,
        accounts = snapshot.activeAccounts,
        categories = snapshot.categories,
        onDismiss = { newTransaction = false },
    ) { draft ->
        val result = financeRepository.createTransaction(draft)
        if (result is FinanceResult.Success) newTransaction = false
        report(result, "Transaction saved")
    }

    editTransaction?.let { editable ->
        if (snapshot != null) TransactionDialog(
            editable,
            snapshot.activeAccounts,
            snapshot.categories,
            { editTransaction = null },
        ) { draft ->
            val result = financeRepository.updateTransaction(editable.id, draft)
            if (result is FinanceResult.Success) editTransaction = null
            report(result, "Transaction updated")
        }
    }

    archiveAccount?.let { account ->
        AlertDialog(
            onDismissRequest = { archiveAccount = null },
            title = { Text(if (account.status == "active") "Archive account?" else "Restore account?") },
            text = { Text("Financial history remains preserved. Archived accounts cannot receive new ledger entries.") },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        val archived = account.status == "active"
                        val result = financeRepository.setAccountArchived(account.id, archived)
                        archiveAccount = null
                        report(result, if (archived) "Account archived" else "Account restored")
                    }
                }) { Text(if (account.status == "active") "Archive" else "Restore") }
            },
            dismissButton = { TextButton(onClick = { archiveAccount = null }) { Text("Cancel") } },
        )
    }

    deleteEntry?.let { entry ->
        AlertDialog(
            onDismissRequest = { deleteEntry = null },
            title = { Text("Delete ledger entry?") },
            text = { Text("It remains visible as deleted and secure database triggers recalculate balances.") },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        val result = financeRepository.softDelete(entry)
                        deleteEntry = null
                        report(result, "Ledger entry deleted")
                    }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleteEntry = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun AccountsScreen(
    snapshot: FinanceSnapshot,
    onEdit: (FinanceAccount) -> Unit,
    onArchive: (FinanceAccount) -> Unit,
    onTransfer: () -> Unit,
) {
    var archivedVisible by remember { mutableStateOf(false) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 100.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Column(Modifier.fillMaxWidth().padding(20.dp)) {
                    Text("Total active balance", style = MaterialTheme.typography.labelLarge)
                    Text(formatPkr(snapshot.totalActiveBalance), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("${snapshot.activeAccounts.size} active accounts")
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(onClick = onTransfer, enabled = snapshot.activeAccounts.size >= 2) {
                        Text("Transfer between accounts")
                    }
                }
            }
        }
        if (snapshot.activeAccounts.isEmpty()) item { EmptyMessage("No active accounts", "Use Add account to create one.") }
        else items(snapshot.activeAccounts, key = { it.id }) { AccountCard(it, onEdit, onArchive) }

        if (snapshot.archivedAccounts.isNotEmpty()) {
            item {
                TextButton(onClick = { archivedVisible = !archivedVisible }) {
                    Text(if (archivedVisible) "Hide archived" else "Show archived (${snapshot.archivedAccounts.size})")
                }
            }
            if (archivedVisible) items(snapshot.archivedAccounts, key = { "archived-${it.id}" }) {
                AccountCard(it, onEdit, onArchive)
            }
        }
    }
}

@Composable
private fun AccountCard(account: FinanceAccount, onEdit: (FinanceAccount) -> Unit, onArchive: (FinanceAccount) -> Unit) {
    Card(shape = RoundedCornerShape(20.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(Modifier.size(44.dp), RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                    Box(contentAlignment = Alignment.Center) { Text(account.name.take(1).uppercase(), fontWeight = FontWeight.Bold) }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(account.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${account.accountKind} • ${account.type}", style = MaterialTheme.typography.bodySmall)
                }
                Text(formatPkr(account.balance), fontWeight = FontWeight.Bold)
            }
            if (!account.accountNumber.isNullOrBlank()) Text("•••• ${account.accountNumber.takeLast(4)}", style = MaterialTheme.typography.bodySmall)
            Row {
                TextButton(onClick = { onEdit(account) }, enabled = account.status == "active") { Text("Edit") }
                TextButton(onClick = { onArchive(account) }) { Text(if (account.status == "active") "Archive" else "Restore") }
            }
        }
    }
}

@Composable
private fun TransactionsScreen(snapshot: FinanceSnapshot, onEdit: (LedgerEntry) -> Unit, onDelete: (LedgerEntry) -> Unit) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(LedgerFilter.All) }
    val rows = snapshot.ledger.filter { entry ->
        val filterMatch = when (filter) {
            LedgerFilter.All -> true
            LedgerFilter.Income -> entry.type == "income"
            LedgerFilter.Expense -> entry.type == "expense"
            LedgerFilter.Transfer -> entry.type == "transfer"
        }
        val needle = query.trim().lowercase()
        val searchMatch = needle.isBlank() || listOfNotNull(
            entry.type, entry.note, entry.reference, entry.sourceName, entry.personName,
            entry.itemName, entry.categories?.name, entry.accounts?.name,
        ).any { needle in it.lowercase() }
        filterMatch && searchMatch
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 100.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), label = { Text("Search transactions") }, singleLine = true) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                LedgerFilter.entries.forEach { option ->
                    FilterChip(filter == option, { filter = option }, label = { Text(option.name) })
                }
            }
        }
        if (rows.isEmpty()) item { EmptyMessage("No matching transactions", "Add income, expense or a transfer.") }
        else items(rows, key = { "${it.type}-${it.id}" }) { LedgerCard(it, onEdit, onDelete) }
    }
}

@Composable
private fun LedgerCard(entry: LedgerEntry, onEdit: (LedgerEntry) -> Unit, onDelete: (LedgerEntry) -> Unit) {
    val positive = entry.type == "income" || entry.type == "refund"
    val sign = if (entry.type == "transfer") "" else if (positive) "+" else "-"
    val title = entry.accounts?.name ?: entry.categories?.name ?: entry.type.replaceFirstChar { it.uppercase() }
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.isDeleted) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f) else MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Row {
                Column(Modifier.weight(1f)) {
                    Text(title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${entry.date} • ${entry.type}", style = MaterialTheme.typography.bodySmall)
                }
                Text("$sign${formatPkr(entry.amount)}", fontWeight = FontWeight.Bold)
            }
            listOfNotNull(entry.sourceName, entry.personName, entry.itemName, entry.note, entry.reference)
                .firstOrNull { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall, maxLines = 2) }
            if (entry.isDeleted) Text("Deleted • history preserved", color = MaterialTheme.colorScheme.error)
            else Row {
                if (entry.canEditDirectly) TextButton(onClick = { onEdit(entry) }) { Text("Edit") }
                TextButton(onClick = { onDelete(entry) }) { Text("Delete") }
            }
        }
    }
}

@Composable
private fun ProfileScreen(email: String, onSignOut: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Native session active", style = MaterialTheme.typography.headlineSmall)
        Text(email)
        Text("Accounts and transactions use authenticated native networking. Chrome and WebView are not used.")
        Button(onClick = onSignOut) { Text("Sign out") }
    }
}

@Composable
private fun AccountDialog(account: FinanceAccount?, onDismiss: () -> Unit, onSave: suspend (AccountDraft) -> Unit) {
    val scope = rememberCoroutineScope()
    var name by remember(account) { mutableStateOf(account?.name.orEmpty()) }
    var number by remember(account) { mutableStateOf(account?.accountNumber.orEmpty()) }
    var kind by remember(account) { mutableStateOf(account?.accountKind ?: "savings") }
    var amount by remember(account) { mutableStateOf(if (account == null) "" else account.openingBalanceOriginal.editable()) }
    var currency by remember(account) { mutableStateOf(account?.openingCurrency ?: "PKR") }
    var rate by remember(account) { mutableStateOf(account?.openingExchangeRateToPkr?.editable() ?: "1") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    FormDialog(if (account == null) "New account" else "Edit account", onDismiss, busy, if (account == null) "Create account" else "Update account", {
        OutlinedTextField(name, { name = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Account name") }, singleLine = true)
        OutlinedTextField(number, { number = it }, Modifier.fillMaxWidth(), label = { Text("Account number (optional)") }, singleLine = true)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("savings", "current").forEach { value -> FilterChip(kind == value, { kind = value }, label = { Text(value) }) }
        }
        if (account == null) {
            OutlinedTextField(amount, { amount = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Opening balance") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
            ChoiceField("Opening currency", currency, SupportedFinanceCurrencies) { currency = it; if (it == "PKR") rate = "1" }
            if (currency != "PKR") OutlinedTextField(rate, { rate = it; error = null }, Modifier.fillMaxWidth(), label = { Text("1 $currency equals PKR") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
        } else Text("Balance is controlled by the secure ledger and cannot be edited directly.", style = MaterialTheme.typography.bodySmall)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }) {
        val parsedAmount = if (account == null) amount.toDoubleOrNull() ?: 0.0 else 0.0
        val parsedRate = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
        error = when {
            name.isBlank() -> "Enter an account name."
            account == null && parsedAmount < 0 -> "Opening balance cannot be negative."
            account == null && (parsedRate == null || parsedRate <= 0) -> "Enter a valid PKR exchange rate."
            else -> null
        }
        if (error == null) scope.launch {
            busy = true
            onSave(AccountDraft(name, number, kind, parsedAmount, currency, parsedRate ?: 1.0))
            busy = false
        }
    }
}

@Composable
private fun TransactionDialog(
    editable: EditableTransaction?,
    accounts: List<FinanceAccount>,
    categories: List<FinanceCategory>,
    onDismiss: () -> Unit,
    onSave: suspend (TransactionDraft) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var type by remember(editable) { mutableStateOf(editable?.type ?: "expense") }
    var amount by remember(editable) { mutableStateOf(editable?.amountOriginal?.editable().orEmpty()) }
    var currency by remember(editable) { mutableStateOf(editable?.currency ?: "PKR") }
    var rate by remember(editable) { mutableStateOf(editable?.exchangeRateToPkr?.editable() ?: "1") }
    var accountId by remember(editable, accounts) { mutableStateOf(editable?.accountId ?: accounts.firstOrNull()?.id.orEmpty()) }
    var categoryId by remember(editable, categories) { mutableStateOf(editable?.categoryId ?: categories.firstOrNull { it.type == type }?.id.orEmpty()) }
    var date by remember(editable) { mutableStateOf(editable?.date ?: today()) }
    var source by remember(editable) { mutableStateOf(editable?.sourceName.orEmpty()) }
    var person by remember(editable) { mutableStateOf(editable?.personName.orEmpty()) }
    var item by remember(editable) { mutableStateOf(editable?.itemName.orEmpty()) }
    var reference by remember(editable) { mutableStateOf(editable?.reference.orEmpty()) }
    var note by remember(editable) { mutableStateOf(editable?.note.orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val accountOptions = accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" }
    val categoryOptions = categories.filter { it.type == type }.map { category ->
        val parent = categories.firstOrNull { it.id == category.parentId }?.name
        category.id to if (parent == null) category.name else "$parent / ${category.name}"
    }

    FormDialog(if (editable == null) "New transaction" else "Edit transaction", onDismiss, busy, if (editable == null) "Save transaction" else "Update transaction", {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("income", "expense").forEach { value ->
                FilterChip(type == value, {
                    type = value
                    categoryId = categories.firstOrNull { it.type == value }?.id.orEmpty()
                }, label = { Text(value) })
            }
        }
        OutlinedTextField(amount, { amount = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Amount") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
        ChoiceField("Currency", currency, SupportedFinanceCurrencies) { currency = it; if (it == "PKR") rate = "1" }
        if (currency != "PKR") OutlinedTextField(rate, { rate = it; error = null }, Modifier.fillMaxWidth(), label = { Text("1 $currency equals PKR") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
        PairChoiceField("Account", accountId, accountOptions) { accountId = it }
        PairChoiceField("Category", categoryId, categoryOptions) { categoryId = it }
        OutlinedTextField(date, { date = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Date (YYYY-MM-DD)") }, singleLine = true)
        if (type == "income") OutlinedTextField(source, { source = it }, Modifier.fillMaxWidth(), label = { Text("Source (optional)") }, singleLine = true)
        OutlinedTextField(person, { person = it }, Modifier.fillMaxWidth(), label = { Text("Person (optional)") }, singleLine = true)
        OutlinedTextField(item, { item = it }, Modifier.fillMaxWidth(), label = { Text("Item (optional)") }, singleLine = true)
        OutlinedTextField(reference, { reference = it }, Modifier.fillMaxWidth(), label = { Text("Reference (optional)") }, singleLine = true)
        OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("Note (optional)") }, minLines = 2)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }) {
        val parsedAmount = amount.toDoubleOrNull()
        val parsedRate = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
        error = when {
            parsedAmount == null || parsedAmount <= 0 -> "Enter an amount greater than 0."
            parsedRate == null || parsedRate <= 0 -> "Enter a valid PKR exchange rate."
            accountId.isBlank() -> "Select an account."
            categoryId.isBlank() -> "Select a category."
            !date.matches(Regex("""\d{4}-\d{2}-\d{2}""")) -> "Enter a date as YYYY-MM-DD."
            else -> null
        }
        if (error == null) scope.launch {
            busy = true
            onSave(TransactionDraft(type, parsedAmount ?: 0.0, currency, parsedRate ?: 1.0, categoryId, accountId, date, note, source, person, item, reference))
            busy = false
        }
    }
}

@Composable
private fun TransferDialog(accounts: List<FinanceAccount>, onDismiss: () -> Unit, onSave: suspend (TransferDraft) -> Unit) {
    val scope = rememberCoroutineScope()
    var fromId by remember(accounts) { mutableStateOf(accounts.firstOrNull()?.id.orEmpty()) }
    var toId by remember(accounts) { mutableStateOf(accounts.firstOrNull { it.id != fromId }?.id.orEmpty()) }
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var rate by remember { mutableStateOf("1") }
    var date by remember { mutableStateOf(today()) }
    var note by remember { mutableStateOf("") }
    var reference by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val options = accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" }

    FormDialog("Transfer", onDismiss, busy, "Record transfer", {
        PairChoiceField("From account", fromId, options) {
            fromId = it
            if (toId == it) toId = accounts.firstOrNull { row -> row.id != it }?.id.orEmpty()
        }
        PairChoiceField("To account", toId, options.filter { it.first != fromId }) { toId = it }
        OutlinedTextField(amount, { amount = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Amount") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
        ChoiceField("Currency", currency, SupportedFinanceCurrencies) { currency = it; if (it == "PKR") rate = "1" }
        if (currency != "PKR") OutlinedTextField(rate, { rate = it; error = null }, Modifier.fillMaxWidth(), label = { Text("1 $currency equals PKR") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
        OutlinedTextField(date, { date = it; error = null }, Modifier.fillMaxWidth(), label = { Text("Date (YYYY-MM-DD)") }, singleLine = true)
        OutlinedTextField(reference, { reference = it }, Modifier.fillMaxWidth(), label = { Text("Reference (optional)") }, singleLine = true)
        OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("Note (optional)") }, minLines = 2)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }) {
        val parsedAmount = amount.toDoubleOrNull()
        val parsedRate = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
        val canonical = (parsedAmount ?: 0.0) * (parsedRate ?: 0.0)
        val available = accounts.firstOrNull { it.id == fromId }?.balance
        error = when {
            accounts.size < 2 -> "Add at least two active accounts."
            fromId.isBlank() || toId.isBlank() || fromId == toId -> "Select two different accounts."
            parsedAmount == null || parsedAmount <= 0 -> "Enter an amount greater than 0."
            parsedRate == null || parsedRate <= 0 -> "Enter a valid PKR exchange rate."
            available != null && canonical > available + .000001 -> "Amount exceeds the available balance."
            !date.matches(Regex("""\d{4}-\d{2}-\d{2}""")) -> "Enter a date as YYYY-MM-DD."
            else -> null
        }
        if (error == null) scope.launch {
            busy = true
            onSave(TransferDraft(fromId, toId, parsedAmount ?: 0.0, currency, parsedRate ?: 1.0, date, note, reference))
            busy = false
        }
    }
}

@Composable
private fun FormDialog(
    title: String,
    onDismiss: () -> Unit,
    busy: Boolean,
    confirmLabel: String,
    content: @Composable () -> Unit,
    onConfirm: () -> Unit,
) {
    Dialog(onDismissRequest = { if (!busy) onDismiss() }) {
        Surface(Modifier.fillMaxWidth().heightIn(max = 700.dp), RoundedCornerShape(26.dp), tonalElevation = 6.dp) {
            Column(Modifier.padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(title, style = MaterialTheme.typography.headlineSmall)
                content()
                HorizontalDivider()
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") }
                    Button(onClick = onConfirm, enabled = !busy) {
                        if (busy) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Spacer(Modifier.width(8.dp)) }
                        Text(if (busy) "Saving…" else confirmLabel)
                    }
                }
            }
        }
    }
}

@Composable
private fun ChoiceField(label: String, value: String, options: List<String>, onSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Surface(Modifier.fillMaxWidth().clickable { expanded = true }, RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
            Text(value, Modifier.padding(16.dp, 14.dp))
        }
        DropdownMenu(expanded, { expanded = false }) {
            options.forEach { option -> DropdownMenuItem({ Text(option) }, { expanded = false; onSelected(option) }) }
        }
    }
}

@Composable
private fun PairChoiceField(label: String, selectedId: String, options: List<Pair<String, String>>, onSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.firstOrNull { it.first == selectedId }?.second ?: "Select"
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Surface(Modifier.fillMaxWidth().clickable { expanded = true }, RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
            Text(selected, Modifier.padding(16.dp, 14.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        DropdownMenu(expanded, { expanded = false }) {
            options.forEach { option -> DropdownMenuItem({ Text(option.second) }, { expanded = false; onSelected(option.first) }) }
        }
    }
}

@Composable
private fun EmptyMessage(title: String, body: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, fontWeight = FontWeight.SemiBold)
        Text(body, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (action != null && onAction != null) Button(onClick = onAction) { Text(action) }
    }
}

@Composable private fun Progress() = Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
private fun formatPkr(amount: Double): String = "PKR ${NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 2 }.format(amount)}"
private fun Double.editable(): String = if (!isFinite()) "" else toString().removeSuffix(".0")
private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
