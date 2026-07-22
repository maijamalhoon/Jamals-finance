package com.jamalsfinance.shared.auth

import kotlin.test.Test
import kotlin.test.assertEquals

class AuthValidationTest {
    @Test
    fun inMemoryStoreRoundTripsSession() = kotlinx.coroutines.test.runTest {
        val store = InMemorySessionStore()
        val session = AuthSession(
            accessToken = "access",
            refreshToken = "refresh",
            expiresInSeconds = 3600,
            user = AuthUser(id = "user-1", email = "user@example.com"),
        )

        store.write(session)
        assertEquals(session, store.read())
        store.clear()
        assertEquals(null, store.read())
    }
}
