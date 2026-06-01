// Script to delete all products from the database
// Usage: node scripts/deleteAllProducts.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllProducts() {
  const deleted = await prisma.product.deleteMany({});
  console.log(`Deleted ${deleted.count} products.`);
  await prisma.$disconnect();
}

deleteAllProducts().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
