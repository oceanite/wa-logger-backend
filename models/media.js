const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    url: { type: String, required: true }, // Path or URL to the file
    mimetype: { type: String, required: true }, // MIME type of the file
    size: { type: Number, required: true }, // File size in bytes
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Media', MediaSchema);