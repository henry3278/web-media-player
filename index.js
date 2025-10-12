// 文件名: index.js - URL池随机媒体插件
(function() {
    console.log('🎲 URL媒体池插件加载...');
    
    const PLUGIN_NAME = 'url-media-pool';
    const PLUGIN_VERSION = '1.0.0';
    
    // 默认配置
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [
            'https://example.com/images/photo1.jpg',
            'https://example.com/images/photo2.jpg',
            'https://example.com/videos/video1.mp4'
        ],
        maxWidth: '80%',
        maxHeight: '400px'
    };
    
    // 创建设置面板
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🎲 URL媒体池 v${PLUGIN_VERSION}</h5>
                <p style="color: #666;">直接在下面添加图片/视频的完整URL，每行一个</p>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入媒体</label>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表 (每行一个):</label>
                    <textarea class="form-control" id="ump-urls" rows="8" placeholder="https://example.com/image1.jpg&#10;https://example.com/video1.mp4&#10;https://example.com/image2.png">${config.mediaUrls.join('\n')}</textarea>
                    <small class="form-text text-muted">
                        支持: .jpg .png .gif .webp .mp4 .webm .ogg<br>
                        确保URL可直接访问
                    </small>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <label>最大宽度:</label>
                        <input type="text" class="form-control" id="ump-max-width" value="${config.maxWidth}">
                    </div>
                    <div class="col-6">
                        <label>最大高度:</label>
                        <input type="text" class="form-control" id="ump-max-height" value="${config.maxHeight}">
                    </div>
                </div>
                
                <div class="btn-group mt-3">
                    <button class="btn btn-sm btn-primary" id="ump-test-random">🎲 测试随机选择</button>
                    <button class="btn btn-sm btn-success" id="ump-test-insert">➕ 测试插入</button>
                    <button class="btn btn-sm btn-info" id="ump-validate">🔍 验证URL</button>
                    <button class="btn btn-sm btn-secondary" id="ump-clear">🗑️ 清空列表</button>
                </div>
                
                <div id="ump-status" style="margin-top: 10px; min-height: 20px;"></div>
                <div id="ump-preview" style="margin-top: 10px;"></div>
                <div id="ump-url-count" style="margin-top: 5px; font-size: 12px; color: #666;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        updateUrlCount();
    }
    
    // 绑定事件
    function bindEvents() {
        // 启用开关
        $('#ump-enabled').on('change', function() {
            config.enabled = this.checked;
            saveConfig();
            showStatus(`插件已${config.enabled ? '启用' : '禁用'}`);
        });
        
        // 自动插入开关
        $('#ump-auto-insert').on('change', function() {
            config.autoInsert = this.checked;
            saveConfig();
            showStatus(`自动插入已${config.autoInsert ? '开启' : '关闭'}`);
        });
        
        // URL列表实时保存
        $('#ump-urls').on('input', debounce(() => {
            config.mediaUrls = $('#ump-urls').val().split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);
            saveConfig();
            updateUrlCount();
        }, 1000));
        
        // 尺寸设置
        $('#ump-max-width, #ump-max-height').on('input', debounce(() => {
            config.maxWidth = $('#ump-max-width').val();
            config.maxHeight = $('#ump-max-height').val();
            saveConfig();
        }, 500));
        
        // 测试随机选择
        $('#ump-test-random').on('click', testRandomSelection);
        
        // 测试插入
        $('#ump-test-insert').on('click', testInsert);
        
        // 验证URL
        $('#ump-validate').on('click', validateUrls);
        
        // 清空列表
        $('#ump-clear').on('click', clearUrlList);
    }
    
    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = { info: 'blue', success: 'green', error: 'red', warning: 'orange' };
        $('#ump-status').html(`<span style="color: ${colors[type]}; font-weight: bold;">${message}</span>`);
    }
    
    // 更新URL计数
    function updateUrlCount() {
        const count = config.mediaUrls.length;
        const mediaTypes = {
            image: config.mediaUrls.filter(url => isImageUrl(url)).length,
            video: config.mediaUrls.filter(url => isVideoUrl(url)).length,
            other: config.mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url)).length
        };
        
        $('#ump-url-count').html(`
            总计: <strong>${count}</strong> 个媒体文件 | 
            图片: ${mediaTypes.image} | 
            视频: ${mediaTypes.video} | 
            其他: ${mediaTypes.other}
        `);
    }
    
    // 判断URL类型
    function isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
    }
    
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url);
    }
    
    // 保存配置
    async function saveConfig() {
        try {
            await SillyTavern.extension.saveSettings(PLUGIN_NAME, config);
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
    
    // 加载配置
    async function loadConfig() {
        try {
            const saved = await SillyTavern.extension.loadSettings(PLUGIN_NAME);
            if (saved) {
                config = { ...config, ...saved };
                // 确保mediaUrls是数组
                if (typeof config.mediaUrls === 'string') {
                    config.mediaUrls = config.mediaUrls.split('\n').filter(url => url.trim());
                }
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置');
        }
    }
    
    // 随机选择URL
    function getRandomMediaUrl() {
        if (config.mediaUrls.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * config.mediaUrls.length);
        return config.mediaUrls[randomIndex];
    }
    
    // 测试随机选择
    function testRandomSelection() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 媒体列表为空', 'error');
            return;
        }
        
        const isVideo = isVideoUrl(url);
        const mediaHtml = isVideo ? 
            `<video src="${url}" controls style="max-width: 300px; max-height: 200px;"></video>` :
            `<img src="${url}" style="max-width: 300px; max-height: 200px; border: 1px solid #ccc;">`;
        
        $('#ump-preview').html(`
            <div style="border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                <p><strong>随机选择的媒体:</strong> ${isVideo ? '🎥 视频' : '🖼️ 图片'}</p>
                ${mediaHtml}
                <p style="word-break: break-all; font-size: 12px; margin-top: 5px;">${url}</p>
            </div>
        `);
        
        showStatus(`✅ 随机选择: ${url.split('/').pop()}`, 'success');
    }
    
    // 验证URL
    async function validateUrls() {
        if (config.mediaUrls.length === 0) {
            showStatus('❌ 媒体列表为空', 'error');
            return;
        }
        
        showStatus('🔍 验证URL中...', 'info');
        
        let validCount = 0;
        let invalidUrls = [];
        
        // 验证前5个URL（避免过多请求）
        const urlsToCheck = config.mediaUrls.slice(0, 5);
        
        for (const url of urlsToCheck) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    validCount++;
                } else {
                    invalidUrls.push(url);
                }
            } catch (error) {
                invalidUrls.push(url);
            }
        }
        
        if (invalidUrls.length === 0) {
            showStatus(`✅ 验证通过！抽查的 ${urlsToCheck.length} 个URL均可访问`, 'success');
        } else {
            showStatus(`⚠️ ${validCount}/${urlsToCheck.length} 个URL可访问，${invalidUrls.length} 个可能有问题`, 'warning');
            console.warn('可能有问题的URL:', invalidUrls);
        }
    }
    
    // 清空列表
    function clearUrlList() {
        if (confirm('确定要清空所有URL吗？')) {
            config.mediaUrls = [];
            $('#ump-urls').val('');
            saveConfig();
            updateUrlCount();
            $('#ump-preview').empty();
            showStatus('🗑️ 媒体列表已清空');
        }
    }
    
    // 创建媒体元素
    function createMediaElement(url) {
        const isVideo = isVideoUrl(url);
        const mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
        
        mediaElement.src = url;
        mediaElement.style.maxWidth = config.maxWidth;
        mediaElement.style.maxHeight = config.maxHeight;
        mediaElement.style.borderRadius = '8px';
        mediaElement.style.border = '2px solid #e0e0e0';
        mediaElement.style.cursor = 'pointer';
        
        if (isVideo) {
            mediaElement.controls = true;
            mediaElement.muted = true;
            mediaElement.loop = true;
        }
        
        mediaElement.onclick = () => window.open(url, '_blank');
        mediaElement.onerror = function() {
            this.style.opacity = '0.5';
            this.title = '媒体加载失败';
        };
        
        return mediaElement;
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId) {
        const url = getRandomMediaUrl();
        if (!url) return false;
        
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) return false;
        
        const container = document.createElement('div');
        container.className = 'url-media-container';
        container.style.marginTop = '10px';
        container.style.textAlign = 'center';
        
        const mediaElement = createMediaElement(url);
        container.appendChild(mediaElement);
        messageElement.appendChild(container);
        
        console.log('✅ 媒体插入成功:', url);
        return true;
    }
    
    // 测试插入
    function testInsert() {
        const messages = document.querySelectorAll('.mes');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && !lastMessage.querySelector('.mes_user')) {
            const messageId = lastMessage.id.replace('mes_', '');
            if (insertMediaToMessage(messageId)) {
                showStatus('✅ 测试插入成功！');
            } else {
                showStatus('❌ 插入失败，媒体列表为空', 'error');
            }
        } else {
            showStatus('❌ 找不到AI回复消息', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || !config.autoInsert || data.message.is_user) return;
        
        setTimeout(() => {
            insertMediaToMessage(data.message.id);
        }, 100);
    }
    
    // 初始化
    async function initialize() {
        await loadConfig();
        createSettingsPanel();
        
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
        }
        
        console.log('🎲 URL媒体池插件初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
