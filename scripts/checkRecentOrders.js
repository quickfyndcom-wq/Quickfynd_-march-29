import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkRecentOrders() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const orders = await mongoose.connection.db.collection('orders')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
    
    console.log(`\n=== Last 5 Orders ===\n`);
    
    orders.forEach((order, i) => {
        console.log(`\n${i + 1}. Order ID: ${order._id}`);
        console.log(`   Created: ${order.createdAt}`);
        console.log(`   User ID: ${order.userId || 'N/A'}`);
        console.log(`   Is Guest: ${order.isGuest || false}`);
        console.log(`   Has shippingAddress: ${!!order.shippingAddress}`);
        if (order.shippingAddress) {
            console.log(`   Shipping Address:`, JSON.stringify(order.shippingAddress, null, 4));
        }
        console.log(`   Has addressId: ${!!order.addressId}`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
}

checkRecentOrders();
