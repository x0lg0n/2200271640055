import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/url-shortener',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};
