// 网页媒体抓取插件管理面板
// 自动集成到云酒馆主管理界面

class MediaGrabberAdmin {
    constructor() {
        this.name = '网页媒体抓取';
        this.id = 'web-media-grabber';
        this.icon = '🌐';
        this.version = '1.0.0';
        this.settings = {};
    }

    async init() {
        await this.loadSettings();
        this.injectStyles();
        this.render();
        this.bindEvents();
        
        console.log('✅ 网页媒体抓取管理面板已加载');
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/plugins/web-media-grabber/config');
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
            excludeKeywords: ["icon", "logo", "ad"],
            requestTimeout: 8000
        };
    }

    injectStyles() {
        const styles = `
            .web-media-grabber-panel {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #e0e0e0;
            }
            .media-grabber-stats {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }
            .stat-item {
                background: white;
                padding: 10px 15px;
                border-radius: 6px;
                border: 1px solid #ddd;
            }
            .media-preview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 10px;
                margin: 15px 0;
            }
            .media-item {
                border: 1px solid #ddd;
                border-radius: 6px;
                overflow: hidden;
                text-align: center;
            }
            .media-item img {
                width: 100%;
                height: 80px;
                object-fit: cover;
            }
            .video-placeholder {
                width: 100%;
                height: 80px;
                background: #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }
            .media-info {
                padding: 5px;
                font-size: 12px;
                background: white;
            }
            .test-result {
                margin: 15px 0;
                padding: 10px;
                border-radius: 4px;
            }
            .test-success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
            }
            .test-error {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
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
        const possibleContainers = [
            '.admin-container',
            '.settings-panel',
            '.plugin-settings',
            '[class*="admin"]',
            '#adminContent'
        ];
        
        for (const selector of possibleContainers) {
            const container = document.querySelector(selector);
            if (container) {
                container.appendChild(this.container);
                console.log(`✅ 管理面板插入到: ${selector}`);
                return;
            }
        }
        
        // 如果没找到合适位置，插入到body末尾
        document.body.appendChild(this.container);
        console.log('⚠️ 管理面板插入到body末尾');
    }

    getTemplate() {
        return `
            <h3>${this.icon} ${this.name} <small>v${this.version}</small></h3>
            
            <div class="media-grabber-stats">
                <div class="stat-item">📊 总请求: <span id="mg-total-requests">0</span></div>
                <div class="stat-item">🖼️ 图片: <span id="mg-images-found">0</span></div>
                <div class="stat-item">🎥 视频: <span id="mg-videos-found">0</span></div>
            </div>

            <div class="form-group">
                <label>
                    <input type="checkbox" id="mg-enabled" ${this.settings.enabled ? 'checked' : ''}>
                    <strong>启用网页媒体抓取</strong>
                </label>
            </div>

            <div id="mg-settings" style="${this.settings.enabled ? '' : 'display: none;'}">
                <div class="form-group">
                    <label for="mg-websites"><strong>目标网站 (每行一个URL):</strong></label>
                    <textarea id="mg-websites" rows="4" class="form-control">${this.settings.targetWebsites.join('\n')}</textarea>
                </div>

                <div class="form-group">
                    <label><strong>抓取媒体类型:</strong></label>
                    <div>
                        <label><input type="checkbox" name="mg-media-type" value="image" ${this.settings.mediaTypes.includes('image') ? 'checked' : ''}> 图片</label>
                        <label><input type="checkbox" name="mg-media-type" value="video" ${this.settings.mediaTypes.includes('video') ? 'checked' : ''}> 视频</label>
                    </div>
                </div>

                <div class="form-group">
                    <label for="mg-keywords"><strong>排除关键词 (逗号分隔):</strong></label>
                    <input type="text" id="mg-keywords" value="${this.settings.excludeKeywords.join(',')}" class="form-control">
                </div>

                <div class="form-group">
                    <button onclick="mediaGrabberAdmin.saveSettings()" class="btn btn-primary">💾 保存设置</button>
                    <button onclick="mediaGrabberAdmin.testConnection()" class="btn btn-secondary">🔗 测试连接</button>
                    <button onclick="mediaGrabberAdmin.clearCache()" class="btn btn-warning">🗑️ 清空缓存</button>
                </div>

                <div id="mg-result"></div>

                <div class="preview-section">
                    <h4>🎯 实时预览</h4>
                    <div class="form-group">
                        <select id="mg-preview-type" class="form-control">
                            <option value="random">随机媒体</option>
                            <option value="image">仅图片</option>
                            <option value="video">仅视频</option>
                        </select>
                    </div>
                    <button onclick="mediaGrabberAdmin.loadPreview()" class="btn btn-info">🔄 刷新预览</button>
                    <div
