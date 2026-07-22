package com.jamalsfinance.shared.reports

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ReportsInsightsModelsTest {
    @Test
    fun reportPeriodsMatchWebsiteRanges() {
        assertEquals(
            ReportSelection(ReportPeriod.Week, "2026-07-17", "2026-07-23"),
            reportSelection(ReportPeriod.Week, "2026-07-23"),
        )
        assertEquals(
            ReportSelection(ReportPeriod.Month, "2026-07-01", "2026-07-23"),
            reportSelection(ReportPeriod.Month, "2026-07-23"),
        )
        assertEquals(
            ReportSelection(ReportPeriod.SixMonths, "2026-02-01", "2026-07-23"),
            reportSelection(ReportPeriod.SixMonths, "2026-07-23"),
        )
        assertEquals(
            ReportSelection(ReportPeriod.Year, "2026-01-01", "2026-07-23"),
            reportSelection(ReportPeriod.Year, "2026-07-23"),
        )
    }

    @Test
    fun customRangeRejectsFutureOrReversedDates() {
        assertFailsWith<IllegalArgumentException> {
            reportSelection(
                ReportPeriod.Custom,
                "2026-07-23",
                customStart = "2026-07-20",
                customEnd = "2026-07-24",
            )
        }
        assertFailsWith<IllegalArgumentException> {
            reportSelection(
                ReportPeriod.Custom,
                "2026-07-23",
                customStart = "2026-07-22",
                customEnd = "2026-07-20",
            )
        }
    }

    @Test
    fun refundsReduceExpensesAndCategoryTotals() {
        val selection = ReportSelection(
            ReportPeriod.Custom,
            "2026-07-01",
            "2026-07-31",
        )
        val rows = listOf(
            ReportTransaction(
                id = "income",
                type = "income",
                amount = 1_000.0,
                date = "2026-07-02",
                categoryId = null,
                categoryName = "Salary",
                categoryColor = null,
                accountId = null,
                accountName = null,
                accountType = null,
                sourceName = "Employer",
                personName = null,
                itemName = null,
                note = null,
                reference = null,
                createdAt = null,
            ),
            ReportTransaction(
                id = "expense",
                type = "expense",
                amount = 400.0,
                date = "2026-07-03",
                categoryId = "food",
                categoryName = "Food",
                categoryColor = "#ef4444",
                accountId = null,
                accountName = null,
                accountType = null,
                sourceName = null,
                personName = null,
                itemName = "Dinner",
                note = null,
                reference = null,
                createdAt = null,
            ),
            ReportTransaction(
                id = "refund",
                type = "refund",
                amount = 100.0,
                date = "2026-07-04",
                categoryId = "food",
                categoryName = "Food",
                categoryColor = "#ef4444",
                accountId = null,
                accountName = null,
                accountType = null,
                sourceName = null,
                personName = null,
                itemName = "Refund",
                note = null,
                reference = null,
                createdAt = null,
            ),
        )

        assertEquals(1_000.0, sumReportTransactions(rows, selection, "income"))
        assertEquals(300.0, sumReportTransactions(rows, selection, "expense"))
        assertEquals(300.0, buildExpenseCategories(rows, selection).single().amount)
    }

    @Test
    fun csvEscapesUserTextAndConvertsCurrency() {
        val rows = listOf(
            ReportExportRow(
                id = "1",
                date = "2026-07-23",
                createdAt = "2026-07-23T10:00:00Z",
                type = "expense",
                category = "Food, Dining",
                account = "Main",
                amountPkr = 281.2,
                reference = "A\"1",
                note = "Lunch\nclient",
            ),
        )
        val csv = buildReportCsv(
            rows = rows,
            currency = "USD",
            rates = mapOf(
                "USD" to 1.0,
                "PKR" to 281.2,
                "INR" to 86.6,
                "EUR" to 0.92,
                "GBP" to 0.79,
                "JPY" to 149.5,
                "CNY" to 7.18,
            ),
        )

        assertTrue(csv.contains("\"Food, Dining\""))
        assertTrue(csv.contains("\"A\"\"1\""))
        assertTrue(csv.contains("\"Lunch\nclient\""))
        assertTrue(csv.contains(",1.0,USD,"))
    }

    @Test
    fun localInsightsRemainAvailableWithoutGemini() {
        val report = ReportSummary(
            selection = ReportSelection(ReportPeriod.Month, "2026-07-01", "2026-07-23"),
            rangeLabel = "1 Jul – 23 Jul 2026",
            totalIncome = 100_000.0,
            totalExpenses = 60_000.0,
            netResult = 40_000.0,
            inclusiveDays = 23,
            averageDailyIncome = 4_347.82,
            averageDailySpending = 2_608.69,
            incomeCount = 2,
            expenseCount = 8,
            refundCount = 1,
            transferCount = 2,
            transferVolume = 15_000.0,
            cashFlow = emptyList(),
            expenseCategories = listOf(
                ReportBreakdown("food", "Food", 25_000.0, 41.7, "#ef4444"),
            ),
            incomeSources = emptyList(),
            accountActivity = emptyList(),
            goals = ReportGoalSummary(1, 0, 100_000.0, 25_000.0),
            payables = ReportPayableSummary(1, 20_000.0, 5_000.0, 15_000.0, 0),
            investments = ReportInvestmentSummary(1, 50_000.0, 55_000.0, false),
            exportRows = emptyList(),
            partialAreas = emptyList(),
            financialDataAvailable = true,
        )

        val insights = buildLocalInsights(
            report,
            "PKR",
            mapOf(
                "USD" to 1.0,
                "PKR" to 281.2,
                "INR" to 86.6,
                "EUR" to 0.92,
                "GBP" to 0.79,
                "JPY" to 149.5,
                "CNY" to 7.18,
            ),
        )

        assertEquals(4, insights.insights.size)
        assertEquals(3, insights.suggestedActions.size)
        assertTrue(insights.healthScore in 25..95)
        assertTrue(!insights.aiAvailable)
    }
}
