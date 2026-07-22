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
    background = Color(0xFFF3F6FA),
    surface = Color(0xFFF3F6FA),
    onBackground = Color(0xFF111827),
    onSurface = Color(0xFF111827),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF8CB7FF),
    background = Color(0xFF07111F),
    surface = Color(0xFF07111F),
)

@Composable
fun JamalsFinanceTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
