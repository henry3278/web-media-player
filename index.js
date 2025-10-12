// 文件名: index.js (自动插入版 v6.0)
(function () {
    const extensionName = 'web-media-player';
    const extensionVersion = '6.0.0';

    // 默认设置
    const defaultSettings = {
        enabled: true,           // 是否启用插件
        sourceUrl: '',           // 资源网址（图库/视频聚合页）
        mediaType: 'image',      // 媒体类型: 'image', 'video', 'both'
        autoInsert: true,        // 自动插入（这个选项现在固定为true，符合你的需求）
        randomPick: true,        // 随机选择（这个选项现在固定为true，符合你的需求）
    };

    let settings = { ...defaultSettings };
    // 创建一个缓存，用于存储从网址采集到的所有媒体链接，避免每次回复都重新采集
    let mediaCache = [];

    /**
     * 步骤1: 构建并注入设置面板的HTML
     */
    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="web-media-player-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">网络媒体播放器 (自动插入)</h5>
                </div>
                <p class="mb-1">AI每次回复时，自动从指定网址随机选取一张图片或视频插入到回复末尾。(v${extensionVersion})</p>
                <div class="form-group">
                    <label for="wmp-enabled">启用插件</label>
                    <input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}>
                </div>
                <div class="form-group">
                    <label for="wmp-sourceUrl">资源网址</label>
                    <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="例如: https://example.com/gallery">
                    <small class="form-text text-muted">填入一个包含大量图片或视频的网页地址。</small>
                </div>
                <div class="form-group">
                    <label for="wmp-mediaType">媒体类型</label>
                    <select id="wmp-mediaType" class="form-control">
                        <option value="image" ${settings.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                        <option value="video" ${settings.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                        <option value="both" ${settings.mediaType === 'both' ? 'selected' : ''}>图片和视频</option>
                    </select>
                </div>
                <div class="form-group">
                    <small class="form-text text-muted"><strong>工作模式：</strong>插件启用后，AI的每条回复后都会自动插入媒体。</small>
                </div>
                <div class="form-group">
                    <button type="button" id="wmp-clearCache" class="btn btn-sm btn-secondary">清除媒体缓存</button>
                    <small class="form-text text-muted">强制插件下次回复时重新从网址采集媒体列表。</small>
                </div>
            </div>
        `;
        $('#extensions_settings').append(settingsHtml);
    }

    /**
     * 步骤2: 为设置项绑定事件监听器
     */
    function addSettingsEventListeners() {
        $('#web-media-player-settings').on('change', '#wmp-enabled', async function () {
            settings.enabled = $(this).is(':checked');
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('input', '#wmp-sourceUrl', async function () {
            settings.sourceUrl = $(this).val();
            mediaCache = []; // 网址改变，清空缓存
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('change', '#wmp-mediaType', async function () {
            settings.mediaType = $(this).val();
            mediaCache = []; // 媒体类型改变，清空缓存
            await SillyTavern.extension.saveSettings(extensionName, settings);
        });
        $('#web-media-player-settings').on('click', '#wmp-clearCache', function () {
            mediaCache = [];
            SillyTavern.system.showToast('媒体缓存已清除。', 'success');
        });
    }

    // -------------------------------------------------------------------------
    // 核心功能逻辑 (全新：自动插入)
    // -------------------------------------------------------------------------

    /**
     * 核心函数：当AI回复消息被渲染时，自动插入媒体
     */
    async function autoInsertMedia(type, data) {
        const message = data.message;
        // 如果插件未启用，或者消息是用户发送的，或者消息内容为空，则直接返回
        if (!settings.enabled || message.is_user || !message.mes) {
            return;
        }

        // 获取消息在DOM中的元素
        const messageElement = document.querySelector(`#mes_${message.id} .mes_text`);
        if (!messageElement) return;

        // 获取一个随机的媒体链接
        const mediaUrl = await getRandomMediaUrl();
        if (!mediaUrl) {
            // 如果没有获取到链接，静默失败，不插入任何内容
            return;
        }

        // 创建媒体容器和元素
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
            mediaElement.style.maxWidth = '100%'; // 视频宽度控制
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaUrl;
            mediaElement.onclick = () => window.open(mediaUrl, '_blank');
        }

        container.appendChild(mediaElement);
        // 将媒体插入到消息文本的后面
        messageElement.appendChild(container);
    }

    /**
     * 获取一个随机的媒体链接。
     * 逻辑：1. 如果缓存为空，则从设置的网址采集。2. 从缓存中随机选取一个返回。
     */
    async function getRandomMediaUrl() {
        // 如果缓存是空的，需要先从网址采集
        if (mediaCache.length === 0) {
            const urls = await fetchMediaUrlsFromSource();
            if (urls && urls.length > 0) {
                mediaCache = urls;
                console.log(`[${extensionName}] 从资源网址采集到 ${mediaCache.length} 个媒体链接。`);
            } else {
                console.warn(`[${extensionName}] 无法从资源网址采集到任何媒体链接。`);
                return null;
            }
        }

        // 从缓存中随机选取一个链接
        const randomIndex = Math.floor(Math.random() * mediaCache.length);
        return mediaCache[randomIndex];
    }

    /**
     * 【【【 核心采集逻辑 - 你需要在这里编写代码 】】】
     * 
     * 这个函数的目标是：访问 settings.sourceUrl 指定的网页，并从该页面的HTML中解析出所有图片和视频的【直链】。
     * @returns {Promise<Array<string>>} - 返回一个 Promise，其结果是媒体直链URL的数组。
     */
    async function fetchMediaUrlsFromSource() {
        if (!settings.sourceUrl) {
            console.warn(`[${extensionName}] 资源网址未设置。`);
            return [];
        }

        console.log(`[${extensionName}] 正在从资源网址采集媒体列表: ${settings.sourceUrl}`);

        try {
            // ******************************************************************
            // TODO: 在这里实现你自己的采集逻辑
            // 你的目标是解析 settings.sourceUrl 这个页面，找出页面上所有的图片和视频链接。
            //
            // 基本步骤：
            // 1. 使用 fetch 获取网页的HTML内容。
            // 2. 将HTML文本解析为DOM对象。
            // 3. 使用 querySelectorAll 查找所有的 <img> 和 <video> 标签（或根据页面结构查找）。
            // 4. 从这些标签中提取出 src 属性。
            // 5. 根据 settings.mediaType 的设置，过滤出需要的链接（仅图片、仅视频、或全部）。
            // 6. 返回这个链接数组。
            //
            // 注意：大概率会遇到CORS跨域问题。如果遇到，你可能需要一个服务器端代理。
            // ******************************************************************

            // 【示例代码：演示如何解析一个假设的网页】
            const response = await fetch(settings.sourceUrl);
            if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
            const html = await response.text();

            // 创建一个虚拟的DOM解析器
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let mediaUrls = [];

            // 根据用户选择的媒体类型，采集对应的链接
            if (settings.mediaType === 'image' || settings.mediaType === 'both') {
                // 查找所有图片标签
                const imgElements = doc.querySelectorAll('img');
                imgElements.forEach(img => {
                    const src = img.getAttribute('src');
                    if (src) {
                        // 将相对路径转换为绝对路径
                        const absoluteUrl = new URL(src, settings.sourceUrl).href;
                        mediaUrls.push(absoluteUrl);
                    }
                });
            }

            if (settings.mediaType === 'video' || settings.mediaType === 'both') {
                // 查找所有视频标签 (包括 <video> 和 <source> 标签)
                const videoElements = doc.querySelectorAll('video');
                videoElements.forEach(video => {
                    const src = video.getAttribute('src');
                    if (src) {
                        const absoluteUrl = new URL(src, settings.sourceUrl).href;
                        mediaUrls.push(absoluteUrl);
                    }
                });
                // 有时视频源在 <source> 标签里
                const sourceElements = doc.querySelectorAll('source');
                sourceElements.forEach(source => {
                    const src = source.getAttribute('src');
                    if (src && ['.mp4', '.webm', '.ogg'].some(ext => src.toLowerCase().endsWith(ext))) {
                        const absoluteUrl = new URL(src, settings.sourceUrl).href;
                        mediaUrls.push(absoluteUrl);
                    }
                });
            }

            console.log(`[${extensionName}] 采集到 ${mediaUrls.length} 个符合条件的媒体链接。`);
            return mediaUrls;

        } catch (error) {
            console.error(`[${extensionName}] 从资源网址采集媒体列表时出错:`, error);
            SillyTavern.system.showToast(`[${extensionName}] 采集媒体失败: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * 步骤3: 主入口
     */
    $(document).ready(async function () {
        try {
            const loadedSettings = await SillyTavern.extension.loadSettings(extensionName);
            settings = { ...defaultSettings, ...loadedSettings };
        } catch (error) {
            console.error(`[${extensionName}] 加载设置时出错:`, error);
        }

        addSettingsPanel();
        addSettingsEventListeners();
        // 监听消息渲染事件，实现自动插入
        SillyTavern.events.on('message-rendered', autoInsertMedia);

        console.log(`[${extensionName} v${extensionVersion}] (自动插入模式) 已成功加载。`);
    });

})();
