import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkOrder() {
    await mongoose.connect(process.env.MONGODB_URI);
    const order = await mongoose.connection.db.collection('orders').findOne({});
    console.log('Sample Order:');
    console.log(JSON.stringify(order, null, 2));
    await mongoose.connection.close();
    process.exit(0);
}

checkOrder();
   