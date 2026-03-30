import imagekit from "@/configs/imageKit";
import { getAuth } from "@/lib/firebase-admin";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const formData = await request.formData();
    let files = formData.getAll('files');
    if (!files || files.length === 0) {
      const singleFile = formData.get('file');
      files = singleFile ? [singleFile] : [];
    }
    
    if (!files || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedUrls = [];
    
    for (const file of files) {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Determine folder based on file type
      const isVideo = file.type.startsWith('video/');
      const folder = isVideo ? 'returns/videos' : 'returns/images';
      const fileName = `return_${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
      
      // Upload to ImageKit
      const response = await imagekit.upload({
        file: buffer,
        fileName: fileName,
        folder: folder
      });
      
      // Return optimized URL
      const transformation = isVideo 
        ? [] // No transformation for videos
        : [{ quality: "auto" }, { format: "webp" }, { width: "800" }];
      
      const url = imagekit.url({
        path: response.filePath,
        transformation: transformation
      });
      
      uploadedUrls.push(url);
    }

    return Response.json({ 
      success: true, 
      urls: uploadedUrls,
      url: uploadedUrls[0] || null
    });
  } catch (error) {
    console.error('File upload error:', error);
    return Response.json({ 
      error: error.message || "Failed to upload files" 
    }, { status: 500 });
  }
}
