const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    updatedName: { type: String, required: true },
    path: { type: String, required: true }, // File path
    mimetype: { type: String, required: true }, // MIME type of the file
    size: { type: Number, required: true }, // File size in bytes
    uploadedAt: { type: Number, required: true },
    chatroomID: { type: String, required: true },
    mediaKey: { type: String, required: true }
});

module.exports = mongoose.model('File', FileSchema);