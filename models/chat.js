const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  _data: { type: Object },
  mediaKey: { type: String },
  localId: {
    fromMe: { type: Boolean, required: true },
    remote: { type: String, required: true },
    id: { type: String, required: true },
    participant: { type: String },
    _serialized: { type: String, required: true },
  },
  ack: { type: Number, default: 0 },
  hasMedia: { type: Boolean, default: false },
  body: { type: String },
  type: { type: String, required: true },
  timestamp: { type: Number, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  author: { type: String },
  deviceType: { type: String, required: true },
  isForwarded: { type: Boolean, default: false },
  forwardingScore: { type: Number, default: 0 },
  isStatus: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },
  broadcast: { type: Boolean },
  fromMe: { type: Boolean, required: true },
  hasQuotedMsg: { type: Boolean, default: false },
  hasReaction: { type: Boolean, default: false },
  duration: { type: Number },
  location: { type: String },
  vCards: [{ type: String }],
  inviteV4: { type: String },
  mentionedIds: [{ type: String }],
  groupMentions: [{ type: String }],
  orderId: { type: String },
  token: { type: String },
  isGif: { type: Boolean, default: false },
  isEphemeral: { type: Boolean },
  links: [{ type: String }]
});

module.exports = mongoose.model('Message', MessageSchema);