package com.jamalsfinance.shared.finance

import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthState
import com.jamalsfinance.shared.auth.AuthSession
import com.jamalsfinance.shared.core.AppConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val SupportedFinanceCurrencies = listOf("PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY")

@Serializable
data class FinanceAccount(
    val id: String,
    val name: String,
    val type: String,
    val balance: Double = 0.0,
    @SerialName("account_number") val accountNumber: String? = null,
    @SerialName("account_kind") val accountKind: String = "savings",
    @SerialName("icon_key") val iconKey: String = "bank",
    @SerialName("accent_color") val accentColor: String = "blue",
    val status: String = "active",
    @SerialName("archived_at") val archivedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("opening_balance_original") val openingBalanceOriginal: Double = 0.0,
    @SerialName("opening_currency") val openingCurrency: String = "PKR",
    @SerialName("opening_exchange_rate_to_pkr") val openingExchangeRateToPkr: Double = 1.0,
)

@Serializable
data class FinanceCategory(
    val id: String,
    val name: String,
    val type: String,
    val color: String? = null,
    @SerialName("icon_key") val iconKey: String? = null,
    @SerialName("parent_id") val parentId: String? = null,
)

@Serializable
data class LedgerCategory(
    val id: String? = null,
    val name: String? = null,
    val color: String? = null,
    @SerialName("icon_key") val iconKey: String? = null,
    val type: String? = null,
    @SerialName("parent_id") val parentId: String? = null,
)

@Serializable
data class LedgerAccount(val name: String? = null)

@Serializable
data class LedgerEntry(
    val id: String,
    val date: String,
    val type: String,
    val amount: Double,
    val note: String? = null,
    val reference: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("deleted_at") val deletedAt: String? = null,
    @SerialName("source_name") val sourceName: String? = null,
    @SerialName("person_name") val personName: String? = null,
    @SerialName("item_name") val itemName: String? = null,
    @SerialName("goal_contribution_id") val goalContributionId: String? = null,
    val categories: LedgerCategory? = null,
    val accounts: LedgerAccount? = null,
    @SerialName("from_account_id") val fromAccountId: String? = null,
    @SerialName("to_account_id") val toAccountId: String? = null,
) {
    val isDeleted: Boolean get() = deletedAt != null
    val isTransfer: Boolean get() = type == "transfer"
    val canEditDirectly: Boolean get() = !isDeleted && (type == "income" || type == "expense")
}

@Serializable
data class EditableTransaction(
    val id: String,
    val type: String,
    val amount: Double,
    @SerialName("amount_original") val amountOriginal: Double,
    val currency: String,
    @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("account_id") val accountId: String? = null,
    val date: String,
    val note: String? = null,
    @SerialName("source_name") val sourceName: String? = null,
    @SerialName("person_name") val personName: String? = null,
    @SerialName("item_name") val itemName: String? = null,
    val reference: String? = null,
)

data class FinanceSnapshot(
    val accounts: List<FinanceAccount> = emptyList(),
    val categories: List<FinanceCategory> = emptyList(),
    val ledger: List<LedgerEntry> = emptyList(),
) {
    val activeAccounts: List<FinanceAccount>
        get() = accounts.filter { it.status == "active" }
            .sortedWith(compareByDescending<FinanceAccount> { it.balance }.thenBy { it.name.lowercase() })

    val archivedAccounts: List<FinanceAccount>
        get() = accounts.filter { it.status == "archived" }.sortedBy { it.name.lowercase() }

    val totalActiveBalance: Double get() = activeAccounts.sumOf { it.balance }
}

sealed interface FinanceState {
    data object Idle : FinanceState
    data class Loading(val previous: FinanceSnapshot? = null) : FinanceState
    data class Ready(val snapshot: FinanceSnapshot) : FinanceState
    data class Failure(val message: String, val previous: FinanceSnapshot? = null) : FinanceState
}

sealed interface FinanceResult {
    data object Success : FinanceResult
    data class Failure(val message: String) : FinanceResult
}

data class AccountDraft(
    val name: String,
    val accountNumber: String? = null,
    val accountKind: String = "savings",
    val openingAmountOriginal: Double = 0.0,
    val openingCurrency: String = "PKR",
    val exchangeRateToPkr: Double = 1.0,
)

data class AccountUpdate(
    val name: String,
    val accountNumber: String? = null,
    val accountKind: String = "savings",
)

data class TransactionDraft(
    val type: String,
    val amountOriginal: Double,
    val currency: String,
    val exchangeRateToPkr: Double,
    val categoryId: String,
    val accountId: String,
    val date: String,
    val note: String? = null,
    val sourceName: String? = null,
    val personName: String? = null,
    val itemName: String? = null,
    val reference: String? = null,
)

data class TransferDraft(
    val fromAccountId: String,
    val toAccountId: String,
    val amountOriginal: Double,
    val currency: String,
    val exchangeRateToPkr: Double,
    val date: String,
    val note: String? = null,
    val reference: String? = null,
)

interface FinanceRepository {
    val state: StateFlow<FinanceState>
    suspend fun refresh(force: Boolean = false): FinanceResult
    suspend fun createAccount(draft: AccountDraft): FinanceResult
    suspend fun updateAccount(accountId: String, update: AccountUpdate): FinanceResult
    suspend fun setAccountArchived(accountId: String, archived: Boolean): FinanceResult
    suspend fun createTransaction(draft: TransactionDraft): FinanceResult
    suspend fun loadEditableTransaction(transactionId: String): EditableTransaction?
    suspend fun updateTransaction(transactionId: String, draft: TransactionDraft): FinanceResult
    suspend fun createTransfer(draft: TransferDraft): FinanceResult
    suspend fun softDelete(entry: LedgerEntry): FinanceResult
}

class SupabaseFinanceRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val authRepository: AuthRepository,
) : FinanceRepository {
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
    private val mutableState = MutableStateFlow<FinanceState>(FinanceState.Idle)
    override val state: StateFlow<FinanceState> = mutableState.asStateFlow()

    override suspend fun refresh(force: Boolean): FinanceResult = refreshMutex.withLock {
        val previous = currentSnapshot()
        if (!force && previous != null && mutableState.value is FinanceState.Ready) return FinanceResult.Success
        mutableState.value = FinanceState.Loading(previous)
        runCatching {
            val session = requireSession()
            val snapshot = coroutineScope {
                val accounts = async { loadAccounts(session) }
                val categories = async { loadCategories(session) }
                val ledger = async { loadLedger(session) }
                FinanceSnapshot(
                    accounts = accounts.await(),
                    categories = categories.await(),
                    ledger = ledger.await().sortedWith(ledgerComparator),
                )
            }
            mutableState.value = FinanceState.Ready(snapshot)
            FinanceResult.Success
        }.getOrElse { error ->
            val message = error.safeMessage()
            mutableState.value = FinanceState.Failure(message, previous)
            FinanceResult.Failure(message)
        }
    }

    override suspend fun createAccount(draft: AccountDraft): FinanceResult = mutate {
        val cleanName = draft.name.trim()
        require(cleanName.isNotBlank()) { "Enter an account name." }
        require(draft.accountKind in setOf("savings", "current")) { "Choose a valid account type." }
        validateMoney(draft.openingAmountOriginal, draft.openingCurrency, draft.exchangeRateToPkr, true)
        val session = requireSession()
        val type = inferAccountType(cleanName)
        val rate = normalizedRate(draft.openingCurrency, draft.exchangeRateToPkr)
        client.post("${config.normalizedSupabaseUrl}/rest/v1/accounts") {
            authenticated(session)
            header("Prefer", "return=minimal")
            setBody(AccountInsert(
                userId = session.user.id,
                name = cleanName,
                type = type,
                balance = draft.openingAmountOriginal * rate,
                accountNumber = draft.accountNumber.cleanOrNull(),
                accountKind = draft.accountKind,
                iconKey = type,
                accentColor = accountAccent(type),
                openingBalanceOriginal = draft.openingAmountOriginal,
                openingCurrency = draft.openingCurrency.uppercase(),
                openingExchangeRateToPkr = rate,
            ))
        }.requireSuccess("Account could not be created.")
    }

    override suspend fun updateAccount(accountId: String, update: AccountUpdate): FinanceResult = mutate {
        require(accountId.isNotBlank()) { "Account not found." }
        val cleanName = update.name.trim()
        require(cleanName.isNotBlank()) { "Enter an account name." }
        require(update.accountKind in setOf("savings", "current")) { "Choose a valid account type." }
        val session = requireSession()
        val type = inferAccountType(cleanName)
        client.patch("${config.normalizedSupabaseUrl}/rest/v1/accounts") {
            authenticated(session)
            url {
                parameters.append("id", "eq.$accountId")
                parameters.append("user_id", "eq.${session.user.id}")
            }
            header("Prefer", "return=minimal")
            setBody(AccountPatch(cleanName, type, update.accountNumber.cleanOrNull(), update.accountKind, type, accountAccent(type)))
        }.requireSuccess("Account could not be updated.")
    }

    override suspend fun setAccountArchived(accountId: String, archived: Boolean): FinanceResult = mutate {
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/set_account_archived") {
            authenticated(session)
            setBody(AccountArchiveRequest(accountId, archived))
        }.requireSuccess(if (archived) "Account could not be archived." else "Account could not be restored.")
    }

    override suspend fun createTransaction(draft: TransactionDraft): FinanceResult = mutate {
        validateTransaction(draft)
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/transactions") {
            authenticated(session)
            header("Prefer", "return=minimal")
            setBody(draft.toPayload(session.user.id))
        }.requireSuccess("Transaction could not be saved.")
    }

    override suspend fun loadEditableTransaction(transactionId: String): EditableTransaction? = runCatching {
        val session = requireSession()
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/transactions") {
            authenticated(session)
            url {
                parameters.append("select", "id,type,amount,amount_original,currency,exchange_rate_to_pkr,category_id,account_id,date,note,source_name,person_name,item_name,reference")
                parameters.append("id", "eq.$transactionId")
                parameters.append("user_id", "eq.${session.user.id}")
                parameters.append("deleted_at", "is.null")
                parameters.append("limit", "1")
            }
        }
        response.requireSuccess("Transaction could not be loaded.")
        response.body<List<EditableTransaction>>().firstOrNull()
    }.getOrNull()

    override suspend fun updateTransaction(transactionId: String, draft: TransactionDraft): FinanceResult = mutate {
        validateTransaction(draft)
        val session = requireSession()
        client.patch("${config.normalizedSupabaseUrl}/rest/v1/transactions") {
            authenticated(session)
            url {
                parameters.append("id", "eq.$transactionId")
                parameters.append("user_id", "eq.${session.user.id}")
                parameters.append("deleted_at", "is.null")
            }
            header("Prefer", "return=minimal")
            setBody(draft.toPayload(session.user.id))
        }.requireSuccess("Transaction could not be updated.")
    }

    override suspend fun createTransfer(draft: TransferDraft): FinanceResult = mutate {
        require(draft.fromAccountId.isNotBlank() && draft.toAccountId.isNotBlank()) { "Select both accounts." }
        require(draft.fromAccountId != draft.toAccountId) { "From and to account must be different." }
        validateMoney(draft.amountOriginal, draft.currency, draft.exchangeRateToPkr, false)
        requireIsoDate(draft.date)
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val amountPkr = draft.amountOriginal * rate
        currentSnapshot()?.activeAccounts?.firstOrNull { it.id == draft.fromAccountId }?.balance?.let {
            require(amountPkr <= it + 0.000001) { "Amount exceeds the available source-account balance." }
        }
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/account_transfers") {
            authenticated(session)
            header("Prefer", "return=minimal")
            setBody(TransferInsert(
                userId = session.user.id,
                fromAccountId = draft.fromAccountId,
                toAccountId = draft.toAccountId,
                amount = amountPkr,
                amountOriginal = draft.amountOriginal,
                currency = draft.currency.uppercase(),
                exchangeRateToPkr = rate,
                transferDate = draft.date,
                note = draft.note.cleanOrNull(),
                reference = draft.reference.cleanOrNull(),
            ))
        }.requireSuccess("Transfer could not be recorded.")
    }

    override suspend fun softDelete(entry: LedgerEntry): FinanceResult = mutate {
        require(!entry.isDeleted) { "This ledger entry is already deleted." }
        val session = requireSession()
        val response = if (entry.isTransfer) {
            client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/soft_delete_account_transfer") {
                authenticated(session)
                setBody(DeleteTransferRequest(entry.id))
            }
        } else {
            client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/soft_delete_transaction") {
                authenticated(session)
                setBody(DeleteTransactionRequest(entry.id))
            }
        }
        response.requireSuccess("Ledger entry could not be deleted.")
    }

    private suspend fun mutate(block: suspend () -> Unit): FinanceResult = runCatching {
        block()
        refresh(force = true)
    }.getOrElse { FinanceResult.Failure(it.safeMessage()) }

    private suspend fun loadAccounts(session: AuthSession): List<FinanceAccount> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/accounts") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,type,balance,account_number,account_kind,icon_key,accent_color,status,archived_at,created_at,opening_balance_original,opening_currency,opening_exchange_rate_to_pkr")
                parameters.append("order", "balance.desc.nullslast,name.asc")
            }
        }
        response.requireSuccess("Accounts could not be loaded.")
        return response.body()
    }

    private suspend fun loadCategories(session: AuthSession): List<FinanceCategory> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/categories") {
            authenticated(session)
            url {
                parameters.append("select", "id,name,type,color,icon_key,parent_id")
                parameters.append("order", "parent_id.asc.nullsfirst,name.asc")
            }
        }
        response.requireSuccess("Categories could not be loaded.")
        return response.body()
    }

    private suspend fun loadLedger(session: AuthSession): List<LedgerEntry> {
        val response = client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/load_ledger_history") {
            authenticated(session)
            setBody(LedgerHistoryRequest())
        }
        response.requireSuccess("Transaction history could not be loaded.")
        return response.body()
    }

    private suspend fun requireSession(): AuthSession {
        (authRepository.state.value as? AuthState.SignedIn)?.session?.let { return it }
        authRepository.restoreSession()
        return (authRepository.state.value as? AuthState.SignedIn)?.session
            ?: throw FinanceException("Please sign in again.")
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
        throw FinanceException(errorMessage(fallback))
    }

    private suspend fun HttpResponse.errorMessage(fallback: String): String {
        val raw = bodyAsText()
        return runCatching {
            val parsed = json.decodeFromString<SupabaseRestError>(raw)
            parsed.message ?: parsed.details ?: parsed.hint ?: fallback
        }.getOrDefault(fallback)
    }

    private fun currentSnapshot(): FinanceSnapshot? = when (val current = mutableState.value) {
        is FinanceState.Ready -> current.snapshot
        is FinanceState.Loading -> current.previous
        is FinanceState.Failure -> current.previous
        FinanceState.Idle -> null
    }

    private fun validateTransaction(draft: TransactionDraft) {
        require(draft.type == "income" || draft.type == "expense") { "Only income and expense can be created from this form." }
        require(draft.accountId.isNotBlank()) { "Select an account." }
        require(draft.categoryId.isNotBlank()) { "Select a category." }
        validateMoney(draft.amountOriginal, draft.currency, draft.exchangeRateToPkr, false)
        requireIsoDate(draft.date)
    }

    private fun validateMoney(amount: Double, currency: String, rate: Double, allowZero: Boolean) {
        require(amount.isFinite()) { "Enter a valid amount." }
        require(if (allowZero) amount >= 0 else amount > 0) { if (allowZero) "Amount cannot be negative." else "Enter an amount greater than 0." }
        require(currency.uppercase() in SupportedFinanceCurrencies) { "Choose a supported currency." }
        val normalized = normalizedRate(currency, rate)
        require(normalized.isFinite() && normalized > 0) { "Enter a valid PKR exchange rate." }
    }

    private fun requireIsoDate(value: String) {
        require(Regex("""\d{4}-\d{2}-\d{2}""").matches(value)) { "Enter a date as YYYY-MM-DD." }
    }

    private fun TransactionDraft.toPayload(userId: String): TransactionPayload {
        val rate = normalizedRate(currency, exchangeRateToPkr)
        return TransactionPayload(
            userId = userId,
            type = type,
            amount = amountOriginal * rate,
            amountOriginal = amountOriginal,
            currency = currency.uppercase(),
            exchangeRateToPkr = rate,
            categoryId = categoryId,
            accountId = accountId,
            date = date,
            note = note.cleanOrNull(),
            sourceName = if (type == "income") sourceName.cleanOrNull() else null,
            personName = personName.cleanOrNull(),
            itemName = itemName.cleanOrNull(),
            reference = reference.cleanOrNull(),
        )
    }

    private fun normalizedRate(currency: String, rate: Double): Double = if (currency.uppercase() == "PKR") 1.0 else rate

    private fun inferAccountType(name: String): String {
        val value = name.lowercase()
        return when {
            "jazzcash" in value -> "jazzcash"
            "easypaisa" in value -> "easypaisa"
            "sadapay" in value -> "sadapay"
            "nayapay" in value -> "nayapay"
            "cash" in value -> "cash"
            "wallet" in value -> "wallet"
            "freelance" in value || "upwork" in value || "fiverr" in value -> "freelance"
            "investment" in value || "broker" in value -> "investment"
            "bank" in value || "ubl" in value || "hbl" in value || "mcb" in value || "meezan" in value || "habib" in value || "allied" in value -> "bank"
            else -> "other"
        }
    }

    private fun accountAccent(type: String): String = when (type) {
        "cash" -> "green"
        "jazzcash" -> "red"
        "easypaisa" -> "green"
        "sadapay" -> "blue"
        "nayapay" -> "purple"
        "investment" -> "orange"
        else -> "blue"
    }

    private fun String?.cleanOrNull(): String? = this?.trim()?.takeIf { it.isNotBlank() }
    private fun Throwable.safeMessage(): String = (this as? FinanceException)?.message ?: message?.takeIf { it.isNotBlank() } ?: "A secure finance request could not be completed."
    private class FinanceException(override val message: String) : IllegalStateException(message)

    companion object {
        private val ledgerComparator = compareByDescending<LedgerEntry> { it.updatedAt ?: it.createdAt ?: it.date }
            .thenByDescending { it.createdAt ?: it.date }
            .thenByDescending { it.date }
            .thenByDescending { it.id }
    }

    @Serializable private data class SupabaseRestError(val message: String? = null, val details: String? = null, val hint: String? = null, val code: String? = null)
    @Serializable private data class LedgerHistoryRequest(
        @SerialName("p_type") val type: String? = null,
        @SerialName("p_from") val from: String? = null,
        @SerialName("p_to") val to: String? = null,
        @SerialName("p_category") val category: String? = null,
        @SerialName("p_account") val account: String? = null,
        @SerialName("p_min_amount") val minAmount: Double? = null,
        @SerialName("p_max_amount") val maxAmount: Double? = null,
    )
    @Serializable private data class AccountInsert(
        @SerialName("user_id") val userId: String,
        val name: String,
        val type: String,
        val balance: Double,
        @SerialName("account_number") val accountNumber: String? = null,
        @SerialName("account_kind") val accountKind: String,
        @SerialName("icon_key") val iconKey: String,
        @SerialName("accent_color") val accentColor: String,
        @SerialName("opening_balance_original") val openingBalanceOriginal: Double,
        @SerialName("opening_currency") val openingCurrency: String,
        @SerialName("opening_exchange_rate_to_pkr") val openingExchangeRateToPkr: Double,
    )
    @Serializable private data class AccountPatch(
        val name: String,
        val type: String,
        @SerialName("account_number") val accountNumber: String? = null,
        @SerialName("account_kind") val accountKind: String,
        @SerialName("icon_key") val iconKey: String,
        @SerialName("accent_color") val accentColor: String,
    )
    @Serializable private data class AccountArchiveRequest(@SerialName("p_account_id") val accountId: String, @SerialName("p_archived") val archived: Boolean)
    @Serializable private data class TransactionPayload(
        @SerialName("user_id") val userId: String,
        val type: String,
        val amount: Double,
        @SerialName("amount_original") val amountOriginal: Double,
        val currency: String,
        @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("category_id") val categoryId: String,
        @SerialName("account_id") val accountId: String,
        val date: String,
        val note: String? = null,
        @SerialName("source_name") val sourceName: String? = null,
        @SerialName("person_name") val personName: String? = null,
        @SerialName("item_name") val itemName: String? = null,
        val reference: String? = null,
    )
    @Serializable private data class TransferInsert(
        @SerialName("user_id") val userId: String,
        @SerialName("from_account_id") val fromAccountId: String,
        @SerialName("to_account_id") val toAccountId: String,
        val amount: Double,
        @SerialName("amount_original") val amountOriginal: Double,
        val currency: String,
        @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("transfer_date") val transferDate: String,
        val note: String? = null,
        val reference: String? = null,
    )
    @Serializable private data class DeleteTransactionRequest(@SerialName("p_transaction_id") val transactionId: String)
    @Serializable private data class DeleteTransferRequest(@SerialName("p_transfer_id") val transferId: String)
}
