const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class ImageGrabber {
  constructor() {
    this.config = this.loadConfig();
    this.cache = new Map();
    this.lastUpdate = null;
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, 'config.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('加载配置失败，使用默认配置');
      return this.getDefaultConfig();
    }
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
      cacheDuration: 300000
    };
  }

  getConfig() { return this.config; }
  getLastUpdate() { return this.lastUpdate; }
  getCacheSize() { return this.cache.size; }

  isEnabled() {
    return this.config.enabled;
  }

  async addImageToText(text) {
    if (!this.isEnabled() || !text) return text;
    
    try {
      const imageUrl = await this.getRandomImage();
      return imageUrl ? this.insertImage(text, imageUrl) : text;
    } catch (error) {
      console.error('图片抓取失败:', error);
      return text;
    }
  }

  async getRandomImage() {
    const cacheKey = this.config.targetWebsite;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < (this.config.cacheDuration || 300000)) {
        return this.selectRandomImage(cached.images);
      }
    }

    const images = await this.scrapeImages();
    this.cache.set(cacheKey, { images, timestamp: Date.now() });
    this.lastUpdate = new Date();
    
    return this.selectRandomImage(images);
  }

  async scrapeImages() {
    const response = await axios.get(this.config.targetWebsite, {
      timeout: this.config.requestTimeout || 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const images = [];

    $(this.config.imageSelectors.join(',')).each((i, elem) => {
      let src = $(elem).attr('src');
      if (src && this.isValidImage(src)) {
        images.push(this.makeAbsoluteUrl(src));
      }
    });

    return images;
  }

  isValidImage(src) {
    const lowerSrc = src.toLowerCase();
    const excluded = this.config.excludeKeywords || [];
    
    return !excluded.some(keyword => 
      lowerSrc.includes(keyword.toLowerCase())
    ) && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(src);
  }

  makeAbsoluteUrl(src) {
    const baseUrl = this.config.targetWebsite;
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('/')) return new URL(src, baseUrl).href;
    if (!src.startsWith('http')) return new URL(src, baseUrl).href;
    return src;
  }

  selectRandomImage(images) {
    return images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null;
  }

  insertImage(text, imageUrl) {
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
      const response = await axios.get(config.targetWebsite, {
        timeout: config.requestTimeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const images = [];

      $(config.imageSelectors.join(',')).each((i, elem) => {
        let src = $(elem).attr('src');
        if (src && this.isValidImage(src, config.excludeKeywords)) {
          images.push(this.makeAbsoluteUrl(src, config.targetWebsite));
        }
      });

      return images;
    } catch (error) {
      throw new Error(`连接测试失败: ${error.message}`);
    }
  }

  isValidImage(src, excludeKeywords) {
    const lowerSrc = src.toLowerCase();
    const excluded = excludeKeywords || [];
    
    return !excluded.some(keyword => 
      lowerSrc.includes(keyword.toLowerCase())
    ) && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(src);
  }

  makeAbsoluteUrl(src, baseUrl) {
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('/')) return new URL(src, baseUrl).href;
    if (!src.startsWith('http')) return new URL(src, baseUrl).href;
    return src;
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
