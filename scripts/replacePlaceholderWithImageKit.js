// scripts/replacePlaceholderWithImageKit.js
// Replace all '/placeholder.png' in product images with ImageKit placeholder URL

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const IMAGEKIT_PLACEHOLDER = 'https://ik.imagekit.io/jrstupuke/placeholder.png';

async function replacePlaceholders() {
  const products = await prisma.product.findMany();
  for (const product of products) {
    let changed = false;
    const newImages = (product.images || []).map(img =>
      (img === '/placeholder.png' || img === 'https://ik.imagekit.io/jrstupuke/placeholder.png') ? IMAGEKIT_PLACEHOLDER : img
    );
    if (JSON.stringify(newImages) !== JSON.stringify(product.images)) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImages },
      });
      changed = true;
      console.log(`Updated product ${product.id} (${product.name})`);
    }
  }
  await prisma.$disconnect();
  console.log('Done!');
}

replacePlaceholders();
