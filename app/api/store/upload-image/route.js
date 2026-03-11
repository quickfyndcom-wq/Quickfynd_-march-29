import authSeller from "@/middlewares/authSeller";
import imagekit from "@/configs/imageKit";
import { getAuth } from "@/lib/firebase-admin";


export async function POST(request) {
    try {
        // Get userId from Authorization header (Firebase ID token)
        const authHeader = request.headers.get('authorization') || '';
        let userId = null;
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            try {
                const decodedToken = await getAuth().verifyIdToken(token);
                userId = decodedToken.uid || null;
            } catch (error) {
                console.error('Upload auth verification failed:', error?.message || error);
                return Response.json({ error: "Unauthorized" }, { status: 401 });
            }
        }
        if (!userId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const storeId = await authSeller(userId);
        if (!storeId) {
            return Response.json({ error: "Store not approved or not found" }, { status: 403 });
        }

        let formData;
        try {
            formData = await request.formData();
        } catch (parseError) {
            return Response.json({
                error: 'Failed to parse upload body as FormData.'
            }, { status: 400 });
        }
        const image = formData.get('image');
        const type = formData.get('type'); // 'logo' or 'banner'
        
        if (!image) {
            return Response.json({ error: "No image provided" }, { status: 400 });
        }
        
        // Convert file to buffer
        const buffer = Buffer.from(await image.arrayBuffer());
        const isVideo = typeof image?.type === 'string' && image.type.startsWith('video/');
        
        // Determine folder and transformation based on type
        const folder = isVideo
            ? 'products/videos'
            : type === 'logo'
                ? 'stores/logos'
                : type === 'banner'
                    ? 'stores/banners'
                    : 'products/descriptions';
        const fileName = type ? `${type}_${Date.now()}_${image.name}` : `desc_${Date.now()}_${image.name}`;
        
        // Upload to ImageKit
        const response = await imagekit.upload({
            file: buffer,
            fileName: fileName,
            folder: folder
        });
        
        // Return transformed URL based on type
        const url = isVideo
            ? response.url
            : type === 'banner'
            ? response.url
            : imagekit.url({
                path: response.filePath,
                transformation: type === 'logo'
                    ? [{ quality: "auto" }, { format: "webp" }, { width: "200", height: "200" }]
                    : [{ quality: "auto" }, { format: "webp" }, { width: "800" }]
            });
        return Response.json({ 
            success: true, 
            url: url 
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return Response.json({ 
            error: error.message || "Failed to upload image" 
        }, { status: 500 });
    }
}
