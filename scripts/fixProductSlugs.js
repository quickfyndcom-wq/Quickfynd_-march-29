// scripts/fixProductSlugs.js
// Run with: node scripts/fixProductSlugs.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  const products = await prisma.product.findMany();
  for (const product of products) {
    if (!product.slug || product.slug.trim() === '' || product.slug === product.id) {
      // Generate slug from name
      let baseSlug = slugify(product.name || product.id);
      let slug = baseSlug;
      let i = 1;
      // Ensure uniqueness
      while (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${i++}`;
      }
      await prisma.product.update({
        where: { id: product.id },
        data: { slug },
      });
      console.log(`Updated product ${product.id} with slug: ${slug}`);
    }
  }
  console.log('All products now have valid slugs.');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
