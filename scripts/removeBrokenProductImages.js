// scripts/removeBrokenProductImages.js
// This script removes or replaces broken product image URLs in the database

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
require('dotenv').config();

const prisma = new PrismaClient();
const PLACEHOLDER = '/placeholder.png';

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function cleanProductImages() {
  const products = await prisma.product.findMany();
  for (const product of products) {
    let changed = false;
    const newImages = [];
    for (const img of product.images || []) {
      if (typeof img === 'string' && img.startsWith('http')) {
        if (await urlExists(img)) {
          newImages.push(img);
        } else {
          newImages.push(PLACEHOLDER);
          changed = true;
        }
      } else if (typeof img === 'string') {
        newImages.push(img);
      }
    }
    if (changed) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImages },
      });
      console.log(`Updated product ${product.id} (${product.name})`);
    }
  }
  await prisma.$disconnect();
  console.log('Done!');
}

cleanProductImages();
