const mongoose = require("mongoose");

// ── Two separate Mongoose connections ────────────────────────
let cloudConn = null;
let localConn = null;

const connectDB = async () => {
  const cloudURI = process.env.DATABASE_URL;
  const localURI = process.env.LOCAL_DATABASE_URL || "mongodb://localhost:27017/jolotorongo";

  const results = await Promise.allSettled([
    // ── Cloud (Atlas) ────────────────────────────────────────
    mongoose
      .createConnection(cloudURI, {
        serverSelectionTimeoutMS: 10000,
        dbName: "jolotorongo",
      })
      .asPromise(),

    // ── Local ────────────────────────────────────────────────
    mongoose
      .createConnection(localURI, {
        serverSelectionTimeoutMS: 5000,
        dbName: "jolotorongo",
      })
      .asPromise(),
  ]);

  const [cloudResult, localResult] = results;

  // Cloud
  if (cloudResult.status === "fulfilled") {
    cloudConn = cloudResult.value;
    console.log(`✅ [Cloud Atlas]  সংযুক্ত: ${cloudConn.host}`);
  } else {
    console.warn(`⚠️  [Cloud Atlas]  সংযোগ ব্যর্থ: ${cloudResult.reason?.message}`);
    console.warn("   Atlas → Network Access → IP Whitelist-এ 0.0.0.0/0 যোগ করুন");
  }

  // Local
  if (localResult.status === "fulfilled") {
    localConn = localResult.value;
    console.log(`✅ [Local MongoDB] সংযুক্ত: ${localConn.host}`);
  } else {
    console.warn(`⚠️  [Local MongoDB] সংযোগ ব্যর্থ: ${localResult.reason?.message}`);
    console.warn("   Local MongoDB চালু নেই — শুধু Cloud ব্যবহার হবে");
  }

  // At least one must connect
  if (!cloudConn && !localConn) {
    console.error("\n❌ কোনো Database-এ সংযোগ হয়নি। সার্ভার বন্ধ হচ্ছে।\n");
    process.exit(1);
  }

  // Default mongoose connection = cloud (if available) else local
  const primaryURI = cloudConn ? cloudURI : localURI;
  await mongoose.connect(primaryURI, {
    serverSelectionTimeoutMS: 10000,
    dbName: "jolotorongo",
  });
};

// Export connections for use elsewhere if needed
const getCloudConn = () => cloudConn;
const getLocalConn = () => localConn;

module.exports = { connectDB, getCloudConn, getLocalConn };