const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://diyorbekoralov93_db_user:6L36yvmJe9hDFlae@cluster0.dseaovo.mongodb.net/?appName=Cluster0';

    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB ulandi');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error(`❌ MongoDB xatosi: ${e.message}`);
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;

