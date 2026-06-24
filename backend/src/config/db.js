import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    const connectionInstance = await mongoose.connect(mongodbUri);
    console.log(`MongoDB connected! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection FAILED: ', error);
    process.exit(1);
  }
};

export default connectDB;
