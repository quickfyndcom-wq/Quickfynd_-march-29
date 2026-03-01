import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const mongoUriRaw =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    "";
  const MONGODB_URI = mongoUriRaw.replace(/^['\"]|['\"]$/g, '').trim();

  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI (or MONGO_URI/MONGO_URL) in runtime environment variables");
  }
  if (cached.conn) {
    return cached.conn;
  }
  
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      waitQueueTimeoutMS: 10000,
    };
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✓ MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('✗ MongoDB connection error:', error.message);
        cached.promise = null;
        throw error;
      });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export default dbConnect;
