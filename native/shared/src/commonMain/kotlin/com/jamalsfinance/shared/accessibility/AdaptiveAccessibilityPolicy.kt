package com.jamalsfinance.shared.accessibility

enum class PersonalAdaptiveLayout {
    SingleColumn,
    TwoColumn,
}

/**
 * Keeps large text readable by preferring one column even on wider screens.
 * Two columns are reserved for tablet-sized windows with standard text scaling.
 */
fun selectPersonalAdaptiveLayout(
    widthDp: Int,
    fontScale: Float,
): PersonalAdaptiveLayout = when {
    widthDp < 720 -> PersonalAdaptiveLayout.SingleColumn
    fontScale > 1.25f -> PersonalAdaptiveLayout.SingleColumn
    else -> PersonalAdaptiveLayout.TwoColumn
}

fun personalHorizontalPaddingDp(widthDp: Int): Int = when {
    widthDp >= 1_200 -> 40
    widthDp >= 720 -> 28
    else -> 18
}
