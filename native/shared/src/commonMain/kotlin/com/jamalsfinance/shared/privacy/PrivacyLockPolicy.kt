package com.jamalsfinance.shared.privacy

enum class PrivacyLockTimeout(
    val storageValue: String,
    val durationMillis: Long,
    val label: String,
) {
    Immediate("immediate", 0L, "Immediately"),
    OneMinute("one-minute", 60_000L, "After 1 minute"),
    FiveMinutes("five-minutes", 5 * 60_000L, "After 5 minutes"),
    FifteenMinutes("fifteen-minutes", 15 * 60_000L, "After 15 minutes"),
    ThirtyMinutes("thirty-minutes", 30 * 60_000L, "After 30 minutes");

    companion object {
        fun fromStorage(value: String?): PrivacyLockTimeout =
            entries.firstOrNull { it.storageValue == value } ?: Immediate
    }
}

data class PrivacyLockSettings(
    val enabled: Boolean = false,
    val timeout: PrivacyLockTimeout = PrivacyLockTimeout.Immediate,
)

fun shouldRequirePrivacyUnlock(
    settings: PrivacyLockSettings,
    lastBackgroundAtMillis: Long?,
    nowMillis: Long,
): Boolean {
    if (!settings.enabled) return false
    if (lastBackgroundAtMillis == null) return true
    if (lastBackgroundAtMillis < 0L || nowMillis < lastBackgroundAtMillis) return true
    return nowMillis - lastBackgroundAtMillis >= settings.timeout.durationMillis
}
