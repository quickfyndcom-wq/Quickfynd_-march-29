import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request){
    try {
        const secret = process.env.STRIPE_SECRET_KEY
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
        if (!secret || !webhookSecret) {
            return NextResponse.json({ error: 'Stripe is disabled (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)' }, { status: 503 })
        }

        // Initialize Stripe lazily only when configured
        const stripe = new Stripe(secret)
        const body = await request.text()
        const sig = request.headers.get('stripe-signature')

        const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

        const handlePaymentIntent = async (paymentIntentId, isPaid) => {
            const session = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            });

            const {orderIds, userId, appId} = session.data[0].metadata;
            
            if(appId !== 'Qui'){
                return NextResponse.json({received: true, message: 'Invalid app id'});
            }

            const orderIdsArray = orderIds.split(',');
            await dbConnect();

            if(isPaid){
                // mark order as paid
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await Order.findByIdAndUpdate(orderId, {
                        isPaid: true
                    });
                }));
                // delete cart from user
                await User.findOneAndUpdate({ firebaseUid: userId }, {
                    cart: {}
                });
            }else{
                 // delete order from db
                 await Promise.all(orderIdsArray.map(async (orderId) => {
                    await Order.findByIdAndDelete(orderId);
                 }));
            }
        };

    
        switch (event.type) {
            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true)
                break;
            }

            case 'payment_intent.canceled': {
                await handlePaymentIntent(event.data.object.id, false)
                break;
            }
        
            default:
                console.log('Unhandled event type:', event.type)
                break;
        }

        return NextResponse.json({received: true})
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

export const config = {
    api: { bodyparser: false }
}