const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middleware/error.middleware");
const authRoutes = require("./routes/auth.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const agentRoutes = require("./routes/agent.routes");
const roomRoutes = require("./routes/room.routes");
const bookingRoutes = require("./routes/booking.routes");
const bookingRequestRoutes = require("./routes/bookingRequest.routes");
const expenseRoutes = require("./routes/expense.routes");
const adminRoutes = require("./routes/admin.routes");
const houseboatRoutes = require("./routes/houseboat.routes");

const app = express();

// ─── Security & Logging ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: "অনেক বেশি রিকোয়েস্ট। ১৫ মিনিট পরে আবার চেষ্টা করুন।" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "অনেক বেশি লগইন প্রচেষ্টা। ১৫ মিনিট পরে আবার চেষ্টা করুন।" },
});

app.use("/api", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/booking-requests", bookingRequestRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/houseboat", houseboatRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ success: true, message: "Jolotorongo API চালু আছে ✅", timestamp: new Date() })
);

// ─── 404 Handler ─────────────────────────────────────────────
app.all("*", (req, res) =>
  res.status(404).json({ success: false, message: `রুট পাওয়া যায়নি: ${req.originalUrl}` })
);

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
