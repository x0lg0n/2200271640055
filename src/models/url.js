import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    userAgent: {
        type: String,
        required: true
    },
    referer: {
        type: String,
        default: null
    },
    ipAddress: {
        type: String,
        required: true
    },
    location: {
        country: String,
        city: String,
        region: String
    }
});

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                try {
                    new URL(v);
                    return true;
                } catch (error) {
                    return false;
                }
            },
            message: 'Please enter a valid URL'
        }
    },
    
    shortCode: {
        type: String,
        unique: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    totalClicks: {
        type: Number,
        default: 0,
        min: 0
    },
    clickDetails: [clickSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 30*60*1000) // 30 minutes from creation
    }
}, {
    timestamps: true    // Automatically add updatedAt field
});

export const Url = mongoose.model('Url', urlSchema);
