import imagekit from "@/configs/imageKit";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/firebase-admin";
import authSeller from "@/middlewares/authSeller";

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        if (!authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.replace('Bearer ', '');
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: 'Forbidden - No store access' }, { status: 403 });
        }

        const authenticationParameters = imagekit.getAuthenticationParameters();
        return NextResponse.json(authenticationParameters, { status: 200 });
    } catch (error) {
        console.error("Error generating ImageKit auth:", error);
        return NextResponse.json({ error: "Failed to generate authentication" }, { status: 500 });
    }
}
