#!/usr/bin/env node

const fs = require("fs");

function readEnvFile(fileName) {
  try {
    return fs.readFileSync(fileName, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`✗ ${fileName} not found.`);
      console.error("  Make sure you run env-check from the root of your project.");
      process.exit(1);
    }

    throw error;
  }
}

const example = readEnvFile(".env.example");

const requiredVariables = example
  .split("\n")
  .map(line => line.trim())
  .filter(line => line && !line.startsWith("#"))
  .map(line => line.split("=")[0].trim());

const envFile = readEnvFile(".env");

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