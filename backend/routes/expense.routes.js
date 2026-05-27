const express = require("express");
const router = express.Router();
const {
  getExpenses, createExpense, updateExpense, deleteExpense, getFinanceReport,
} = require("../controllers/expense.controller");
const { protect, restrictTo, requireActiveSubscription } = require("../middleware/auth.middleware");

router.use(protect, restrictTo("boat_owner"), requireActiveSubscription);

router.get("/report", getFinanceReport);
router.get("/", getExpenses);
router.post("/", createExpense);
router.patch("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
