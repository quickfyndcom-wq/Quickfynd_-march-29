const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Store = require('../models/Store');

const createTestOrders = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Get store
        const store = await Store.findOne({}).lean();
        if (!store) {
            console.error('❌ No store found. Please create a store first.');
            process.exit(1);
        }
        console.log('📦 Store found:', store._id);

        // Get or create test user
        let user = await User.findOne({ email: 'customer@test.com' });
        if (!user) {
            user = await User.create({
                name: 'Test Customer',
                email: 'customer@test.com',
                phone: '9876543210',
                firebaseUid: 'test-customer-uid',
                addresses: [{
                    name: 'Test Address',
                    street: '123 Test St',
                    city: 'Test City',
                    district: 'Test District',
                    state: 'Test State',
                    pincode: '123456',
                    phone: '9876543210',
                    isDefault: true
                }]
            });
            console.log('👤 Created test customer:', user._id);
        } else {
            console.log('👤 Using existing customer:', user._id);
        }

        // Get first few products
        const products = await Product.find({ storeId: store._id }).limit(3).lean();
        if (products.length === 0) {
            console.error('❌ No products found. Please add products first.');
            process.exit(1);
        }
        console.log('📦 Found products:', products.length);

        // Create test orders
        const orders = [];
        for (let i = 0; i < 3; i++) {
            const order = await Order.create({
                storeId: store._id,
                userId: user._id,
                orderItems: [
                    {
                        productId: products[0]._id,
                        quantity: 1,
                        price: products[0].price || 999,
                        variant: null
                    },
                    {
                        productId: products[1]._id,
                        quantity: 2,
                        price: products[1].price || 1999,
                        variant: null
                    }
                ],
                shippingAddress: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    street: '123 Test St',
                    city: 'Test City',
                    district: 'Test District',
                    state: 'Test State',
                    pincode: '123456'
                },
                total: (products[0].price || 999) + (2 * (products[1].price || 1999)),
                status: 'completed',
                paymentMethod: 'credit_card',
                paymentStatus: 'paid',
                isGuest: false,
                createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Different dates
            });
            orders.push(order);
            console.log(`✅ Created order ${i + 1}:`, order._id);
        }

        // Create guest orders too
        for (let i = 0; i < 2; i++) {
            const order = await Order.create({
                storeId: store._id,
                orderItems: [
                    {
                        productId: products[2]._id,
                        quantity: 1,
                        price: products[2].price || 799,
                        variant: null
                    }
                ],
                shippingAddress: {
                    name: `Guest Customer ${i + 1}`,
                    email: `guest${i + 1}@test.com`,
                    phone: `987654321${i}`,
                    street: '456 Guest St',
                    city: 'Guest City',
                    district: 'Guest District',
                    state: 'Guest State',
                    pincode: '654321'
                },
                guestName: `Guest Customer ${i + 1}`,
                guestEmail: `guest${i + 1}@test.com`,
                total: products[2].price || 799,
                status: 'completed',
                paymentMethod: 'cod',
                paymentStatus: 'pending',
                isGuest: true,
                createdAt: new Date(Date.now() - ((i + 3) * 24 * 60 * 60 * 1000))
            });
            console.log(`✅ Created guest order ${i + 1}:`, order._id);
        }

        console.log('\n✨ Test data created successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Registered Customer: 1`);
        console.log(`   - Registered Customer Orders: 3`);
        console.log(`   - Guest Orders: 2`);
        console.log(`   - Total Orders: 5`);
        console.log('\n💡 Now you should see customers in the Product Notifications page!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createTestOrders();
