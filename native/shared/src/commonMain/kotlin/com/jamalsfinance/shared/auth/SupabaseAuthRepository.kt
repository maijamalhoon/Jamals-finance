package com.jamalsfinance.shared.auth

import com.jamalsfinance.shared.core.AppConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class SupabaseAuthRepository(
    baseClient: HttpClient,
    private val config: AppConfig,
    private val sessionStore: SessionStore,
) : AuthRepository {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val client = baseClient.config {
        expectSuccess = false
        install(ContentNegotiation) {
            json(json)
        }
    }

    private val mutableState = MutableStateFlow<AuthState>(AuthState.Restoring)
    override val state: StateFlow<AuthState> = mutableState.asStateFlow()

    override suspend fun restoreSession() {
        val stored = sessionStore.read()
        if (stored == null) {
            mutableState.value = AuthState.SignedOut
            return
        }

        val refreshed = requestSession(
            path = "/auth/v1/token?grant_type=refresh_token",
            body = RefreshCredentials(stored.refreshToken),
        )

        if (refreshed is AuthResult.Success) {
            persist(refreshed.session)
        } else {
            sessionStore.clear()
            mutableState.value = AuthState.SignedOut
        }
    }

    override suspend fun signIn(email: String, password: String): AuthResult {
        val validation = validate(email, password)
        if (validation != null) return AuthResult.Failure(validation)

        val result = requestSession(
            path = "/auth/v1/token?grant_type=password",
            body = AuthCredentials(email.trim(), password),
        )
        if (result is AuthResult.Success) persist(result.session)
        return result
    }

    override suspend fun signUp(email: String, password: String): AuthResult {
        val validation = validate(email, password)
        if (validation != null) return AuthResult.Failure(validation)

        return runCatching {
            val response = client.post("${config.normalizedSupabaseUrl}/auth/v1/signup") {
                supabaseHeaders()
                setBody(AuthCredentials(email.trim(), password))
            }

            if (!response.status.isSuccess()) {
                return AuthResult.Failure(response.errorMessage())
            }

            val raw = response.bodyAsText()
            val session = runCatching { json.decodeFromString<AuthSession>(raw) }.getOrNull()
            if (session != null) {
                persist(session)
                AuthResult.Success(session)
            } else {
                val payload = runCatching { json.decodeFromString<SignUpResponse>(raw) }.getOrNull()
                AuthResult.ConfirmationRequired(payload?.user?.email ?: email.trim())
            }
        }.getOrElse { error ->
            AuthResult.Failure(error.safeMessage())
        }
    }

    override suspend fun signOut() {
        val current = (mutableState.value as? AuthState.SignedIn)?.session
        if (current != null) {
            runCatching {
                client.post("${config.normalizedSupabaseUrl}/auth/v1/logout") {
                    supabaseHeaders()
                    bearerAuth(current.accessToken)
                }
            }
        }
        sessionStore.clear()
        mutableState.value = AuthState.SignedOut
    }

    private suspend inline fun <reified T : Any> requestSession(path: String, body: T): AuthResult = runCatching {
        val response = client.post("${config.normalizedSupabaseUrl}$path") {
            supabaseHeaders()
            setBody(body)
        }
        if (!response.status.isSuccess()) {
            return AuthResult.Failure(response.errorMessage())
        }
        AuthResult.Success(response.body<AuthSession>())
    }.getOrElse { error ->
        AuthResult.Failure(error.safeMessage())
    }

    private suspend fun persist(session: AuthSession) {
        sessionStore.write(session)
        mutableState.value = AuthState.SignedIn(session)
    }

    private fun validate(email: String, password: String): String? = when {
        email.isBlank() || '@' !in email -> "Enter a valid email address."
        password.length < 6 -> "Password must be at least 6 characters."
        else -> null
    }

    private fun io.ktor.client.request.HttpRequestBuilder.supabaseHeaders() {
        header("apikey", config.supabasePublishableKey)
        header(HttpHeaders.ContentType, ContentType.Application.Json)
    }

    private suspend fun io.ktor.client.statement.HttpResponse.errorMessage(): String {
        val raw = bodyAsText()
        return runCatching {
            val error = json.decodeFromString<SupabaseError>(raw)
            error.message ?: error.msg ?: error.description ?: "Authentication failed."
        }.getOrDefault("Authentication failed.")
    }

    private fun Throwable.safeMessage(): String =
        message?.takeIf { it.isNotBlank() } ?: "A secure connection could not be completed."

    @Serializable
    private data class SupabaseError(
        val msg: String? = null,
        val message: String? = null,
        @SerialName("error_description") val description: String? = null,
    )
}
