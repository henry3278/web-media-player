// 文件名: index.js (纯前端版 v9.0.0)
(function () {
    const extensionName = 'local-media-player';
    const extensionVersion = '9.0.0';

    const defaultSettings = { enabled: true, mediaType: 'image', maxWidth: '80%', maxHeight: '450px', borderRadius: '8px', showBorder: true, };
    let settings = { ...defaultSettings };
    let mediaCache = { photos: [], videos: [] };

    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="local-media-player-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">📁 本地媒体播放器 (手动版)</h5>
                    <small>v${extensionVersion}</small>
                </div>
                <p class="mb-2 text-muted">从插件目录的 <code>filelist.json</code> 文件中读取媒体列表。</p>
                
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
                        <p class="text-muted small">每次修改 <code>filelist.json</code> 或上传新文件后，请点击下方按钮刷新。</p>
                        <button type="button" id="wmp-refresh-files" class="btn btn-primary btn-sm wmp-btn">🔄 重新加载列表</button>
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
     * 刷新文件列表 - 从本地 filelist.json 读取
     */
    async function refreshFileList() {
        const status = $('#wmp-file-status');
        status.removeClass('success error info').html('🔄 正在读取 <code>filelist.json</code>...').addClass('info').show();
        try {
            // 添加一个随机查询参数来防止浏览器缓存
            const fileListUrl = `/extensions/third-party/web-media-player/filelist.json?t=${Date.now()}`;
            const response = await fetch(fileListUrl);
            if (!response.ok) throw new Error(`HTTP错误: ${response.status} (请确认 filelist.json 文件存在且格式正确)`);
            
            const data = await response.json();
            
            // 将文件名转换为完整的URL路径
            mediaCache.photos = data.photos.map(file => `/extensions/third-party/web-media-player/photos/${encodeURIComponent(file)}`);
            mediaCache.videos = data.videos.map(file => `/extensions/third-party/web-media-player/videos/${encodeURIComponent(file)}`);
            
            status.html(`✅ 成功加载 ${mediaCache.photos.length} 张图片 和 ${mediaCache.videos.length} 个视频。`).addClass('success');
        } catch (error) {
            status.html(`❌ 加载列表失败: ${error.message}`).addClass('error');
        }
    }

    // ... (其余所有辅助函数，如 getRandomMediaUrl, autoInsertMedia 等都与 8.0.1 版本相同，无需修改) ...
    function getRandomMediaUrl() { const { photos, videos } = mediaCache; let availableUrls = []; if (settings.mediaType === 'image') { availableUrls = photos; } else if (settings.mediaType === 'video') { availableUrls = videos; } else { availableUrls = [...photos, ...videos]; } if (availableUrls.length === 0) { console.warn(`[${extensionName}] 没有可用的媒体文件来插入。`); return null; } const randomIndex = Math.floor(Math.random() * availableUrls.length); return availableUrls[randomIndex]; } function updateSetting(key, type) { return async function() { const value = type === 'checkbox' ? $(this).is(':checked') : $(this).val(); settings[key] = value; await SillyTavern.extension.saveSettings(extensionName, settings); updateMediaStyles(); }; } function updateMediaStyles() { const style = ` .web-media-player-container img, .web-media-player-container video { max-width: ${settings.maxWidth} !important; max-height: ${settings.maxHeight} !important; border-radius: ${settings.borderRadius} !important; border: ${settings.showBorder ? '2px solid #e9ecef' : 'none'} !important; } `; $('#wmp-dynamic-styles').remove(); $('head').append(`<style id="wmp-dynamic-styles">${style}</style>`); } function isVideoUrl(url) { return ['.mp4', '.webm', '.ogg', '.mov'].some(ext => url.toLowerCase().endsWith(ext)); } async function autoInsertMedia(type, data) { const message = data.message; if (!settings.enabled || message.is_user || !message.mes) return; const messageElement = document.querySelector(`#mes_${message.id} .mes_text`); if (!messageElement) return; const mediaUrl = getRandomMediaUrl(); if (!mediaUrl) return; const container = document.createElement('div'); container.className = 'web-media-player-container'; const isVideo = isVideoUrl(mediaUrl); let mediaElement; if (isVideo) { mediaElement = document.createElement('video'); mediaElement.src = mediaUrl; mediaElement.controls = true; mediaElement.loop = true; mediaElement.muted = true; } else { mediaElement = document.createElement('img'); mediaElement.src = mediaUrl; mediaElement.onclick = () => window.open(mediaUrl, '_blank'); } container.appendChild(mediaElement); messageElement.appendChild(container); updateMediaStyles(); }
    $(document).ready(async function () { try { const loadedSettings = await SillyTavern.extension.loadSettings(extensionName); settings = { ...defaultSettings, ...loadedSettings }; } catch (error) { console.error(`[${extensionName}] 加载设置失败:`, error); } addSettingsPanel(); addSettingsEventListeners(); updateMediaStyles(); SillyTavern.events.on('message-rendered', autoInsertMedia); await refreshFileList(); console.log(`[${extensionName} v${extensionVersion}] 本地播放器(手动版)已加载`); });

})();
