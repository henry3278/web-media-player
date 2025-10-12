// 文件名: index.js - 终极修复版 v5.0
(function() {
    console.log('🎲 终极修复版 v5.0 加载...');
    
    const PLUGIN_NAME = 'url-media-pool-final-v5';
    
    // 这是一个全局的、唯一的配置对象
    let config = {};
    
    // 1. 绝对可靠的配置加载函数
    function loadConfig() {
        try {
            const saved = localStorage.getItem(PLUGIN_NAME);
            if (saved) {
                config = JSON.parse(saved);
                console.log('✅ 配置已从localStorage加载:', config);
            } else {
                // 如果没有保存的配置，则使用默认值
                config = {
                    enabled: true,
                    autoInsert: true,
                    mediaUrls: ['https://picsum.photos/300/200?v5=1'],
                    insertPosition: 'after',
                    imageWidth: '300px',
                    imageHeight: 'auto'
                };
                console.log('⚠️ 未找到保存的配置，使用默认值');
            }
        } catch (error) {
            console.error('❌ 加载配置失败:', error);
        }
    }
    
    // 2. 绝对可靠的配置保存函数
    function saveConfig() {
        try {
            localStorage.setItem(PLUGIN_NAME, JSON.stringify(config));
            console.log('💾 配置已保存到localStorage:', config);
            updateStatusHeader(); // 保存后立即更新状态
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
        }
    }
    
    // 创建设置面板
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🎲 终极修复版 v5.0</h5>
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
                        <button class="btn btn-sm btn-success" id="ump-save-urls">💾 保存URL列表 (最重要的一步)</button>
                        <button class="btn btn-sm btn-secondary" id="ump-add-example">添加示例</button>
                    </div>
                </div>
                
                <div class="btn-group mt-3 w-100">
                    <button class="btn btn-sm btn-primary" id="ump-test-preview">👀 预览测试</button>
                    <button class="btn btn-sm btn-success" id="ump-test-insert">➕ 测试插入</button>
                </div>
                
                <div id="ump-status" style="margin-top: 15px; padding: 10px; border-radius: 5px; background: #f8f9fa; font-size: 13px;"></div>
                <div id="ump-preview" style="margin-top: 10px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        updateStatusHeader();
    }
    
    // 绑定事件
    function bindEvents() {
        // 开关
        $('#ump-enabled, #ump-auto-insert').on('change', function() {
            loadConfig(); // 确保基于最新配置修改
            config.enabled = $('#ump-enabled').is(':checked');
            config.autoInsert = $('#ump-auto-insert').is(':checked');
            saveConfig();
            showStatus('✅ 开关状态已保存');
        });
        
        // 插入位置
        $('#ump-insert-position').on('change', function() {
            loadConfig();
            config.insertPosition = this.value;
            saveConfig();
            showStatus('✅ 插入位置已保存');
        });
        
        // 保存URL按钮
        $('#ump-save-urls').on('click', function() {
            loadConfig();
            const urlsText = $('#ump-urls').val();
            config.mediaUrls = urlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);
            saveConfig();
            showStatus(`✅ URL列表已保存！共 ${config.mediaUrls.length} 个。`, 'success');
        });
        
        // 添加示例URL
        $('#ump-add-example').on('click', function() {
            const exampleUrls = [
                'https://picsum.photos/300/200?random=1',
                'https://picsum.photos/300/200?random=2',
                'https://picsum.photos/300/200?random=3'
            ];
            $('#ump-urls').val(exampleUrls.join('\n'));
            showStatus('已添加示例URL，请点击"保存URL列表"', 'info');
        });
        
        // 测试按钮
        $('#ump-test-preview').on('click', testPreview);
        $('#ump-test-insert').on('click', testInsert);
    }
    
    // 更新状态头
    function updateStatusHeader() {
        loadConfig(); // 确保显示的是最新的状态
        const count = config.mediaUrls ? config.mediaUrls.length : 0;
        const header = $('#ump-status-header');
        if (count > 0) {
            header.html(`✅ 配置正常 | URL数量: <strong>${count}</strong>`);
            header.css({ background: '#d4edda', color: '#155724' });
        } else {
            header.html(`⚠️ 配置异常 | URL数量: <strong>0</strong> (请添加URL并保存)`);
            header.css({ background: '#f8d7da', color: '#721c24' });
        }
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = { info: '#17a2b8', success: '#28a745', error: '#dc3545' };
        $('#ump-status').html(`<span style="color: ${colors[type]}; font-weight: bold;">${message}</span>`);
    }
    
    // 获取随机URL
    function getRandomMediaUrl() {
        loadConfig(); // 每次获取前都重新加载配置
        if (!config.mediaUrls || config.mediaUrls.length === 0) {
            console.warn('❌ 媒体URL列表为空');
            return null;
        }
        return config.mediaUrls[Math.floor(Math.random() * config.mediaUrls.length)];
    }
    
    // 预览测试
    function testPreview() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 预览失败：URL列表为空。请添加URL并点击保存。', 'error');
            return;
        }
        
        showStatus('🔍 正在加载预览...', 'info');
        const img = new Image();
        img.src = url;
        img.style.maxWidth = '250px';
        img.style.border = '2px solid #007bff';
        
        img.onload = () => {
            $('#ump-preview').html(img);
            showStatus('✅ 预览加载成功', 'success');
        };
        
        img.onerror = () => {
            $('#ump-preview').html('<p style="color: red;">❌ 图片加载失败</p>');
            showStatus('❌ 预览失败：图片无法加载，请检查URL', 'error');
        };
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId, isTest = false) {
        const url = getRandomMediaUrl();
        if (!url) {
            console.warn('插入失败：URL列表为空');
            return false;
        }
        
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) return false;
        
        const container = document.createElement('div');
        container.innerHTML = `<img src="${url}" style="max-width: 100%; width: ${config.imageWidth}; height: ${config.imageHeight}; border-radius: 8px; margin: 10px auto; display: block;">`;
        
        // 插入逻辑
        if (config.insertPosition === 'before') {
            messageElement.prepend(container);
        } else if (config.insertPosition === 'inline') {
            const paragraphs = messageElement.querySelectorAll('p');
            if (paragraphs.length > 1) {
                paragraphs[Math.floor(paragraphs.length / 2)].after(container);
            } else {
                messageElement.append(container);
            }
        } else { // 'after'
            messageElement.append(container);
        }
        
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
            showStatus('❌ 插入失败，请确保已保存URL列表', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        loadConfig(); // 确保使用最新配置
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
    initialize();
})();
