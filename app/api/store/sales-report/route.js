import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import MarketingExpense from "@/models/MarketingExpense";
import { getAuth } from '@/lib/firebase-admin';
import fetch from 'node-fetch';

export async function GET(req) {
    try {
        await connectDB();
        
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const token = authHeader.split('Bearer ')[1];
        const decoded = await getAuth().verifyIdToken(token);
        if (!decoded || !decoded.uid) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        const { searchParams } = new URL(req.url);
        const dateRange = searchParams.get('dateRange') || 'THIS_MONTH';
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        
        // Calculate date range
        let dateFilter = {};
        const now = new Date();
        
        switch (dateRange) {
            case 'TODAY':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                    }
                };
                break;
            case 'YESTERDAY':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    }
                };
                break;
            case 'THIS_WEEK':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                dateFilter = {
                    createdAt: { $gte: startOfWeek }
                };
                break;
            case 'LAST_WEEK':
                const startOfLastWeek = new Date(now);
                startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
                startOfLastWeek.setHours(0, 0, 0, 0);
                const endOfLastWeek = new Date(startOfLastWeek);
                endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
                dateFilter = {
                    createdAt: {
                        $gte: startOfLastWeek,
                        $lt: endOfLastWeek
                    }
                };
                break;
            case 'THIS_MONTH':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1)
                    }
                };
                break;
            case 'LAST_MONTH':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                        $lt: new Date(now.getFullYear(), now.getMonth(), 1)
                    }
                };
                break;
            case 'THIS_YEAR':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), 0, 1)
                    }
                };
                break;
            case 'LAST_YEAR':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear() - 1, 0, 1),
                        $lt: new Date(now.getFullYear(), 0, 1)
                    }
                };
                break;
            case 'CUSTOM':
                if (fromDate && toDate) {
                    dateFilter = {
                        createdAt: {
                            $gte: new Date(fromDate),
                            $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
                        }
                    };
                }
                break;
        }
        
        // Fetch orders (exclude cancelled orders)
        const orders = await Order.find({
            ...dateFilter,
            status: { $ne: 'CANCELLED' }
        }).sort({ createdAt: -1 });
        
        // Fetch marketing expenses for the same date range
        const marketingExpenses = await MarketingExpense.find(dateFilter);
        
        // Calculate totals
        let totalRevenue = 0;
        let totalProductCosts = 0;
        let totalDeliveryCosts = 0;
        let totalMarketingCosts = 0;
        
        // Sum up marketing costs
        marketingExpenses.forEach(expense => {
            totalMarketingCosts += expense.amount || 0;
        });
        
        const ordersWithProfit = [];
        
        const inTransitOrdersWithProfit = [];
        for (const order of orders) {
            let orderProductCost = 0;
            // Calculate product costs for this order
            if (order.orderItems && order.orderItems.length > 0) {
                for (const item of order.orderItems) {
                    const product = await Product.findById(item.productId);
                    if (product && product.costPrice) {
                        orderProductCost += product.costPrice * item.quantity;
                    }
                }
            }
            const orderRevenue = order.total || 0;
            // Use saved shippingFee for delivery cost
            let orderDeliveryCost = order.shippingFee || 0;
            const orderProfit = orderRevenue - orderProductCost - orderDeliveryCost;
            totalRevenue += orderRevenue;
            totalProductCosts += orderProductCost;
            totalDeliveryCosts += orderDeliveryCost;
            const orderData = {
                _id: order._id,
                shortOrderNumber: order.shortOrderNumber,
                createdAt: order.createdAt,
                total: orderRevenue,
                productCost: orderProductCost,
                shippingFee: orderDeliveryCost,
                profit: orderProfit,
                status: order.status
            };
            // Add to in-transit list if status is SHIPPED or OUT_FOR_DELIVERY
            if (String(order.status).toUpperCase() === 'SHIPPED' || String(order.status).toUpperCase() === 'OUT_FOR_DELIVERY') {
                inTransitOrdersWithProfit.push(orderData);
            }
            ordersWithProfit.push(orderData);
        }
        
        const totalCosts = totalProductCosts + totalDeliveryCosts + totalMarketingCosts;
        const totalProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const avgProfit = orders.length > 0 ? totalProfit / orders.length : 0;
        
        // Monthly breakdown
        const monthlyData = [];
        const monthsMap = new Map();
        
        ordersWithProfit.forEach(order => {
            const monthYear = new Date(order.createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
            
            if (!monthsMap.has(monthYear)) {
                monthsMap.set(monthYear, {
                    month: monthYear,
                    orders: 0,
                    revenue: 0,
                    costs: 0,
                    profit: 0
                });
            }
            
            const monthData = monthsMap.get(monthYear);
            monthData.orders += 1;
            monthData.revenue += order.total;
            monthData.costs += order.productCost + order.shippingFee;
            monthData.profit += order.profit;
        });
        
        monthsMap.forEach(value => monthlyData.push(value));
        
        const report = {
            totalRevenue,
            totalCosts,
            productCosts: totalProductCosts,
            deliveryCosts: totalDeliveryCosts,
            marketingCosts: totalMarketingCosts,
            totalProfit,
            profitMargin,
            totalOrders: orders.length,
            avgOrderValue,
            avgProfit,
            monthlyData
        };
        
        return NextResponse.json({
            success: true,
            report,
            orders: ordersWithProfit,
            inTransitOrders: inTransitOrdersWithProfit
        });
        
    } catch (error) {
        console.error('Sales report error:', error);
        return NextResponse.json(
            { error: 'Failed to generate sales report' },
            { status: 500 }
        );
    }
}
