// 文件名: index.js (专业版 v7.0.4 - 模式切换版)
(function () {
    const extensionName = 'web-media-player';
    const extensionVersion = '7.0.4';

    // ... (默认设置等内容保持不变) ...
    const defaultSettings = { enabled: true, sourceUrl: '', mediaType: 'image', autoInsert: true, randomPick: true, maxWidth: '80%', maxHeight: '450px', borderRadius: '8px', showBorder: true, testKeyword: '测试', useProxy: true, };
    let settings = { ...defaultSettings };
    let mediaCache = [];

    /**
     * 核心采集函数 - 【【【 重大升级：模块化解析 】】】
     */
    async function fetchMediaUrlsFromSource() {
        if (!settings.sourceUrl) {
            throw new Error('资源网址未设置');
        }

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
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
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

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}。请检查网址或代理设置。`);
            }

            // =================================================================
            // 【【【 在这里选择你的解析模式 】】】
            //
            // 你只需要保留下面两种模式中的一种，并删除或注释掉另一种。
            // =================================================================

            // 【模式一：解析 HTML 网页】 (适用于大多数普通网站)
            // return await parseAsHTML(response, finalUrl);

            // 【模式二：解析 JSON API】 (如果你找到了网站的API接口)
            return await parseAsJSON(response);


        } catch (error) {
            console.error(`[${extensionName}] 采集失败:`, error);
            debugInfo.append(`<br>❌ 错误详情: ${error.message}`);
            throw error;
        }
    }

    /**
     * 解析模式一：将响应作为HTML文本进行解析
     * @param {Response} response - fetch返回的响应对象
     * @param {string} baseUrl - 用于转换相对路径的基础URL
     * @returns {Promise<Array<string>>} - 媒体链接数组
     */
    async function parseAsHTML(response, baseUrl) {
        const html = await response.text();
        if (!html) {
            throw new Error('获取到的页面内容为空。');
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let mediaUrls = [];

        // 【【【 在这里定制你的CSS选择器 】】】
        // 这是为特定网站编写规则的关键。右键->检查，找到规律。
        const selector = 'img'; // 通用选择器，你可以修改为更精确的，例如: '.gallery-item img'

        const elements = doc.querySelectorAll(selector);
        console.log(`[${extensionName}] HTML模式: 使用选择器 "${selector}" 找到了 ${elements.length} 个元素。`);

        elements.forEach(el => {
            // 尝试从多个懒加载属性中获取URL
            const lazySrc = el.dataset.src || el.dataset.original || el.dataset.lazySrc;
            const normalSrc = el.src;
            let src = lazySrc || normalSrc;

            if (src && !src.startsWith('data:image/')) {
                const absoluteUrl = new URL(src, baseUrl).href;
                mediaUrls.push(absoluteUrl);
            }
        });

        const uniqueUrls = [...new Set(mediaUrls)];
        return uniqueUrls.filter(url => {
            if (settings.mediaType === 'image') return !isVideoUrl(url);
            if (settings.mediaType === 'video') return isVideoUrl(url);
            return true; // both
        });
    }

    /**
     * 解析模式二：将响应作为JSON数据进行解析
     * @param {Response} response - fetch返回的响应对象
     * @returns {Promise<Array<string>>} - 媒体链接数组
     */
    async function parseAsJSON(response) {
        const data = await response.json();
        if (!data) {
            throw new Error('获取到的JSON数据为空。');
        }

        console.log(`[${extensionName}] JSON模式: 成功获取到JSON数据。`, data);

        // 【【【 在这里定制你的JSON解析路径 】】】
        // 你需要根据实际返回的JSON结构，找到包含图片链接的数组。
        // 下面是几个例子，请根据你的情况取消注释并修改其中一个。

        // 例1: { "results": [ { "url": "..." }, ... ] }
        // const items = data.results;
        // const mediaUrls = items.map(item => item.url);

        // 例2: { "data": { "images": [ "url1", "url2", ... ] } }
        // const items = data.data.images;
        // const mediaUrls = items;

        // 例3: [ { "link": "..." }, { "link": "..." } ]
        // const items = data;
        // const mediaUrls = items.map(item => item.link);

        // 临时占位符，如果你不确定，可以先用这个
        let mediaUrls = [];
        alert('[网络媒体播放器] 已切换到JSON解析模式，但尚未配置解析规则。请编辑 index.js 文件中的 parseAsJSON 函数。');


        const uniqueUrls = [...new Set(mediaUrls)];
        return uniqueUrls.filter(url => {
            if (settings.mediaType === 'image') return !isVideoUrl(url);
            if (settings.mediaType === 'video') return isVideoUrl(url);
            return true; // both
        });
    }


    // ... (其他所有函数，如 addSettingsPanel, addSettingsEventListeners 等都保持不变) ...
    // 为保持代码简洁，这里省略了未改动的函数，请使用你已有的 7.0.2 版本中的对应函数。
    // 下面是完整的、未省略的函数列表，以供你复制粘贴。

    function addSettingsPanel() { const settingsHtml = ` <div class="list-group-item" id="web-media-player-settings"> <div class="d-flex w-100 justify-content-between"> <h5 class="mb-1">🎨 网络媒体播放器 Pro</h5> <small>v${extensionVersion}</small> </div> <p class="mb-2 text-muted">AI回复时自动插入网络媒体，支持图片和视频</p> <div class="wmp-collapsible active">⚙️ 基础设置</div> <div class="wmp-collapsible-content" style="display: block;"> <div class="form-group"> <label for="wmp-enabled">启用插件</label> <input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}> </div> <div class="form-group"> <label for="wmp-sourceUrl">🔗 资源网址</label> <input type="text" id="wmp-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="例如: https://example.com/gallery"> <small class="form-text text-muted">包含图片/视频的网页地址或API地址</small> </div> <div class="form-group"> <label for="wmp-mediaType">📺 媒体类型</label> <select id="wmp-mediaType" class="form-control"> <option value="image" ${settings.mediaType === 'image' ? 'selected' : ''}>仅图片</option> <option value="video" ${settings.mediaType === 'video' ? 'selected' : ''}>仅视频</option> <option value="both" ${settings.mediaType === 'both' ? 'selected' : ''}>图片和视频</option> </select> </div> <div class="form-group"> <label for="wmp-useProxy">通过服务器代理请求 (解决跨域问题)</label> <input type="checkbox" id="wmp-useProxy" ${settings.useProxy ? 'checked' : ''}> <small class="form-text text-muted">强烈建议保持开启，以解决“采集失败”问题。</small> </div> </div> <div class="wmp-collapsible">🎨 显示设置</div> <div class="wmp-collapsible-content"> <div class="row"> <div class="col-6"><label for="wmp-maxWidth">最大宽度</label><input type="text" id="wmp-maxWidth" class="form-control" value="${settings.maxWidth}"></div> <div class="col-6"><label for="wmp-maxHeight">最大高度</label><input type="text" id="wmp-maxHeight" class="form-control" value="${settings.maxHeight}"></div> </div> <div class="form-group mt-2"><label for="wmp-borderRadius">圆角大小</label><input type="text" id="wmp-borderRadius" class="form-control" value="${settings.borderRadius}"></div> <div class="form-group"><label for="wmp-showBorder">显示边框</label><input type="checkbox" id="wmp-showBorder" ${settings.showBorder ? 'checked' : ''}></div> </div> <div class="wmp-collapsible">🧪 测试区域</div> <div class="wmp-collapsible-content"> <div class="form-group"><label for="wmp-testKeyword">测试关键词</label><input type="text" id="wmp-testKeyword" class="form-control" value="${settings.testKeyword}"></div> <div class="wmp-test-area"> <div class="wmp-btn-group"> <button type="button" id="wmp-test-fetch" class="btn btn-primary btn-sm wmp-btn">🔍 测试采集</button> <button type="button" id="wmp-test-insert" class="btn btn-success btn-sm wmp-btn">➕ 测试插入</button> <button type="button" id="wmp-clear-cache" class="btn btn-warning btn-sm wmp-btn">🗑️ 清除缓存</button> </div> <div id="wmp-test-preview" class="wmp-preview"></div> <div id="wmp-test-status" class="wmp-status"></div> <div id="wmp-debug-info" class="wmp-status info" style="display:none; margin-top: 10px; font-size: 0.8em; word-break: break-all;"></div> </div> </div> <div class="mt-3"><small class="text-muted"><strong>💡 使用说明：</strong>启用后，AI的每条回复都会自动插入随机媒体。</small></div> </div> `; $('#extensions_settings').append(settingsHtml); }
    function addSettingsEventListeners() { $('#web-media-player-settings').on('change', '#wmp-enabled', updateSetting('enabled', 'checkbox')); $('#web-media-player-settings').on('input', '#wmp-sourceUrl', updateSetting('sourceUrl', 'text', true)); $('#web-media-player-settings').on('change', '#wmp-mediaType', updateSetting('mediaType', 'text', true)); $('#web-media-player-settings').on('change', '#wmp-useProxy', updateSetting('useProxy', 'checkbox')); $('#web-media-player-settings').on('input', '#wmp-maxWidth', updateSetting('maxWidth', 'text')); $('#web-media-player-settings').on('input', '#wmp-maxHeight', updateSetting('maxHeight', 'text')); $('#web-media-player-settings').on('input', '#wmp-borderRadius', updateSetting('borderRadius', 'text')); $('#web-media-player-settings').on('change', '#wmp-showBorder', updateSetting('showBorder', 'checkbox')); $('#web-media-player-settings').on('input', '#wmp-testKeyword', updateSetting('testKeyword', 'text')); $('#web-media-player-settings').on('click', '#wmp-test-fetch', testMediaFetch); $('#web-media-player-settings').on('click', '#wmp-test-insert', testMediaInsert); $('#web-media-player-settings').on('click', '#wmp-clear-cache', clearMediaCache); $('#web-media-player-settings').on('click', '.wmp-collapsible', function() { $(this).toggleClass('active'); $(this).next('.wmp-collapsible-content').slideToggle(); }); }
    function updateSetting(key, type, clearCache = false) { return async function() { const value = type === 'checkbox' ? $(this).is(':checked') : $(this).val(); settings[key] = value; if (clearCache) mediaCache = []; await SillyTavern.extension.saveSettings(extensionName, settings); updateMediaStyles(); }; }
    function updateMediaStyles() { const style = ` .web-media-player-container img, .web-media-player-container video { max-width: ${settings.maxWidth} !important; max-height: ${settings.maxHeight} !important; border-radius: ${settings.borderRadius} !important; border: ${settings.showBorder ? '2px solid #e9ecef' : 'none'} !important; } `; $('#wmp-dynamic-styles').remove(); $('head').append(`<style id="wmp-dynamic-styles">${style}</style>`); }
    async function testMediaFetch() { const status = $('#wmp-test-status'); const preview = $('#wmp-test-preview'); const debugInfo = $('#wmp-debug-info'); status.removeClass('success error info').html('🔍 正在采集媒体...').addClass('info').show(); preview.hide().empty(); debugInfo.hide(); try { const urls = await fetchMediaUrlsFromSource(); if (urls.length > 0) { status.html(`✅ 成功采集到 ${urls.length} 个媒体链接`).addClass('success'); const firstUrl = urls[0]; const isVideo = isVideoUrl(firstUrl); const mediaElement = isVideo ? `<video src="${firstUrl}" controls muted loop style="max-width:100%; max-height:100px;"></video>` : `<img src="${firstUrl}" style="max-width:100%; max-height:100px;">`; preview.html(mediaElement).show(); mediaCache = urls; } else { status.html('❌ 未采集到任何媒体链接').addClass('error'); } } catch (error) { status.html(`❌ 采集失败: ${error.message}`).addClass('error'); } }
    async function testMediaInsert() { const lastMessage = SillyTavern.chat.getMessages().slice(-1)[0]; if (!lastMessage || lastMessage.is_user) { SillyTavern.system.showToast('❌ 请先让AI回复一条消息再进行测试', 'error'); return; } autoInsertMedia('test', { message: lastMessage }); SillyTavern.system.showToast('✅ 测试媒体已插入到最新一条AI回复中', 'success'); }
    function clearMediaCache() { mediaCache = []; SillyTavern.system.showToast('🗑️ 媒体缓存已清除', 'success'); $('#wmp-test-status').html('💾 缓存已清除').addClass('info').show(); $('#wmp-test-preview').hide().empty(); $('#wmp-debug-info').hide(); }
    function isVideoUrl(url) { return ['.mp4', '.webm', '.ogg', '.mov', '.avi'].some(ext => url.toLowerCase().includes(ext)); }
    async function autoInsertMedia(type, data) { const message = data.message; if (!settings.enabled || message.is_user || !message.mes) return; const messageElement = document.querySelector(`#mes_${message.id} .mes_text`); if (!messageElement) return; const mediaUrl = await getRandomMediaUrl(); if (!mediaUrl) return; const container = document.createElement('div'); container.className = 'web-media-player-container'; const isVideo = isVideoUrl(mediaUrl); let mediaElement; if (isVideo) { mediaElement = document.createElement('video'); mediaElement.src = mediaUrl; mediaElement.controls = true; mediaElement.loop = true; mediaElement.muted = true; } else { mediaElement = document.createElement('img'); mediaElement.src = mediaUrl; mediaElement.onclick = () => window.open(mediaUrl, '_blank'); } container.appendChild(mediaElement); messageElement.appendChild(container); updateMediaStyles(); }
    async function getRandomMediaUrl() { if (mediaCache.length === 0) { try { const urls = await fetchMediaUrlsFromSource(); if (urls && urls.length > 0) { mediaCache = urls; console.log(`[${extensionName}] 采集到 ${mediaCache.length} 个媒体链接`); } else { return null; } } catch (error) { console.error(`[${extensionName}] 自动获取媒体时采集失败:`, error); return null; } } const randomIndex = Math.floor(Math.random() * mediaCache.length); return mediaCache[randomIndex]; }
    $(document).ready(async function () { try { const loadedSettings = await SillyTavern.extension.loadSettings(extensionName); settings = { ...defaultSettings, ...loadedSettings }; } catch (error) { console.error(`[${extensionName}] 加载设置失败:`, error); } addSettingsPanel(); addSettingsEventListeners(); updateMediaStyles(); SillyTavern.events.on('message-rendered', autoInsertMedia); console.log(`[${extensionName} v${extensionVersion}] 专业版已加载`); });

})();
