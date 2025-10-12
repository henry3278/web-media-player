// 用于HTML页面的集成脚本
class ImageGrabberAdmin {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.renderInterface();
    this.bindEvents();
  }

  async loadSettings() {
    try {
      const response = await fetch('/api/plugins/image-grabber/config');
      this.settings = await response.json();
    } catch (error) {
      console.error('加载设置失败:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      enabled: false,
      targetWebsite: 'https://www.kchai.org/',
      imageSelectors: ["img"],
      excludeKeywords: ['icon', 'logo', 'ad'],
      insertPosition: 'after_first_sentence',
      maxImageWidth: '400px',
      requestTimeout: 5000
    };
  }

  renderInterface() {
    const container = document.getElementById('image-grabber-settings');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-section">
        <h3>🖼️ 图片抓取设置 (无依赖版)</h3>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="ig-enabled" ${this.settings.enabled ? 'checked' : ''}>
            启用图片抓取功能
          </label>
        </div>

        <div id="ig-settings" style="${this.settings.enabled ? '' : 'display: none;'}">
          <div class="form-group">
            <label>目标网站URL:</label>
            <input type="url" id="ig-website" value="${this.settings.targetWebsite}" 
                   placeholder="https://www.kchai.org/">
          </div>

          <div class="form-group">
            <label>图片选择器 (每行一个):</label>
            <textarea id="ig-selectors" rows="3">${Array.isArray(this.settings.imageSelectors) ? this.settings.imageSelectors.join('\n') : ''}</textarea>
          </div>

          <div class="form-group">
            <label>排除关键词 (逗号分隔):</label>
            <input type="text" id="ig-keywords" value="${Array.isArray(this.settings.excludeKeywords) ? this.settings.excludeKeywords.join(',') : ''}">
          </div>

          <div class="form-group">
            <label>插入位置:</label>
            <select id="ig-position">
              <option value="after_first_sentence" ${this.settings.insertPosition === 'after_first_sentence' ? 'selected' : ''}>第一个句子后</option>
              <option value="beginning" ${this.settings.insertPosition === 'beginning' ? 'selected' : ''}>文本开头</option>
              <option value="end" ${this.settings.insertPosition === 'end' ? 'selected' : ''}>文本末尾</option>
            </select>
          </div>

          <div class="form-group">
            <label>最大图片宽度:</label>
            <input type="text" id="ig-width" value="${this.settings.maxImageWidth}">
          </div>

          <div class="form-group">
            <button id="ig-save" class="btn">保存设置</button>
            <button id="ig-test" class="btn">测试连接</button>
          </div>

          <div id="ig-result"></div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 启用/禁用切换
    document.getElementById('ig-enabled')?.addEventListener('change', (e) => {
      document.getElementById('ig-settings').style.display = e.target.checked ? 'block' : 'none';
      this.saveSettings();
    });

    // 保存设置
    document.getElementById('ig-save')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // 测试连接
    document.getElementById('ig-test')?.addEventListener('click', () => {
      this.testConnection();
    });
  }

  async saveSettings() {
    try {
      const settings = {
        enabled: document.getElementById('ig-enabled').checked,
        targetWebsite: document.getElementById('ig-website').value,
        imageSelectors: document.getElementById('ig-selectors').value.split('\n').filter(s => s.trim()),
        excludeKeywords: document.getElementById('ig-keywords').value.split(',').filter(s => s.trim()),
        insertPosition: document.getElementById('ig-position').value,
        maxImageWidth: document.getElementById('ig-width').value,
        requestTimeout: 5000
      };

      const response = await fetch('/api/plugins/image-grabber/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const result = await response.json();
      this.showMessage(result.success ? '设置已保存' : '保存失败', result.success);
    } catch (error) {
      this.showMessage('保存失败: ' + error.message, false);
    }
  }

  async testConnection() {
    try {
      const website = document.getElementById('ig-website').value;
      const selectors = document.getElementById('ig-selectors').value.split('\n').filter(s => s.trim());
      const keywords = document.getElementById('ig-keywords').value.split(',').filter(s => s.trim());

      const response = await fetch('/api/plugins/image-grabber/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, selectors, excludeKeywords: keywords })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showMessage(`连接成功！找到 ${result.imageCount} 张图片`, true);
        this.showPreview(result.sampleImages);
      } else {
        this.showMessage('连接失败: ' + result.error, false);
      }
    } catch (error) {
      this.showMessage('测试失败: ' + error.message, false);
    }
  }

  showMessage(message, isSuccess) {
    const resultDiv = document.getElementById('ig-result');
    resultDiv.innerHTML = `<div class="${isSuccess ? 'success' : 'error'}">${message}</div>`;
    setTimeout(() => resultDiv.innerHTML = '', 5000);
  }

  showPreview(images) {
    const resultDiv = document.getElementById('ig-result');
    if (images && images.length > 0) {
      const preview = images.map(img => 
        `<img src="${img}" style="max-width: 100px; margin: 5px; border: 1px solid #ddd;" onerror="this.style.display='none'">`
      ).join('');
      resultDiv.innerHTML += `<div style="margin-top: 10px;">${preview}</div>`;
    }
  }
}

// 自动初始化
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new ImageGrabberAdmin();
  });
}
