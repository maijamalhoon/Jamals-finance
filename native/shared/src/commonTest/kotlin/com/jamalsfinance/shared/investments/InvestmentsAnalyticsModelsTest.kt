package com.jamalsfinance.shared.investments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InvestmentsAnalyticsModelsTest {
    @Test
    fun investmentPositionUsesPerUnitPrices() {
        val position = calculateInvestmentPosition(
            quantityValue = 2.0,
            purchasePriceValue = 50_000.0,
            currentPriceValue = 65_000.0,
        )
        assertNotNull(position)
        assertEquals(100_000.0, position.totalInvested)
        assertEquals(130_000.0, position.currentValue)
        assertEquals(30_000.0, position.totalPnl)
        assertEquals(30.0, position.totalPnlPct)
    }

    @Test
    fun invalidPositionIsRejected() {
        assertNull(calculateInvestmentPosition(-1.0, 10.0, 12.0))
        assertNull(calculateInvestmentPosition(1.0, Double.NaN, 12.0))
    }

    @Test
    fun repeatedPurchasesAggregateWithWeightedCost() {
        val rows = listOf(
            InvestmentRow(
                id = "one",
                name = "Bitcoin",
                type = "crypto",
                quantity = 1.0,
                purchasePrice = 50_000.0,
                currentPrice = 70_000.0,
                symbol = "BTC",
            ),
            InvestmentRow(
                id = "two",
                name = "Bitcoin",
                type = "crypto",
                quantity = 2.0,
                purchasePrice = 60_000.0,
                currentPrice = 70_000.0,
                symbol = "BTC",
            ),
        )
        val holding = aggregateInvestmentHoldings(rows).single()
        assertEquals(3.0, holding.quantity)
        assertEquals(170_000.0, holding.totalInvested)
        assertEquals(210_000.0, holding.currentValue)
        assertTrue(kotlin.math.abs(holding.averageBuyPrice - 56_666.666666666664) < 0.0001)
        assertEquals(2, holding.lots.size)
    }

    @Test
    fun currencyConversionUsesUsdPivotRates() {
        val rates = mapOf("USD" to 1.0, "PKR" to 280.0, "EUR" to 0.8)
        assertEquals(280.0, convertCurrency(1.0, "USD", "PKR", rates))
        assertEquals(350.0, convertCurrency(1.0, "EUR", "PKR", rates))
        assertEquals(0.8, convertCurrency(280.0, "PKR", "EUR", rates))
    }

    @Test
    fun monthRangeAlignsPreviousMonthToSameDay() {
        val range = analyticsSelection(AnalyticsPeriod.Month, "2026-07-22")
        assertEquals("2026-07-01", range.currentStart)
        assertEquals("2026-07-22", range.currentEnd)
        assertEquals("2026-06-01", range.previousStart)
        assertEquals("2026-06-22", range.previousEnd)
    }

    @Test
    fun customRangeBuildsEqualPreviousWindow() {
        val range = analyticsSelection(
            AnalyticsPeriod.Custom,
            nowDate = "2026-07-22",
            customStart = "2026-07-10",
            customEnd = "2026-07-15",
        )
        assertEquals("2026-07-04", range.previousStart)
        assertEquals("2026-07-09", range.previousEnd)
    }

    @Test
    fun analyticsSubtractsRefundsFromExpenses() {
        val selection = AnalyticsSelection(
            period = AnalyticsPeriod.Month,
            currentStart = "2026-07-01",
            currentEnd = "2026-07-31",
            previousStart = "2026-06-01",
            previousEnd = "2026-06-30",
        )
        val transactions = listOf(
            AnalyticsTransaction("i", 1000.0, "2026-07-02", "income", null, "Salary", null, null, null, null, "Employer", null, null),
            AnalyticsTransaction(
                id = "e",
                amount = 400.0,
                date = "2026-07-03",
                type = "expense",
                categoryId = "food",
                categoryName = "Food",
                categoryColor = "#ff0000",
                accountId = null,
                accountName = null,
                accountType = null,
                sourceName = null,
                personName = null,
                itemName = "Dinner",
            ),
            AnalyticsTransaction(
                id = "r",
                amount = 100.0,
                date = "2026-07-04",
                type = "refund",
                categoryId = "food",
                categoryName = "Food",
                categoryColor = "#ff0000",
                accountId = null,
                accountName = null,
                accountType = null,
                sourceName = null,
                personName = null,
                itemName = "Refund",
            ),
        )
        val summary = calculateAnalytics(selection, transactions, emptyList(), emptyList())
        assertEquals(1000.0, summary.totalIncome)
        assertEquals(300.0, summary.totalExpenses)
        assertEquals(700.0, summary.netSavings)
        assertEquals(70.0, summary.savingsRate)
        assertEquals(300.0, summary.expenseCategories.single().amount)
    }

    @Test
    fun portfolioSummaryUsesAggregatedHoldings() {
        val holdings = aggregateInvestmentHoldings(
            listOf(
                InvestmentRow("a", "Asset A", "stock", 2.0, 100.0, currentPrice = 120.0),
                InvestmentRow("b", "Asset B", "stock", 1.0, 200.0, currentPrice = 150.0),
            ),
        )
        val selection = analyticsSelection(AnalyticsPeriod.Today, "2026-07-22")
        val summary = calculateAnalytics(selection, emptyList(), emptyList(), holdings)
        assertEquals(390.0, summary.portfolioValue)
        assertEquals(400.0, summary.portfolioInvested)
        assertEquals(-10.0, summary.portfolioPnl)
    }

    @Test
    fun investmentTypeAliasesMatchWebsiteAndDatabaseContracts() {
        for (value in listOf("stock", "stocks", "Equity", "equities", "share", "shares")) {
            assertEquals("stock", normalizeInvestmentMarketType(value))
        }
        assertEquals("forex", normalizeInvestmentMarketType("currencies"))
        assertEquals("crypto", normalizeInvestmentMarketType("coins"))
        assertEquals("other", normalizeInvestmentEditorType("real_estate"))
        assertNull(normalizeInvestmentMarketType("real_estate"))
    }
}
