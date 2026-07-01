const express = require('express');
const ytdl = require('@distube/ytdl-core'); // Standard library up-to-date with current stream encodings
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serves your index.html / script.js files

app.post('/api/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'Invalid URL' });
        
        const info = await ytdl.getInfo(url);
        res.json({ title: info.videoDetails.title });
    } catch (err) {
        res.status(500).json({ error: 'Failed to access video information' });
    }
});

app.get('/api/download', async (req, res) => {
    try {
        const { url } = req.query;
        const info = await ytdl.getInfo(url);
        const cleanTitle = info.videoDetails.title.replace(/[^\x00-\x7F]/g, ""); // strip non-ascii

        // CRITICAL HEADERS: Tells the web page to handle this strictly as an incoming file download attachment
        res.header('Content-Disposition', `attachment; filename="${cleanTitle}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        // Streams raw file directly into the client's automated download stream
        ytdl(url, { quality: 'highestvideo' }).pipe(res);
    } catch (err) {
        res.status(500).send('Download stream failed processing.');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server executing successfully on port ${PORT}`));
