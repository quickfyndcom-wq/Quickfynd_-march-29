import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkUsers() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get an order
    const order = await mongoose.connection.db.collection('orders').findOne({});
    console.log('Sample Order userId:', order.userId);
    
    // Check if user exists
    const user = await mongoose.connection.db.collection('users').findOne({ _id: order.userId });
    console.log('User found:', user ? { _id: user._id, name: user.name, email: user.email } : 'NOT FOUND');
    
    // List all users
    const allUsers = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`\nTotal users: ${allUsers.length}`);
    allUsers.forEach(u => {
        console.log(`  - ${u._id}: ${u.name} (${u.email})`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
}

checkUsers();
