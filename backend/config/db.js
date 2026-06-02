const mongoose = require("mongoose");

// ── Two separate Mongoose connections ────────────────────────
let cloudConn = null;
let localConn = null;

const isTruthy = (value) => String(value).trim().toLowerCase() === "true";

const connectDB = async () => {
  const useLocalDB = isTruthy(process.env.USE_LOCAL_DB);
  const cloudURI = process.env.DATABASE_URL;
  const localURI = process.env.LOCAL_DATABASE_URL || "mongodb://localhost:27017/jolotorongo";

  const selected = useLocalDB
    ? {
        label: "[Local MongoDB]",
        uri: localURI,
        timeout: 5000,
        hint: "Local MongoDB চালু করুন অথবা USE_LOCAL_DB=false করে Atlas ব্যবহার করুন।",
      }
    : {
        label: "[Cloud Atlas]",
        uri: cloudURI,
        timeout: 10000,
        hint: "Atlas Network Access/IP whitelist এবং DATABASE_URL পরীক্ষা করুন।",
      };

  if (!selected.uri) {
    throw new Error(`${selected.label} URI সেট করা নেই।`);
  }

  try {
    const mongooseInstance = await mongoose.connect(selected.uri, {
      serverSelectionTimeoutMS: selected.timeout,
      dbName: "jolotorongo",
    });

    if (useLocalDB) {
      localConn = mongooseInstance.connection;
    } else {
      cloudConn = mongooseInstance.connection;
    }

    console.log(`✅ ${selected.label} সংযুক্ত: ${mongooseInstance.connection.host}`);
  } catch (err) {
    console.error(`❌ ${selected.label} সংযোগ ব্যর্থ: ${err.message}`);
    console.error(`   ${selected.hint}`);
    throw err;
  }
};

// Export connections for use elsewhere if needed
const getCloudConn = () => cloudConn;
const getLocalConn = () => localConn;

module.exports = { connectDB, getCloudConn, getLocalConn };
