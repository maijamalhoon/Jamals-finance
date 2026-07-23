package com.jamalsfinance.shared.personal

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
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
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
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

interface PersonalPlatformRepository {
    val state: StateFlow<PersonalPlatformState>

    suspend fun refresh(todayKey: String, force: Boolean = false): PersonalPlatformResult
    suspend fun updateDisplayName(displayName: String): PersonalPlatformResult
    suspend fun updatePassword(password: String): PersonalPlatformResult
    suspend fun updateCurrency(currency: String): PersonalPlatformResult
    suspend fun updateNotificationPreferences(
        goalAlertsEnabled: Boolean,
        payableAlertsEnabled: Boolean,
    ): PersonalPlatformResult
    suspend fun markAlertRead(alertId: String): PersonalPlatformResult
    suspend fun uploadAvatar(
        bytes: ByteArray,
        mimeType: String,
        extension: String,
    ): PersonalPlatformResult
    suspend fun downloadAvatar(): ByteArray?
    suspend fun exportBackup(clientPreferences: PersonalClientPreferences): BackupExportResult
    suspend fun importBackup(rawBackup: String): BackupImportResult
}

class SupabasePersonalPlatformRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val authRepository: AuthRepository,
) : PersonalPlatformRepository {
    private val json = defaultPersonalJson()
    private val prettyJson = defaultPersonalJson(pretty = true)
    private val client = baseClient.config {
        expectSuccess = false
        install(ContentNegotiation) { json(json) }
    }
    private val refreshMutex = Mutex()
    private val mutableState = MutableStateFlow<PersonalPlatformState>(PersonalPlatformState.Idle)
    override val state: StateFlow<PersonalPlatformState> = mutableState.asStateFlow()

    override suspend fun refresh(
        todayKey: String,
        force: Boolean,
    ): PersonalPlatformResult = refreshMutex.withLock {
        requireDateKey(todayKey)
        val previous = currentSnapshot()
        if (!force && previous?.todayKey == todayKey && mutableState.value is PersonalPlatformState.Ready) {
            return PersonalPlatformResult.Success
        }

        mutableState.value = PersonalPlatformState.Loading(previous)
        runCatching {
            val session = requireSession()
            val snapshot = coroutineScope {
                val userDeferred = async { loadUser(session) }
                val profileDeferred = async { loadProfile(session) }
                val countsDeferred = async { loadCounts(session) }
                val preferencesDeferred = async { loadNotificationPreferences(session) }
                val statesDeferred = async { loadNotificationStates(session) }
                val payablesDeferred = async { loadPayables(session, addDays(todayKey, 7)) }
                val goalsDeferred = async { loadGoals(session, addDays(todayKey, 7)) }

                val user = userDeferred.await()
                val profile = profileDeferred.await()
                val counts = countsDeferred.await()
                val preferences = preferencesDeferred.await()
                val notificationStates = statesDeferred.await()
                val alerts = derivePersonalAlerts(
                    todayKey = todayKey,
                    payables = if (preferences.payableAlertsEnabled) payablesDeferred.await() else {
                        payablesDeferred.cancel()
                        emptyList()
                    },
                    goals = if (preferences.goalAlertsEnabled) goalsDeferred.await() else {
                        goalsDeferred.cancel()
                        emptyList()
                    },
                    states = notificationStates,
                )
                val metadata = user.userMetadata
                val email = user.email ?: session.user.email.orEmpty()
                val displayName = metadata["full_name"].stringOrNull()
                    ?: metadata["name"].stringOrNull()
                    ?: email.substringBefore("@").replace(Regex("[._-]+"), " ").trim()
                        .ifBlank { "Jamal" }
                val avatarPath = metadata["avatar_path"].stringOrNull()
                val preferredCurrency = profile?.preferredCurrency
                    ?.uppercase()
                    ?.takeIf(SUPPORTED_PERSONAL_CURRENCIES::contains)
                    ?: "PKR"

                PersonalPlatformSnapshot(
                    profile = PersonalProfile(
                        id = user.id,
                        email = email,
                        displayName = displayName,
                        avatarPath = avatarPath,
                        preferredCurrency = preferredCurrency,
                        accounts = counts.accounts,
                        transactions = counts.incomeTransactions + counts.expenseTransactions,
                        categories = counts.incomeCategories + counts.expenseCategories,
                        goals = counts.goals,
                        investments = counts.investments,
                    ),
                    notificationPreferences = preferences,
                    alerts = alerts.take(20),
                    unreadAlertCount = alerts.count { !it.read },
                    todayKey = todayKey,
                )
            }
            mutableState.value = PersonalPlatformState.Ready(snapshot)
            PersonalPlatformResult.Success
        }.getOrElse { error ->
            val message = error.safeMessage()
            mutableState.value = PersonalPlatformState.Failure(message, previous)
            PersonalPlatformResult.Failure(message)
        }
    }

    override suspend fun updateDisplayName(displayName: String): PersonalPlatformResult {
        val validation = validatePersonalDisplayName(displayName)
        if (validation != null) return PersonalPlatformResult.Failure(validation)
        val normalized = normalizePersonalDisplayName(displayName)

        return mutateAndRefresh {
            val session = requireSession()
            val body = buildJsonObject {
                put("data", buildJsonObject {
                    put("full_name", normalized)
                    put("name", normalized)
                })
            }
            client.put("${config.normalizedSupabaseUrl}/auth/v1/user") {
                authenticated(session)
                setBody(body)
            }.requireSuccess("Profile could not be updated.")
        }
    }

    override suspend fun updatePassword(password: String): PersonalPlatformResult {
        val validation = validatePersonalPassword(password)
        if (validation != null) return PersonalPlatformResult.Failure(validation)

        return runCatching {
            val session = requireSession()
            client.put("${config.normalizedSupabaseUrl}/auth/v1/user") {
                authenticated(session)
                setBody(buildJsonObject { put("password", password) })
            }.requireSuccess("Password could not be updated.")
            PersonalPlatformResult.Success
        }.getOrElse { PersonalPlatformResult.Failure(it.safeMessage()) }
    }

    override suspend fun updateCurrency(currency: String): PersonalPlatformResult {
        val normalized = currency.uppercase()
        if (normalized !in SUPPORTED_PERSONAL_CURRENCIES) {
            return PersonalPlatformResult.Failure("Choose a supported currency.")
        }

        return mutateAndRefresh {
            val session = requireSession()
            client.post("${config.normalizedSupabaseUrl}/rest/v1/profiles?on_conflict=id") {
                authenticated(session)
                header("Prefer", "resolution=merge-duplicates,return=minimal")
                setBody(ProfileUpsertRow(session.user.id, normalized))
            }.requireSuccess("Currency could not be saved.")
        }
    }

    override suspend fun updateNotificationPreferences(
        goalAlertsEnabled: Boolean,
        payableAlertsEnabled: Boolean,
    ): PersonalPlatformResult = mutateAndRefresh {
        val session = requireSession()
        client.post(
            "${config.normalizedSupabaseUrl}/rest/v1/notification_preferences?on_conflict=user_id",
        ) {
            authenticated(session)
            header("Prefer", "resolution=merge-duplicates,return=minimal")
            setBody(
                NotificationPreferencesUpsertRow(
                    userId = session.user.id,
                    goalAlertsEnabled = goalAlertsEnabled,
                    payableAlertsEnabled = payableAlertsEnabled,
                ),
            )
        }.requireSuccess("Notification preferences could not be saved.")
    }

    override suspend fun markAlertRead(alertId: String): PersonalPlatformResult {
        val cleanId = alertId.trim()
        if (cleanId.isBlank() || cleanId.length > 240) {
            return PersonalPlatformResult.Failure("Notification identity is invalid.")
        }

        return runCatching {
            val session = requireSession()
            client.post(
                "${config.normalizedSupabaseUrl}/rest/v1/notification_states?on_conflict=user_id,notification_id",
            ) {
                authenticated(session)
                header("Prefer", "resolution=merge-duplicates,return=minimal")
                setBody(
                    NotificationStateUpsertRow(
                        userId = session.user.id,
                        notificationId = cleanId,
                        readAt = currentSnapshot()?.todayKey?.let { "${it}T00:00:00Z" },
                    ),
                )
            }.requireSuccess("Notification could not be marked as read.")

            val current = currentSnapshot()
            if (current != null) {
                val alerts = current.alerts.map { alert ->
                    if (alert.id == cleanId) alert.copy(read = true) else alert
                }
                mutableState.value = PersonalPlatformState.Ready(
                    current.copy(
                        alerts = alerts,
                        unreadAlertCount = alerts.count { !it.read },
                    ),
                )
            }
            PersonalPlatformResult.Success
        }.getOrElse { PersonalPlatformResult.Failure(it.safeMessage()) }
    }

    override suspend fun uploadAvatar(
        bytes: ByteArray,
        mimeType: String,
        extension: String,
    ): PersonalPlatformResult {
        if (bytes.isEmpty()) return PersonalPlatformResult.Failure("Choose an image first.")
        if (bytes.size > MAX_AVATAR_BYTES) {
            return PersonalPlatformResult.Failure("Profile image must be 3 MB or smaller.")
        }
        val normalizedMime = mimeType.lowercase()
        val normalizedExtension = when {
            normalizedMime == "image/jpeg" || extension.lowercase() in setOf("jpg", "jpeg") -> "jpg"
            normalizedMime == "image/png" || extension.lowercase() == "png" -> "png"
            normalizedMime == "image/webp" || extension.lowercase() == "webp" -> "webp"
            else -> return PersonalPlatformResult.Failure("Choose a JPG, PNG, or WebP image.")
        }

        return mutateAndRefresh {
            val session = requireSession()
            val avatarPath = "${session.user.id}/profile.$normalizedExtension"
            client.put(
                "${config.normalizedSupabaseUrl}/storage/v1/object/avatars/$avatarPath",
            ) {
                authenticated(session, contentType = false)
                header("x-upsert", "true")
                contentType(ContentType.parse(normalizedMime))
                setBody(bytes)
            }.requireSuccess("Profile image could not be uploaded.")

            val displayName = currentSnapshot()?.profile?.displayName
                ?: session.user.email.orEmpty().substringBefore("@").ifBlank { "Jamal" }
            val privateAvatarUrl =
                "/api/profile/avatar?path=${avatarPath.replace("/", "%2F")}" 
            client.put("${config.normalizedSupabaseUrl}/auth/v1/user") {
                authenticated(session)
                setBody(buildJsonObject {
                    put("data", buildJsonObject {
                        put("full_name", displayName)
                        put("name", displayName)
                        put("avatar_path", avatarPath)
                        put("avatar_url", privateAvatarUrl)
                    })
                })
            }.requireSuccess("Profile image metadata could not be saved.")
        }
    }

    override suspend fun downloadAvatar(): ByteArray? = runCatching {
        val session = requireSession()
        val path = currentSnapshot()?.profile?.avatarPath ?: return@runCatching null
        val response = client.get(
            "${config.normalizedSupabaseUrl}/storage/v1/object/authenticated/avatars/$path",
        ) {
            authenticated(session, contentType = false)
        }
        if (!response.status.isSuccess()) return@runCatching null
        response.body<ByteArray>()
    }.getOrNull()

    override suspend fun exportBackup(
        clientPreferences: PersonalClientPreferences,
    ): BackupExportResult = runCatching {
        val session = requireSession()
        val response = client.post(
            "${config.normalizedSupabaseUrl}/rest/v1/rpc/export_finance_backup",
        ) {
            authenticated(session)
            setBody(JsonObject(emptyMap()))
        }
        response.requireSuccess("Backup could not be prepared.")
        val serverPayload = response.body<JsonElement>().jsonObject
        val snapshot = currentSnapshot()
        val payload = augmentBackup(
            serverPayload = serverPayload,
            email = snapshot?.profile?.email ?: session.user.email.orEmpty(),
            displayName = snapshot?.profile?.displayName.orEmpty(),
            currency = snapshot?.profile?.preferredCurrency ?: "PKR",
            clientPreferences = clientPreferences,
        )
        val raw = prettyJson.encodeToString(JsonElement.serializer(), payload)
        val validation = validateBackupPayload(raw, json)
        if (validation is BackupValidationResult.Invalid) {
            return BackupExportResult.Failure(validation.message)
        }
        val valid = validation as BackupValidationResult.Valid
        val date = currentSnapshot()?.todayKey ?: "backup"
        BackupExportResult.Success(
            fileName = "jamals-finance-backup-$date.jfinance",
            contents = raw,
            recordCount = valid.recordCount,
        )
    }.getOrElse { BackupExportResult.Failure(it.safeMessage()) }

    override suspend fun importBackup(rawBackup: String): BackupImportResult {
        val validation = validateBackupPayload(rawBackup, json)
        if (validation is BackupValidationResult.Invalid) {
            return BackupImportResult.Failure(validation.message)
        }
        val valid = validation as BackupValidationResult.Valid

        return runCatching {
            val session = requireSession()
            val response = client.post(
                "${config.normalizedSupabaseUrl}/rest/v1/rpc/import_finance_backup",
            ) {
                authenticated(session)
                setBody(buildJsonObject { put("p_backup", valid.payload) })
            }
            response.requireSuccess("Finance backup could not be imported.")
            val result = response.body<JsonElement>().jsonObject
            val parsed = BackupImportResult.Success(
                alreadyImported = result["alreadyImported"]?.jsonPrimitive?.content == "true",
                totalAdded = result["totalAdded"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0,
                added = (result["added"] as? JsonObject)?.intMap().orEmpty(),
                skipped = (result["skipped"] as? JsonObject)?.intMap().orEmpty(),
            )
            currentSnapshot()?.todayKey?.let { refresh(it, force = true) }
            parsed
        }.getOrElse { BackupImportResult.Failure(it.safeMessage()) }
    }

    private suspend fun mutateAndRefresh(block: suspend () -> Unit): PersonalPlatformResult =
        runCatching {
            block()
            currentSnapshot()?.todayKey?.let { refresh(it, force = true) }
            PersonalPlatformResult.Success
        }.getOrElse { PersonalPlatformResult.Failure(it.safeMessage()) }

    private fun currentSnapshot(): PersonalPlatformSnapshot? = when (val value = mutableState.value) {
        is PersonalPlatformState.Ready -> value.snapshot
        is PersonalPlatformState.Loading -> value.previous
        is PersonalPlatformState.Failure -> value.previous
        PersonalPlatformState.Idle -> null
    }

    private fun requireSession(): AuthSession =
        (authRepository.state.value as? AuthState.SignedIn)?.session
            ?: throw PersonalPlatformException("Your session expired. Please sign in again.")

    private suspend fun loadUser(session: AuthSession): AuthUserPayload {
        val response = client.get("${config.normalizedSupabaseUrl}/auth/v1/user") {
            authenticated(session, contentType = false)
        }
        response.requireSuccess("Profile could not be loaded.")
        return response.body()
    }

    private suspend fun loadProfile(session: AuthSession): ProfileRow? {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/profiles") {
            authenticated(session, contentType = false)
            url {
                parameters.append("select", "id,preferred_currency")
                parameters.append("id", "eq.${session.user.id}")
                parameters.append("limit", "1")
            }
        }
        response.requireSuccess("Profile preferences could not be loaded.")
        return response.body<List<ProfileRow>>().firstOrNull()
    }

    private suspend fun loadCounts(session: AuthSession): SetupCountsRow {
        val response = client.post(
            "${config.normalizedSupabaseUrl}/rest/v1/rpc/get_dashboard_setup_counts",
        ) {
            authenticated(session)
            setBody(JsonObject(emptyMap()))
        }
        response.requireSuccess("Account statistics could not be loaded.")
        return response.body<List<SetupCountsRow>>().firstOrNull() ?: SetupCountsRow()
    }

    private suspend fun loadNotificationPreferences(
        session: AuthSession,
    ): PersonalNotificationPreferences {
        val response = client.get(
            "${config.normalizedSupabaseUrl}/rest/v1/notification_preferences",
        ) {
            authenticated(session, contentType = false)
            url {
                parameters.append(
                    "select",
                    "user_id,goal_alerts_enabled,payable_alerts_enabled",
                )
                parameters.append("user_id", "eq.${session.user.id}")
                parameters.append("limit", "1")
            }
        }
        response.requireSuccess("Notification preferences could not be loaded.")
        val row = response.body<List<NotificationPreferencesRow>>().firstOrNull()
        return PersonalNotificationPreferences(
            goalAlertsEnabled = row?.goalAlertsEnabled ?: true,
            payableAlertsEnabled = row?.payableAlertsEnabled ?: true,
        )
    }

    private suspend fun loadNotificationStates(
        session: AuthSession,
    ): List<NotificationStateRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/notification_states") {
            authenticated(session, contentType = false)
            url {
                parameters.append(
                    "select",
                    "notification_id,read_at,dismissed_at,snoozed_until",
                )
                parameters.append("user_id", "eq.${session.user.id}")
            }
        }
        response.requireSuccess("Notification state could not be loaded.")
        return response.body()
    }

    private suspend fun loadPayables(
        session: AuthSession,
        horizonKey: String,
    ): List<PayableAlertRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/liabilities") {
            authenticated(session, contentType = false)
            url {
                parameters.append(
                    "select",
                    "id,person_name,item_name,reason,remaining_amount,due_date,status",
                )
                parameters.append("remaining_amount", "gt.0")
                parameters.append("due_date", "lte.$horizonKey")
                parameters.append("order", "due_date.asc")
                parameters.append("limit", "60")
            }
        }
        response.requireSuccess("Payable alerts could not be loaded.")
        return response.body()
    }

    private suspend fun loadGoals(
        session: AuthSession,
        horizonKey: String,
    ): List<GoalAlertRow> {
        val response = client.get("${config.normalizedSupabaseUrl}/rest/v1/goals") {
            authenticated(session, contentType = false)
            url {
                parameters.append(
                    "select",
                    "id,name,target_amount,current_amount,deadline",
                )
                parameters.append("deadline", "lte.$horizonKey")
                parameters.append("order", "deadline.asc")
                parameters.append("limit", "60")
            }
        }
        response.requireSuccess("Goal alerts could not be loaded.")
        return response.body()
    }

    private fun HttpRequestBuilder.authenticated(
        session: AuthSession,
        contentType: Boolean = true,
    ) {
        header("apikey", config.supabasePublishableKey)
        bearerAuth(session.accessToken)
        header(HttpHeaders.Accept, ContentType.Application.Json)
        if (contentType) header(HttpHeaders.ContentType, ContentType.Application.Json)
    }

    private suspend fun HttpResponse.requireSuccess(fallback: String) {
        if (status.isSuccess()) return
        val raw = bodyAsText()
        val message = runCatching {
            val payload = json.parseToJsonElement(raw).jsonObject
            payload["message"].stringOrNull()
                ?: payload["msg"].stringOrNull()
                ?: payload["error_description"].stringOrNull()
                ?: payload["hint"].stringOrNull()
        }.getOrNull()
        throw PersonalPlatformException(message?.take(300) ?: fallback)
    }

    private fun Throwable.safeMessage(): String = when (this) {
        is PersonalPlatformException -> message.orEmpty().ifBlank {
            "A secure finance request could not be completed."
        }
        else -> message?.takeIf(String::isNotBlank)?.take(300)
            ?: "A secure connection could not be completed."
    }
}

internal fun derivePersonalAlerts(
    todayKey: String,
    payables: List<PayableAlertRow>,
    goals: List<GoalAlertRow>,
    states: List<NotificationStateRow>,
): List<PersonalAlert> {
    requireDateKey(todayKey)
    val stateById = states.associateBy(NotificationStateRow::notificationId)
    val alerts = buildList {
        payables.forEach { payable ->
            val dueDate = payable.dueDate?.takeIf(::isDateKey) ?: return@forEach
            val remaining = payable.remainingAmount ?: return@forEach
            if (remaining <= 0 || payable.status?.lowercase() == "completed") return@forEach
            val timing = alertTiming(dueDate, todayKey, goal = false) ?: return@forEach
            val subject = payable.personName.trim()
                .ifBlank { payable.itemName?.trim().orEmpty() }
                .ifBlank { "Payable" }
            val id = "payable:${payable.id}:due"
            add(
                PersonalAlert(
                    id = id,
                    source = AlertSource.Payable,
                    tone = timing.first,
                    urgency = timing.second,
                    title = when (timing.second) {
                        AlertUrgency.Overdue -> "$subject payable is overdue"
                        AlertUrgency.DueToday -> "$subject payable is due today"
                        AlertUrgency.DueSoon -> "$subject payable is due soon"
                    },
                    description = "This payable still has an outstanding balance.",
                    dateKey = dueDate,
                    read = stateById[id]?.readAt != null,
                ),
            )
        }

        goals.forEach { goal ->
            val deadline = goal.deadline?.takeIf(::isDateKey) ?: return@forEach
            val target = goal.targetAmount ?: return@forEach
            val current = goal.currentAmount ?: return@forEach
            if (target <= 0 || current >= target) return@forEach
            val timing = alertTiming(deadline, todayKey, goal = true) ?: return@forEach
            val subject = goal.name.trim().ifBlank { "Goal" }
            val id = "goal:${goal.id}:deadline"
            add(
                PersonalAlert(
                    id = id,
                    source = AlertSource.Goal,
                    tone = timing.first,
                    urgency = timing.second,
                    title = when (timing.second) {
                        AlertUrgency.Overdue -> "$subject deadline is overdue"
                        AlertUrgency.DueToday -> "$subject deadline is today"
                        AlertUrgency.DueSoon -> "$subject deadline is approaching"
                    },
                    description = "This goal has not reached its target yet.",
                    dateKey = deadline,
                    read = stateById[id]?.readAt != null,
                ),
            )
        }
    }

    val active = alerts.filter { alert ->
        val state = stateById[alert.id]
        if (state?.dismissedAt != null) return@filter false
        val snoozedDate = state?.snoozedUntil?.take(10)?.takeIf(::isDateKey)
        snoozedDate == null || snoozedDate <= todayKey
    }
    val priority = mapOf(AlertTone.Danger to 0, AlertTone.Warning to 1, AlertTone.Info to 2)
    return active.sortedWith(
        compareBy<PersonalAlert> { priority.getValue(it.tone) }
            .thenBy(PersonalAlert::dateKey)
            .thenBy(PersonalAlert::id),
    )
}

private fun alertTiming(
    dateKey: String,
    todayKey: String,
    goal: Boolean,
): Pair<AlertTone, AlertUrgency>? {
    val difference = daysFromCivil(dateKey) - daysFromCivil(todayKey)
    return when {
        difference < 0 -> AlertTone.Danger to AlertUrgency.Overdue
        difference == 0L -> AlertTone.Warning to AlertUrgency.DueToday
        difference <= 7 -> (if (goal) AlertTone.Info else AlertTone.Warning) to AlertUrgency.DueSoon
        else -> null
    }
}

internal fun requireDateKey(value: String) {
    require(isDateKey(value)) { "A valid date is required." }
}

internal fun isDateKey(value: String): Boolean {
    val match = DATE_PATTERN.matchEntire(value) ?: return false
    val year = match.groupValues[1].toIntOrNull() ?: return false
    val month = match.groupValues[2].toIntOrNull() ?: return false
    val day = match.groupValues[3].toIntOrNull() ?: return false
    if (year !in 1..9999 || month !in 1..12) return false
    return day in 1..daysInMonth(year, month)
}

internal fun addDays(dateKey: String, days: Int): String {
    requireDateKey(dateKey)
    val shifted = civilFromDays(daysFromCivil(dateKey) + days)
    return "${shifted.first.toString().padStart(4, '0')}-" +
        "${shifted.second.toString().padStart(2, '0')}-" +
        shifted.third.toString().padStart(2, '0')
}

private fun daysFromCivil(dateKey: String): Long {
    val parts = dateKey.split("-")
    return daysFromCivil(parts[0].toInt(), parts[1].toInt(), parts[2].toInt())
}

private fun daysFromCivil(year: Int, month: Int, day: Int): Long {
    val adjustedYear = year - if (month <= 2) 1 else 0
    val era = floorDiv(adjustedYear, 400)
    val yearOfEra = adjustedYear - era * 400
    val adjustedMonth = month + if (month > 2) -3 else 9
    val dayOfYear = (153 * adjustedMonth + 2) / 5 + day - 1
    val dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
    return era.toLong() * 146097L + dayOfEra - 719468L
}

private fun civilFromDays(value: Long): Triple<Int, Int, Int> {
    val z = value + 719468L
    val era = floorDiv(z, 146097L)
    val dayOfEra = z - era * 146097L
    val yearOfEra = (
        dayOfEra - dayOfEra / 1460L + dayOfEra / 36524L - dayOfEra / 146096L
        ) / 365L
    var year = (yearOfEra + era * 400L).toInt()
    val dayOfYear = dayOfEra - (365L * yearOfEra + yearOfEra / 4L - yearOfEra / 100L)
    val monthPrime = (5L * dayOfYear + 2L) / 153L
    val day = (dayOfYear - (153L * monthPrime + 2L) / 5L + 1L).toInt()
    val month = (monthPrime + if (monthPrime < 10L) 3L else -9L).toInt()
    year += if (month <= 2) 1 else 0
    return Triple(year, month, day)
}

private fun floorDiv(left: Int, right: Int): Int {
    var quotient = left / right
    val remainder = left % right
    if (remainder != 0 && (left xor right) < 0) quotient -= 1
    return quotient
}

private fun floorDiv(left: Long, right: Long): Long {
    var quotient = left / right
    val remainder = left % right
    if (remainder != 0L && (left xor right) < 0L) quotient -= 1L
    return quotient
}

private fun daysInMonth(year: Int, month: Int): Int = when (month) {
    1, 3, 5, 7, 8, 10, 12 -> 31
    4, 6, 9, 11 -> 30
    2 -> if (year % 400 == 0 || year % 4 == 0 && year % 100 != 0) 29 else 28
    else -> 0
}

private fun augmentBackup(
    serverPayload: JsonObject,
    email: String,
    displayName: String,
    currency: String,
    clientPreferences: PersonalClientPreferences,
): JsonObject {
    val profileSnapshot = (serverPayload["profileSnapshot"] as? JsonObject).orEmptyObject()
    val preferencesSnapshot = (serverPayload["preferencesSnapshot"] as? JsonObject).orEmptyObject()
    return JsonObject(
        serverPayload.toMutableMap().apply {
            put(
                "profileSnapshot",
                JsonObject(profileSnapshot.toMutableMap().apply {
                    put("auth", buildJsonObject {
                        put("email", email)
                        put("displayName", displayName)
                    })
                }),
            )
            put(
                "preferencesSnapshot",
                JsonObject(preferencesSnapshot.toMutableMap().apply {
                    put("client", buildJsonObject {
                        put("currency", currency)
                        put("dateFormat", clientPreferences.dateFormat)
                        put("compactMode", clientPreferences.compactMode)
                        put("themeMode", clientPreferences.themeMode)
                    })
                }),
            )
        },
    )
}

private fun JsonObject?.orEmptyObject(): JsonObject = this ?: JsonObject(emptyMap())

private val DATE_PATTERN = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$")

@Serializable
private data class ProfileUpsertRow(
    val id: String,
    @SerialName("preferred_currency") val preferredCurrency: String,
)

@Serializable
private data class NotificationPreferencesUpsertRow(
    @SerialName("user_id") val userId: String,
    @SerialName("goal_alerts_enabled") val goalAlertsEnabled: Boolean,
    @SerialName("payable_alerts_enabled") val payableAlertsEnabled: Boolean,
)

@Serializable
private data class NotificationStateUpsertRow(
    @SerialName("user_id") val userId: String,
    @SerialName("notification_id") val notificationId: String,
    @SerialName("read_at") val readAt: String?,
)

private class PersonalPlatformException(message: String) : Exception(message)
