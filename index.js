// 文件名: index.js (最终版 v5.0 - 模仿 st_image_player)
(function () {
    const extensionName = 'web-media-player';
    const extensionVersion = '5.0.0';

    // 默认设置
    const defaultSettings = {
        enabled: true,
        sourceUrl: '',
        startTrigger: '【图片】',
        endTrigger: '【图片】',
        removeTriggers: true,
    };

    let settings = { ...defaultSettings };

    /**
     * 步骤1: 构建并注入设置面板的HTML
     */
    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="web-media-player-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Web Media Player</h5>
                </div>
                <p class="mb-1">Displays media from a web source based on triggers in AI messages. (v${extensionVersion})</p>
                <div class="form-group">
                    <label for="wmp-enabled">Enable Plugin</label>
                    <input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}>
                </div>
                <div class="form-group">
                    <label for="wmp-sourceUrl">Source URL / API Endpoint</label>
                    <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="e.g., https://api.example.com/search?q=">
                    <small class="form-text text-muted">The search query will be appended to this URL.</small>
                </div>
                <div class="form-group">
                    <label for="wmp-startTrigger">Start Trigger</label>
                    <input type="text" id="wmp-startTrigger" class="form-control" value="${settings.startTrigger}">
                </div>
                <div class="form-group">
                    <label for="wmp-endTrigger">End Trigger</label>
                    <input type="text" id="wmp-endTrigger" class="form-control" value="${settings.endTrigger}">
                </div>
                <div class="form-group">
                    <label for="wmp-removeTriggers">Remove triggers after display</label>
                    <input type="checkbox" id="wmp-removeTriggers" ${settings.removeTriggers ? 'checked' : ''}>
                </div>
            </div>
        `;
        // 直接将HTML注入到指定的容器中
        $('#extensions_settings').append(settingsHtml);
    }

    /**
     * 步骤2: 为设置项绑定事件监听器
     */
    function addSettingsEventListeners() {
        // 使用 jQuery 的 .on() 方法来处理事件
        $('#web-media-player-settings').on('change', '#wmp-enabled', async function() {
            settings.enabled = $(this).is(':checked');
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('input', '#wmp-sourceUrl', async function() {
            settings.sourceUrl = $(this).val();
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('input', '#wmp-startTrigger', async function() {
            settings.startTrigger = $(this).val();
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('input', '#wmp-endTrigger', async function() {
            settings.endTrigger = $(this).val();
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('change', '#wmp-removeTriggers', async function() {
            settings.removeTriggers = $(this).is(':checked');
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
    }

    // -------------------------------------------------------------------------
    // 核心功能逻辑 (这部分与UI加载方式无关)
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

    /**
     * 步骤3: 主入口 - 等待DOM加载完毕后执行
     */
    $(document).ready(async function () {
        try {
            // 首先加载设置
            const loadedSettings = await SillyTavern.extension.loadSettings(extensionName);
            settings = { ...defaultSettings, ...loadedSettings };
        } catch (error) {
            console.error(`[${extensionName}] Error loading settings:`, error);
        }

        // 然后创建设置面板并绑定事件
        addSettingsPanel();
        addSettingsEventListeners();

        // 最后，监听聊天消息
        SillyTavern.events.on('message-rendered', displayMediaInMessage);

        console.log(`[${extensionName} v${extensionVersion}] Loaded successfully using jQuery.ready() method.`);
    });

})();
