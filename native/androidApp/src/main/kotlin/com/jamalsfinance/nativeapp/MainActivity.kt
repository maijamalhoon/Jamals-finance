package com.jamalsfinance.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.jamalsfinance.nativeapp.security.AndroidKeystoreSessionStore
import com.jamalsfinance.nativeapp.ui.JamalsFinanceNativeApp
import com.jamalsfinance.shared.auth.SupabaseAuthRepository
import com.jamalsfinance.shared.core.AppConfig
import com.jamalsfinance.shared.network.platformHttpClient

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repository = if (
            BuildConfig.SUPABASE_URL.isNotBlank() &&
            BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()
        ) {
            SupabaseAuthRepository(
                baseClient = platformHttpClient(),
                config = AppConfig(
                    supabaseUrl = BuildConfig.SUPABASE_URL,
                    supabasePublishableKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY,
                ),
                sessionStore = AndroidKeystoreSessionStore(applicationContext),
            )
        } else {
            null
        }

        setContent {
            JamalsFinanceNativeApp(repository)
        }
    }
}
