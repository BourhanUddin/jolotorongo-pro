require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const app = require("./app");
const { connectDB } = require("./config/db");
const { startJobs } = require("./jobs/scheduler");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log(`║  🛥️  Jolotorongo API — Port: ${PORT}            ║`);
    console.log(`║  🌿  Mode: ${process.env.NODE_ENV || "development"}                        ║`);
    console.log("╚══════════════════════════════════════════════╝\n");
    startJobs();
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err.message);
    process.exit(1);
  });
};

startServer();