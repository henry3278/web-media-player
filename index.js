// 文件名: index.js - 终极稳定版URL媒体池插件
(function() {
    console.log('🎲 终极稳定版URL媒体池插件加载...');
    
    const PLUGIN_NAME = 'url-media-pool';
    const PLUGIN_VERSION = '3.0.0';
    
    // 默认配置 - 确保有可用的测试URL
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [
            'https://picsum.photos/300/200?random=1',
            'https://picsum.photos/300/200?random=2',
            'https://picsum.photos/300/200?random=3'
        ],
        mediaType: 'mixed',
        insertPosition: 'after',
        imageWidth: '300px',
        imageHeight: 'auto'
    };
    
    let insertedMessages = new Set();
    
    // 创建设置面板
    function createSettingsPanel() {
        // 确保配置正确
        normalizeConfig();
        
        const html = `
            <div class="list-group-item">
                <h5>🎲 终极稳定版URL媒体池 v${PLUGIN_VERSION}</h5>
                <div style="color: #28a745; font-size: 12px; margin-bottom: 15px;">
                    ✅ 插件已加载 | URL数量: <strong id="ump-url-count">${config.mediaUrls.length}</strong>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入媒体</label>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表 (每行一个URL):</label>
                    <textarea class="form-control" id="ump-urls" rows="6" style="font-family: monospace; font-size: 12px; border: 1px solid #ccc;">${config.mediaUrls.join('\n')}</textarea>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success" id="ump-save-urls">💾 保存URL列表</button>
                        <button class="btn btn-sm btn-secondary" id="ump-add-example">添加示例URL</button>
                        <button class="btn btn-sm btn-outline-danger" id="ump-clear-urls">清空</button>
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
                
                <div class="btn-group mt-3 w-100">
                    <button class="btn btn-sm btn-primary" id="ump-test-preview">👀 预览测试</button>
                    <button class="btn btn-sm btn-success" id="ump-test-insert">➕ 测试插入</button>
                    <button class="btn btn-sm btn-info" id="ump-check-config">🔍 检查配置</button>
                </div>
                
                <div id="ump-status" style="margin-top: 15px; padding: 10px; border-radius: 5px; background: #f8f9fa; font-size: 13px;"></div>
                <div id="ump-preview" style="margin-top: 10px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        showStatus('✅ 插件初始化完成，可以开始测试', 'success');
    }
    
    // 规范化配置
    function normalizeConfig() {
        if (typeof config.mediaUrls === 'string') {
            config.mediaUrls = config.mediaUrls.split('\n').filter(url => url.trim().length > 0);
        }
        if (!Array.isArray(config.mediaUrls)) {
            config.mediaUrls = [];
        }
        // 确保至少有测试URL
        if (config.mediaUrls.length === 0) {
            config.mediaUrls = [
                'https://picsum.photos/300/200?random=1',
                'https://picsum.photos/300/200?random=2', 
                'https://picsum.photos/300/200?random=3'
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
        
        // 保存URL按钮
        $('#ump-save-urls').on('click', function() {
            updateUrlList();
            showStatus('✅ URL列表已保存', 'success');
        });
        
        // 添加示例URL
        $('#ump-add-example').on('click', function() {
            const exampleUrls = [
                'https://picsum.photos/300/200?random=1',
                'https://picsum.photos/300/200?random=2',
                'https://picsum.photos/300/200?random=3',
                'https://picsum.photos/300/200?random=4',
                'https://picsum.photos/300/200?random=5'
            ];
            $('#ump-urls').val(exampleUrls.join('\n'));
            updateUrlList();
            showStatus('✅ 已添加示例URL', 'success');
        });
        
        // 清空URL
        $('#ump-clear-urls').on('click', function() {
            if (confirm('确定要清空URL列表吗？')) {
                $('#ump-urls').val('');
                updateUrlList();
                showStatus('🗑️ URL列表已清空', 'info');
            }
        });
        
        // 尺寸设置
        $('#ump-image-width, #ump-image-height').on('input', function() {
            config.imageWidth = $('#ump-image-width').val() || '300px';
            config.imageHeight = $('#ump-image-height').val() || 'auto';
            saveConfig();
        });
        
        // 预览测试
        $('#ump-test-preview').on('click', testPreview);
        
        // 测试插入
        $('#ump-test-insert').on('click', testInsert);
        
        // 检查配置
        $('#ump-check-config').on('click', checkConfig);
    }
    
    // 更新URL列表
    function updateUrlList() {
        try {
            const urlsText = $('#ump-urls').val();
            const urls = urlsText.split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);
            
            config.mediaUrls = urls;
            saveConfig();
            updateUrlCount();
            
            console.log('📝 URL列表更新:', urls);
            return true;
        } catch (error) {
            console.error('更新URL列表失败:', error);
            return false;
        }
    }
    
    // 更新URL计数
    function updateUrlCount() {
        const count = config.mediaUrls.length;
        $('#ump-url-count').text(count);
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = {
            info: '#17a2b8',
            success: '#28a745', 
            error: '#dc3545',
            warning: '#ffc107'
        };
        $('#ump-status').html(`<span style="color: ${colors[type]}; font-weight: bold;">${message}</span>`);
    }
    
    // 保存配置
    function saveConfig() {
        try {
            console.log('💾 保存配置:', config);
            // 使用可靠的localStorage
            localStorage.setItem(`st_ext_${PLUGIN_NAME}`, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            showStatus('❌ 配置保存失败', 'error');
            return false;
        }
    }
    
    // 加载配置
    function loadConfig() {
        try {
            console.log('🔍 加载配置...');
            const saved = localStorage.getItem(`st_ext_${PLUGIN_NAME}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                console.log('✅ 配置加载成功:', config);
                return true;
            }
        } catch (error) {
            console.warn('⚠️ 加载配置失败，使用默认配置');
        }
        return false;
    }
    
    // 检查配置
    function checkConfig() {
        const info = {
            'URL数量': config.mediaUrls.length,
            '启用状态': config.enabled,
            '自动插入': config.autoInsert,
            '前3个URL': config.mediaUrls.slice(0, 3)
        };
        
        showStatus(`配置检查: ${info.URL数量}个URL, 启用:${info.启用状态}, 自动插入:${info.自动插入}`, 'info');
        
        $('#ump-preview').html(`
            <div style="background: #e9ecef; padding: 10px; border-radius: 5px; font-size: 12px;">
                <strong>配置详情:</strong><br>
                <pre style="margin: 5px 0;">${JSON.stringify(info, null, 2)}</pre>
            </div>
        `);
    }
    
    // 获取随机URL
    function getRandomMediaUrl() {
        if (!config.mediaUrls || config.mediaUrls.length === 0) {
            console.warn('❌ 媒体URL列表为空');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * config.mediaUrls.length);
        const url = config.mediaUrls[randomIndex];
        console.log('🎲 随机选择URL:', url);
        return url;
    }
    
    // 预览测试
    function testPreview() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 没有可用的URL，请先添加URL', 'error');
            return;
        }
        
        showStatus(`🔍 测试URL: ${url}`, 'info');
        
        // 创建图片元素并确保加载
        const img = new Image();
        img.src = url;
        img.style.maxWidth = '250px';
        img.style.maxHeight = '200px';
        img.style.border = '2px solid #007bff';
        img.style.borderRadius = '5px';
        img.style.margin = '5px';
        
        img.onload = function() {
            console.log('✅ 图片加载成功');
            $('#ump-preview').html(`
                <div style="border: 2px solid #28a745; padding: 15px; border-radius: 5px; text-align: center;">
                    <p style="color: #28a745; font-weight: bold;">✅ 预览测试成功</p>
                    <div>${img.outerHTML}</div>
                    <p style="word-break: break-all; font-size: 11px; margin: 10px 0; color: #666;">${url}</p>
                </div>
            `);
            showStatus('✅ 图片预览加载成功', 'success');
        };
        
        img.onerror = function() {
            console.error('❌ 图片加载失败');
            $('#ump-preview').html(`
                <div style="border: 2px solid #dc3545; padding: 15px; border-radius: 5px; text-align: center;">
                    <p style="color: #dc3545; font-weight: bold;">❌ 预览测试失败</p>
                    <div style="width: 250px; height: 200px; background: #f8d7da; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                        <span style="color: #721c24;">图片加载失败</span>
                    </div>
                    <p style="word-break: break-all; font-size: 11px; margin: 10px 0; color: #666;">${url}</p>
                </div>
            `);
            showStatus('❌ 图片加载失败，请检查URL', 'error');
        };
    }
    
    // 创建媒体元素
    function createMediaElement(url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'AI回复图片';
        img.style.width = config.imageWidth;
        img.style.height = config.imageHeight;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.border = '2px solid #dee2e6';
        img.style.cursor = 'pointer';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        
        img.onclick = function() {
            window.open(url, '_blank');
        };
        
        img.onerror = function() {
            console.error('❌ 媒体元素加载失败:', url);
            this.style.opacity = '0.5';
            this.style.borderColor = '#dc3545';
            this.title = '图片加载失败';
        };
        
        return img;
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId, isTest = false) {
        console.log('📝 开始插入媒体到消息:', messageId);
        
        // 检查是否已插入
        if (!isTest && insertedMessages.has(messageId)) {
            console.log('⏩ 跳过已插入的消息');
            return false;
        }
        
        // 获取随机URL
        const url = getRandomMediaUrl();
        if (!url) {
            console.warn('❌ 插入失败：没有可用的URL');
            return false;
        }
        
        // 查找消息元素
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) {
            console.warn('❌ 插入失败：找不到消息元素');
            return false;
        }
        
        // 创建容器和媒体元素
        const container = document.createElement('div');
        container.className = 'media-insert-container';
        container.style.marginTop = '15px';
        container.style.textAlign = 'center';
        
        if (isTest) {
            container.style.borderLeft = '3px solid #28a745';
            container.style.paddingLeft = '10px';
        }
        
        const mediaElement = createMediaElement(url);
        container.appendChild(mediaElement);
        
        // 插入到消息中
        messageElement.appendChild(container);
        
        // 标记为已插入
        if (!isTest) {
            insertedMessages.add(messageId);
        }
        
        console.log('✅ 媒体插入成功');
        return true;
    }
    
    // 测试插入
    function testInsert() {
        console.log('🧪 开始测试插入...');
        
        // 查找最新的AI消息
        const messages = document.querySelectorAll('.mes');
        let lastAIMessage = null;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (!message.querySelector('.mes_user')) {
                lastAIMessage = message;
                break;
            }
        }
        
        if (!lastAIMessage) {
            showStatus('❌ 找不到AI回复消息，请先让AI回复一条消息', 'error');
            return;
        }
        
        const messageId = lastAIMessage.id.replace('mes_', '');
        console.log('找到AI消息:', messageId);
        
        const success = insertMediaToMessage(messageId, true);
        
        if (success) {
            showStatus('✅ 测试插入成功！已在AI回复后添加图片', 'success');
            // 滚动到消息位置
            lastAIMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showStatus('❌ 插入失败，请检查URL配置和网络连接', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || !config.autoInsert || data.message.is_user) {
            return;
        }
        
        console.log('🤖 AI回复事件触发:', data.message.id);
        
        // 延迟插入确保消息完全渲染
        setTimeout(() => {
            insertMediaToMessage(data.message.id, false);
        }, 500);
    }
    
    // 初始化
    function initialize() {
        console.log('🔧 初始化插件...');
        
        // 加载配置
        loadConfig();
        
        // 创建设置面板
        createSettingsPanel();
        
        // 注册事件监听
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
            console.log('✅ 事件监听器已注册');
        }
        
        console.log('🎊 插件初始化完成');
    }
    
    // 启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
