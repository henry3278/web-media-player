// 文件名: index.js (专业版 v7.0.1 - 修复采集失败)
(function () {
    const extensionName = 'web-media-player';
    const extensionVersion = '7.0.1';

    // 默认设置 - 增加代理选项
    const defaultSettings = {
        enabled: true,
        sourceUrl: '',
        mediaType: 'image',
        autoInsert: true,
        randomPick: true,
        maxWidth: '80%',
        maxHeight: '450px',
        borderRadius: '8px',
        showBorder: true,
        testKeyword: '测试',
        useProxy: true, // 默认开启代理
    };

    let settings = { ...defaultSettings };
    let mediaCache = [];

    /**
     * 构建设置面板 - 增加代理开关
     */
    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="web-media-player-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">🎨 网络媒体播放器 Pro</h5>
                    <small>v${extensionVersion}</small>
                </div>
                <p class="mb-2 text-muted">AI回复时自动插入网络媒体，支持图片和视频</p>
                
                <!-- 基础设置 -->
                <div class="wmp-collapsible active">⚙️ 基础设置</div>
                <div class="wmp-collapsible-content" style="display: block;">
                    <div class="form-group">
                        <label for="wmp-enabled">启用插件</label>
                        <input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label for="wmp-sourceUrl">🔗 资源网址</label>
                        <input type="text" id="wmp-sourceUrl" class="form-control" 
                               value="${settings.sourceUrl}" 
                               placeholder="例如: https://example.com/gallery">
                        <small class="form-text text-muted">包含图片/视频的网页地址</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="wmp-mediaType">📺 媒体类型</label>
                        <select id="wmp-mediaType" class="form-control">
                            <option value="image" ${settings.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                            <option value="video" ${settings.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                            <option value="both" ${settings.mediaType === 'both' ? 'selected' : ''}>图片和视频</option>
                        </select>
                    </div>

                    <!-- 【【【 新增功能 】】】 -->
                    <div class="form-group">
                        <label for="wmp-useProxy">通过服务器代理请求 (解决跨域问题)</label>
                        <input type="checkbox" id="wmp-useProxy" ${settings.useProxy ? 'checked' : ''}>
                        <small class="form-text text-muted">强烈建议保持开启，以解决“采集失败”问题。</small>
                    </div>
                </div>

                <!-- 显示设置 -->
                <div class="wmp-collapsible">🎨 显示设置</div>
                <div class="wmp-collapsible-content">
                    <!-- ... (这部分内容和之前一样，为简洁省略) ... -->
                    <div class="row">
                        <div class="col-6">
                            <label for="wmp-maxWidth">最大宽度</label>
                            <input type="text" id="wmp-maxWidth" class="form-control" value="${settings.maxWidth}">
                        </div>
                        <div class="col-6">
                            <label for="wmp-maxHeight">最大高度</label>
                            <input type="text" id="wmp-maxHeight" class="form-control" value="${settings.maxHeight}">
                        </div>
                    </div>
                    <div class="form-group mt-2">
                        <label for="wmp-borderRadius">圆角大小</label>
                        <input type="text" id="wmp-borderRadius" class="form-control" value="${settings.borderRadius}">
                    </div>
                    <div class="form-group">
                        <label for="wmp-showBorder">显示边框</label>
                        <input type="checkbox" id="wmp-showBorder" ${settings.showBorder ? 'checked' : ''}>
                    </div>
                </div>

                <!-- 测试区域 -->
                <div class="wmp-collapsible">🧪 测试区域</div>
                <div class="wmp-collapsible-content">
                    <!-- ... (这部分内容和之前一样，为简洁省略) ... -->
                    <div class="form-group">
                        <label for="wmp-testKeyword">测试关键词</label>
                        <input type="text" id="wmp-testKeyword" class="form-control" value="${settings.testKeyword}">
                        <small class="form-text text-muted">用于测试媒体采集的关键词</small>
                    </div>
                    <div class="wmp-test-area">
                        <div class="wmp-btn-group">
                            <button type="button" id="wmp-test-fetch" class="btn btn-primary btn-sm wmp-btn">🔍 测试采集</button>
                            <button type="button" id="wmp-test-insert" class="btn btn-success btn-sm wmp-btn">➕ 测试插入</button>
                            <button type="button" id="wmp-clear-cache" class="btn btn-warning btn-sm wmp-btn">🗑️ 清除缓存</button>
                        </div>
                        <div id="wmp-test-preview" class="wmp-preview"></div>
                        <div id="wmp-test-status" class="wmp-status"></div>
                    </div>
                </div>

                <div class="mt-3">
                    <small class="text-muted"><strong>💡 使用说明：</strong>启用后，AI的每条回复都会自动插入随机媒体。</small>
                </div>
            </div>
        `;
        $('#extensions_settings').append(settingsHtml);
    }

    /**
     * 绑定事件监听器 - 增加代理开关的事件
     */
    function addSettingsEventListeners() {
        // 基础设置
        $('#web-media-player-settings').on('change', '#wmp-enabled', updateSetting('enabled', 'checkbox'));
        $('#web-media-player-settings').on('input', '#wmp-sourceUrl', updateSetting('sourceUrl', 'text', true));
        $('#web-media-player-settings').on('change', '#wmp-mediaType', updateSetting('mediaType', 'text', true));
        $('#web-media-player-settings').on('change', '#wmp-useProxy', updateSetting('useProxy', 'checkbox')); // 新增

        // 显示设置
        $('#web-media-player-settings').on('input', '#wmp-maxWidth', updateSetting('maxWidth', 'text'));
        $('#web-media-player-settings').on('input', '#wmp-maxHeight', updateSetting('maxHeight', 'text'));
        $('#web-media-player-settings').on('input', '#wmp-borderRadius', updateSetting('borderRadius', 'text'));
        $('#web-media-player-settings').on('change', '#wmp-showBorder', updateSetting('showBorder', 'checkbox'));
        
        // 测试关键词
        $('#web-media-player-settings').on('input', '#wmp-testKeyword', updateSetting('testKeyword', 'text'));
        
        // 测试按钮
        $('#web-media-player-settings').on('click', '#wmp-test-fetch', testMediaFetch);
        $('#web-media-player-settings').on('click', '#wmp-test-insert', testMediaInsert);
        $('#web-media-player-settings').on('click', '#wmp-clear-cache', clearMediaCache);
        
        // 折叠面板功能
        $('#web-media-player-settings').on('click', '.wmp-collapsible', function() {
            $(this).toggleClass('active');
            $(this).next('.wmp-collapsible-content').slideToggle();
        });
    }

    /**
     * 核心采集函数 - 【【【 重大修改 】】】
     */
    async function fetchMediaUrlsFromSource() {
        if (!settings.sourceUrl) {
            throw new Error('资源网址未设置');
        }

        // 根据设置决定请求的URL
        let requestUrl;
        if (settings.useProxy) {
            // 使用代理: 请求我们自己的服务器，并将目标URL作为参数
            requestUrl = `/api/proxy?url=${encodeURIComponent(settings.sourceUrl)}`;
            console.log(`[${extensionName}] 通过代理采集媒体: ${settings.sourceUrl}`);
        } else {
            // 不使用代理: 直接请求目标URL (很可能失败)
            requestUrl = settings.sourceUrl;
            console.log(`[${extensionName}] 直接采集媒体 (可能因CORS失败): ${settings.sourceUrl}`);
        }

        try {
            const response = await fetch(requestUrl);
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let mediaUrls = [];

            if (settings.mediaType === 'image' || settings.mediaType === 'both') {
                const imgElements = doc.querySelectorAll('img');
                imgElements.forEach(img => {
                    // 尝试从多个属性获取URL，以兼容懒加载等情况
                    const src = img.dataset.src || img.src;
                    if (src) {
                        // 将相对路径转换为绝对路径
                        const absoluteUrl = new URL(src, settings.sourceUrl).href;
                        mediaUrls.push(absoluteUrl);
                    }
                });
            }

            if (settings.mediaType === 'video' || settings.mediaType === 'both') {
                const videoElements = doc.querySelectorAll('video, source');
                videoElements.forEach(element => {
                    const src = element.dataset.src || element.src;
                    if (src && isVideoUrl(src)) {
                        const absoluteUrl = new URL(src, settings.sourceUrl).href;
                        mediaUrls.push(absoluteUrl);
                    }
                });
            }

            // 过滤掉无效或非http开头的链接
            return mediaUrls.filter(url => url && url.startsWith('http'));

        } catch (error) {
            console.error(`[${extensionName}] 采集失败:`, error);
            // 抛出更具体的错误信息
            if (error.message.includes('Failed to fetch')) {
                throw new Error('采集失败 (网络或CORS问题)。请确认“通过服务器代理请求”已开启。');
            }
            throw error;
        }
    }

    // ... (其他所有函数，如 autoInsertMedia, getRandomMediaUrl, testMediaFetch 等都保持不变) ...
    // 为保持代码简洁，这里省略了未改动的函数，请使用你已有的 7.0 版本中的对应函数。
    // 下面是完整的、未省略的函数列表，以供你复制粘贴。

    function updateSetting(key, type, clearCache = false) { return async function() { const value = type === 'checkbox' ? $(this).is(':checked') : $(this).val(); settings[key] = value; if (clearCache) mediaCache = []; await SillyTavern.extension.saveSettings(extensionName, settings); updateMediaStyles(); }; }
    function updateMediaStyles() { const style = ` .web-media-player-container img, .web-media-player-container video { max-width: ${settings.maxWidth} !important; max-height: ${settings.maxHeight} !important; border-radius: ${settings.borderRadius} !important; border: ${settings.showBorder ? '2px solid #e9ecef' : 'none'} !important; } `; $('#wmp-dynamic-styles').remove(); $('head').append(`<style id="wmp-dynamic-styles">${style}</style>`); }
    async function testMediaFetch() { const status = $('#wmp-test-status'); const preview = $('#wmp-test-preview'); status.removeClass('success error info').html('🔍 正在采集媒体...').addClass('info').show(); preview.hide().empty(); try { const urls = await fetchMediaUrlsFromSource(); if (urls.length > 0) { status.html(`✅ 成功采集到 ${urls.length} 个媒体链接`).addClass('success'); const firstUrl = urls[0]; const isVideo = isVideoUrl(firstUrl); const mediaElement = isVideo ? `<video src="${firstUrl}" controls muted loop style="max-width:100%; max-height:100px;"></video>` : `<img src="${firstUrl}" style="max-width:100%; max-height:100px;">`; preview.html(mediaElement).show(); mediaCache = urls; } else { status.html('❌ 未采集到任何媒体链接').addClass('error'); } } catch (error) { status.html(`❌ 采集失败: ${error.message}`).addClass('error'); } }
    async function testMediaInsert() { const lastMessage = SillyTavern.chat.getMessages().slice(-1)[0]; if (!lastMessage || lastMessage.is_user) { SillyTavern.system.showToast('❌ 请先让AI回复一条消息再进行测试', 'error'); return; } autoInsertMedia('test', { message: lastMessage }); SillyTavern.system.showToast('✅ 测试媒体已插入到最新一条AI回复中', 'success'); }
    function clearMediaCache() { mediaCache = []; SillyTavern.system.showToast('🗑️ 媒体缓存已清除', 'success'); $('#wmp-test-status').html('💾 缓存已清除').addClass('info').show(); $('#wmp-test-preview').hide().empty(); }
    function isVideoUrl(url) { return ['.mp4', '.webm', '.ogg', '.mov', '.avi'].some(ext => url.toLowerCase().includes(ext)); }
    async function autoInsertMedia(type, data) { const message = data.message; if (!settings.enabled || message.is_user || !message.mes) return; const messageElement = document.querySelector(`#mes_${message.id} .mes_text`); if (!messageElement) return; const mediaUrl = await getRandomMediaUrl(); if (!mediaUrl) return; const container = document.createElement('div'); container.className = 'web-media-player-container'; const isVideo = isVideoUrl(mediaUrl); let mediaElement; if (isVideo) { mediaElement = document.createElement('video'); mediaElement.src = mediaUrl; mediaElement.controls = true; mediaElement.loop = true; mediaElement.muted = true; } else { mediaElement = document.createElement('img'); mediaElement.src = mediaUrl; mediaElement.onclick = () => window.open(mediaUrl, '_blank'); } container.appendChild(mediaElement); messageElement.appendChild(container); updateMediaStyles(); }
    async function getRandomMediaUrl() { if (mediaCache.length === 0) { try { const urls = await fetchMediaUrlsFromSource(); if (urls && urls.length > 0) { mediaCache = urls; console.log(`[${extensionName}] 采集到 ${mediaCache.length} 个媒体链接`); } else { return null; } } catch (error) { console.error(`[${extensionName}] 自动获取媒体时采集失败:`, error); return null; } } const randomIndex = Math.floor(Math.random() * mediaCache.length); return mediaCache[randomIndex]; }
    $(document).ready(async function () { try { const loadedSettings = await SillyTavern.extension.loadSettings(extensionName); settings = { ...defaultSettings, ...loadedSettings }; } catch (error) { console.error(`[${extensionName}] 加载设置失败:`, error); } addSettingsPanel(); addSettingsEventListeners(); updateMediaStyles(); SillyTavern.events.on('message-rendered', autoInsertMedia); console.log(`[${extensionName} v${extensionVersion}] 专业版已加载`); });

})();
