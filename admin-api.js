const express = require('express');
const router = express.Router();
const imageGrabber = require('./grabber');
const fs = require('fs');
const path = require('path');

router.get('/config', (req, res) => {
  res.json(imageGrabber.getConfig());
});

router.post('/config', (req, res) => {
  try {
    imageGrabber.updateConfig(req.body);
    res.json({ success: true, message: '配置已更新' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { website, selectors, excludeKeywords } = req.body;
    const testConfig = { 
      ...imageGrabber.getConfig(),
      targetWebsite: website,
      imageSelectors: selectors || imageGrabber.getConfig().imageSelectors,
      excludeKeywords: excludeKeywords || imageGrabber.getConfig().excludeKeywords
    };
    
    const images = await imageGrabber.testConnection(testConfig);
    res.json({ 
      success: true, 
      imageCount: images.length,
      sampleImages: images.slice(0, 5)
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get('/status', (req, res) => {
  res.json({
    enabled: imageGrabber.isEnabled(),
    lastUpdate: imageGrabber.getLastUpdate(),
    cacheSize: imageGrabber.getCacheSize(),
    config: imageGrabber.getConfig()
  });
});

module.exports = router;
