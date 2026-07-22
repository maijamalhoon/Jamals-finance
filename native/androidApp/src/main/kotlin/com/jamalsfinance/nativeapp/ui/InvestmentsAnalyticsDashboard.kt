package com.jamalsfinance.nativeapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.investments.AnalyticsBreakdown
import com.jamalsfinance.shared.investments.AnalyticsPeriod
import com.jamalsfinance.shared.investments.AnalyticsSelection
import com.jamalsfinance.shared.investments.AnalyticsSummary
import com.jamalsfinance.shared.investments.CashFlowPoint
import com.jamalsfinance.shared.investments.InvestmentAccount
import com.jamalsfinance.shared.investments.InvestmentDraft
import com.jamalsfinance.shared.investments.InvestmentHolding
import com.jamalsfinance.shared.investments.InvestmentRow
import com.jamalsfinance.shared.investments.InvestmentWithdrawalDraft
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsState
import com.jamalsfinance.shared.investments.MarketAsset
import com.jamalsfinance.shared.investments.MarketQuote
import com.jamalsfinance.shared.investments.MarketQuoteResult
import com.jamalsfinance.shared.investments.MarketSearchResult
import com.jamalsfinance.shared.investments.SupportedInvestmentCurrencies
import com.jamalsfinance.shared.investments.analyticsSelection
import com.jamalsfinance.shared.investments.normalizeInvestmentEditorType
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

private enum class InvestmentsAnalyticsTab { Investments, Analytics }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvestmentsAnalyticsDashboard(
    repository: InvestmentsAnalyticsRepository,
    onBack: () -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val today = remember { todayDateKey() }
    var tab by remember { mutableStateOf(InvestmentsAnalyticsTab.Investments) }
    var message by remember { mutableStateOf<String?>(null) }

    BackHandler { onBack() }
    LaunchedEffect(repository) {
        val result = repository.refresh(today)
        if (result is InvestmentsAnalyticsResult.Failure) message = result.message
    }

    val snapshot = when (val current = state) {
        is InvestmentsAnalyticsState.Ready -> current.snapshot
        is InvestmentsAnalyticsState.Loading -> current.previous
        is InvestmentsAnalyticsState.Failure -> current.previous
        InvestmentsAnalyticsState.Idle -> null
    }
    val loading = state is InvestmentsAnalyticsState.Loading
    val failure = (state as? InvestmentsAnalyticsState.Failure)?.message

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Investments & Analytics", fontWeight = FontWeight.Bold)
                        Text(
                            if (tab == InvestmentsAnalyticsTab.Investments) "Portfolio and live prices" else "Cash-flow intelligence",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                actions = {
                    TextButton(
                        enabled = !loading,
                        onClick = {
                            scope.launch {
                                message = null
                                val result = repository.refresh(today, force = true)
                                if (result is InvestmentsAnalyticsResult.Failure) message = result.message
                            }
                        },
                    ) { Text(if (loading) "Loading…" else "Refresh") }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = tab == InvestmentsAnalyticsTab.Investments,
                    onClick = { tab = InvestmentsAnalyticsTab.Investments },
                    label = { Text("Investments") },
                )
                FilterChip(
                    selected = tab == InvestmentsAnalyticsTab.Analytics,
                    onClick = { tab = InvestmentsAnalyticsTab.Analytics },
                    label = { Text("Analytics") },
                )
            }

            (message ?: failure)?.let {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                ) {
                    Text(
                        it,
                        modifier = Modifier.padding(14.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            if (snapshot == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                when (tab) {
                    InvestmentsAnalyticsTab.Investments -> InvestmentsScreen(
                        snapshot = snapshot,
                        repository = repository,
                        onMessage = { message = it },
                    )
                    InvestmentsAnalyticsTab.Analytics -> AnalyticsScreen(
                        snapshot = snapshot,
                        repository = repository,
                        onMessage = { message = it },
                    )
                }
            }
        }
    }
}

@Composable
private fun InvestmentsScreen(
    snapshot: InvestmentsAnalyticsSnapshot,
    repository: InvestmentsAnalyticsRepository,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var editing by remember { mutableStateOf<InvestmentRow?>(null) }
    var adding by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<InvestmentRow?>(null) }
    var cashingOut by remember { mutableStateOf<InvestmentRow?>(null) }
    val expanded = remember { mutableStateMapOf<String, Boolean>() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Button(onClick = { adding = true }, shape = RoundedCornerShape(16.dp)) {
                    Text("+ Add investment")
                }
            }
        }

        if (snapshot.investments.isEmpty()) {
            item {
                EmptyPanel(
                    title = "No investments yet",
                    description = "Add your first purchase to see portfolio value, performance and allocation.",
                )
            }
        } else {
            item {
                PortfolioOverview(snapshot)
            }
            item {
                PortfolioCharts(snapshot.holdings)
            }
            item {
                Text(
                    "Your holdings",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "${snapshot.investments.size} purchases across ${snapshot.holdings.size} assets",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            items(snapshot.holdings, key = { it.key }) { holding ->
                HoldingCard(
                    holding = holding,
                    expanded = expanded[holding.key] == true,
                    onToggle = { expanded[holding.key] = !(expanded[holding.key] == true) },
                    onEdit = { editing = it },
                    onDelete = { deleting = it },
                    onCashOut = { cashingOut = it },
                )
            }
        }
    }

    if (adding || editing != null) {
        InvestmentEditorDialog(
            repository = repository,
            snapshot = snapshot,
            investment = editing,
            onDismiss = {
                adding = false
                editing = null
            },
            onMessage = onMessage,
        )
    }

    deleting?.let { investment ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete investment?") },
            text = {
                Text(
                    "Delete ${investment.name}? The secure investment RPC will preserve linked ledger history.",
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val result = repository.deleteInvestment(investment.id)
                            onMessage((result as? InvestmentsAnalyticsResult.Failure)?.message)
                            if (result is InvestmentsAnalyticsResult.Success) deleting = null
                        }
                    },
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
        )
    }

    cashingOut?.let { investment ->
        InvestmentCashOutDialog(
            investment = investment,
            snapshot = snapshot,
            repository = repository,
            onDismiss = { cashingOut = null },
            onMessage = onMessage,
        )
    }
}

@Composable
private fun PortfolioOverview(snapshot: InvestmentsAnalyticsSnapshot) {
    val profitable = snapshot.totalPnl >= 0
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp)) {
            Text(
                "Portfolio value",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                formatPkr(snapshot.totalValue),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "${if (profitable) "+" else "-"}${formatPkr(abs(snapshot.totalPnl))} · " +
                    "${if (profitable) "+" else "-"}${formatPercent(abs(snapshot.totalPnlPct))}",
                color = if (profitable) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricCard(
                    label = "Invested",
                    value = formatPkr(snapshot.totalInvested),
                    helper = "Total cost basis",
                    modifier = Modifier.weight(1f),
                )
                MetricCard(
                    label = "Holdings",
                    value = snapshot.holdings.size.toString(),
                    helper = "${snapshot.holdings.count { it.livePriced }} live priced",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun PortfolioCharts(holdings: List<InvestmentHolding>) {
    if (holdings.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        ) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text("Current value vs cost", fontWeight = FontWeight.Bold)
                Text(
                    "Top holdings compare invested cost with current value.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                PortfolioComparisonChart(holdings.take(6), Modifier.fillMaxWidth().height(210.dp))
            }
        }
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AllocationDonut(holdings.take(6), Modifier.size(132.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Allocation", fontWeight = FontWeight.Bold)
                    val total = holdings.sumOf { it.currentValue }
                    holdings.take(5).forEachIndexed { index, holding ->
                        val pct = if (total > 0) holding.currentValue / total * 100 else 0.0
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                holding.symbol ?: holding.name,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Text(formatPercent(pct), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PortfolioComparisonChart(holdings: List<InvestmentHolding>, modifier: Modifier = Modifier) {
    val costColor = Color(0xFFE35D6A)
    val currentColor = Color(0xFF22A06B)
    Canvas(modifier) {
        if (holdings.isEmpty()) return@Canvas
        val maxValue = holdings.maxOf { max(it.totalInvested, it.currentValue) }.coerceAtLeast(1.0)
        val rowHeight = size.height / holdings.size
        val left = size.width * 0.12f
        val usable = size.width * 0.82f
        holdings.forEachIndexed { index, holding ->
            val top = index * rowHeight + rowHeight * 0.16f
            val barHeight = rowHeight * 0.23f
            drawRoundRect(
                color = costColor,
                topLeft = Offset(left, top),
                size = Size((holding.totalInvested / maxValue * usable).toFloat(), barHeight),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(barHeight / 2, barHeight / 2),
            )
            drawRoundRect(
                color = currentColor,
                topLeft = Offset(left, top + barHeight + rowHeight * 0.08f),
                size = Size((holding.currentValue / maxValue * usable).toFloat(), barHeight),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(barHeight / 2, barHeight / 2),
            )
        }
    }
}

@Composable
private fun AllocationDonut(holdings: List<InvestmentHolding>, modifier: Modifier = Modifier) {
    val palette = listOf(
        Color(0xFF6849B8),
        Color(0xFF16856B),
        Color(0xFFE69A2D),
        Color(0xFF3B82F6),
        Color(0xFFE35D6A),
        Color(0xFF64748B),
    )
    val total = holdings.sumOf { it.currentValue }
    Canvas(modifier) {
        val stroke = size.minDimension * 0.14f
        drawArc(
            color = Color(0x1A64748B),
            startAngle = -90f,
            sweepAngle = 360f,
            useCenter = false,
            style = Stroke(stroke, cap = StrokeCap.Round),
        )
        if (total <= 0) return@Canvas
        var start = -90f
        holdings.forEachIndexed { index, holding ->
            val sweep = (holding.currentValue / total * 360).toFloat()
            drawArc(
                color = palette[index % palette.size],
                startAngle = start,
                sweepAngle = max(1f, sweep - 2f),
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
            start += sweep
        }
    }
}

@Composable
private fun HoldingCard(
    holding: InvestmentHolding,
    expanded: Boolean,
    onToggle: () -> Unit,
    onEdit: (InvestmentRow) -> Unit,
    onDelete: (InvestmentRow) -> Unit,
    onCashOut: (InvestmentRow) -> Unit,
) {
    val profit = holding.totalPnl >= 0
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(17.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.size(48.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            (holding.symbol ?: holding.name).take(2).uppercase(),
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            holding.name,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        if (holding.livePriced) {
                            Text(
                                "LIVE",
                                color = Color(0xFF17815F),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                            )
                        }
                    }
                    Text(
                        "${holding.symbol ?: holding.type.uppercase()} · ${holding.lots.size} buy${if (holding.lots.size == 1) "" else "s"} · Qty ${formatQuantity(holding.quantity)}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricCard("Invested", formatPkr(holding.totalInvested), "Avg ${formatPkr(holding.averageBuyPrice)}", Modifier.weight(1f))
                MetricCard("Current", formatPkr(holding.currentValue), "Unit ${formatPkr(holding.currentPrice)}", Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (profit) Color(0x1517855F) else MaterialTheme.colorScheme.errorContainer,
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Profit / Loss", fontWeight = FontWeight.SemiBold)
                    Text(
                        "${if (profit) "+" else "-"}${formatPkr(abs(holding.totalPnl))} · " +
                            "${if (profit) "+" else "-"}${formatPercent(abs(holding.totalPnlPct))}",
                        color = if (profit) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = onToggle, modifier = Modifier.fillMaxWidth()) {
                Text(if (expanded) "Hide purchase history" else "Manage purchase history (${holding.lots.size})")
            }
            if (expanded) {
                Spacer(Modifier.height(8.dp))
                holding.lots.forEach { lot ->
                    InvestmentLotRow(
                        lot = lot,
                        onEdit = { onEdit(lot) },
                        onDelete = { onDelete(lot) },
                        onCashOut = { onCashOut(lot) },
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun InvestmentLotRow(
    lot: InvestmentRow,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onCashOut: () -> Unit,
) {
    val position = lot.position
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.fillMaxWidth().padding(13.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text(lot.purchasedAt ?: "No purchase date", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Qty ${formatQuantity(lot.quantity)} · Buy ${formatPkr(lot.purchasePrice)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    position?.let { formatPkr(it.currentValue) } ?: "—",
                    fontWeight = FontWeight.Bold,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                TextButton(onClick = onEdit) { Text("Edit") }
                TextButton(onClick = onCashOut, enabled = lot.quantity > 0 && lot.currentPrice > 0) { Text("Cash out") }
                TextButton(onClick = onDelete) { Text("Delete") }
            }
        }
    }
}

@Composable
private fun AnalyticsScreen(
    snapshot: InvestmentsAnalyticsSnapshot,
    repository: InvestmentsAnalyticsRepository,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val summary = snapshot.analytics
    var customOpen by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            PeriodPicker(
                selected = summary?.selection?.period ?: AnalyticsPeriod.Month,
                onSelect = { period ->
                    if (period == AnalyticsPeriod.Custom) {
                        customOpen = true
                    } else {
                        scope.launch {
                            val result = repository.refreshAnalytics(analyticsSelection(period, snapshot.nowDate))
                            onMessage((result as? InvestmentsAnalyticsResult.Failure)?.message)
                        }
                    }
                },
            )
        }

        if (summary == null) {
            item { EmptyPanel("Analytics unavailable", "Refresh the workspace to calculate the selected period.") }
        } else {
            item { AnalyticsKpis(summary) }
            item {
                AnalyticsChartCard(
                    title = "Cash flow",
                    description = "${summary.cashFlow.size} chronological buckets",
                ) {
                    CashFlowChart(summary.cashFlow, Modifier.fillMaxWidth().height(230.dp))
                }
            }
            item {
                AnalyticsChartCard(
                    title = "Expense categories",
                    description = "Refunds reduce the category that originally carried the expense.",
                ) {
                    BreakdownDonutAndList(summary.expenseCategories)
                }
            }
            item {
                BreakdownCard("Income sources", summary.incomeSources)
            }
            item {
                BreakdownCard("Account spending", summary.accountSpending)
            }
            item {
                AnalyticsPortfolioCard(summary)
            }
            item {
                LargestEntriesCard("Largest income", summary.largestIncome)
            }
            item {
                LargestEntriesCard("Largest expenses", summary.largestExpenses)
            }
        }
    }

    if (customOpen) {
        CustomAnalyticsRangeDialog(
            nowDate = snapshot.nowDate,
            onDismiss = { customOpen = false },
            onApply = { start, end ->
                scope.launch {
                    runCatching { analyticsSelection(AnalyticsPeriod.Custom, snapshot.nowDate, start, end) }
                        .onSuccess { selection ->
                            val result = repository.refreshAnalytics(selection)
                            onMessage((result as? InvestmentsAnalyticsResult.Failure)?.message)
                            if (result is InvestmentsAnalyticsResult.Success) customOpen = false
                        }
                        .onFailure { onMessage(it.message) }
                }
            },
        )
    }
}

@Composable
private fun PeriodPicker(selected: AnalyticsPeriod, onSelect: (AnalyticsPeriod) -> Unit) {
    val options = listOf(
        AnalyticsPeriod.Today to "Today",
        AnalyticsPeriod.Week to "7 days",
        AnalyticsPeriod.Month to "Month",
        AnalyticsPeriod.SixMonths to "6 months",
        AnalyticsPeriod.Year to "Year",
        AnalyticsPeriod.Custom to "Custom",
    )
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(options) { (period, label) ->
            FilterChip(
                selected = selected == period,
                onClick = { onSelect(period) },
                label = { Text(label) },
            )
        }
    }
}

@Composable
private fun AnalyticsKpis(summary: AnalyticsSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AnalyticsKpi(
                "Income",
                formatPkr(summary.totalIncome),
                summary.incomeChange.label,
                summary.incomeChange.favorable,
                Modifier.weight(1f),
            )
            AnalyticsKpi(
                "Expenses",
                formatPkr(summary.totalExpenses),
                summary.expensesChange.label,
                summary.expensesChange.favorable,
                Modifier.weight(1f),
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AnalyticsKpi(
                "Net savings",
                formatPkr(summary.netSavings),
                summary.netSavingsChange.label,
                summary.netSavingsChange.favorable,
                Modifier.weight(1f),
            )
            AnalyticsKpi(
                "Savings rate",
                summary.savingsRate?.let(::formatPercent) ?: "—",
                summary.savingsRateChange.label,
                summary.savingsRateChange.favorable,
                Modifier.weight(1f),
            )
        }
        Card(
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        ) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text("Period facts", fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text("${summary.incomeCount} income entries · ${summary.expenseCount} expense entries")
                Text("Average daily income ${formatPkr(summary.averageDailyIncome)}")
                Text("Average daily spending ${formatPkr(summary.averageDailySpending)}")
                Text("${summary.transferCount} transfers · ${formatPkr(summary.transferVolume)} moved")
            }
        }
    }
}

@Composable
private fun AnalyticsKpi(
    label: String,
    value: String,
    change: String,
    favorable: Boolean?,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.padding(15.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Text(
                change,
                style = MaterialTheme.typography.bodySmall,
                color = when (favorable) {
                    true -> Color(0xFF17815F)
                    false -> MaterialTheme.colorScheme.error
                    null -> MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
    }
}

@Composable
private fun AnalyticsChartCard(
    title: String,
    description: String,
    content: @Composable () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun CashFlowChart(points: List<CashFlowPoint>, modifier: Modifier = Modifier) {
    val incomeColor = Color(0xFF22A06B)
    val expenseColor = Color(0xFFE35D6A)
    val netColor = Color(0xFF6849B8)
    Canvas(modifier) {
        if (points.isEmpty()) return@Canvas
        val maxBar = points.maxOf { max(it.income, it.expenses) }.coerceAtLeast(1.0)
        val maxNet = points.maxOf { abs(it.cumulativeNet) }.coerceAtLeast(1.0)
        val slot = size.width / points.size
        val barWidth = max(3f, slot * 0.22f)
        val chartHeight = size.height * 0.76f
        val baseY = size.height * 0.84f
        val netPoints = mutableListOf<Offset>()
        points.forEachIndexed { index, point ->
            val center = slot * index + slot / 2
            val incomeHeight = (point.income / maxBar * chartHeight).toFloat()
            val expenseHeight = (point.expenses / maxBar * chartHeight).toFloat()
            drawRoundRect(
                incomeColor,
                topLeft = Offset(center - barWidth - 2f, baseY - incomeHeight),
                size = Size(barWidth, incomeHeight),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(barWidth / 2, barWidth / 2),
            )
            drawRoundRect(
                expenseColor,
                topLeft = Offset(center + 2f, baseY - expenseHeight),
                size = Size(barWidth, expenseHeight),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(barWidth / 2, barWidth / 2),
            )
            val normalized = ((point.cumulativeNet / maxNet) + 1) / 2
            netPoints += Offset(center, (baseY - normalized * chartHeight).toFloat())
        }
        netPoints.zipWithNext().forEach { (a, b) ->
            drawLine(netColor, a, b, strokeWidth = 4f, cap = StrokeCap.Round)
        }
        netPoints.forEach { drawCircle(netColor, radius = 5f, center = it) }
    }
}

@Composable
private fun BreakdownDonutAndList(items: List<AnalyticsBreakdown>) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BreakdownDonut(items, Modifier.size(130.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (items.isEmpty()) {
                Text("No spending in this period.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                items.forEach {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            it.name,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text("${formatPercent(it.percentage)} · ${formatPkr(it.amount)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun BreakdownDonut(items: List<AnalyticsBreakdown>, modifier: Modifier = Modifier) {
    val palette = listOf(
        Color(0xFF6849B8),
        Color(0xFF22A06B),
        Color(0xFFE69A2D),
        Color(0xFF3B82F6),
        Color(0xFFE35D6A),
        Color(0xFF64748B),
    )
    Canvas(modifier) {
        val stroke = size.minDimension * 0.15f
        drawArc(Color(0x1A64748B), -90f, 360f, false, style = Stroke(stroke, cap = StrokeCap.Round))
        var start = -90f
        items.forEachIndexed { index, item ->
            val sweep = (item.percentage / 100 * 360).toFloat()
            drawArc(
                palette[index % palette.size],
                start,
                max(1f, sweep - 2f),
                false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
            start += sweep
        }
    }
}

@Composable
private fun BreakdownCard(title: String, items: List<AnalyticsBreakdown>) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            if (items.isEmpty()) {
                Text("No data in this period.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                items.take(6).forEach { item ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(item.name, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            item.helper?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                        Text("${formatPkr(item.amount)} · ${formatPercent(item.percentage)}", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun AnalyticsPortfolioCard(summary: AnalyticsSummary) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text("Investment portfolio", fontWeight = FontWeight.Bold)
            Text(
                "${formatPkr(summary.portfolioValue)} current · ${formatPkr(summary.portfolioInvested)} invested",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "${if (summary.portfolioPnl >= 0) "+" else "-"}${formatPkr(abs(summary.portfolioPnl))}",
                color = if (summary.portfolioPnl >= 0) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))
            summary.portfolioHoldings.forEach {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(it.symbol ?: it.name, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text(formatPkr(it.currentValue), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun LargestEntriesCard(
    title: String,
    entries: List<com.jamalsfinance.shared.investments.LargestAnalyticsEntry>,
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(Modifier.fillMaxWidth().padding(17.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            if (entries.isEmpty()) {
                Text("No matching entries.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                entries.forEach { entry ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(entry.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                "${entry.date} · ${entry.categoryName}${entry.accountName?.let { " · $it" } ?: ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(formatPkr(entry.amount), fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(9.dp))
                }
            }
        }
    }
}

@Composable
private fun InvestmentEditorDialog(
    repository: InvestmentsAnalyticsRepository,
    snapshot: InvestmentsAnalyticsSnapshot,
    investment: InvestmentRow?,
    onDismiss: () -> Unit,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val editing = investment != null
    var searchQuery by remember(investment?.id) { mutableStateOf("") }
    var searchLoading by remember { mutableStateOf(false) }
    var searchResults by remember { mutableStateOf<List<MarketAsset>>(emptyList()) }
    var selectedAsset by remember(investment?.id) { mutableStateOf<MarketAsset?>(null) }
    var quote by remember(investment?.id) { mutableStateOf<MarketQuote?>(null) }
    var name by remember(investment?.id) { mutableStateOf(investment?.name.orEmpty()) }
    var type by remember(investment?.id) { mutableStateOf(investment?.let { normalizeInvestmentEditorType(it.type) } ?: "crypto") }
    var symbol by remember(investment?.id) { mutableStateOf(investment?.symbol.orEmpty()) }
    var quantity by remember(investment?.id) { mutableStateOf(investment?.quantity?.toString().orEmpty()) }
    var purchaseCurrency by remember(investment?.id) { mutableStateOf(investment?.purchaseCurrency ?: "PKR") }
    var purchasePrice by remember(investment?.id) {
        mutableStateOf((investment?.purchasePriceOriginal ?: investment?.purchasePrice)?.toString().orEmpty())
    }
    var purchaseRate by remember(investment?.id) {
        mutableStateOf(
            (investment?.purchaseExchangeRate
                ?: snapshot.rateToPkr(investment?.purchaseCurrency ?: "PKR")
                ?: 1.0).toString(),
        )
    }
    var currentCurrency by remember(investment?.id) { mutableStateOf(investment?.currentPriceCurrency ?: "PKR") }
    var currentPrice by remember(investment?.id) {
        mutableStateOf((investment?.currentPriceOriginal ?: investment?.currentPrice)?.toString().orEmpty())
    }
    var currentRate by remember(investment?.id) {
        mutableStateOf((snapshot.rateToPkr(investment?.currentPriceCurrency ?: "PKR") ?: 1.0).toString())
    }
    var date by remember(investment?.id) { mutableStateOf(investment?.purchasedAt ?: snapshot.nowDate) }
    var accountId by remember(investment?.id) {
        mutableStateOf(investment?.linkedAccountId ?: snapshot.accounts.firstOrNull()?.id.orEmpty())
    }
    var assetId by remember(investment?.id) { mutableStateOf(investment?.assetId) }
    var imageUrl by remember(investment?.id) { mutableStateOf(investment?.imageUrl) }
    var priceSource by remember(investment?.id) { mutableStateOf(investment?.priceSource ?: "manual") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = { if (!loading) onDismiss() }) {
        Surface(
            modifier = Modifier.fillMaxWidth().heightIn(max = 760.dp),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.fillMaxWidth().padding(20.dp)) {
                Text(if (editing) "Edit investment" else "Add investment", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Column(
                    Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (!editing) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it; error = null },
                            label = { Text("Search any crypto, stock or forex asset") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            trailingIcon = {
                                TextButton(
                                    enabled = !searchLoading,
                                    onClick = {
                                        scope.launch {
                                            searchLoading = true
                                            when (val result = repository.searchAssets(searchQuery)) {
                                                is MarketSearchResult.Success -> {
                                                    searchResults = result.assets
                                                    error = if (result.assets.isEmpty()) "No assets found. Manual entry remains available." else null
                                                }
                                                is MarketSearchResult.Failure -> error = result.message
                                            }
                                            searchLoading = false
                                        }
                                    },
                                ) { Text(if (searchLoading) "…" else "Search") }
                            },
                        )
                        searchResults.take(8).forEach { asset ->
                            Surface(
                                modifier = Modifier.fillMaxWidth().clickable {
                                    selectedAsset = asset
                                    name = asset.name
                                    type = asset.assetType
                                    symbol = asset.symbol
                                    assetId = asset.id
                                    imageUrl = asset.logoUrl.ifBlank { null }
                                    currentCurrency = asset.quoteCurrency
                                    currentRate = (snapshot.rateToPkr(asset.quoteCurrency) ?: 1.0).toString()
                                    priceSource = "catalog"
                                    quote = null
                                    scope.launch {
                                        when (val result = repository.loadQuote(asset)) {
                                            is MarketQuoteResult.Success -> {
                                                quote = result.quote
                                                currentPrice = formatDecimal(result.quote.price)
                                                currentCurrency = result.quote.currency
                                                currentRate = (snapshot.rateToPkr(result.quote.currency) ?: 1.0).toString()
                                                priceSource = result.quote.source
                                            }
                                            is MarketQuoteResult.Failure -> error = result.message
                                        }
                                    }
                                },
                                shape = RoundedCornerShape(16.dp),
                                color = if (selectedAsset?.id == asset.id) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow,
                            ) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Surface(shape = RoundedCornerShape(14.dp), modifier = Modifier.size(40.dp), color = MaterialTheme.colorScheme.surfaceContainer) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(asset.symbol.take(2).uppercase(), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(asset.name, fontWeight = FontWeight.SemiBold)
                                        Text("${asset.symbol} · ${asset.assetType} · ${asset.quoteCurrency}", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }

                    OutlinedTextField(name, { name = it; error = null }, label = { Text("Asset name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    SimpleDropdown("Asset type", listOf("crypto", "stock", "forex", "other"), type) { type = it }
                    OutlinedTextField(symbol, { symbol = it.uppercase(); error = null }, label = { Text("Symbol (optional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(
                        quantity,
                        { quantity = it; error = null },
                        label = { Text("Quantity") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                    )
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            purchasePrice,
                            { purchasePrice = it; error = null },
                            label = { Text("Buy price / unit") },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                        )
                        SimpleDropdown("Currency", SupportedInvestmentCurrencies, purchaseCurrency, Modifier.width(112.dp)) {
                            purchaseCurrency = it
                            purchaseRate = (snapshot.rateToPkr(it) ?: 1.0).toString()
                        }
                    }
                    OutlinedTextField(
                        purchaseRate,
                        { purchaseRate = it; error = null },
                        label = { Text("Buy currency → PKR rate") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = purchaseCurrency != "PKR",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                    )
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            currentPrice,
                            { currentPrice = it; quote = null; priceSource = "manual"; error = null },
                            label = { Text("Current price / unit") },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                        )
                        SimpleDropdown("Currency", SupportedInvestmentCurrencies, currentCurrency, Modifier.width(112.dp)) {
                            currentCurrency = it
                            currentRate = (snapshot.rateToPkr(it) ?: 1.0).toString()
                        }
                    }
                    OutlinedTextField(
                        currentRate,
                        { currentRate = it; error = null },
                        label = { Text("Current currency → PKR rate") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = currentCurrency != "PKR",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                    )
                    OutlinedTextField(date, { date = it; error = null }, label = { Text("Purchase date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    SimpleDropdown(
                        label = "Account used",
                        options = snapshot.accounts.map { it.id },
                        selected = accountId,
                        optionLabel = { id -> snapshot.accounts.firstOrNull { it.id == id }?.let { "${it.name} · ${formatPkr(it.balance)}" } ?: id },
                    ) { accountId = it }
                    quote?.let {
                        Text(
                            "Live quote: ${formatDecimal(it.price)} ${it.currency} · ${it.source}" +
                                (it.change24h?.let { change -> " · ${if (change >= 0) "+" else ""}${formatPercent(change)}" } ?: ""),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF17815F),
                        )
                    }
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                }
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss, enabled = !loading) { Text("Cancel") }
                    Button(
                        enabled = !loading,
                        onClick = {
                            val q = quantity.toDoubleOrNull()
                            val buy = purchasePrice.toDoubleOrNull()
                            val buyRate = if (purchaseCurrency == "PKR") 1.0 else purchaseRate.toDoubleOrNull()
                            val current = currentPrice.toDoubleOrNull()
                            val curRate = if (currentCurrency == "PKR") 1.0 else currentRate.toDoubleOrNull()
                            if (q == null || buy == null || buyRate == null || current == null || curRate == null) {
                                error = "Enter valid quantity, prices and exchange rates."
                                return@Button
                            }
                            scope.launch {
                                loading = true
                                val result = repository.saveInvestment(
                                    InvestmentDraft(
                                        investmentId = investment?.id,
                                        name = name,
                                        type = type,
                                        quantity = q,
                                        purchasePriceOriginal = buy,
                                        purchaseCurrency = purchaseCurrency,
                                        purchaseExchangeRateToPkr = buyRate,
                                        currentPriceOriginal = current,
                                        currentPriceCurrency = currentCurrency,
                                        currentExchangeRateToPkr = curRate,
                                        purchasedAt = date,
                                        assetId = assetId,
                                        symbol = symbol,
                                        imageUrl = imageUrl,
                                        priceSource = priceSource,
                                        priceUpdatedAt = quote?.updatedAtEpochMs?.let(::formatUtcTimestamp),
                                        priceChange24h = quote?.change24h ?: investment?.priceChange24h,
                                        isLivePriced = quote != null || investment?.isLivePriced == true,
                                        accountId = accountId,
                                    ),
                                )
                                loading = false
                                when (result) {
                                    InvestmentsAnalyticsResult.Success -> {
                                        onMessage(null)
                                        onDismiss()
                                    }
                                    is InvestmentsAnalyticsResult.Failure -> error = result.message
                                }
                            }
                        },
                    ) {
                        if (loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text(if (editing) "Update" else "Save")
                    }
                }
            }
        }
    }
}

@Composable
private fun InvestmentCashOutDialog(
    investment: InvestmentRow,
    snapshot: InvestmentsAnalyticsSnapshot,
    repository: InvestmentsAnalyticsRepository,
    onDismiss: () -> Unit,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var quantity by remember(investment.id) { mutableStateOf(investment.quantity.toString()) }
    var currency by remember(investment.id) { mutableStateOf(investment.currentPriceCurrency ?: "PKR") }
    var unitPrice by remember(investment.id) {
        mutableStateOf((investment.currentPriceOriginal ?: investment.currentPrice).toString())
    }
    var rate by remember(investment.id) { mutableStateOf((snapshot.rateToPkr(currency) ?: 1.0).toString()) }
    var accountId by remember(investment.id) { mutableStateOf(snapshot.accounts.firstOrNull()?.id.orEmpty()) }
    var date by remember(investment.id) { mutableStateOf(snapshot.nowDate) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = { if (!loading) onDismiss() }) {
        Surface(shape = RoundedCornerShape(28.dp), color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Cash out ${investment.name}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    "Available quantity ${formatQuantity(investment.quantity)} · current unit ${formatPkr(investment.currentPrice)}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    quantity,
                    { quantity = it; error = null },
                    label = { Text("Quantity to withdraw") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                )
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        unitPrice,
                        { unitPrice = it; error = null },
                        label = { Text("Withdrawal price / unit") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                    )
                    SimpleDropdown("Currency", SupportedInvestmentCurrencies, currency, Modifier.width(112.dp)) {
                        currency = it
                        rate = (snapshot.rateToPkr(it) ?: 1.0).toString()
                    }
                }
                OutlinedTextField(
                    rate,
                    { rate = it; error = null },
                    label = { Text("Currency → PKR rate") },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = currency != "PKR",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                )
                SimpleDropdown(
                    "Destination account",
                    snapshot.accounts.map { it.id },
                    accountId,
                    optionLabel = { id -> snapshot.accounts.firstOrNull { it.id == id }?.let { "${it.name} · ${formatPkr(it.balance)}" } ?: id },
                ) { accountId = it }
                OutlinedTextField(date, { date = it; error = null }, label = { Text("Withdrawal date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                val previewQuantity = quantity.toDoubleOrNull()
                val previewPrice = unitPrice.toDoubleOrNull()
                if (previewQuantity != null && previewPrice != null) {
                    Text("Expected proceeds: ${formatDecimal(previewQuantity * previewPrice)} $currency", fontWeight = FontWeight.Bold)
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss, enabled = !loading) { Text("Cancel") }
                    Button(
                        enabled = !loading,
                        onClick = {
                            val qty = quantity.toDoubleOrNull()
                            val price = unitPrice.toDoubleOrNull()
                            val exchange = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
                            if (qty == null || price == null || exchange == null) {
                                error = "Enter valid quantity, price and exchange rate."
                                return@Button
                            }
                            scope.launch {
                                loading = true
                                val result = repository.withdrawInvestment(
                                    InvestmentWithdrawalDraft(
                                        investmentId = investment.id,
                                        quantity = qty,
                                        withdrawalPriceOriginal = price,
                                        withdrawalCurrency = currency,
                                        withdrawalExchangeRateToPkr = exchange,
                                        destinationAccountId = accountId,
                                        withdrawnAt = date,
                                    ),
                                )
                                loading = false
                                when (result) {
                                    InvestmentsAnalyticsResult.Success -> {
                                        onMessage(null)
                                        onDismiss()
                                    }
                                    is InvestmentsAnalyticsResult.Failure -> error = result.message
                                }
                            }
                        },
                    ) {
                        if (loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text("Cash out")
                    }
                }
            }
        }
    }
}

@Composable
private fun CustomAnalyticsRangeDialog(
    nowDate: String,
    onDismiss: () -> Unit,
    onApply: (String, String) -> Unit,
) {
    var start by remember { mutableStateOf(nowDate.take(8) + "01") }
    var end by remember { mutableStateOf(nowDate) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Custom analytics range") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(start, { start = it }, label = { Text("Start (YYYY-MM-DD)") }, singleLine = true)
                OutlinedTextField(end, { end = it }, label = { Text("End (YYYY-MM-DD)") }, singleLine = true)
            }
        },
        confirmButton = { Button(onClick = { onApply(start, end) }) { Text("Apply") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun SimpleDropdown(
    label: String,
    options: List<String>,
    selected: String,
    modifier: Modifier = Modifier.fillMaxWidth(),
    optionLabel: (String) -> String = { it },
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            Column(Modifier.fillMaxWidth()) {
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(optionLabel(selected).ifBlank { "Select" }, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(optionLabel(option)) },
                    onClick = {
                        onSelect(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun MetricCard(
    label: String,
    value: String,
    helper: String,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.padding(13.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontWeight = FontWeight.Bold, maxLines = 2)
            Text(helper, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

@Composable
private fun EmptyPanel(title: String, description: String) {
    Card(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(
            Modifier.fillMaxWidth().padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(description, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun todayDateKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("Asia/Karachi")
}.format(Date())

private fun formatUtcTimestamp(epochMs: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(epochMs))

private val pkFormatter = NumberFormat.getNumberInstance(Locale.forLanguageTag("en-PK")).apply {
    minimumFractionDigits = 0
    maximumFractionDigits = 2
}

private fun formatPkr(value: Double): String = "Rs ${pkFormatter.format(value)}"

private fun formatPercent(value: Double): String =
    "${NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 1 }.format(value)}%"

private fun formatQuantity(value: Double): String =
    NumberFormat.getNumberInstance(Locale.US).apply {
        maximumFractionDigits = if (value >= 1) 4 else 8
    }.format(value)

private fun formatDecimal(value: Double): String =
    if (!value.isFinite()) "" else NumberFormat.getNumberInstance(Locale.US).apply {
        isGroupingUsed = false
        minimumFractionDigits = 0
        maximumFractionDigits = 12
    }.format(value)
