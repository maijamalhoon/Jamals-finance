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

private val LightHighContrastColors = LightColors.copy(
    background = Color.White,
    surface = Color.White,
    surfaceContainer = Color(0xFFF4F6F9),
    surfaceContainerLow = Color.White,
    onBackground = Color.Black,
    onSurface = Color.Black,
    onSurfaceVariant = Color(0xFF283241),
    outline = Color(0xFF263547),
    outlineVariant = Color(0xFF6C7888),
)

private val DarkHighContrastColors = DarkColors.copy(
    background = Color.Black,
    surface = Color.Black,
    surfaceContainer = Color(0xFF0A1422),
    surfaceContainerLow = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Color(0xFFE4EAF2),
    outline = Color(0xFFCBD6E5),
    outlineVariant = Color(0xFF8290A3),
)

@Composable
fun JamalsFinanceTheme(
    themeMode: NativeThemeMode = NativeThemeMode.System,
    highContrast: Boolean = false,
    content: @Composable () -> Unit,
) {
    val dark = when (themeMode) {
        NativeThemeMode.System -> isSystemInDarkTheme()
        NativeThemeMode.Light -> false
        NativeThemeMode.Dark -> true
    }
    val colors = when {
        dark && highContrast -> DarkHighContrastColors
        dark -> DarkColors
        highContrast -> LightHighContrastColors
        else -> LightColors
    }
    MaterialTheme(
        colorScheme = colors,
        content = content,
    )
}
