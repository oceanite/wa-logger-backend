const express = require("express");
const cors = require("cors");
const connectDB = require('./config/db');
const Message = require("./models/chat");
const Media = require("./models/media");
const { default: mongoose } = require("mongoose");
const multer = require('multer');
const path = require('path');
const port = 3003;

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.listen(port, () => {
    console.log(`Backend menggunakan express di port ${port}`);
});

// Configure Multer to save files to a specific folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Folder to store files
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`); // Unique file name
    }
});

const upload = multer({ storage });

// Endpoint untuk mendapatkan semua riwayat chat
app.get("/api/chats", async (req, res) => {
    try {
        const chats = await Message.find({});

        if (chats.length === 0) {
            return res.status(404).json({ message: "No chats found" });
        }

        res.status(200).json(chats);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching chat history", error });
    }
});

app.get("/api/chats/:remote", async (req, res) => {
    try {
        const { remote } = req.params; // Get remote ID from the request params

        // Query database for chat history based on remote id
        const chatHistory = await Message.find(
            { "localId.remote": remote }, // Filter by remote id
            {
                _id: 0,                // Exclude MongoDB's default _id field
                "localId": 1,               // Include id field
                "_data": {
                    "notifyName": 1,
                    "quotedMsg": 1,
                    "quotedStanzaID": 1,
                    "quotedParticipant": 1
                },  
                "body": 1,             // Include message body
                "type": 1,             // Include type
                "timestamp": 1,        // Include timestamp
                "from": 1,             // Include sender
                "to": 1,               // Include receiver
                "author": 1,           // Include author
                "fromMe": 1,            // Include boolean fromMe
                "hasQuotedMsg": 1
            }
        ).sort({ "timestamp": 1 }); // Sort by timestamp ascending

        // Check if chat history is found
        if (chatHistory.length === 0) {
            return res.status(404).json({ message: `No messages/chat history found for id ${remote}` });
        }

        res.status(200).json(chatHistory);
    } catch (error) {
        console.error(`Error fetching chat history for id ${remote}:`, error); // Log the error
        res.status(500).json({
            message: `Error fetching chat history for id ${remote}`,
            error: error.message // Optionally include the error message in the response
        });
    }
});

// Endpoint untuk mendapatkan chatrooms
app.get("/api/chatrooms", async (req, res) => {
    try {
        const chatrooms = await Message.aggregate([
            {
                // Sorting message dari yang terlawas
                $sort: {
                    "timestamp": 1,
                }
            },
            {
                // Group data berdasarkan id.remote
                $group: {
                    _id: "$localId.remote",
                    lastMessage: { $last: "$$ROOT" },
                    messages: { $push: "$$ROOT" }
                }
            },
            {
                // Project menjadi struktur data json yang diinginkan
                $project: {
                    _id: 0,
                    chatID: "$_id",
                    notifyName: "$messages._data.notifyName",
                    last_time: "$lastMessage.timestamp",
                    last_chat: "$lastMessage.body",
                    messages: "$messages"
                }
            },
            {
                // Sorting chatroom dari yang terbaru
                $sort: {
                    last_time: -1,
                }
            }
        ]);

        if (chatrooms.length === 0) {
            return res.status(404).json({ message: "No chatrooms found" });
        }

        res.status(200).json(chatrooms);
    } catch (error) {
        res.status(500).json({ message: `Error fetching chatroom`, error });
    }
});

// Endpoint untuk mengirim
app.post("/api/send", async (req, res) => {
    try {
        const messageData = req.body.message;

        // Validate required fields
        if (!messageData.body || !messageData.timestamp || !messageData.from || !messageData.to) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create a new message document
        const newMessage = new Message(messageData);

        // Save the message
        await newMessage.save();

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: newMessage
        });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = app;
