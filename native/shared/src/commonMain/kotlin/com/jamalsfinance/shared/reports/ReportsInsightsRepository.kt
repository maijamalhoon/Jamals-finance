package com.jamalsfinance.shared.reports

import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthSession
import com.jamalsfinance.shared.auth.AuthState
import com.jamalsfinance.shared.core.AppConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

private const val APP_API_BASE = "https://jamals-finance-sable.vercel.app"
private val SUPPORTED_REPORT_CURRENCIES = listOf("PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY")
private val DEFAULT_RATES = mapOf(
    "USD" to 1.0,
    "PKR" to 281.2,
    "INR" to 86.6,
    "EUR" to 0.92,
    "GBP" to 0.79,
    "JPY" to 149.5,
    "CNY" to 7.18,
)

enum class ReportPeriod { Week, Month, SixMonths, Year, Custom }

data class ReportSelection(
    val period: ReportPeriod,
    val start: String,
    val end: String,
)

data class ReportCashFlowPoint(
    val label: String,
    val start: String,
    val end: String,
    val income: Double,
    val expenses: Double,
    val net: Double,
)

data class ReportBreakdown(
    val id: String,
    val name: String,
    val amount: Double,
    val percentage: Double,
    val color: String? = null,
    val helper: String? = null,
)

data class ReportAccountActivity(
    val id: String,
    val name: String,
    val type: String?,
    val income: Double,
    val expenses: Double,
    val transfersIn: Double,
    val transfersOut: Double,
) {
    val totalActivity: Double
        get() = income + expenses + transfersIn + transfersOut
}

data class ReportGoalSummary(
    val count: Int,
    val completedCount: Int,
    val target: Double,
    val saved: Double,
) {
    val completionPercentage: Double
        get() = if (target > 0) (saved / target) * 100 else 0.0
}

data class ReportPayableSummary(
    val count: Int,
    val original: Double,
    val paid: Double,
    val remaining: Double,
    val overdueCount: Int,
)

data class ReportInvestmentSummary(
    val count: Int,
    val invested: Double,
    val currentValue: Double,
    val partialPricing: Boolean,
) {
    val pnl: Double get() = currentValue - invested
    val pnlPercentage: Double get() = if (invested > 0) (pnl / invested) * 100 else 0.0
}

data class ReportExportRow(
    val id: String,
    val date: String,
    val createdAt: String?,
    val type: String,
    val category: String,
    val account: String,
    val amountPkr: Double,
    val reference: String,
    val note: String,
)

data class ReportSummary(
    val selection: ReportSelection,
    val rangeLabel: String,
    val totalIncome: Double,
    val totalExpenses: Double,
    val netResult: Double,
    val inclusiveDays: Int,
    val averageDailyIncome: Double,
    val averageDailySpending: Double,
    val incomeCount: Int,
    val expenseCount: Int,
    val refundCount: Int,
    val transferCount: Int,
    val transferVolume: Double,
    val cashFlow: List<ReportCashFlowPoint>,
    val expenseCategories: List<ReportBreakdown>,
    val incomeSources: List<ReportBreakdown>,
    val accountActivity: List<ReportAccountActivity>,
    val goals: ReportGoalSummary,
    val payables: ReportPayableSummary,
    val investments: ReportInvestmentSummary,
    val exportRows: List<ReportExportRow>,
    val partialAreas: List<String>,
    val financialDataAvailable: Boolean,
)

@Serializable
data class AiInsight(
    val type: String,
    val title: String,
    val message: String,
)

@Serializable
data class AiSuggestedAction(
    val title: String,
    val description: String,
    val priority: String,
)

@Serializable
data class AiSummaryCard(
    val label: String,
    val value: String,
    val caption: String,
    val tone: String,
)

@Serializable
data class AiInsightsPayload(
    val healthScore: Int = 0,
    val healthLabel: String = "Fair",
    val insights: List<AiInsight> = emptyList(),
    val suggestedActions: List<AiSuggestedAction> = emptyList(),
    val summaryCards: List<AiSummaryCard> = emptyList(),
    val provider: String = "local-finance-intelligence",
    val model: String = "native-finance-summary-v1",
    val generatedAt: String? = null,
    val aiAvailable: Boolean = false,
    val message: String? = null,
    val empty: Boolean = false,
)

@Serializable
data class AiChatRequest(
    val question: String,
    val currency: String,
    val rate: Double,
    val rateLive: Boolean,
)

@Serializable
data class AiChatPayload(
    val provider: String = "local-calculator",
    val model: String = "native-finance-ledger-v1",
    val answer: String,
    val followUps: List<String> = emptyList(),
    val aiAvailable: Boolean = true,
    val deterministic: Boolean = false,
)

sealed interface AiChatResult {
    data class Success(val payload: AiChatPayload) : AiChatResult
    data class Failure(val message: String) : AiChatResult
}

data class ReportsInsightsSnapshot(
    val report: ReportSummary,
    val insights: AiInsightsPayload,
    val exchangeRates: Map<String, Double>,
    val selectedCurrency: String,
    val rateLive: Boolean,
    val nowDate: String,
) {
    fun convertFromPkr(value: Double, currency: String = selectedCurrency): Double =
        convertReportCurrency(value, "PKR", currency, exchangeRates)

    fun csv(currency: String = selectedCurrency): String =
        buildReportCsv(report.exportRows, currency, exchangeRates)
}

sealed interface ReportsInsightsState {
    data object Idle : ReportsInsightsState
    data class Loading(val previous: ReportsInsightsSnapshot? = null) : ReportsInsightsState
    data class Ready(val snapshot: ReportsInsightsSnapshot) : ReportsInsightsState
    data class Failure(
        val message: String,
        val previous: ReportsInsightsSnapshot? = null,
    ) : ReportsInsightsState
}

sealed interface ReportsInsightsResult {
    data object Success : ReportsInsightsResult
    data class Failure(val message: String) : ReportsInsightsResult
}

interface ReportsInsightsRepository {
    val state: StateFlow<ReportsInsightsState>

    suspend fun refresh(
        nowDate: String,
        selection: ReportSelection,
        currency: String = "PKR",
        force: Boolean = false,
    ): ReportsInsightsResult

    suspend fun ask(question: String, currency: String = "PKR"): AiChatResult
}

class SupabaseReportsInsightsRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val authRepository: AuthRepository,
) : ReportsInsightsRepository {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }
    private val client = baseClient.config {
        expectSuccess = false
        install(ContentNegotiation) { json(json) }
    }
    private val refreshMutex = Mutex()
    private val mutableState = MutableStateFlow<ReportsInsightsState>(ReportsInsightsState.Idle)
    override val state: StateFlow<ReportsInsightsState> = mutableState.asStateFlow()

    override suspend fun refresh(
        nowDate: String,
        selection: ReportSelection,
        currency: String,
        force: Boolean,
    ): ReportsInsightsResult = refreshMutex.withLock {
        requireDateKey(nowDate)
        validateReportSelection(selection, nowDate)
        requireCurrency(currency)
        val previous = currentSnapshot()
        if (
            !force &&
            previous != null &&
            previous.nowDate == nowDate &&
            previous.report.selection == selection &&
            previous.selectedCurrency == currency &&
            mutableState.value is ReportsInsightsState.Ready
        ) {
            return ReportsInsightsResult.Success
        }

        mutableState.value = ReportsInsightsState.Loading(previous)
        runCatching {
            val session = requireSession()
            val ratesDeferred = coroutineScope {
                async { loadExchangeRates() }
            }
            val ratesResult = ratesDeferred.await()
            val report = loadReport(session, selection, nowDate)
            val insights = loadInsights(session, currency, ratesResult.rates, ratesResult.live)
                ?: buildLocalInsights(report, currency, ratesResult.rates)
            val snapshot = ReportsInsightsSnapshot(
                report = report,
                insights = insights,
                exchangeRates = ratesResult.rates,
                selectedCurrency = currency,
                rateLive = ratesResult.live,
                nowDate = nowDate,
            )
            mutableState.value = ReportsInsightsState.Ready(snapshot)
            ReportsInsightsResult.Success
        }.getOrElse { error ->
            val message = error.safeMessage()
            mutableState.value = ReportsInsightsState.Failure(message, previous)
            ReportsInsightsResult.Failure(message)
        }
    }

    override suspend fun ask(question: String, currency: String): AiChatResult = runCatching {
        val cleanQuestion = question.replace(Regex("\\s+"), " ").trim().take(500)
        require(cleanQuestion.isNotBlank()) { "Ask a finance question before sending." }
        requireCurrency(currency)
        val session = requireSession()
        val snapshot = currentSnapshot()
            ?: throw ReportsInsightsException("Load Reports & AI Insights first.")
        val rate = reportExchangeRate("PKR", currency, snapshot.exchangeRates)
            ?: throw ReportsInsightsException("Exchange rate is unavailable.")

        val response = client.post("$APP_API_BASE/api/native/ai-insights") {
            header(HttpHeaders.Accept, ContentType.Application.Json)
            header(HttpHeaders.ContentType, ContentType.Application.Json)
            bearerAuth(session.accessToken)
            setBody(
                AiChatRequest(
                    question = cleanQuestion,
                    currency = currency,
                    rate = rate,
                    rateLive = snapshot.rateLive,
                ),
            )
        }
        if (response.status.isSuccess()) {
            AiChatResult.Success(response.body<AiChatPayload>())
        } else {
            AiChatResult.Success(localChatAnswer(cleanQuestion, snapshot, currency))
        }
    }.getOrElse { error ->
        val snapshot = currentSnapshot()
        if (snapshot != null) {
            AiChatResult.Success(localChatAnswer(question, snapshot, currency))
        } else {
            AiChatResult.Failure(error.safeMessage())
        }
    }

    private suspend fun loadReport(
        session: AuthSession,
        selection: ReportSelection,
        todayKey: String,
    ): ReportSummary = coroutineScope {
        val categoriesDeferred = async { optional("categories") { loadCategories(session) } }
        val accountsDeferred = async { optional("accounts") { loadAccounts(session) } }
        val transactionsDeferred = async { optional("transactions") { loadTransactions(session, selection) } }
        val transfersDeferred = async { optional("transfers") { loadTransfers(session, selection) } }
        val goalsDeferred = async { optional("goals") { loadGoals(session) } }
        val payablesDeferred = async { optional("payables") { loadPayables(session) } }
        val investmentsDeferred = async { optional("investments") { loadInvestments(session) } }

        val categoryResult = categoriesDeferred.await()
        val accountResult = accountsDeferred.await()
        val transactionResult = transactionsDeferred.await()
        val transferResult = transfersDeferred.await()
        val goalResult = goalsDeferred.await()
        val payableResult = payablesDeferred.await()
        val investmentResult = investmentsDeferred.await()

        val partialAreas = listOf(
            categoryResult,
            accountResult,
            transactionResult,
            transferResult,
            goalResult,
            payableResult,
            investmentResult,
        ).mapNotNull { it.errorArea }

        val categories = categoryResult.value.associateBy { it.id }
        val accounts = accountResult.value.associateBy { it.id }
        val transactions = transactionResult.value.mapNotNull { row ->
            val type = row.type.trim().lowercase()
            if (
                row.deletedAt != null ||
                row.id.isBlank() ||
                row.amount <= 0 ||
                parseDateKey(row.date) == null ||
                type !in setOf("income", "expense", "refund")
            ) {
                null
            } else {
                ReportTransaction(
                    id = row.id,
                    type = type,
                    amount = row.amount,
                    date = row.date,
                    categoryId = row.categoryId,
                    categoryName = row.categoryId?.let(categories::get)?.name?.ifBlank { "Other" } ?: "Other",
                    categoryColor = row.categoryId?.let(categories::get)?.color,
                    accountId = row.accountId,
                    accountName = row.accountId?.let(accounts::get)?.name,
                    accountType = row.accountId?.let(accounts::get)?.type,
                    sourceName = row.sourceName,
                    personName = row.personName,
                    itemName = row.itemName,
                    note = row.note,
                    reference = row.reference,
                    createdAt = row.createdAt,
                )
            }
        }
        val transfers = transferResult.value.filter {
            it.deletedAt == null && it.amount > 0 && parseDateKey(it.transferDate) != null
        }

        val totalIncome = sumReportTransactions(transactions, selection, "income")
        val totalExpenses = sumReportTransactions(transactions, selection, "expense")
        val inclusiveDays = inclusiveDayCount(selection.start, selection.end)
        val incomeCount = transactions.count { it.type == "income" && it.date in selection.start..selection.end }
        val expenseCount = transactions.count { it.type == "expense" && it.date in selection.start..selection.end }
        val refundCount = transactions.count { it.type == "refund" && it.date in selection.start..selection.end }
        val cashFlow = buildReportCashFlow(transactions, selection)
        val expenseCategories = buildExpenseCategories(transactions, selection)
        val incomeSources = buildIncomeSources(transactions, selection)
        val accountActivity = buildAccountActivity(transactions, transfers, accounts)
        val goals = calculateGoalSummary(goalResult.value)
        val payables = calculatePayableSummary(payableResult.value, todayKey)
        val investments = calculateInvestmentSummary(investmentResult.value)
        val exportRows = buildExportRows(transactions, transfers, accounts)

        ReportSummary(
            selection = selection,
            rangeLabel = formatReportRange(selection),
            totalIncome = totalIncome,
            totalExpenses = totalExpenses,
            netResult = totalIncome - totalExpenses,
            inclusiveDays = inclusiveDays,
            averageDailyIncome = if (inclusiveDays > 0) totalIncome / inclusiveDays else 0.0,
            averageDailySpending = if (inclusiveDays > 0) totalExpenses / inclusiveDays else 0.0,
            incomeCount = incomeCount,
            expenseCount = expenseCount,
            refundCount = refundCount,
            transferCount = transfers.size,
            transferVolume = transfers.sumOf { it.amount },
            cashFlow = cashFlow,
            expenseCategories = expenseCategories,
            incomeSources = incomeSources,
            accountActivity = accountActivity,
            goals = goals,
            payables = payables,
            investments = investments,
            exportRows = exportRows,
            partialAreas = partialAreas,
            financialDataAvailable = transactionResult.errorArea == null,
        )
    }

    private suspend fun loadInsights(
        session: AuthSession,
        currency: String,
        rates: Map<String, Double>,
        rateLive: Boolean,
    ): AiInsightsPayload? = runCatching {
        val pkrToDisplay = reportExchangeRate("PKR", currency, rates) ?: return@runCatching null
        val response = client.get("$APP_API_BASE/api/native/ai-insights") {
            header(HttpHeaders.Accept, ContentType.Application.Json)
            bearerAuth(session.accessToken)
            url {
                parameters.append("currency", currency)
                parameters.append("rate", pkrToDisplay.toString())
                parameters.append("rateLive", rateLive.toString())
            }
        }
        if (!response.status.isSuccess()) return@runCatching null
        response.body<AiInsightsPayload>()
    }.getOrNull()

    private suspend fun loadCategories(session: AuthSession): List<CategoryRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/categories") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,color")
                parameters.append("order", "name.asc")
            }
        }
        response.requireSuccess("Report categories could not be loaded.")
        return response.body()
    }

    private suspend fun loadAccounts(session: AuthSession): List<AccountRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/accounts") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,type,balance,status")
                parameters.append("order", "name.asc")
            }
        }
        response.requireSuccess("Report accounts could not be loaded.")
        return response.body()
    }

    private suspend fun loadTransactions(
        session: AuthSession,
        selection: ReportSelection,
    ): List<TransactionRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/transactions") {
            authenticated(session)
            url {
                parameters.append(
                    "select",
                    "id,type,amount,date,category_id,account_id,source_name,person_name,item_name,note,reference,created_at,deleted_at",
                )
                parameters.append("deleted_at", "is.null")
                parameters.append("date", "gte.${selection.start}")
                parameters.append("date", "lte.${selection.end}")
                parameters.append("type", "in.(income,expense,refund)")
                parameters.append("order", "date.asc,id.asc")
            }
        }
        response.requireSuccess("Report transactions could not be loaded.")
        return response.body()
    }

    private suspend fun loadTransfers(
        session: AuthSession,
        selection: ReportSelection,
    ): List<TransferRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/account_transfers") {
            authenticated(session)
            url {
                parameters.append(
                    "select",
                    "id,amount,transfer_date,from_account_id,to_account_id,note,reference,created_at,deleted_at",
                )
                parameters.append("deleted_at", "is.null")
                parameters.append("transfer_date", "gte.${selection.start}")
                parameters.append("transfer_date", "lte.${selection.end}")
                parameters.append("order", "transfer_date.asc,id.asc")
            }
        }
        response.requireSuccess("Report transfers could not be loaded.")
        return response.body()
    }

    private suspend fun loadGoals(session: AuthSession): List<GoalRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/goals") {
            authenticated(session)
            url {
                parameters.append("select", "id,target_amount,current_amount,status")
                parameters.append("order", "created_at.desc")
            }
        }
        response.requireSuccess("Goal report data could not be loaded.")
        return response.body()
    }

    private suspend fun loadPayables(session: AuthSession): List<PayableRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/liabilities") {
            authenticated(session)
            url {
                parameters.append(
                    "select",
                    "id,original_value,paid_amount,remaining_amount,due_date,status",
                )
                parameters.append("order", "created_at.desc")
            }
        }
        response.requireSuccess("Payable report data could not be loaded.")
        return response.body()
    }

    private suspend fun loadInvestments(session: AuthSession): List<ReportInvestmentRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/investments") {
            authenticated(session)
            url {
                parameters.append("select", "id,quantity,purchase_price,current_price")
                parameters.append("order", "created_at.desc")
            }
        }
        response.requireSuccess("Investment report data could not be loaded.")
        return response.body()
    }

    private suspend fun loadExchangeRates(): RateSnapshot = runCatching {
        val response = client.get("$APP_API_BASE/api/exchange-rate") {
            header(HttpHeaders.Accept, ContentType.Application.Json)
        }
        if (!response.status.isSuccess()) return@runCatching RateSnapshot(DEFAULT_RATES, false)
        val payload = response.body<ExchangeRatePayload>()
        val normalized = SUPPORTED_REPORT_CURRENCIES.associateWith { payload.rates[it] ?: 0.0 }
        if (normalized.values.all { it.isFinite() && it > 0 }) {
            RateSnapshot(normalized, payload.live)
        } else {
            RateSnapshot(DEFAULT_RATES, false)
        }
    }.getOrDefault(RateSnapshot(DEFAULT_RATES, false))

    private suspend fun requireSession(): AuthSession {
        (authRepository.state.value as? AuthState.SignedIn)?.session?.let { return it }
        authRepository.restoreSession()
        return (authRepository.state.value as? AuthState.SignedIn)?.session
            ?: throw ReportsInsightsException("Please sign in again.")
    }

    private fun HttpRequestBuilder.authenticated(session: AuthSession) {
        header("apikey", config.supabasePublishableKey)
        header(HttpHeaders.ContentType, ContentType.Application.Json)
        header(HttpHeaders.Accept, ContentType.Application.Json)
        bearerAuth(session.accessToken)
    }

    private suspend fun HttpResponse.requireSuccess(fallback: String) {
        if (status.isSuccess()) return
        if (status.value == 401) authRepository.restoreSession()
        val raw = bodyAsText()
        val message = runCatching {
            json.decodeFromString<SupabaseRestError>(raw).let {
                it.message ?: it.details ?: it.hint ?: fallback
            }
        }.getOrDefault(fallback)
        throw ReportsInsightsException(message)
    }

    private fun currentSnapshot(): ReportsInsightsSnapshot? = when (val current = mutableState.value) {
        is ReportsInsightsState.Ready -> current.snapshot
        is ReportsInsightsState.Loading -> current.previous
        is ReportsInsightsState.Failure -> current.previous
        ReportsInsightsState.Idle -> null
    }

    private suspend fun <T> optional(
        area: String,
        block: suspend () -> List<T>,
    ): OptionalRows<T> = runCatching { OptionalRows(block()) }
        .getOrElse { OptionalRows(emptyList(), area) }
}

fun reportSelection(
    period: ReportPeriod,
    nowDate: String,
    customStart: String? = null,
    customEnd: String? = null,
): ReportSelection {
    val now = parseDateKey(nowDate)
        ?: throw IllegalArgumentException("Enter a valid current date.")
    return when (period) {
        ReportPeriod.Week -> ReportSelection(
            period,
            shiftDateKey(nowDate, -6),
            nowDate,
        )
        ReportPeriod.Month -> ReportSelection(
            period,
            formatDateKey(now.year, now.month, 1),
            nowDate,
        )
        ReportPeriod.SixMonths -> {
            val startMonth = shiftMonth(now.year, now.month, -5)
            ReportSelection(
                period,
                formatDateKey(startMonth.first, startMonth.second, 1),
                nowDate,
            )
        }
        ReportPeriod.Year -> ReportSelection(
            period,
            formatDateKey(now.year, 1, 1),
            nowDate,
        )
        ReportPeriod.Custom -> {
            val start = customStart?.trim().orEmpty()
            val end = customEnd?.trim().orEmpty()
            requireDateKey(start)
            requireDateKey(end)
            require(start <= end) { "Start date must be on or before end date." }
            require(end <= nowDate) { "End date cannot be in the future." }
            ReportSelection(period, start, end)
        }
    }
}

fun validateReportSelection(selection: ReportSelection, nowDate: String) {
    requireDateKey(nowDate)
    requireDateKey(selection.start)
    requireDateKey(selection.end)
    require(selection.start <= selection.end) { "Start date must be on or before end date." }
    require(selection.end <= nowDate) { "End date cannot be in the future." }
    when (selection.period) {
        ReportPeriod.Custom -> Unit
        else -> require(selection == reportSelection(selection.period, nowDate)) {
            "The selected report range does not match its period."
        }
    }
}

fun sumReportTransactions(
    rows: List<ReportTransaction>,
    selection: ReportSelection,
    requestedType: String,
): Double = rows.sumOf { row ->
    if (row.date !in selection.start..selection.end) {
        0.0
    } else when (requestedType) {
        "income" -> if (row.type == "income") row.amount else 0.0
        "expense" -> when (row.type) {
            "expense" -> row.amount
            "refund" -> -row.amount
            else -> 0.0
        }
        else -> 0.0
    }
}

fun buildReportCashFlow(
    rows: List<ReportTransaction>,
    selection: ReportSelection,
): List<ReportCashFlowPoint> = buildBuckets(selection.start, selection.end).map { bucket ->
    val range = ReportSelection(ReportPeriod.Custom, bucket.start, bucket.end)
    val income = sumReportTransactions(rows, range, "income")
    val expenses = sumReportTransactions(rows, range, "expense")
    ReportCashFlowPoint(
        label = bucket.label,
        start = bucket.start,
        end = bucket.end,
        income = income,
        expenses = expenses,
        net = income - expenses,
    )
}

fun buildExpenseCategories(
    rows: List<ReportTransaction>,
    selection: ReportSelection,
): List<ReportBreakdown> {
    val totals = linkedMapOf<String, MutableBreakdown>()
    rows.forEach { row ->
        if (row.date !in selection.start..selection.end || row.type !in setOf("expense", "refund")) return@forEach
        val delta = if (row.type == "refund") -row.amount else row.amount
        val id = row.categoryId?.ifBlank { null } ?: "uncategorized"
        val current = totals.getOrPut(id) {
            MutableBreakdown(id, row.categoryName.ifBlank { "Other" }, 0.0, row.categoryColor)
        }
        current.amount += delta
        if (current.color.isNullOrBlank() && !row.categoryColor.isNullOrBlank()) current.color = row.categoryColor
    }
    return withPercentages(
        totals.values
            .filter { it.amount > 0 }
            .sortedWith(compareByDescending<MutableBreakdown> { it.amount }.thenBy { it.name.lowercase() })
            .map { ReportBreakdown(it.id, it.name, it.amount, 0.0, it.color ?: "#ef4444") },
    )
}

fun buildIncomeSources(
    rows: List<ReportTransaction>,
    selection: ReportSelection,
): List<ReportBreakdown> {
    val totals = linkedMapOf<String, MutableBreakdown>()
    rows.forEach { row ->
        if (row.date !in selection.start..selection.end || row.type != "income") return@forEach
        val name = row.sourceName?.trim()?.ifBlank { null } ?: "Unspecified source"
        val id = "source:${name.lowercase()}"
        totals.getOrPut(id) { MutableBreakdown(id, name, 0.0, null) }.amount += row.amount
    }
    return withPercentages(
        totals.values
            .filter { it.amount > 0 }
            .sortedWith(compareByDescending<MutableBreakdown> { it.amount }.thenBy { it.name.lowercase() })
            .map { ReportBreakdown(it.id, it.name, it.amount, 0.0) },
    )
}

fun buildReportCsv(
    rows: List<ReportExportRow>,
    currency: String,
    rates: Map<String, Double>,
): String {
    requireCurrency(currency)
    val header = listOf(
        "Date",
        "Type",
        "Category",
        "Account",
        "Amount ($currency)",
        "Currency",
        "Reference",
        "Note",
    )
    val lines = mutableListOf(header)
    rows.forEach { row ->
        val converted = convertReportCurrency(row.amountPkr, "PKR", currency, rates)
        require(converted.isFinite()) { "Invalid converted export value." }
        lines += listOf(
            row.date,
            row.type,
            row.category,
            row.account,
            roundForCurrency(converted, currency).toString(),
            currency,
            row.reference,
            row.note,
        )
    }
    return lines.joinToString("\r\n") { values -> values.joinToString(",") { csvCell(it) } }
}

fun convertReportCurrency(
    amount: Double,
    fromCurrency: String,
    toCurrency: String,
    rates: Map<String, Double>,
): Double {
    if (!amount.isFinite()) return Double.NaN
    if (fromCurrency == toCurrency) return amount
    val fromRate = rates[fromCurrency]?.takeIf { it.isFinite() && it > 0 } ?: return Double.NaN
    val toRate = rates[toCurrency]?.takeIf { it.isFinite() && it > 0 } ?: return Double.NaN
    return (amount / fromRate) * toRate
}

fun formatReportMoney(
    valuePkr: Double,
    currency: String,
    rates: Map<String, Double>,
): String {
    val converted = convertReportCurrency(valuePkr, "PKR", currency, rates)
    if (!converted.isFinite()) return "Unavailable"
    val rounded = roundForCurrency(converted, currency)
    val symbol = when (currency) {
        "PKR" -> "Rs"
        "USD" -> "$"
        "INR" -> "₹"
        "EUR" -> "€"
        "GBP" -> "£"
        "JPY", "CNY" -> "¥"
        else -> currency
    }
    return if (currency == "PKR" || currency == "CNY") "$symbol ${formatNumber(rounded, currency)}"
    else "$symbol${formatNumber(rounded, currency)}"
}

fun buildLocalInsights(
    report: ReportSummary,
    currency: String,
    rates: Map<String, Double>,
): AiInsightsPayload {
    val savingsRate = if (report.totalIncome > 0) (report.netResult / report.totalIncome) * 100 else 0.0
    val goalScore = min(25.0, report.goals.completionPercentage / 4.0)
    val payableScore = if (report.payables.remaining > 0) {
        max(0.0, 20.0 - report.payables.overdueCount * 8.0)
    } else {
        20.0
    }
    val healthScore = round(
        max(
            25.0,
            min(
                95.0,
                max(0.0, min(45.0, 25.0 + savingsRate)) +
                    goalScore +
                    payableScore +
                    if (report.investments.currentValue > 0) 10.0 else 4.0,
            ),
        ),
    ).toInt()
    val topCategory = report.expenseCategories.firstOrNull()
    val money: (Double) -> String = { formatReportMoney(it, currency, rates) }
    val insights = listOf(
        AiInsight(
            type = if (report.netResult >= 0) "positive" else "warning",
            title = if (report.netResult >= 0) "Positive period net" else "Period net needs attention",
            message = if (report.netResult >= 0) {
                "This report range is ahead by ${money(report.netResult)} after expenses."
            } else {
                "This report range is short by ${money(abs(report.netResult))}; review flexible spending first."
            },
        ),
        AiInsight(
            type = if (topCategory != null) "tip" else "warning",
            title = topCategory?.let { "${it.name} is the top category" } ?: "No category spending yet",
            message = topCategory?.let {
                "${it.name} reached ${money(it.amount)} and represents ${roundOne(it.percentage)}% of spending."
            } ?: "Add categorized expenses to receive stronger spending guidance.",
        ),
        AiInsight(
            type = if (report.goals.count > 0) "positive" else "tip",
            title = "Goal progress",
            message = if (report.goals.count > 0) {
                "Goals are ${roundOne(report.goals.completionPercentage)}% funded across ${report.goals.count} target${if (report.goals.count == 1) "" else "s"}."
            } else {
                "Create one savings goal to make a positive net result easier to direct."
            },
        ),
        AiInsight(
            type = if (report.payables.overdueCount > 0) "warning" else "tip",
            title = "Payables check",
            message = if (report.payables.remaining > 0) {
                "${money(report.payables.remaining)} remains payable, with ${report.payables.overdueCount} overdue record${if (report.payables.overdueCount == 1) "" else "s"}."
            } else {
                "No outstanding payable balance is visible."
            },
        ),
    )
    val actions = listOf(
        AiSuggestedAction(
            title = if (report.netResult >= 0) "Allocate the surplus" else "Reduce the biggest category",
            description = if (report.netResult >= 0) {
                "Move a defined amount from this period's surplus into goals or investments."
            } else if (topCategory != null) {
                "Start with ${topCategory.name}, the largest expense category."
            } else {
                "Review recent expenses and pause non-essential spending."
            },
            priority = if (report.netResult >= 0) "medium" else "high",
        ),
        AiSuggestedAction(
            title = "Review payable commitments",
            description = if (report.payables.remaining > 0) {
                "Prioritize overdue and high remaining payables before adding new obligations."
            } else {
                "Keep payables clean by recording repayments as soon as they happen."
            },
            priority = if (report.payables.overdueCount > 0) "high" else "low",
        ),
        AiSuggestedAction(
            title = "Keep records current",
            description = "Refresh categories, account balances and investment prices before making a major decision.",
            priority = "medium",
        ),
    )
    val cards = listOf(
        AiSummaryCard(
            "Period income",
            money(report.totalIncome),
            "${roundOne(savingsRate)}% savings rate",
            if (report.totalIncome > 0) "positive" else "neutral",
        ),
        AiSummaryCard(
            "Period expenses",
            money(report.totalExpenses),
            "${report.expenseCount} expense entries",
            if (report.totalExpenses > report.totalIncome && report.totalIncome > 0) "warning" else "info",
        ),
        AiSummaryCard(
            "Net result",
            money(report.netResult),
            "${report.inclusiveDays} day range",
            if (report.netResult >= 0) "positive" else "danger",
        ),
        AiSummaryCard(
            "Payables due",
            money(report.payables.remaining),
            "${report.payables.overdueCount} overdue",
            if (report.payables.overdueCount > 0) "danger" else "neutral",
        ),
    )
    return AiInsightsPayload(
        healthScore = healthScore,
        healthLabel = when {
            healthScore >= 80 -> "Excellent"
            healthScore >= 65 -> "Good"
            healthScore >= 45 -> "Fair"
            else -> "Needs Attention"
        },
        insights = insights,
        suggestedActions = actions,
        summaryCards = cards,
        aiAvailable = false,
        message = "Secure local finance intelligence is active. Gemini may be temporarily unavailable.",
    )
}

private fun localChatAnswer(
    question: String,
    snapshot: ReportsInsightsSnapshot,
    currency: String,
): AiChatPayload {
    val normalized = question.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
    val report = snapshot.report
    val money: (Double) -> String = { formatReportMoney(it, currency, snapshot.exchangeRates) }
    val topCategory = report.expenseCategories.firstOrNull()
    val answer = when {
        Regex("\\b(spend|spent|expense|expenses)\\b").containsMatchIn(normalized) &&
            Regex("\\b(most|highest|top|biggest|where)\\b").containsMatchIn(normalized) -> {
            if (topCategory == null) {
                "No categorized expense is available in ${report.rangeLabel}."
            } else {
                "${topCategory.name} is the highest expense category at ${money(topCategory.amount)}, or ${roundOne(topCategory.percentage)}% of spending in ${report.rangeLabel}."
            }
        }
        Regex("\\b(spend|spent|expense|expenses)\\b").containsMatchIn(normalized) ->
            "Expenses total ${money(report.totalExpenses)} across ${report.expenseCount} expense entries in ${report.rangeLabel}. Refunds are already subtracted."
        Regex("\\b(income|earn|earned|earning|salary)\\b").containsMatchIn(normalized) ->
            "Income totals ${money(report.totalIncome)} across ${report.incomeCount} entries in ${report.rangeLabel}."
        Regex("\\b(net|saving|savings|cash flow|cashflow)\\b").containsMatchIn(normalized) ->
            "The net result is ${money(report.netResult)}. The savings rate is ${roundOne(if (report.totalIncome > 0) report.netResult / report.totalIncome * 100 else 0.0)}%."
        Regex("\\b(payable|payables|debt|due|overdue)\\b").containsMatchIn(normalized) ->
            "${money(report.payables.remaining)} remains payable across ${report.payables.count} records, with ${report.payables.overdueCount} overdue."
        Regex("\\b(goal|goals|target|targets)\\b").containsMatchIn(normalized) ->
            "Goals have ${money(report.goals.saved)} saved toward ${money(report.goals.target)}, which is ${roundOne(report.goals.completionPercentage)}% complete."
        Regex("\\b(invest|investment|investments|asset|assets|portfolio)\\b").containsMatchIn(normalized) ->
            "The portfolio has ${report.investments.count} investment lots, ${money(report.investments.invested)} invested, and a current value of ${money(report.investments.currentValue)}. P/L is ${money(report.investments.pnl)}."
        Regex("\\b(transfer|transfers)\\b").containsMatchIn(normalized) ->
            "${report.transferCount} transfers moved ${money(report.transferVolume)} in ${report.rangeLabel}."
        Regex("\\b(account|accounts)\\b").containsMatchIn(normalized) -> {
            val top = report.accountActivity.firstOrNull()
            if (top == null) "No account activity is available in ${report.rangeLabel}."
            else "${top.name} has the highest recorded activity at ${money(top.totalActivity)} across income, expenses and transfers."
        }
        else ->
            "Ask about income, expenses, the biggest spending category, net savings, payables, goals, investments, transfers or account activity for ${report.rangeLabel}."
    }
    return AiChatPayload(
        provider = "local-calculator",
        model = "native-finance-ledger-v1",
        answer = answer,
        followUps = listOf(
            "Where did I spend the most?",
            "How can I improve my cash flow?",
            "What should I focus on next?",
        ),
        aiAvailable = true,
        deterministic = true,
    )
}

private fun buildAccountActivity(
    transactions: List<ReportTransaction>,
    transfers: List<TransferRow>,
    accounts: Map<String, AccountRow>,
): List<ReportAccountActivity> {
    val map = linkedMapOf<String, MutableAccountActivity>()
    fun ensure(id: String, fallback: String): MutableAccountActivity {
        val account = accounts[id]
        return map.getOrPut(id) {
            MutableAccountActivity(
                id = id,
                name = account?.name?.ifBlank { fallback } ?: fallback,
                type = account?.type,
            )
        }
    }
    transactions.forEach { transaction ->
        val id = transaction.accountId ?: return@forEach
        val activity = ensure(id, transaction.accountName ?: "Unknown account")
        when (transaction.type) {
            "income" -> activity.income += transaction.amount
            "expense" -> activity.expenses += transaction.amount
            "refund" -> activity.expenses -= transaction.amount
        }
    }
    transfers.forEach { transfer ->
        transfer.fromAccountId?.let { ensure(it, "From account").transfersOut += transfer.amount }
        transfer.toAccountId?.let { ensure(it, "To account").transfersIn += transfer.amount }
    }
    return map.values
        .map {
            ReportAccountActivity(
                id = it.id,
                name = it.name,
                type = it.type,
                income = it.income,
                expenses = max(0.0, it.expenses),
                transfersIn = it.transfersIn,
                transfersOut = it.transfersOut,
            )
        }
        .sortedWith(compareByDescending<ReportAccountActivity> { it.totalActivity }.thenBy { it.name.lowercase() })
}

private fun calculateGoalSummary(rows: List<GoalRow>): ReportGoalSummary {
    val target = rows.sumOf { max(0.0, it.targetAmount) }
    val saved = rows.sumOf { max(0.0, it.currentAmount) }
    val completed = rows.count {
        it.status.lowercase() == "completed" || (it.targetAmount > 0 && it.currentAmount >= it.targetAmount)
    }
    return ReportGoalSummary(rows.size, completed, target, saved)
}

private fun calculatePayableSummary(
    rows: List<PayableRow>,
    todayKey: String,
): ReportPayableSummary {
    val overdue = rows.count {
        it.remainingAmount > 0 &&
            it.dueDate != null &&
            it.dueDate < todayKey &&
            it.status.lowercase() !in setOf("paid", "completed", "cancelled")
    }
    return ReportPayableSummary(
        count = rows.size,
        original = rows.sumOf { max(0.0, it.originalValue) },
        paid = rows.sumOf { max(0.0, it.paidAmount) },
        remaining = rows.sumOf { max(0.0, it.remainingAmount) },
        overdueCount = overdue,
    )
}

private fun calculateInvestmentSummary(rows: List<ReportInvestmentRow>): ReportInvestmentSummary {
    var invested = 0.0
    var current = 0.0
    var partial = false
    var count = 0
    rows.forEach { row ->
        if (row.quantity <= 0 || row.purchasePrice <= 0) return@forEach
        count += 1
        invested += row.quantity * row.purchasePrice
        if (row.currentPrice > 0) current += row.quantity * row.currentPrice else partial = true
    }
    return ReportInvestmentSummary(count, invested, current, partial)
}

private fun buildExportRows(
    transactions: List<ReportTransaction>,
    transfers: List<TransferRow>,
    accounts: Map<String, AccountRow>,
): List<ReportExportRow> {
    val activity = mutableListOf<ReportExportRow>()
    transactions.forEach { row ->
        activity += ReportExportRow(
            id = row.id,
            date = row.date,
            createdAt = row.createdAt,
            type = row.type,
            category = row.categoryName,
            account = row.accountName.orEmpty(),
            amountPkr = row.amount,
            reference = row.reference.orEmpty(),
            note = row.note.orEmpty(),
        )
    }
    transfers.forEach { row ->
        val from = row.fromAccountId?.let(accounts::get)?.name ?: "From account"
        val to = row.toAccountId?.let(accounts::get)?.name ?: "To account"
        activity += ReportExportRow(
            id = row.id,
            date = row.transferDate,
            createdAt = row.createdAt,
            type = "transfer",
            category = "Transfer",
            account = "$from -> $to",
            amountPkr = row.amount,
            reference = row.reference.orEmpty(),
            note = row.note.orEmpty(),
        )
    }
    return activity.sortedWith(
        compareByDescending<ReportExportRow> { it.date }
            .thenByDescending { it.createdAt.orEmpty() }
            .thenByDescending { it.id },
    )
}

private fun withPercentages(items: List<ReportBreakdown>): List<ReportBreakdown> {
    val total = items.sumOf { max(0.0, it.amount) }
    if (total <= 0) return items.map { it.copy(percentage = 0.0) }
    return items.map { it.copy(percentage = (it.amount / total) * 100) }
}

private data class MutableBreakdown(
    val id: String,
    val name: String,
    var amount: Double,
    var color: String?,
)

private data class MutableAccountActivity(
    val id: String,
    val name: String,
    val type: String?,
    var income: Double = 0.0,
    var expenses: Double = 0.0,
    var transfersIn: Double = 0.0,
    var transfersOut: Double = 0.0,
)

data class ReportTransaction(
    val id: String,
    val type: String,
    val amount: Double,
    val date: String,
    val categoryId: String?,
    val categoryName: String,
    val categoryColor: String?,
    val accountId: String?,
    val accountName: String?,
    val accountType: String?,
    val sourceName: String?,
    val personName: String?,
    val itemName: String?,
    val note: String?,
    val reference: String?,
    val createdAt: String?,
)

@Serializable
private data class CategoryRow(
    val id: String,
    val name: String,
    val color: String? = null,
)

@Serializable
private data class AccountRow(
    val id: String,
    val name: String,
    val type: String? = null,
    val balance: Double = 0.0,
    val status: String? = null,
)

@Serializable
private data class TransactionRow(
    val id: String,
    val type: String,
    val amount: Double,
    val date: String,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("account_id") val accountId: String? = null,
    @SerialName("source_name") val sourceName: String? = null,
    @SerialName("person_name") val personName: String? = null,
    @SerialName("item_name") val itemName: String? = null,
    val note: String? = null,
    val reference: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("deleted_at") val deletedAt: String? = null,
)

@Serializable
private data class TransferRow(
    val id: String,
    val amount: Double,
    @SerialName("transfer_date") val transferDate: String,
    @SerialName("from_account_id") val fromAccountId: String? = null,
    @SerialName("to_account_id") val toAccountId: String? = null,
    val note: String? = null,
    val reference: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("deleted_at") val deletedAt: String? = null,
)

@Serializable
private data class GoalRow(
    val id: String,
    @SerialName("target_amount") val targetAmount: Double = 0.0,
    @SerialName("current_amount") val currentAmount: Double = 0.0,
    val status: String = "active",
)

@Serializable
private data class PayableRow(
    val id: String,
    @SerialName("original_value") val originalValue: Double = 0.0,
    @SerialName("paid_amount") val paidAmount: Double = 0.0,
    @SerialName("remaining_amount") val remainingAmount: Double = 0.0,
    @SerialName("due_date") val dueDate: String? = null,
    val status: String = "pending",
)

@Serializable
private data class ReportInvestmentRow(
    val id: String,
    val quantity: Double = 0.0,
    @SerialName("purchase_price") val purchasePrice: Double = 0.0,
    @SerialName("current_price") val currentPrice: Double = 0.0,
)

@Serializable
private data class ExchangeRatePayload(
    val rates: Map<String, Double> = emptyMap(),
    val live: Boolean = false,
)

@Serializable
private data class SupabaseRestError(
    val message: String? = null,
    val details: String? = null,
    val hint: String? = null,
)

private data class OptionalRows<T>(
    val value: List<T>,
    val errorArea: String? = null,
)

private data class RateSnapshot(
    val rates: Map<String, Double>,
    val live: Boolean,
)

private data class DateParts(
    val year: Int,
    val month: Int,
    val day: Int,
)

private data class DateBucket(
    val label: String,
    val start: String,
    val end: String,
)

private fun buildBuckets(startKey: String, endKey: String): List<DateBucket> {
    val start = parseDateKey(startKey) ?: return emptyList()
    val end = parseDateKey(endKey) ?: return emptyList()
    val days = inclusiveDayCount(startKey, endKey)
    if (days <= 0) return emptyList()
    if (days <= 14) {
        return (0 until days).map { offset ->
            val key = shiftDateKey(startKey, offset)
            DateBucket(shortDateLabel(key), key, key)
        }
    }
    if (days <= 90) {
        val result = mutableListOf<DateBucket>()
        var cursor = startKey
        while (cursor <= endKey) {
            val bucketEnd = minOf(shiftDateKey(cursor, 6), endKey)
            result += DateBucket(
                "${shortDateLabel(cursor)}–${shortDateLabel(bucketEnd)}",
                cursor,
                bucketEnd,
            )
            cursor = shiftDateKey(bucketEnd, 1)
        }
        return result
    }
    if (days <= 730) {
        val result = mutableListOf<DateBucket>()
        var year = start.year
        var month = start.month
        while (year < end.year || (year == end.year && month <= end.month)) {
            val first = maxOf(formatDateKey(year, month, 1), startKey)
            val last = minOf(formatDateKey(year, month, daysInMonth(year, month)), endKey)
            result += DateBucket(monthLabel(month), first, last)
            val shifted = shiftMonth(year, month, 1)
            year = shifted.first
            month = shifted.second
        }
        return result
    }
    return (start.year..end.year).map { year ->
        DateBucket(
            year.toString(),
            maxOf(formatDateKey(year, 1, 1), startKey),
            minOf(formatDateKey(year, 12, 31), endKey),
        )
    }
}

private fun formatReportRange(selection: ReportSelection): String =
    if (selection.start == selection.end) {
        longDateLabel(selection.start)
    } else {
        "${shortDateLabel(selection.start)} – ${longDateLabel(selection.end)}"
    }

private fun parseDateKey(value: String): DateParts? {
    val match = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$").matchEntire(value) ?: return null
    val year = match.groupValues[1].toIntOrNull() ?: return null
    val month = match.groupValues[2].toIntOrNull() ?: return null
    val day = match.groupValues[3].toIntOrNull() ?: return null
    if (year < 1 || month !in 1..12 || day !in 1..daysInMonth(year, month)) return null
    return DateParts(year, month, day)
}

private fun requireDateKey(value: String) {
    require(parseDateKey(value) != null) { "Enter a valid date in YYYY-MM-DD format." }
}

private fun requireCurrency(currency: String) {
    require(currency in SUPPORTED_REPORT_CURRENCIES) { "Unsupported currency." }
}

private fun inclusiveDayCount(startKey: String, endKey: String): Int {
    val start = parseDateKey(startKey) ?: return 0
    val end = parseDateKey(endKey) ?: return 0
    if (startKey > endKey) return 0
    return (toEpochDay(end) - toEpochDay(start) + 1L).toInt()
}

private fun shiftDateKey(value: String, days: Int): String {
    val parsed = parseDateKey(value) ?: throw IllegalArgumentException("Invalid date.")
    return fromEpochDay(toEpochDay(parsed) + days).toKey()
}

private fun shiftMonth(year: Int, month: Int, amount: Int): Pair<Int, Int> {
    val index = year * 12 + (month - 1) + amount
    val resolvedYear = floorDiv(index, 12)
    val resolvedMonth = index - resolvedYear * 12 + 1
    return resolvedYear to resolvedMonth
}

private fun toEpochDay(date: DateParts): Long {
    var y = date.year
    val m = date.month
    y -= if (m <= 2) 1 else 0
    val era = floorDiv(y, 400)
    val yoe = y - era * 400
    val adjustedMonth = m + if (m > 2) -3 else 9
    val doy = (153 * adjustedMonth + 2) / 5 + date.day - 1
    val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
    return era.toLong() * 146097L + doe.toLong() - 719468L
}

private fun fromEpochDay(epochDay: Long): DateParts {
    val z = epochDay + 719468L
    val era = floorDivLong(z, 146097L)
    val doe = z - era * 146097L
    val yoe = ((doe - doe / 1460L + doe / 36524L - doe / 146096L) / 365L).toInt()
    var year = yoe + era.toInt() * 400
    val dayOfYear = (doe - (365L * yoe + yoe / 4 - yoe / 100)).toInt()
    val mp = (5 * dayOfYear + 2) / 153
    val day = dayOfYear - (153 * mp + 2) / 5 + 1
    val month = mp + if (mp < 10) 3 else -9
    year += if (month <= 2) 1 else 0
    return DateParts(year, month, day)
}

private fun floorDiv(value: Int, divisor: Int): Int {
    var quotient = value / divisor
    if ((value xor divisor) < 0 && quotient * divisor != value) quotient -= 1
    return quotient
}

private fun floorDivLong(value: Long, divisor: Long): Long {
    var quotient = value / divisor
    if ((value xor divisor) < 0 && quotient * divisor != value) quotient -= 1
    return quotient
}

private fun DateParts.toKey(): String = formatDateKey(year, month, day)

private fun formatDateKey(year: Int, month: Int, day: Int): String =
    "${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}"

private fun daysInMonth(year: Int, month: Int): Int = when (month) {
    2 -> if (isLeapYear(year)) 29 else 28
    4, 6, 9, 11 -> 30
    else -> 31
}

private fun isLeapYear(year: Int): Boolean =
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)

private fun monthLabel(month: Int): String =
    listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
        .getOrElse(month - 1) { "Month" }

private fun shortDateLabel(key: String): String {
    val date = parseDateKey(key) ?: return key
    return "${date.day} ${monthLabel(date.month)}"
}

private fun longDateLabel(key: String): String {
    val date = parseDateKey(key) ?: return key
    return "${date.day} ${monthLabel(date.month)} ${date.year}"
}

private fun roundForCurrency(value: Double, currency: String): Double {
    val digits = if (currency == "JPY") 0 else 2
    val factor = if (digits == 0) 1.0 else 100.0
    val rounded = round((value + 1e-12) * factor) / factor
    return if (rounded == -0.0) 0.0 else rounded
}

private fun formatNumber(value: Double, currency: String): String {
    val rounded = roundForCurrency(value, currency)
    val digits = if (currency == "JPY") 0 else 2
    val raw = if (digits == 0) rounded.toLong().toString() else {
        val whole = floor(abs(rounded)).toLong()
        val fraction = round((abs(rounded) - whole) * 100).toInt().coerceIn(0, 99)
        "${if (rounded < 0) "-" else ""}$whole.${fraction.toString().padStart(2, '0')}"
    }
    val sign = if (raw.startsWith("-")) "-" else ""
    val unsigned = raw.removePrefix("-")
    val parts = unsigned.split(".")
    val grouped = parts[0].reversed().chunked(3).joinToString(",").reversed()
    return sign + grouped + if (parts.size > 1) ".${parts[1]}" else ""
}

private fun reportExchangeRate(
    fromCurrency: String,
    toCurrency: String,
    rates: Map<String, Double>,
): Double? {
    val converted = convertReportCurrency(1.0, fromCurrency, toCurrency, rates)
    return converted.takeIf { it.isFinite() && it > 0 }
}

private fun csvCell(value: Any?): String {
    val text = value?.toString().orEmpty()
    return if (text.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) {
        "\"${text.replace("\"", "\"\"")}\""
    } else {
        text
    }
}

private fun roundOne(value: Double): Double =
    if (value.isFinite()) round(value * 10.0) / 10.0 else 0.0

private fun Throwable.safeMessage(): String = when (this) {
    is ReportsInsightsException -> message ?: "Reports & AI Insights request failed."
    is IllegalArgumentException -> message ?: "Check the entered values."
    else -> message?.takeIf(String::isNotBlank) ?: "Reports & AI Insights request failed."
}

private class ReportsInsightsException(message: String) : Exception(message)
