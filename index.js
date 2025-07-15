import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import urlRoutes from './src/routes/url.js';
import { config } from './src/config/config.js';

const app = express();

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(config.mongoUri)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// Routes
app.use('/', urlRoutes);

// Start the server
app.listen(config.port, () => {
    console.log(`Server is running on ${config.baseUrl}`);
});
