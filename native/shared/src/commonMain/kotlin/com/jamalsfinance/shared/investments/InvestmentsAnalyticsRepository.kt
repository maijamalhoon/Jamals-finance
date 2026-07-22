package com.jamalsfinance.shared.investments

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
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

private const val MARKET_API_BASE = "https://jamals-finance-sable.vercel.app"
private const val BINANCE_API_BASE = "https://api.binance.com"
val SupportedInvestmentCurrencies = listOf("PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY")

@Serializable
data class InvestmentAccount(
    val id: String,
    val name: String,
    val type: String,
    val balance: Double = 0.0,
    @SerialName("icon_key") val iconKey: String? = null,
)

@Serializable
data class InvestmentRow(
    val id: String,
    val name: String,
    val type: String,
    val quantity: Double = 0.0,
    @SerialName("purchase_price") val purchasePrice: Double = 0.0,
    @SerialName("purchase_price_original") val purchasePriceOriginal: Double? = null,
    @SerialName("purchase_currency") val purchaseCurrency: String? = "PKR",
    @SerialName("purchase_exchange_rate") val purchaseExchangeRate: Double = 1.0,
    @SerialName("current_price") val currentPrice: Double = 0.0,
    @SerialName("current_price_original") val currentPriceOriginal: Double? = null,
    @SerialName("current_price_currency") val currentPriceCurrency: String? = "PKR",
    @SerialName("purchased_at") val purchasedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("asset_id") val assetId: String? = null,
    val symbol: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("price_source") val priceSource: String? = "manual",
    @SerialName("price_currency") val priceCurrency: String? = "PKR",
    @SerialName("price_updated_at") val priceUpdatedAt: String? = null,
    @SerialName("price_change_24h") val priceChange24h: Double? = null,
    @SerialName("is_live_priced") val isLivePriced: Boolean = false,
    val linkedAccountId: String? = null,
) {
    val position: InvestmentPosition?
        get() = calculateInvestmentPosition(quantity, purchasePrice, currentPrice)
}

data class InvestmentPosition(
    val quantity: Double,
    val purchasePrice: Double,
    val currentPrice: Double,
    val totalInvested: Double,
    val currentValue: Double,
    val totalPnl: Double,
    val totalPnlPct: Double?,
)

fun calculateInvestmentPosition(
    quantityValue: Double,
    purchasePriceValue: Double,
    currentPriceValue: Double,
): InvestmentPosition? {
    if (!quantityValue.isFinite() || !purchasePriceValue.isFinite() || !currentPriceValue.isFinite()) return null
    if (quantityValue < 0 || purchasePriceValue < 0 || currentPriceValue < 0) return null
    val invested = quantityValue * purchasePriceValue
    val value = quantityValue * currentPriceValue
    val pnl = value - invested
    if (!invested.isFinite() || !value.isFinite() || !pnl.isFinite()) return null
    val pct = if (invested > 0) (pnl / invested) * 100 else null
    return InvestmentPosition(
        quantity = quantityValue,
        purchasePrice = purchasePriceValue,
        currentPrice = currentPriceValue,
        totalInvested = invested,
        currentValue = value,
        totalPnl = pnl,
        totalPnlPct = pct?.takeIf { it.isFinite() },
    )
}

data class InvestmentHolding(
    val key: String,
    val name: String,
    val type: String,
    val symbol: String?,
    val imageUrl: String?,
    val quantity: Double,
    val averageBuyPrice: Double,
    val currentPrice: Double,
    val totalInvested: Double,
    val currentValue: Double,
    val totalPnl: Double,
    val totalPnlPct: Double,
    val livePriced: Boolean,
    val priceChange24h: Double?,
    val lots: List<InvestmentRow>,
)

fun aggregateInvestmentHoldings(rows: List<InvestmentRow>): List<InvestmentHolding> =
    rows.groupBy(::investmentGroupKey)
        .mapNotNull { (key, lots) ->
            val valid = lots.mapNotNull { row -> row.position?.let { row to it } }
            if (valid.isEmpty()) return@mapNotNull null
            val quantity = valid.sumOf { it.second.quantity }
            if (quantity <= 0) return@mapNotNull null
            val invested = valid.sumOf { it.second.totalInvested }
            val currentValue = valid.sumOf { it.second.currentValue }
            val averageBuy = invested / quantity
            val currentPrice = currentValue / quantity
            val pnl = currentValue - invested
            val first = lots.first()
            InvestmentHolding(
                key = key,
                name = first.name.ifBlank { "Investment" },
                type = canonicalInvestmentType(first.type, first.priceSource),
                symbol = lots.firstNotNullOfOrNull { it.symbol?.trim()?.takeIf(String::isNotBlank) },
                imageUrl = lots.firstNotNullOfOrNull { it.imageUrl?.trim()?.takeIf(String::isNotBlank) },
                quantity = quantity,
                averageBuyPrice = averageBuy,
                currentPrice = currentPrice,
                totalInvested = invested,
                currentValue = currentValue,
                totalPnl = pnl,
                totalPnlPct = if (invested > 0) (pnl / invested) * 100 else 0.0,
                livePriced = lots.any { it.isLivePriced },
                priceChange24h = lots.firstNotNullOfOrNull { it.priceChange24h },
                lots = lots.sortedByDescending { it.purchasedAt ?: it.createdAt ?: "" },
            )
        }
        .sortedWith(compareByDescending<InvestmentHolding> { it.currentValue }.thenBy { it.name.lowercase() })

fun normalizeInvestmentMarketType(value: String?): String? {
    val type = value.orEmpty()
        .trim()
        .lowercase()
        .replace(Regex("[^a-z0-9]+"), "_")
        .trim('_')
    return when (type) {
        "crypto", "cryptocurrency", "cryptocurrencies", "coin", "coins" -> "crypto"
        "stock", "stocks", "equity", "equities", "share", "shares" -> "stock"
        "forex", "fx", "currency", "currencies" -> "forex"
        else -> null
    }
}

fun normalizeInvestmentEditorType(value: String?): String =
    normalizeInvestmentMarketType(value) ?: "other"

private fun canonicalInvestmentType(type: String?, source: String?): String {
    val sourceKey = source?.trim()?.lowercase().orEmpty()
    if ("binance" in sourceKey || "coingecko" in sourceKey) return "crypto"
    if ("alpha" in sourceKey || "stock" in sourceKey || "twelve" in sourceKey || "yahoo" in sourceKey) return "stock"
    return normalizeInvestmentMarketType(type) ?: when (
        type.orEmpty().trim().lowercase().replace(Regex("[^a-z0-9]+"), "_").trim('_')
    ) {
        "saving", "savings" -> "savings"
        "realestate", "real_estate" -> "real_estate"
        else -> "other"
    }
}

private fun investmentGroupKey(row: InvestmentRow): String {
    fun clean(value: String?): String = value.orEmpty().trim().lowercase().filter(Char::isLetterOrDigit)
    val type = canonicalInvestmentType(row.type, row.priceSource)
    val name = clean(row.name)
    val symbol = clean(row.symbol)
    val asset = clean(row.assetId)
    return "$type:${name.ifBlank { symbol.ifBlank { asset.ifBlank { row.id } } }}"
}

@Serializable
data class MarketAsset(
    val id: String,
    val name: String,
    val symbol: String,
    val aliases: List<String> = emptyList(),
    val rank: Int = 0,
    @SerialName("logoUrl") val logoUrl: String = "",
    @SerialName("assetType") val assetType: String,
    @SerialName("quoteCurrency") val quoteCurrency: String,
    @SerialName("priceMode") val priceMode: String = "delayed",
    @SerialName("providerSymbol") val providerSymbol: String? = null,
    @SerialName("binanceSymbol") val binanceSymbol: String? = null,
)

data class MarketQuote(
    val price: Double,
    val currency: String,
    val change24h: Double?,
    val updatedAtEpochMs: Long?,
    val source: String,
)

data class InvestmentDraft(
    val investmentId: String? = null,
    val name: String,
    val type: String,
    val quantity: Double,
    val purchasePriceOriginal: Double,
    val purchaseCurrency: String,
    val purchaseExchangeRateToPkr: Double,
    val currentPriceOriginal: Double,
    val currentPriceCurrency: String,
    val currentExchangeRateToPkr: Double,
    val purchasedAt: String,
    val assetId: String? = null,
    val symbol: String? = null,
    val imageUrl: String? = null,
    val priceSource: String = "manual",
    val priceUpdatedAt: String? = null,
    val priceChange24h: Double? = null,
    val isLivePriced: Boolean = false,
    val accountId: String,
)

data class InvestmentWithdrawalDraft(
    val investmentId: String,
    val quantity: Double,
    val withdrawalPriceOriginal: Double,
    val withdrawalCurrency: String,
    val withdrawalExchangeRateToPkr: Double,
    val destinationAccountId: String,
    val withdrawnAt: String,
)

enum class AnalyticsPeriod { Today, Week, Month, SixMonths, Year, Custom }

data class AnalyticsSelection(
    val period: AnalyticsPeriod,
    val currentStart: String,
    val currentEnd: String,
    val previousStart: String,
    val previousEnd: String,
)

data class AnalyticsTransaction(
    val id: String,
    val amount: Double,
    val date: String,
    val type: String,
    val categoryId: String?,
    val categoryName: String,
    val categoryColor: String?,
    val accountId: String?,
    val accountName: String?,
    val accountType: String?,
    val sourceName: String?,
    val personName: String?,
    val itemName: String?,
)

data class AnalyticsTransfer(
    val id: String,
    val amount: Double,
    val date: String,
    val fromAccountId: String?,
    val toAccountId: String?,
)

data class AnalyticsChange(
    val label: String,
    val value: Double?,
    val favorable: Boolean?,
)

data class CashFlowPoint(
    val label: String,
    val start: String,
    val end: String,
    val income: Double,
    val expenses: Double,
    val cumulativeNet: Double,
)

data class AnalyticsBreakdown(
    val id: String,
    val name: String,
    val amount: Double,
    val percentage: Double,
    val color: String? = null,
    val helper: String? = null,
)

data class LargestAnalyticsEntry(
    val id: String,
    val title: String,
    val amount: Double,
    val date: String,
    val categoryName: String,
    val accountName: String?,
)

data class AnalyticsSummary(
    val selection: AnalyticsSelection,
    val totalIncome: Double,
    val totalExpenses: Double,
    val netSavings: Double,
    val savingsRate: Double?,
    val incomeChange: AnalyticsChange,
    val expensesChange: AnalyticsChange,
    val netSavingsChange: AnalyticsChange,
    val savingsRateChange: AnalyticsChange,
    val averageDailyIncome: Double,
    val averageDailySpending: Double,
    val incomeCount: Int,
    val expenseCount: Int,
    val cashFlow: List<CashFlowPoint>,
    val expenseCategories: List<AnalyticsBreakdown>,
    val incomeSources: List<AnalyticsBreakdown>,
    val accountSpending: List<AnalyticsBreakdown>,
    val largestIncome: List<LargestAnalyticsEntry>,
    val largestExpenses: List<LargestAnalyticsEntry>,
    val transferCount: Int,
    val transferVolume: Double,
    val portfolioValue: Double,
    val portfolioInvested: Double,
    val portfolioPnl: Double,
    val portfolioHoldings: List<InvestmentHolding>,
)

data class InvestmentsAnalyticsSnapshot(
    val investments: List<InvestmentRow> = emptyList(),
    val accounts: List<InvestmentAccount> = emptyList(),
    val holdings: List<InvestmentHolding> = emptyList(),
    val exchangeRates: Map<String, Double> = fallbackRates(),
    val analytics: AnalyticsSummary? = null,
    val nowDate: String,
) {
    val totalInvested: Double get() = holdings.sumOf { it.totalInvested }
    val totalValue: Double get() = holdings.sumOf { it.currentValue }
    val totalPnl: Double get() = totalValue - totalInvested
    val totalPnlPct: Double get() = if (totalInvested > 0) (totalPnl / totalInvested) * 100 else 0.0
    fun rateToPkr(currency: String): Double? = exchangeRate(currency, "PKR", exchangeRates)
}

sealed interface InvestmentsAnalyticsState {
    data object Idle : InvestmentsAnalyticsState
    data class Loading(val previous: InvestmentsAnalyticsSnapshot? = null) : InvestmentsAnalyticsState
    data class Ready(val snapshot: InvestmentsAnalyticsSnapshot) : InvestmentsAnalyticsState
    data class Failure(val message: String, val previous: InvestmentsAnalyticsSnapshot? = null) : InvestmentsAnalyticsState
}

sealed interface InvestmentsAnalyticsResult {
    data object Success : InvestmentsAnalyticsResult
    data class Failure(val message: String) : InvestmentsAnalyticsResult
}

sealed interface MarketSearchResult {
    data class Success(val assets: List<MarketAsset>) : MarketSearchResult
    data class Failure(val message: String) : MarketSearchResult
}

sealed interface MarketQuoteResult {
    data class Success(val quote: MarketQuote) : MarketQuoteResult
    data class Failure(val message: String) : MarketQuoteResult
}

interface InvestmentsAnalyticsRepository {
    val state: StateFlow<InvestmentsAnalyticsState>
    suspend fun refresh(nowDate: String, force: Boolean = false): InvestmentsAnalyticsResult
    suspend fun refreshAnalytics(selection: AnalyticsSelection): InvestmentsAnalyticsResult
    suspend fun searchAssets(query: String): MarketSearchResult
    suspend fun loadQuote(asset: MarketAsset): MarketQuoteResult
    suspend fun saveInvestment(draft: InvestmentDraft): InvestmentsAnalyticsResult
    suspend fun deleteInvestment(investmentId: String): InvestmentsAnalyticsResult
    suspend fun withdrawInvestment(draft: InvestmentWithdrawalDraft): InvestmentsAnalyticsResult
}

class SupabaseInvestmentsAnalyticsRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val authRepository: AuthRepository,
) : InvestmentsAnalyticsRepository {
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
    private val mutableState = MutableStateFlow<InvestmentsAnalyticsState>(InvestmentsAnalyticsState.Idle)
    override val state: StateFlow<InvestmentsAnalyticsState> = mutableState.asStateFlow()

    override suspend fun refresh(nowDate: String, force: Boolean): InvestmentsAnalyticsResult = refreshMutex.withLock {
        requireDateKey(nowDate)
        val previous = currentSnapshot()
        if (!force && previous != null && previous.nowDate == nowDate && mutableState.value is InvestmentsAnalyticsState.Ready) {
            return InvestmentsAnalyticsResult.Success
        }
        mutableState.value = InvestmentsAnalyticsState.Loading(previous)
        runCatching {
            val session = requireSession()
            val base = coroutineScope {
                val investments = async { loadInvestments(session) }
                val accounts = async { loadAccounts(session) }
                val links = async { loadInvestmentAccountLinks(session) }
                val rates = async { loadExchangeRates() }
                BaseData(investments.await(), accounts.await(), links.await(), rates.await())
            }
            val linkedRows = base.investments.map { it.copy(linkedAccountId = base.links[it.id]) }
            val liveRows = applyLiveQuotes(linkedRows, base.rates)
            val selection = previous?.analytics?.selection ?: analyticsSelection(AnalyticsPeriod.Month, nowDate)
            val analytics = loadAndCalculateAnalytics(session, selection, liveRows)
            val snapshot = InvestmentsAnalyticsSnapshot(
                investments = liveRows,
                accounts = base.accounts.sortedBy { it.name.lowercase() },
                holdings = aggregateInvestmentHoldings(liveRows),
                exchangeRates = base.rates,
                analytics = analytics,
                nowDate = nowDate,
            )
            mutableState.value = InvestmentsAnalyticsState.Ready(snapshot)
            InvestmentsAnalyticsResult.Success
        }.getOrElse { error ->
            val message = error.safeMessage()
            mutableState.value = InvestmentsAnalyticsState.Failure(message, previous)
            InvestmentsAnalyticsResult.Failure(message)
        }
    }

    override suspend fun refreshAnalytics(selection: AnalyticsSelection): InvestmentsAnalyticsResult = refreshMutex.withLock {
        validateSelection(selection)
        val previous = currentSnapshot() ?: return InvestmentsAnalyticsResult.Failure("Load investments first.")
        mutableState.value = InvestmentsAnalyticsState.Loading(previous)
        runCatching {
            val session = requireSession()
            val analytics = loadAndCalculateAnalytics(
                session = session,
                selection = selection,
                investments = previous.investments,
            )
            val next = previous.copy(analytics = analytics)
            mutableState.value = InvestmentsAnalyticsState.Ready(next)
            InvestmentsAnalyticsResult.Success
        }.getOrElse { error ->
            val message = error.safeMessage()
            mutableState.value = InvestmentsAnalyticsState.Failure(message, previous)
            InvestmentsAnalyticsResult.Failure(message)
        }
    }

    override suspend fun searchAssets(query: String): MarketSearchResult = runCatching {
        val clean = query.trim()
        require(clean.length >= 2) { "Enter at least two search characters." }
        val response = client.get("$MARKET_API_BASE/api/market/asset-search") {
            url {
                parameters.append("q", clean)
                parameters.append("limit", "10")
            }
            header(HttpHeaders.Accept, ContentType.Application.Json)
        }
        response.requirePublicSuccess("Asset search is unavailable.")
        MarketSearchResult.Success(response.body<AssetSearchResponse>().assets)
    }.getOrElse { MarketSearchResult.Failure(it.safeMessage()) }

    override suspend fun loadQuote(asset: MarketAsset): MarketQuoteResult = runCatching {
        val quote = quoteForAsset(asset) ?: throw InvestmentException("Live price is unavailable. Manual entry remains available.")
        MarketQuoteResult.Success(quote)
    }.getOrElse { MarketQuoteResult.Failure(it.safeMessage()) }

    override suspend fun saveInvestment(draft: InvestmentDraft): InvestmentsAnalyticsResult = mutate {
        validateInvestmentDraft(draft)
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/save_investment_purchase_currency") {
            authenticated(session)
            setBody(SaveInvestmentRequest(
                investmentId = draft.investmentId,
                name = draft.name.trim(),
                type = draft.type.trim().lowercase(),
                quantity = draft.quantity,
                purchasePriceOriginal = draft.purchasePriceOriginal,
                purchaseCurrency = draft.purchaseCurrency.uppercase(),
                purchaseExchangeRate = normalizedRate(draft.purchaseCurrency, draft.purchaseExchangeRateToPkr),
                currentPriceOriginal = draft.currentPriceOriginal,
                currentPriceCurrency = draft.currentPriceCurrency.uppercase(),
                currentExchangeRate = normalizedRate(draft.currentPriceCurrency, draft.currentExchangeRateToPkr),
                purchasedAt = draft.purchasedAt,
                assetId = draft.assetId.cleanOrNull(),
                symbol = draft.symbol.cleanOrNull()?.uppercase(),
                imageUrl = draft.imageUrl.cleanOrNull(),
                priceSource = draft.priceSource.cleanOrNull() ?: "manual",
                priceUpdatedAt = draft.priceUpdatedAt.cleanOrNull(),
                priceChange24h = draft.priceChange24h,
                isLivePriced = draft.isLivePriced,
                accountId = draft.accountId,
            ))
        }.requireSuccess("Investment could not be saved.")
    }

    override suspend fun deleteInvestment(investmentId: String): InvestmentsAnalyticsResult = mutate {
        require(investmentId.isNotBlank()) { "Investment not found." }
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/delete_investment") {
            authenticated(session)
            setBody(DeleteInvestmentRequest(investmentId))
        }.requireSuccess("Investment could not be deleted.")
    }

    override suspend fun withdrawInvestment(draft: InvestmentWithdrawalDraft): InvestmentsAnalyticsResult = mutate {
        require(draft.investmentId.isNotBlank()) { "Investment not found." }
        require(draft.destinationAccountId.isNotBlank()) { "Choose a destination account." }
        require(draft.quantity.isFinite() && draft.quantity > 0) { "Enter a valid quantity." }
        require(draft.withdrawalPriceOriginal.isFinite() && draft.withdrawalPriceOriginal > 0) { "Enter a valid withdrawal price." }
        requireCurrency(draft.withdrawalCurrency)
        require(draft.withdrawalExchangeRateToPkr.isFinite() && draft.withdrawalExchangeRateToPkr > 0) { "Enter a valid PKR exchange rate." }
        requireDateKey(draft.withdrawnAt)
        currentSnapshot()?.investments?.firstOrNull { it.id == draft.investmentId }?.let {
            require(draft.quantity <= it.quantity + 0.0000000001) { "Quantity exceeds the available investment." }
        }
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/withdraw_investment") {
            authenticated(session)
            setBody(WithdrawInvestmentRequest(
                investmentId = draft.investmentId,
                quantity = draft.quantity,
                withdrawalPriceOriginal = draft.withdrawalPriceOriginal,
                withdrawalCurrency = draft.withdrawalCurrency.uppercase(),
                withdrawalExchangeRate = normalizedRate(draft.withdrawalCurrency, draft.withdrawalExchangeRateToPkr),
                destinationAccountId = draft.destinationAccountId,
                withdrawnAt = draft.withdrawnAt,
            ))
        }.requireSuccess("Investment could not be cashed out.")
    }

    private suspend fun mutate(block: suspend () -> Unit): InvestmentsAnalyticsResult = runCatching {
        val previous = currentSnapshot() ?: throw InvestmentException("Load investments first.")
        block()
        refresh(previous.nowDate, force = true)
    }.getOrElse { InvestmentsAnalyticsResult.Failure(it.safeMessage()) }

    private suspend fun loadInvestments(session: AuthSession): List<InvestmentRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/investments") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,type,quantity,purchase_price,purchase_price_original,purchase_currency,purchase_exchange_rate,current_price,current_price_original,current_price_currency,purchased_at,created_at,asset_id,symbol,image_url,price_source,price_currency,price_updated_at,price_change_24h,is_live_priced")
                parameters.append("order", "created_at.desc")
            }
        }
        response.requireSuccess("Investments could not be loaded.")
        return response.body()
    }

    private suspend fun loadAccounts(session: AuthSession): List<InvestmentAccount> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/accounts") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,type,balance,icon_key")
                parameters.append("status", "eq.active")
                parameters.append("order", "name.asc")
            }
        }
        response.requireSuccess("Investment accounts could not be loaded.")
        return response.body()
    }

    private suspend fun loadInvestmentAccountLinks(session: AuthSession): Map<String, String> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/transactions") {
            authenticated(session)
            url {
                parameters.append("select", "investment_id,account_id,created_at")
                parameters.append("investment_id", "not.is.null")
                parameters.append("deleted_at", "is.null")
                parameters.append("order", "created_at.asc")
            }
        }
        response.requireSuccess("Investment account links could not be loaded.")
        return response.body<List<InvestmentLinkRow>>()
            .mapNotNull { row ->
                val investmentId = row.investmentId?.takeIf(String::isNotBlank)
                val accountId = row.accountId?.takeIf(String::isNotBlank)
                if (investmentId != null && accountId != null) investmentId to accountId else null
            }
            .toMap()
    }

    private suspend fun loadExchangeRates(): Map<String, Double> = runCatching {
        val response = client.get("$MARKET_API_BASE/api/exchange-rate") {
            header(HttpHeaders.Accept, ContentType.Application.Json)
        }
        response.requirePublicSuccess("Exchange rates are unavailable.")
        val snapshot = response.body<ExchangeRateResponse>()
        val rates = SupportedInvestmentCurrencies.associateWith { currency ->
            snapshot.rates[currency] ?: 0.0
        }
        if (rates.values.all { it.isFinite() && it > 0 }) rates else fallbackRates()
    }.getOrDefault(fallbackRates())

    private suspend fun applyLiveQuotes(
        investments: List<InvestmentRow>,
        rates: Map<String, Double>,
    ): List<InvestmentRow> {
        val assets = investments.mapNotNull(::assetForInvestment).distinctBy { it.id }
        if (assets.isEmpty()) return investments
        val quotes = mutableMapOf<String, MarketQuote>()
        for (chunk in assets.chunked(8)) {
            coroutineScope {
                chunk.map { asset ->
                    async { asset.id to runCatching { quoteForAsset(asset) }.getOrNull() }
                }.awaitAll()
            }.forEach { (id, quote) -> if (quote != null) quotes[id] = quote }
        }
        return investments.map { row ->
            val asset = assetForInvestment(row) ?: return@map row
            val quote = quotes[asset.id] ?: return@map row
            val pricePkr = convertCurrency(quote.price, quote.currency, "PKR", rates)
            if (!pricePkr.isFinite() || pricePkr <= 0) row else row.copy(
                currentPrice = pricePkr,
                currentPriceOriginal = quote.price,
                currentPriceCurrency = quote.currency,
                priceSource = quote.source,
                priceCurrency = "PKR",
                priceUpdatedAt = row.priceUpdatedAt,
                priceChange24h = quote.change24h,
                isLivePriced = true,
            )
        }
    }

    private fun assetForInvestment(row: InvestmentRow): MarketAsset? {
        val symbol = row.symbol?.trim()?.uppercase()?.takeIf(String::isNotBlank) ?: return null
        val type = canonicalInvestmentType(row.type, row.priceSource)
        return when (type) {
            "crypto" -> {
                val pair = if (symbol == "USDT") null else if (symbol == "BTT") "BTTCUSDT" else "${symbol.replace("/", "")}USDT"
                MarketAsset(
                    id = row.assetId?.trim()?.ifBlank { null } ?: "crypto-${symbol.lowercase()}",
                    name = row.name,
                    symbol = symbol,
                    logoUrl = row.imageUrl.orEmpty(),
                    assetType = "crypto",
                    quoteCurrency = "USD",
                    priceMode = "realtime",
                    providerSymbol = pair,
                    binanceSymbol = pair,
                )
            }
            "stock" -> MarketAsset(
                id = row.assetId?.trim()?.ifBlank { null } ?: "stock-${symbol.lowercase()}",
                name = row.name,
                symbol = symbol,
                logoUrl = row.imageUrl.orEmpty(),
                assetType = "stock",
                quoteCurrency = row.currentPriceCurrency?.uppercase()?.takeIf { it in SupportedInvestmentCurrencies } ?: "USD",
                priceMode = "delayed",
                providerSymbol = symbol,
            )
            "forex" -> {
                val compact = symbol.filter(Char::isLetter).uppercase()
                if (compact.length != 6) return null
                val pair = "${compact.take(3)}-${compact.takeLast(3)}"
                MarketAsset(
                    id = row.assetId?.trim()?.ifBlank { null } ?: "forex-${pair.lowercase()}",
                    name = row.name,
                    symbol = "${compact.take(3)}/${compact.takeLast(3)}",
                    logoUrl = row.imageUrl.orEmpty(),
                    assetType = "forex",
                    quoteCurrency = compact.takeLast(3),
                    priceMode = "reference",
                    providerSymbol = pair,
                )
            }
            else -> null
        }
    }

    private suspend fun quoteForAsset(asset: MarketAsset): MarketQuote? = when (asset.assetType.lowercase()) {
        "crypto" -> quoteCrypto(asset)
        "stock" -> quoteRemote(asset, "$MARKET_API_BASE/api/market/stock-prices", "symbols")
        "forex" -> quoteRemote(asset, "$MARKET_API_BASE/api/market/forex-prices", "pairs")
        else -> null
    }

    private suspend fun quoteCrypto(asset: MarketAsset): MarketQuote? {
        val pair = asset.binanceSymbol?.trim()?.uppercase()
            ?: asset.providerSymbol?.trim()?.uppercase()
            ?: "${asset.symbol.filter(Char::isLetterOrDigit).uppercase()}USDT"
        if (pair.isBlank()) return null
        val response = client.get("$BINANCE_API_BASE/api/v3/ticker/24hr") {
            url { parameters.append("symbol", pair) }
            header(HttpHeaders.Accept, ContentType.Application.Json)
        }
        if (!response.status.isSuccess()) return null
        val row = response.body<BinanceTicker>()
        val price = row.lastPrice?.toDoubleOrNull()?.takeIf { it.isFinite() && it > 0 } ?: return null
        return MarketQuote(
            price = price,
            currency = "USD",
            change24h = row.priceChangePercent?.toDoubleOrNull()?.takeIf(Double::isFinite),
            updatedAtEpochMs = row.closeTime,
            source = "binance-realtime",
        )
    }

    private suspend fun quoteRemote(asset: MarketAsset, endpoint: String, parameter: String): MarketQuote? {
        val symbol = asset.providerSymbol?.trim()?.uppercase() ?: asset.symbol.trim().uppercase()
        if (symbol.isBlank()) return null
        val response = client.get(endpoint) {
            url { parameters.append(parameter, symbol) }
            header(HttpHeaders.Accept, ContentType.Application.Json)
        }
        if (!response.status.isSuccess()) return null
        val row = response.body<RemotePriceResponse>().prices[symbol] ?: return null
        val price = row.price?.takeIf { it.isFinite() && it > 0 } ?: return null
        val currency = row.currency?.uppercase()?.takeIf { it in SupportedInvestmentCurrencies } ?: return null
        return MarketQuote(
            price = price,
            currency = currency,
            change24h = row.change24h?.takeIf(Double::isFinite),
            updatedAtEpochMs = row.updatedAt?.toLong(),
            source = row.source?.ifBlank { "public-market-data" } ?: "public-market-data",
        )
    }

    private suspend fun loadAndCalculateAnalytics(
        session: AuthSession,
        selection: AnalyticsSelection,
        investments: List<InvestmentRow>,
    ): AnalyticsSummary = coroutineScope {
        val categoriesDeferred = async { loadAnalyticsCategories(session) }
        val accountsDeferred = async { loadAnalyticsAccounts(session) }
        val transactionsDeferred = async { loadAnalyticsTransactions(session, selection) }
        val transfersDeferred = async { loadAnalyticsTransfers(session, selection) }
        val categories = categoriesDeferred.await().associateBy { it.id }
        val accountMap = accountsDeferred.await().associateBy { it.id }
        val transactions = transactionsDeferred.await().mapNotNull { row ->
            if (row.deletedAt != null || row.amount <= 0 || row.type.lowercase() !in setOf("income", "expense", "refund")) {
                null
            } else {
                val category = row.categoryId?.let(categories::get)
                val account = row.accountId?.let(accountMap::get)
                AnalyticsTransaction(
                    id = row.id,
                    amount = row.amount,
                    date = row.date,
                    type = row.type.lowercase(),
                    categoryId = row.categoryId,
                    categoryName = category?.name ?: "Other",
                    categoryColor = category?.color,
                    accountId = row.accountId,
                    accountName = account?.name,
                    accountType = account?.type,
                    sourceName = row.sourceName,
                    personName = row.personName,
                    itemName = row.itemName,
                )
            }
        }
        val transfers = transfersDeferred.await().mapNotNull { row ->
            if (row.deletedAt != null || row.amount <= 0) null else AnalyticsTransfer(
                id = row.id,
                amount = row.amount,
                date = row.transferDate,
                fromAccountId = row.fromAccountId,
                toAccountId = row.toAccountId,
            )
        }
        calculateAnalytics(selection, transactions, transfers, aggregateInvestmentHoldings(investments))
    }

    private suspend fun loadAnalyticsAccounts(session: AuthSession): List<InvestmentAccount> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/accounts") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,type,balance,icon_key")
                parameters.append("order", "name.asc")
            }
        }
        response.requireSuccess("Analytics account labels could not be loaded.")
        return response.body()
    }

    private suspend fun loadAnalyticsCategories(session: AuthSession): List<AnalyticsCategoryRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/categories") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,color")
                parameters.append("order", "name.asc")
            }
        }
        response.requireSuccess("Analytics categories could not be loaded.")
        return response.body()
    }

    private suspend fun loadAnalyticsTransactions(
        session: AuthSession,
        selection: AnalyticsSelection,
    ): List<AnalyticsTransactionRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/transactions") {
            authenticated(session)
            url {
                parameters.append("select", "id,amount,date,type,category_id,account_id,source_name,person_name,item_name,deleted_at")
                parameters.append("deleted_at", "is.null")
                parameters.append("date", "gte.${minOf(selection.currentStart, selection.previousStart)}")
                parameters.append("date", "lte.${maxOf(selection.currentEnd, selection.previousEnd)}")
                parameters.append("order", "date.asc,id.asc")
            }
        }
        response.requireSuccess("Analytics transactions could not be loaded.")
        return response.body()
    }

    private suspend fun loadAnalyticsTransfers(
        session: AuthSession,
        selection: AnalyticsSelection,
    ): List<AnalyticsTransferRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/account_transfers") {
            authenticated(session)
            url {
                parameters.append("select", "id,amount,transfer_date,from_account_id,to_account_id,deleted_at")
                parameters.append("deleted_at", "is.null")
                parameters.append("transfer_date", "gte.${minOf(selection.currentStart, selection.previousStart)}")
                parameters.append("transfer_date", "lte.${maxOf(selection.currentEnd, selection.previousEnd)}")
                parameters.append("order", "transfer_date.asc,id.asc")
            }
        }
        response.requireSuccess("Analytics transfers could not be loaded.")
        return response.body()
    }

    private suspend fun requireSession(): AuthSession {
        (authRepository.state.value as? AuthState.SignedIn)?.session?.let { return it }
        authRepository.restoreSession()
        return (authRepository.state.value as? AuthState.SignedIn)?.session
            ?: throw InvestmentException("Please sign in again.")
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
        throw InvestmentException(errorMessage(fallback))
    }

    private suspend fun HttpResponse.requirePublicSuccess(fallback: String) {
        if (status.isSuccess()) return
        throw InvestmentException(errorMessage(fallback))
    }

    private suspend fun HttpResponse.errorMessage(fallback: String): String {
        val raw = bodyAsText()
        return runCatching {
            val parsed = json.decodeFromString<SupabaseRestError>(raw)
            parsed.message ?: parsed.details ?: parsed.hint ?: fallback
        }.getOrDefault(fallback)
    }

    private fun validateInvestmentDraft(draft: InvestmentDraft) {
        require(draft.name.trim().isNotBlank()) { "Enter or select an asset." }
        require(draft.type.trim().isNotBlank()) { "Choose an asset type." }
        require(draft.quantity.isFinite() && draft.quantity > 0) { "Enter a quantity greater than 0." }
        require(draft.purchasePriceOriginal.isFinite() && draft.purchasePriceOriginal > 0) { "Enter a buying price greater than 0." }
        require(draft.currentPriceOriginal.isFinite() && draft.currentPriceOriginal > 0) { "Enter a current price greater than 0." }
        requireCurrency(draft.purchaseCurrency)
        requireCurrency(draft.currentPriceCurrency)
        require(draft.purchaseExchangeRateToPkr.isFinite() && draft.purchaseExchangeRateToPkr > 0) { "Enter a valid purchase exchange rate." }
        require(draft.currentExchangeRateToPkr.isFinite() && draft.currentExchangeRateToPkr > 0) { "Enter a valid current-price exchange rate." }
        requireDateKey(draft.purchasedAt)
        require(draft.accountId.isNotBlank()) { "Select an account." }
    }

    private fun currentSnapshot(): InvestmentsAnalyticsSnapshot? = when (val current = mutableState.value) {
        is InvestmentsAnalyticsState.Ready -> current.snapshot
        is InvestmentsAnalyticsState.Loading -> current.previous
        is InvestmentsAnalyticsState.Failure -> current.previous
        InvestmentsAnalyticsState.Idle -> null
    }

    private fun String?.cleanOrNull(): String? = this?.trim()?.takeIf(String::isNotBlank)
    private fun Throwable.safeMessage(): String =
        (this as? InvestmentException)?.message
            ?: message?.takeIf(String::isNotBlank)
            ?: "A secure investment request could not be completed."

    private class InvestmentException(override val message: String) : IllegalStateException(message)

    private data class BaseData(
        val investments: List<InvestmentRow>,
        val accounts: List<InvestmentAccount>,
        val links: Map<String, String>,
        val rates: Map<String, Double>,
    )

    @Serializable private data class SupabaseRestError(
        val message: String? = null,
        val details: String? = null,
        val hint: String? = null,
        val code: String? = null,
    )
    @Serializable private data class InvestmentLinkRow(
        @SerialName("investment_id") val investmentId: String? = null,
        @SerialName("account_id") val accountId: String? = null,
        @SerialName("created_at") val createdAt: String? = null,
    )
    @Serializable private data class AssetSearchResponse(val assets: List<MarketAsset> = emptyList())
    @Serializable private data class ExchangeRateResponse(
        val base: String = "USD",
        val rates: Map<String, Double> = emptyMap(),
        val updatedAt: String? = null,
    )
    @Serializable private data class BinanceTicker(
        val symbol: String? = null,
        val lastPrice: String? = null,
        val priceChangePercent: String? = null,
        val closeTime: Long? = null,
    )
    @Serializable private data class RemotePriceResponse(
        val prices: Map<String, RemotePriceRow> = emptyMap(),
    )
    @Serializable private data class RemotePriceRow(
        val price: Double? = null,
        val currency: String? = null,
        val change24h: Double? = null,
        val updatedAt: Double? = null,
        val source: String? = null,
    )
    @Serializable private data class SaveInvestmentRequest(
        @SerialName("p_investment_id") val investmentId: String?,
        @SerialName("p_name") val name: String,
        @SerialName("p_type") val type: String,
        @SerialName("p_quantity") val quantity: Double,
        @SerialName("p_purchase_price_original") val purchasePriceOriginal: Double,
        @SerialName("p_purchase_currency") val purchaseCurrency: String,
        @SerialName("p_purchase_exchange_rate_to_pkr") val purchaseExchangeRate: Double,
        @SerialName("p_current_price_original") val currentPriceOriginal: Double,
        @SerialName("p_current_price_currency") val currentPriceCurrency: String,
        @SerialName("p_current_exchange_rate_to_pkr") val currentExchangeRate: Double,
        @SerialName("p_purchased_at") val purchasedAt: String,
        @SerialName("p_asset_id") val assetId: String?,
        @SerialName("p_symbol") val symbol: String?,
        @SerialName("p_image_url") val imageUrl: String?,
        @SerialName("p_price_source") val priceSource: String,
        @SerialName("p_price_updated_at") val priceUpdatedAt: String?,
        @SerialName("p_price_change_24h") val priceChange24h: Double?,
        @SerialName("p_is_live_priced") val isLivePriced: Boolean,
        @SerialName("p_account_id") val accountId: String,
    )
    @Serializable private data class DeleteInvestmentRequest(
        @SerialName("p_investment_id") val investmentId: String,
    )
    @Serializable private data class WithdrawInvestmentRequest(
        @SerialName("p_investment_id") val investmentId: String,
        @SerialName("p_quantity") val quantity: Double,
        @SerialName("p_withdrawal_price_original") val withdrawalPriceOriginal: Double,
        @SerialName("p_withdrawal_currency") val withdrawalCurrency: String,
        @SerialName("p_withdrawal_exchange_rate") val withdrawalExchangeRate: Double,
        @SerialName("p_destination_account_id") val destinationAccountId: String,
        @SerialName("p_withdrawn_at") val withdrawnAt: String,
    )
    @Serializable private data class AnalyticsCategoryRow(
        val id: String,
        val name: String,
        val color: String? = null,
    )
    @Serializable private data class AnalyticsTransactionRow(
        val id: String,
        val amount: Double,
        val date: String,
        val type: String,
        @SerialName("category_id") val categoryId: String? = null,
        @SerialName("account_id") val accountId: String? = null,
        @SerialName("source_name") val sourceName: String? = null,
        @SerialName("person_name") val personName: String? = null,
        @SerialName("item_name") val itemName: String? = null,
        @SerialName("deleted_at") val deletedAt: String? = null,
    )
    @Serializable private data class AnalyticsTransferRow(
        val id: String,
        val amount: Double,
        @SerialName("transfer_date") val transferDate: String,
        @SerialName("from_account_id") val fromAccountId: String? = null,
        @SerialName("to_account_id") val toAccountId: String? = null,
        @SerialName("deleted_at") val deletedAt: String? = null,
    )
}

fun fallbackRates(): Map<String, Double> = mapOf(
    "USD" to 1.0,
    "PKR" to 281.2,
    "INR" to 86.6,
    "EUR" to 0.92,
    "GBP" to 0.79,
    "JPY" to 149.5,
    "CNY" to 7.18,
)

fun exchangeRate(fromCurrency: String, toCurrency: String, rates: Map<String, Double>): Double? {
    val from = rates[fromCurrency.uppercase()] ?: return null
    val to = rates[toCurrency.uppercase()] ?: return null
    if (!from.isFinite() || from <= 0 || !to.isFinite() || to <= 0) return null
    return to / from
}

fun convertCurrency(
    amount: Double,
    fromCurrency: String,
    toCurrency: String,
    rates: Map<String, Double>,
): Double {
    if (!amount.isFinite()) return Double.NaN
    if (fromCurrency.equals(toCurrency, ignoreCase = true)) return amount
    val rate = exchangeRate(fromCurrency, toCurrency, rates) ?: return Double.NaN
    return amount * rate
}

private fun requireCurrency(currency: String) {
    require(currency.uppercase() in SupportedInvestmentCurrencies) { "Choose a supported currency." }
}

private fun normalizedRate(currency: String, rate: Double): Double =
    if (currency.uppercase() == "PKR") 1.0 else rate

private val DATE_KEY = Regex("""\d{4}-\d{2}-\d{2}""")

private fun requireDateKey(value: String) {
    require(DATE_KEY.matches(value) && parseDate(value) != null) { "Enter a valid date as YYYY-MM-DD." }
}

data class CivilDate(val year: Int, val month: Int, val day: Int)

fun parseDate(value: String): CivilDate? {
    if (!DATE_KEY.matches(value)) return null
    val parts = value.split("-").mapNotNull(String::toIntOrNull)
    if (parts.size != 3) return null
    val (year, month, day) = parts
    if (year !in 1..9999 || month !in 1..12 || day !in 1..daysInMonth(year, month)) return null
    return CivilDate(year, month, day)
}

private fun isLeap(year: Int): Boolean = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)

private fun daysInMonth(year: Int, month: Int): Int = when (month) {
    2 -> if (isLeap(year)) 29 else 28
    4, 6, 9, 11 -> 30
    else -> 31
}

private fun formatDate(date: CivilDate): String =
    "${date.year.toString().padStart(4, '0')}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}"

private fun floorDiv(a: Long, b: Long): Long {
    val quotient = a / b
    val remainder = a % b
    return if (remainder != 0L && (a xor b) < 0L) quotient - 1 else quotient
}

private fun epochDay(date: CivilDate): Long {
    var year = date.year
    val month = date.month
    year -= if (month <= 2) 1 else 0
    val era = floorDiv(year.toLong(), 400)
    val yoe = year - (era * 400).toInt()
    val shiftedMonth = month + if (month > 2) -3 else 9
    val doy = (153 * shiftedMonth + 2) / 5 + date.day - 1
    val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
    return era * 146097 + doe - 719468
}

private fun fromEpochDay(epochDay: Long): CivilDate {
    val z = epochDay + 719468
    val era = floorDiv(z, 146097)
    val doe = (z - era * 146097).toInt()
    val yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
    var year = yoe + (era * 400).toInt()
    val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    val mp = (5 * doy + 2) / 153
    val day = doy - (153 * mp + 2) / 5 + 1
    val month = mp + if (mp < 10) 3 else -9
    year += if (month <= 2) 1 else 0
    return CivilDate(year, month, day)
}

private fun shiftDays(value: String, days: Int): String {
    val date = parseDate(value) ?: error("Invalid date")
    return formatDate(fromEpochDay(epochDay(date) + days))
}

private fun shiftMonths(date: CivilDate, months: Int): CivilDate {
    val total = date.year * 12 + date.month - 1 + months
    val year = floorDiv(total.toLong(), 12).toInt()
    val month = total - year * 12 + 1
    return CivilDate(year, month, min(date.day, daysInMonth(year, month)))
}

fun analyticsSelection(
    period: AnalyticsPeriod,
    nowDate: String,
    customStart: String? = null,
    customEnd: String? = null,
): AnalyticsSelection {
    requireDateKey(nowDate)
    val now = parseDate(nowDate)!!
    return when (period) {
        AnalyticsPeriod.Today -> AnalyticsSelection(period, nowDate, nowDate, shiftDays(nowDate, -1), shiftDays(nowDate, -1))
        AnalyticsPeriod.Week -> {
            val start = shiftDays(nowDate, -6)
            val previousEnd = shiftDays(start, -1)
            AnalyticsSelection(period, start, nowDate, shiftDays(previousEnd, -6), previousEnd)
        }
        AnalyticsPeriod.Month -> {
            val currentStart = formatDate(CivilDate(now.year, now.month, 1))
            val previousMonth = shiftMonths(now, -1)
            AnalyticsSelection(
                period,
                currentStart,
                nowDate,
                formatDate(CivilDate(previousMonth.year, previousMonth.month, 1)),
                formatDate(previousMonth),
            )
        }
        AnalyticsPeriod.SixMonths -> {
            val currentStartMonth = shiftMonths(CivilDate(now.year, now.month, 1), -5)
            val previousStartMonth = shiftMonths(currentStartMonth, -6)
            val previousEnd = shiftMonths(now, -6)
            AnalyticsSelection(
                period,
                formatDate(currentStartMonth),
                nowDate,
                formatDate(CivilDate(previousStartMonth.year, previousStartMonth.month, 1)),
                formatDate(previousEnd),
            )
        }
        AnalyticsPeriod.Year -> {
            val previousYearDay = min(now.day, daysInMonth(now.year - 1, now.month))
            AnalyticsSelection(
                period,
                formatDate(CivilDate(now.year, 1, 1)),
                nowDate,
                formatDate(CivilDate(now.year - 1, 1, 1)),
                formatDate(CivilDate(now.year - 1, now.month, previousYearDay)),
            )
        }
        AnalyticsPeriod.Custom -> {
            require(customStart != null && customEnd != null) { "Choose both custom dates." }
            requireDateKey(customStart)
            requireDateKey(customEnd)
            require(customStart <= customEnd) { "Start date must be on or before end date." }
            require(customEnd <= nowDate) { "End date cannot be in the future." }
            val days = (epochDay(parseDate(customEnd)!!) - epochDay(parseDate(customStart)!!)).toInt() + 1
            val previousEnd = shiftDays(customStart, -1)
            AnalyticsSelection(period, customStart, customEnd, shiftDays(previousEnd, -(days - 1)), previousEnd)
        }
    }
}

private fun validateSelection(selection: AnalyticsSelection) {
    requireDateKey(selection.currentStart)
    requireDateKey(selection.currentEnd)
    requireDateKey(selection.previousStart)
    requireDateKey(selection.previousEnd)
    require(selection.currentStart <= selection.currentEnd && selection.previousStart <= selection.previousEnd) {
        "Analytics date range is invalid."
    }
}

fun calculateAnalytics(
    selection: AnalyticsSelection,
    transactions: List<AnalyticsTransaction>,
    transfers: List<AnalyticsTransfer>,
    holdings: List<InvestmentHolding>,
): AnalyticsSummary {
    validateSelection(selection)
    fun inRange(date: String, start: String, end: String) = date >= start && date <= end
    fun amount(type: String, start: String, end: String): Double = transactions.sumOf { row ->
        if (!inRange(row.date, start, end)) 0.0 else when {
            type == "income" && row.type == "income" -> row.amount
            type == "expense" && row.type == "expense" -> row.amount
            type == "expense" && row.type == "refund" -> -row.amount
            else -> 0.0
        }
    }
    val income = amount("income", selection.currentStart, selection.currentEnd)
    val expenses = amount("expense", selection.currentStart, selection.currentEnd)
    val previousIncome = amount("income", selection.previousStart, selection.previousEnd)
    val previousExpenses = amount("expense", selection.previousStart, selection.previousEnd)
    val net = income - expenses
    val previousNet = previousIncome - previousExpenses
    val savingsRate = if (income > 0) round1((net / income) * 100) else null
    val previousRate = if (previousIncome > 0) round1((previousNet / previousIncome) * 100) else null
    val currentTransactions = transactions.filter { inRange(it.date, selection.currentStart, selection.currentEnd) }
    val days = (epochDay(parseDate(selection.currentEnd)!!) - epochDay(parseDate(selection.currentStart)!!)).toInt() + 1
    val incomeRows = currentTransactions.filter { it.type == "income" && it.amount > 0 }
    val expenseRows = currentTransactions.filter { it.type == "expense" && it.amount > 0 }
    val currentTransfers = transfers.filter { inRange(it.date, selection.currentStart, selection.currentEnd) }

    return AnalyticsSummary(
        selection = selection,
        totalIncome = income,
        totalExpenses = expenses,
        netSavings = net,
        savingsRate = savingsRate,
        incomeChange = compareMetric(income, previousIncome, true),
        expensesChange = compareMetric(expenses, previousExpenses, false),
        netSavingsChange = compareMetric(net, previousNet, true),
        savingsRateChange = compareRate(savingsRate, previousRate),
        averageDailyIncome = if (days > 0) income / days else 0.0,
        averageDailySpending = if (days > 0) expenses / days else 0.0,
        incomeCount = incomeRows.size,
        expenseCount = expenseRows.size,
        cashFlow = cashFlowSeries(currentTransactions, selection.currentStart, selection.currentEnd),
        expenseCategories = expenseCategoryBreakdown(currentTransactions),
        incomeSources = incomeSourceBreakdown(currentTransactions),
        accountSpending = accountSpendingBreakdown(currentTransactions),
        largestIncome = largestEntries(incomeRows),
        largestExpenses = largestEntries(expenseRows),
        transferCount = currentTransfers.size,
        transferVolume = currentTransfers.sumOf { it.amount },
        portfolioValue = holdings.sumOf { it.currentValue },
        portfolioInvested = holdings.sumOf { it.totalInvested },
        portfolioPnl = holdings.sumOf { it.totalPnl },
        portfolioHoldings = holdings.take(6),
    )
}

private fun compareMetric(current: Double, previous: Double, favorableIncreasing: Boolean): AnalyticsChange {
    if (current == previous) return AnalyticsChange("No change", null, null)
    if (previous == 0.0) {
        return AnalyticsChange(if (current > 0) "New" else "Changed", null, if (current > 0) favorableIncreasing else !favorableIncreasing)
    }
    val value = round1(((current - previous) / previous) * 100)
    val favorable = if (favorableIncreasing) value > 0 else value < 0
    return AnalyticsChange("${if (value > 0) "+" else ""}$value%", value, favorable)
}

private fun compareRate(current: Double?, previous: Double?): AnalyticsChange {
    if (current == null && previous == null) return AnalyticsChange("No previous activity", null, null)
    if (previous == null) return AnalyticsChange("New", null, current?.let { it > 0 })
    if (current == null) return AnalyticsChange("No current income", null, false)
    val delta = round1(current - previous)
    if (delta == 0.0) return AnalyticsChange("No change", null, null)
    return AnalyticsChange("${if (delta > 0) "+" else ""}$delta pp", delta, delta > 0)
}

private fun round1(value: Double): Double {
    val rounded = round(value * 10) / 10
    return if (rounded == -0.0) 0.0 else rounded
}

private data class DateBucket(val label: String, val start: String, val end: String)

private fun dateBuckets(start: String, end: String): List<DateBucket> {
    val count = (epochDay(parseDate(end)!!) - epochDay(parseDate(start)!!)).toInt() + 1
    if (count <= 14) {
        return (0 until count).map { offset ->
            val day = shiftDays(start, offset)
            DateBucket(day.takeLast(5), day, day)
        }
    }
    if (count <= 90) {
        val result = mutableListOf<DateBucket>()
        var cursor = start
        while (cursor <= end) {
            val bucketEnd = minOf(shiftDays(cursor, 6), end)
            result += DateBucket("${cursor.takeLast(5)}–${bucketEnd.takeLast(5)}", cursor, bucketEnd)
            cursor = shiftDays(bucketEnd, 1)
        }
        return result
    }
    val startDate = parseDate(start)!!
    val endDate = parseDate(end)!!
    val result = mutableListOf<DateBucket>()
    var cursor = CivilDate(startDate.year, startDate.month, 1)
    while (cursor.year < endDate.year || (cursor.year == endDate.year && cursor.month <= endDate.month)) {
        val monthStart = maxOf(formatDate(cursor), start)
        val monthEnd = minOf(formatDate(CivilDate(cursor.year, cursor.month, daysInMonth(cursor.year, cursor.month))), end)
        result += DateBucket("${cursor.year}-${cursor.month.toString().padStart(2, '0')}", monthStart, monthEnd)
        cursor = shiftMonths(cursor, 1).copy(day = 1)
    }
    return result
}

private fun cashFlowSeries(
    transactions: List<AnalyticsTransaction>,
    start: String,
    end: String,
): List<CashFlowPoint> {
    var running = 0.0
    return dateBuckets(start, end).map { bucket ->
        val rows = transactions.filter { it.date in bucket.start..bucket.end }
        val income = rows.filter { it.type == "income" }.sumOf { it.amount }
        val expenses = rows.filter { it.type == "expense" }.sumOf { it.amount } -
            rows.filter { it.type == "refund" }.sumOf { it.amount }
        running += income - expenses
        CashFlowPoint(bucket.label, bucket.start, bucket.end, income, expenses, running)
    }
}

private fun percentages(amounts: List<Double>): List<Double> {
    val total = amounts.filter { it > 0 }.sum()
    if (total <= 0) return amounts.map { 0.0 }
    return amounts.map { round1((max(it, 0.0) / total) * 100) }
}

private fun expenseCategoryBreakdown(rows: List<AnalyticsTransaction>): List<AnalyticsBreakdown> {
    val values = mutableMapOf<String, Triple<String, Double, String?>>()
    rows.filter { it.type == "expense" || it.type == "refund" }.forEach { row ->
        val id = row.categoryId ?: "uncategorized"
        val delta = if (row.type == "refund") -row.amount else row.amount
        val current = values[id]
        values[id] = Triple(row.categoryName, (current?.second ?: 0.0) + delta, current?.third ?: row.categoryColor)
    }
    val sorted = values.mapNotNull { (id, value) ->
        value.second.takeIf { it > 0 }?.let { AnalyticsBreakdown(id, value.first, it, 0.0, value.third) }
    }.sortedByDescending { it.amount }
    val limited = if (sorted.size <= 5) sorted else sorted.take(4) + AnalyticsBreakdown(
        id = "other-categories",
        name = "Other categories",
        amount = sorted.drop(4).sumOf { it.amount },
        percentage = 0.0,
    )
    val pct = percentages(limited.map { it.amount })
    return limited.mapIndexed { index, item -> item.copy(percentage = pct[index]) }
}

private fun incomeSourceBreakdown(rows: List<AnalyticsTransaction>): List<AnalyticsBreakdown> {
    val values = mutableMapOf<String, Double>()
    rows.filter { it.type == "income" }.forEach { row ->
        val name = row.sourceName?.trim()?.takeIf(String::isNotBlank) ?: "Unspecified source"
        values[name] = (values[name] ?: 0.0) + row.amount
    }
    val sorted = values.map { (name, value) -> AnalyticsBreakdown("source:${name.lowercase()}", name, value, 0.0) }
        .sortedByDescending { it.amount }
    val pct = percentages(sorted.map { it.amount })
    return sorted.mapIndexed { index, item -> item.copy(percentage = pct[index]) }
}

private fun accountSpendingBreakdown(rows: List<AnalyticsTransaction>): List<AnalyticsBreakdown> {
    val values = mutableMapOf<String, Triple<String, String?, Double>>()
    rows.filter { it.type == "expense" || it.type == "refund" }.forEach { row ->
        val id = row.accountId ?: "account:unknown"
        val delta = if (row.type == "refund") -row.amount else row.amount
        val current = values[id]
        values[id] = Triple(
            row.accountName ?: "Unknown account",
            row.accountType ?: current?.second,
            (current?.third ?: 0.0) + delta,
        )
    }
    val sorted = values.mapNotNull { (id, value) ->
        value.third.takeIf { it > 0 }?.let { AnalyticsBreakdown(id, value.first, it, 0.0, helper = value.second) }
    }.sortedByDescending { it.amount }
    val pct = percentages(sorted.map { it.amount })
    return sorted.mapIndexed { index, item -> item.copy(percentage = pct[index]) }
}

private fun largestEntries(rows: List<AnalyticsTransaction>): List<LargestAnalyticsEntry> =
    rows.sortedWith(compareByDescending<AnalyticsTransaction> { it.amount }.thenByDescending { it.date })
        .take(5)
        .map {
            LargestAnalyticsEntry(
                id = it.id,
                title = it.itemName?.trim()?.takeIf(String::isNotBlank)
                    ?: it.personName?.trim()?.takeIf(String::isNotBlank)
                    ?: it.categoryName,
                amount = it.amount,
                date = it.date,
                categoryName = it.categoryName,
                accountName = it.accountName,
            )
        }
