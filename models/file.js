import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    filename: String,
    contentType: String,
    length: Number,
    chunkSize: Number,
    uploadDate: Date,
    metadata: Object
});

export default mongoose.model('File', fileSchema, 'fs.files'); // Importante: usar a coleção fs.files
