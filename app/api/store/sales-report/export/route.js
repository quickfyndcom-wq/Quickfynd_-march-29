import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";

import MarketingExpense from "@/models/MarketingExpense";
import { getAuth } from '@/lib/firebase-admin';

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
        
        // Calculate date range (same logic as main report)
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
            case 'THIS_MONTH':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1)
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
            // Add other cases as needed
        }
        

        const orders = await Order.find({
            ...dateFilter,
            status: { $ne: 'CANCELLED' }
        }).sort({ createdAt: -1 });
        // Fetch marketing expenses for the same date range
        const marketingExpenses = await MarketingExpense.find(dateFilter);

        // Calculate summary values
        let totalRevenue = 0;
        let totalProductCosts = 0;
        let totalDeliveryCosts = 0;
        let totalProfit = 0;
        let deliveredProfit = 0;
        let deliveredCount = 0;
        let inTransitProfit = 0;
        let inTransitCount = 0;
        let totalMarketingCosts = 0;
        let totalCashReceived = 0;
        const inTransitStatuses = ['SHIPPED', 'OUT_FOR_DELIVERY'];

        // Prepare per-order rows
        let orderRows = [];
        for (const order of orders) {
            let orderProductCost = 0;
            if (order.orderItems && order.orderItems.length > 0) {
                for (const item of order.orderItems) {
                    const product = await Product.findById(item.productId);
                    if (product && product.costPrice) {
                        orderProductCost += product.costPrice * item.quantity;
                    }
                }
            }
            const orderRevenue = order.total || 0;
            const orderDeliveryCost = order.shippingFee || 0;
            const orderProfit = orderRevenue - orderProductCost - orderDeliveryCost;
            totalRevenue += orderRevenue;
            totalProductCosts += orderProductCost;
            totalDeliveryCosts += orderDeliveryCost;
            totalProfit += orderProfit;
            if (String(order.status).toUpperCase() === 'DELIVERED') {
                deliveredProfit += orderProfit;
                deliveredCount++;
                totalCashReceived += orderRevenue;
            } else if (inTransitStatuses.includes(String(order.status).toUpperCase())) {
                inTransitProfit += orderProfit;
                inTransitCount++;
            }
            orderRows.push([
                order.shortOrderNumber,
                new Date(order.createdAt).toLocaleDateString('en-IN'),
                orderRevenue,
                orderProductCost,
                orderDeliveryCost,
                orderProfit,
                order.status
            ]);
        }

        // Marketing expense summary
        marketingExpenses.forEach(expense => {
            totalMarketingCosts += expense.amount || 0;
        });

        // Build summary section
        let csv = '';
        csv += 'SUMMARY\n';
        csv += `Total Revenue,${totalRevenue}\n`;
        csv += `Total Product Cost,${totalProductCosts}\n`;
        csv += `Total Delivery Cost,${totalDeliveryCosts}\n`;
        csv += `Total Marketing Spend,${totalMarketingCosts}\n`;
        csv += `Total Profit,${totalProfit}\n`;
        csv += `Delivered Order Profit,${deliveredProfit}\n`;
        csv += `Delivered Order Count,${deliveredCount}\n`;
        csv += `In-Transit Order Profit,${inTransitProfit}\n`;
        csv += `In-Transit Order Count,${inTransitCount}\n`;
        csv += `Total Cash Received (Delivered),${totalCashReceived}\n`;
        csv += '\n';
        csv += 'Order Number,Date,Revenue,Product Cost,Delivery Cost,Profit/Loss,Status\n';
        for (const row of orderRows) {
            csv += row.join(',') + '\n';
        }

        // Marketing expense details
        if (marketingExpenses.length > 0) {
            csv += '\nMARKETING EXPENSES\n';
            csv += 'Campaign Name,Start Date,End Date,Type,Platform,Amount,Clicks,Impressions,Reach,Conversions,Notes\n';
            for (const exp of marketingExpenses) {
                csv += [
                    exp.campaignName,
                    exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-IN') : '',
                    exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-IN') : '',
                    exp.campaignType,
                    exp.platform,
                    exp.amount,
                    exp.clicks,
                    exp.impressions,
                    exp.reach,
                    exp.conversions,
                    exp.notes ? '"' + exp.notes.replace(/"/g, '""') + '"' : ''
                ].join(',') + '\n';
            }
        }

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="sales-report.csv"'
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: 'Failed to export report' },
            { status: 500 }
        );
    }
}
