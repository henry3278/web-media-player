const express = require('express');
const router = express.Router();
const mediaGrabber = require('./grabber');

// 获取随机媒体
router.get('/media/random', async (req, res) => {
  try {
    const media = await mediaGrabber.getRandomMedia();
    res.json({ success: true, media });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 代理媒体资源
router.get('/media/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    const media = await mediaGrabber.proxyMedia(url);
    
    res.setHeader('Content-Type', media.contentType);
    media.stream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 测试连接
router.post('/test', async (req, res) => {
  try {
    const { website } = req.body;
    const html = await mediaGrabber.fetchUrl(website);
    const media = mediaGrabber.parseMedia(html, website);
    
    res.json({
      success: true,
      media: media.slice(0, 10),
      images: media.filter(m => m.type === 'image').length,
      videos: media.filter(m => m.type === 'video').length
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 配置接口
router.get('/config', (req, res) => {
  res.json(mediaGrabber.config);
});

router.post('/config', (req, res) => {
  mediaGrabber.config = { ...mediaGrabber.config, ...req.body };
  res.json({ success: true, config: mediaGrabber.config });
});

module.exports = router;
