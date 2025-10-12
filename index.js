// 文件名: index.js - 官方标准版
(function() {
    console.log('🖼️ 官方标准图片插件加载...');
    
    // 插件信息
    const extensionName = 'simple-image-insert';
    const extensionVersion = '1.0.0';
    
    // 默认配置
    let settings = {
        enabled: true,
        autoInsert: true,
        imageUrls: [
            'https://picsum.photos/300/200?1',
            'https://picsum.photos/300/200?2',
            'https://picsum.photos/300/200?3'
        ],
        imageWidth: '300px'
    };
    
    // 等待SillyTavern就绪
    async function initializeExtension() {
        console.log('🔧 初始化插件...');
        
        try {
            // 加载保存的设置
            const savedSettings = await SillyTavern.extension.loadSettings(extensionName);
            if (savedSettings) {
                Object.assign(settings, savedSettings);
            }
            
            // 创建设置面板
            createSettingsPanel();
            
            // 注册事件监听器
            registerEventListeners();
            
            console.log('✅ 插件初始化完成');
            
        } catch (error) {
            console.error('❌ 插件初始化失败:', error);
        }
    }
    
    // 创建设置面板
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🖼️ 图片插入插件 v${extensionVersion}</h5>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="${extensionName}-enabled" ${settings.enabled ? 'checked' : ''}>
                        启用插件
                    </label>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="${extensionName}-autoInsert" ${settings.autoInsert ? 'checked' : ''}>
                        AI回复时自动插入图片
                    </label>
                </div>
                
                <div class="form-group">
                    <label>图片URL列表 (每行一个):</label>
                    <textarea class="form-control" id="${extensionName}-urls" rows="4" 
                              style="font-family: monospace; font-size: 12px;">${settings.imageUrls.join('\n')}</textarea>
                </div>
                
                <div class="form-group">
                    <label>图片宽度:</label>
                    <input type="text" class="form-control" id="${extensionName}-width" value="${settings.imageWidth}">
                </div>
                
                <button class="btn btn-sm btn-primary" id="${extensionName}-test">测试插入</button>
                <button class="btn btn-sm btn-secondary" id="${extensionName}-save">保存设置</button>
                
                <div id="${extensionName}-status" style="margin-top: 10px; font-size: 12px; min-height: 20px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        
        // 绑定事件
        $(`#${extensionName}-enabled`).on('change', function() {
            settings.enabled = this.checked;
            showStatus(`插件已${settings.enabled ? '启用' : '禁用'}`);
        });
        
        $(`#${extensionName}-autoInsert`).on('change', function() {
            settings.autoInsert = this.checked;
            showStatus(`自动插入已${settings.autoInsert ? '开启' : '关闭'}`);
        });
        
        $(`#${extensionName}-urls`).on('input', function() {
            settings.imageUrls = this.value.split('\n').filter(url => url.trim());
        });
        
        $(`#${extensionName}-width`).on('input', function() {
            settings.imageWidth = this.value;
        });
        
        $(`#${extensionName}-test`).on('click', testImageInsert);
        $(`#${extensionName}-save`).on('click', saveSettings);
    }
    
    // 显示状态信息
    function showStatus(message, type = 'info') {
        const colors = { info: 'blue', success: 'green', error: 'red' };
        $(`#${extensionName}-status`).html(
            `<span style="color: ${colors[type]};">${message}</span>`
        );
    }
    
    // 保存设置
    async function saveSettings() {
        try {
            await SillyTavern.extension.saveSettings(extensionName, settings);
            showStatus('✅ 设置已保存', 'success');
        } catch (error) {
            showStatus('❌ 保存设置失败', 'error');
        }
    }
    
    // 获取随机图片URL
    function getRandomImageUrl() {
        if (!settings.imageUrls || settings.imageUrls.length === 0) {
            return null;
        }
        return settings.imageUrls[Math.floor(Math.random() * settings.imageUrls.length)];
    }
    
    // 插入图片到消息
    function insertImageToMessage(messageId) {
        if (!settings.enabled) return false;
        
        const imageUrl = getRandomImageUrl();
        if (!imageUrl) {
            showStatus('❌ 没有可用的图片URL', 'error');
            return false;
        }
        
        // 查找消息元素 - 使用官方推荐的选择器
        const messageElement = document.getElementById(`mes_${messageId}`);
        if (!messageElement) {
            console.warn('找不到消息元素:', `mes_${messageId}`);
            return false;
        }
        
        const messageTextElement = messageElement.querySelector('.mes_text');
        if (!messageTextElement) {
            console.warn('找不到消息文本元素');
            return false;
        }
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'AI回复图片';
        img.style.maxWidth = settings.imageWidth;
        img.style.maxHeight = '200px';
        img.style.borderRadius = '5px';
        img.style.marginTop = '10px';
        img.style.display = 'block';
        
        // 插入到消息中
        messageTextElement.appendChild(img);
        
        console.log('✅ 图片插入成功:', imageUrl);
        return true;
    }
    
    // 测试插入
    function testImageInsert() {
        // 查找最新的AI消息
        const messages = document.querySelectorAll('.mes');
        let lastAIMessage = null;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            // AI消息没有 .mes_user 类
            if (!message.querySelector('.mes_user')) {
                lastAIMessage = message;
                break;
            }
        }
        
        if (!lastAIMessage) {
            showStatus('❌ 找不到AI回复消息', 'error');
            return;
        }
        
        const messageId = lastAIMessage.id.replace('mes_', '');
        const success = insertImageToMessage(messageId);
        
        if (success) {
            showStatus('✅ 测试插入成功！', 'success');
            // 滚动到消息
            lastAIMessage.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // 注册事件监听器
    function registerEventListeners() {
        // 官方推荐的事件监听方式
        if (SillyTavern && SillyTavern.events) {
            // 监听消息渲染完成事件
            SillyTavern.events.on('message-created', onMessageCreated);
            SillyTavern.events.on('message-swiped', onMessageSwiped);
            
            console.log('✅ 事件监听器注册成功');
        } else {
            console.warn('⚠️ SillyTavern事件系统不可用');
        }
    }
    
    // 消息创建事件处理
    function onMessageCreated(event, data) {
        if (!settings.enabled || !settings.autoInsert) return;
        if (data.is_user) return; // 跳过用户消息
        
        console.log('🤖 AI消息创建:', data.id);
        
        // 延迟插入，确保消息完全渲染
        setTimeout(() => {
            insertImageToMessage(data.id);
        }, 100);
    }
    
    // 消息滑动事件处理（用于重新插入图片）
    function onMessageSwiped(event, data) {
        if (!settings.enabled || !settings.autoInsert) return;
        if (data.is_user) return;
        
        console.log('🔄 消息滑动:', data.id);
        
        setTimeout(() => {
            insertImageToMessage(data.id);
        }, 100);
    }
    
    // 启动插件
    if (typeof SillyTavern !== 'undefined') {
        // SillyTavern已加载，直接初始化
        initializeExtension();
    } else {
        // 等待SillyTavern加载
        document.addEventListener('SillyTavernLoaded', initializeExtension);
    }
    
})();
