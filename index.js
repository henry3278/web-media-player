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

    // 正则表达式模式
    const patterns = {
        messageId: /^mes_(\d+)$/, // 匹配消息ID格式 mes_123
        aiMessage: /mes_(?!.*mes_user)/, // 匹配AI消息（不包含mes_user）
        imageUrl: /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i // 匹配图片URL
    };

    // 创建设置面板
    function createSettingsPanel() {
        console.log('正在创建设置面板...');
        
        const waitForSettingsArea = setInterval(() => {
            const extensionsArea = document.getElementById('extensions_settings');
            if (extensionsArea) {
                clearInterval(waitForSettingsArea);
                
                const html = `
                    <div class="list-group-item">
                        <h5>🎯 媒体播放器 (正则优化版)</h5>
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
                        <button class="btn btn-sm btn-secondary" id="media-debug">调试信息</button>
                        <div id="media-status" style="margin-top: 10px; font-size: 12px;"></div>
                        <div id="media-debug-info" style="display: none; margin-top: 10px; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 11px;"></div>
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
                document.getElementById('media-debug').addEventListener('click', showDebugInfo);
                
                console.log('✅ 设置面板创建完成');
            }
        }, 100);
    }

    // 使用正则提取消息ID
    function extractMessageId(elementId) {
        const match = elementId.match(patterns.messageId);
        return match ? match[1] : null;
    }

    // 使用正则检查是否为AI消息
    function isAIMessage(messageElement) {
        const htmlContent = messageElement.outerHTML;
        return !patterns.aiMessage.test(htmlContent) && patterns.messageId.test(messageElement.id);
    }

    // 查找所有消息元素
    function findAllMessages() {
        const allElements = document.querySelectorAll('[id^="mes_"]');
        const messages = Array.from(allElements).filter(el => patterns.messageId.test(el.id));
        console.log(`找到 ${messages.length} 条消息`);
        return messages;
    }

    // 查找最新的AI消息
    function findLatestAIMessage() {
        const messages = findAllMessages();
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (isAIMessage(messages[i])) {
                const messageId = extractMessageId(messages[i].id);
                console.log('找到AI消息:', messageId);
                return { element: messages[i], id: messageId };
            }
        }
        
        console.log('未找到AI消息');
        return null;
    }

    // 更新状态显示
    function updateStatus(message, isError = false) {
        const statusEl = document.getElementById('media-status');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color: ${isError ? 'red' : 'green'};">${message}</span>`;
        }
    }

    // 显示调试信息
    function showDebugInfo() {
        const messages = findAllMessages();
        const aiMessage = findLatestAIMessage();
        
        const debugInfo = {
            '总消息数': messages.length,
            '最新AI消息': aiMessage ? aiMessage.id : '未找到',
            '启用状态': config.enabled,
            '自动插入': config.autoInsert,
            '图片URL数量': config.imageUrls.length,
            '消息ID示例': messages.slice(0, 3).map(m => m.id)
        };
        
        const debugEl = document.getElementById('media-debug-info');
        debugEl.style.display = 'block';
        debugEl.innerHTML = `<pre>${JSON.stringify(debugInfo, null, 2)}</pre>`;
    }

    // 获取随机图片URL
    function getRandomImageUrl() {
        if (!config.imageUrls || config.imageUrls.length === 0) {
            return null;
        }
        const validUrls = config.imageUrls.filter(url => patterns.imageUrl.test(url));
        return validUrls.length > 0 ? validUrls[Math.floor(Math.random() * validUrls.length)] : null;
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
        
        // 使用正则验证消息ID格式
        if (!patterns.messageId.test(`mes_${messageId}`)) {
            console.log('无效的消息ID格式:', messageId);
            return false;
        }
        
        // 查找消息元素
        const messageElement = document.getElementById(`mes_${messageId}`);
        if (!messageElement) {
            console.log('找不到消息元素:', `mes_${messageId}`);
            return false;
        }
        
        // 查找消息文本区域 - 使用更灵活的选择器
        let messageTextElement = messageElement.querySelector('.mes_text');
        if (!messageTextElement) {
            // 备用方案：查找包含文本的子元素
            messageTextElement = messageElement.querySelector('[class*="text"], [class*="content"]');
            if (!messageTextElement) {
                messageTextElement = messageElement;
            }
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
        
        // 设置加载错误处理
        img.onerror = function() {
            console.error('图片加载失败:', imageUrl);
            this.style.opacity = '0.3';
            this.style.borderColor = 'red';
        };
        
        img.onload = function() {
            console.log('图片加载成功:', imageUrl);
        };
        
        // 插入到消息文本区域
        messageTextElement.appendChild(img);
        
        console.log('✅ 图片插入成功');
        return true;
    }

    // 测试插入功能
    function testInsert() {
        console.log('开始测试插入...');
        
        if (!config.enabled) {
            updateStatus('❌ 插件未启用', true);
            return;
        }
        
        const aiMessage = findLatestAIMessage();
        
        if (aiMessage) {
            const success = insertImageToMessage(aiMessage.id);
            if (success) {
                updateStatus('✅ 测试插入成功！');
                aiMessage.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                updateStatus('❌ 插入失败，请查看控制台', true);
            }
        } else {
            updateStatus('❌ 找不到AI回复消息', true);
        }
    }

    // AI回复时自动插入
    function setupAutoInsert() {
        console.log('设置自动插入监听...');
        
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver(function(mutations) {
            if (!config.enabled || !config.autoInsert) return;
            
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.id && patterns.messageId.test(node.id)) {
                        setTimeout(() => {
                            if (isAIMessage(node)) {
                                const messageId = extractMessageId(node.id);
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
        
        console.log('✅ DOM监听器已启动');
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
