import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const defaultPrivacyPreferences = {
  profileVisibility: true,
  personalizedOffers: true,
  analyticsTracking: true,
  thirdPartySharing: false
};

export async function POST(request) {
  try {
    const { email, type, value } = await request.json();

    if (!email || !type || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: email, type, value' },
        { status: 400 }
      );
    }

    const validTypes = Object.keys(defaultPrivacyPreferences);
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid privacy type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      const newUser = new User({
        _id: `guest_${Date.now()}`,
        email,
        privacyPreferences: {
          ...defaultPrivacyPreferences,
          [type]: value
        }
      });

      await newUser.save();

      return NextResponse.json({
        success: true,
        message: `Privacy preference updated for ${email}`,
        preferences: newUser.privacyPreferences
      });
    }

    if (!user.privacyPreferences) {
      user.privacyPreferences = { ...defaultPrivacyPreferences };
    }

    user.privacyPreferences[type] = value;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Privacy preference updated for ${email}`,
      preferences: user.privacyPreferences
    });
  } catch (error) {
    console.error('Error updating privacy preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email }).select('privacyPreferences');

    if (!user) {
      return NextResponse.json({
        success: true,
        email,
        preferences: { ...defaultPrivacyPreferences },
        message: 'User not found, returning default privacy preferences'
      });
    }

    return NextResponse.json({
      success: true,
      email,
      preferences: user.privacyPreferences || { ...defaultPrivacyPreferences }
    });
  } catch (error) {
    console.error('Error retrieving privacy preferences:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve privacy preferences' },
      { status: 500 }
    );
  }
}
