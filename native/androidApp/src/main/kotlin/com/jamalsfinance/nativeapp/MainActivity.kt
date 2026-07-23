package com.jamalsfinance.nativeapp

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.jamalsfinance.nativeapp.security.AndroidKeystoreSessionStore
import com.jamalsfinance.nativeapp.ui.AndroidNativePreferences
import com.jamalsfinance.nativeapp.ui.JamalsFinanceNativeApp
import com.jamalsfinance.shared.auth.SupabaseAuthRepository
import com.jamalsfinance.shared.core.AppConfig
import com.jamalsfinance.shared.finance.SupabaseFinanceRepository
import com.jamalsfinance.shared.goals.SupabaseGoalsPayablesRepository
import com.jamalsfinance.shared.investments.SupabaseInvestmentsAnalyticsRepository
import com.jamalsfinance.shared.network.platformHttpClient
import com.jamalsfinance.shared.personal.SupabasePersonalPlatformRepository
import com.jamalsfinance.shared.reports.SupabaseReportsInsightsRepository

private data class NativeRepositories(
    val auth: SupabaseAuthRepository,
    val finance: SupabaseFinanceRepository,
    val goalsPayables: SupabaseGoalsPayablesRepository,
    val investmentsAnalytics: SupabaseInvestmentsAnalyticsRepository,
    val reportsInsights: SupabaseReportsInsightsRepository,
    val personalPlatform: SupabasePersonalPlatformRepository,
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val nativePreferences = AndroidNativePreferences(applicationContext)
        setSecureWindow(nativePreferences.state.value.blockScreenshots)
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
                reportsInsights = SupabaseReportsInsightsRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                ),
                personalPlatform = SupabasePersonalPlatformRepository(
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
                reportsInsightsRepository = repositories?.reportsInsights,
                personalPlatformRepository = repositories?.personalPlatform,
                nativePreferences = nativePreferences,
                onSecureWindowChanged = ::setSecureWindow,
            )
        }
    }

    private fun setSecureWindow(enabled: Boolean) {
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
