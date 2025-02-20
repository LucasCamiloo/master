import mongoose from 'mongoose';

const adSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    content: [{
        type: String,
        required: true
    }],
    imageUrl: {
        type: String,
        default: null
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add virtual for full image URL
adSchema.virtual('fullImageUrl').get(function() {
    if (!this.imageUrl) return null;
    if (this.imageUrl.startsWith('http')) return this.imageUrl;
    return `${process.env.MASTER_URL || 'https://master-teste.vercel.app'}${this.imageUrl.startsWith('/') ? '' : '/'}${this.imageUrl}`;
});

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
