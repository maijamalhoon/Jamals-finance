package com.jamalsfinance.shared.personal

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

const val MAX_FINANCE_BACKUP_BYTES: Int = 25 * 1024 * 1024
const val MAX_FINANCE_BACKUP_RECORDS: Int = 100_000
const val MAX_AVATAR_BYTES: Int = 3 * 1024 * 1024

val SUPPORTED_PERSONAL_CURRENCIES: List<String> =
    listOf("PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY")

enum class AlertSource { Goal, Payable }
enum class AlertTone { Danger, Warning, Info }
enum class AlertUrgency { Overdue, DueToday, DueSoon }

data class PersonalProfile(
    val id: String,
    val email: String,
    val displayName: String,
    val avatarPath: String?,
    val preferredCurrency: String,
    val accounts: Long,
    val transactions: Long,
    val categories: Long,
    val goals: Long,
    val investments: Long,
)

data class PersonalNotificationPreferences(
    val goalAlertsEnabled: Boolean = true,
    val payableAlertsEnabled: Boolean = true,
)

data class PersonalAlert(
    val id: String,
    val source: AlertSource,
    val tone: AlertTone,
    val urgency: AlertUrgency,
    val title: String,
    val description: String,
    val dateKey: String,
    val read: Boolean,
)

data class PersonalPlatformSnapshot(
    val profile: PersonalProfile,
    val notificationPreferences: PersonalNotificationPreferences,
    val alerts: List<PersonalAlert>,
    val unreadAlertCount: Int,
    val todayKey: String,
)

sealed interface PersonalPlatformState {
    data object Idle : PersonalPlatformState
    data class Loading(val previous: PersonalPlatformSnapshot? = null) : PersonalPlatformState
    data class Ready(val snapshot: PersonalPlatformSnapshot) : PersonalPlatformState
    data class Failure(
        val message: String,
        val previous: PersonalPlatformSnapshot? = null,
    ) : PersonalPlatformState
}

sealed interface PersonalPlatformResult {
    data object Success : PersonalPlatformResult
    data class Failure(val message: String) : PersonalPlatformResult
}

data class PersonalClientPreferences(
    val dateFormat: String = "MMM d, yyyy",
    val compactMode: Boolean = false,
    val themeMode: String = "system",
)

sealed interface BackupExportResult {
    data class Success(
        val fileName: String,
        val contents: String,
        val recordCount: Int,
    ) : BackupExportResult

    data class Failure(val message: String) : BackupExportResult
}

sealed interface BackupImportResult {
    data class Success(
        val alreadyImported: Boolean,
        val totalAdded: Int,
        val added: Map<String, Int>,
        val skipped: Map<String, Int>,
    ) : BackupImportResult

    data class Failure(val message: String) : BackupImportResult
}

sealed interface BackupValidationResult {
    data class Valid(
        val payload: JsonObject,
        val recordCount: Int,
    ) : BackupValidationResult

    data class Invalid(val message: String) : BackupValidationResult
}

@Serializable
internal data class AuthUserPayload(
    val id: String,
    val email: String? = null,
    @SerialName("user_metadata") val userMetadata: JsonObject = JsonObject(emptyMap()),
)

@Serializable
internal data class ProfileRow(
    val id: String,
    @SerialName("preferred_currency") val preferredCurrency: String? = null,
)

@Serializable
internal data class SetupCountsRow(
    val accounts: Long = 0,
    @SerialName("income_transactions") val incomeTransactions: Long = 0,
    @SerialName("expense_transactions") val expenseTransactions: Long = 0,
    @SerialName("income_categories") val incomeCategories: Long = 0,
    @SerialName("expense_categories") val expenseCategories: Long = 0,
    val goals: Long = 0,
    val investments: Long = 0,
)

@Serializable
internal data class NotificationPreferencesRow(
    @SerialName("user_id") val userId: String? = null,
    @SerialName("goal_alerts_enabled") val goalAlertsEnabled: Boolean = true,
    @SerialName("payable_alerts_enabled") val payableAlertsEnabled: Boolean = true,
)

@Serializable
internal data class NotificationStateRow(
    @SerialName("notification_id") val notificationId: String,
    @SerialName("read_at") val readAt: String? = null,
    @SerialName("dismissed_at") val dismissedAt: String? = null,
    @SerialName("snoozed_until") val snoozedUntil: String? = null,
)

@Serializable
internal data class PayableAlertRow(
    val id: String,
    @SerialName("person_name") val personName: String,
    @SerialName("item_name") val itemName: String? = null,
    val reason: String? = null,
    @SerialName("remaining_amount") val remainingAmount: Double? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val status: String? = null,
)

@Serializable
internal data class GoalAlertRow(
    val id: String,
    val name: String,
    @SerialName("target_amount") val targetAmount: Double? = null,
    @SerialName("current_amount") val currentAmount: Double? = null,
    val deadline: String? = null,
)

fun validatePersonalDisplayName(value: String): String? {
    val normalized = value.replace(Regex("\\s+"), " ").trim()
    return when {
        normalized.length < 2 -> "Display name must be at least 2 characters."
        normalized.length > 80 -> "Display name must be 80 characters or fewer."
        normalized.any { it.code < 32 } -> "Display name contains unsupported characters."
        else -> null
    }
}

fun normalizePersonalDisplayName(value: String): String =
    value.replace(Regex("\\s+"), " ").trim()

fun validatePersonalPassword(value: String): String? = when {
    value.length < 8 -> "Password must be at least 8 characters."
    value.length > 128 -> "Password is too long."
    value.none(Char::isLetter) -> "Password must include at least one letter."
    value.none(Char::isDigit) -> "Password must include at least one number."
    else -> null
}

fun validateBackupPayload(raw: String, json: Json = defaultPersonalJson()): BackupValidationResult {
    val byteSize = raw.encodeToByteArray().size
    if (byteSize <= 0) return BackupValidationResult.Invalid("This backup file is empty.")
    if (byteSize > MAX_FINANCE_BACKUP_BYTES) {
        return BackupValidationResult.Invalid("This backup is too large to import safely.")
    }

    val payload = runCatching { json.parseToJsonElement(raw).jsonObject }.getOrNull()
        ?: return BackupValidationResult.Invalid("This backup file is invalid or damaged.")

    if (payload["format"]?.jsonPrimitive?.contentOrNull != "jamals-finance-backup") {
        return BackupValidationResult.Invalid("This is not a Jamal's Finance backup.")
    }
    if (payload["version"]?.jsonPrimitive?.intOrNull != 1) {
        return BackupValidationResult.Invalid("This backup version is not supported.")
    }
    if (payload["backupId"]?.jsonPrimitive?.contentOrNull.isNullOrBlank()) {
        return BackupValidationResult.Invalid("Backup identity is missing.")
    }
    val ownerId = runCatching { payload["source"]?.jsonObject?.get("ownerId")?.jsonPrimitive?.contentOrNull }.getOrNull()
    if (ownerId.isNullOrBlank()) {
        return BackupValidationResult.Invalid("Backup owner identity is missing.")
    }

    val data = payload["data"] as? JsonObject
        ?: return BackupValidationResult.Invalid("Backup data is missing.")
    val requiredSections = listOf(
        "accounts",
        "categories",
        "investments",
        "goals",
        "liabilities",
        "goalContributions",
        "transactions",
        "accountTransfers",
        "liabilityPayments",
        "investmentWithdrawals",
    )

    var count = 0
    for (section in requiredSections) {
        val records = runCatching { data.getValue(section).jsonArray }.getOrNull()
            ?: return BackupValidationResult.Invalid("Backup section $section is invalid.")
        count += records.size
        if (count > MAX_FINANCE_BACKUP_RECORDS) {
            return BackupValidationResult.Invalid("This backup contains too many records.")
        }
    }
    return BackupValidationResult.Valid(payload, count)
}

fun backupRecordCount(payload: JsonObject): Int {
    val data = payload["data"] as? JsonObject ?: return 0
    return listOf(
        "accounts",
        "categories",
        "investments",
        "goals",
        "liabilities",
        "goalContributions",
        "transactions",
        "accountTransfers",
        "liabilityPayments",
        "investmentWithdrawals",
    ).sumOf { key -> runCatching { data.getValue(key).jsonArray.size }.getOrDefault(0) }
}

internal fun defaultPersonalJson(pretty: Boolean = false): Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
    prettyPrint = pretty
}

internal fun JsonElement?.stringOrNull(): String? =
    this?.let { runCatching { it.jsonPrimitive.contentOrNull }.getOrNull() }

internal fun JsonObject.intMap(): Map<String, Int> =
    entries.mapNotNull { (key, value) ->
        value.jsonPrimitive.intOrNull?.let { key to it }
    }.toMap()
