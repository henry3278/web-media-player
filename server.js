// 文件名: server.js (负责读取本地文件列表)
const fs = require('fs');
const path = require('path');

class LocalMediaPlayerServer {
    // 插件的上下文对象，由SillyTavern在创建实例时传入
    context;

    constructor(context) {
        this.context = context;
    }

    /**
     * onLoad - 这是服务器端脚本的主入口函数
     */
    onLoad() {
        // 获取SillyTavern的Express路由器
        const router = this.context.router;
        const pluginPath = this.context.pluginPath;

        // 创建一个新的API端点，用于获取文件列表
        router.get('/api/extensions/local-media-player/files', (req, res) => {
            try {
                const photosPath = path.join(pluginPath, 'photos');
                const videosPath = path.join(pluginPath, 'videos');

                let photos = [];
                let videos = [];

                // 读取照片文件夹
                if (fs.existsSync(photosPath)) {
                    photos = fs.readdirSync(photosPath)
                        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                        .map(file => `/extensions/third-party/web-media-player/photos/${file}`);
                }

                // 读取视频文件夹
                if (fs.existsSync(videosPath)) {
                    videos = fs.readdirSync(videosPath)
                        .filter(file => /\.(mp4|webm|ogg|mov)$/i.test(file))
                        .map(file => `/extensions/third-party/web-media-player/videos/${file}`);
                }

                // 返回JSON格式的文件列表
                res.json({ photos, videos });

            } catch (error) {
                console.error('[Local Media Player Server] Error reading media files:', error);
                res.status(500).json({ error: 'Failed to read media files.' });
            }
        });

        console.log('[Local Media Player Server] API endpoint /api/extensions/local-media-player/files registered.');
    }
}

// 导出类，供SillyTavern加载
module.exports = LocalMediaPlayerServer;
