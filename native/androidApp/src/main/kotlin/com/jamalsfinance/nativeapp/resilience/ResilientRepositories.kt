package com.jamalsfinance.nativeapp.resilience

import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthState
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
import com.jamalsfinance.shared.finance.TransactionDraft
import com.jamalsfinance.shared.finance.TransferDraft
import com.jamalsfinance.shared.goals.GoalContribution
import com.jamalsfinance.shared.goals.GoalContributionDraft
import com.jamalsfinance.shared.goals.GoalDraft
import com.jamalsfinance.shared.goals.GoalRow
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
import com.jamalsfinance.shared.goals.PayableRow
import com.jamalsfinance.shared.investments.AnalyticsSelection
import com.jamalsfinance.shared.investments.InvestmentAccount
import com.jamalsfinance.shared.investments.InvestmentDraft
import com.jamalsfinance.shared.investments.InvestmentRow
import com.jamalsfinance.shared.investments.InvestmentWithdrawalDraft
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsState
import com.jamalsfinance.shared.investments.MarketAsset
import com.jamalsfinance.shared.investments.MarketQuoteResult
import com.jamalsfinance.shared.investments.MarketSearchResult
import com.jamalsfinance.shared.investments.aggregateInvestmentHoldings
import com.jamalsfinance.shared.resilience.NetworkMonitor
import com.jamalsfinance.shared.resilience.OfflineSnapshotRecord
import com.jamalsfinance.shared.resilience.OfflineSnapshotStore
import com.jamalsfinance.shared.resilience.offlineReadOnlyMessage
import com.jamalsfinance.shared.resilience.offlineWriteMessage
import com.jamalsfinance.shared.resilience.shouldRefreshSnapshot
import com.jamalsfinance.shared.resilience.shouldUseOfflineSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val CACHE_SCHEMA = 1
private const val FINANCE_CACHE = "core-finance-v1"
private const val GOALS_CACHE = "goals-payables-v1"
private const val INVESTMENTS_CACHE = "investments-v1"

private val cacheJson = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    encodeDefaults = true
}

@Serializable
private data class FinanceCachePayload(
    val accounts: List<FinanceAccount>,
    val categories: List<FinanceCategory>,
    val ledger: List<LedgerEntry>,
)

@Serializable
private data class GoalsCachePayload(
    val accounts: List<ModuleAccount>,
    val goals: List<GoalRow>,
    val contributions: List<GoalContribution>,
    val payables: List<PayableRow>,
    val payments: List<LiabilityPayment>,
)

@Serializable
private data class InvestmentsCachePayload(
    val investments: List<InvestmentRow>,
    val accounts: List<InvestmentAccount>,
    val exchangeRates: Map<String, Double>,
    val nowDate: String,
)

private fun AuthRepository.currentUserId(): String? =
    (state.value as? AuthState.SignedIn)?.session?.user?.id

private suspend inline fun <reified T> readCache(
    store: OfflineSnapshotStore,
    namespace: String,
    userId: String,
    nowMillis: Long,
): Pair<T, Long>? {
    val record = store.read(namespace, userId) ?: return null
    if (record.schemaVersion != CACHE_SCHEMA ||
        !shouldUseOfflineSnapshot(record.savedAtMillis, nowMillis)
    ) {
        store.clear(namespace, userId)
        return null
    }
    return runCatching {
        cacheJson.decodeFromString<T>(record.payload) to record.savedAtMillis
    }.getOrElse {
        store.clear(namespace, userId)
        null
    }
}

private suspend inline fun <reified T> writeCache(
    store: OfflineSnapshotStore,
    namespace: String,
    userId: String,
    payload: T,
    nowMillis: Long,
) {
    runCatching {
        store.write(
            namespace,
            userId,
            OfflineSnapshotRecord(
                payload = cacheJson.encodeToString(payload),
                savedAtMillis = nowMillis,
                schemaVersion = CACHE_SCHEMA,
            ),
        )
    }
}

class ResilientFinanceRepository(
    private val delegate: FinanceRepository,
    private val authRepository: AuthRepository,
    private val store: OfflineSnapshotStore,
    private val network: NetworkMonitor,
    private val nowMillis: () -> Long = System::currentTimeMillis,
) : FinanceRepository {
    private val mutableState = MutableStateFlow<FinanceState>(FinanceState.Idle)
    override val state: StateFlow<FinanceState> = mutableState.asStateFlow()
    private var activeUserId: String? = null
    private var lastSuccessfulAtMillis: Long? = null

    override suspend fun refresh(force: Boolean): FinanceResult {
        val userId = authRepository.currentUserId()
            ?: return financeFailure("Please sign in again.", currentSnapshot())
        ensureUserScope(userId)
        var previous = currentSnapshot()
        if (previous == null) {
            readCache<FinanceCachePayload>(store, FINANCE_CACHE, userId, nowMillis())?.let { (cached, savedAt) ->
                previous = FinanceSnapshot(cached.accounts, cached.categories, cached.ledger)
                lastSuccessfulAtMillis = savedAt
                mutableState.value = FinanceState.Ready(previous!!)
            }
        }
        if (!network.online.value) {
            val message = offlineReadOnlyMessage(previous != null)
            mutableState.value = FinanceState.Failure(message, previous)
            return FinanceResult.Failure(message)
        }
        if (!force && previous != null && !shouldRefreshSnapshot(lastSuccessfulAtMillis, nowMillis())) {
            mutableState.value = FinanceState.Ready(previous!!)
            return FinanceResult.Success
        }
        mutableState.value = FinanceState.Loading(previous)
        return syncAfter(delegate.refresh(force = true), userId, previous)
    }

    override suspend fun createAccount(draft: AccountDraft): FinanceResult =
        onlineMutation { delegate.createAccount(draft) }

    override suspend fun updateAccount(accountId: String, update: AccountUpdate): FinanceResult =
        onlineMutation { delegate.updateAccount(accountId, update) }

    override suspend fun setAccountArchived(accountId: String, archived: Boolean): FinanceResult =
        onlineMutation { delegate.setAccountArchived(accountId, archived) }

    override suspend fun createTransaction(draft: TransactionDraft): FinanceResult =
        onlineMutation { delegate.createTransaction(draft) }

    override suspend fun loadEditableTransaction(transactionId: String): EditableTransaction? =
        if (network.online.value) delegate.loadEditableTransaction(transactionId) else null

    override suspend fun updateTransaction(transactionId: String, draft: TransactionDraft): FinanceResult =
        onlineMutation { delegate.updateTransaction(transactionId, draft) }

    override suspend fun createTransfer(draft: TransferDraft): FinanceResult =
        onlineMutation { delegate.createTransfer(draft) }

    override suspend fun softDelete(entry: LedgerEntry): FinanceResult =
        onlineMutation { delegate.softDelete(entry) }

    private suspend fun onlineMutation(action: suspend () -> FinanceResult): FinanceResult {
        if (!network.online.value) return FinanceResult.Failure(offlineWriteMessage())
        val userId = authRepository.currentUserId()
            ?: return FinanceResult.Failure("Please sign in again.")
        ensureUserScope(userId)
        return syncAfter(action(), userId, currentSnapshot())
    }

    private suspend fun syncAfter(
        result: FinanceResult,
        userId: String,
        previous: FinanceSnapshot?,
    ): FinanceResult {
        val snapshot = delegateSnapshot() ?: previous
        return when (result) {
            FinanceResult.Success -> {
                if (snapshot != null) {
                    mutableState.value = FinanceState.Ready(snapshot)
                    val savedAt = nowMillis()
                    lastSuccessfulAtMillis = savedAt
                    writeCache(
                        store,
                        FINANCE_CACHE,
                        userId,
                        FinanceCachePayload(snapshot.accounts, snapshot.categories, snapshot.ledger),
                        savedAt,
                    )
                }
                FinanceResult.Success
            }
            is FinanceResult.Failure -> {
                mutableState.value = FinanceState.Failure(result.message, snapshot)
                result
            }
        }
    }

    private fun delegateSnapshot(): FinanceSnapshot? = when (val value = delegate.state.value) {
        is FinanceState.Ready -> value.snapshot
        is FinanceState.Loading -> value.previous
        is FinanceState.Failure -> value.previous
        FinanceState.Idle -> null
    }

    private fun currentSnapshot(): FinanceSnapshot? = when (val value = mutableState.value) {
        is FinanceState.Ready -> value.snapshot
        is FinanceState.Loading -> value.previous
        is FinanceState.Failure -> value.previous
        FinanceState.Idle -> null
    }

    private fun ensureUserScope(userId: String) {
        if (activeUserId == userId) return
        activeUserId = userId
        lastSuccessfulAtMillis = null
        mutableState.value = FinanceState.Idle
    }

    private fun financeFailure(message: String, previous: FinanceSnapshot?): FinanceResult.Failure {
        mutableState.value = FinanceState.Failure(message, previous)
        return FinanceResult.Failure(message)
    }
}

class ResilientGoalsPayablesRepository(
    private val delegate: GoalsPayablesRepository,
    private val authRepository: AuthRepository,
    private val store: OfflineSnapshotStore,
    private val network: NetworkMonitor,
    private val nowMillis: () -> Long = System::currentTimeMillis,
) : GoalsPayablesRepository {
    private val mutableState = MutableStateFlow<GoalsPayablesState>(GoalsPayablesState.Idle)
    override val state: StateFlow<GoalsPayablesState> = mutableState.asStateFlow()
    private var activeUserId: String? = null
    private var lastSuccessfulAtMillis: Long? = null

    override suspend fun refresh(force: Boolean): GoalsPayablesResult {
        val userId = authRepository.currentUserId()
            ?: return goalsFailure("Please sign in again.", currentSnapshot())
        ensureUserScope(userId)
        var previous = currentSnapshot()
        if (previous == null) {
            readCache<GoalsCachePayload>(store, GOALS_CACHE, userId, nowMillis())?.let { (cached, savedAt) ->
                previous = cached.toSnapshot()
                lastSuccessfulAtMillis = savedAt
                mutableState.value = GoalsPayablesState.Ready(previous!!)
            }
        }
        if (!network.online.value) {
            val message = offlineReadOnlyMessage(previous != null)
            mutableState.value = GoalsPayablesState.Failure(message, previous)
            return GoalsPayablesResult.Failure(message)
        }
        if (!force && previous != null && !shouldRefreshSnapshot(lastSuccessfulAtMillis, nowMillis())) {
            mutableState.value = GoalsPayablesState.Ready(previous!!)
            return GoalsPayablesResult.Success
        }
        mutableState.value = GoalsPayablesState.Loading(previous)
        return syncAfter(delegate.refresh(force = true), userId, previous)
    }

    override suspend fun createGoal(draft: GoalDraft): GoalsPayablesResult = onlineMutation { delegate.createGoal(draft) }
    override suspend fun updateGoal(goal: NativeGoal, draft: GoalDraft): GoalsPayablesResult = onlineMutation { delegate.updateGoal(goal, draft) }
    override suspend fun deleteGoal(goalId: String): GoalsPayablesResult = onlineMutation { delegate.deleteGoal(goalId) }
    override suspend fun recordGoalContribution(goal: NativeGoal, draft: GoalContributionDraft): GoalsPayablesResult =
        onlineMutation { delegate.recordGoalContribution(goal, draft) }
    override suspend fun deleteGoalContribution(contributionId: String): GoalsPayablesResult =
        onlineMutation { delegate.deleteGoalContribution(contributionId) }
    override suspend fun createPayable(draft: PayableDraft): GoalsPayablesResult = onlineMutation { delegate.createPayable(draft) }
    override suspend fun updatePayable(payable: NativePayable, draft: PayableDraft): GoalsPayablesResult =
        onlineMutation { delegate.updatePayable(payable, draft) }
    override suspend fun deletePayable(payableId: String): GoalsPayablesResult = onlineMutation { delegate.deletePayable(payableId) }
    override suspend fun recordLiabilityPayment(payable: NativePayable, draft: LiabilityPaymentDraft): GoalsPayablesResult =
        onlineMutation { delegate.recordLiabilityPayment(payable, draft) }
    override suspend fun deleteLiabilityPayment(payment: LiabilityPayment): GoalsPayablesResult =
        onlineMutation { delegate.deleteLiabilityPayment(payment) }

    private suspend fun onlineMutation(action: suspend () -> GoalsPayablesResult): GoalsPayablesResult {
        if (!network.online.value) return GoalsPayablesResult.Failure(offlineWriteMessage())
        val userId = authRepository.currentUserId() ?: return GoalsPayablesResult.Failure("Please sign in again.")
        ensureUserScope(userId)
        return syncAfter(action(), userId, currentSnapshot())
    }

    private suspend fun syncAfter(
        result: GoalsPayablesResult,
        userId: String,
        previous: GoalsPayablesSnapshot?,
    ): GoalsPayablesResult {
        val snapshot = delegateSnapshot() ?: previous
        return when (result) {
            GoalsPayablesResult.Success -> {
                if (snapshot != null) {
                    mutableState.value = GoalsPayablesState.Ready(snapshot)
                    val savedAt = nowMillis()
                    lastSuccessfulAtMillis = savedAt
                    writeCache(store, GOALS_CACHE, userId, snapshot.toCachePayload(), savedAt)
                }
                GoalsPayablesResult.Success
            }
            is GoalsPayablesResult.Failure -> {
                mutableState.value = GoalsPayablesState.Failure(result.message, snapshot)
                result
            }
        }
    }

    private fun ensureUserScope(userId: String) {
        if (activeUserId == userId) return
        activeUserId = userId
        lastSuccessfulAtMillis = null
        mutableState.value = GoalsPayablesState.Idle
    }

    private fun currentSnapshot(): GoalsPayablesSnapshot? = stateSnapshot(mutableState.value)
    private fun delegateSnapshot(): GoalsPayablesSnapshot? = stateSnapshot(delegate.state.value)

    private fun goalsFailure(message: String, previous: GoalsPayablesSnapshot?): GoalsPayablesResult.Failure {
        mutableState.value = GoalsPayablesState.Failure(message, previous)
        return GoalsPayablesResult.Failure(message)
    }
}

class ResilientInvestmentsAnalyticsRepository(
    private val delegate: InvestmentsAnalyticsRepository,
    private val authRepository: AuthRepository,
    private val store: OfflineSnapshotStore,
    private val network: NetworkMonitor,
    private val nowMillis: () -> Long = System::currentTimeMillis,
) : InvestmentsAnalyticsRepository {
    private val mutableState = MutableStateFlow<InvestmentsAnalyticsState>(InvestmentsAnalyticsState.Idle)
    override val state: StateFlow<InvestmentsAnalyticsState> = mutableState.asStateFlow()
    private var activeUserId: String? = null
    private var lastSuccessfulAtMillis: Long? = null

    override suspend fun refresh(nowDate: String, force: Boolean): InvestmentsAnalyticsResult {
        val userId = authRepository.currentUserId()
            ?: return investmentsFailure("Please sign in again.", currentSnapshot())
        ensureUserScope(userId)
        var previous = currentSnapshot()
        if (previous == null) {
            readCache<InvestmentsCachePayload>(store, INVESTMENTS_CACHE, userId, nowMillis())?.let { (cached, savedAt) ->
                previous = cached.toSnapshot()
                lastSuccessfulAtMillis = savedAt
                mutableState.value = InvestmentsAnalyticsState.Ready(previous!!)
            }
        }
        if (!network.online.value) {
            val message = offlineReadOnlyMessage(previous != null)
            mutableState.value = InvestmentsAnalyticsState.Failure(message, previous)
            return InvestmentsAnalyticsResult.Failure(message)
        }
        if (!force && previous?.nowDate == nowDate && !shouldRefreshSnapshot(lastSuccessfulAtMillis, nowMillis())) {
            mutableState.value = InvestmentsAnalyticsState.Ready(previous!!)
            return InvestmentsAnalyticsResult.Success
        }
        mutableState.value = InvestmentsAnalyticsState.Loading(previous)
        return syncAfter(delegate.refresh(nowDate, force = true), userId, previous)
    }

    override suspend fun refreshAnalytics(selection: AnalyticsSelection): InvestmentsAnalyticsResult {
        if (!network.online.value) {
            val message = offlineReadOnlyMessage(currentSnapshot() != null)
            mutableState.value = InvestmentsAnalyticsState.Failure(message, currentSnapshot())
            return InvestmentsAnalyticsResult.Failure(message)
        }
        val userId = authRepository.currentUserId() ?: return InvestmentsAnalyticsResult.Failure("Please sign in again.")
        return syncAfter(delegate.refreshAnalytics(selection), userId, currentSnapshot())
    }

    override suspend fun searchAssets(query: String): MarketSearchResult =
        if (network.online.value) delegate.searchAssets(query) else MarketSearchResult.Failure(offlineWriteMessage())

    override suspend fun loadQuote(asset: MarketAsset): MarketQuoteResult =
        if (network.online.value) delegate.loadQuote(asset) else MarketQuoteResult.Failure("You're offline. Live prices are unavailable; saved prices remain visible.")

    override suspend fun saveInvestment(draft: InvestmentDraft): InvestmentsAnalyticsResult =
        onlineMutation { delegate.saveInvestment(draft) }

    override suspend fun deleteInvestment(investmentId: String): InvestmentsAnalyticsResult =
        onlineMutation { delegate.deleteInvestment(investmentId) }

    override suspend fun withdrawInvestment(draft: InvestmentWithdrawalDraft): InvestmentsAnalyticsResult =
        onlineMutation { delegate.withdrawInvestment(draft) }

    private suspend fun onlineMutation(action: suspend () -> InvestmentsAnalyticsResult): InvestmentsAnalyticsResult {
        if (!network.online.value) return InvestmentsAnalyticsResult.Failure(offlineWriteMessage())
        val userId = authRepository.currentUserId() ?: return InvestmentsAnalyticsResult.Failure("Please sign in again.")
        ensureUserScope(userId)
        return syncAfter(action(), userId, currentSnapshot())
    }

    private suspend fun syncAfter(
        result: InvestmentsAnalyticsResult,
        userId: String,
        previous: InvestmentsAnalyticsSnapshot?,
    ): InvestmentsAnalyticsResult {
        val snapshot = delegateSnapshot() ?: previous
        return when (result) {
            InvestmentsAnalyticsResult.Success -> {
                if (snapshot != null) {
                    mutableState.value = InvestmentsAnalyticsState.Ready(snapshot)
                    val savedAt = nowMillis()
                    lastSuccessfulAtMillis = savedAt
                    writeCache(
                        store,
                        INVESTMENTS_CACHE,
                        userId,
                        InvestmentsCachePayload(
                            investments = snapshot.investments,
                            accounts = snapshot.accounts,
                            exchangeRates = snapshot.exchangeRates,
                            nowDate = snapshot.nowDate,
                        ),
                        savedAt,
                    )
                }
                InvestmentsAnalyticsResult.Success
            }
            is InvestmentsAnalyticsResult.Failure -> {
                mutableState.value = InvestmentsAnalyticsState.Failure(result.message, snapshot)
                result
            }
        }
    }

    private fun ensureUserScope(userId: String) {
        if (activeUserId == userId) return
        activeUserId = userId
        lastSuccessfulAtMillis = null
        mutableState.value = InvestmentsAnalyticsState.Idle
    }

    private fun currentSnapshot(): InvestmentsAnalyticsSnapshot? = investmentStateSnapshot(mutableState.value)
    private fun delegateSnapshot(): InvestmentsAnalyticsSnapshot? = investmentStateSnapshot(delegate.state.value)

    private fun investmentsFailure(
        message: String,
        previous: InvestmentsAnalyticsSnapshot?,
    ): InvestmentsAnalyticsResult.Failure {
        mutableState.value = InvestmentsAnalyticsState.Failure(message, previous)
        return InvestmentsAnalyticsResult.Failure(message)
    }
}

private fun GoalsCachePayload.toSnapshot(): GoalsPayablesSnapshot {
    val accountById = accounts.associateBy { it.id }
    val contributionByGoal = contributions.groupBy { it.goalId }
    val paymentByPayable = payments.groupBy { it.liabilityId }
    return GoalsPayablesSnapshot(
        accounts = accounts,
        goals = goals.map { row ->
            NativeGoal(
                row = row,
                linkedAccount = row.accountId?.let(accountById::get),
                contributions = contributionByGoal[row.id].orEmpty()
                    .sortedWith(compareByDescending<GoalContribution> { it.contributedAt }.thenByDescending { it.createdAt }),
            )
        },
        payables = payables.map { row ->
            NativePayable(
                row = row,
                linkedAccount = row.accountId?.let(accountById::get),
                payments = paymentByPayable[row.id].orEmpty()
                    .sortedWith(compareByDescending<LiabilityPayment> { it.paidAt }.thenByDescending { it.createdAt }),
            )
        },
    )
}

private fun GoalsPayablesSnapshot.toCachePayload(): GoalsCachePayload = GoalsCachePayload(
    accounts = accounts,
    goals = goals.map { it.row },
    contributions = goals.flatMap { it.contributions },
    payables = payables.map { it.row },
    payments = payables.flatMap { it.payments },
)

private fun InvestmentsCachePayload.toSnapshot(): InvestmentsAnalyticsSnapshot = InvestmentsAnalyticsSnapshot(
    investments = investments,
    accounts = accounts,
    holdings = aggregateInvestmentHoldings(investments),
    exchangeRates = exchangeRates,
    analytics = null,
    nowDate = nowDate,
)

private fun stateSnapshot(state: GoalsPayablesState): GoalsPayablesSnapshot? = when (state) {
    is GoalsPayablesState.Ready -> state.snapshot
    is GoalsPayablesState.Loading -> state.previous
    is GoalsPayablesState.Failure -> state.previous
    GoalsPayablesState.Idle -> null
}

private fun investmentStateSnapshot(state: InvestmentsAnalyticsState): InvestmentsAnalyticsSnapshot? = when (state) {
    is InvestmentsAnalyticsState.Ready -> state.snapshot
    is InvestmentsAnalyticsState.Loading -> state.previous
    is InvestmentsAnalyticsState.Failure -> state.previous
    InvestmentsAnalyticsState.Idle -> null
}
