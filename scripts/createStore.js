import prisma from "../lib/prisma.js";

// Run this script with: npx tsx scripts/createStore.js
async function main() {
  const userId = "KKqP8VK1CzNP0YJ6A3uTXkLApxj1";
  // Create user if not exists
  // Removed dummy seller and store creation. Add your real seller/store creation logic here if needed.
  console.log("Dummy seller/store creation removed.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
