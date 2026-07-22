package com.jamalsfinance.shared.goals

import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthSession
import com.jamalsfinance.shared.auth.AuthState
import com.jamalsfinance.shared.core.AppConfig
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.delete
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

@Serializable
data class ModuleAccount(
    val id: String,
    val name: String,
    val type: String,
    val balance: Double = 0.0,
    val status: String = "active",
    @SerialName("icon_key") val iconKey: String? = null,
)

@Serializable
data class GoalContribution(
    val id: String,
    @SerialName("goal_id") val goalId: String,
    @SerialName("account_id") val accountId: String? = null,
    val amount: Double,
    @SerialName("amount_original") val amountOriginal: Double,
    val currency: String = "PKR",
    @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double = 1.0,
    @SerialName("contributed_at") val contributedAt: String,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class GoalRow(
    val id: String,
    val name: String,
    @SerialName("target_amount") val targetAmount: Double,
    @SerialName("target_amount_original") val targetAmountOriginal: Double,
    val currency: String = "PKR",
    @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double = 1.0,
    @SerialName("current_amount") val currentAmount: Double? = 0.0,
    val deadline: String? = null,
    val icon: String? = null,
    val status: String? = null,
    @SerialName("account_id") val accountId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class LiabilityPayment(
    val id: String,
    @SerialName("liability_id") val liabilityId: String,
    @SerialName("account_id") val accountId: String? = null,
    @SerialName("transaction_id") val transactionId: String? = null,
    val amount: Double,
    @SerialName("amount_original") val amountOriginal: Double,
    val currency: String = "PKR",
    @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double = 1.0,
    @SerialName("paid_at") val paidAt: String,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class PayableRow(
    val id: String,
    @SerialName("person_name") val personName: String,
    @SerialName("item_name") val itemName: String? = null,
    val reason: String,
    @SerialName("original_value") val originalValue: Double,
    @SerialName("original_value_input") val originalValueInput: Double,
    val currency: String = "PKR",
    @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double = 1.0,
    @SerialName("paid_amount") val paidAmount: Double = 0.0,
    @SerialName("remaining_amount") val remainingAmount: Double? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val status: String = "pending",
    val notes: String? = null,
    @SerialName("account_id") val accountId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
)

data class NativeGoal(
    val row: GoalRow,
    val linkedAccount: ModuleAccount?,
    val contributions: List<GoalContribution>,
) {
    val currentAmount: Double get() = row.currentAmount ?: 0.0
    val remainingAmount: Double get() = (row.targetAmount - currentAmount).coerceAtLeast(0.0)
    val progress: Double get() = if (row.targetAmount > 0) (currentAmount / row.targetAmount).coerceIn(0.0, 1.0) else 0.0
    val completed: Boolean get() = row.targetAmount > 0 && currentAmount >= row.targetAmount
}

data class NativePayable(
    val row: PayableRow,
    val linkedAccount: ModuleAccount?,
    val payments: List<LiabilityPayment>,
) {
    val remainingAmount: Double get() = row.remainingAmount ?: (row.originalValue - row.paidAmount).coerceAtLeast(0.0)
    val progress: Double get() = if (row.originalValue > 0) (row.paidAmount / row.originalValue).coerceIn(0.0, 1.0) else 0.0

    fun displayStatus(today: String): String = when {
        remainingAmount <= 0.000001 -> "completed"
        row.dueDate != null && row.dueDate < today -> "overdue"
        row.paidAmount > 0 -> "partial"
        else -> "pending"
    }
}

data class GoalsPayablesSnapshot(
    val accounts: List<ModuleAccount> = emptyList(),
    val goals: List<NativeGoal> = emptyList(),
    val payables: List<NativePayable> = emptyList(),
) {
    val activeAccounts: List<ModuleAccount> get() = accounts.filter { it.status == "active" }.sortedBy { it.name.lowercase() }
    val totalGoalTarget: Double get() = goals.sumOf { it.row.targetAmount.coerceAtLeast(0.0) }
    val totalGoalSaved: Double get() = goals.sumOf { it.currentAmount.coerceAtLeast(0.0) }
    val completedGoals: Int get() = goals.count { it.completed }
    val totalPayableValue: Double get() = payables.sumOf { it.row.originalValue.coerceAtLeast(0.0) }
    val totalPayablePaid: Double get() = payables.sumOf { it.row.paidAmount.coerceAtLeast(0.0) }
    val totalPayableRemaining: Double get() = payables.sumOf { it.remainingAmount }
}

sealed interface GoalsPayablesState {
    data object Idle : GoalsPayablesState
    data class Loading(val previous: GoalsPayablesSnapshot? = null) : GoalsPayablesState
    data class Ready(val snapshot: GoalsPayablesSnapshot) : GoalsPayablesState
    data class Failure(val message: String, val previous: GoalsPayablesSnapshot? = null) : GoalsPayablesState
}

sealed interface GoalsPayablesResult {
    data object Success : GoalsPayablesResult
    data class Failure(val message: String) : GoalsPayablesResult
}

data class GoalDraft(
    val name: String,
    val targetAmountOriginal: Double,
    val currentAmountOriginal: Double = 0.0,
    val currency: String = "PKR",
    val exchangeRateToPkr: Double = 1.0,
    val deadline: String? = null,
    val accountId: String? = null,
)

data class GoalContributionDraft(
    val goalId: String,
    val accountId: String? = null,
    val amountOriginal: Double,
    val currency: String = "PKR",
    val exchangeRateToPkr: Double = 1.0,
    val contributedAt: String,
    val note: String? = null,
)

data class PayableDraft(
    val personName: String,
    val itemName: String? = null,
    val reason: String,
    val originalValueInput: Double,
    val currency: String = "PKR",
    val exchangeRateToPkr: Double = 1.0,
    val accountId: String,
    val dueDate: String? = null,
    val notes: String? = null,
)

data class LiabilityPaymentDraft(
    val liabilityId: String,
    val accountId: String,
    val amountOriginal: Double,
    val currency: String = "PKR",
    val exchangeRateToPkr: Double = 1.0,
    val paidAt: String,
    val note: String? = null,
)

interface GoalsPayablesRepository {
    val state: StateFlow<GoalsPayablesState>
    suspend fun refresh(force: Boolean = false): GoalsPayablesResult
    suspend fun createGoal(draft: GoalDraft): GoalsPayablesResult
    suspend fun updateGoal(goal: NativeGoal, draft: GoalDraft): GoalsPayablesResult
    suspend fun deleteGoal(goalId: String): GoalsPayablesResult
    suspend fun recordGoalContribution(goal: NativeGoal, draft: GoalContributionDraft): GoalsPayablesResult
    suspend fun deleteGoalContribution(contributionId: String): GoalsPayablesResult
    suspend fun createPayable(draft: PayableDraft): GoalsPayablesResult
    suspend fun updatePayable(payable: NativePayable, draft: PayableDraft): GoalsPayablesResult
    suspend fun deletePayable(payableId: String): GoalsPayablesResult
    suspend fun recordLiabilityPayment(payable: NativePayable, draft: LiabilityPaymentDraft): GoalsPayablesResult
    suspend fun deleteLiabilityPayment(payment: LiabilityPayment): GoalsPayablesResult
}

class SupabaseGoalsPayablesRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val authRepository: AuthRepository,
) : GoalsPayablesRepository {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }
    private val client = baseClient.config {
        expectSuccess = false
        install(ContentNegotiation) { json(json) }
    }
    private val mutex = Mutex()
    private val mutableState = MutableStateFlow<GoalsPayablesState>(GoalsPayablesState.Idle)
    override val state: StateFlow<GoalsPayablesState> = mutableState.asStateFlow()

    override suspend fun refresh(force: Boolean): GoalsPayablesResult = mutex.withLock {
        val previous = snapshotOrNull()
        if (!force && previous != null && mutableState.value is GoalsPayablesState.Ready) {
            return GoalsPayablesResult.Success
        }
        mutableState.value = GoalsPayablesState.Loading(previous)
        runCatching {
            val session = requireSession()
            val snapshot = coroutineScope {
                val accounts = async { loadAccounts(session) }
                val goals = async { loadGoals(session) }
                val contributions = async { loadGoalContributions(session) }
                val payables = async { loadPayables(session) }
                val payments = async { loadLiabilityPayments(session) }

                val accountRows = accounts.await()
                val accountById = accountRows.associateBy { it.id }
                val contributionRows = contributions.await().groupBy { it.goalId }
                val paymentRows = payments.await().groupBy { it.liabilityId }

                GoalsPayablesSnapshot(
                    accounts = accountRows,
                    goals = goals.await().map { row ->
                        NativeGoal(
                            row = row,
                            linkedAccount = row.accountId?.let(accountById::get),
                            contributions = contributionRows[row.id].orEmpty()
                                .sortedWith(compareByDescending<GoalContribution> { it.contributedAt }.thenByDescending { it.createdAt }),
                        )
                    },
                    payables = payables.await().map { row ->
                        NativePayable(
                            row = row,
                            linkedAccount = row.accountId?.let(accountById::get),
                            payments = paymentRows[row.id].orEmpty()
                                .sortedWith(compareByDescending<LiabilityPayment> { it.paidAt }.thenByDescending { it.createdAt }),
                        )
                    },
                )
            }
            mutableState.value = GoalsPayablesState.Ready(snapshot)
            GoalsPayablesResult.Success
        }.getOrElse { error ->
            val message = error.safeMessage()
            mutableState.value = GoalsPayablesState.Failure(message, previous)
            GoalsPayablesResult.Failure(message)
        }
    }

    override suspend fun createGoal(draft: GoalDraft): GoalsPayablesResult = mutate {
        validateGoal(draft, currentAmountPkr = null)
        val session = requireSession()
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val target = draft.targetAmountOriginal * rate
        val current = draft.currentAmountOriginal * rate
        client.post("${config.normalizedSupabaseUrl}/rest/v1/goals") {
            authenticated(session)
            header("Prefer", "return=minimal")
            setBody(
                GoalInsert(
                    userId = session.user.id,
                    name = draft.name.trim(),
                    targetAmount = target,
                    targetAmountOriginal = draft.targetAmountOriginal,
                    currency = draft.currency.uppercase(),
                    exchangeRateToPkr = rate,
                    currentAmount = current,
                    deadline = draft.deadline.cleanOrNull(),
                    accountId = draft.accountId.cleanOrNull(),
                ),
            )
        }.requireSuccess("Goal could not be created.")
    }

    override suspend fun updateGoal(goal: NativeGoal, draft: GoalDraft): GoalsPayablesResult = mutate {
        validateGoal(draft, currentAmountPkr = goal.currentAmount)
        val session = requireSession()
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val target = draft.targetAmountOriginal * rate
        client.patch("${config.normalizedSupabaseUrl}/rest/v1/goals") {
            authenticated(session)
            url {
                parameters.append("id", "eq.${goal.row.id}")
                parameters.append("user_id", "eq.${session.user.id}")
            }
            header("Prefer", "return=minimal")
            setBody(
                GoalPatch(
                    name = draft.name.trim(),
                    targetAmount = target,
                    targetAmountOriginal = draft.targetAmountOriginal,
                    currency = draft.currency.uppercase(),
                    exchangeRateToPkr = rate,
                    deadline = draft.deadline.cleanOrNull(),
                    accountId = draft.accountId.cleanOrNull(),
                ),
            )
        }.requireSuccess("Goal could not be updated.")
    }

    override suspend fun deleteGoal(goalId: String): GoalsPayablesResult = mutate {
        val session = requireSession()
        client.delete("${config.normalizedSupabaseUrl}/rest/v1/goals") {
            authenticated(session)
            url {
                parameters.append("id", "eq.$goalId")
                parameters.append("user_id", "eq.${session.user.id}")
            }
            header("Prefer", "return=minimal")
        }.requireSuccess("Goal could not be deleted.")
    }

    override suspend fun recordGoalContribution(
        goal: NativeGoal,
        draft: GoalContributionDraft,
    ): GoalsPayablesResult = mutate {
        require(draft.goalId == goal.row.id) { "Goal could not be matched." }
        validateMoney(draft.amountOriginal, draft.currency, draft.exchangeRateToPkr, allowZero = false)
        requireIsoDate(draft.contributedAt)
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val canonical = draft.amountOriginal * rate
        require(canonical <= goal.remainingAmount + 0.000001) { "Contribution cannot exceed the remaining goal amount." }
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/record_goal_contribution_currency") {
            authenticated(session)
            setBody(
                GoalContributionRequest(
                    goalId = goal.row.id,
                    accountId = draft.accountId.cleanOrNull(),
                    amountOriginal = draft.amountOriginal,
                    currency = draft.currency.uppercase(),
                    exchangeRateToPkr = rate,
                    contributedAt = draft.contributedAt,
                    note = draft.note.cleanOrNull(),
                ),
            )
        }.requireSuccess("Goal contribution could not be recorded.")
    }

    override suspend fun deleteGoalContribution(contributionId: String): GoalsPayablesResult = mutate {
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/delete_goal_contribution") {
            authenticated(session)
            setBody(DeleteGoalContributionRequest(contributionId))
        }.requireSuccess("Goal contribution could not be removed.")
    }

    override suspend fun createPayable(draft: PayableDraft): GoalsPayablesResult = mutate {
        validatePayable(draft, paidAmountPkr = 0.0)
        val session = requireSession()
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val canonical = draft.originalValueInput * rate
        client.post("${config.normalizedSupabaseUrl}/rest/v1/liabilities") {
            authenticated(session)
            header("Prefer", "return=minimal")
            setBody(
                PayableInsert(
                    userId = session.user.id,
                    personName = draft.personName.trim(),
                    itemName = draft.itemName.cleanOrNull(),
                    reason = draft.reason.trim(),
                    originalValue = canonical,
                    originalValueInput = draft.originalValueInput,
                    currency = draft.currency.uppercase(),
                    exchangeRateToPkr = rate,
                    paidAmount = 0.0,
                    remainingAmount = canonical,
                    dueDate = draft.dueDate.cleanOrNull(),
                    status = "pending",
                    notes = draft.notes.cleanOrNull(),
                    accountId = draft.accountId,
                ),
            )
        }.requireSuccess("Payable could not be created.")
    }

    override suspend fun updatePayable(payable: NativePayable, draft: PayableDraft): GoalsPayablesResult = mutate {
        validatePayable(draft, paidAmountPkr = payable.row.paidAmount)
        val session = requireSession()
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val canonical = draft.originalValueInput * rate
        val remaining = (canonical - payable.row.paidAmount).coerceAtLeast(0.0)
        val status = when {
            remaining <= 0.000001 -> "completed"
            payable.row.paidAmount > 0 -> "partial"
            else -> "pending"
        }
        client.patch("${config.normalizedSupabaseUrl}/rest/v1/liabilities") {
            authenticated(session)
            url {
                parameters.append("id", "eq.${payable.row.id}")
                parameters.append("user_id", "eq.${session.user.id}")
            }
            header("Prefer", "return=minimal")
            setBody(
                PayablePatch(
                    personName = draft.personName.trim(),
                    itemName = draft.itemName.cleanOrNull(),
                    reason = draft.reason.trim(),
                    originalValue = canonical,
                    originalValueInput = draft.originalValueInput,
                    currency = draft.currency.uppercase(),
                    exchangeRateToPkr = rate,
                    remainingAmount = remaining,
                    dueDate = draft.dueDate.cleanOrNull(),
                    status = status,
                    notes = draft.notes.cleanOrNull(),
                    accountId = draft.accountId,
                ),
            )
        }.requireSuccess("Payable could not be updated.")
    }

    override suspend fun deletePayable(payableId: String): GoalsPayablesResult = mutate {
        val session = requireSession()
        client.delete("${config.normalizedSupabaseUrl}/rest/v1/liabilities") {
            authenticated(session)
            url {
                parameters.append("id", "eq.$payableId")
                parameters.append("user_id", "eq.${session.user.id}")
            }
            header("Prefer", "return=minimal")
        }.requireSuccess("Payable could not be deleted.")
    }

    override suspend fun recordLiabilityPayment(
        payable: NativePayable,
        draft: LiabilityPaymentDraft,
    ): GoalsPayablesResult = mutate {
        require(draft.liabilityId == payable.row.id) { "Payable could not be matched." }
        require(draft.accountId.isNotBlank()) { "Select the account used for payment." }
        validateMoney(draft.amountOriginal, draft.currency, draft.exchangeRateToPkr, allowZero = false)
        requireIsoDate(draft.paidAt)
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val canonical = draft.amountOriginal * rate
        require(canonical <= payable.remainingAmount + 0.000001) { "Payment cannot exceed the remaining payable amount." }
        val accountBalance = snapshotOrNull()?.activeAccounts?.firstOrNull { it.id == draft.accountId }?.balance
        if (accountBalance != null) require(canonical <= accountBalance + 0.000001) { "Payment exceeds the selected account balance." }
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/record_liability_payment_currency") {
            authenticated(session)
            setBody(
                LiabilityPaymentRequest(
                    liabilityId = payable.row.id,
                    accountId = draft.accountId,
                    amountOriginal = draft.amountOriginal,
                    currency = draft.currency.uppercase(),
                    exchangeRateToPkr = rate,
                    paidAt = draft.paidAt,
                    note = draft.note.cleanOrNull(),
                ),
            )
        }.requireSuccess("Payment could not be recorded.")
    }

    override suspend fun deleteLiabilityPayment(payment: LiabilityPayment): GoalsPayablesResult = mutate {
        val transactionId = payment.transactionId
            ?: throw GoalsPayablesException("This payment is missing its linked transaction and cannot be removed safely.")
        val session = requireSession()
        client.post("${config.normalizedSupabaseUrl}/rest/v1/rpc/delete_liability_payment_transaction") {
            authenticated(session)
            setBody(DeleteLiabilityPaymentRequest(transactionId))
        }.requireSuccess("Payment could not be removed.")
    }

    private suspend fun mutate(block: suspend () -> Unit): GoalsPayablesResult = runCatching {
        block()
        refresh(force = true)
    }.getOrElse { GoalsPayablesResult.Failure(it.safeMessage()) }

    private suspend fun loadAccounts(session: AuthSession): List<ModuleAccount> = loadList(
        session = session,
        table = "accounts",
        select = "id,name,type,balance,status,icon_key",
        order = "name.asc",
        fallback = "Accounts could not be loaded.",
    )

    private suspend fun loadGoals(session: AuthSession): List<GoalRow> = loadList(
        session = session,
        table = "goals",
        select = "id,name,target_amount,target_amount_original,currency,exchange_rate_to_pkr,current_amount,deadline,icon,status,account_id,created_at",
        order = "created_at.desc",
        fallback = "Goals could not be loaded.",
    )

    private suspend fun loadGoalContributions(session: AuthSession): List<GoalContribution> = loadList(
        session = session,
        table = "goal_contributions",
        select = "id,goal_id,account_id,amount,amount_original,currency,exchange_rate_to_pkr,contributed_at,note,created_at",
        order = "contributed_at.desc,created_at.desc",
        fallback = "Goal contribution history could not be loaded.",
    )

    private suspend fun loadPayables(session: AuthSession): List<PayableRow> = loadList(
        session = session,
        table = "liabilities",
        select = "id,person_name,item_name,reason,original_value,original_value_input,currency,exchange_rate_to_pkr,paid_amount,remaining_amount,due_date,status,notes,account_id,created_at,updated_at,completed_at",
        order = "due_date.asc.nullslast,created_at.desc",
        fallback = "Payables could not be loaded.",
    )

    private suspend fun loadLiabilityPayments(session: AuthSession): List<LiabilityPayment> = loadList(
        session = session,
        table = "liability_payments",
        select = "id,liability_id,account_id,transaction_id,amount,amount_original,currency,exchange_rate_to_pkr,paid_at,note,created_at",
        order = "paid_at.desc,created_at.desc",
        fallback = "Payment history could not be loaded.",
    )

    private suspend inline fun <reified T> loadList(
        session: AuthSession,
        table: String,
        select: String,
        order: String,
        fallback: String,
    ): List<T> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/$table") {
            authenticated(session)
            url {
                parameters.append("select", select)
                parameters.append("order", order)
            }
        }
        response.requireSuccess(fallback)
        return response.body()
    }

    private suspend fun requireSession(): AuthSession {
        (authRepository.state.value as? AuthState.SignedIn)?.session?.let { return it }
        authRepository.restoreSession()
        return (authRepository.state.value as? AuthState.SignedIn)?.session
            ?: throw GoalsPayablesException("Please sign in again.")
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
        throw GoalsPayablesException(errorMessage(fallback))
    }

    private suspend fun HttpResponse.errorMessage(fallback: String): String {
        val raw = bodyAsText()
        return runCatching {
            val parsed = json.decodeFromString<SupabaseRestError>(raw)
            parsed.message ?: parsed.details ?: parsed.hint ?: fallback
        }.getOrDefault(fallback)
    }

    private fun snapshotOrNull(): GoalsPayablesSnapshot? = when (val current = mutableState.value) {
        is GoalsPayablesState.Ready -> current.snapshot
        is GoalsPayablesState.Loading -> current.previous
        is GoalsPayablesState.Failure -> current.previous
        GoalsPayablesState.Idle -> null
    }

    private fun validateGoal(draft: GoalDraft, currentAmountPkr: Double?) {
        require(draft.name.trim().isNotBlank()) { "Enter a goal name." }
        validateMoney(draft.targetAmountOriginal, draft.currency, draft.exchangeRateToPkr, allowZero = false)
        require(draft.currentAmountOriginal.isFinite() && draft.currentAmountOriginal >= 0) { "Saved amount cannot be negative." }
        draft.deadline.cleanOrNull()?.let(::requireIsoDate)
        val rate = normalizedRate(draft.currency, draft.exchangeRateToPkr)
        val targetPkr = draft.targetAmountOriginal * rate
        val current = currentAmountPkr ?: draft.currentAmountOriginal * rate
        require(current <= targetPkr + 0.000001) { "Target amount cannot be lower than the amount already saved." }
    }

    private fun validatePayable(draft: PayableDraft, paidAmountPkr: Double) {
        require(draft.personName.trim().isNotBlank()) { "Enter the name of the person or business to pay." }
        require(draft.reason.trim().isNotBlank()) { "Enter the payment purpose." }
        require(draft.accountId.isNotBlank()) { "Select an account." }
        validateMoney(draft.originalValueInput, draft.currency, draft.exchangeRateToPkr, allowZero = false)
        draft.dueDate.cleanOrNull()?.let(::requireIsoDate)
        val canonical = draft.originalValueInput * normalizedRate(draft.currency, draft.exchangeRateToPkr)
        require(canonical + 0.000001 >= paidAmountPkr) { "Payable value cannot be lower than the amount already paid." }
    }

    private fun validateMoney(amount: Double, currency: String, rate: Double, allowZero: Boolean) {
        require(amount.isFinite()) { "Enter a valid amount." }
        require(if (allowZero) amount >= 0 else amount > 0) {
            if (allowZero) "Amount cannot be negative." else "Enter an amount greater than 0."
        }
        require(currency.uppercase() in SupportedFinanceCurrencies) { "Choose a supported currency." }
        val normalized = normalizedRate(currency, rate)
        require(normalized.isFinite() && normalized > 0) { "Enter a valid PKR exchange rate." }
    }

    private fun normalizedRate(currency: String, rate: Double): Double = if (currency.uppercase() == "PKR") 1.0 else rate

    private fun requireIsoDate(value: String) {
        require(Regex("""\d{4}-\d{2}-\d{2}""").matches(value)) { "Enter a date as YYYY-MM-DD." }
    }

    private fun String?.cleanOrNull(): String? = this?.trim()?.takeIf { it.isNotBlank() }

    private fun Throwable.safeMessage(): String =
        (this as? GoalsPayablesException)?.message
            ?: message?.takeIf { it.isNotBlank() }
            ?: "A secure goals or payables request could not be completed."

    private class GoalsPayablesException(override val message: String) : IllegalStateException(message)

    @Serializable
    private data class SupabaseRestError(
        val message: String? = null,
        val details: String? = null,
        val hint: String? = null,
        val code: String? = null,
    )

    @Serializable
    private data class GoalInsert(
        @SerialName("user_id") val userId: String,
        val name: String,
        @SerialName("target_amount") val targetAmount: Double,
        @SerialName("target_amount_original") val targetAmountOriginal: Double,
        val currency: String,
        @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("current_amount") val currentAmount: Double,
        val deadline: String? = null,
        @SerialName("account_id") val accountId: String? = null,
    )

    @Serializable
    private data class GoalPatch(
        val name: String,
        @SerialName("target_amount") val targetAmount: Double,
        @SerialName("target_amount_original") val targetAmountOriginal: Double,
        val currency: String,
        @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        val deadline: String? = null,
        @SerialName("account_id") val accountId: String? = null,
    )

    @Serializable
    private data class GoalContributionRequest(
        @SerialName("p_goal_id") val goalId: String,
        @SerialName("p_account_id") val accountId: String? = null,
        @SerialName("p_amount_original") val amountOriginal: Double,
        @SerialName("p_currency") val currency: String,
        @SerialName("p_exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("p_contributed_at") val contributedAt: String,
        @SerialName("p_note") val note: String? = null,
    )

    @Serializable
    private data class DeleteGoalContributionRequest(
        @SerialName("p_contribution_id") val contributionId: String,
    )

    @Serializable
    private data class PayableInsert(
        @SerialName("user_id") val userId: String,
        @SerialName("person_name") val personName: String,
        @SerialName("item_name") val itemName: String? = null,
        val reason: String,
        @SerialName("original_value") val originalValue: Double,
        @SerialName("original_value_input") val originalValueInput: Double,
        val currency: String,
        @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("paid_amount") val paidAmount: Double,
        @SerialName("remaining_amount") val remainingAmount: Double,
        @SerialName("due_date") val dueDate: String? = null,
        val status: String,
        val notes: String? = null,
        @SerialName("account_id") val accountId: String,
    )

    @Serializable
    private data class PayablePatch(
        @SerialName("person_name") val personName: String,
        @SerialName("item_name") val itemName: String? = null,
        val reason: String,
        @SerialName("original_value") val originalValue: Double,
        @SerialName("original_value_input") val originalValueInput: Double,
        val currency: String,
        @SerialName("exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("remaining_amount") val remainingAmount: Double,
        @SerialName("due_date") val dueDate: String? = null,
        val status: String,
        val notes: String? = null,
        @SerialName("account_id") val accountId: String,
    )

    @Serializable
    private data class LiabilityPaymentRequest(
        @SerialName("p_liability_id") val liabilityId: String,
        @SerialName("p_account_id") val accountId: String,
        @SerialName("p_amount_original") val amountOriginal: Double,
        @SerialName("p_currency") val currency: String,
        @SerialName("p_exchange_rate_to_pkr") val exchangeRateToPkr: Double,
        @SerialName("p_paid_at") val paidAt: String,
        @SerialName("p_note") val note: String? = null,
    )

    @Serializable
    private data class DeleteLiabilityPaymentRequest(
        @SerialName("p_transaction_id") val transactionId: String,
    )
}
