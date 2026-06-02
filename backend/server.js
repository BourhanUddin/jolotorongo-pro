require("./utils/env").loadEnv();
const app = require("./app");
const { connectDB } = require("./config/db");
const { startJobs } = require("./jobs/scheduler");
const { ensureDemoData } = require("./utils/bootstrap");

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDB();
    await ensureDemoData();

    const server = app.listen(PORT, () => {
      console.log("\n╔══════════════════════════════════════════════╗");
      console.log(`║  🛥️  Jolotorongo API — Port: ${PORT}            ║`);
      console.log(`║  🌿  Mode: ${process.env.NODE_ENV || "development"}                        ║`);
      console.log("╚══════════════════════════════════════════════╝\n");
      startJobs();
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Closing Jolotorongo API.");
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error("❌ Server start failed:", err.message);
    process.exit(1);
  }
};

startServer();
