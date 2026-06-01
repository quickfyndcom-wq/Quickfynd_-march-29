import connectDB from '@/lib/mongodb';
import { NextResponse } from 'next/server';

/**
 * POST /api/analytics/track-attribution
 * Tracks visitor attribution data from ads
 * Stores: source, medium, campaign, referrer, timestamp
 */
export async function POST(request) {
  try {
    const mongoose = await connectDB();
    
    const body = await request.json();
    const { source, medium, campaign, referrer, timestamp } = body;

    // Get database connection
    const db = mongoose?.connection?.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Store attribution record
    const attributionCollection = db.collection('ad_attributions');
    const result = await attributionCollection.insertOne({
      source: source || 'direct',
      medium: medium || 'direct',
      campaign: campaign || 'none',
      referrer: referrer || 'direct',
      timestamp: new Date(timestamp),
      createdAt: new Date(),
      converted: false, // Will be updated to true when purchase is made
      conversionValue: 0,
      conversionDate: null
    });

    return NextResponse.json({
      success: true,
      attributionId: result.insertedId,
      message: 'Attribution tracked'
    });
  } catch (error) {
    console.error('Attribution tracking error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/track-attribution
 * Returns attribution statistics
 * Query params: startDate, endDate, source, medium
 */
export async function GET(request) {
  try {
    const mongoose = await connectDB();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const source = searchParams.get('source');
    const medium = searchParams.get('medium');

    const db = mongoose?.connection?.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Build filter
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (source) filter.source = source;
    if (medium) filter.medium = medium;

    const attributionCollection = db.collection('ad_attributions');

    // Get attribution stats
    const stats = await attributionCollection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            source: '$source',
            medium: '$medium',
            campaign: '$campaign'
          },
          totalVisits: { $sum: 1 },
          conversions: { $sum: { $cond: ['$converted', 1, 0] } },
          totalConversionValue: { $sum: '$conversionValue' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVisits: 1,
          conversions: 1,
          conversionRate: {
            $cond: [
              { $eq: ['$totalVisits', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$conversions', '$totalVisits'] }, 100] }, 2] }
            ]
          },
          totalConversionValue: 1,
          avgValue: {
            $cond: [
              { $eq: ['$conversions', 0] },
              0,
              { $round: [{ $divide: ['$totalConversionValue', '$conversions'] }, 2] }
            ]
          }
        }
      },
      { $sort: { totalVisits: -1 } }
    ]).toArray();

    return NextResponse.json({
      stats,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Attribution stats error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
