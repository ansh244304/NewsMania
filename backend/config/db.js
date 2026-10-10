import mongoose from "mongoose";
import dns from "node:dns/promises";

const connectDB = async () => {
    try {
        const dnsServers = (process.env.MONGO_DNS_SERVERS || "8.8.8.8,1.1.1.1")
            .split(",")
            .map((server) => server.trim())
            .filter(Boolean);

        dns.setServers(dnsServers);
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    }
};

export default connectDB;
