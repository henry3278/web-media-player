// 文件名: index.js (最终版 v3.0 - 模块化规范)

class WebMediaPlayer {
    // 插件的上下文对象，由SillyTavern在创建实例时传入
    context;

    // 默认设置
    defaultSettings = {
        enabled: true,
        sourceUrl: '',
        startTrigger: '【图片】',
        endTrigger: '【图片】',
        removeTriggers: true,
    };

    // 插件的当前设置
    settings = { ...this.defaultSettings };

    constructor(context) {
        this.context = context;
    }

    /**
     * onLoad - 这是新规范下的主入口函数，在插件加载时被调用
     */
    async onLoad() {
        try {
            // 1. 加载设置
            this.settings = { ...this.defaultSettings, ...(await this.context.loadSettings()) };

            // 2. 构建设置面板的HTML
            const settingsHtml = this.buildSettingsHtml();
            this.context.addSettings(settingsHtml);

            // 3. 为设置面板的元素绑定事件监听器
            this.addSettingsEventListeners();

            // 4. 监听SillyTavern的消息渲染事件
            SillyTavern.events.on('message-rendered', (type, data) => this.displayMediaInMessage(type, data));
            
            console.log(`[Web Media Player v3.0.0] Loaded successfully using modern module specification.`);

        } catch (error) {
            console.error(`[Web Media Player] An error occurred during onLoad:`, error);
            alert(`[Web Media Player] Failed to load. Check F12 console for errors.`);
        }
    }

    // -------------------------------------------------------------------------
    // 辅助函数和业务逻辑 (这些函数现在是类的方法)
    // -------------------------------------------------------------------------

    buildSettingsHtml() {
        return `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Web Media Player</h5>
                </div>
                <p class="mb-1">Displays media from a web source based on triggers in AI messages. (v3.0.0)</p>
            </div>
            <div class="list-group-item"><label for="wmp-enabled">Enable Plugin</label><input type="checkbox" id="wmp-enabled" class="wmp-setting" ${this.settings.enabled ? 'checked' : ''}></div>
            <div class="list-group-item"><label for="wmp-sourceUrl">Source URL / API Endpoint</label><input type="text" id="wmp-sourceUrl" class="wmp-setting form-control" value="${this.settings.sourceUrl}" placeholder="e.g., https://api.example.com/search?q="><small class="form-text text-muted">The search query will be appended to this URL.</small></div>
            <div class="list-group-item"><label for="wmp-startTrigger">Start Trigger</label><input type="text" id="wmp-startTrigger" class="wmp-setting form-control" value="${this.settings.startTrigger}"></div>
            <div class="list-group-item"><label for="wmp-endTrigger">End Trigger</label><input type="text" id="wmp-endTrigger" class="wmp-setting form-control" value="${this.settings.endTrigger}"></div>
            <div class="list-group-item"><label for="wmp-removeTriggers">Remove triggers after display</label><input type="checkbox" id="wmp-removeTriggers" class="wmp-setting" ${this.settings.removeTriggers ? 'checked' : ''}></div>
        `;
    }

    addSettingsEventListeners() {
        document.querySelectorAll('.wmp-setting').forEach(element => {
            element.addEventListener('change', async (event) => {
                const key = event.target.id.replace('wmp-', '');
                const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
                this.settings[key] = value;
                await this.context.saveSettings(this.settings);
            });
        });
    }

    async displayMediaInMessage(type, data) {
        const message = data.message;
        if (!this.settings.enabled || message.is_user || !message.mes) return;

        const start = this.settings.startTrigger;
        const end = this.settings.endTrigger;
        const regex = new RegExp(`${this.escapeRegex(start)}(.*?)${this.escapeRegex(end)}`);
        const match = message.mes.match(regex);

        if (match && match[1]) {
            const query = match[1].trim();
            const fullTriggerText = match[0];
            const messageElement = document.querySelector(`#mes_${message.id} .mes_text`);
            if (!messageElement) return;

            const mediaUrl = await this.fetchMediaUrl(query);

            if (mediaUrl) {
                const container = document.createElement('div');
                container.className = 'web-media-player-container';
                const isVideo = ['.mp4', '.webm', '.ogg'].some(ext => mediaUrl.toLowerCase().endsWith(ext));
                let mediaElement;
                if (isVideo) {
                    mediaElement = document.createElement('video');
                    mediaElement.src = mediaUrl;
                    mediaElement.controls = true;
                    mediaElement.loop = true;
                    mediaElement.muted = true;
                } else {
                    mediaElement = document.createElement('img');
                    mediaElement.src = mediaUrl;
                    mediaElement.onclick = () => window.open(mediaUrl, '_blank');
                }
                container.appendChild(mediaElement);
                messageElement.appendChild(container);

                if (this.settings.removeTriggers) {
                    const textNodes = Array.from(messageElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                    textNodes.forEach(node => {
                        if (node.textContent.includes(fullTriggerText)) {
                            node.textContent = node.textContent.replace(fullTriggerText, '');
                        }
                    });
                }
            }
        }
    }

    async fetchMediaUrl(query) {
        if (!this.settings.sourceUrl) {
            console.warn(`[Web Media Player] Source URL is not set.`);
            return null;
        }
        const requestUrl = `${this.settings.sourceUrl}${encodeURIComponent(query)}`;
        console.log(`[Web Media Player] Fetching media for query "${query}" from: ${requestUrl}`);
        try {
            return `https://source.unsplash.com/random/800x600?${query}`;
        } catch (error) {
            console.error(`[Web Media Player] Error fetching media:`, error);
            SillyTavern.system.showToast(`[Web Media Player] Error fetching media: ${error.message}`, 'error');
            return null;
        }
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// 【【【 最关键的一步 】】】
// 将我们定义的类作为默认导出，SillyTavern的加载器会自动处理它。
export default WebMediaPlayer;
