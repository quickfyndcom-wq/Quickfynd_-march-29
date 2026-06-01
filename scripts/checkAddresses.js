import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkAddresses() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const userId = 'wnKm3LYgofZOA9ysN3uuRaalw5G2';
    
    const addresses = await mongoose.connection.db.collection('addresses')
        .find({ userId })
        .toArray();
    
    console.log(`\n=== Addresses for user ${userId} ===\n`);
    console.log(`Total addresses: ${addresses.length}\n`);
    
    addresses.forEach((addr, i) => {
        console.log(`${i + 1}. Address ID: ${addr._id}`);
        console.log(`   Name: ${addr.name || 'N/A'}`);
        console.log(`   Street: ${addr.street || 'N/A'}`);
        console.log(`   City: ${addr.city || 'N/A'}`);
        console.log(`   State: ${addr.state || 'N/A'}`);
        console.log(`   Zip: ${addr.zip || 'N/A'}`);
        console.log(`   Country: ${addr.country || 'N/A'}`);
        console.log();
    });
    
    await mongoose.connection.close();
    process.exit(0);
}

checkAddresses();
