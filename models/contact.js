const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    uid: { type: String, required: true },
    name: { type: String, required: true },
    isGroup: { type: Boolean, required: true}
});

module.exports = mongoose.model('Contact', ContactSchema);