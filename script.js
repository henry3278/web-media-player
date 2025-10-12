(async () => {
    // 默认设置
    const defaultSettings = {
        enabled: true,
        // 【重要】这是你的采集网址/API。
        // 如果是API，可能是 `https://api.example.com/search?q=`
        // 如果是网页，可能是 `https://www.example.com/search/`
        sourceUrl: '', 
        // 触发的开始关键词
        startTrigger: '【图片】',
        // 触发的结束关键词（如果开始和结束一样，就填一样的）
        endTrigger: '【图片】',
        // 是否在显示图片后移除触发词
        removeTriggers: true,
    };

    // 加载设置，如果不存在则使用默认设置
    let settings = { ...defaultSettings, ...(await SillyTavern.extension.loadSettings('web-media-player')) };

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

        // 构造请求URL
        const requestUrl = `${settings.sourceUrl}${encodeURIComponent(query)}`;
        console.log(`Fetching media for query "${query}" from: ${requestUrl}`);

        try {
            // ******************************************************************
            // TODO: 在这里实现你的采集逻辑
            //
            // 这部分完全取决于你的目标网站。
            //
            // 案例1：如果目标网站提供的是 JSON API
            // const response = await fetch(requestUrl);
            // if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            // const data = await response.json();
            // // 假设返回的JSON结构是 { "results": [{ "imageUrl": "..." }] }
            // const mediaUrl = data.results[0]?.imageUrl;
            // return mediaUrl || null;
            //
            // 案例2：如果需要从 HTML 页面中爬取
            // // 注意：直接在浏览器前端爬取网页会遇到CORS跨域问题。
            // // 你可能需要一个代理服务器来绕过它。
            // // 如果目标网站允许跨域请求，则可以这样做：
            // const response = await fetch(requestUrl);
            // const html = await response.text();
            // const parser = new DOMParser();
            // const doc = parser.parseFromString(html, 'text/html');
            // // 假设图片在一个 class="main-image" 的 img 标签里
            // const imgElement = doc.querySelector('.main-image');
            // const mediaUrl = imgElement ? imgElement.src : null;
            // return mediaUrl;
            //
            // ******************************************************************

            // 【临时占位符】返回一个示例图片，方便你测试插件的其他部分是否正常工作。
            // 在你完成上面的采集逻辑后，请删除或注释掉下面这行。
            return `https://source.unsplash.com/random/800x600?${query}`;

        } catch (error) {
            console.error('Web Media Player: Error fetching media:', error);
            SillyTavern.system.showToast(`Error fetching media: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * 在消息中查找并显示媒体
     * @param {object} message - SillyTavern 的消息对象
     */
    async function displayMediaInMessage(message) {
        // 如果插件被禁用，或者消息是用户发的，或者消息为空，则直接返回
        if (!settings.enabled || message.is_user || !message.mes) {
            return;
        }

        const start = settings.startTrigger;
        const end = settings.endTrigger;

        // 使用正则表达式查找被触发词包裹的内容
        const regex = new RegExp(`${escapeRegex(start)}(.*?)${escapeRegex(end)}`);
        const match = message.mes.match(regex);

        if (match && match[1]) {
            const query = match[1].trim(); // 提取查询词
            const fullTriggerText = match[0]; // 完整的触发文本，如 "【图片】猫【图片】"

            // 获取消息在DOM中的元素
            const messageElement = document.querySelector(`#mes_${message.id} .mes_text`);
            if (!messageElement) return;

            // 获取媒体链接
            const mediaUrl = await fetchMediaUrl(query);

            if (mediaUrl) {
                // 创建媒体容器
                const container = document.createElement('div');
                container.className = 'web-media-player-container';

                // 判断是图片还是视频
                const isVideo = ['.mp4', '.webm', '.ogg'].some(ext => mediaUrl.toLowerCase().endsWith(ext));
                let mediaElement;

                if (isVideo) {
                    mediaElement = document.createElement('video');
                    mediaElement.src = mediaUrl;
                    mediaElement.controls = true; // 显示播放控件
                    mediaElement.autoplay = false; // 建议不要自动播放
                    mediaElement.loop = true; // 循环播放
                    mediaElement.muted = true; // 静音播放以允许自动播放（如果需要）
                } else {
                    mediaElement = document.createElement('img');
                    mediaElement.src = mediaUrl;
                    // 点击图片在新标签页中打开
                    mediaElement.onclick = () => window.open(mediaUrl, '_blank');
                }
                
                container.appendChild(mediaElement);
                messageElement.appendChild(container);

                // 如果设置了移除触发词，则从消息文本中移除它们
                if (settings.removeTriggers) {
                    messageElement.innerHTML = messageElement.innerHTML.replace(fullTriggerText, '');
                }
            }
        }
    }
    
    // 辅助函数：转义正则表达式特殊字符
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 创建设置面板
     */
    function buildSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">Web Media Player</h5>
                </div>
                <p class="mb-1">When the AI's message includes a trigger (e.g., 【图片】cat【图片】), it displays media from a web source.</p>
            </div>
            <div class="list-group-item">
                <label for="wmp-enabled">Enable Plugin</label>
                <input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}>
            </div>
            <div class="list-group-item">
                <label for="wmp-sourceUrl">Source URL / API Endpoint</label>
                <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="e.g., https://api.example.com/search?q=">
                <small class="form-text text-muted">The URL to fetch media from. The search query will be appended.</small>
            </div>
            <div class="list-group-item">
                <label for="wmp-startTrigger">Start Trigger</label>
                <input type="text" id="wmp-startTrigger" class="form-control" value="${settings.startTrigger}">
            </div>
            <div class="list-group-item">
                <label for="wmp-endTrigger">End Trigger</label>
                <input type="text" id="wmp-endTrigger" class="form-control" value="${settings.endTrigger}">
            </div>
            <div class="list-group-item">
                <label for="wmp-removeTriggers">Remove triggers after display</label>
                <input type="checkbox" id="wmp-removeTriggers" ${settings.removeTriggers ? 'checked' : ''}>
            </div>
        `;

        $('#extensions_settings').append(settingsHtml);

        // 绑定事件监听器
        $('#wmp-enabled').on('change', function() {
            settings.enabled = $(this).is(':checked');
            SillyTavern.extension.saveSettings('web-media-player', settings);
        });
        $('#wmp-sourceUrl').on('input', function() {
            settings.sourceUrl = $(this).val();
            SillyTavern.extension.saveSettings('web-media-player', settings);
        });
        $('#wmp-startTrigger').on('input', function() {
            settings.startTrigger = $(this).val();
            SillyTavern.extension.saveSettings('web-media-player', settings);
        });
        $('#wmp-endTrigger').on('input', function() {
            settings.endTrigger = $(this).val();
            SillyTavern.extension.saveSettings('web-media-player', settings);
        });
        $('#wmp-removeTriggers').on('change', function() {
            settings.removeTriggers = $(this).is(':checked');
            SillyTavern.extension.saveSettings('web-media-player', settings);
        });
    }

    // 监听消息渲染事件，这是插件的入口点
    SillyTavern.events.on('message-rendered', displayMediaInMessage);

    // 页面加载时构建设置面板
    $(document).ready(buildSettingsPanel);

    console.log('Web Media Player plugin loaded!');

})();
