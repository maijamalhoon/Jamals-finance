package com.jamalsfinance.shared.personal

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PersonalPlatformModelsTest {
    @Test
    fun profileAndPasswordValidationMatchesNativeSecurityRules() {
        assertNull(validatePersonalDisplayName("  Jamal   Yaqoob  "))
        assertEquals("Jamal Yaqoob", normalizePersonalDisplayName("  Jamal   Yaqoob  "))
        assertTrue(validatePersonalDisplayName("J")!!.contains("2 characters"))
        assertNull(validatePersonalPassword("Finance2026"))
        assertTrue(validatePersonalPassword("password")!!.contains("number"))
        assertTrue(validatePersonalPassword("12345678")!!.contains("letter"))
    }

    @Test
    fun civilDateArithmeticHandlesLeapYearsAndYearBoundaries() {
        assertEquals("2024-02-29", addDays("2024-02-28", 1))
        assertEquals("2024-03-01", addDays("2024-02-28", 2))
        assertEquals("2027-01-01", addDays("2026-12-31", 1))
        assertTrue(isDateKey("2026-07-23"))
        assertTrue(!isDateKey("2026-02-29"))
    }

    @Test
    fun alertsMatchWebsiteUrgencyOrderingAndPersistenceRules() {
        val payables = listOf(
            PayableAlertRow(
                id = "late",
                personName = "Supplier",
                remainingAmount = 500.0,
                dueDate = "2026-07-20",
                status = "partial",
            ),
            PayableAlertRow(
                id = "soon",
                personName = "Friend",
                remainingAmount = 100.0,
                dueDate = "2026-07-25",
                status = "pending",
            ),
        )
        val goals = listOf(
            GoalAlertRow(
                id = "today",
                name = "Emergency fund",
                targetAmount = 1000.0,
                currentAmount = 400.0,
                deadline = "2026-07-23",
            ),
            GoalAlertRow(
                id = "dismissed",
                name = "Travel",
                targetAmount = 1000.0,
                currentAmount = 100.0,
                deadline = "2026-07-24",
            ),
        )
        val states = listOf(
            NotificationStateRow(
                notificationId = "payable:late:due",
                readAt = "2026-07-22T10:00:00Z",
            ),
            NotificationStateRow(
                notificationId = "goal:dismissed:deadline",
                dismissedAt = "2026-07-22T10:00:00Z",
            ),
        )

        val alerts = derivePersonalAlerts(
            todayKey = "2026-07-23",
            payables = payables,
            goals = goals,
            states = states,
        )

        assertEquals(
            listOf(
                "payable:late:due",
                "goal:today:deadline",
                "payable:soon:due",
            ),
            alerts.map(PersonalAlert::id),
        )
        assertTrue(alerts.first().read)
        assertEquals(AlertTone.Danger, alerts.first().tone)
        assertEquals(AlertUrgency.DueToday, alerts[1].urgency)
    }

    @Test
    fun backupValidationRequiresAllPersonalFinanceSections() {
        val raw = """
            {
              "format": "jamals-finance-backup",
              "version": 1,
              "backupId": "11111111-1111-1111-1111-111111111111",
              "source": {
                "ownerId": "22222222-2222-2222-2222-222222222222",
                "app": "jamals-finance"
              },
              "data": {
                "accounts": [{"id":"1"}],
                "categories": [],
                "investments": [],
                "goals": [],
                "liabilities": [],
                "goalContributions": [],
                "transactions": [{"id":"2"}],
                "accountTransfers": [],
                "liabilityPayments": [],
                "investmentWithdrawals": []
              }
            }
        """.trimIndent()

        val valid = assertIs<BackupValidationResult.Valid>(validateBackupPayload(raw))
        assertEquals(2, valid.recordCount)

        val invalid = assertIs<BackupValidationResult.Invalid>(
            validateBackupPayload(raw.replace("\"transactions\": [{\"id\":\"2\"}],", "")),
        )
        assertTrue(invalid.message.contains("transactions"))
    }
}
