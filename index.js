const express = require("express");
const cors = require("cors");
const axios = require('axios');
const multer = require('multer');
const connectDB = require('./config/db');
const Message = require("./models/chat");
const File = require("./models/media");
const Contact = require("./models/contact")
const { default: mongoose } = require("mongoose");
const port = 3003;
const TOKEN_ACCESS = "TlGZopTbO716Qb0Sp3kdRd2bkhtjx92L1roc";

connectDB();

const app = express();
app.use(cors({
  origin: '*', // Izinkan dari semua domain (atau tentukan domain frontend Anda)
}));
app.use(express.json());

app.listen(port, () => {
    console.log(`Backend menggunakan express di port ${port}`);
});

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader("Content-Security-Policy", "default-src 'self'; font-src 'self' chrome-extension://*");
    next();
});

const upload = multer({ storage: multer.memoryStorage() }); // Simpan file di memori sementara

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

// Endpoint untuk mengirim metadata file ke MongoDB dan upload data ke repo GitHub
app.post("/api/send-file", upload.array('files'), async (req, res) => {
    try {
        const { chatroomID, timestamp, total, files } = req.body;
        const key = `${chatroomID}_${timestamp}`;
        const uploadedFiles = [];

        // Validasi file
        if (!req.files || req.files.length === 0) {
            console.error("No files provided");
            return res.status(400).json({ error: 'No files provided' });
        }

        for (const file of files) {
            console.log("Processing file:", file.filename);
            const { filename, content, mimetype, size } = file;
            const fileBuffer = Buffer.from(content, 'base64');
            const fileStoredName = `${Date.now()}_${file.originalname}`;

            // Upload file ke GitHub
            const githubPath = `uploads/${fileStoredName}`;
            const githubResponse = await axios.put(
                `https://api.github.com/repos/oceanite/wa-logger-backend/contents/${githubPath}`,
                {
                    message: `Upload file ${fileStoredName}`,
                    content: fileBuffer.toString('base64'),
                },
                {
                    headers: {
                        Authorization: `Bearer ghp_${TOKEN_ACCESS}`,
                    },
                }
            );
            console.log("GitHub API response:", githubResponse.data);

            const githubFilePath = githubResponse.data.content.download_url;

            uploadedFiles.push({
                filename: filename,
                storedName: fileStoredName,
                path: githubFilePath,
                mimetype: mimetype,
                size: size,
                uploadedAt: timestamp,
                chatroomID: chatroomID,
                mediaKey: key,
                fileIndex: index,
                indexTotal: total
            });
        }

        // Simpan metadata ke MongoDB
        await File.insertMany(uploadedFiles);

        res.status(201).json({
            success: true,
            message: 'Files uploaded to repo and metadata processed successfully',
            data: uploadedFiles,
        });
    } catch (error) {
        console.error('Error uploading and processing file metadata:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint download file
app.get('/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const newName = filename.split('-').slice(1).join('-');
    const githubURL = `https://raw.githubusercontent.com/oceanite/wa-logger-backend/main/uploads/${filename}`;

    try {
        // Ambil file dari github
        const response = await axios.get(githubURL, { responseType: 'arraybuffer' });

        // Kirim file ke klien
        res.setHeader('Content-Disposition', `attachment; filename="${newName}"`);
        res.setHeader('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error('Error downloading file:', error);

        if (error.response && error.response.status === 404) {
            return res.status(404).send('File not found on GitHub.');
        }

        res.status(500).send('Error downloading file.');
    }
});

module.exports = app;
