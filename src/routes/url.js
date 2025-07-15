import express from 'express';
import { nanoid } from 'nanoid';
import { Url } from '../models/url.js';
import { config } from '../config/config.js';
const router = express.Router();

// Welcome route
router.get('/', (req, res) => {
    res.send('Welcome to the URL Shortener API!');
});

// Create short URL
router.post('/shorturls', async (req, res) => {
    try {
        const { originalUrl, validity: expiresAt, shortCode: customShortCode } = req.body;
        
        // Validate originalUrl
        if (!originalUrl) {
            return res.status(400).json({ error: 'Original URL is required' });
        }

        try {
            new URL(originalUrl);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // check if the url is expired or not 
        if (expiresAt && new Date(expiresAt) <= new Date()) {
            return res.status(400).json({ error: 'Expiration date must be in the future' });
        }

        // If custom shortCode is provided, check if it's already taken
        if (customShortCode) {
            const existingCustomCode = await Url.findOne({ shortCode: customShortCode });
            if (existingCustomCode) {
                return res.status(409).json({ 
                    error: 'Custom short code is already in use',
                    suggestion: nanoid(7) // Provide a suggested alternative
                });
            }
        }

        // Check if URL already exists
        const existingUrl = await Url.findOne({ originalUrl });
        if (existingUrl) {
            return res.json(existingUrl);
        }

        // Generate or use custom short code
        const shortCode = customShortCode || nanoid(7);
        
        const url = new Url({
            originalUrl,
            shortCode,
            expiresAt: expiry ? new Date(expiry) : undefined,
            isActive: true,
            createdAt: new Date(),
        });

        await url.save();
        res.json(url);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Redirect to original URL
router.get('/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        const url = await Url.findOne({ shortCode });
        
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        if (!url.isActive || new Date() > url.expiresAt) {
            return res.status(410).json({ error: 'URL has expired' });
        }

        // Create click detail record
        const clickDetail = {
            timestamp: new Date(),
            userAgent: req.headers['user-agent'] || 'Unknown',
            referer: req.headers['referer'] || null,
            ipAddress: req.ip || req.connection.remoteAddress,
            location: {
                // You would typically use a geo-ip service here
                country: req.headers['cf-ipcountry'] || 'Unknown',
                city: 'Unknown',
                region: 'Unknown'
            }
        };

        // Update URL with click details
        url.totalClicks++;
        url.clickDetails.push(clickDetail);
        await url.save();

        res.redirect(url.originalUrl);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get detailed URL statistics
router.get('/shorturls/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        const url = await Url.findOne({ shortCode });
        
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        // Group clicks by date
        const clicksByDate = url.clickDetails.reduce((acc, click) => {
            const date = click.timestamp.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = 0;
            acc[date]++;
            return acc;
        }, {});

        // Group clicks by country
        const clicksByCountry = url.clickDetails.reduce((acc, click) => {
            const country = click.location.country;
            if (!acc[country]) acc[country] = 0;
            acc[country]++;
            return acc;
        }, {});

        // Get referrer statistics
        const referrerStats = url.clickDetails.reduce((acc, click) => {
            const referer = click.referer || 'Direct';
            if (!acc[referer]) acc[referer] = 0;
            acc[referer]++;
            return acc;
        }, {});

        res.json({
            urlInfo: {
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                fullShortUrl: `${config.baseUrl}/${url.shortCode}`,
                createdAt: url.createdAt,
                expiresAt: url.expiresAt,
                isActive: url.isActive
            },
            clickStats: {
                totalClicks: url.totalClicks,
                clicksByDate,
                clicksByCountry,
                referrerStats
            },
            recentClicks: url.clickDetails
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10) // Get last 10 clicks
                .map(click => ({
                    timestamp: click.timestamp,
                    location: click.location,
                    userAgent: click.userAgent,
                    referer: click.referer
                }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
