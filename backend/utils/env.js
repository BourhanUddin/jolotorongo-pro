const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const loadEnv = () => {
  const localPath = path.resolve(__dirname, "../.env");
  const rootPath = path.resolve(__dirname, "../../.env");
  const envPath = fs.existsSync(localPath) ? localPath : rootPath;
  dotenv.config({ path: envPath });
};

module.exports = { loadEnv };
