// 网页媒体抓取插件管理面板 - 完整版
// 自动集成到云酒馆主管理界面

class MediaGrabberAdmin {
    constructor() {
        this.name = '网页媒体抓取';
        this.id = 'web-media-grabber';
        this.icon = '🌐';
        this.version = '1.0.0';
        this.settings = {};
        this.stats = {};
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        this.injectStyles();
        this.render();
        this.bindEvents();
        
        console.log('✅ 网页媒体抓取管理面板已加载');
        
        // 定时更新统计
        setInterval(() => this.updateStats(), 5000);
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/plugins/web-media-grabber/config');
            this.settings = await response.json();
        } catch (error) {
            this.settings = this.getDefaultSettings();
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/plugins/web-media-grabber/stats');
            this.stats = await response.json();
        } catch (error) {
            this.stats = { totalRequests: 0, imagesFound: 0, videosFound: 0 };
        }
    }

    getDefaultSettings() {
        return {
            enabled: true,
            targetWebsites: ["https://www.kchai.org/"],
            mediaTypes: ["image", "video"],
            excludeKeywords: ["icon", "logo", "ad"],
            requestTimeout: 8000,
            cacheDuration: 600000
        };
    }

    injectStyles() {
        const styles = `
            .web-media-grabber-panel {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #e1e5e9;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .media-grabber-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e1e5e9;
            }
            
            .media-grabber-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .stat-item {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid #e1e5e9;
            }
            
            .stat-number {
                font-size: 1.5em;
                font-weight: bold;
                color: #007bff;
            }
            
            .stat-label {
                font-size: 0.9em;
                color: #6c757d;
            }
            
            .media-preview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .media-item {
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                transition: transform 0.2s;
            }
            
            .media-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .media-item img {
                width: 100%;
                height: 120px;
                object-fit: cover;
            }
            
            .video-placeholder {
                width: 100%;
                height: 120px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2em;
                color: white;
            }
            
            .media-info {
                padding: 10px;
                background: white;
            }
            
            .media-type {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: bold;
            }
            
            .media-type.image { background: #d4edda; color: #155724; }
            .media-type.video { background: #d1ecf1; color: #0c5460; }
            
            .test-section {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
            }
            
            .btn-group {
                display: flex;
                gap: 10px;
                margin: 15px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
                transition: all 0.2s;
            }
            
            .btn-primary { background: #007bff; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-success { background: #28a745; color: white; }
            .btn-warning { background: #ffc107; color: black; }
            .btn-info { background: #17a2b8; color: white; }
            
            .btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            
            .form-group {
                margin: 15px 0;
            }
            
            .form-control {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 0.9em;
            }
            
            .form-control:focus {
                border-color: #007bff;
                outline: none;
                box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
            }
            
            .checkbox-group {
                display: flex;
                gap: 15px;
                margin: 10px 0;
            }
            
            .checkbox-group label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            
            .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; }
            .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; }
            .info { background: #d1ecf1; color: #0c5460; padding: 10px; border-radius: 4px; }
        `;
        
        if (!document.querySelector('#media-grabber-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'media-grabber-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    render() {
        // 创建管理面板容器
        this.container = document.createElement('div');
        this.container.className = 'web-media-grabber-panel';
        this.container.innerHTML = this.getTemplate();
        
        // 插入到云酒馆管理面板
        this.injectToAdminPanel();
    }

    injectToAdminPanel() {
        // 尝试多种插入位置
        const injectors = [
            () => {
                const container = document.querySelector('.admin-container');
                if (container) {
                    container.appendChild(this.container);
                    return true;
                }
                return false;
            },
            () => {
                const container = document.querySelector('.settings-panel');
                if (container) {
                    container.appendChild(this.container);
                    return true;
                }
                return false;
            },
            () => {
                const container = document.querySelector('[class*="admin"]');
                if (container) {
                    container.appendChild(this.container);
                    return true;
                }
                return false;
            },
            () => {
                const container = document.querySelector('main');
                if (container) {
                    container.appendChild(this.container);
                    return true;
                }
                return false;
            }
        ];
        
        for (const injector of injectors) {
            if (injector()) {
                console.log('✅ 管理面板集成成功');
                return;
            }
        }
        
        // 备用方案：插入到body
        document.body.appendChild(this.container);
        console.log('⚠️ 管理面板插入到body');
    }

    getTemplate() {
        return `
            <div class="media-grabber-header">
                <h3 style="margin: 0;">${this.icon} ${this.name} <small>v${this.version}</small></h3>
                <div style="color: #6c757d; font-size: 0.9em;">
                    最后更新: ${this.stats.lastUpdate ? new Date(this.stats.lastUpdate).toLocaleTimeString() : '从未'}
                </div>
            </div>
            
            <div class="media-grabber-stats">
                <div class="stat-item">
                    <div class="stat-number">${this.stats.totalRequests || 0}</div>
                    <div class="stat-label">总请求数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${this.stats.imagesFound || 0}</div>
                    <div class="stat-label">图片数量</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${this.stats.videosFound || 0}</div>
                    <div class="stat-label">视频数量</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${this.stats.cacheSize || 0}</div>
                    <div class="stat-label">缓存数量</div>
                </div>
            </div>

            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="mg-enabled" ${this.settings.enabled ? 'checked' : ''} 
                           style="width: auto;">
                    <strong style="font-size: 1.1em;">启用网页媒体抓取</strong>
                </label>
            </div>

            <div id="mg-settings" style="${this.settings.enabled ? '' : 'display: none;'}">
                <div class="form-group">
                    <label><strong>目标网站 (每行一个URL):</strong></label>
                    <textarea id="mg-websites" rows="4" class="form-control" 
                              placeholder="https://example.com&#10;https://site2.com/gallery">${this.settings.targetWebsites ? this.settings.targetWebsites.join('\n') : ''}</textarea>
                </div>

                <div class="form-group">
                    <label><strong>抓取媒体类型:</strong></label>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="mg-media-type" value="image" 
                                   ${this.settings.mediaTypes && this.settings.mediaTypes.includes('image') ? 'checked' : ''}>
                            图片
                        </label>
                        <label>
                            <input type="checkbox" name="mg-media-type" value="video" 
                                   ${this.settings.mediaTypes && this.settings.mediaTypes.includes('video') ? 'checked' : ''}>
                            视频
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label><strong>排除关键词 (逗号分隔):</strong></label>
                    <input type="text" id="mg-keywords" class="form-control" 
                           value="${this.settings.excludeKeywords ? this.settings.excludeKeywords.join(',') : ''}" 
                           placeholder="icon,logo,ad,spacer">
                </div>

                <div class="btn-group">
                    <button class="btn btn-primary" onclick="mediaGrabberAdmin.saveSettings()">
                        💾 保存设置
                    </button>
                    <button class="btn btn-success" onclick="mediaGrabberAdmin.testConnection()">
                        🔗 测试连接
                    </button>
                    <button class="btn btn-warning" onclick="mediaGrabberAdmin.clearCache()">
                        🗑️ 清空缓存
                    </button>
                    <button class="btn btn-info" onclick="mediaGrabberAdmin.loadPreview()">
                        🔄 刷新预览
                    </button>
                </div>

                <div id="mg-result"></div>

                <div class="test-section">
                    <h4>🎯 实时预览</h4>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <select id="mg-preview-type" class="form-control" style="width: auto;">
                            <option value="random">随机媒体</option>
                            <option value="image">仅图片</option>
                            <option value="video">仅视频</option>
                        </select>
                        <button class="btn btn-secondary" onclick="mediaGrabberAdmin.loadPreview()">
                            获取预览
                        </button>
                    </div>
                    <div id="mg-preview" class="media-preview-grid"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // 启用/禁用切换
        const enabledCheckbox = this.container.querySelector('#mg-enabled');
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', (e) => {
                const settingsDiv = this.container.querySelector('#mg-settings');
                settingsDiv.style.display = e.target.checked ? 'block' : 'none';
                this.saveSettings();
            });
        }
    }

    async saveSettings() {
        const settings = {
            enabled: this.container.querySelector('#mg-enabled').checked,
            targetWebsites: this.container.querySelector('#mg-websites').value.split('\n').filter(s => s.trim()),
            mediaTypes: Array.from(this.container.querySelectorAll('input[name="mg-media-type"]:checked')).map(cb => cb.value),
            excludeKeywords: this.container.querySelector('#mg-keywords').value.split(',').filter(s => s.trim())
        };

        try {
            const response = await fetch('/api/plugins/web-media-grabber/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            const result = await response.json();
            this.showMessage(result.success ? '✅ 设置已保存' : '❌ 保存失败', result.success ? 'success' : 'error');
        } catch (error) {
            this.showMessage('❌ 保存失败: ' + error.message, 'error');
        }
    }

    async testConnection() {
        const website = this.container.querySelector('#mg-websites').value.split('\n')[0];
        if (!website) {
            this.showMessage('❌ 请输入目标网站', 'error');
            return;
        }

        try {
            this.showMessage('🔍 测试连接中...', 'info');
            
            const response = await fetch('/api/plugins/web-media-grabber/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ website })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showMessage(`✅ 测试成功！找到 ${result.count} 个媒体资源 (图片: ${result.images}, 视频: ${result.videos})`, 'success');
                this.showTestResults(result.media);
            } else {
                this.showMessage('❌ 测试失败: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('❌ 测试失败: ' + error.message, 'error');
        }
    }

    showTestResults(media) {
        const preview = this.container.querySelector('#mg-preview');
        if (!preview) return;

        preview.innerHTML = media.map(item => `
            <div class="media-item">
                ${item.type === 'image' ? 
                    `<img src="/api/plugins/web-media-grabber/media/proxy?url=${encodeURIComponent(item.url)}" alt="${item.filename}">` :
                    `<div class="video-placeholder">🎥</div>`
                }
                <div class="media-info">
                    <span class="media-type ${item.type}">${item.type}</span>
                    <div style="font-size: 0.8em; margin-top: 5px;">${item.filename}</div>
                </div>
            </div>
        `).join('');
    }

    async loadPreview() {
        const type = this.container.querySelector('#mg-preview-type').value;
        
        try {
            const response = await fetch(`/api/plugins/web-media-grabber/media/random?type=${type}`);
            const result = await response.json();
            
            if (result.success && result.media) {
                this.showSinglePreview(result.media);
            } else {
                this.showMessage('❌ 未找到媒体资源', 'error');
            }
        } catch (error) {
            this.showMessage('❌ 加载预览失败: ' + error.message, 'error');
        }
    }

    showSinglePreview(media) {
        const preview = this.container.querySelector('#mg-preview');
        if (!preview) return;

        preview.innerHTML = `
            <div class="media-item" style="grid-column: 1 / -1; max-width: 400px; margin: 0 auto;">
                ${media.type === 'image' ? 
                    `<img src="/api/plugins/web-media-grabber/media/proxy?url=${encodeURIComponent(media.url)}" alt="${media.filename}" style="height: 200px;">` :
                    `<div class="video-placeholder" style="height: 200px; font-size: 3em;">🎥</div>`
                }
                <div class="media-info">
                    <span class="media-type ${media.type}">${media.type}</span>
                    <div><strong>来源:</strong> ${new URL(media.url).hostname}</div>
                    <div><strong>文件:</strong> ${media.filename}</div>
                </div>
            </div>
        `;
    }

    async clearCache() {
        try {
            await fetch('/api/plugins/web-media-grabber/cache/clear', { method: 'POST' });
            this.showMessage('✅ 缓存已清空', 'success');
            await this.loadStats();
        } catch (error) {
            this.showMessage('❌ 清空缓存失败', 'error');
        }
    }

    async updateStats() {
        await this.loadStats();
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const elements = {
            'mg-total-requests': this.stats.totalRequests,
            'mg-images-found': this.stats.imagesFound,
            'mg-videos-found': this.stats.videosFound
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = this.container.querySelector(`#${id}`);
            if (element) element.textContent = value;
        });
    }

    showMessage(message, type) {
        const resultDiv = this.container.querySelector('#mg-result');
        if (resultDiv) {
            resultDiv.innerHTML = `<div class="${type}">${message}</div>`;
            setTimeout(() => resultDiv.innerHTML = '', 5000);
        }
    }
}

// 自动注册到云酒馆管理面板
if (typeof window !== 'undefined') {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.mediaGrabberAdmin = new MediaGrabberAdmin();
            window.mediaGrabberAdmin.init();
        });
    } else {
        window.mediaGrabberAdmin = new MediaGrabberAdmin();
        window.mediaGrabberAdmin.init();
    }
}

// 兼容模块化加载
if (typeof module !== 'undefined') {
    module.exports = MediaGrabberAdmin;
}
