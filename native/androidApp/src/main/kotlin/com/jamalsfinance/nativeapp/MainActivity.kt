package com.jamalsfinance.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.jamalsfinance.nativeapp.security.AndroidKeystoreSessionStore
import com.jamalsfinance.nativeapp.ui.JamalsFinanceNativeApp
import com.jamalsfinance.shared.auth.SupabaseAuthRepository
import com.jamalsfinance.shared.core.AppConfig
import com.jamalsfinance.shared.finance.SupabaseFinanceRepository
import com.jamalsfinance.shared.goals.SupabaseGoalsPayablesRepository
import com.jamalsfinance.shared.network.platformHttpClient

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val configured = BuildConfig.SUPABASE_URL.isNotBlank() &&
            BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()

        val repositories = if (configured) {
            val config = AppConfig(
                supabaseUrl = BuildConfig.SUPABASE_URL,
                supabasePublishableKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY,
            )
            val baseClient = platformHttpClient()
            val authRepository = SupabaseAuthRepository(
                baseClient = baseClient,
                config = config,
                sessionStore = AndroidKeystoreSessionStore(applicationContext),
            )
            Triple(
                authRepository,
                SupabaseFinanceRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                ),
                SupabaseGoalsPayablesRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                ),
            )
        } else {
            null
        }

        setContent {
            JamalsFinanceNativeApp(
                authRepository = repositories?.first,
                financeRepository = repositories?.second,
                goalsPayablesRepository = repositories?.third,
            )
        }
    }
}
