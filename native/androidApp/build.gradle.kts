import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
}

fun loadProperties(path: String): Properties = Properties().apply {
    val file = rootProject.file(path)
    if (file.exists()) file.inputStream().use(::load)
}

val publicProperties = loadProperties("public.properties")
val localProperties = loadProperties("local.properties")

fun clientConfig(name: String): String =
    providers.gradleProperty(name).orNull
        ?: localProperties.getProperty(name)
        ?: publicProperties.getProperty(name)
        ?: ""

android {
    namespace = "com.jamalsfinance.nativeapp"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jamalsfinance.app.native.dev"
        minSdk = 23
        targetSdk = 36
        versionCode = 8
        versionName = "0.8.0-adaptive-accessibility"

        buildConfigField(
            "String",
            "SUPABASE_URL",
            "\"${clientConfig("JAMALS_SUPABASE_URL")}\"",
        )
        buildConfigField(
            "String",
            "SUPABASE_PUBLISHABLE_KEY",
            "\"${clientConfig("JAMALS_SUPABASE_PUBLISHABLE_KEY")}\"",
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.kotlinx.serialization.json)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.compose)
    debugImplementation(libs.compose.ui.tooling)
}
