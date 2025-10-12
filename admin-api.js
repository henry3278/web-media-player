const express = require('express');
const router = express.Router();
const mediaGrabber = require('./grabber');

// 获取随机媒体
router.get('/media/random', async (req, res) => {
    try {
        const { type } = req.query; // image, video, random
        const media = await mediaGrabber.getRandomMedia(type || 'random');
        
        if (media) {
            res.json({
                success: true,
                media: media
            });
        } else {
            res.json({
                success: false,
                error: '未找到媒体资源'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 代理媒体资源（解决跨域）
router.get('/media/proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL参数必填' });
        }

        const media = await mediaGrabber.proxyMedia(url);
        
        res.setHeader('Content-Type', media.contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
        
        if (media.contentLength) {
            res.setHeader('Content-Length', media.contentLength);
        }
        
        media.stream.pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 测试网站连接
router.post('/test', async (req, res) => {
    try {
        const { website } = req.body;
        if (!website) {
            return res.json({ success: false, error: '网站URL必填' });
        }

        const result = await mediaGrabber.testWebsite(website);
        res.json(result);
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// 获取配置
router.get('/config', (req, res) => {
    res.json(mediaGrabber.config);
});

// 更新配置
router.post('/config', (req, res) => {
    try {
        mediaGrabber.updateConfig(req.body);
        res.json({
            success: true,
            message: '配置已更新',
            config: mediaGrabber.config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取统计信息
router.get('/stats', (req, res) => {
    res.json(mediaGrabber.getStats());
});

// 清空缓存
router.post('/cache/clear', (req, res) => {
    mediaGrabber.cache.clear();
    res.json({ success: true, message: '缓存已清空' });
});

module.exports = router;
