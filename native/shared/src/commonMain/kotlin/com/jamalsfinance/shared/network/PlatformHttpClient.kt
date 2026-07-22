package com.jamalsfinance.shared.network

import io.ktor.client.HttpClient

expect fun platformHttpClient(): HttpClient
