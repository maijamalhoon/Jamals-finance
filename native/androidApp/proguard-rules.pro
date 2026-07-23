# Jamal's Finance native release hardening.
# Keep runtime metadata required by Kotlin, serializers and HTTP model decoding.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Kotlin serialization generates explicit serializer classes. Preserve their
# members so R8 cannot remove serializers reached through generated companions.
-keepclassmembers class **$$serializer { *; }
-keepclassmembers class **$Companion { *; }

# Keep enum value arrays used by Kotlin enumEntries()/valueOf() paths.
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Preserve source and line information for actionable release crash reports.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
