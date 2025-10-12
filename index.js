(function() {
    console.log('🎯 媒体播放器插件加载...');

    // 配置
    let config = {
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
        console.log('正在创建设置面板...');
        
        // 等待扩展设置区域加载
        const waitForSettingsArea = setInterval(() => {
            const extensionsArea = document.getElementById('extensions_settings');
            if (extensionsArea) {
                clearInterval(waitForSettingsArea);
                
                const html = `
                    <div class="list-group-item">
                        <h5>🎯 媒体播放器 (稳定版)</h5>
                        <div class="form-group">
                            <label><input type="checkbox" id="media-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="media-auto" ${config.autoInsert ? 'checked' : ''}> AI回复自动插入</label>
                        </div>
                        <div class="form-group">
                            <label>图片URL列表 (每行一个):</label>
                            <textarea class="form-control" id="media-urls" rows="3" style="font-family: monospace; font-size: 12px;">${config.imageUrls.join('\n')}</textarea>
                        </div>
                        <button class="btn btn-sm btn-primary" id="media-test">测试插入</button>
                        <div id="media-status" style="margin-top: 10px; font-size: 12px;"></div>
                    </div>
                `;
                
                extensionsArea.innerHTML += html;
                
                // 绑定事件
                document.getElementById('media-enabled').addEventListener('change', function() {
                    config.enabled = this.checked;
                    updateStatus(`插件已${config.enabled ? '启用' : '禁用'}`);
                });
                
                document.getElementById('media-auto').addEventListener('change', function() {
                    config.autoInsert = this.checked;
                    updateStatus(`自动插入已${config.autoInsert ? '开启' : '关闭'}`);
                });
                
                document.getElementById('media-urls').addEventListener('input', function() {
                    config.imageUrls = this.value.split('\n').filter(url => url.trim());
                });
                
                document.getElementById('media-test').addEventListener('click', testInsert);
                
                console.log('✅ 设置面板创建完成');
            }
        }, 100);
    }

    // 更新状态显示
    function updateStatus(message, isError = false) {
        const statusEl = document.getElementById('media-status');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color: ${isError ? 'red' : 'green'};">${message}</span>`;
        }
    }

    // 获取随机图片URL
    function getRandomImageUrl() {
        if (!config.imageUrls || config.imageUrls.length === 0) {
            return null;
        }
        return config.imageUrls[Math.floor(Math.random() * config.imageUrls.length)];
    }

    // 插入图片到消息
    function insertImageToMessage(messageId) {
        if (!config.enabled) {
            console.log('插件未启用');
            return false;
        }
        
        const imageUrl = getRandomImageUrl();
        if (!imageUrl) {
            console.log('没有可用的图片URL');
            return false;
        }
        
        console.log('尝试插入图片到消息:', messageId);
        
        // 查找消息元素
        const messageElement = document.getElementById(`mes_${messageId}`);
        if (!messageElement) {
            console.log('找不到消息元素:', `mes_${messageId}`);
            return false;
        }
        
        // 查找消息文本区域
        const messageTextElement = messageElement.querySelector('.mes_text');
        if (!messageTextElement) {
            console.log('找不到消息文本区域');
            return false;
        }
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'AI回复图片';
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '5px';
        img.style.marginTop = '10px';
        img.style.display = 'block';
        img.style.border = '1px solid #ddd';
        
        // 插入到消息文本区域
        messageTextElement.appendChild(img);
        
        console.log('✅ 图片插入成功:', imageUrl);
        return true;
    }

    // 测试插入功能
    function testInsert() {
        console.log('开始测试插入...');
        
        if (!config.enabled) {
            updateStatus('❌ 插件未启用', true);
            return;
        }
        
        // 查找最新的AI消息
        const messages = document.querySelectorAll('.mes');
        let lastAIMessage = null;
        
        // 从后往前找第一个AI消息
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            // AI消息没有 .mes_user 类
            if (!message.querySelector('.mes_user')) {
                lastAIMessage = message;
                break;
            }
        }
        
        if (lastAIMessage) {
            const messageId = lastAIMessage.id.replace('mes_', '');
            console.log('找到AI消息:', messageId);
            
            const success = insertImageToMessage(messageId);
            if (success) {
                updateStatus('✅ 测试插入成功！');
                // 滚动到消息位置
                lastAIMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                updateStatus('❌ 插入失败，请检查控制台', true);
            }
        } else {
            updateStatus('❌ 找不到AI回复消息，请先让AI回复一条消息', true);
        }
    }

    // AI回复时自动插入
    function setupAutoInsert() {
        console.log('设置自动插入监听...');
        
        // 方法1: 使用SillyTavern事件系统
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-created', function(event, data) {
                if (config.enabled && config.autoInsert && !data.is_user) {
                    console.log('🤖 AI消息创建:', data.id);
                    setTimeout(() => {
                        insertImageToMessage(data.id);
                    }, 500);
                }
            });
            console.log('✅ 使用SillyTavern事件系统');
            return;
        }
        
        // 方法2: 备用方案 - DOM监听
        console.log('使用DOM监听备用方案');
        const observer = new MutationObserver(function(mutations) {
            if (!config.enabled || !config.autoInsert) return;
            
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('mes')) {
                        setTimeout(() => {
                            if (!node.querySelector('.mes_user')) {
                                const messageId = node.id.replace('mes_', '');
                                console.log('检测到新AI消息:', messageId);
                                insertImageToMessage(messageId);
                            }
                        }, 300);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化插件
    function initializePlugin() {
        console.log('初始化媒体播放器插件...');
        createSettingsPanel();
        setupAutoInsert();
        console.log('✅ 媒体播放器插件初始化完成');
    }

    // 启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePlugin);
    } else {
        initializePlugin();
    }

})();
