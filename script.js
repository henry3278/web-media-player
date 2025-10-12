(function () {
    // 插件元数据
    const extensionName = 'web-media-player';
    const extensionAuthor = 'Your Name & AI Assistant';
    const extensionVersion = '1.1.0'; // 版本升级

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
     * 根据关键词从你的目标网站获取媒体链接。
     * @param {string} query - 从聊天消息中提取的搜索词，例如 "猫"。
     * @returns {Promise<string|null>} - 返回媒体的直链 URL，如果找不到则返回 null。
     */
    async function fetchMediaUrl(query) {
        if (!settings.sourceUrl) {
            console.warn('Web Media Player: Source URL is not set.');
            return null;
        }

        const requestUrl = `${settings.sourceUrl}${encodeURIComponent(query)}`;
        console.log(`[Web Media Player] Fetching media for query "${query}" from: ${requestUrl}`);

        try {
            // ******************************************************************
            // TODO: 在这里实现你的采集逻辑
            // 这部分完全取决于你的目标网站。
            //
            // 案例1：如果目标网站提供的是 JSON API
            // const response = await fetch(requestUrl);
            // if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            // const data = await response.json();
            // const mediaUrl = data.results[0]?.imageUrl; // 假设的JSON结构
            // return mediaUrl || null;
            //
            // 案例2：如果需要从 HTML 页面中爬取 (注意CORS跨域问题)
            // const response = await fetch(requestUrl);
            // const html = await response.text();
            // const parser = new DOMParser();
            // const doc = parser.parseFromString(html, 'text/html');
            // const imgElement = doc.querySelector('.main-image'); // 假设的CSS选择器
            // const mediaUrl = imgElement ? imgElement.src : null;
            // return mediaUrl;
            // ******************************************************************

            // 【临时占位符】返回一个示例图片，方便你测试插件的其他部分是否正常工作。
            // 在你完成上面的采集逻辑后，请删除或注释掉下面这行。
            return `https://source.unsplash.com/random/800x600?${query}`;

        } catch (error) {
            console.error('[Web Media Player] Error fetching media:', error);
            SillyTavern.system.showToast(`[Web Media Player] Error fetching media: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * 在消息中查找并显示媒体
     * @param {string} type - 事件类型
     * @param {object} data - 事件数据，包含消息对象
     */
    async function displayMediaInMessage(type, data) {
        const message = data.message;
        if (!settings.enabled || message.is_user || !message.mes) {
            return;
        }

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
                    mediaElement.autoplay = false;
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
                    // 使用更安全的方式移除文本，避免破坏媒体元素
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
     * 当插件加载时执行
     * @param {object} context - SillyTavern 提供的上下文对象
     */
    async function onExtensionLoaded(context) {
        // 加载设置
        settings = { ...defaultSettings, ...(await context.loadSettings()) };

        // 创建设置面板的HTML
        const settingsHtml = `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Web Media Player</h5>
                </div>
                <p class="mb-1">Displays media from a web source based on triggers in AI messages. (v${extensionVersion})</p>
            </div>
            <div class="list-group-item">
                <label for="wmp-enabled">Enable Plugin</label>
                <input type="checkbox" id="wmp-enabled" class="wmp-setting" ${settings.enabled ? 'checked' : ''}>
            </div>
            <div class="list-group-item">
                <label for="wmp-sourceUrl">Source URL / API Endpoint</label>
                <input type="text" id="wmp-sourceUrl" class="wmp-setting form-control" value="${settings.sourceUrl}" placeholder="e.g., https://api.example.com/search?q=">
                <small class="form-text text-muted">The search query will be appended to this URL.</small>
            </div>
            <div class="list-group-item">
                <label for="wmp-startTrigger">Start Trigger</label>
                <input type="text" id="wmp-startTrigger" class="wmp-setting form-control" value="${settings.startTrigger}">
            </div>
            <div class="list-group-item">
                <label for="wmp-endTrigger">End Trigger</label>
                <input type="text" id="wmp-endTrigger" class="wmp-setting form-control" value="${settings.endTrigger}">
            </div>
            <div class="list-group-item">
                <label for="wmp-removeTriggers">Remove triggers after display</label>
                <input type="checkbox" id="wmp-removeTriggers" class="wmp-setting" ${settings.removeTriggers ? 'checked' : ''}>
            </div>
        `;

        // 使用 context.addSettings 方法注册设置面板
        context.addSettings(settingsHtml);

        // 为设置项绑定事件监听
        document.querySelectorAll('.wmp-setting').forEach(element => {
            element.addEventListener('change', async (event) => {
                const key = event.target.id.replace('wmp-', '');
                const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
                settings[key] = value;
                await context.saveSettings(settings);
            });
        });

        // 监听消息渲染事件
        SillyTavern.events.on('message-rendered', (type, data) => displayMediaInMessage(type, data));
    }

    /**
     * 当设置在其他地方被更改时执行（例如，通过设置文件导入）
     * @param {object} newSettings - 新的设置对象
     */
    function onSettingsChanged(newSettings) {
        settings = { ...defaultSettings, ...newSettings };
        // 你可以在这里更新UI上显示的值，如果需要的话
    }

    // 使用 SillyTavern 的标准方式注册插件
    SillyTavern.extension.register(extensionName, extensionAuthor, {
        onExtensionLoaded: onExtensionLoaded,
        onSettingsChanged: onSettingsChanged,
    });

})();
