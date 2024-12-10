const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://szahraak:NFwmNWLwde4LtZFy@chatwa.ndtyu.mongodb.net/WALogger?retryWrites=true&w=majority');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
