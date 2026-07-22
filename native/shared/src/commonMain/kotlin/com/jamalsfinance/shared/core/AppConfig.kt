package com.jamalsfinance.shared.core

data class AppConfig(
    val supabaseUrl: String,
    val supabasePublishableKey: String,
) {
    init {
        require(supabaseUrl.startsWith("https://")) {
            "Supabase URL must use HTTPS."
        }
        require(supabasePublishableKey.isNotBlank()) {
            "Supabase publishable key is required."
        }
    }

    val normalizedSupabaseUrl: String = supabaseUrl.trimEnd('/')
}
