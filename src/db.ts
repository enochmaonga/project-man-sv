import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const connUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_man';
    console.log(`Connecting to MongoDB at: ${connUri}...`);
    await mongoose.connect(connUri);
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
