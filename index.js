// 文件名: script.js
(function() {
    console.log('🖼️ 图片插入插件加载...');

    const extensionName = 'image-inserter';
    const extensionVersion = '1.0.0';
    
    // 默认设置
    let settings = {
        enabled: true,
        autoInsert: true,
        imageUrls: [
            'https://picsum.photos/300/200?1',
            'https://picsum.photos/300/200?2', 
            'https://picsum.photos/300/200?3'
        ]
    };

    // 创建设置面板
    function createSettingsPanel() {
        console.log('创建设置面板...');
        
        // 确保扩展设置区域存在
        let extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            console.error('找不到扩展设置区域');
            return;
        }

        const html = `
            <div class="list-group-item">
                <h5>🖼️ 图片插入插件 v${extensionVersion}</h5>
                <div class="form-group">
                    <label><input type="checkbox" id="${extensionName}-enabled" checked> 启用插件</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="${extensionName}-auto" checked> AI回复自动插入</label>
                </div>
                <div class="form-group">
                    <label>图片URL列表:</label>
                    <textarea class="form-control" id="${extensionName}-urls" rows="3">${settings.imageUrls.join('\n')}</textarea>
                </div>
                <button class="btn btn-sm btn-primary" id="${extensionName}-test">测试插入</button>
                <div id="${extensionName}-status" style="margin-top: 10px;"></div>
            </div>
        `;

        extensionsArea.innerHTML += html;
        
        // 绑定事件
        document.getElementById(`${extensionName}-enabled`).addEventListener('change', function() {
            settings.enabled = this.checked;
        });
        
        document.getElementById(`${extensionName}-auto`).addEventListener('change', function() {
            settings.autoInsert = this.checked;
        });
        
        document.getElementById(`${extensionName}-urls`).addEventListener('input', function() {
            settings.imageUrls = this.value.split('\n').filter(url => url.trim());
        });
        
        document.getElementById(`${extensionName}-test`).addEventListener('click', testInsert);
    }

    // 测试插入功能
    function testInsert() {
        console.log('测试插入...');
        
        // 查找AI消息
        const messages = document.querySelectorAll('.mes');
        let aiMessage = null;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].querySelector('.mes_user')) {
                aiMessage = messages[i];
                break;
            }
        }
        
        if (aiMessage) {
            const messageId = aiMessage.id.replace('mes_', '');
            insertImage(messageId);
            document.getElementById(`${extensionName}-status`).innerHTML = '<span style="color: green;">✅ 插入成功</span>';
        } else {
            document.getElementById(`${extensionName}-status`).innerHTML = '<span style="color: red;">❌ 找不到AI消息</span>';
        }
    }

    // 插入图片
    function insertImage(messageId) {
        if (!settings.enabled || settings.imageUrls.length === 0) return;
        
        const randomUrl = settings.imageUrls[Math.floor(Math.random() * settings.imageUrls.length)];
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        
        if (messageElement) {
            const img = document.createElement('img');
            img.src = randomUrl;
            img.style.maxWidth = '300px';
            img.style.maxHeight = '200px';
            img.style.marginTop = '10px';
            messageElement.appendChild(img);
        }
    }

    // AI回复事件处理
    function handleAIMessage(messageData) {
        if (settings.enabled && settings.autoInsert && !messageData.is_user) {
            setTimeout(() => {
                insertImage(messageData.id);
            }, 500);
        }
    }

    // 初始化
    function init() {
        console.log('初始化插件...');
        createSettingsPanel();
        
        // 监听消息事件
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-created', handleAIMessage);
            console.log('事件监听器已注册');
        }
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
