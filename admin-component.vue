<template>
  <div class="image-grabber-settings">
    <h3>🖼️ 图片抓取设置</h3>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="settings.enabled" @change="saveSettings">
        启用图片抓取功能
      </label>
    </div>

    <div v-if="settings.enabled" class="plugin-settings">
      <div class="form-group">
        <label>目标网站URL:</label>
        <input type="url" v-model="settings.targetWebsite" @blur="saveSettings" 
               placeholder="https://www.kchai.org/">
      </div>

      <div class="form-group">
        <label>图片选择器 (每行一个):</label>
        <textarea v-model="settings.imageSelectorsText" @blur="updateSelectors"
                  rows="3" placeholder="img&#10;img[src*=&quot;.jpg&quot;]"></textarea>
      </div>

      <div class="form-group">
        <label>排除关键词 (逗号分隔):</label>
        <input type="text" v-model="settings.excludeKeywordsText" @blur="updateKeywords"
               placeholder="icon,logo,ad,spacer">
      </div>

      <div class="form-group">
        <label>插入位置:</label>
        <select v-model="settings.insertPosition" @change="saveSettings">
          <option value="after_first_sentence">第一个句子后</option>
          <option value="beginning">文本开头</option>
          <option value="end">文本末尾</option>
        </select>
      </div>

      <div class="form-group">
        <label>最大图片宽度:</label>
        <input type="text" v-model="settings.maxImageWidth" @blur="saveSettings" 
               placeholder="400px">
      </div>

      <details>
        <summary>高级设置</summary>
        <div class="form-group">
          <label>请求超时 (毫秒):</label>
          <input type="number" v-model="settings.requestTimeout" @blur="saveSettings" 
                 min="1000" max="30000">
        </div>
        
        <div class="form-group">
          <label>User-Agent:</label>
          <input type="text" v-model="settings.userAgent" @blur="saveSettings"
                 placeholder="Mozilla/5.0...">
        </div>
      </details>

      <div class="test-section">
        <button @click="testConnection" class="btn-test">测试连接</button>
        <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
          {{ testResult.message }}
        </div>
        <div v-if="testResult && testResult.sampleImages" class="image-preview">
          <img v-for="img in testResult.sampleImages" :src="img" :key="img" 
               @error="handleImageError" class="preview-img">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageGrabberSettings',
  
  data() {
    return {
      settings: {
        enabled: false,
        targetWebsite: '',
        imageSelectorsText: '',
        excludeKeywordsText: '',
        insertPosition: 'after_first_sentence',
        maxImageWidth: '400px',
        requestTimeout: 5000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      testResult: null
    }
  },

  async mounted() {
    await this.loadSettings();
  },

  methods: {
    async loadSettings() {
      try {
        const response = await fetch('/api/plugins/image-grabber/config');
        const config = await response.json();
        
        this.settings = {
          ...this.settings,
          ...config,
          imageSelectorsText: Array.isArray(config.imageSelectors) 
            ? config.imageSelectors.join('\n') : '',
          excludeKeywordsText: Array.isArray(config.excludeKeywords)
            ? config.excludeKeywords.join(',') : ''
        };
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    },

    async saveSettings() {
      try {
        const config = {
          ...this.settings,
          imageSelectors: this.settings.imageSelectorsText.split('\n').filter(s => s.trim()),
          excludeKeywords: this.settings.excludeKeywordsText.split(',').filter(s => s.trim())
        };

        delete config.imageSelectorsText;
        delete config.excludeKeywordsText;

        await fetch('/api/plugins/image-grabber/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        this.showMessage('设置已保存', 'success');
      } catch (error) {
        this.showMessage('保存失败: ' + error.message, 'error');
      }
    },

    updateSelectors() {
      this.saveSettings();
    },

    updateKeywords() {
      this.saveSettings();
    },

    async testConnection() {
      try {
        this.testResult = { message: '测试中...', success: true };
        
        const response = await fetch('/api/plugins/image-grabber/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website: this.settings.targetWebsite,
            selectors: this.settings.imageSelectorsText.split('\n').filter(s => s.trim()),
            excludeKeywords: this.settings.excludeKeywordsText.split(',').filter(s => s.trim())
          })
        });

        const result = await response.json();
        this.testResult = {
          success: result.success,
          message: result.success 
            ? `连接成功！找到 ${result.imageCount} 张图片` 
            : '连接失败: ' + result.error,
          <template>
  <div class="image-grabber-settings">
    <h3>🖼️ 图片抓取设置</h3>
    
    <div class="form-group">
      <label>
        <input type="checkbox" v-model="settings.enabled" @change="saveSettings">
        启用图片抓取功能
      </label>
    </div>

    <div v-if="settings.enabled" class="plugin-settings">
      <div class="form-group">
        <label>目标网站URL:</label>
        <input type="url" v-model="settings.targetWebsite" @blur="saveSettings" 
               placeholder="https://www.kchai.org/">
      </div>

      <div class="form-group">
        <label>图片选择器 (每行一个):</label>
        <textarea v-model="settings.imageSelectorsText" @blur="updateSelectors"
                  rows="3" placeholder="img&#10;img[src*=&quot;.jpg&quot;]"></textarea>
      </div>

      <div class="form-group">
        <label>排除关键词 (逗号分隔):</label>
        <input type="text" v-model="settings.excludeKeywordsText" @blur="updateKeywords"
               placeholder="icon,logo,ad,spacer">
      </div>

      <div class="form-group">
        <label>插入位置:</label>
        <select v-model="settings.insertPosition" @change="saveSettings">
          <option value="after_first_sentence">第一个句子后</option>
          <option value="beginning">文本开头</option>
          <option value="end">文本末尾</option>
        </select>
      </div>

      <div class="form-group">
        <label>最大图片宽度:</label>
        <input type="text" v-model="settings.maxImageWidth" @blur="saveSettings" 
               placeholder="400px">
      </div>

      <details>
        <summary>高级设置</summary>
        <div class="form-group">
          <label>请求超时 (毫秒):</label>
          <input type="number" v-model="settings.requestTimeout" @blur="saveSettings" 
                 min="1000" max="30000">
        </div>
        
        <div class="form-group">
          <label>User-Agent:</label>
          <input type="text" v-model="settings.userAgent" @blur="saveSettings"
                 placeholder="Mozilla/5.0...">
        </div>
      </details>

      <div class="test-section">
        <button @click="testConnection" class="btn-test">测试连接</button>
        <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
          {{ testResult.message }}
        </div>
        <div v-if="testResult && testResult.sampleImages" class="image-preview">
          <img v-for="img in testResult.sampleImages" :src="img" :key="img" 
               @error="handleImageError" class="preview-img">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageGrabberSettings',
  
  data() {
    return {
      settings: {
        enabled: false,
        targetWebsite: '',
        imageSelectorsText: '',
        excludeKeywordsText: '',
        insertPosition: 'after_first_sentence',
        maxImageWidth: '400px',
        requestTimeout: 5000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      testResult: null
    }
  },

  async mounted() {
    await this.loadSettings();
  },

  methods: {
    async loadSettings() {
      try {
        const response = await fetch('/api/plugins/image-grabber/config');
        const config = await response.json();
        
        this.settings = {
          ...this.settings,
          ...config,
          imageSelectorsText: Array.isArray(config.imageSelectors) 
            ? config.imageSelectors.join('\n') : '',
          excludeKeywordsText: Array.isArray(config.excludeKeywords)
            ? config.excludeKeywords.join(',') : ''
        };
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    },

    async saveSettings() {
      try {
        const config = {
          ...this.settings,
          imageSelectors: this.settings.imageSelectorsText.split('\n').filter(s => s.trim()),
          excludeKeywords: this.settings.excludeKeywordsText.split(',').filter(s => s.trim())
        };

        delete config.imageSelectorsText;
        delete config.excludeKeywordsText;

        await fetch('/api/plugins/image-grabber/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        this.showMessage('设置已保存', 'success');
      } catch (error) {
        this.showMessage('保存失败: ' + error.message, 'error');
      }
    },

    updateSelectors() {
      this.saveSettings();
    },

    updateKeywords() {
      this.saveSettings();
    },

    async testConnection() {
      try {
        this.testResult = { message: '测试中...', success: true };
        
        const response = await fetch('/api/plugins/image-grabber/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website: this.settings.targetWebsite,
            selectors: this.settings.imageSelectorsText.split('\n').filter(s => s.trim()),
            excludeKeywords: this.settings.excludeKeywordsText.split(',').filter(s => s.trim())
          })
        });

        const result = await response.json();
        this.testResult = {
          success: result.success,
          message: result.success 
            ? `连接成功！找到 ${result.imageCount} 张图片` 
            : '连接失败: ' + result.error,
                  sampleImages: result.sampleImages || []
        };
      } catch (error) {
        this.testResult = {
          success: false,
          message: '测试失败: ' + error.message
        };
      }
    },

    handleImageError(event) {
      event.target.style.display = 'none';
    },

    showMessage(message, type) {
      // 使用云酒馆现有的消息提示系统
      if (this.$notify) {
        this.$notify({
          title: type === 'success' ? '成功' : '错误',
          message: message,
          type: type
        });
      } else {
        alert(message);
      }
    }
  }
}
</script>

<style scoped>
.image-grabber-settings {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.form-group {
  margin: 15px 0;
}

label {
  display: block;
  margin: 5px 0;
  font-weight: bold;
}

input, select, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.btn-test {
  background: #2196F3;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-test:hover {
  background: #1976D2;
}

.test-result {
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
}

.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.image-preview {
  margin: 10px 0;
}

.preview-img {
  max-width: 100px;
  margin: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

details {
  margin: 15px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

summary {
  cursor: pointer;
  font-weight: bold;
}
</style>
