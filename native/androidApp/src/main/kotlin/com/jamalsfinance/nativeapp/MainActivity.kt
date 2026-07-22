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
import com.jamalsfinance.shared.investments.SupabaseInvestmentsAnalyticsRepository
import com.jamalsfinance.shared.network.platformHttpClient

private data class NativeRepositories(
    val auth: SupabaseAuthRepository,
    val finance: SupabaseFinanceRepository,
    val goalsPayables: SupabaseGoalsPayablesRepository,
    val investmentsAnalytics: SupabaseInvestmentsAnalyticsRepository,
)

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
            NativeRepositories(
                auth = authRepository,
                finance = SupabaseFinanceRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                ),
                goalsPayables = SupabaseGoalsPayablesRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                ),
                investmentsAnalytics = SupabaseInvestmentsAnalyticsRepository(
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
                authRepository = repositories?.auth,
                financeRepository = repositories?.finance,
                goalsPayablesRepository = repositories?.goalsPayables,
                investmentsAnalyticsRepository = repositories?.investmentsAnalytics,
            )
        }
    }
}
