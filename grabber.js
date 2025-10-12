const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 加载配置
const config = require('./config.js');

class ImageGrabber {
  constructor() {
    this.cache = new Map();
    this.lastUpdate = null;
    this.debug = config.debug;
  }

  isEnabled() {
    return config.enabled === true;
  }

  async addImageToText(text) {
    if (!this.isEnabled() || !text || typeof text !== 'string') {
      return text;
    }
    
    try {
      if (this.debug) {
        console.log('🖼️ 图片抓取插件: 开始处理文本');
      }
      
      const imageUrl = await this.getRandomImage();
      if (imageUrl) {
        const result = this.insertImage(text, imageUrl);
        if (this.debug) {
          console.log('🖼️ 图片抓取插件: 图片插入成功');
        }
        return result;
      }
    } catch (error) {
      console.error('🖼️ 图片抓取插件错误:', error);
    }
    
    return text;
  }

  async getRandomImage() {
    const cacheKey = config.targetWebsite;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < config.cacheDuration) {
        if (this.debug) {
          console.log('🖼️ 使用缓存图片');
        }
        return this.selectRandomImage(cached.images);
      }
    }

    try {
      if (this.debug) {
        console.log('🖼️ 开始抓取图片...');
      }
      
      const images = await this.scrapeImages();
      this.cache.set(cacheKey, { 
        images, 
        timestamp: Date.now() 
      });
      this.lastUpdate = new Date();
      
      if (this.debug) {
        console.log(`🖼️ 抓取完成，找到 ${images.length} 张图片`);
      }
      
      return this.selectRandomImage(images);
    } catch (error) {
      console.error('🖼️ 抓取图片失败:', error);
      return null;
    }
  }

  async scrapeImages() {
    const html = await this.fetchUrl(config.targetWebsite);
    const images = this.parseImagesFromHtml(html);
    return images;
  }

  async fetchUrl(url) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
          },
          timeout: config.requestTimeout
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
      } catch (error) {
        reject(error);
      }
    });
  }

  parseImagesFromHtml(html) {
    const images = [];
    
    // 基础img标签解析
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src && this.isValidImage(src)) {
        const absoluteUrl = this.makeAbsoluteUrl(src);
        if (absoluteUrl && !images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    }
    
    return images;
  }

  isValidImage(src) {
    if (!src || src.trim().length === 0) {
      return false;
    }
    
    const lowerSrc = src.toLowerCase();
    
    // 检查排除关键词
    if (config.excludeKeywords.some(keyword => 
      keyword && lowerSrc.includes(keyword.toLowerCase())
    )) {
      return false;
    }
    
    // 检查图片格式
    return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(lowerSrc);
  }

  makeAbsoluteUrl(src) {
    if (!src) return null;
    
    try {
      const baseUrl = config.targetWebsite;
      
      if (src.startsWith('//')) {
        return 'https:' + src;
      } else if (src.startsWith('/')) {
        return new URL(src, baseUrl).href;
      } else if (!src.startsWith('http')) {
        return new URL(src, baseUrl).href;
      }
      
      return src;
    } catch (error) {
      return null;
    }
  }

  selectRandomImage(images) {
    if (!images || images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  }

  insertImage(text, imageUrl) {
    if (!text || !imageUrl) return text;
    
    const imageHtml = this.createImageHtml(imageUrl);
    const position = this.getInsertPosition();
    
    const match = text.match(position);
    if (match) {
      return text.replace(position, `$1$2${imageHtml}`);
    }
    
    return text + imageHtml;
  }

  getInsertPosition() {
    const positions = {
      'after_first_sentence': /([。！？\.\?!])(\s*)/,
      'beginning': /^/,
      'end': /$/
    };
    return positions[config.insertPosition] || positions['after_first_sentence'];
  }

  createImageHtml(imageUrl) {
    return `
<div style="text-align: center; margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
  <img src="${imageUrl}" alt="相关图片" 
       style="max-width: ${config.maxImageWidth}; border-radius: 6px; border: 1px solid #ced4da;"
       onerror="this.style.display='none'">
  <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 0.8em;">🖼️ 相关配图</p>
</div>`;
  }
}

module.exports = new ImageGrabber();
