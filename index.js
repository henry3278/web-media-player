(function() {
    console.log('🖼️ Image Inserter extension loading...');

    const EXTENSION_NAME = 'image-inserter';
    
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

    // 等待SillyTavern环境就绪
    function waitForSillyTavern() {
        return new Promise((resolve) => {
            if (window.SillyTavern) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.SillyTavern) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    // 创建设置面板
    function createSettingsPanel() {
        console.log('Creating settings panel...');
        
        const extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            console.error('Extensions settings area not found');
            return;
        }

        const html = `
            <div class="list-group-item">
                <h5>🖼️ Image Inserter</h5>
                <div class="form-group">
                    <label><input type="checkbox" id="${EXTENSION_NAME}-enabled" ${settings.enabled ? 'checked' : ''}> Enable extension</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="${EXTENSION_NAME}-auto" ${settings.autoInsert ? 'checked' : ''}> Auto-insert on AI response</label>
                </div>
                <div class="form-group">
                    <label>Image URLs (one per line):</label>
                    <textarea class="form-control" id="${EXTENSION_NAME}-urls" rows="3" placeholder="https://example.com/image.jpg">${settings.imageUrls.join('\n')}</textarea>
                </div>
                <button class="btn btn-sm btn-primary" id="${EXTENSION_NAME}-test">Test Insert</button>
                <div id="${EXTENSION_NAME}-status" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
        `;

        extensionsArea.insertAdjacentHTML('beforeend', html);
        
        // 绑定事件
        document.getElementById(`${EXTENSION_NAME}-enabled`).addEventListener('change', function() {
            settings.enabled = this.checked;
            saveSettings();
        });
        
        document.getElementById(`${EXTENSION_NAME}-auto`).addEventListener('change', function() {
            settings.autoInsert = this.checked;
            saveSettings();
        });
        
        document.getElementById(`${EXTENSION_NAME}-urls`).addEventListener('input', function() {
            settings.imageUrls = this.value.split('\n').filter(url => url.trim());
            saveSettings();
        });
        
        document.getElementById(`${EXTENSION_NAME}-test`).addEventListener('click', testInsert);
    }

    // 保存设置
    async function saveSettings() {
        try {
            await SillyTavern.extension.saveSettings(EXTENSION_NAME, settings);
            console.log('Settings saved');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // 加载设置
    async function loadSettings() {
        try {
            const saved = await SillyTavern.extension.loadSettings(EXTENSION_NAME);
            if (saved) {
                settings = { ...settings, ...saved };
                console.log('Settings loaded:', settings);
            }
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
        }
    }

    // 测试插入
    function testInsert() {
        console.log('Testing insert...');
        
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
            showStatus('✅ Insert successful', 'success');
        } else {
            showStatus('❌ No AI message found', 'error');
        }
    }

    // 显示状态
    function showStatus(message, type = 'info') {
        const statusEl = document.getElementById(`${EXTENSION_NAME}-status`);
        const colors = { info: 'blue', success: 'green', error: 'red' };
        statusEl.innerHTML = `<span style="color: ${colors[type]};">${message}</span>`;
    }

    // 插入图片
    function insertImage(messageId) {
        if (!settings.enabled || !settings.imageUrls.length) return false;
        
        const randomUrl = settings.imageUrls[Math.floor(Math.random() * settings.imageUrls.length)];
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        
        if (!messageElement) {
            console.warn('Message element not found');
            return false;
        }
        
        const img = document.createElement('img');
        img.src = randomUrl;
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.marginTop = '10px';
        img.style.borderRadius = '5px';
        
        messageElement.appendChild(img);
        console.log('Image inserted:', randomUrl);
        return true;
    }

    // AI消息事件处理
    function onMessageCreated(event, data) {
        if (!settings.enabled || !settings.autoInsert || data.is_user) return;
        
        console.log('AI message created:', data.id);
        
        setTimeout(() => {
            insertImage(data.id);
        }, 300);
    }

    // 初始化扩展
    async function initializeExtension() {
        try {
            await waitForSillyTavern();
            console.log('SillyTavern environment ready');
            
            await loadSettings();
            createSettingsPanel();
            
            // 注册事件监听
            if (SillyTavern.events) {
                SillyTavern.events.on('message-created', onMessageCreated);
                console.log('Event listeners registered');
            }
            
            console.log('🖼️ Image Inserter extension loaded successfully');
            
        } catch (error) {
            console.error('Failed to initialize extension:', error);
        }
    }

    // 启动扩展
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeExtension);
    } else {
        initializeExtension();
    }

})();
