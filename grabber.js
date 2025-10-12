const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class ImageGrabber {
  constructor() {
    this.config = this.loadConfig();
    this.cache = new Map();
    this.lastUpdate = null;
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
      targetWebsite: "https://www.kchai.org/",
      imageSelectors: ["img"],
      excludeKeywords: ["icon", "logo"],
      insertPosition: "after_first_sentence",
      maxImageWidth: "400px",
      requestTimeout: 5000,
      cacheDuration: 300000,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
  }

  getConfig() { 
    return this.config; 
  }

  isEnabled() {
    return this.config.enabled === true;
  }

  async addImageToText(text) {
    if (!this.isEnabled() || !text || typeof text !== 'string') {
      return text;
    }
    
    try {
      const imageUrl = await this.getRandomImage();
      if (imageUrl) {
        return this.insertImage(text, imageUrl);
      }
    } catch (error) {
      console.error('图片抓取失败:', error);
    }
    
    return text;
  }

  async getRandomImage() {
    const cacheKey = this.config.targetWebsite;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < (this.config.cacheDuration || 300000)) {
        return this.selectRandomImage(cached.images);
      }
    }

    try {
      const images = await this.scrapeImages();
      this.cache.set(cacheKey, { 
        images, 
        timestamp: Date.now() 
      });
      this.lastUpdate = new Date();
      
      return this.selectRandomImage(images);
    } catch (error) {
      console.error('抓取图片失败:', error);
      return null;
    }
  }

  async scrapeImages() {
    try {
      const html = await this.fetchUrl(this.config.targetWebsite);
      const images = this.parseImagesFromHtml(html);
      return images;
    } catch (error) {
      console.error('抓取页面失败:', error);
      return [];
    }
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
            'User-Agent': this.config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
          },
          timeout: this.config.requestTimeout || 5000
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

        req.on('error', (error) => {
          reject(error);
        });

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
    
    // 支持CSS选择器
    if (this.config.imageSelectors && this.config.imageSelectors.length > 0) {
      for (const selector of this.config.imageSelectors) {
        if (selector.startsWith('img[') && selector.includes('*=')) {
          const attrMatch = selector.match(/img\[src\*=["']([^"']+)["']\]/);
          if (attrMatch) {
            const pattern = attrMatch[1];
            const patternRegex = new RegExp(`<img[^>]+src="([^">]*${pattern}[^">]*)"[^>]*>`, 'gi');
            let patternMatch;
            
            while ((patternMatch = patternRegex.exec(html)) !== null) {
              const src = patternMatch[1];
              if (src && this.isValidImage(src)) {
                const absoluteUrl = this.makeAbsoluteUrl(src);
                if (absoluteUrl && !images.includes(absoluteUrl)) {
                  images.push(absoluteUrl);
                }
              }
            }
          }
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
    const excluded = this.config.excludeKeywords || [];
    
    // 检查排除关键词
    if (excluded.some(keyword => 
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
      const baseUrl = this.config.targetWebsite;
      
      if (src.startsWith('//')) {
        return 'https:' + src;
      } else if (src.startsWith('/')) {
        return new URL(src, baseUrl).href;
      } else if (!src.startsWith('http')) {
        return new URL(src, baseUrl).href;
      }
      
      return src;
    } catch (error) {
      console.error('URL转换失败:', error);
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
    return positions[this.config.insertPosition] || positions['after_first_sentence'];
  }

  createImageHtml(imageUrl) {
    return `
<div style="text-align: center; margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
  <img src="${imageUrl}" alt="相关图片" 
       style="max-width: ${this.config.maxImageWidth}; border-radius: 6px; border: 1px solid #ced4da;"
       onerror="this.style.display='none'">
  <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 0.8em;">🖼️ 相关配图</p>
</div>`;
  }

  async testConnection(testConfig) {
    try {
      const config = { ...this.config, ...testConfig };
      const html = await this.fetchUrl(config.targetWebsite);
      const images = this.parseImagesFromHtml(html);
      
      return images;
    } catch (error) {
      throw new Error(`连接测试失败: ${error.message}`);
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.cache.clear();
    this.lastUpdate = new Date();
    
    try {
      const configPath = path.join(__dirname, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }
}

module.exports = new ImageGrabber();
