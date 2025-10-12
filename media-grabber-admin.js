// 这个文件会被云酒馆自动加载到管理面板中
class MediaGrabberAdmin {
  constructor() {
    this.name = '网页媒体抓取';
    this.icon = '🌐';
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.render();
    this.bindEvents();
  }

  async loadSettings() {
    try {
      const response = await fetch('/api/plugins/media-grabber/config');
      this.settings = await response.json();
    } catch (error) {
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      enabled: true,
      targetWebsites: ["https://www.kchai.org/"],
      mediaTypes: ["image", "video"],
      excludeKeywords: ["icon", "logo", "ad"]
    };
  }

  render() {
    // 创建管理面板HTML
    this.container = document.createElement('div');
    this.container.className = 'media-grabber-admin';
    this.container.innerHTML = this.getTemplate();
    
    // 插入到云酒馆管理面板
    const adminContainer = document.querySelector('.admin-container') || 
                          document.querySelector('.settings-panel') ||
                          document.body;
    adminContainer.appendChild(this.container);
  }

  getTemplate() {
    return `
      <div class="settings-section">
        <h3>${this.icon} ${this.name}</h3>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="mg-enabled" ${this.settings.enabled ? 'checked' : ''}>
            启用媒体抓取
          </label>
        </div>

        <div id="mg-settings" style="${this.settings.enabled ? '' : 'display: none;'}">
          <div class="form-group">
            <label>目标网站 (每行一个):</label>
            <textarea id="mg-websites" rows="3">${this.settings.targetWebsites.join('\n')}</textarea>
          </div>

          <div class="form-group">
            <label>媒体类型:</label>
            <div>
              <label><input type="checkbox" name="mediaType" value="image" ${this.settings.mediaTypes.includes('image') ? 'checked' : ''}> 图片</label>
              <label><input type="checkbox" name="mediaType" value="video" ${this.settings.mediaTypes.includes('video') ? 'checked' : ''}> 视频</label>
            </div>
          </div>

          <div class="form-group">
            <label>排除关键词:</label>
            <input type="text" id="mg-keywords" value="${this.settings.excludeKeywords.join(',')}">
          </div>

          <div class="form-group">
            <button onclick="mediaGrabberAdmin.saveSettings()" class="btn btn-primary">保存设置</button>
            <button onclick="mediaGrabberAdmin.testConnection()" class="btn btn-secondary">测试连接</button>
          </div>

          <div id="mg-result"></div>

          <!-- 实时预览区域 -->
          <div class="preview-section">
            <h4>实时预览</h4>
            <button onclick="mediaGrabberAdmin.loadPreview()" class="btn">刷新预览</button>
            <div id="mg-preview"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 启用/禁用切换
    document.getElementById('mg-enabled').addEventListener('change', (e) => {
      document.getElementById('mg-settings').style.display = e.target.checked ? 'block' : 'none';
      this.saveSettings();
    });
  }

  async saveSettings() {
    const settings = {
      enabled: document.getElementById('mg-enabled').checked,
      targetWebsites: document.getElementById('mg-websites').value.split('\n').filter(s => s.trim()),
      mediaTypes: Array.from(document.querySelectorAll('input[name="mediaType"]:checked')).map(cb => cb.value),
      excludeKeywords: document.getElementById('mg-keywords').value.split(',').filter(s => s.trim())
    };

    try {
      const response = await fetch('/api/plugins/media-grabber/config', {
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
    const website = document.getElementById('mg-websites').value.split('\n')[0];
    
    try {
      this.showMessage('测试中...', true);
      
      const response = await fetch('/api/plugins/media-grabber/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showMessage(`成功！找到 ${result.images.length} 张图片，${result.videos.length} 个视频`, true);
        this.showPreview(result.media);
      } else {
        this.showMessage('测试失败: ' + result.error, false);
      }
    } catch (error) {
      this.showMessage('测试失败: ' + error.message, false);
    }
  }

  async loadPreview() {
    try {
      const response = await fetch('/api/plugins/media-grabber/media/random');
      const result = await response.json();
      
      if (result.success) {
        this.showSinglePreview(result.media);
      }
    } catch (error) {
      this.showMessage('预览失败: ' + error.message, false);
    }
  }

  showPreview(media) {
    const preview = document.getElementById('mg-preview');
    preview.innerHTML = media.slice(0, 5).map(item => `
      <div class="media-item">
        ${item.type === 'image' ? 
          `<img src="/api/plugins/media-grabber/media/proxy?url=${encodeURIComponent(item.url)}" style="max-width: 100px;">` :
          `<div class="video-placeholder">🎥 视频</div>`
        }
        <div class="media-info">${item.type} - ${new URL(item.url).hostname}</div>
      </div>
    `).join('');
  }

  showSinglePreview(media) {
    const preview = document.getElementById('mg-preview');
    preview.innerHTML = media ? `
      <div class="media-item large">
        ${media.type === 'image' ? 
          `<img src="/api/plugins/media-grabber/media/proxy?url=${encodeURIComponent(media.url)}" style="max-width: 400px;">` :
          `<video src="/api/plugins/media-grabber/media/proxy?url=${encodeURIComponent(media.url)}" controls style="max-width: 400px;"></video>`
        }
        <div class="media-info">
          <strong>类型:</strong> ${media.type} | 
          <strong>来源:</strong> ${new URL(media.url).hostname}
        </div>
      </div>
    ` : '未找到媒体资源';
  }

  showMessage(message, isSuccess) {
    const resultDiv = document.getElementById('mg-result');
    resultDiv.innerHTML = `<div class="${isSuccess ? 'success' : 'error'}">${message}</div>`;
    setTimeout(() => resultDiv.innerHTML = '', 5000);
  }
}

// 自动注册到云酒馆管理面板
if (typeof window !== 'undefined') {
  // 等待云酒馆管理框架加载
  if (window.TavernAdmin) {
    window.TavernAdmin.registerPlugin(new MediaGrabberAdmin());
  } else {
    // 备用方案：直接初始化
    window.mediaGrabberAdmin = new MediaGrabberAdmin();
  }
}

// 导出供云酒馆调用
if (typeof module !== 'undefined') {
  module.exports = MediaGrabberAdmin;
}
