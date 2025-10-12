// 文件名: index.js - 终极修复版URL媒体池
(function() {
    console.log('🎲 终极修复版URL媒体池插件加载...');
    
    const PLUGIN_NAME = 'url-media-pool-final';
    const PLUGIN_VERSION = '4.0.0';
    
    // 默认配置
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [],
        insertPosition: 'after', // after, before, inline
        imageWidth: '300px',
        imageHeight: 'auto'
    };
    
    let insertedMessages = new Set();
    
    // 创建设置面板
    function createSettingsPanel() {
        normalizeConfig();
        
        const html = `
            <div class="list-group-item">
                <h5>🎲 终极修复版 v${PLUGIN_VERSION}</h5>
                <div id="ump-status-header" style="padding: 8px; border-radius: 5px; margin-bottom: 15px; font-size: 13px;"></div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入</label>
                </div>
                
                <div class="form-group">
                    <label>插入位置:</label>
                    <select class="form-control" id="ump-insert-position">
                        <option value="after" ${config.insertPosition === 'after' ? 'selected' : ''}>回复之后</option>
                        <option value="before" ${config.insertPosition === 'before' ? 'selected' : ''}>回复之前</option>
                        <option value="inline" ${config.insertPosition === 'inline' ? 'selected' : ''}>段落中间</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表 (每行一个):</label>
                    <textarea class="form-control" id="ump-urls" rows="6" style="font-family: monospace; font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success" id="ump-save-urls">💾 保存URL列表</button>
                        <button class="btn btn-sm btn-secondary" id="ump-add-example">添加示例</button>
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
        updateStatusHeader();
    }
    
    // 规范化配置
    function normalizeConfig() {
        if (typeof config.mediaUrls === 'string' || !Array.isArray(config.mediaUrls)) {
            config.mediaUrls = [];
        }
    }
    
    // 绑定事件
    function bindEvents() {
        // 开关
        $('#ump-enabled, #ump-auto-insert').on('change', function() {
            config.enabled = $('#ump-enabled').is(':checked');
            config.autoInsert = $('#ump-auto-insert').is(':checked');
            saveConfig();
            showStatus('✅ 开关状态已保存');
        });
        
        // 插入位置
        $('#ump-insert-position').on('change', function() {
            config.insertPosition = this.value;
            saveConfig();
            showStatus('✅ 插入位置已保存');
        });
        
        // 保存URL按钮
        $('#ump-save-urls').on('click', function() {
            updateUrlList();
            showStatus('✅ URL列表已保存！', 'success');
        });
        
        // 添加示例URL
        $('#ump-add-example').on('click', function() {
            const exampleUrls = [
                'https://picsum.photos/300/200?random=1',
                'https://picsum.photos/300/200?random=2',
                'https://picsum.photos/300/200?random=3'
            ];
            $('#ump-urls').val(exampleUrls.join('\n'));
            updateUrlList();
            showStatus('✅ 已添加示例URL，请点击"保存URL列表"', 'info');
        });
        
        // 尺寸设置
        $('#ump-image-width, #ump-image-height').on('input', debounce(() => {
            config.imageWidth = $('#ump-image-width').val() || '300px';
            config.imageHeight = $('#ump-image-height').val() || 'auto';
            saveConfig();
        }, 500));
        
        // 测试按钮
        $('#ump-test-preview').on('click', testPreview);
        $('#ump-test-insert').on('click', testInsert);
        $('#ump-check-config').on('click', checkConfig);
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
        config.mediaUrls = urlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);
        saveConfig();
        updateStatusHeader();
    }
    
    // 更新状态头
    function updateStatusHeader() {
        const count = config.mediaUrls.length;
        const header = $('#ump-status-header');
        if (count > 0) {
            header.html(`✅ 配置正常 | URL数量: <strong>${count}</strong>`);
            header.css({ background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' });
        } else {
            header.html(`⚠️ 配置异常 | URL数量: <strong>0</strong> (请添加URL并保存)`);
            header.css({ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' });
        }
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = { info: '#17a2b8', success: '#28a745', error: '#dc3545' };
        $('#ump-status').html(`<span style="color: ${colors[type]}; font-weight: bold;">${message}</span>`);
    }
    
    // 保存配置
    function saveConfig() {
        try {
            localStorage.setItem(`st_ext_${PLUGIN_NAME}`, JSON.stringify(config));
            console.log('💾 配置已保存:', config);
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
        }
    }
    
    // 加载配置
    function loadConfig() {
        try {
            const saved = localStorage.getItem(`st_ext_${PLUGIN_NAME}`);
            if (saved) {
                config = { ...config, ...JSON.parse(saved) };
                console.log('✅ 配置已加载:', config);
            }
        } catch (error) {
            console.warn('⚠️ 加载配置失败');
        }
    }
    
    // 检查配置
    function checkConfig() {
        const info = {
            'URL数量': config.mediaUrls.length,
            '前3个URL': config.mediaUrls.slice(0, 3),
            '完整配置': config
        };
        $('#ump-preview').html(`<pre style="font-size: 11px; background: #f0f0f0; padding: 10px;">${JSON.stringify(info, null, 2)}</pre>`);
        showStatus('🔍 配置已显示在下方', 'info');
    }
    
    // 获取随机URL
    function getRandomMediaUrl() {
        if (!config.mediaUrls || config.mediaUrls.length === 0) {
            return null;
        }
        return config.mediaUrls[Math.floor(Math.random() * config.mediaUrls.length)];
    }
    
    // 预览测试
    function testPreview() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 预览失败：URL列表为空', 'error');
            return;
        }
        
        showStatus('🔍 正在加载预览...', 'info');
        const img = new Image();
        img.src = url;
        img.style.maxWidth = '250px';
        img.style.maxHeight = '200px';
        img.style.border = '2px solid #007bff';
        
        img.onload = function() {
            $('#ump-preview').html(img);
            showStatus('✅ 预览加载成功', 'success');
        };
        
        img.onerror = function() {
            $('#ump-preview').html('<p style="color: red;">❌ 图片加载失败</p>');
            showStatus('❌ 预览失败：图片无法加载', 'error');
        };
    }
    
    // 创建媒体元素
    function createMediaElement(url) {
        const img = document.createElement('img');
        img.src = url;
        img.style.width = config.imageWidth;
        img.style.height = config.imageHeight;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.cursor = 'pointer';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        img.onclick = () => window.open(url, '_blank');
        return img;
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId, isTest = false) {
        if (!isTest && insertedMessages.has(messageId)) return false;
        
        const url = getRandomMediaUrl();
        if (!url) {
            console.warn('插入失败：URL列表为空');
            return false;
        }
        
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) return false;
        
        const container = document.createElement('div');
        const mediaElement = createMediaElement(url);
        container.appendChild(mediaElement);
        
        // 插入逻辑
        if (config.insertPosition === 'before') {
            messageElement.prepend(container);
        } else if (config.insertPosition === 'inline') {
            const paragraphs = messageElement.querySelectorAll('p');
            if (paragraphs.length > 1) {
                const midIndex = Math.floor(paragraphs.length / 2);
                paragraphs[midIndex].after(container);
            } else {
                messageElement.append(container);
            }
        } else { // 'after'
            messageElement.append(container);
        }
        
        if (!isTest) insertedMessages.add(messageId);
        return true;
    }
    
    // 测试插入
    function testInsert() {
        const messages = Array.from(document.querySelectorAll('.mes')).reverse();
        const lastAIMessage = messages.find(m => !m.querySelector('.mes_user'));
        
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
        
        console.log('🎊 终极修复版插件初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
