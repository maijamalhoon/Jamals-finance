package com.jamalsfinance.shared.accessibility

import kotlin.test.Test
import kotlin.test.assertEquals

class AdaptiveAccessibilityPolicyTest {
    @Test
    fun phoneWidthUsesSingleColumn() {
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 412, fontScale = 1f),
        )
    }

    @Test
    fun tabletWidthUsesTwoColumnsAtStandardScale() {
        assertEquals(
            PersonalAdaptiveLayout.TwoColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = 1f),
        )
    }

    @Test
    fun largeTextForcesSingleColumnOnTablet() {
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = 1.3f),
        )
    }

    @Test
    fun paddingScalesWithWindowWidth() {
        assertEquals(18, personalHorizontalPaddingDp(400))
        assertEquals(28, personalHorizontalPaddingDp(800))
        assertEquals(40, personalHorizontalPaddingDp(1_280))
    }
}
