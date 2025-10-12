// 文件名: index.js (目录自动扫描版 v10.0.0)
(function () {
    const extensionName = 'local-media-player';
    const extensionVersion = '10.0.0';

    const defaultSettings = { enabled: true, mediaType: 'image', maxWidth: '80%', maxHeight: '450px', borderRadius: '8px', showBorder: true, };
    let settings = { ...defaultSettings };
    let mediaCache = { photos: [], videos: [] };

    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="local-media-player-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">📁 本地媒体播放器 (自动扫描)</h5>
                    <small>v${extensionVersion}</small>
                </div>
                <p class="mb-2 text-muted">自动扫描插件目录下的 <code>photos</code> 和 <code>videos</code> 文件夹。</p>
                
                <div class="wmp-collapsible active">⚙️ 基础设置</div>
                <div class="wmp-collapsible-content" style="display: block;">
                    <div class="form-group"><label><input type="checkbox" id="wmp-enabled" ${settings.enabled ? 'checked' : ''}> 启用插件</label></div>
                    <div class="form-group">
                        <label for="wmp-mediaType">📺 媒体类型</label>
                        <select id="wmp-mediaType" class="form-control">
                            <option value="image" ${settings.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                            <option value="video" ${settings.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                            <option value="both" ${settings.mediaType === 'both' ? 'selected' : ''}>图片和视频</option>
                        </select>
                    </div>
                </div>

                <div class="wmp-collapsible">🎨 显示设置</div>
                <div class="wmp-collapsible-content">
                    <div class="row">
                        <div class="col-6"><label for="wmp-maxWidth">最大宽度</label><input type="text" id="wmp-maxWidth" class="form-control" value="${settings.maxWidth}"></div>
                        <div class="col-6"><label for="wmp-maxHeight">最大高度</label><input type="text" id="wmp-maxHeight" class="form-control" value="${settings.maxHeight}"></div>
                    </div>
                    <div class="form-group mt-2"><label for="wmp-borderRadius">圆角大小</label><input type="text" id="wmp-borderRadius" class="form-control" value="${settings.borderRadius}"></div>
                    <div class="form-group"><label><input type="checkbox" id="wmp-showBorder" ${settings.showBorder ? 'checked' : ''}> 显示边框</label></div>
                </div>

                <div class="wmp-collapsible">🔍 文件管理</div>
                <div class="wmp-collapsible-content">
                    <div class="wmp-test-area">
                        <p class="text-muted small">上传新文件后，请点击下方按钮刷新。</p>
                        <button type="button" id="wmp-refresh-files" class="btn btn-primary btn-sm wmp-btn">🔄 扫描文件夹</button>
                        <div id="wmp-file-status" class="wmp-status"></div>
                    </div>
                </div>
            </div>
        `;
        $('#extensions_settings').append(settingsHtml);
    }

    function addSettingsEventListeners() {
        $('#local-media-player-settings').on('change', '#wmp-enabled', updateSetting('enabled', 'checkbox'));
        $('#local-media-player-settings').on('change', '#wmp-mediaType', updateSetting('mediaType', 'text'));
        $('#local-media-player-settings').on('input', '#wmp-maxWidth', updateSetting('maxWidth', 'text'));
        $('#local-media-player-settings').on('input', '#wmp-maxHeight', updateSetting('maxHeight', 'text'));
        $('#local-media-player-settings').on('input', '#wmp-borderRadius', updateSetting('borderRadius', 'text'));
        $('#local-media-player-settings').on('change', '#wmp-showBorder', updateSetting('showBorder', 'checkbox'));
        $('#local-media-player-settings').on('click', '#wmp-refresh-files', refreshFileList);
        $('#local-media-player-settings').on('click', '.wmp-collapsible', function() { $(this).toggleClass('active'); $(this).next('.wmp-collapsible-content').slideToggle(); });
    }

    /**
     * 【全新核心】扫描目录列表
     * @param {string} dirPath - 要扫描的目录路径, e.g., '/photos/'
     * @param {RegExp} fileRegex - 用于匹配文件名的正则表达式
     * @returns {Promise<string[]>} - 媒体文件的完整URL数组
     */
    async function scanDirectory(dirPath, fileRegex) {
        const baseUrl = `/extensions/third-party/web-media-player${dirPath}`;
        const response = await fetch(baseUrl);
        if (!response.ok) {
            throw new Error(`访问目录 ${baseUrl} 失败 (HTTP ${response.status})。可能是云服务商禁用了目录浏览功能。`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const urls = [];
        const links = doc.querySelectorAll('a');

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && fileRegex.test(href)) {
                // new URL() 会自动处理相对路径和绝对路径，非常稳健
                const fullUrl = new URL(href, response.url).href;
                urls.push(fullUrl);
            }
        });
        
        return urls;
    }

    /**
     * 刷新文件列表 - 通过扫描目录实现
     */
    async function refreshFileList() {
        const status = $('#wmp-file-status');
        status.removeClass('success error info').html('🔄 正在扫描文件夹...').addClass('info').show();
        
        try {
            const photoRegex = /\.(jpg|jpeg|png|gif|webp)$/i;
            const videoRegex = /\.(mp4|webm|ogg|mov)$/i;

            // 并行扫描 photos 和 videos 文件夹
            const [photoUrls, videoUrls] = await Promise.all([
                scanDirectory('/photos/', photoRegex).catch(e => { console.warn(e); return []; }), // 如果一个失败，不影响另一个
                scanDirectory('/videos/', videoRegex).catch(e => { console.warn(e); return []; })
            ]);

            mediaCache = {
                photos: [...new Set(photoUrls)], // 去重
                videos: [...new Set(videoUrls)]
            };
            
            if (mediaCache.photos.length === 0 && mediaCache.videos.length === 0) {
                 status.html(`❌ 未扫描到任何媒体文件。请检查文件夹是否为空，或确认云服务商是否支持目录浏览。`).addClass('error');
            } else {
                 status.html(`✅ 成功扫描到 ${mediaCache.photos.length} 张图片 和 ${mediaCache.videos.length} 个视频。`).addClass('success');
            }

        } catch (error) {
            status.html(`❌ 扫描失败: ${error.message}`).addClass('error');
        }
    }

    // ... (其余所有辅助函数，如 getRandomMediaUrl, autoInsertMedia 等都与之前版本相同，无需修改) ...
    function getRandomMediaUrl() { const { photos, videos } = mediaCache; let availableUrls = []; if (settings.mediaType === 'image') { availableUrls = photos; } else if (settings.mediaType === 'video') { availableUrls = videos; } else { availableUrls = [...photos, ...videos]; } if (availableUrls.length === 0) { console.warn(`[${extensionName}] 没有可用的媒体文件来插入。`); return null; } const randomIndex = Math.floor(Math.random() * availableUrls.length); return availableUrls[randomIndex]; } function updateSetting(key, type) { return async function() { const value = type === 'checkbox' ? $(this).is(':checked') : $(this).val(); settings[key] = value; await SillyTavern.extension.saveSettings(extensionName, settings); updateMediaStyles(); }; } function updateMediaStyles() { const style = ` .web-media-player-container img, .web-media-player-container video { max-width: ${settings.maxWidth} !important; max-height: ${settings.maxHeight} !important; border-radius: ${settings.borderRadius} !important; border: ${settings.showBorder ? '2px solid #e9ecef' : 'none'} !important; } `; $('#wmp-dynamic-styles').remove(); $('head').append(`<style id="wmp-dynamic-styles">${style}</style>`); } function isVideoUrl(url) { return ['.mp4', '.webm', '.ogg', '.mov'].some(ext => url.toLowerCase().endsWith(ext)); } async function autoInsertMedia(type, data) { const message = data.message; if (!settings.enabled || message.is_user || !message.mes) return; const messageElement = document.querySelector(`#mes_${message.id} .mes_text`); if (!messageElement) return; const mediaUrl = getRandomMediaUrl(); if (!mediaUrl) return; const container = document.createElement('div'); container.className = 'web-media-player-container'; const isVideo = isVideoUrl(mediaUrl); let mediaElement; if (isVideo) { mediaElement = document.createElement('video'); mediaElement.src = mediaUrl; mediaElement.controls = true; mediaElement.loop = true; mediaElement.muted = true; } else { mediaElement = document.createElement('img'); mediaElement.src = mediaUrl; mediaElement.onclick = () => window.open(mediaUrl, '_blank'); } container.appendChild(mediaElement); messageElement.appendChild(container); updateMediaStyles(); }
    $(document).ready(async function () { try { const loadedSettings = await SillyTavern.extension.loadSettings(extensionName); settings = { ...defaultSettings, ...loadedSettings }; } catch (error) { console.error(`[${extensionName}] 加载设置失败:`, error); } addSettingsPanel(); addSettingsEventListeners(); updateMediaStyles(); SillyTavern.events.on('message-rendered', autoInsertMedia); await refreshFileList(); console.log(`[${extensionName} v${extensionVersion}] 本地播放器(自动扫描版)已加载`); });

})();
