// const mongoose = require("mongoose");

// async function connectDB() {
//   const uri = process.env.MONGO_URI;
//   if (!uri) throw new Error("MONGO_URI is not set in .env");

//   mongoose.set("strictQuery", true);
//   await mongoose.connect(uri);
//   console.log(`MongoDB connected -> ${mongoose.connection.name}`);

//   mongoose.connection.on("error", (err) => {
//     console.error("MongoDB connection error:", err);
//   });
// }

// module.exports = connectDB;

const mongoose=require('mongoose')

async function connectDB(){
    await mongoose.connect(process.env.MONGO_URI);
    console.log('app connected');
}

// async function connectDB2(){
//     await mongoose.connect(process.env.SESSION);
// }

module.exports=connectDB 
