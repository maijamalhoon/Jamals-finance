package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF07365F),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD8E9FF),
    onPrimaryContainer = Color(0xFF071E32),
    secondary = Color(0xFF2B5C86),
    background = Color(0xFFF3F6FA),
    surface = Color(0xFFF3F6FA),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF7F9FC),
    onBackground = Color(0xFF111827),
    onSurface = Color(0xFF111827),
    onSurfaceVariant = Color(0xFF5B6472),
    outlineVariant = Color(0xFFDDE3EA),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF8CB7FF),
    onPrimary = Color(0xFF002E51),
    primaryContainer = Color(0xFF123E61),
    onPrimaryContainer = Color(0xFFD8E9FF),
    secondary = Color(0xFFA9C8EA),
    background = Color(0xFF07111F),
    surface = Color(0xFF07111F),
    surfaceContainer = Color(0xFF101C2C),
    surfaceContainerLow = Color(0xFF0B1726),
    onBackground = Color(0xFFF2F5F9),
    onSurface = Color(0xFFF2F5F9),
    onSurfaceVariant = Color(0xFFB7C1CE),
    outlineVariant = Color(0xFF26374A),
)

@Composable
fun JamalsFinanceTheme(
    themeMode: NativeThemeMode = NativeThemeMode.System,
    content: @Composable () -> Unit,
) {
    val dark = when (themeMode) {
        NativeThemeMode.System -> isSystemInDarkTheme()
        NativeThemeMode.Light -> false
        NativeThemeMode.Dark -> true
    }
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        content = content,
    )
}
