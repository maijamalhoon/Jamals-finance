package com.jamalsfinance.nativeapp

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.jamalsfinance.nativeapp.resilience.AndroidEncryptedSnapshotStore
import com.jamalsfinance.nativeapp.resilience.AndroidNetworkMonitor
import com.jamalsfinance.nativeapp.resilience.ResilientFinanceRepository
import com.jamalsfinance.nativeapp.resilience.ResilientGoalsPayablesRepository
import com.jamalsfinance.nativeapp.resilience.ResilientInvestmentsAnalyticsRepository
import com.jamalsfinance.nativeapp.security.AndroidKeystoreSessionStore
import com.jamalsfinance.nativeapp.ui.AndroidNativePreferences
import com.jamalsfinance.nativeapp.ui.JamalsFinanceNativeApp
import com.jamalsfinance.shared.auth.SupabaseAuthRepository
import com.jamalsfinance.shared.core.AppConfig
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.finance.SupabaseFinanceRepository
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.goals.SupabaseGoalsPayablesRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.SupabaseInvestmentsAnalyticsRepository
import com.jamalsfinance.shared.network.platformHttpClient
import com.jamalsfinance.shared.personal.SupabasePersonalPlatformRepository
import com.jamalsfinance.shared.reports.SupabaseReportsInsightsRepository

private data class NativeRepositories(
    val auth: SupabaseAuthRepository,
    val finance: FinanceRepository,
    val goalsPayables: GoalsPayablesRepository,
    val investmentsAnalytics: InvestmentsAnalyticsRepository,
    val reportsInsights: SupabaseReportsInsightsRepository,
    val personalPlatform: SupabasePersonalPlatformRepository,
)

class MainActivity : ComponentActivity() {
    private var activeNetworkMonitor: AndroidNetworkMonitor? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val nativePreferences = AndroidNativePreferences(applicationContext)
        val networkMonitor = AndroidNetworkMonitor(applicationContext).also {
            activeNetworkMonitor = it
        }
        val snapshotStore = AndroidEncryptedSnapshotStore(applicationContext)
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
            val financeDelegate = SupabaseFinanceRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            val goalsDelegate = SupabaseGoalsPayablesRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            val investmentsDelegate = SupabaseInvestmentsAnalyticsRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            NativeRepositories(
                auth = authRepository,
                finance = ResilientFinanceRepository(
                    delegate = financeDelegate,
                    authRepository = authRepository,
                    store = snapshotStore,
                    network = networkMonitor,
                ),
                goalsPayables = ResilientGoalsPayablesRepository(
                    delegate = goalsDelegate,
                    authRepository = authRepository,
                    store = snapshotStore,
                    network = networkMonitor,
                ),
                investmentsAnalytics = ResilientInvestmentsAnalyticsRepository(
                    delegate = investmentsDelegate,
                    authRepository = authRepository,
                    store = snapshotStore,
                    network = networkMonitor,
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
                networkMonitor = networkMonitor,
                onSecureWindowChanged = ::setSecureWindow,
            )
        }
    }

    override fun onDestroy() {
        activeNetworkMonitor?.close()
        activeNetworkMonitor = null
        super.onDestroy()
    }

    private fun setSecureWindow(enabled: Boolean) {
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
