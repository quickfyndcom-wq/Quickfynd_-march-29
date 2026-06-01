import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MarketingExpense from "@/models/MarketingExpense";
import { getAuth } from '@/lib/firebase-admin';

// GET - Fetch all marketing expenses
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
            case 'THIS_WEEK':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                dateFilter = {
                    createdAt: { $gte: startOfWeek }
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
        
        const expenses = await MarketingExpense.find(dateFilter)
            .sort({ createdAt: -1 });
        
        // Calculate totals
        const totals = {
            totalSpend: 0,
            totalClicks: 0,
            totalImpressions: 0,
            totalConversions: 0,
            byType: {},
            byPlatform: {}
        };
        
        expenses.forEach(expense => {
            totals.totalSpend += expense.amount;
            totals.totalClicks += expense.clicks || 0;
            totals.totalImpressions += expense.impressions || 0;
            totals.totalConversions += expense.conversions || 0;
            
            // By campaign type
            if (!totals.byType[expense.campaignType]) {
                totals.byType[expense.campaignType] = {
                    spend: 0,
                    clicks: 0,
                    conversions: 0
                };
            }
            totals.byType[expense.campaignType].spend += expense.amount;
            totals.byType[expense.campaignType].clicks += expense.clicks || 0;
            totals.byType[expense.campaignType].conversions += expense.conversions || 0;
            
            // By platform
            if (!totals.byPlatform[expense.platform]) {
                totals.byPlatform[expense.platform] = {
                    spend: 0,
                    clicks: 0,
                    conversions: 0
                };
            }
            totals.byPlatform[expense.platform].spend += expense.amount;
            totals.byPlatform[expense.platform].clicks += expense.clicks || 0;
            totals.byPlatform[expense.platform].conversions += expense.conversions || 0;
        });
        
        return NextResponse.json({
            success: true,
            expenses,
            totals
        });
        
    } catch (error) {
        console.error('Marketing expenses fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch marketing expenses' },
            { status: 500 }
        );
    }
}

// POST - Add new marketing expense
export async function POST(req) {
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
        
        const body = await req.json();
        const { 
            campaignName, 
            campaignType, 
            platform, 
            amount, 
            clicks, 
            impressions,
            reach,
            conversions,
            startDate,
            endDate,
            notes 
        } = body;
        
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: 'Valid amount is required' },
                { status: 400 }
            );
        }
        
        const expense = new MarketingExpense({
            storeId: 'default', // Update with actual storeId from auth
            campaignName,
            campaignType,
            platform,
            amount,
            clicks: clicks || 0,
            impressions: impressions || 0,
            reach: reach || 0,
            conversions: conversions || 0,
            startDate,
            endDate,
            notes
        });
        
        await expense.save();
        
        return NextResponse.json({
            success: true,
            message: 'Marketing expense added successfully',
            expense
        });
        
    } catch (error) {
        console.error('Marketing expense add error:', error);
        return NextResponse.json(
            { error: 'Failed to add marketing expense' },
            { status: 500 }
        );
    }
}

// DELETE - Remove marketing expense
export async function DELETE(req) {
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
        const expenseId = searchParams.get('id');
        
        if (!expenseId) {
            return NextResponse.json(
                { error: 'Expense ID is required' },
                { status: 400 }
            );
        }
        
        await MarketingExpense.findByIdAndDelete(expenseId);
        
        return NextResponse.json({
            success: true,
            message: 'Marketing expense deleted successfully'
        });
        
    } catch (error) {
        console.error('Marketing expense delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete marketing expense' },
            { status: 500 }
        );
    }
}
