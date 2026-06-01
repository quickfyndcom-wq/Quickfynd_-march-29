// This script will activate your store and ensure all products have a valid, active storeId.
// Run with: node scripts/fixStoreAndProducts.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Activate the first store (or update as needed)
  const store = await prisma.store.findFirst();
  if (!store) {
    console.error('No store found. Please create a store first.');
    return;
  }
  if (!store.isActive) {
    await prisma.store.update({ where: { id: store.id }, data: { isActive: true } });
    console.log('Store activated:', store.id);
  } else {
    console.log('Store already active:', store.id);
  }

  // 2. Update all products to use this storeId
  const updated = await prisma.product.updateMany({ data: { storeId: store.id } });
  console.log(`Updated ${updated.count} products to use storeId ${store.id}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
