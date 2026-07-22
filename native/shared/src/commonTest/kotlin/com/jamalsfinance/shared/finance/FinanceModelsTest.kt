package com.jamalsfinance.shared.finance

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FinanceModelsTest {
    @Test
    fun activeAccountsAreSortedByBalanceThenName() {
        val snapshot = FinanceSnapshot(
            accounts = listOf(
                FinanceAccount(id = "b", name = "Beta", type = "bank", balance = 100.0),
                FinanceAccount(id = "a", name = "Alpha", type = "cash", balance = 500.0),
                FinanceAccount(id = "c", name = "Archived", type = "bank", balance = 900.0, status = "archived"),
            ),
        )

        assertEquals(listOf("a", "b"), snapshot.activeAccounts.map { it.id })
        assertEquals(600.0, snapshot.totalActiveBalance)
        assertEquals(listOf("c"), snapshot.archivedAccounts.map { it.id })
    }

    @Test
    fun ledgerFlagsProtectDeletedAndGeneratedEntries() {
        val activeIncome = LedgerEntry(id = "1", date = "2026-07-22", type = "income", amount = 100.0)
        val deletedTransfer = LedgerEntry(
            id = "2",
            date = "2026-07-22",
            type = "transfer",
            amount = 50.0,
            deletedAt = "2026-07-22T12:00:00Z",
        )
        val goal = LedgerEntry(id = "3", date = "2026-07-22", type = "goal", amount = 25.0)

        assertTrue(activeIncome.canEditDirectly)
        assertFalse(activeIncome.isDeleted)
        assertTrue(deletedTransfer.isTransfer)
        assertTrue(deletedTransfer.isDeleted)
        assertFalse(deletedTransfer.canEditDirectly)
        assertFalse(goal.canEditDirectly)
    }
}
