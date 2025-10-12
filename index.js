// 文件名: index.js (专业版 v7.0.5 - 规则可配置版)
(function () {
    const extensionName = 'web-media-player';
    const extensionVersion = '7.0.5';

    // 默认设置 - 增加解析模式和规则的配置
    const defaultSettings = {
        enabled: true,
        sourceUrl: '',
        mediaType: 'image',
        useProxy: true,
        parseMode: 'html', // 'html' 或 'json'
        htmlSelector: 'img', // HTML模式下的CSS选择器
        jsonArrayPath: 'data.images', // JSON模式下，包含链接数组的路径
        jsonUrlKey: 'url', // JSON模式下，数组中每个对象里包含URL的键名
        maxWidth: '80%',
        maxHeight: '450px',
        borderRadius: '8px',
        showBorder: true,
    };

    let settings = { ...defaultSettings };
    let mediaCache = [];

    /**
     * 构建设置面板 - 【【【 重大升级 】】】
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
                    <div class="form-group"><label><input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}> 启用插件</label></div>
                    <div class="form-group">
                        <label for="wmp-sourceUrl">🔗 资源网址 (或API地址)</label>
                        <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="https://example.com/gallery">
                    </div>
                    <div class="form-group"><label><input type="checkbox" id="wmp-useProxy" ${settings.useProxy ? 'checked' : ''}> 通过服务器代理请求 (解决跨域)</label></div>
                </div>

                <!-- 【【【 新增功能：采集规则设置 】】】 -->
                <div class="wmp-collapsible active">📜 采集规则设置</div>
                <div class="wmp-collapsible-content" style="display: block;">
                    <div class="form-group">
                        <label for="wmp-parseMode">解析模式</label>
                        <select id="wmp-parseMode" class="form-control">
                            <option value="html" ${settings.parseMode === 'html' ? 'selected' : ''}>解析HTML (普通网页)</option>
                            <option value="json" ${settings.parseMode === 'json' ? 'selected' : ''}>解析JSON (API接口)</option>
                        </select>
                    </div>
                    <!-- HTML模式的设置 -->
                    <div id="wmp-html-settings" class="wmp-section">
                        <h6>HTML 模式规则</h6>
                        <div class="form-group">
                            <label for="wmp-htmlSelector">CSS选择器</label>
                            <input type="text" id="wmp-htmlSelector" class="form-control" value="${settings.htmlSelector}">
                            <small class="form-text text-muted">用于精确定位图片/视频标签。例如: <code>.gallery-item img</code></small>
                        </div>
                    </div>
                    <!-- JSON模式的设置 -->
                    <div id="wmp-json-settings" class="wmp-section">
                        <h6>JSON 模式规则</h6>
                        <div class="form-group">
                            <label for="wmp-jsonArrayPath">链接数组路径</label>
                            <input type="text" id="wmp-jsonArrayPath" class="form-control" value="${settings.jsonArrayPath}">
                            <small class="form-text text-muted">JSON数据中，包含媒体列表的路径。例如: <code>data.images</code></small>
                        </div>
                        <div class="form-group">
                            <label for="wmp-jsonUrlKey">URL键名</label>
                            <input type="text" id="wmp-jsonUrlKey" class="form-control" value="${settings.jsonUrlKey}">
                            <small class="form-text text-muted">在每个媒体对象中，代表URL的那个键。例如: <code>url</code> 或 <code>link</code></small>
                        </div>
                    </div>
                </div>

                <!-- 显示设置 -->
                <div class="wmp-collapsible">🎨 显示设置</div>
                <div class="wmp-collapsible-content">
                    <div class="form-group">
                        <label for="wmp-mediaType">媒体类型</label>
                        <select id="wmp-mediaType" class="form-control">
                            <option value="image" ${settings.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                            <option value="video" ${settings.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                            <option value="both" ${settings.mediaType === 'both' ? 'selected' : ''}>图片和视频</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-6"><label for="wmp-maxWidth">最大宽度</label><input type="text" id="wmp-maxWidth" class="form-control" value="${settings.maxWidth}"></div>
                        <div class="col-6"><label for="wmp-maxHeight">最大高度</label><input type="text" id="wmp-maxHeight" class="form-control" value="${settings.maxHeight}"></div>
                    </div>
                    <div class="form-group mt-2"><label for="wmp-borderRadius">圆角大小</label><input type="text" id="wmp-borderRadius" class="form-control" value="${settings.borderRadius}"></div>
                    <div class="form-group"><label><input type="checkbox" id="wmp-showBorder" ${settings.showBorder ? 'checked' : ''}> 显示边框</label></div>
                </div>

                <!-- 测试区域 -->
                <div class="wmp-collapsible">🧪 测试区域</div>
                <div class="wmp-collapsible-content">
                    <div class="wmp-test-area">
                        <div class="wmp-btn-group">
                            <button type="button" id="wmp-test-fetch" class="btn btn-primary btn-sm wmp-btn">🔍 测试采集</button>
                            <button type="button" id="wmp-clear-cache" class="btn btn-warning btn-sm wmp-btn">🗑️ 清除缓存</button>
                        </div>
                        <div id="wmp-test-preview" class="wmp-preview"></div>
                        <div id="wmp-test-status" class="wmp-status"></div>
                        <div id="wmp-debug-info" class="wmp-status info" style="display:none; margin-top: 10px; font-size: 0.8em; word-break: break-all;"></div>
                    </div>
                </div>
            </div>
        `;
        $('#extensions_settings').append(settingsHtml);
        toggleParseModeSettings(); // 初始化时根据模式显示/隐藏对应设置
    }

    /**
     * 绑定事件监听器 - 【【【 重大升级 】】】
     */
    function addSettingsEventListeners() {
        // 基础设置
        $('#web-media-player-settings').on('change', '#wmp-enabled', updateSetting('enabled', 'checkbox'));
        $('#web-media-player-settings').on('input', '#wmp-sourceUrl', updateSetting('sourceUrl', 'text', true));
        $('#web-media-player-settings').on('change', '#wmp-useProxy', updateSetting('useProxy', 'checkbox'));

        // 采集规则设置
        $('#web-media-player-settings').on('change', '#wmp-parseMode', function() {
            updateSetting('parseMode', 'text', true).call(this);
            toggleParseModeSettings();
        });
        $('#web-media-player-settings').on('input', '#wmp-htmlSelector', updateSetting('htmlSelector', 'text', true));
        $('#web-media-player-settings').on('input', '#wmp-jsonArrayPath', updateSetting('jsonArrayPath', 'text', true));
        $('#web-media-player-settings').on('input', '#wmp-jsonUrlKey', updateSetting('jsonUrlKey', 'text', true));

        // 显示设置
        $('#web-media-player-settings').on('change', '#wmp-mediaType', updateSetting('mediaType', 'text', true));
        $('#web-media-player-settings').on('input', '#wmp-maxWidth', updateSetting('maxWidth', 'text'));
        $('#web-media-player-settings').on('input', '#wmp-maxHeight', updateSetting('maxHeight', 'text'));
        $('#web-media-player-settings').on('input', '#wmp-borderRadius', updateSetting('borderRadius', 'text'));
        $('#web-media-player-settings').on('change', '#wmp-showBorder', updateSetting('showBorder', 'checkbox'));
        
        // 测试按钮
        $('#web-media-player-settings').on('click', '#wmp-test-fetch', testMediaFetch);
        $('#web-media-player-settings').on('click', '#wmp-clear-cache', clearMediaCache);
        
        // 折叠面板
        $('#web-media-player-settings').on('click', '.wmp-collapsible', function() {
            $(this).toggleClass('active');
            $(this).next('.wmp-collapsible-content').slideToggle();
        });
    }

    /**
     * 根据选择的解析模式，显示或隐藏对应的设置项
     */
    function toggleParseModeSettings() {
        if (settings.parseMode === 'html') {
            $('#wmp-html-settings').show();
            $('#wmp-json-settings').hide();
        } else {
            $('#wmp-html-settings').hide();
            $('#wmp-json-settings').show();
        }
    }

    /**
     * 核心采集函数 - 【【【 重大升级：根据模式选择解析器 】】】
     */
    async function fetchMediaUrlsFromSource() {
        if (!settings.sourceUrl) throw new Error('资源网址未设置');
        const debugInfo = $('#wmp-debug-info');
        const finalUrl = settings.sourceUrl;
        let requestUrl;
        let fetchOptions = {};

        try {
            if (settings.useProxy) {
                requestUrl = '/api/proxy';
                fetchOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: finalUrl,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                            'Referer': new URL(finalUrl).origin,
                        }
                    })
                };
                debugInfo.html(`ℹ️ 调试信息：<br>模式: 代理<br>请求URL: ${finalUrl}`).show();
            } else {
                requestUrl = finalUrl;
                debugInfo.html(`ℹ️ 调试信息：<br>模式: 直接请求<br>请求URL: ${finalUrl}`).show();
            }

            const response = await fetch(requestUrl, fetchOptions);
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);

            // 根据设置的模式，调用不同的解析函数
            if (settings.parseMode === 'html') {
                return await parseAsHTML(response, finalUrl);
            } else {
                return await parseAsJSON(response);
            }

        } catch (error) {
            console.error(`[${extensionName}] 采集失败:`, error);
            debugInfo.append(`<br>❌ 错误详情: ${error.message}`);
            throw error;
        }
    }

    /**
     * 解析模式一：HTML
     */
    async function parseAsHTML(response, baseUrl) {
        const html = await response.text();
        if (!html) throw new Error('获取到的页面内容为空。');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let mediaUrls = [];
        const selector = settings.htmlSelector || 'img'; // 使用设置中的选择器

        const elements = doc.querySelectorAll(selector);
        console.log(`[${extensionName}] HTML模式: 使用选择器 "${selector}" 找到了 ${elements.length} 个元素。`);

        elements.forEach(el => {
            const lazySrc = el.dataset.src || el.dataset.original || el.dataset.lazySrc;
            const normalSrc = el.src;
            let src = lazySrc || normalSrc;
            if (src && !src.startsWith('data:image/')) {
                mediaUrls.push(new URL(src, baseUrl).href);
            }
        });
        return filterAndUniqueUrls(mediaUrls);
    }

    /**
     * 解析模式二：JSON
     */
    async function parseAsJSON(response) {
        const data = await response.json();
        if (!data) throw new Error('获取到的JSON数据为空。');
        console.log(`[${extensionName}] JSON模式: 成功获取到JSON数据。`, data);

        const items = getObjectByPath(data, settings.jsonArrayPath);
        if (!Array.isArray(items)) {
            throw new Error(`JSON路径 "${settings.jsonArrayPath}" 未找到或其值不是一个数组。`);
        }

        const urlKey = settings.jsonUrlKey;
        if (!urlKey) {
            throw new Error('未设置 "URL键名"。');
        }

        const mediaUrls = items.map(item => item[urlKey]).filter(Boolean);
        return filterAndUniqueUrls(mediaUrls);
    }

    // 辅助函数：根据字符串路径从对象中取值
    function getObjectByPath(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
    
    // 辅助函数：过滤和去重URL
    function filterAndUniqueUrls(urls) {
        const uniqueUrls = [...new Set(urls)];
        return uniqueUrls.filter(url => {
            if (!url || !url.startsWith('http')) return false;
            if (settings.mediaType === 'image') return !isVideoUrl(url);
            if (settings.mediaType === 'video') return isVideoUrl(url);
            return true; // both
        });
    }

    // ... (其他所有函数，如 updateSetting, updateMediaStyles, testMediaFetch 等都保持不变) ...
    // 为保持代码简洁，这里省略了未改动的函数，请使用你已有的 7.0.3 版本中的对应函数。
    // 下面是完整的、未省略的函数列表，以供你复制粘贴。
    function updateSetting(key, type, clearCache = false) { return async function() { const value = type === 'checkbox' ? $(this).is(':checked') : $(this).val(); settings[key] = value; if (clearCache) mediaCache = []; await SillyTavern.extension.saveSettings(extensionName, settings); updateMediaStyles(); }; }
    function updateMediaStyles() { const style = ` .web-media-player-container img, .web-media-player-container video { max-width: ${settings.maxWidth} !important; max-height: ${settings.maxHeight} !important; border-radius: ${settings.borderRadius} !important; border: ${settings.showBorder ? '2px solid #e9ecef' : 'none'} !important; } `; $('#wmp-dynamic-styles').remove(); $('head').append(`<style id="wmp-dynamic-styles">${style}</style>`); }
    async function testMediaFetch() { const status = $('#wmp-test-status'); const preview = $('#wmp-test-preview'); const debugInfo = $('#wmp-debug-info'); status.removeClass('success error info').html('🔍 正在采集媒体...').addClass('info').show(); preview.hide().empty(); debugInfo.hide(); try { const urls = await fetchMediaUrlsFromSource(); if (urls.length > 0) { status.html(`✅ 成功采集到 ${urls.length} 个媒体链接`).addClass('success'); const firstUrl = urls[0]; const isVideo = isVideoUrl(firstUrl); const mediaElement = isVideo ? `<video src="${firstUrl}" controls muted loop style="max-width:100%; max-height:100px;"></video>` : `<img src="${firstUrl}" style="max-width:100%; max-height:100px;">`; preview.html(mediaElement).show(); mediaCache = urls; } else { status.html('❌ 未采集到任何媒体链接').addClass('error'); } } catch (error) { status.html(`❌ 采集失败: ${error.message}`).addClass('error'); } }
    function clearMediaCache() { mediaCache = []; SillyTavern.system.showToast('🗑️ 媒体缓存已清除', 'success'); $('#wmp-test-status').html('💾 缓存已清除').addClass('info').show(); $('#wmp-test-preview').hide().empty(); $('#wmp-debug-info').hide(); }
    function isVideoUrl(url) { return ['.mp4', '.webm', '.ogg', '.mov', '.avi'].some(ext => url.toLowerCase().includes(ext)); }
    async function autoInsertMedia(type, data) { const message = data.message; if (!settings.enabled || message.is_user || !message.mes) return; const messageElement = document.querySelector(`#mes_${message.id} .mes_text`); if (!messageElement) return; const mediaUrl = await getRandomMediaUrl(); if (!mediaUrl) return; const container = document.createElement('div'); container.className = 'web-media-player-container'; const isVideo = isVideoUrl(mediaUrl); let mediaElement; if (isVideo) { mediaElement = document.createElement('video'); mediaElement.src = mediaUrl; mediaElement.controls = true; mediaElement.loop = true; mediaElement.muted = true; } else { mediaElement = document.createElement('img'); mediaElement.src = mediaUrl; mediaElement.onclick = () => window.open(mediaUrl, '_blank'); } container.appendChild(mediaElement); messageElement.appendChild(container); updateMediaStyles(); }
    async function getRandomMediaUrl() { if (mediaCache.length === 0) { try { const urls = await fetchMediaUrlsFromSource(); if (urls && urls.length > 0) { mediaCache = urls; console.log(`[${extensionName}] 采集到 ${mediaCache.length} 个媒体链接`); } else { return null; } } catch (error) { console.error(`[${extensionName}] 自动获取媒体时采集失败:`, error); return null; } } const randomIndex = Math.floor(Math.random() * mediaCache.length); return mediaCache[randomIndex]; }
    $(document).ready(async function () { try { const loadedSettings = await SillyTavern.extension.loadSettings(extensionName); settings = { ...defaultSettings, ...loadedSettings }; } catch (error) { console.error(`[${extensionName}] 加载设置失败:`, error); } addSettingsPanel(); addSettingsEventListeners(); updateMediaStyles(); SillyTavern.events.on('message-rendered', autoInsertMedia); console.log(`[${extensionName} v${extensionVersion}] 专业版已加载`); });

})();
