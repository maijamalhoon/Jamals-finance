package com.jamalsfinance.shared.auth

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthUser(
    val id: String,
    val email: String? = null,
)

@Serializable
data class AuthSession(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_in") val expiresInSeconds: Long,
    @SerialName("token_type") val tokenType: String = "bearer",
    val user: AuthUser,
)

@Serializable
data class AuthCredentials(
    val email: String,
    val password: String,
)

@Serializable
data class RefreshCredentials(
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class SignUpResponse(
    val user: AuthUser? = null,
    val session: AuthSession? = null,
)

sealed interface AuthState {
    data object Restoring : AuthState
    data object SignedOut : AuthState
    data class SignedIn(val session: AuthSession) : AuthState
    data class Failure(val message: String) : AuthState
}

sealed interface AuthResult {
    data class Success(val session: AuthSession) : AuthResult
    data class ConfirmationRequired(val email: String) : AuthResult
    data class Failure(val message: String) : AuthResult
}
