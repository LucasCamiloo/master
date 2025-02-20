import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assuming you have a File model defined
const FileSchema = new mongoose.Schema({
    filename: String,
    contentType: String,
    buffer: Buffer
});

const File = mongoose.model('File', FileSchema);

const fileService = {
    async uploadFile(buffer, filename, contentType) {
        const file = new File({
            filename,
            contentType,
            buffer
        });
        await file.save();
        return file;
    },

    async getFile(fileId) {
        try {
            const file = await File.findById(fileId);
            if (!file) {
                throw new Error('File not found');
            }
            return file;
        } catch (error) {
            console.error('Error getting file:', error);
            throw error;
        }
    },

    async getDefaultImage() {
        try {
            // Read the default image from your assets
            const defaultImagePath = path.join(__dirname, '..', 'public', 'default-product.png');
            const buffer = await fs.readFile(defaultImagePath);
            return {
                buffer,
                contentType: 'image/png'
            };
        } catch (error) {
            console.error('Error getting default image:', error);
            throw error;
        }
    }
};

export default fileService;
