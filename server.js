const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Route 1: Fetch Video Details (Thumbnail & Title)
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const output = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        res.json({
            title: output.title,
            thumbnail: output.thumbnail,
            duration: output.duration_string,
            url: url
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch video information.' });
    }
});

// Route 2: Download Stream
app.get('/api/download', async (req, res) => {
    const { url, format } = req.query;
    if (!url || !format) return res.status(400).send('Missing parameters');

    try {
        const isMp3 = format === 'mp3';
        
        // Fetch info for the file title sanitization
        const info = await youtubedl(url, { dumpSingleJson: true });
        const safeTitle = info.title.replace(/[^\w\s\-_]/gi, '');
        
        res.header('Content-Disposition', `attachment; filename="${safeTitle}.${isMp3 ? 'mp3' : 'mp4'}"`);

        const options = isMp3 ? {
            extractAudio: true,
            audioFormat: 'mp3',
            output: '-',
        } : {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            output: '-',
        };

        const process = youtubedl.exec(url, options);
        
        process.stdout.pipe(res);
        
        process.on('error', (err) => {
            console.error('Download error:', err);
            if (!res.headersSent) res.status(500).send('Download failed');
        });

    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
