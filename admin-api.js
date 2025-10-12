const express = require('express');
const router = express.Router();
const imageGrabber = require('./grabber');

router.get('/config', (req, res) => {
  try {
    res.json(imageGrabber.getConfig());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', (req, res) => {
  try {
    imageGrabber.updateConfig(req.body);
    res.json({ 
      success: true, 
      message: '配置已更新',
      config: imageGrabber.getConfig()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { website, selectors, excludeKeywords } = req.body;
    
    const testConfig = { 
      targetWebsite: website,
      imageSelectors: selectors || ['img'],
      excludeKeywords: excludeKeywords || []
    };
    
    const images = await imageGrabber.testConnection(testConfig);
    
    res.json({ 
      success: true, 
      imageCount: images.length,
      sampleImages: images.slice(0, 5)
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/status', (req, res) => {
  try {
    res.json({
      enabled: imageGrabber.isEnabled(),
      lastUpdate: imageGrabber.lastUpdate,
      cacheSize: imageGrabber.cache.size,
      config: imageGrabber.getConfig()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
