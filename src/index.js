const fs = require("fs");

const example = fs.readFileSync(".env.example", "utf8");

const requiredVariables = example
  .split("\n")
  .map(line => line.trim())
  .filter(line => line && !line.startsWith("#"))
  .map(line => line.split("=")[0].trim());

const envFile = fs.readFileSync(".env", "utf8");

const existingVariables = envFile
  .split("\n")
  .map(line => line.trim())
  .filter(line => line && !line.startsWith("#"))
  .map(line => line.split("=")[0].trim());

const missingVariables = requiredVariables.filter(
  variable => !existingVariables.includes(variable)
);

if (missingVariables.length === 0) {
  console.log("✓ All required environment variables are present.");
} else {
  console.log("✗ Missing environment variables:");

  for (const variable of missingVariables) {
    console.log(`  - ${variable}`);
  }

  process.exit(1);
}