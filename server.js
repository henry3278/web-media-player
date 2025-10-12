// 文件名: server.js (v8.0.1 - 增加诊断日志)
const fs = require('fs');
const path = require('path');

class LocalMediaPlayerServer {
    context;

    constructor(context) {
        this.context = context;
        // 【诊断日志1】: 确认构造函数被调用
        console.log('[Local Media Player Server] Constructor loaded. Plugin path:', this.context.pluginPath);
    }

    onLoad() {
        // 【诊断日志2】: 确认 onLoad 方法被执行
        console.log('[Local Media Player Server] onLoad started.');
        
        const router = this.context.router;
        const pluginPath = this.context.pluginPath;

        router.get('/api/extensions/local-media-player/files', (req, res) => {
            try {
                const photosPath = path.join(pluginPath, 'photos');
                const videosPath = path.join(pluginPath, 'videos');

                let photos = [];
                let videos = [];

                if (fs.existsSync(photosPath)) {
                    photos = fs.readdirSync(photosPath)
                        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                        .map(file => `/extensions/third-party/web-media-player/photos/${encodeURIComponent(file)}`);
                }

                if (fs.existsSync(videosPath)) {
                    videos = fs.readdirSync(videosPath)
                        .filter(file => /\.(mp4|webm|ogg|mov)$/i.test(file))
                        .map(file => `/extensions/third-party/web-media-player/videos/${encodeURIComponent(file)}`);
                }
                
                // 【诊断日志4】: 确认文件被找到
                console.log(`[Local Media Player Server] Found ${photos.length} photos and ${videos.length} videos.`);
                res.json({ photos, videos });

            } catch (error) {
                console.error('[Local Media Player Server] Error reading media files:', error);
                res.status(500).json({ error: 'Failed to read media files.' });
            }
        });

        // 【诊断日志3】: 确认API端点已注册
        console.log('[Local Media Player Server] API endpoint /api/extensions/local-media-player/files registered successfully.');
    }
}

module.exports = LocalMediaPlayerServer;
