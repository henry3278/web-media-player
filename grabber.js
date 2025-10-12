const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class WebMediaGrabber {
    constructor() {
        this.config = this.loadConfig();
        this.cache = new Map();
        this.stats = {
            status: '运行中',
            totalImages: 0,
            totalVideos: 0,
            cacheSize: 0,
            lastUpdate: null
        };
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
        return this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            enabled: true,
            targetWebsites: ["https://www.kchai.org/"],
            mediaTypes: ["image", "video"],
            playMode: "random",
            switchInterval: 5000,
            pollInterval: 30000,
            aiSwitch: true,
            playerSwitch: true,
            loopPlay: true,
            showInfo: false,
            preload: true,
            coolDown: 3000,
            filterEffect: "fade"
        };
    }

    isEnabled() {
        return this.config.enabled === true;
    }

    getServiceStatus() {
        return {
            status: this.isEnabled() ? '运行中' : '已停止',
            totalImages: this.stats.totalImages,
            totalVideos: this.stats.totalVideos,
            cacheSize: this.cache.size,
            lastUpdate: this.stats.lastUpdate
        };
    }

    async getRandomMedia() {
        if (!this.isEnabled()) return null;
        
        const website = this.config.targetWebsites[0];
        const html = await this.fetchUrl(website);
        const media = this.parseMedia(html, website);
        
        this.stats.totalImages = media.filter(m => m.type === 'image').length;
        this.stats.totalVideos = media.filter(m => m.type === 'video').length;
        this.stats.cacheSize = this.cache.size;
        this.stats.lastUpdate = new Date();
        
        return media.length > 0 ? media[Math.floor(Math.random() * media.length)] : null;
    }

    async fetchUrl(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const req = protocol.request({
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            
            req.on('error', reject);
            req.end();
        });
    }

    parseMedia(html, baseUrl) {
        const media = [];
        
        // 解析图片
        const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/gi;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            const src = match[1];
            if (this.isValidMedia(src)) {
                media.push({
                    url: this.makeAbsoluteUrl(src, baseUrl),
                    type: 'image',
                    source: baseUrl
                });
            }
        }
        
        return media;
    }

    isValidMedia(src) {
        return src && !src.includes('icon') && !src.includes('logo');
    }

    makeAbsoluteUrl(src, baseUrl) {
        try {
            return new URL(src, baseUrl).href;
        } catch {
            return src;
        }
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // 保存配置
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    }
}

module.exports = new WebMediaGrabber();
