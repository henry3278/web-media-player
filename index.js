// 文件名: index.js (最终版 v4.0 - 官方文档规范)
(function () {
    const extensionName = 'web-media-player';
    const extensionAuthor = 'Your Name & AI Assistant';
    const extensionVersion = '4.0.0';

    // 默认设置
    const defaultSettings = {
        enabled: true,
        sourceUrl: '',
        startTrigger: '【图片】',
        endTrigger: '【图片】',
        removeTriggers: true,
    };

    let settings = { ...defaultSettings };
    let context = null; // 保存上下文

    // 将更新设置的函数暴露到全局，以便在HTML中通过onchange调用
    // 这是最稳健、最能避免时机问题的方法
    if (!window.WebMediaPlayer) {
        window.WebMediaPlayer = {};
    }
    window.WebMediaPlayer.updateSetting = async function(element, key, type) {
        const value = type === 'checkbox' ? element.checked : element.value;
        settings[key] = value;
        if (context) {
            await context.saveSettings(settings);
        }
    };

    /**
     * onLoad - 这是官方文档规范下的主入口函数
     */
    async function onExtensionLoaded(ctx) {
        context = ctx; // 保存上下文以供他用
        settings = { ...defaultSettings, ...(await context.loadSettings()) };

        // 使用最安全的方式构建HTML，将事件处理器直接写在HTML里
        const settingsHtml = `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Web Media Player</h5>
                </div>
                <p class="mb-1">Displays media from a web source based on triggers in AI messages. (v${extensionVersion})</p>
            </div>
            <div class="list-group-item">
                <label for="wmp-enabled">Enable Plugin</label>
                <input type="checkbox" id="wmp-enabled" onchange="window.WebMediaPlayer.updateSetting(this, 'enabled', 'checkbox')" ${settings.enabled ? 'checked' : ''}>
            </div>
            <div class="list-group-item">
                <label for="wmp-sourceUrl">Source URL / API Endpoint</label>
                <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" oninput="window.WebMediaPlayer.updateSetting(this, 'sourceUrl', 'text')" placeholder="e.g., https://api.example.com/search?q=">
                <small class="form-text text-muted">The search query will be appended to this URL.</small>
            </div>
            <div class="list-group-item">
                <label for="wmp-startTrigger">Start Trigger</label>
                <input type="text" id="wmp-startTrigger" class="form-control" value="${settings.startTrigger}" oninput="window.WebMediaPlayer.updateSetting(this, 'startTrigger', 'text')">
            </div>
            <div class="list-group-item">
                <label for="wmp-endTrigger">End Trigger</label>
                <input type="text" id="wmp-endTrigger" class="form-control" value="${settings.endTrigger}" oninput="window.WebMediaPlayer.updateSetting(this, 'endTrigger', 'text')">
            </div>
            <div class="list-group-item">
                <label for="wmp-removeTriggers">Remove triggers after display</label>
                <input type="checkbox" id="wmp-removeTriggers" onchange="window.WebMediaPlayer.updateSetting(this, 'removeTriggers', 'checkbox')" ${settings.removeTriggers ? 'checked' : ''}>
            </div>
        `;

        // 添加设置面板
        context.addSettings(settingsHtml);

        // 监听消息渲染事件
        SillyTavern.events.on('message-rendered', (type, data) => displayMediaInMessage(type, data));
        
        console.log(`[${extensionName} v${extensionVersion}] Loaded successfully following official documentation.`);
    }

    // -------------------------------------------------------------------------
    // 核心功能逻辑
    // -------------------------------------------------------------------------

    async function displayMediaInMessage(type, data) {
        const message = data.message;
        if (!settings.enabled || message.is_user || !message.mes) return;

        const start = settings.startTrigger;
        const end = settings.endTrigger;
        const regex = new RegExp(`${escapeRegex(start)}(.*?)${escapeRegex(end)}`);
        const match = message.mes.match(regex);

        if (match && match[1]) {
            const query = match[1].trim();
            const fullTriggerText = match[0];
            const messageElement = document.querySelector(`#mes_${message.id} .mes_text`);
            if (!messageElement) return;

            const mediaUrl = await fetchMediaUrl(query);

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

                if (settings.removeTriggers) {
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

    async function fetchMediaUrl(query) {
        if (!settings.sourceUrl) {
            console.warn(`[${extensionName}] Source URL is not set.`);
            return null;
        }
        const requestUrl = `${settings.sourceUrl}${encodeURIComponent(query)}`;
        console.log(`[${extensionName}] Fetching media for query "${query}" from: ${requestUrl}`);
        try {
            return `https://source.unsplash.com/random/800x600?${query}`;
        } catch (error) {
            console.error(`[${extensionName}] Error fetching media:`, error);
            SillyTavern.system.showToast(`[${extensionName}] Error fetching media: ${error.message}`, 'error');
            return null;
        }
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 使用官方文档指定的函数进行注册
    SillyTavern.extension.register(extensionName, extensionAuthor, {
        onExtensionLoaded: onExtensionLoaded,
    });

})();
