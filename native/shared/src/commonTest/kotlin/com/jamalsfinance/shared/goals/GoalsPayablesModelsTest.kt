package com.jamalsfinance.shared.goals

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class GoalsPayablesModelsTest {
    @Test
    fun goalProgressIsBoundedAndCompletionIsDerived() {
        val goal = NativeGoal(
            row = GoalRow(
                id = "g1",
                name = "Emergency fund",
                targetAmount = 1000.0,
                targetAmountOriginal = 1000.0,
                currentAmount = 1250.0,
            ),
            linkedAccount = null,
            contributions = emptyList(),
        )

        assertEquals(1.0, goal.progress)
        assertEquals(0.0, goal.remainingAmount)
        assertTrue(goal.completed)
    }

    @Test
    fun payableStatusUsesCompletionOverOverdueAndPartial() {
        val completed = payable(paid = 100.0, remaining = 0.0, due = "2026-01-01")
        val overdue = payable(paid = 0.0, remaining = 100.0, due = "2026-01-01")
        val partial = payable(paid = 20.0, remaining = 80.0, due = "2027-01-01")
        val pending = payable(paid = 0.0, remaining = 100.0, due = null)

        assertEquals("completed", completed.displayStatus("2026-07-22"))
        assertEquals("overdue", overdue.displayStatus("2026-07-22"))
        assertEquals("partial", partial.displayStatus("2026-07-22"))
        assertEquals("pending", pending.displayStatus("2026-07-22"))
        assertTrue(completed.progress == 1.0)
        assertFalse(pending.progress > 0.0)
    }

    @Test
    fun snapshotTotalsUseCanonicalPkrValues() {
        val goal = NativeGoal(
            row = GoalRow(
                id = "g1",
                name = "Car",
                targetAmount = 500.0,
                targetAmountOriginal = 500.0,
                currentAmount = 100.0,
            ),
            linkedAccount = null,
            contributions = emptyList(),
        )
        val payable = payable(paid = 40.0, remaining = 60.0, due = null)
        val snapshot = GoalsPayablesSnapshot(goals = listOf(goal), payables = listOf(payable))

        assertEquals(500.0, snapshot.totalGoalTarget)
        assertEquals(100.0, snapshot.totalGoalSaved)
        assertEquals(100.0, snapshot.totalPayableValue)
        assertEquals(40.0, snapshot.totalPayablePaid)
        assertEquals(60.0, snapshot.totalPayableRemaining)
    }

    private fun payable(paid: Double, remaining: Double, due: String?): NativePayable = NativePayable(
        row = PayableRow(
            id = "p-$paid-$remaining-$due",
            personName = "Vendor",
            reason = "Invoice",
            originalValue = 100.0,
            originalValueInput = 100.0,
            paidAmount = paid,
            remainingAmount = remaining,
            dueDate = due,
        ),
        linkedAccount = null,
        payments = emptyList(),
    )
}
