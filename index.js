// 文件名: index.js - 增强版URL媒体池插件
(function() {
    console.log('🎲 增强版URL媒体池插件加载...');
    
    const PLUGIN_NAME = 'url-media-pool';
    const PLUGIN_VERSION = '2.0.0';
    
    // 默认配置
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [],
        mediaType: 'mixed', // mixed, image-only, video-only
        insertPosition: 'after', // after, before, random
        maxWidth: '80%',
        maxHeight: '400px',
        imageWidth: '300px',
        imageHeight: 'auto',
        videoWidth: '400px',
        videoHeight: '225px'
    };
    
    // 存储已插入的消息ID，避免重复插入
    const insertedMessages = new Set();
    
    // 创建设置面板
    function createSettingsPanel() {
        // 确保配置正确加载
        normalizeConfig();
        
        const html = `
            <div class="list-group-item">
                <h5>🎲 增强版URL媒体池 v${PLUGIN_VERSION}</h5>
                <p style="color: #666; font-size: 12px;">状态: <span id="ump-config-status">加载中...</span></p>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入媒体</label>
                </div>
                
                <div class="form-group">
                    <label>媒体类型:</label>
                    <select class="form-control" id="ump-media-type">
                        <option value="mixed" ${config.mediaType === 'mixed' ? 'selected' : ''}>混合模式 (图片+视频)</option>
                        <option value="image-only" ${config.mediaType === 'image-only' ? 'selected' : ''}>仅图片</option>
                        <option value="video-only" ${config.mediaType === 'video-only' ? 'selected' : ''}>仅视频</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>插入位置:</label>
                    <select class="form-control" id="ump-insert-position">
                        <option value="after" ${config.insertPosition === 'after' ? 'selected' : ''}>AI回复之后</option>
                        <option value="before" ${config.insertPosition === 'before' ? 'selected' : ''}>AI回复之前</option>
                        <option value="random" ${config.insertPosition === 'random' ? 'selected' : ''}>随机位置</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表 (每行一个):</label>
                    <textarea class="form-control" id="ump-urls" rows="8" placeholder="https://example.com/image1.jpg&#10;https://example.com/video1.mp4" style="font-family: monospace; font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                    <small class="form-text text-muted">
                        支持: 图片(.jpg .png .gif .webp) 视频(.mp4 .webm .ogg)<br>
                        <button type="button" class="btn btn-sm btn-outline-secondary mt-1" onclick="addExampleUrls()">添加测试URL</button>
                        <button type="button" class="btn btn-sm btn-outline-danger mt-1" onclick="clearUrls()">清空列表</button>
                    </small>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <label>图片宽度:</label>
                        <input type="text" class="form-control" id="ump-image-width" value="${config.imageWidth}" placeholder="300px">
                    </div>
                    <div class="col-6">
                        <label>图片高度:</label>
                        <input type="text" class="form-control" id="ump-image-height" value="${config.imageHeight}" placeholder="auto">
                    </div>
                </div>
                
                <div class="row mt-2">
                    <div class="col-6">
                        <label>视频宽度:</label>
                        <input type="text" class="form-control" id="ump-video-width" value="${config.videoWidth}" placeholder="400px">
                    </div>
                    <div class="col-6">
                        <label>视频高度:</label>
                        <input type="text" class="form-control" id="ump-video-height" value="${config.videoHeight}" placeholder="225px">
                    </div>
                </div>
                
                <div class="btn-group mt-3 w-100">
                    <button class="btn btn-sm btn-primary" id="ump-test-random">🎲 测试随机</button>
                    <button class="btn btn-sm btn-success" id="ump-test-insert">➕ 测试插入</button>
                    <button class="btn btn-sm btn-info" id="ump-save-now">💾 立即保存</button>
                </div>
                
                <div id="ump-status" style="margin-top: 10px; min-height: 20px; font-size: 12px;"></div>
                <div id="ump-url-stats" style="margin-top: 5px; font-size: 11px; color: #666;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        updateStats();
    }
    
    // 规范化配置
    function normalizeConfig() {
        if (typeof config.mediaUrls === 'string') {
            config.mediaUrls = config.mediaUrls.split('\n').filter(url => url.trim());
        }
        if (!Array.isArray(config.mediaUrls)) {
            config.mediaUrls = [];
        }
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
        
        // 媒体类型
        $('#ump-media-type').on('change', function() {
            config.mediaType = this.value;
            saveConfig();
            showStatus(`媒体类型设置为: ${getMediaTypeText(this.value)}`);
        });
        
        // 插入位置
        $('#ump-insert-position').on('change', function() {
            config.insertPosition = this.value;
            saveConfig();
            showStatus(`插入位置设置为: ${getPositionText(this.value)}`);
        });
        
        // URL列表实时保存
        $('#ump-urls').on('input', debounce(() => {
            updateUrlList();
        }, 1000));
        
        // 尺寸设置
        $('#ump-image-width, #ump-image-height, #ump-video-width, #ump-video-height').on('input', debounce(() => {
            config.imageWidth = $('#ump-image-width').val();
            config.imageHeight = $('#ump-image-height').val();
            config.videoWidth = $('#ump-video-width').val();
            config.videoHeight = $('#ump-video-height').val();
            saveConfig();
        }, 500));
        
        $('#ump-test-random').on('click', testRandomSelection);
        $('#ump-test-insert').on('click', testInsert);
        $('#ump-save-now').on('click', () => {
            updateUrlList();
            showStatus('✅ 配置已保存');
        });
        
        // 全局函数
        window.addExampleUrls = function() {
            const exampleUrls = [
                'https://picsum.photos/800/600',
                'https://picsum.photos/800/601', 
                'https://picsum.photos/800/602'
            ];
            $('#ump-urls').val(exampleUrls.join('\n'));
            updateUrlList();
            showStatus('✅ 已添加测试URL');
        };
        
        window.clearUrls = function() {
            if (confirm('确定要清空所有URL吗？')) {
                $('#ump-urls').val('');
                updateUrlList();
                showStatus('🗑️ 已清空URL列表');
            }
        };
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
    
    // 更新URL列表
    function updateUrlList() {
        const urlsText = $('#ump-urls').val();
        config.mediaUrls = urlsText.split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0 && url.startsWith('http'));
        saveConfig();
        updateStats();
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = { info: 'blue', success: 'green', error: 'red', warning: 'orange' };
        $('#ump-status').html(`<span style="color: ${colors[type]};">${message}</span>`);
    }
    
    // 更新统计信息
    function updateStats() {
        const total = config.mediaUrls.length;
        const images = config.mediaUrls.filter(url => isImageUrl(url)).length;
        const videos = config.mediaUrls.filter(url => isVideoUrl(url)).length;
        const others = total - images - videos;
        
        $('#ump-url-stats').html(`
            总计: <strong>${total}</strong> 个URL | 
            图片: <span style="color: green;">${images}</span> | 
            视频: <span style="color: blue;">${videos}</span> | 
            其他: <span style="color: orange;">${others}</span>
        `);
        
        $('#ump-config-status').html(`已配置 ${total} 个媒体URL`);
        $('#ump-config-status').css('color', total > 0 ? 'green' : 'red');
    }
    
    // 获取媒体类型文本
    function getMediaTypeText(type) {
        const types = {
            'mixed': '混合模式',
            'image-only': '仅图片', 
            'video-only': '仅视频'
        };
        return types[type] || type;
    }
    
    // 获取位置文本
    function getPositionText(position) {
        const positions = {
            'after': '回复之后',
            'before': '回复之前',
            'random': '随机位置'
        };
        return positions[position] || position;
    }
    
    // 判断URL类型
    function isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
    }
    
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url);
    }
    
    // 保存配置（增强版）
    async function saveConfig() {
        try {
            console.log('💾 保存配置:', config);
            // 确保使用正确的存储方法
            if (SillyTavern && SillyTavern.extension && SillyTavern.extension.saveSettings) {
                await SillyTavern.extension.saveSettings(PLUGIN_NAME, config);
                console.log('✅ 配置保存成功');
            } else {
                // 备用方案：使用localStorage
                localStorage.setItem(`st-extension-${PLUGIN_NAME}`, JSON.stringify(config));
                console.log('✅ 配置保存到localStorage');
            }
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            // 最终备用方案
            localStorage.setItem(`st-extension-${PLUGIN_NAME}`, JSON.stringify(config));
            showStatus('⚠️ 使用备用存储，配置已保存', 'warning');
        }
    }
    
    // 加载配置（增强版）
    async function loadConfig() {
        try {
            console.log('🔍 加载配置...');
            let savedConfig = null;
            
            // 尝试多种加载方式
            if (SillyTavern && SillyTavern.extension && SillyTavern.extension.loadSettings) {
                savedConfig = await SillyTavern.extension.loadSettings(PLUGIN_NAME);
            }
            
            // 如果主方法失败，尝试localStorage
            if (!savedConfig) {
                const localData = localStorage.getItem(`st-extension-${PLUGIN_NAME}`);
                if (localData) {
                    savedConfig = JSON.parse(localData);
                    console.log('📦 从localStorage加载配置');
                }
            }
            
            if (savedConfig) {
                config = { ...config, ...savedConfig };
                console.log('✅ 配置加载成功:', config);
            }
        } catch (error) {
            console.warn('⚠️ 加载配置失败，使用默认配置:', error);
        }
    }
    
    // 根据媒体类型过滤URL
    function getFilteredUrls() {
        let urls = config.mediaUrls;
        
        switch (config.mediaType) {
            case 'image-only':
                urls = urls.filter(url => isImageUrl(url));
                break;
            case 'video-only':
                urls = urls.filter(url => isVideoUrl(url));
                break;
            case 'mixed':
            default:
                // 保持所有URL
                break;
        }
        
        return urls;
    }
    
    // 随机选择URL
    function getRandomMediaUrl() {
        const filteredUrls = getFilteredUrls();
        if (filteredUrls.length === 0) {
            console.warn('❌ 过滤后的媒体列表为空');
            return null;
        }
        const randomIndex = Math.floor(Math.random() * filteredUrls.length);
        return filteredUrls[randomIndex];
    }
    
    // 测试随机选择
    function testRandomSelection() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 没有可用的媒体URL', 'error');
            return;
        }
        
        const isVideo = isVideoUrl(url);
        showStatus(`✅ 随机选择: ${isVideo ? '🎥 视频' : '🖼️ 图片'}`, 'success');
        
        const previewHtml = `
            <div style="border: 2px solid #4CAF50; padding: 10px; margin-top: 10px; border-radius: 5px;">
                <p><strong>🎲 随机选择预览</strong></p>
                ${isVideo ? 
                    `<video src="${url}" controls style="max-width: 200px; max-height: 150px;"></video>` :
                    `<img src="${url}" style="max-width: 200px; max-height: 150px; border: 1px solid #ccc;">`
                }
                <p style="word-break: break-all; font-size: 10px; margin: 5px 0;">${url}</p>
            </div>
        `;
        
        $('#ump-status').after(previewHtml);
    }
    
    // 创建媒体元素
    function createMediaElement(url) {
        const isVideo = isVideoUrl(url);
        const mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
        
        mediaElement.src = url;
        
        if (isVideo) {
            mediaElement.style.width = config.videoWidth;
            mediaElement.style.height = config.videoHeight;
            mediaElement.controls = true;
            mediaElement.muted = true;
        } else {
            mediaElement.style.width = config.imageWidth;
            mediaElement.style.height = config.imageHeight;
        }
        
        mediaElement.style.borderRadius = '8px';
        mediaElement.style.border = '2px solid #e0e0e0';
        mediaElement.style.cursor = 'pointer';
        mediaElement.style.maxWidth = '100%';
        
        mediaElement.onclick = () => window.open(url, '_blank');
        mediaElement.onerror = function() {
            this.style.opacity = '0.3';
            this.title = '媒体加载失败';
        };
        
        return mediaElement;
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId, isTest = false) {
        // 检查是否已经插入过（避免重复插入）
        if (!isTest && insertedMessages.has(messageId)) {
            console.log('⏩ 跳过已插入的消息:', messageId);
            return false;
        }
        
        const url = getRandomMediaUrl();
        if (!url) return false;
        
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) return false;
        
        const container = document.createElement('div');
        container.className = 'media-insert-container';
        container.style.marginTop = '10px';
        container.style.textAlign = 'center';
        
        if (isTest) {
            container.style.borderLeft = '3px solid #4CAF50';
            container.style.paddingLeft = '10px';
        }
        
        const mediaElement = createMediaElement(url);
        container.appendChild(mediaElement);
        
        // 根据插入位置决定插入方式
        if (config.insertPosition === 'before') {
            messageElement.insertBefore(container, messageElement.firstChild);
        } else if (config.insertPosition === 'random' && Math.random() > 0.5) {
            messageElement.insertBefore(container, messageElement.firstChild);
        } else {
            messageElement.appendChild(container);
        }
        
        // 标记为已插入
        if (!isTest) {
            insertedMessages.add(messageId);
        }
        
        console.log('✅ 媒体插入成功:', url);
        return true;
    }
    
    // 测试插入
    function testInsert() {
        console.log('🧪 开始测试插入...');
        
        const messages = document.querySelectorAll('.mes');
        let lastAIMessage = null;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].querySelector('.mes_user')) {
                lastAIMessage = messages[i];
                break;
            }
        }
        
        if (!lastAIMessage) {
            showStatus('❌ 找不到AI回复消息', 'error');
            return;
        }
        
        const messageId = lastAIMessage.id.replace('mes_', '');
        const success = insertMediaToMessage(messageId, true);
        
        if (success) {
            showStatus('✅ 测试插入成功！', 'success');
            lastAIMessage.scrollIntoView({ behavior: 'smooth' });
        } else {
            showStatus('❌ 插入失败，请检查配置', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || !config.autoInsert || data.message.is_user) return;
        
        console.log('🤖 AI回复，准备插入媒体...');
        
        // 延迟插入，确保消息完全渲染
        setTimeout(() => {
            insertMediaToMessage(data.message.id, false);
        }, 200);
    }
    
    // 初始化
    async function initialize() {
        console.log('🔧 初始化增强版插件...');
        await loadConfig();
        createSettingsPanel();
        
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
            console.log('✅ 事件监听器已注册');
        }
        
        // 定期清理已插入记录（避免内存泄漏）
        setInterval(() => {
            if (insertedMessages.size > 100) {
                insertedMessages.clear();
                console.log('🧹 清理已插入消息记录');
            }
        }, 60000);
        
        console.log('🎊 增强版URL媒体池插件初始化完成');
        showStatus('✅ 插件加载完成，配置已保存增强', 'success');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
