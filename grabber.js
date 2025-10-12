const https = require('https');
const http = require('http');
const { URL } = require('url');

class MediaGrabber {
  constructor() {
    this.config = this.loadConfig();
    this.cache = new Map();
  }

  loadConfig() {
    // 简化的配置加载
    return {
      enabled: true,
      targetWebsites: ["https://www.kchai.org/"],
      mediaTypes: ["image", "video"],
      excludeKeywords: ["icon", "logo", "ad"],
      requestTimeout: 5000
    };
  }

  async getRandomMedia() {
    const website = this.config.targetWebsites[0];
    const html = await this.fetchUrl(website);
    const media = this.parseMedia(html, website);
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
        timeout: this.config.requestTimeout
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
      if (this.isValidMedia(src, 'image')) {
        media.push({
          url: this.makeAbsoluteUrl(src, baseUrl),
          type: 'image',
          source: baseUrl
        });
      }
    }
    
    // 解析视频
    const videoRegex = /<video[^>]*>.*?<source[^>]+src="([^">]+)".*?<\/video>/gis;
    while ((match = videoRegex.exec(html)) !== null) {
      const src = match[1];
      if (this.isValidMedia(src, 'video')) {
        media.push({
          url: this.makeAbsoluteUrl(src, baseUrl),
          type: 'video', 
          source: baseUrl
        });
      }
    }
    
    return media;
  }

  isValidMedia(src, type) {
    if (!src) return false;
    return !this.config.excludeKeywords.some(kw => src.includes(kw));
  }

  makeAbsoluteUrl(src, baseUrl) {
    try {
      return new URL(src, baseUrl).href;
    } catch {
      return src;
    }
  }

  async proxyMedia(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = protocol.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search
      }, (res) => {
        resolve({
          stream: res,
          contentType: res.headers['content-type']
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = new MediaGrabber();
