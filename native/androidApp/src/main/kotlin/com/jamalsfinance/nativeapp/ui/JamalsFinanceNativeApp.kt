package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthResult
import com.jamalsfinance.shared.auth.AuthState
import kotlinx.coroutines.launch

@Composable
fun JamalsFinanceNativeApp(repository: AuthRepository?) {
    JamalsFinanceTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            if (repository == null) {
                ConfigurationRequired()
            } else {
                val state by repository.state.collectAsStateWithLifecycle()
                LaunchedEffect(repository) { repository.restoreSession() }
                when (val current = state) {
                    AuthState.Restoring -> CenteredProgress()
                    AuthState.SignedOut -> LoginScreen(repository)
                    is AuthState.SignedIn -> NativeDashboardShell(
                        email = current.session.user.email ?: "Signed in",
                        onSignOut = { repository.signOut() },
                    )
                    is AuthState.Failure -> LoginScreen(repository, current.message)
                }
            }
        }
    }
}

@Composable
private fun LoginScreen(repository: AuthRepository, initialMessage: String? = null) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf(initialMessage) }

    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Jamal's Finance", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Native security foundation",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(28.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
            message?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = MaterialTheme.colorScheme.error)
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        message = when (val result = repository.signIn(email, password)) {
                            is AuthResult.Success -> null
                            is AuthResult.ConfirmationRequired -> "Confirm ${result.email} first."
                            is AuthResult.Failure -> result.message
                        }
                        loading = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !loading,
                shape = RoundedCornerShape(16.dp),
            ) {
                if (loading) CircularProgressIndicator(strokeWidth = 2.dp)
                else Text("Sign in")
            }
            TextButton(
                onClick = {
                    scope.launch {
                        loading = true
                        message = when (val result = repository.signUp(email, password)) {
                            is AuthResult.Success -> null
                            is AuthResult.ConfirmationRequired ->
                                "Confirmation email sent to ${result.email}."
                            is AuthResult.Failure -> result.message
                        }
                        loading = false
                    }
                },
                modifier = Modifier.align(Alignment.CenterHorizontally),
                enabled = !loading,
            ) {
                Text("Create account")
            }
        }
    }
}

@Composable
private fun NativeDashboardShell(email: String, onSignOut: suspend () -> Unit) {
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("Native session active", style = MaterialTheme.typography.headlineSmall)
        Text(email, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(18.dp))
        Text(
            "Chrome, WebView and website rendering are not used in this application.",
            style = MaterialTheme.typography.bodyLarge,
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = { scope.launch { onSignOut() } }) {
            Text("Sign out")
        }
    }
}

@Composable
private fun ConfigurationRequired() {
    Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) {
        Text(
            "Native configuration is missing. Add JAMALS_SUPABASE_URL and " +
                "JAMALS_SUPABASE_PUBLISHABLE_KEY to native/local.properties.",
        )
    }
}

@Composable
private fun CenteredProgress() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
