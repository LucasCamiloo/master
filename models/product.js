import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
        maxLength: 180
    },
    price: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: null
    },
    category: {
        type: String,
        required: true,
        default: 'Outros' // Adiciona uma categoria padrão
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add a virtual for full image URL
productSchema.virtual('fullImageUrl').get(function() {
    if (!this.imageUrl) return null;
    if (this.imageUrl.startsWith('http')) return this.imageUrl;
    return `${process.env.MASTER_URL || 'https://master-teal.vercel.app'}${this.imageUrl.startsWith('/') ? '' : '/'}${this.imageUrl}`;
});

const Product = mongoose.model('Product', productSchema);

export default Product;
