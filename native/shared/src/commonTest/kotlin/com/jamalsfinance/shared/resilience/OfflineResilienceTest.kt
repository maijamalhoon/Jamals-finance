package com.jamalsfinance.shared.resilience

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OfflineResilienceTest {
    @Test
    fun recentCacheIsAccepted() {
        val now = 1_000_000L
        assertTrue(shouldUseOfflineSnapshot(now - 1_000L, now, maxAgeMillis = 5_000L))
    }

    @Test
    fun expiredCacheIsRejected() {
        val now = 1_000_000L
        assertFalse(shouldUseOfflineSnapshot(now - 6_000L, now, maxAgeMillis = 5_000L))
    }

    @Test
    fun futureCacheTimestampFailsClosed() {
        assertFalse(shouldUseOfflineSnapshot(savedAtMillis = 2_000L, nowMillis = 1_000L))
    }

    @Test
    fun freshSnapshotSkipsDuplicateRefresh() {
        val now = 50_000L
        assertFalse(shouldRefreshSnapshot(now - 1_000L, now, freshnessMillis = 5_000L))
    }

    @Test
    fun staleSnapshotRequiresRefresh() {
        val now = 50_000L
        assertTrue(shouldRefreshSnapshot(now - 6_000L, now, freshnessMillis = 5_000L))
    }

    @Test
    fun clockRollbackRequiresRefresh() {
        assertTrue(shouldRefreshSnapshot(lastSuccessfulAtMillis = 2_000L, nowMillis = 1_000L))
    }
}
