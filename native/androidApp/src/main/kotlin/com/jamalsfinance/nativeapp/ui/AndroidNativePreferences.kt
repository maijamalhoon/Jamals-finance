package com.jamalsfinance.nativeapp.ui

import android.content.Context
import com.jamalsfinance.shared.personal.PersonalClientPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class NativeThemeMode(val storageValue: String) {
    System("system"),
    Light("light"),
    Dark("dark");

    companion object {
        fun fromStorage(value: String?): NativeThemeMode =
            entries.firstOrNull { it.storageValue == value } ?: System
    }
}

enum class NativeDateFormat(val storageValue: String, val sample: String) {
    MonthFirst("MMM d, yyyy", "Jul 23, 2026"),
    DayFirst("dd MMM yyyy", "23 Jul 2026"),
    Iso("yyyy-MM-dd", "2026-07-23");

    companion object {
        fun fromStorage(value: String?): NativeDateFormat =
            entries.firstOrNull { it.storageValue == value } ?: MonthFirst
    }
}

data class NativeLocalPreferences(
    val themeMode: NativeThemeMode = NativeThemeMode.System,
    val dateFormat: NativeDateFormat = NativeDateFormat.MonthFirst,
    val compactMode: Boolean = false,
)

class AndroidNativePreferences(context: Context) {
    private val storage = context.applicationContext.getSharedPreferences(
        "jamals-finance-native-preferences",
        Context.MODE_PRIVATE,
    )
    private val mutableState = MutableStateFlow(read())
    val state: StateFlow<NativeLocalPreferences> = mutableState.asStateFlow()

    fun setThemeMode(value: NativeThemeMode) {
        storage.edit().putString(KEY_THEME, value.storageValue).apply()
        mutableState.value = mutableState.value.copy(themeMode = value)
    }

    fun setDateFormat(value: NativeDateFormat) {
        storage.edit().putString(KEY_DATE_FORMAT, value.storageValue).apply()
        mutableState.value = mutableState.value.copy(dateFormat = value)
    }

    fun setCompactMode(value: Boolean) {
        storage.edit().putBoolean(KEY_COMPACT, value).apply()
        mutableState.value = mutableState.value.copy(compactMode = value)
    }

    fun clientPreferences(): PersonalClientPreferences = state.value.let {
        PersonalClientPreferences(
            dateFormat = it.dateFormat.storageValue,
            compactMode = it.compactMode,
            themeMode = it.themeMode.storageValue,
        )
    }

    private fun read(): NativeLocalPreferences = NativeLocalPreferences(
        themeMode = NativeThemeMode.fromStorage(storage.getString(KEY_THEME, null)),
        dateFormat = NativeDateFormat.fromStorage(storage.getString(KEY_DATE_FORMAT, null)),
        compactMode = storage.getBoolean(KEY_COMPACT, false),
    )

    private companion object {
        const val KEY_THEME = "theme-mode"
        const val KEY_DATE_FORMAT = "date-format"
        const val KEY_COMPACT = "compact-mode"
    }
}
