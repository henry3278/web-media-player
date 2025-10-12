// 文件名: index.js (中文版 v5.1 - 模仿 st_image_player)
(function () {
    // 插件内部名称，用于保存设置
    const extensionName = 'web-media-player';
    const extensionVersion = '5.1.0';

    // 默认设置
    const defaultSettings = {
        enabled: true,          // 是否启用插件
        sourceUrl: '',          // 采集网址 / API 端点
        startTrigger: '【图片】', // 开始触发词
        endTrigger: '【图片】', // 结束触发词
        removeTriggers: true,   // 显示媒体后是否移除触发词
    };

    let settings = { ...defaultSettings };

    /**
     * 步骤1: 构建并注入设置面板的HTML
     */
    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="web-media-player-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">网络媒体播放器</h5>
                </div>
                <p class="mb-1">当AI回复中包含触发词时，从指定网址获取并显示图片或视频。(v${extensionVersion})</p>
                <div class="form-group">
                    <label for="wmp-enabled">启用插件</label>
                    <input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}>
                </div>
                <div class="form-group">
                    <label for="wmp-sourceUrl">采集网址 / API 端点</label>
                    <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="例如: https://api.example.com/search?q=">
                    <small class="form-text text-muted">搜索的关键词将会被追加到这个网址的末尾。</small>
                </div>
                <div class="form-group">
                    <label for="wmp-startTrigger">开始触发词</label>
                    <input type="text" id="wmp-startTrigger" class="form-control" value="${settings.startTrigger}">
                </div>
                <div class="form-group">
                    <label for="wmp-endTrigger">结束触发词</label>
                    <input type="text" id="wmp-endTrigger" class="form-control" value="${settings.endTrigger}">
                </div>
                <div class="form-group">
                    <label for="wmp-removeTriggers">显示后移除触发词</label>
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

    /**
     * 【【【 核心采集逻辑 - 你需要在这里编写代码 】】】
     * 
     * 这个函数的目标是根据关键词(query)，从你的采集网站获取到图片或视频的【直链】。
     * @param {string} query - 从聊天消息中提取的搜索词，例如 "猫"。
     * @returns {Promise<string|null>} - 必须返回一个 Promise，其结果是媒体的直链URL (例如 "https://example.com/cat.jpg")，如果找不到则返回 null。
     */
    async function fetchMediaUrl(query) {
        if (!settings.sourceUrl) {
            console.warn(`[${extensionName}] 采集网址未设置。`);
            return null;
        }
        // 将关键词编码后，附加到你在设置中填写的网址末尾
        const requestUrl = `${settings.sourceUrl}${encodeURIComponent(query)}`;
        console.log(`[${extensionName}] 正在为关键词 "${query}" 从以下网址获取媒体: ${requestUrl}`);

        try {
            // ******************************************************************
            // TODO: 在这里实现你自己的采集逻辑
            //
            // 你需要根据你的目标网站，选择以下其中一种方式，并替换掉下面的临时占位符代码。
            //
            // 案例1：如果目标网站提供的是 JSON API
            // const response = await fetch(requestUrl);
            // if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
            // const data = await response.json();
            // // 假设返回的JSON结构是 { "results": [{ "imageUrl": "..." }] }
            // // 你需要根据实际的JSON结构，提取出图片或视频的URL
            // const mediaUrl = data.results[0]?.imageUrl; 
            // return mediaUrl || null;
            //
            // 案例2：如果需要从 HTML 网页中爬取 (类似 st_image_player 的做法)
            // // 注意：直接在浏览器前端爬取网页很可能会遇到CORS跨域问题。
            // // 如果目标网站允许跨域请求，则可以这样做：
            // const response = await fetch(requestUrl);
            // const html = await response.text();
            // // 使用正则表达式或DOM解析来查找媒体链接
            // // 例如，查找第一个 <img src="..."> 标签
            // const match = html.match(/<img[^>]+src="([^"]+)"/);
            // const mediaUrl = match ? match[1] : null;
            // return mediaUrl;
            //
            // ******************************************************************

            // 【临时占位符代码】: 这行代码会从 Unsplash 网站获取一张与关键词相关的随机图片。
            // 在你编写完自己的采集逻辑后，请删除或注释掉下面这行。
            return `https://source.unsplash.com/random/800x600?${query}`;

        } catch (error) {
            console.error(`[${extensionName}] 获取媒体时出错:`, error);
            SillyTavern.system.showToast(`[${extensionName}] 获取媒体出错: ${error.message}`, 'error');
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
            console.error(`[${extensionName}] 加载设置时出错:`, error);
        }

        // 然后创建设置面板并绑定事件
        addSettingsPanel();
        addSettingsEventListeners();

        // 最后，监听聊天消息
        SillyTavern.events.on('message-rendered', displayMediaInMessage);

        console.log(`[${extensionName} v${extensionVersion}] 已通过 jQuery.ready() 方法成功加载。`);
    });

})();
