import express from 'express';
import { nanoid } from 'nanoid';
import { Url } from '../models/url.js';
import { config } from '../config/config.js';
const router = express.Router();

// Welcome route
router.get('/', (req, res) => {
    res.send('Welcome to the URL Shortener API! Use POST /api/shorten to create a short URL.');
});

// Create short URL
router.post('/shorturls', async (req, res) => {
    try {
        const { originalUrl, validity, shortcode } = req.body;
        
        // Check if URL already exists
        const existingUrl = await Url.findOne({ originalUrl });
        if (existingUrl) {
            return res.json(existingUrl);
        }

        // Create new short URL
        const urlId = nanoid(7);
        const shortUrl = `${config.baseUrl}/${urlId}`;
        
        const url = new Url({
            shortUrl,
            expiry,
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
router.get('/stats/:shortCode', async (req, res) => {
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
