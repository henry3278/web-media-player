(function () {
    // 插件元数据
    const extensionName = 'web-media-player'; // 内部名称，用于设置等
    const extensionAuthor = 'Your Name & AI Assistant';
    const extensionVersion = '2.0.0';

    // 默认设置
    const defaultSettings = {
        enabled: true,
        sourceUrl: '',
        startTrigger: '【图片】',
        endTrigger: '【图片】',
        removeTriggers: true,
    };

    // 插件主设置对象
    let settings = { ...defaultSettings };

    /**
     * 【核心功能 - 你需要在这里编写采集逻辑】
     */
    async function fetchMediaUrl(query) {
        if (!settings.sourceUrl) {
            console.warn(`[${extensionName}] Source URL is not set.`);
            return null;
        }
        const requestUrl = `${settings.sourceUrl}${encodeURIComponent(query)}`;
        console.log(`[${extensionName}] Fetching media for query "${query}" from: ${requestUrl}`);
        try {
            // 【临时占位符】返回一个示例图片，方便你测试插件的其他部分是否正常工作。
            return `https://source.unsplash.com/random/800x600?${query}`;
        } catch (error) {
            console.error(`[${extensionName}] Error fetching media:`, error);
            SillyTavern.system.showToast(`[${extensionName}] Error fetching media: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * 在消息中查找并显示媒体
     */
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

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 插件加载时执行的核心函数
     */
    async function onExtensionLoaded(context) {
        settings = { ...defaultSettings, ...(await context.loadSettings()) };

        const settingsHtml = `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Web Media Player</h5>
                </div>
                <p class="mb-1">Displays media from a web source based on triggers in AI messages. (v${extensionVersion})</p>
            </div>
            <div class="list-group-item"><label for="wmp-enabled">Enable Plugin</label><input type="checkbox" id="wmp-enabled" class="wmp-setting" ${settings.enabled ? 'checked' : ''}></div>
            <div class="list-group-item"><label for="wmp-sourceUrl">Source URL / API Endpoint</label><input type="text" id="wmp-sourceUrl" class="wmp-setting form-control" value="${settings.sourceUrl}" placeholder="e.g., https://api.example.com/search?q="><small class="form-text text-muted">The search query will be appended to this URL.</small></div>
            <div class="list-group-item"><label for="wmp-startTrigger">Start Trigger</label><input type="text" id="wmp-startTrigger" class="wmp-setting form-control" value="${settings.startTrigger}"></div>
            <div class="list-group-item"><label for="wmp-endTrigger">End Trigger</label><input type="text" id="wmp-endTrigger" class="wmp-setting form-control" value="${settings.endTrigger}"></div>
            <div class="list-group-item"><label for="wmp-removeTriggers">Remove triggers after display</label><input type="checkbox" id="wmp-removeTriggers" class="wmp-setting" ${settings.removeTriggers ? 'checked' : ''}></div>
        `;

        context.addSettings(settingsHtml);

        document.querySelectorAll('.wmp-setting').forEach(element => {
            element.addEventListener('change', async (event) => {
                const key = event.target.id.replace('wmp-', '');
                const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
                settings[key] = value;
                await context.saveSettings(settings);
            });
        });

        SillyTavern.events.on('message-rendered', (type, data) => displayMediaInMessage(type, data));
        console.log(`[${extensionName}] v${extensionVersion} loaded successfully.`);
    }

    // 使用 SillyTavern 的标准方式注册插件
    SillyTavern.extension.register(extensionName, extensionAuthor, {
        onExtensionLoaded: onExtensionLoaded,
    });
})();
