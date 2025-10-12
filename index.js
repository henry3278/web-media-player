// 文件名: index.js - 稳定版URL媒体池插件
(function() {
    console.log('🎲 稳定版URL媒体池插件加载...');
    
    const PLUGIN_NAME = 'url-media-pool';
    const PLUGIN_VERSION = '2.1.0';
    
    // 默认配置（包含示例URL确保有内容）
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [
            'https://picsum.photos/300/200',
            'https://picsum.photos/300/201',
            'https://picsum.photos/300/202'
        ],
        mediaType: 'mixed',
        insertPosition: 'inline', // after, before, inline, random
        imageWidth: '300px',
        imageHeight: 'auto',
        videoWidth: '400px',
        videoHeight: '225px'
    };
    
    let insertedMessages = new Set();
    
    // 创建设置面板
    function createSettingsPanel() {
        normalizeConfig();
        
        const html = `
            <div class="list-group-item">
                <h5>🎲 稳定版URL媒体池 v${PLUGIN_VERSION}</h5>
                <div style="color: #666; font-size: 12px; margin-bottom: 10px;">
                    状态: <span id="ump-config-status" style="color: green;">✅ 已加载</span> | 
                    URL数量: <span id="ump-url-count">${config.mediaUrls.length}</span>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入媒体</label>
                </div>
                
                <div class="form-group">
                    <label>媒体类型:</label>
                    <select class="form-control" id="ump-media-type">
                        <option value="mixed" ${config.mediaType === 'mixed' ? 'selected' : ''}>混合模式</option>
                        <option value="image-only" ${config.mediaType === 'image-only' ? 'selected' : ''}>仅图片</option>
                        <option value="video-only" ${config.mediaType === 'video-only' ? 'selected' : ''}>仅视频</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>插入位置:</label>
                    <select class="form-control" id="ump-insert-position">
                        <option value="after" ${config.insertPosition === 'after' ? 'selected' : ''}>回复之后（单独段落）</option>
                        <option value="before" ${config.insertPosition === 'before' ? 'selected' : ''}>回复之前（单独段落）</option>
                        <option value="inline" ${config.insertPosition === 'inline' ? 'selected' : ''}>段落中（内嵌显示）</option>
                        <option value="random" ${config.insertPosition === 'random' ? 'selected' : ''}>随机位置</option>
                    </select>
                    <small class="form-text text-muted">"段落中"模式将图片插入到文本中间</small>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表:</label>
                    <textarea class="form-control" id="ump-urls" rows="6" placeholder="每行一个URL&#10;https://example.com/image.jpg&#10;https://example.com/video.mp4" style="font-family: monospace; font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                    <div class="mt-1">
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="addExampleUrls()">添加示例</button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearUrls()">清空</button>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <label>图片宽度:</label>
                        <input type="text" class="form-control" id="ump-image-width" value="${config.imageWidth}">
                    </div>
                    <div class="col-6">
                        <label>图片高度:</label>
                        <input type="text" class="form-control" id="ump-image-height" value="${config.imageHeight}">
                    </div>
                </div>
                
                <div class="row mt-2">
                    <div class="col-6">
                        <label>视频宽度:</label>
                        <input type="text" class="form-control" id="ump-video-width" value="${config.videoWidth}">
                    </div>
                    <div class="col-6">
                        <label>视频高度:</label>
                        <input type="text" class="form-control" id="ump-video-height" value="${config.videoHeight}">
                    </div>
                </div>
                
                <div class="btn-group mt-3 w-100">
                    <button class="btn btn-sm btn-primary" id="ump-test-random">🎲 测试随机</button>
                    <button class="btn btn-sm btn-success" id="ump-test-insert">➕ 测试插入</button>
                    <button class="btn btn-sm btn-info" id="ump-debug">🐛 调试</button>
                </div>
                
                <div id="ump-status" style="margin-top: 10px; min-height: 20px; font-size: 12px;"></div>
                <div id="ump-preview" style="margin-top: 10px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        updateUrlCount();
    }
    
    // 规范化配置
    function normalizeConfig() {
        if (typeof config.mediaUrls === 'string') {
            config.mediaUrls = config.mediaUrls.split('\n').filter(url => url.trim());
        }
        if (!Array.isArray(config.mediaUrls)) {
            config.mediaUrls = [];
        }
        // 确保至少有示例URL
        if (config.mediaUrls.length === 0) {
            config.mediaUrls = [
                'https://picsum.photos/300/200',
                'https://picsum.photos/300/201',
                'https://picsum.photos/300/202'
            ];
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
            showStatus(`媒体类型: ${this.options[this.selectedIndex].text}`);
        });
        
        // 插入位置
        $('#ump-insert-position').on('change', function() {
            config.insertPosition = this.value;
            saveConfig();
            showStatus(`插入位置: ${this.options[this.selectedIndex].text}`);
        });
        
        // URL列表
        $('#ump-urls').on('input', debounce(() => {
            updateUrlList();
        }, 800));
        
        // 尺寸设置
        $('#ump-image-width, #ump-image-height, #ump-video-width, #ump-video-height').on('input', debounce(() => {
            config.imageWidth = $('#ump-image-width').val() || '300px';
            config.imageHeight = $('#ump-image-height').val() || 'auto';
            config.videoWidth = $('#ump-video-width').val() || '400px';
            config.videoHeight = $('#ump-video-height').val() || '225px';
            saveConfig();
        }, 500));
        
        // 测试按钮
        $('#ump-test-random').on('click', testRandomSelection);
        $('#ump-test-insert').on('click', testInsert);
        $('#ump-debug').on('click', showDebugInfo);
        
        // 全局函数
        window.addExampleUrls = function() {
            const exampleUrls = [
                'https://picsum.photos/300/200',
                'https://picsum.photos/300/201',
                'https://picsum.photos/300/202',
                'https://picsum.photos/300/203',
                'https://picsum.photos/300/204'
            ];
            $('#ump-urls').val(exampleUrls.join('\n'));
            updateUrlList();
            showStatus('✅ 已添加示例URL');
        };
        
        window.clearUrls = function() {
            if (confirm('确定要清空URL列表吗？')) {
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
            .filter(url => url.length > 0);
        saveConfig();
        updateUrlCount();
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = { info: 'blue', success: 'green', error: 'red' };
        $('#ump-status').html(`<span style="color: ${colors[type]};">${message}</span>`);
    }
    
    // 更新URL计数
    function updateUrlCount() {
        const count = config.mediaUrls.length;
        $('#ump-url-count').text(count);
        $('#ump-config-status').css('color', count > 0 ? 'green' : 'red');
    }
    
    // 保存配置（简化版）
    function saveConfig() {
        try {
            console.log('💾 保存配置:', config);
            // 使用localStorage确保可靠保存
            localStorage.setItem(`st-extension-${PLUGIN_NAME}`, JSON.stringify(config));
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
    
    // 加载配置（简化版）
    function loadConfig() {
        try {
            const saved = localStorage.getItem(`st-extension-${PLUGIN_NAME}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                console.log('✅ 配置加载成功');
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置');
        }
    }
    
    // 显示调试信息
    function showDebugInfo() {
        const info = {
            'URL数量': config.mediaUrls.length,
            '前3个URL': config.mediaUrls.slice(0, 3),
            '配置': config
        };
        
        $('#ump-preview').html(`
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 11px;">
                <strong>调试信息:</strong><br>
                ${JSON.stringify(info, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}
            </div>
        `);
    }
    
    // 判断URL类型
    function isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
    }
    
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url);
    }
    
    // 获取过滤后的URL
    function getFilteredUrls() {
        let urls = config.mediaUrls;
        
        switch (config.mediaType) {
            case 'image-only':
                urls = urls.filter(isImageUrl);
                break;
            case 'video-only':
                urls = urls.filter(isVideoUrl);
                break;
        }
        
        return urls;
    }
    
    // 随机选择URL
    function getRandomMediaUrl() {
        const urls = getFilteredUrls();
        return urls.length > 0 ? urls[Math.floor(Math.random() * urls.length)] : null;
    }
    
    // 测试随机选择
    function testRandomSelection() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 没有可用的媒体URL', 'error');
            return;
        }
        
        const isVideo = isVideoUrl(url);
        showStatus(`✅ 随机选择: ${url.substring(0, 50)}...`, 'success');
        
        // 显示预览（确保图片显示）
        const previewHtml = `
            <div style="border: 2px solid #4CAF50; padding: 10px; margin-top: 10px; border-radius: 5px;">
                <p><strong>🎲 随机选择预览</strong></p>
                ${isVideo ? 
                    `<video src="${url}" controls style="width: 200px; height: 150px; background: #000;"></video>` :
                    `<img src="${url}" style="max-width: 200px; max-height: 150px; border: 1px solid #ccc;" 
                         onload="console.log('图片加载成功')" 
                         onerror="console.log('图片加载失败')">`
                }
                <p style="word-break: break-all; font-size: 10px; margin: 5px 0;">${url}</p>
            </div>
        `;
        
        $('#ump-preview').html(previewHtml);
    }
    
    // 创建媒体元素
    function createMediaElement(url) {
        const isVideo = isVideoUrl(url);
        const element = isVideo ? document.createElement('video') : document.createElement('img');
        
        element.src = url;
        
        if (isVideo) {
            element.style.width = config.videoWidth;
            element.style.height = config.videoHeight;
            element.controls = true;
            element.muted = true;
            element.style.background = '#000';
        } else {
            element.style.width = config.imageWidth;
            element.style.height = config.imageHeight;
            element.style.objectFit = 'contain';
        }
        
        element.style.borderRadius = '5px';
        element.style.border = '1px solid #ddd';
        element.style.cursor = 'pointer';
        element.style.display = 'block';
        element.style.margin = '5px auto';
        
        element.onclick = () => window.open(url, '_blank');
        element.onerror = function() {
            console.error('媒体加载失败:', url);
            this.style.opacity = '0.3';
            this.style.borderColor = 'red';
        };
        
        return element;
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId, isTest = false) {
        if (!isTest && insertedMessages.has(messageId)) {
            return false;
        }
        
        const url = getRandomMediaUrl();
        if (!url) {
            console.warn('插入失败：没有可用的URL');
            return false;
        }
        
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) {
            console.warn('插入失败：找不到消息元素');
            return false;
        }
        
        const container = document.createElement('div');
        container.className = 'media-insert';
        
        if (isTest) {
            container.style.borderLeft = '3px solid #4CAF50';
            container.style.paddingLeft = '10px';
        }
        
        const mediaElement = createMediaElement(url);
        container.appendChild(mediaElement);
        
        // 根据插入位置决定插入方式
        const textContent = messageElement.textContent || '';
        const paragraphs = textContent.split('\n').filter(p => p.trim());
        
        if (config.insertPosition === 'inline' && paragraphs.length > 1) {
            // 段落中插入：在中间段落插入
            const insertIndex = Math.floor(paragraphs.length / 2);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = messageElement.innerHTML;
            
            // 找到第insertIndex个段落的位置插入
            let currentIndex = 0;
            let inserted = false;
            
            for (const node of tempDiv.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    currentIndex++;
                    if (currentIndex === insertIndex) {
                        const mediaContainer = container.cloneNode(true);
                        mediaContainer.style.margin = '10px 0';
                        tempDiv.insertBefore(mediaContainer, node.nextSibling);
                        inserted = true;
                        break;
                    }
                }
            }
            
            if (inserted) {
                messageElement.innerHTML = tempDiv.innerHTML;
            } else {
                // 备用：插入到末尾
                messageElement.appendChild(container);
            }
        } else if (config.insertPosition === 'before') {
            messageElement.insertBefore(container, messageElement.firstChild);
        } else if (config.insertPosition === 'random' && Math.random() > 0.5) {
            messageElement.insertBefore(container, messageElement.firstChild);
        } else {
            messageElement.appendChild(container);
        }
        
        if (!isTest) {
            insertedMessages.add(messageId);
        }
        
        console.log('✅ 媒体插入成功');
        return true;
    }
    
    // 测试插入
    function testInsert() {
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
            showStatus('❌ 插入失败，请检查URL配置', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || !config.autoInsert || data.message.is_user) return;
        
        setTimeout(() => {
            insertMediaToMessage(data.message.id, false);
        }, 300);
    }
    
    // 初始化
    function initialize() {
        loadConfig();
        createSettingsPanel();
        
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
        }
        
        // 清理过期记录
        setInterval(() => {
            if (insertedMessages.size > 50) {
                const array = Array.from(insertedMessages);
                insertedMessages = new Set(array.slice(-30));
            }
        }, 30000);
        
        console.log('✅ 稳定版插件初始化完成');
        showStatus('✅ 插件已就绪，请测试功能', 'success');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
