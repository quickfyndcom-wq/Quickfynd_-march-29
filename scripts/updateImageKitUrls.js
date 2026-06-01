// Script to update all product image URLs in the database to use the new ImageKit endpoint
// Usage: node scripts/updateImageKitUrls.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD_ENDPOINT = 'https://ik.imagekit.io/jrstupuke/';
const NEW_ENDPOINT = 'https://ik.imagekit.io/jrstupuke/';

async function updateProductImageUrls() {
  const products = await prisma.product.findMany({});
  let updatedCount = 0;

  for (const product of products) {
    if (product.image && product.image.includes(OLD_ENDPOINT)) {
      const newImageUrl = product.image.replace(OLD_ENDPOINT, NEW_ENDPOINT);
      await prisma.product.update({
        where: { id: product.id },
        data: { image: newImageUrl },
      });
      updatedCount++;
      console.log(`Updated product ${product.id}: ${newImageUrl}`);
    }
  }

  console.log(`\nDone! Updated ${updatedCount} product image URLs.`);
  await prisma.$disconnect();
}

updateProductImageUrls().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
