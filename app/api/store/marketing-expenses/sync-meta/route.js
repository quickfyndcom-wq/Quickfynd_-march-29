import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MarketingExpense from "@/models/MarketingExpense";
import MetaIntegration from "@/models/MetaIntegration";
import { getAuth } from '@/lib/firebase-admin';

// Facebook Marketing API endpoint
const FACEBOOK_GRAPH_API = "https://graph.facebook.com/v19.0";

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
        
        // Get integration settings
        const integration = await MetaIntegration.findOne({ storeId: 'default', isActive: true });
        
        if (!integration) {
            return NextResponse.json(
                { error: 'Meta integration not configured. Please connect your Meta account first.' },
                { status: 400 }
            );
        }
        
        const body = await req.json();
        const { dateRange } = body;
        
        const accessToken = integration.accessToken;
        let adAccountId = integration.adAccountId;
        
        // Sanitize Ad Account ID (defensive check for legacy data)
        adAccountId = adAccountId.toString().trim().replace(/^act_/i, '').replace(/\s+/g, '');
        
        // Calculate date range
        const now = new Date();
        let since, until;
        
        switch (dateRange) {
            case 'TODAY':
                since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                until = now;
                break;
            case 'THIS_WEEK':
                since = new Date(now);
                since.setDate(now.getDate() - now.getDay());
                since.setHours(0, 0, 0, 0);
                until = now;
                break;
            case 'THIS_MONTH':
                since = new Date(now.getFullYear(), now.getMonth(), 1);
                until = now;
                break;
            case 'LAST_MONTH':
                since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                until = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                since = new Date(now.getFullYear(), now.getMonth(), 1);
                until = now;
        }
        
        const sinceStr = since.toISOString().split('T')[0];
        const untilStr = until.toISOString().split('T')[0];
        
        // Fetch campaigns from Facebook Marketing API
        const campaignsUrl = `${FACEBOOK_GRAPH_API}/act_${adAccountId}/campaigns?fields=name,objective,status&access_token=${accessToken}`;
        const campaignsResponse = await fetch(campaignsUrl);
        const campaignsData = await campaignsResponse.json();
        
        if (campaignsData.error) {
            // Check if token expired
            if (campaignsData.error.code === 190) {
                return NextResponse.json(
                    { error: `Meta Access Token Expired: ${campaignsData.error.message}. Please reconnect your Meta account in Store Settings → Marketing Expenses.` },
                    { status: 401 }
                );
            }
            return NextResponse.json(
                { error: `Meta API Error: ${campaignsData.error.message}` },
                { status: 400 }
            );
        }
        
        const campaigns = campaignsData.data || [];
        const syncedCampaigns = [];
        
        // Fetch insights for each campaign
        for (const campaign of campaigns) {
            try {
                const insightsUrl = `${FACEBOOK_GRAPH_API}/${campaign.id}/insights?fields=campaign_name,spend,clicks,impressions,reach,actions&time_range={'since':'${sinceStr}','until':'${untilStr}'}&access_token=${accessToken}`;
                const insightsResponse = await fetch(insightsUrl);
                const insightsData = await insightsResponse.json();
                
                if (insightsData.data && insightsData.data.length > 0) {
                    const insights = insightsData.data[0];
                    
                    // Extract conversions from actions
                    let conversions = 0;
                    if (insights.actions) {
                        const purchaseAction = insights.actions.find(
                            action => action.action_type === 'purchase' || action.action_type === 'offsite_conversion.fb_pixel_purchase'
                        );
                        conversions = purchaseAction ? parseInt(purchaseAction.value) : 0;
                    }
                    
                    // Determine campaign type from objective
                    let campaignType = 'OTHER';
                    if (campaign.objective === 'OUTCOME_SALES' || campaign.objective === 'CONVERSIONS') {
                        campaignType = 'SALES';
                    } else if (campaign.objective === 'OUTCOME_AWARENESS' || campaign.objective === 'REACH') {
                        campaignType = 'AWARENESS';
                    } else if (campaign.objective === 'OUTCOME_ENGAGEMENT' || campaign.objective === 'OUTCOME_TRAFFIC') {
                        campaignType = 'CONSIDERATION';
                    }
                    
                    // Check if expense already exists for this campaign and exact date range
                    const existingExpense = await MarketingExpense.findOne({
                        campaignName: insights.campaign_name,
                        platform: 'FACEBOOK',
                        startDate: since,
                        endDate: until
                    });
                    
                    if (existingExpense) {
                        // Update existing expense
                        existingExpense.amount = parseFloat(insights.spend) || 0;
                        existingExpense.clicks = parseInt(insights.clicks) || 0;
                        existingExpense.impressions = parseInt(insights.impressions) || 0;
                        existingExpense.reach = parseInt(insights.reach) || 0;
                        existingExpense.conversions = conversions;
                        existingExpense.campaignType = campaignType;
                        existingExpense.notes = `Auto-synced from Meta Ads - Campaign ID: ${campaign.id} (Last updated: ${new Date().toISOString()})`;
                        await existingExpense.save();
                        syncedCampaigns.push(existingExpense);
                    } else {
                        // Create new expense
                        const newExpense = new MarketingExpense({
                            storeId: 'default',
                            campaignName: insights.campaign_name,
                            campaignType: campaignType,
                            platform: 'FACEBOOK',
                            amount: parseFloat(insights.spend) || 0,
                            clicks: parseInt(insights.clicks) || 0,
                            impressions: parseInt(insights.impressions) || 0,
                            reach: parseInt(insights.reach) || 0,
                            conversions: conversions,
                            startDate: since,
                            endDate: until,
                            notes: `Auto-synced from Meta Ads - Campaign ID: ${campaign.id}`
                        });
                        
                        await newExpense.save();
                        syncedCampaigns.push(newExpense);
                    }
                }
            } catch (error) {
                console.error(`Error fetching insights for campaign ${campaign.id}:`, error);
            }
        }
        
        // Update last synced time
        integration.lastSyncedAt = new Date();
        await integration.save();
        
        return NextResponse.json({
            success: true,
            message: `Successfully synced ${syncedCampaigns.length} campaigns from Meta`,
            campaigns: syncedCampaigns,
            totalSynced: syncedCampaigns.length
        });
        
    } catch (error) {
        console.error('Meta sync error:', error);
        return NextResponse.json(
            { error: 'Failed to sync with Meta. ' + error.message },
            { status: 500 }
        );
    }
}
