// 网页媒体抓取设置面板 - 直接嵌入云酒馆设置页面
class MediaGrabberPanel {
    constructor() {
        this.name = '网页媒体抓取';
        this.config = {};
        this.stats = {};
    }

    async init() {
        await this.loadConfig();
        await this.loadStats();
        this.injectStyles();
        this.renderPanel();
        this.bindEvents();
        
        // 每5秒更新状态
        setInterval(() => this.updateStatus(), 5000);
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/plugins/media-grabber/config');
            this.config = await response.json();
        } catch (error) {
            this.config = this.getDefaultConfig();
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/plugins/media-grabber/stats');
            this.stats = await response.json();
        } catch (error) {
            this.stats = { status: '未知', totalImages: 0, totalVideos: 0, cacheSize: 0 };
        }
    }

    getDefaultConfig() {
        return {
            enabled: true,
            targetWebsites: ["https://www.kchai.org/"],
            mediaTypes: ["image", "video"],
            playMode: "random",
            switchInterval: 5000,
            pollInterval: 30000,
            aiSwitch: true,
            playerSwitch: true,
            loopPlay: true,
            showInfo: false,
            preload: true,
            coolDown: 3000,
            filterEffect: "fade"
        };
    }

    injectStyles() {
        const styles = `
            <style>
            .media-grabber-panel {
                background: #2d3748;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #4a5568;
                color: white;
                font-family: system-ui;
            }
            
            .media-grabber-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #4a5568;
            }
            
            .media-grabber-header h3 {
                margin: 0;
                color: #e2e8f0;
            }
            
            .status-indicator {
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 0.9em;
                font-weight: bold;
            }
            
            .status-indicator.active {
                background: #48bb78;
                color: white;
            }
            
            .status-indicator.inactive {
                background: #e53e3e;
                color: white;
            }
            
            .status-row {
                display: flex;
                margin: 10px 0;
                padding: 8px 0;
            }
            
            .status-row .label {
                width: 100px;
                font-weight: 600;
                color: #a0aec0;
            }
            
            .status-row .value {
                color: #e2e8f0;
            }
            
            .button-row {
                display: flex;
                gap: 10px;
                margin: 15px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            }
            
            .btn-primary { background: #4299e1; color: white; }
            .btn-secondary { background: #718096; color: white; }
            .btn-success { background: #48bb78; color: white; }
            
            .switch-row {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            
            .switch {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
                margin-right: 10px;
            }
            
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #718096;
                transition: .4s;
                border-radius: 24px;
            }
            
            .slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .slider {
                background-color: #4299e1;
            }
            
            input:checked + .slider:before {
                transform: translateX(26px);
            }
            
            .setting-row {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            
            .setting-row .label {
                width: 100px;
                font-weight: 600;
                color: #a0aec0;
            }
            
            .setting-input {
                width: 80px;
                padding: 4px 8px;
                background: #4a5568;
                border: 1px solid #718096;
                border-radius: 4px;
                color: white;
            }
            
            .setting-select {
                background: #4a5568;
                border: 1px solid #718096;
                border-radius: 4px;
                color: white;
                padding: 4px 8px;
            }
            
            .unit {
                margin-left: 8px;
                color: #a0aec0;
            }
            
            .stats-row {
                display: flex;
                gap: 15px;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #4a5568;
                color: #a0aec0;
            }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    renderPanel() {
        const panelHTML = `
            <div class="media-grabber-panel">
                <div class="media-grabber-header">
                    <h3>🌐 网页媒体抓取</h3>
                    <div class="status-indicator ${this.stats.status === '运行中' ? 'active' : 'inactive'}">
                        ● ${this.stats.status || '未知'}
                    </div>
                </div>
                
                <div class="status-row">
                    <span class="label">服务状态:</span>
                    <span class="value">${this.stats.status || '未知'}</span>
                </div>
                
                <div class="status-row">
                    <span class="label">目标网站:</span>
                    <span class="value">${this.config.targetWebsites ? this.config.targetWebsites[0] : '未设置'}</span>
                </div>
                
                <div class="button-row">
                    <button class="btn btn-primary" onclick="mediaGrabberPanel.testConnection()">测试连接</button>
                    <button class="btn btn-secondary" onclick="mediaGrabberPanel.refreshService()">刷新服务</button>
                    <button class="btn btn-success" onclick="mediaGrabberPanel.showPreview()">预览媒体</button>
                </div>
                
                <div class="switch-row">
                    <label class="switch">
                        <input type="checkbox" id="mg-enabled" ${this.config.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                        <span class="switch-label">启用插件</span>
                    </label>
                </div>
                
                <div class="switch-row">
                    <label class="switch">
                        <input type="checkbox" id="mg-ai-switch" ${this.config.aiSwitch ? 'checked' : ''}>
                        <span class="slider"></span>
                        <span class="switch-label">AI回复时插入</span>
                    </label>
                </div>
                
                <div class="switch-row">
                    <label class="switch">
                        <input type="checkbox" id="mg-player-switch" ${this.config.playerSwitch ? 'checked' : ''}>
                        <span class="slider"></span>
                        <span class="switch-label">玩家发送时插入</span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <span class="label">播放模式:</span>
                    <select id="mg-play-mode" class="setting-select">
                        <option value="random" ${this.config.playMode === 'random' ? 'selected' : ''}>随机播放</option>
                        <option value="sequential" ${this.config.playMode === 'sequential' ? 'selected' : ''}>顺序播放</option>
                    </select>
                </div>
                
                <div class="setting-row">
                    <span class="label">切换间隔:</span>
                    <input type="number" id="mg-switch-interval" value="${this.config.switchInterval}" class="setting-input">
                    <span class="unit">毫秒</span>
                </div>
                
                <div class="setting-row">
                    <span class="label">轮询间隔:</span>
                    <input type="number" id="mg-poll-interval" value="${this.config.pollInterval}" class="setting-input">
                    <span class="unit">毫秒</span>
                </div>
                
                <div class="stats-row">
                    <span>图片: ${this.stats.totalImages || 0}</span>
                    <span>视频: ${this.stats.totalVideos || 0}</span>
                    <span>缓存: ${this.stats.cacheSize || 0}</span>
                </div>
            </div>
        `;

        // 插入到云酒馆设置页面
        this.insertIntoSettingPage(panelHTML);
    }

    insertIntoSettingPage(html) {
        // 尝试多种插入位置
        const selectors = [
            '.settings-container',
            '.admin-settings', 
            '.plugin-settings',
            '#settingsContent',
            '.tab-content',
            'main'
        ];
        
        for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (container) {
                container.insertAdjacentHTML('beforeend', html);
                this.container = container.lastElementChild;
                console.log('✅ 媒体抓取面板已集成到:', selector);
                return;
            }
        }
        
        // 备用方案
        document.body.insertAdjacentHTML('beforeend', html);
        this.container = document.body.lastElementChild;
    }

    bindEvents() {
        // 延迟绑定，等待DOM渲染
        setTimeout(() => {
            const inputs = ['mg-enabled', 'mg-ai-switch', 'mg-player-switch', 'mg-play-mode', 'mg-switch-interval', 'mg-poll-interval'];
            inputs.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', () => this.saveSettings());
                }
            });
        }, 100);
    }

    async saveSettings() {
        const config = {
            enabled: document.getElementById('mg-enabled')?.checked || false,
            aiSwitch: document.getElementById('mg-ai-switch')?.checked || false,
            playerSwitch: document.getElementById('mg-player-switch')?.checked || false,
            playMode: document.getElementById('mg-play-mode')?.value || 'random',
            switchInterval: parseInt(document.getElementById('mg-switch-interval')?.value) || 5000,
            pollInterval: parseInt(document.getElementById('mg-poll-interval')?.value) || 30000,
            targetWebsites: this.config.targetWebsites || ["https://www.kchai.org/"]
        };

        try {
            await fetch('/api/plugins/media-grabber/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            this.showMessage('设置已保存', 'success');
        } catch (error) {
            this.showMessage('保存失败', 'error');
        }
    }

    async testConnection() {
        this.showMessage('测试连接中...', 'info');
        try {
            const response = await fetch('/api/plugins/media-grabber/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ website: this.config.targetWebsites[0] })
            });
            const result = await response.json();
            this.showMessage(result.success ? '连接成功!' : '连接失败', result.success ? 'success' : 'error');
        } catch (error) {
            this.showMessage('测试失败', 'error');
        }
    }

    async refreshService() {
        await this.loadStats();
        this.updateDisplay();
        this.showMessage('服务已刷新', 'success');
    }

    async showPreview() {
        try {
            const response = await fetch('/api/plugins/media-grabber/media/random');
            const result = await response.json();
            if (result.success) {
                window.open(result.media.url, '_blank');
            }
        } catch (error) {
            this.showMessage('预览失败', 'error');
        }
    }

    updateDisplay() {
        if (!this.container) return;
        
        const statusElement = this.container.querySelector('.status-indicator');
        if (statusElement) {
            statusElement.textContent = `● ${this.stats.status || '未知'}`;
            statusElement.className = `status-indicator ${this.stats.status === '运行中' ? 'active' : 'inactive'}`;
        }
        
        const statsElements = this.container.querySelectorAll('.stats-row span');
        if (statsElements.length >= 3) {
            statsElements[0].textContent = `图片: ${this.stats.totalImages || 0}`;
            statsElements[1].textContent = `视频: ${this.stats.totalVideos || 0}`;
            statsElements[2].textContent = `缓存: ${this.stats.cacheSize || 0}`;
        }
    }

    async updateStatus() {
        await this.loadStats();
        this.updateDisplay();
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px; 
            border-radius: 6px; z-index: 10000; font-weight: 600;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }
}

// 自动初始化
let mediaGrabberPanel;
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        mediaGrabberPanel = new MediaGrabberPanel();
        mediaGrabberPanel.init();
    });
}
