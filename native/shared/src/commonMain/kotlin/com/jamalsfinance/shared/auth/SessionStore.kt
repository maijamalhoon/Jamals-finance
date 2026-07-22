package com.jamalsfinance.shared.auth

interface SessionStore {
    suspend fun read(): AuthSession?
    suspend fun write(session: AuthSession)
    suspend fun clear()
}

class InMemorySessionStore : SessionStore {
    private var session: AuthSession? = null

    override suspend fun read(): AuthSession? = session

    override suspend fun write(session: AuthSession) {
        this.session = session
    }

    override suspend fun clear() {
        session = null
    }
}
