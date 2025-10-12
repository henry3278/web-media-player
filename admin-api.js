const express = require('express');
const router = express.Router();
const mediaGrabber = require('./grabber');

router.get('/config', (req, res) => {
    res.json(mediaGrabber.config);
});

router.post('/config', (req, res) => {
    mediaGrabber.updateConfig(req.body);
    res.json({ success: true, config: mediaGrabber.config });
});

router.get('/stats', (req, res) => {
    res.json(mediaGrabber.getServiceStatus());
});

router.get('/media/random', async (req, res) => {
    try {
        const media = await mediaGrabber.getRandomMedia();
        res.json({ success: true, media });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

router.post('/test', async (req, res) => {
    try {
        const media = await mediaGrabber.getRandomMedia();
        res.json({ success: true, count: media ? 1 : 0 });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
