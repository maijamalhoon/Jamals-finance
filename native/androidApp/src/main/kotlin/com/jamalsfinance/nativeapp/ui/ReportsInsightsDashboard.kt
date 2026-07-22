package com.jamalsfinance.nativeapp.ui

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.reports.AiChatResult
import com.jamalsfinance.shared.reports.AiInsight
import com.jamalsfinance.shared.reports.AiInsightsPayload
import com.jamalsfinance.shared.reports.AiSuggestedAction
import com.jamalsfinance.shared.reports.ReportBreakdown
import com.jamalsfinance.shared.reports.ReportCashFlowPoint
import com.jamalsfinance.shared.reports.ReportPeriod
import com.jamalsfinance.shared.reports.ReportSelection
import com.jamalsfinance.shared.reports.ReportSummary
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import com.jamalsfinance.shared.reports.ReportsInsightsSnapshot
import com.jamalsfinance.shared.reports.ReportsInsightsState
import com.jamalsfinance.shared.reports.formatReportMoney
import com.jamalsfinance.shared.reports.reportSelection
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.max

private enum class ReportsInsightsTab { Reports, AiInsights }

private data class NativeChatMessage(
    val role: String,
    val content: String,
)

private val ReportCurrencies = listOf("PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsInsightsDashboard(
    repository: ReportsInsightsRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val state by repository.state.collectAsStateWithLifecycle()
    val today = remember { appTodayKey() }
    var tab by remember { mutableStateOf(ReportsInsightsTab.Reports) }
    var period by remember { mutableStateOf(ReportPeriod.Month) }
    var customStart by remember { mutableStateOf("") }
    var customEnd by remember { mutableStateOf("") }
    var selectedCurrency by remember { mutableStateOf("PKR") }
    var pendingCsv by remember { mutableStateOf<String?>(null) }
    var pendingFileName by remember { mutableStateOf("jamals-finance-report.csv") }

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("text/csv"),
    ) { uri ->
        val csv = pendingCsv
        if (uri != null && csv != null) {
            runCatching {
                context.contentResolver.openOutputStream(uri)?.use { stream ->
                    stream.write(byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte()))
                    stream.write(csv.toByteArray(Charsets.UTF_8))
                } ?: error("File could not be opened.")
            }.onSuccess {
                Toast.makeText(context, "Report exported", Toast.LENGTH_SHORT).show()
            }.onFailure {
                Toast.makeText(context, "Report could not be exported", Toast.LENGTH_LONG).show()
            }
        }
        pendingCsv = null
    }

    fun currentSelection(): ReportSelection? = runCatching {
        reportSelection(
            period = period,
            nowDate = today,
            customStart = customStart.takeIf(String::isNotBlank),
            customEnd = customEnd.takeIf(String::isNotBlank),
        )
    }.getOrNull()

    fun refresh(
        force: Boolean = true,
        selectionOverride: ReportSelection? = null,
        currencyOverride: String = selectedCurrency,
    ) {
        val selection = selectionOverride ?: currentSelection()
        if (selection == null) {
            Toast.makeText(
                context,
                "Enter valid custom dates in YYYY-MM-DD format.",
                Toast.LENGTH_LONG,
            ).show()
            return
        }
        scope.launch {
            repository.refresh(
                nowDate = today,
                selection = selection,
                currency = currencyOverride,
                force = force,
            )
        }
    }

    fun selectPeriod(next: ReportPeriod) {
        period = next
        if (next != ReportPeriod.Custom) {
            refresh(
                force = true,
                selectionOverride = reportSelection(next, today),
            )
        }
    }

    fun selectCurrency(next: String) {
        selectedCurrency = next
        refresh(force = true, currencyOverride = next)
    }

    LaunchedEffect(repository) {
        repository.refresh(
            nowDate = today,
            selection = reportSelection(ReportPeriod.Month, today),
            currency = selectedCurrency,
        )
    }

    BackHandler { onBack() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Reports & AI Insights", fontWeight = FontWeight.Bold)
                        Text(
                            "Native financial intelligence",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text("Back") }
                },
                actions = {
                    TextButton(onClick = { refresh(true) }) { Text("Refresh") }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = tab == ReportsInsightsTab.Reports,
                    onClick = { tab = ReportsInsightsTab.Reports },
                    label = { Text("Reports") },
                )
                FilterChip(
                    selected = tab == ReportsInsightsTab.AiInsights,
                    onClick = { tab = ReportsInsightsTab.AiInsights },
                    label = { Text("AI Insights") },
                )
            }

            when (val current = state) {
                ReportsInsightsState.Idle -> CenteredReportsProgress()
                is ReportsInsightsState.Loading -> {
                    val snapshot = current.previous
                    if (snapshot == null) {
                        CenteredReportsProgress()
                    } else {
                        ReportsInsightsContent(
                            tab = tab,
                            snapshot = snapshot,
                            selectedCurrency = selectedCurrency,
                            period = period,
                            customStart = customStart,
                            customEnd = customEnd,
                            loading = true,
                            onPeriodChange = ::selectPeriod,
                            onCustomStartChange = { customStart = it },
                            onCustomEndChange = { customEnd = it },
                            onApplyCustom = { refresh(true) },
                            onCurrencyChange = ::selectCurrency,
                            onExport = {
                                pendingCsv = snapshot.csv(selectedCurrency)
                                pendingFileName =
                                    "jamals-finance-$selectedCurrency-${snapshot.report.selection.start}-to-${snapshot.report.selection.end}.csv"
                                exportLauncher.launch(pendingFileName)
                            },
                            repository = repository,
                        )
                    }
                }
                is ReportsInsightsState.Ready -> ReportsInsightsContent(
                    tab = tab,
                    snapshot = current.snapshot,
                    selectedCurrency = selectedCurrency,
                    period = period,
                    customStart = customStart,
                    customEnd = customEnd,
                    loading = false,
                    onPeriodChange = ::selectPeriod,
                    onCustomStartChange = { customStart = it },
                    onCustomEndChange = { customEnd = it },
                    onApplyCustom = { refresh(true) },
                    onCurrencyChange = ::selectCurrency,
                    onExport = {
                        pendingCsv = current.snapshot.csv(selectedCurrency)
                        pendingFileName =
                            "jamals-finance-$selectedCurrency-${current.snapshot.report.selection.start}-to-${current.snapshot.report.selection.end}.csv"
                        exportLauncher.launch(pendingFileName)
                    },
                    repository = repository,
                )
                is ReportsInsightsState.Failure -> {
                    val snapshot = current.previous
                    if (snapshot == null) {
                        FailureState(current.message) { refresh(true) }
                    } else {
                        Column(Modifier.fillMaxSize()) {
                            InlineNativeNotice(current.message, danger = true)
                            ReportsInsightsContent(
                                tab = tab,
                                snapshot = snapshot,
                                selectedCurrency = selectedCurrency,
                                period = period,
                                customStart = customStart,
                                customEnd = customEnd,
                                loading = false,
                                onPeriodChange = ::selectPeriod,
                                onCustomStartChange = { customStart = it },
                                onCustomEndChange = { customEnd = it },
                                onApplyCustom = { refresh(true) },
                                onCurrencyChange = ::selectCurrency,
                                onExport = {
                                    pendingCsv = snapshot.csv(selectedCurrency)
                                    pendingFileName =
                                        "jamals-finance-$selectedCurrency-${snapshot.report.selection.start}-to-${snapshot.report.selection.end}.csv"
                                    exportLauncher.launch(pendingFileName)
                                },
                                repository = repository,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportsInsightsContent(
    tab: ReportsInsightsTab,
    snapshot: ReportsInsightsSnapshot,
    selectedCurrency: String,
    period: ReportPeriod,
    customStart: String,
    customEnd: String,
    loading: Boolean,
    onPeriodChange: (ReportPeriod) -> Unit,
    onCustomStartChange: (String) -> Unit,
    onCustomEndChange: (String) -> Unit,
    onApplyCustom: () -> Unit,
    onCurrencyChange: (String) -> Unit,
    onExport: () -> Unit,
    repository: ReportsInsightsRepository,
) {
    when (tab) {
        ReportsInsightsTab.Reports -> ReportsTab(
            snapshot = snapshot,
            selectedCurrency = selectedCurrency,
            period = period,
            customStart = customStart,
            customEnd = customEnd,
            loading = loading,
            onPeriodChange = onPeriodChange,
            onCustomStartChange = onCustomStartChange,
            onCustomEndChange = onCustomEndChange,
            onApplyCustom = onApplyCustom,
            onCurrencyChange = onCurrencyChange,
            onExport = onExport,
        )
        ReportsInsightsTab.AiInsights -> AiInsightsTab(
            snapshot = snapshot,
            selectedCurrency = selectedCurrency,
            onCurrencyChange = onCurrencyChange,
            repository = repository,
        )
    }
}

@Composable
private fun ReportsTab(
    snapshot: ReportsInsightsSnapshot,
    selectedCurrency: String,
    period: ReportPeriod,
    customStart: String,
    customEnd: String,
    loading: Boolean,
    onPeriodChange: (ReportPeriod) -> Unit,
    onCustomStartChange: (String) -> Unit,
    onCustomEndChange: (String) -> Unit,
    onApplyCustom: () -> Unit,
    onCurrencyChange: (String) -> Unit,
    onExport: () -> Unit,
) {
    val report = snapshot.report
    val money: (Double) -> String = {
        formatReportMoney(it, selectedCurrency, snapshot.exchangeRates)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp, 10.dp, 18.dp, 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            ReportControls(
                period = period,
                customStart = customStart,
                customEnd = customEnd,
                selectedCurrency = selectedCurrency,
                loading = loading,
                onPeriodChange = onPeriodChange,
                onCustomStartChange = onCustomStartChange,
                onCustomEndChange = onCustomEndChange,
                onApplyCustom = onApplyCustom,
                onCurrencyChange = onCurrencyChange,
                onExport = onExport,
            )
        }

        if (report.partialAreas.isNotEmpty()) {
            item {
                InlineNativeNotice(
                    "Report prepared with partial data. Unavailable: ${report.partialAreas.joinToString()}.",
                    danger = false,
                )
            }
        }

        item {
            Column {
                Text(
                    report.rangeLabel,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "${report.incomeCount + report.expenseCount} income and expense entries · " +
                        "${report.refundCount} refunds · ${report.transferCount} transfers",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                MetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Income",
                    value = money(report.totalIncome),
                    helper = "${report.incomeCount} entries",
                    tone = MaterialTheme.colorScheme.primary,
                )
                MetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Expenses",
                    value = money(report.totalExpenses),
                    helper = "${report.refundCount} refunds applied",
                    tone = MaterialTheme.colorScheme.error,
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                MetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Net result",
                    value = money(report.netResult),
                    helper = if (report.netResult >= 0) "Positive cash flow" else "Negative cash flow",
                    tone = if (report.netResult >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                )
                MetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Daily spending",
                    value = money(report.averageDailySpending),
                    helper = "${report.inclusiveDays} days",
                    tone = MaterialTheme.colorScheme.tertiary,
                )
            }
        }

        if (!report.financialDataAvailable) {
            item {
                InlineNativeNotice(
                    "Transaction data is unavailable. Saved records were not changed.",
                    danger = true,
                )
            }
        } else if (
            report.incomeCount == 0 &&
            report.expenseCount == 0 &&
            report.transferCount == 0
        ) {
            item { EmptyReportRange() }
        }

        item {
            ReportSectionCard(
                title = "Cash flow",
                subtitle = "Income is green and expenses are red.",
            ) {
                CashFlowChart(report.cashFlow)
            }
        }

        item {
            ReportSectionCard(
                title = "Expense categories",
                subtitle = "Refunds reduce their original expense category.",
            ) {
                BreakdownList(
                    rows = report.expenseCategories.take(8),
                    money = money,
                    emptyMessage = "No expense categories in this range.",
                )
            }
        }

        item {
            ReportSectionCard(
                title = "Income sources",
                subtitle = "Largest sources are listed first.",
            ) {
                BreakdownList(
                    rows = report.incomeSources.take(8),
                    money = money,
                    emptyMessage = "No income sources in this range.",
                )
            }
        }

        item {
            ReportSectionCard(
                title = "Account activity",
                subtitle = "Income, expenses and transfers remain separate.",
            ) {
                if (report.accountActivity.isEmpty()) {
                    EmptySectionText("No account activity in this range.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        report.accountActivity.take(8).forEach { account ->
                            SoftPanel {
                                Text(
                                    account.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "In ${money(account.income)} · Out ${money(account.expenses)}",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                Text(
                                    "Transfer in ${money(account.transfersIn)} · out ${money(account.transfersOut)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                SummaryModuleCard(
                    modifier = Modifier.weight(1f),
                    title = "Goals",
                    value = money(report.goals.saved),
                    helper = "toward ${money(report.goals.target)}",
                    status = "${report.goals.completedCount}/${report.goals.count} completed",
                )
                SummaryModuleCard(
                    modifier = Modifier.weight(1f),
                    title = "Payables",
                    value = money(report.payables.remaining),
                    helper = "${report.payables.count} records",
                    status = "${report.payables.overdueCount} overdue",
                    danger = report.payables.overdueCount > 0,
                )
            }
        }

        item {
            SummaryModuleCard(
                modifier = Modifier.fillMaxWidth(),
                title = "Investments",
                value = money(report.investments.currentValue),
                helper = "${money(report.investments.invested)} invested",
                status =
                    "${if (report.investments.pnl >= 0) "+" else ""}${money(report.investments.pnl)} · " +
                        "${formatPercent(report.investments.pnlPercentage)}",
                danger = report.investments.pnl < 0,
            )
        }

        item {
            ReportSectionCard(
                title = "Activity summary",
                subtitle = "Canonical report values stay in PKR; display conversion happens only at the final boundary.",
            ) {
                KeyValueRow("Average daily income", money(report.averageDailyIncome))
                KeyValueRow("Transfer volume", money(report.transferVolume))
                KeyValueRow("Export rows", report.exportRows.size.toString())
                KeyValueRow(
                    "Exchange rate",
                    if (snapshot.rateLive) "Live" else "Cached / fallback",
                )
            }
        }
    }
}

@Composable
private fun ReportControls(
    period: ReportPeriod,
    customStart: String,
    customEnd: String,
    selectedCurrency: String,
    loading: Boolean,
    onPeriodChange: (ReportPeriod) -> Unit,
    onCustomStartChange: (String) -> Unit,
    onCustomEndChange: (String) -> Unit,
    onApplyCustom: () -> Unit,
    onCurrencyChange: (String) -> Unit,
    onExport: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PeriodChip("Week", ReportPeriod.Week, period, onPeriodChange)
                PeriodChip("Month", ReportPeriod.Month, period, onPeriodChange)
                PeriodChip("6 months", ReportPeriod.SixMonths, period, onPeriodChange)
                PeriodChip("Year", ReportPeriod.Year, period, onPeriodChange)
                PeriodChip("Custom", ReportPeriod.Custom, period, onPeriodChange)
            }

            if (period == ReportPeriod.Custom) {
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedTextField(
                        value = customStart,
                        onValueChange = onCustomStartChange,
                        modifier = Modifier.weight(1f),
                        label = { Text("Start") },
                        placeholder = { Text("YYYY-MM-DD") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    )
                    OutlinedTextField(
                        value = customEnd,
                        onValueChange = onCustomEndChange,
                        modifier = Modifier.weight(1f),
                        label = { Text("End") },
                        placeholder = { Text("YYYY-MM-DD") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    )
                }
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = onApplyCustom,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !loading,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text("Apply custom range")
                }
            }

            Spacer(Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CurrencyMenu(
                    selected = selectedCurrency,
                    onSelected = onCurrencyChange,
                    modifier = Modifier.weight(1f),
                )
                OutlinedButton(
                    onClick = onExport,
                    enabled = !loading,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text("Export CSV")
                }
            }
        }
    }
}

@Composable
private fun PeriodChip(
    label: String,
    value: ReportPeriod,
    selected: ReportPeriod,
    onSelected: (ReportPeriod) -> Unit,
) {
    FilterChip(
        selected = selected == value,
        onClick = { onSelected(value) },
        label = { Text(label) },
    )
}

@Composable
private fun CurrencyMenu(
    selected: String,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text("Currency · $selected")
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            ReportCurrencies.forEach { currency ->
                DropdownMenuItem(
                    text = { Text(currency) },
                    onClick = {
                        expanded = false
                        onSelected(currency)
                    },
                )
            }
        }
    }
}

@Composable
private fun MetricCard(
    modifier: Modifier,
    label: String,
    value: String,
    helper: String,
    tone: Color,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = tone,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                helper,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ReportSectionCard(
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
private fun CashFlowChart(rows: List<ReportCashFlowPoint>) {
    if (rows.isEmpty()) {
        EmptySectionText("No cash-flow activity in this range.")
        return
    }
    val incomeColor = Color(0xFF16A36A)
    val expenseColor = Color(0xFFE24A4A)
    val maxValue = max(
        rows.maxOfOrNull { it.income } ?: 0.0,
        rows.maxOfOrNull { it.expenses } ?: 0.0,
    ).coerceAtLeast(1.0)

    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp)
            .background(
                MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.35f),
                RoundedCornerShape(20.dp),
            )
            .padding(12.dp),
    ) {
        val baseline = size.height - 12.dp.toPx()
        val top = 10.dp.toPx()
        val usableHeight = baseline - top
        val groupWidth = size.width / rows.size.coerceAtLeast(1)
        val barWidth = (groupWidth * 0.24f).coerceAtLeast(3.dp.toPx())
        rows.forEachIndexed { index, row ->
            val center = groupWidth * index + groupWidth / 2f
            val incomeHeight = (row.income / maxValue).toFloat() * usableHeight
            val expenseHeight = (row.expenses / maxValue).toFloat() * usableHeight
            drawRoundRect(
                color = incomeColor,
                topLeft = Offset(center - barWidth - 2.dp.toPx(), baseline - incomeHeight),
                size = Size(barWidth, incomeHeight.coerceAtLeast(2.dp.toPx())),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()),
            )
            drawRoundRect(
                color = expenseColor,
                topLeft = Offset(center + 2.dp.toPx(), baseline - expenseHeight),
                size = Size(barWidth, expenseHeight.coerceAtLeast(2.dp.toPx())),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()),
            )
        }
    }
    Spacer(Modifier.height(10.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
    ) {
        LegendDot(incomeColor, "Income")
        Spacer(Modifier.width(18.dp))
        LegendDot(expenseColor, "Expenses")
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(8.dp)
                .background(color, CircleShape),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun BreakdownList(
    rows: List<ReportBreakdown>,
    money: (Double) -> String,
    emptyMessage: String,
) {
    if (rows.isEmpty()) {
        EmptySectionText(emptyMessage)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        rows.forEach { row ->
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        row.name,
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "${money(row.amount)} · ${formatPercent(row.percentage)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { (row.percentage / 100.0).toFloat().coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth().height(7.dp),
                    strokeCap = StrokeCap.Round,
                )
            }
        }
    }
}

@Composable
private fun SummaryModuleCard(
    modifier: Modifier,
    title: String,
    value: String,
    helper: String,
    status: String,
    danger: Boolean = false,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
            Text(
                helper,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                status,
                style = MaterialTheme.typography.labelSmall,
                color = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun AiInsightsTab(
    snapshot: ReportsInsightsSnapshot,
    selectedCurrency: String,
    onCurrencyChange: (String) -> Unit,
    repository: ReportsInsightsRepository,
) {
    val scope = rememberCoroutineScope()
    val insights = snapshot.insights
    val chatMessages = remember(snapshot.nowDate) { mutableStateListOf<NativeChatMessage>() }
    var question by remember { mutableStateOf("") }
    var chatLoading by remember { mutableStateOf(false) }
    var chatError by remember { mutableStateOf("") }

    fun sendQuestion(raw: String) {
        val clean = raw.trim()
        if (clean.isBlank() || chatLoading) return
        question = ""
        chatError = ""
        chatMessages += NativeChatMessage("user", clean)
        scope.launch {
            chatLoading = true
            when (val result = repository.ask(clean, selectedCurrency)) {
                is AiChatResult.Success ->
                    chatMessages += NativeChatMessage("assistant", result.payload.answer)
                is AiChatResult.Failure -> chatError = result.message
            }
            chatLoading = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp, 10.dp, 18.dp, 36.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            CurrencyMenu(
                selected = selectedCurrency,
                onSelected = onCurrencyChange,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        item {
            HealthOverview(insights)
        }

        insights.message?.takeIf { it.isNotBlank() }?.let { message ->
            item { InlineNativeNotice(message, danger = false) }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                insights.summaryCards.take(2).forEach { card ->
                    MetricCard(
                        modifier = Modifier.weight(1f),
                        label = card.label,
                        value = card.value,
                        helper = card.caption,
                        tone = summaryToneColor(card.tone),
                    )
                }
            }
        }

        if (insights.summaryCards.size > 2) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    insights.summaryCards.drop(2).take(2).forEach { card ->
                        MetricCard(
                            modifier = Modifier.weight(1f),
                            label = card.label,
                            value = card.value,
                            helper = card.caption,
                            tone = summaryToneColor(card.tone),
                        )
                    }
                }
            }
        }

        item {
            ReportSectionCard(
                title = "Personalized insights",
                subtitle =
                    if (insights.aiAvailable) "Generated securely through the server-side Gemini provider."
                    else "Generated from deterministic finance rules without exposing privileged secrets.",
            ) {
                if (insights.insights.isEmpty()) {
                    EmptySectionText("Add finance records to receive personalized insights.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        insights.insights.forEach { insight ->
                            InsightRow(insight)
                        }
                    }
                }
            }
        }

        item {
            ReportSectionCard(
                title = "Suggested actions",
                subtitle = "Actions are based only on summarized finance data.",
            ) {
                if (insights.suggestedActions.isEmpty()) {
                    EmptySectionText("No suggested actions are available yet.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        insights.suggestedActions.forEach { action ->
                            ActionRow(action)
                        }
                    }
                }
            }
        }

        item {
            ReportSectionCard(
                title = "Ask your finance assistant",
                subtitle = "Questions use summarized authenticated finance data. Raw secrets never enter the mobile binary.",
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    StarterPrompt("Where did I spend the most?", ::sendQuestion)
                    StarterPrompt("How can I improve my cash flow?", ::sendQuestion)
                    StarterPrompt("What should I focus on next?", ::sendQuestion)
                }

                if (chatMessages.isNotEmpty()) {
                    Spacer(Modifier.height(14.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        chatMessages.forEach { message ->
                            ChatBubble(message)
                        }
                    }
                }

                if (chatLoading) {
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Preparing a grounded answer…",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                if (chatError.isNotBlank()) {
                    Spacer(Modifier.height(10.dp))
                    Text(
                        chatError,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }

                Spacer(Modifier.height(14.dp))
                OutlinedTextField(
                    value = question,
                    onValueChange = {
                        question = it.take(500)
                        chatError = ""
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Ask a finance question") },
                    minLines = 2,
                    maxLines = 5,
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { sendQuestion(question) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = question.trim().isNotBlank() && !chatLoading,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text("Send")
                }
            }
        }

        item {
            ReportSectionCard(
                title = "Privacy boundary",
                subtitle = "How this native module protects financial information.",
            ) {
                KeyValueRow("Authentication", "Supabase access token")
                KeyValueRow("Data isolation", "PostgreSQL Row Level Security")
                KeyValueRow("AI key", "Server-side only")
                KeyValueRow("Mobile secret", "No service role or Gemini key")
                KeyValueRow("Fallback", "Deterministic local calculations")
            }
        }
    }
}

@Composable
private fun HealthOverview(insights: AiInsightsPayload) {
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HealthRing(insights.healthScore)
            Spacer(Modifier.width(18.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "FINANCIAL HEALTH",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    insights.healthLabel,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    if (insights.aiAvailable) "Gemini + verified finance summary"
                    else "Secure local finance intelligence",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun HealthRing(score: Int) {
    val progress = (score.coerceIn(0, 100) / 100f)
    val color = when {
        score >= 80 -> Color(0xFF16A36A)
        score >= 45 -> Color(0xFFF0A431)
        else -> Color(0xFFE24A4A)
    }
    Box(
        modifier = Modifier.size(112.dp),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 8.dp.toPx()
            drawArc(
                color = Color.Gray.copy(alpha = 0.18f),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
            drawArc(
                color = color,
                startAngle = -90f,
                sweepAngle = progress * 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
        }
        Text(
            score.toString(),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun InsightRow(insight: AiInsight) {
    val tone = when (insight.type) {
        "positive" -> Color(0xFF16A36A)
        "warning" -> Color(0xFFF0A431)
        else -> MaterialTheme.colorScheme.primary
    }
    SoftPanel {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                Modifier
                    .size(10.dp)
                    .background(tone, CircleShape),
            )
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    insight.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    insight.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ActionRow(action: AiSuggestedAction) {
    SoftPanel {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    action.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    action.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(10.dp))
            Text(
                action.priority.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = when (action.priority) {
                    "high" -> MaterialTheme.colorScheme.error
                    "low" -> Color(0xFF16A36A)
                    else -> Color(0xFFF0A431)
                },
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun StarterPrompt(
    label: String,
    onClick: (String) -> Unit,
) {
    OutlinedButton(
        onClick = { onClick(label) },
        shape = RoundedCornerShape(16.dp),
    ) {
        Text(label)
    }
}

@Composable
private fun ChatBubble(message: NativeChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement =
            if (message.role == "user") Arrangement.End else Arrangement.Start,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.88f)
                .background(
                    if (message.role == "user") MaterialTheme.colorScheme.primaryContainer
                    else MaterialTheme.colorScheme.surfaceContainerHighest,
                    RoundedCornerShape(18.dp),
                )
                .padding(13.dp),
        ) {
            Text(
                message.content,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun SoftPanel(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.55f),
                RoundedCornerShape(18.dp),
            )
            .padding(14.dp),
        content = content,
    )
}

@Composable
private fun KeyValueRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun EmptyReportRange() {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                "No report activity in this range",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(5.dp))
            Text(
                "Choose another period or add financial activity. No values are invented.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun EmptySectionText(message: String) {
    Text(
        message,
        modifier = Modifier.fillMaxWidth().padding(vertical = 18.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun InlineNativeNotice(
    message: String,
    danger: Boolean,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (danger) MaterialTheme.colorScheme.errorContainer
                else MaterialTheme.colorScheme.tertiaryContainer,
                RoundedCornerShape(18.dp),
            )
            .padding(14.dp),
    ) {
        Text(
            message,
            style = MaterialTheme.typography.bodySmall,
            color =
                if (danger) MaterialTheme.colorScheme.onErrorContainer
                else MaterialTheme.colorScheme.onTertiaryContainer,
        )
    }
}

@Composable
private fun FailureState(
    message: String,
    onRetry: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                message,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(14.dp))
            Button(onClick = onRetry) { Text("Try again") }
        }
    }
}

@Composable
private fun CenteredReportsProgress() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun summaryToneColor(tone: String): Color = when (tone) {
    "positive" -> Color(0xFF16A36A)
    "warning" -> Color(0xFFF0A431)
    "danger" -> MaterialTheme.colorScheme.error
    "info" -> MaterialTheme.colorScheme.tertiary
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

private fun formatPercent(value: Double): String =
    "${if (value > 0) "+" else ""}${"%.1f".format(Locale.US, value)}%"

private fun appTodayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("Asia/Karachi")
    }.format(Date())
