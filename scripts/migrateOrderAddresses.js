/**
 * Migration script to populate shippingAddress field for existing orders
 * Run with: node scripts/migrateOrderAddresses.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Define schemas
const OrderSchema = new mongoose.Schema({
    storeId: String,
    userId: String,
    addressId: String,
    total: Number,
    shippingFee: Number,
    status: String,
    paymentMethod: String,
    paymentStatus: String,
    isPaid: Boolean,
    isCouponUsed: Boolean,
    coupon: Object,
    isGuest: Boolean,
    guestName: String,
    guestEmail: String,
    guestPhone: String,
    shippingAddress: Object,
    orderItems: Array,
    items: Array,
}, { timestamps: true });

const AddressSchema = new mongoose.Schema({
    userId: String,
    name: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    district: String,
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const Address = mongoose.models.Address || mongoose.model('Address', AddressSchema);

async function migrateOrderAddresses() {
    try {
        await connectDB();

        // Find all orders without shippingAddress
        const orders = await Order.find({
            $or: [
                { shippingAddress: { $exists: false } },
                { shippingAddress: null }
            ]
        }).lean();

        console.log(`\n📦 Found ${orders.length} orders without shippingAddress`);

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const order of orders) {
            try {
                let shippingAddress = null;

                // Guest orders - use guest info
                if (order.isGuest) {
                    shippingAddress = {
                        name: order.guestName || 'Guest',
                        email: order.guestEmail || '',
                        phone: order.guestPhone || '',
                        street: '',
                        city: '',
                        state: '',
                        zip: '',
                        country: '',
                        district: ''
                    };

                    // Try to get address from addressId if available
                    if (order.addressId) {
                        const address = await Address.findById(order.addressId).lean();
                        if (address) {
                            shippingAddress = {
                                name: address.name || order.guestName || 'Guest',
                                email: address.email || order.guestEmail || '',
                                phone: address.phone || order.guestPhone || '',
                                street: address.street || '',
                                city: address.city || '',
                                state: address.state || '',
                                zip: address.zip || '',
                                country: address.country || '',
                                district: address.district || ''
                            };
                        }
                    }
                } 
                // Regular orders - fetch from addressId
                else if (order.addressId) {
                    const address = await Address.findById(order.addressId).lean();
                    if (address) {
                        shippingAddress = {
                            name: address.name || '',
                            email: address.email || '',
                            phone: address.phone || '',
                            street: address.street || '',
                            city: address.city || '',
                            state: address.state || '',
                            zip: address.zip || '',
                            country: address.country || '',
                            district: address.district || ''
                        };
                    } else {
                        console.log(`⚠️  Order ${order._id}: Address ${order.addressId} not found`);
                        skipped++;
                        continue;
                    }
                } else {
                    console.log(`⚠️  Order ${order._id}: No addressId or guest info`);
                    skipped++;
                    continue;
                }

                // Update order
                if (shippingAddress) {
                    await Order.findByIdAndUpdate(order._id, {
                        $set: { shippingAddress }
                    });
                    updated++;
                    console.log(`✅ Order ${order._id}: Updated with shipping address`);
                }

            } catch (error) {
                console.error(`❌ Order ${order._id}: Failed -`, error.message);
                failed++;
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`✅ Updated: ${updated}`);
        console.log(`⚠️  Skipped: ${skipped}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${orders.length}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateOrderAddresses();
