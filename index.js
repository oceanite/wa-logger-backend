const express = require("express");
const cors = require("cors");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const Message = require("./models/chat");
const File = require("./models/media");
const Contact = require("./models/contact")
const { default: mongoose } = require("mongoose");
const port = 3003;

connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Atur asal yang diperbolehkan
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    req.url = decodeURIComponent(req.url);
    next();
});

app.listen(port, () => {
    console.log(`Backend menggunakan express di port ${port}`);
});

// Configure Multer to save files to a specific folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads")); // Folder tempat menyimpan file
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname); // Penamaan unik file
    },
});
const upload = multer({ storage });

// Menyajikan folder uploads sebagai file statis
app.use('/uploads', express.static('uploads'));

app.get("/api/contacts", async (req, res) => {
    try {
        const contacts = await Contact.find({});

        if (contacts.length === 0) {
            return res.status(404).json({ message: "No contact found" });
        }

        res.status(200).json(contacts);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching contact info", error });
    }
});

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
        const chatHistory = await Message.aggregate([
            {
                $match: { "localId.remote": remote }, // Filter by remote id
            },
            {
                $lookup: {
                    from: "files", // Nama koleksi File di MongoDB
                    localField: "mediaKey", // Kolom di koleksi Message
                    foreignField: "mediaKey", // Kolom di koleksi File
                    as: "files" // Nama field baru untuk hasil join
                }
            },
            {
                $project: {
                    _id: 0,                // Exclude MongoDB's default _id field
                    localId: 1,               // Include id field
                    _data: {
                        notifyName: 1,
                        quotedMsg: 1,
                        quotedStanzaID: 1,
                        quotedParticipant: 1
                    },  
                    body: 1,             // Include message body
                    type: 1,             // Include type
                    timestamp: 1,        // Include timestamp
                    from: 1,             // Include sender
                    to: 1,               // Include receiver
                    author: 1,           // Include author
                    fromMe: 1,            // Include boolean fromMe
                    hasQuotedMsg: 1,
                    hasMedia: 1,
                    mediaKey: 1,
                    files: 1
                }
            }
        ])
        .sort({ "timestamp": 1 }); // Sort by timestamp ascending

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
                    hasMedia: "$lastMessage.hasMedia",
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

// Endpoint untuk mengirim message
app.post("/api/send", async (req, res) => {
    try {
        const messageData = req.body;

        // Validate required fields
        if (messageData.hasMedia){
            if ( !messageData.timestamp ){
                return res.status(400).json({ error: 'Missing timestamp: hasMedia' });
            } else if ( !messageData.from ){
                return res.status(400).json({ error: 'Missing from: hasMedia' });
            } else if ( !messageData.to ){
                return res.status(400).json({ error: 'Missing to: hasMedia' });
            }
        } else {
            if (!messageData.body){
                return res.status(400).json({ error: 'Missing body' });
            } else if ( !messageData.timestamp ){
                return res.status(400).json({ error: 'Missing timestamp' });
            } else if ( !messageData.from ){
                return res.status(400).json({ error: 'Missing from' });
            } else if ( !messageData.to ){
                return res.status(400).json({ error: 'Missing to' });
            }
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

// Endpoint untuk mengirim file
app.post("/api/send-file", upload.array('files'), async (req, res) => {
    try {
        const { chatroomID, timestamp, total } = req.body;
        const key = `${chatroomID}_${timestamp}`;

        // Validate file
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const files = req.files.map((file, index) => ({
            filename: file.originalname,
            storedName: file.filename,
            path: `http://localhost:3003/uploads/${file.filename}`, // Menggunakan filename yang sudah diubah sebelumnya
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: timestamp,
            chatroomID: chatroomID,
            mediaKey: key,
            fileIndex: index,
            indexTotal: total
        }));        

        await File.insertMany(files);

        // Send success response
        res.status(201).json({
            success: true,
            message: 'Files uploaded successfully',
            data: files
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint untuk mengambil file dari database
app.get("/api/files/:chatroomID", async (req, res) => {
    try {
        const { chatroomID } = req.params;

        const files = await File.find({ chatroomID }).sort({ "uploadedAt": 1 });;

        if (files.length === 0) {
            return res.status(404).json({ message: "No files found for this chatroom" });
        }

        res.status(200).json(files);
    } catch {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint download file
app.get('/download/:filename', (req, res) => {
    const file = path.join(__dirname, 'uploads', req.params.filename);
    const newName = req.params.filename.split('-').slice(1).join('-');

    // Cek apakah file ada sebelum mencoba untuk mengunduh
    fs.access(file, fs.constants.F_OK, (err) => {
        if (err) {
            // Jika file tidak ditemukan, kirimkan respons error dan hentikan eksekusi lebih lanjut
            return res.status(404).send("File not found.");
        }

        // Kirimkan file jika ada
        res.download(file, newName, (err) => {
            if (err) {
                // Jika ada kesalahan saat pengunduhan, kirimkan respons error dan hentikan eksekusi lebih lanjut
                return res.status(500).send("Error downloading file.");
            }
        });
    });
});

module.exports = app;
