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
            totalRequests: 0,
            imagesFound: 0,
            videosFound: 0,
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
            console.error('❌ 加载配置失败:', error);
        }
        
        // 返回默认配置
        return {
            enabled: true,
            targetWebsites: [
                "https://www.kchai.org/",
                "https://example.com/gallery"
            ],
            mediaTypes: ["image", "video"],
            imageSelectors: ["img", "img[src*=\".jpg\"]", "img[src*=\".png\"]"],
            videoSelectors: ["video", "source[type*=\"video\"]"],
            excludeKeywords: ["icon", "logo", "ad", "spacer", "pixel"],
            fileExtensions: {
                images: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
                videos: [".mp4", ".webm", ".ogg", ".mov"]
            },
            maxMediaPerPage: 30,
            requestTimeout: 8000,
            cacheDuration: 600000, // 10分钟
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            debug: false
        };
    }

    isEnabled() {
        return this.config.enabled === true;
    }

    async getRandomMedia(mediaType = 'random') {
        if (!this.isEnabled()) {
            return null;
        }

        const randomSite = this.getRandomWebsite();
        const cacheKey = `${randomSite}-${mediaType}`;

        // 检查缓存
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheDuration) {
                if (this.config.debug) {
                    console.log('🔄 使用缓存媒体');
                }
                return this.selectRandomMedia(cached.media);
            }
        }

        try {
            this.stats.totalRequests++;
            if (this.config.debug) {
                console.log(`🌐 抓取网站: ${randomSite}`);
            }

            const media = await this.scrapeWebsite(randomSite, mediaType);
            
            this.cache.set(cacheKey, {
                media: media,
                timestamp: Date.now()
            });
            
            this.stats.lastUpdate = new Date();
            this.stats.imagesFound += media.filter(m => m.type === 'image').length;
            this.stats.videosFound += media.filter(m => m.type === 'video').length;

            return this.selectRandomMedia(media);
        } catch (error) {
            console.error('❌ 抓取媒体失败:', error);
            return null;
        }
    }

    async scrapeWebsite(url, mediaType) {
        const html = await this.fetchUrl(url);
        const media = [];

        if (mediaType === 'image' || mediaType === 'random') {
            media.push(...this.parseImages(html, url));
        }

        if (mediaType === 'video' || mediaType === 'random') {
            media.push(...this.parseVideos(html, url));
        }

        return media.slice(0, this.config.maxMediaPerPage);
    }

    parseImages(html, baseUrl) {
        const images = [];
        
        // 解析img标签
        const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/gi;
        let match;
        
        while ((match = imgRegex.exec(html)) !== null) {
            const src = match[1];
            if (this.isValidMedia(src, 'image')) {
                const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl);
                if (absoluteUrl) {
                    images.push({
                        url: absoluteUrl,
                        type: 'image',
                        thumbnail: absoluteUrl,
                        source: baseUrl,
                        filename: this.getFilename(absoluteUrl)
                    });
                }
            }
        }

        // 解析背景图片
        const bgRegex = /url\(['"]?([^'")]+)['"]?\)/gi;
        while ((match = bgRegex.exec(html)) !== null) {
            const src = match[1];
            if (this.isValidMedia(src, 'image')) {
                const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl);
                if (absoluteUrl) {
                    images.push({
                        url: absoluteUrl,
                        type: 'image',
                        thumbnail: absoluteUrl,
                        source: baseUrl,
                        filename: this.getFilename(absoluteUrl)
                    });
                }
            }
        }

        return images;
    }

    parseVideos(html, baseUrl) {
        const videos = [];
        
        // 解析video标签
        const videoRegex = /<video[^>]*>.*?<\/video>/gis;
        let match;
        
        while ((match = videoRegex.exec(html)) !== null) {
            const videoHtml = match[0];
            
            // 获取src属性
            const srcMatch = videoHtml.match(/src="([^"]+)"/);
            if (srcMatch) {
                const src = srcMatch[1];
                if (this.isValidMedia(src, 'video')) {
                    const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl);
                    if (absoluteUrl) {
                        videos.push({
                            url: absoluteUrl,
                            type: 'video',
                            thumbnail: this.getVideoThumbnail(videoHtml, baseUrl),
                            source: baseUrl,
                            filename: this.getFilename(absoluteUrl)
                        });
                    }
                }
            }
            
            // 解析source标签
            const sourceRegex = /<source[^>]+src="([^">]+)"[^>]*>/gi;
            let sourceMatch;
            while ((sourceMatch = sourceRegex.exec(videoHtml)) !== null) {
                const src = sourceMatch[1];
                if (this.isValidMedia(src, 'video')) {
                    const absoluteUrl = this.makeAbsoluteUrl(src, baseUrl);
                    if (absoluteUrl) {
                        videos.push({
                            url: absoluteUrl,
                            type: 'video',
                            thumbnail: this.getVideoThumbnail(videoHtml, baseUrl),
                            source: baseUrl,
                            filename: this.getFilename(absoluteUrl)
                        });
                    }
                }
            }
        }

        return videos;
    }

    getVideoThumbnail(videoHtml, baseUrl) {
        const posterMatch = videoHtml.match(/poster="([^"]+)"/);
        if (posterMatch) {
            return this.makeAbsoluteUrl(posterMatch[1], baseUrl);
        }
        return null;
    }

    getFilename(url) {
        try {
            const pathname = new URL(url).pathname;
            return path.basename(pathname);
        } catch {
            return 'unknown';
        }
    }

    isValidMedia(src, mediaType) {
        if (!src) return false;
        
        const lowerSrc = src.toLowerCase();
        
        // 检查排除关键词
        if (this.config.excludeKeywords.some(keyword => 
            keyword && lowerSrc.includes(keyword.toLowerCase())
        )) {
            return false;
        }
        
        // 检查文件扩展名
        const extensions = this.config.fileExtensions[mediaType + 's'];
        return extensions.some(ext => lowerSrc.includes(ext));
    }

    makeAbsoluteUrl(src, baseUrl) {
        try {
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return new URL(src, baseUrl).href;
            if (!src.startsWith('http')) return new URL(src, baseUrl).href;
            return src;
        } catch (error) {
            return null;
        }
    }

    getRandomWebsite() {
        return this.config.targetWebsites[
            Math.floor(Math.random() * this.config.targetWebsites.length)
        ];
    }

    selectRandomMedia(media) {
        if (!media || media.length === 0) return null;
        return media[Math.floor(Math.random() * media.length)];
    }

    async fetchUrl(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': this.config.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: this.config.requestTimeout
            };

            const req = protocol.request(options, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                let data = '';
                res.setEncoding('utf8');
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(data);
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });

            req.end();
        });
    }

    async proxyMedia(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                timeout: this.config.requestTimeout
            };

            const req = protocol.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                const contentType = res.headers['content-type'] || 'image/jpeg';
                resolve({
                    stream: res,
                    contentType: contentType,
                    contentLength: res.headers['content-length']
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('代理请求超时'));
            });

            req.end();
        });
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            config: this.config
        };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.cache.clear(); // 清空缓存
        
        // 保存配置到文件
        try {
            const configPath = path.join(__dirname, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
        }
    }

    // 测试网站连接
    async testWebsite(url) {
        try {
            const media = await this.scrapeWebsite(url, 'random');
            return {
                success: true,
                media: media.slice(0, 10), // 返回前10个作为示例
                count: media.length,
                images: media.filter(m => m.type === 'image').length,
                videos: media.filter(m => m.type === 'video').length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new WebMediaGrabber();
