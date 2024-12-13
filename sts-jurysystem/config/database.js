import mongoose from "mongoose";

let connected = false;

const connectDB = async () => {
    mongoose.set('strictQuery', true)

    if(connected){
        console.log('MongoDB is Connected')
    }

    try{
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('CONNECT')
        connected = true
    } catch (err) {
        console.log(err)
    }
}

export default connectDB;