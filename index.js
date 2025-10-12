(function() {
    console.log('🖼️ 媒体播放器插件加载...');

    // 配置
    let config = {
        enabled: true,
        autoInsert: true,
        imageUrls: [
            'https://picsum.photos/300/200?1',
            'https://picsum.photos/300/200?2',
            'https://picsum.photos/300/200?3'
        ],
        imageStyle: 'modern' // modern, simple, classic
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
                        <h5>🖼️ 媒体播放器 (URL列表版)</h5>
                        <div class="form-group">
                            <label><input type="checkbox" id="media-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="media-auto" ${config.autoInsert ? 'checked' : ''}> AI回复自动插入</label>
                        </div>
                        
                        <div class="form-group">
                            <label>图片样式:</label>
                            <select class="form-control" id="media-style">
                                <option value="modern" ${config.imageStyle === 'modern' ? 'selected' : ''}>现代风格</option>
                                <option value="simple" ${config.imageStyle === 'simple' ? 'selected' : ''}>简约风格</option>
                                <option value="classic" ${config.imageStyle === 'classic' ? 'selected' : ''}>经典风格</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>图片URL列表 (每行一个):</label>
                            <textarea class="form-control" id="media-urls" rows="6" style="font-family: monospace; font-size: 12px;" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png">${config.imageUrls.join('\n')}</textarea>
                            <small class="form-text text-muted">支持: jpg, png, gif, webp 格式</small>
                        </div>
                        
                        <div class="btn-group w-100">
                            <button class="btn btn-sm btn-primary" id="media-test">测试插入</button>
                            <button class="btn btn-sm btn-success" id="media-add-example">添加示例</button>
                            <button class="btn btn-sm btn-info" id="media-preview">预览样式</button>
                        </div>
                        
                        <div id="media-status" style="margin-top: 10px; font-size: 12px;"></div>
                        <div id="media-preview-area" style="margin-top: 10px;"></div>
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
                
                document.getElementById('media-style').addEventListener('change', function() {
                    config.imageStyle = this.value;
                    updateStatus(`样式设置为: ${this.options[this.selectedIndex].text}`);
                });
                
                document.getElementById('media-urls').addEventListener('input', function() {
                    config.imageUrls = this.value.split('\n').filter(url => url.trim());
                });
                
                document.getElementById('media-test').addEventListener('click', testInsert);
                document.getElementById('media-add-example').addEventListener('click', addExampleUrls);
                document.getElementById('media-preview').addEventListener('click', previewStyle);
                
                console.log('✅ 设置面板创建完成');
            }
        }, 100);
    }

    // 添加示例URL
    function addExampleUrls() {
        const exampleUrls = [
            'https://picsum.photos/300/200?random=1',
            'https://picsum.photos/300/200?random=2',
            'https://picsum.photos/300/200?random=3',
            'https://picsum.photos/400/300?random=4',
            'https://picsum.photos/500/400?random=5'
        ];
        
        const textarea = document.getElementById('media-urls');
        const currentUrls = textarea.value.split('\n').filter(url => url.trim());
        const allUrls = [...currentUrls, ...exampleUrls];
        textarea.value = allUrls.join('\n');
        config.imageUrls = allUrls;
        
        updateStatus('✅ 已添加示例URL');
    }

    // 预览样式
    function previewStyle() {
        if (config.imageUrls.length === 0) {
            updateStatus('❌ 请先添加图片URL', true);
            return;
        }
        
        const randomUrl = config.imageUrls[Math.floor(Math.random() * config.imageUrls.length)];
        const previewArea = document.getElementById('media-preview-area');
        
        const previewHtml = `
            <div style="border: 2px solid #007bff; padding: 15px; border-radius: 8px; background: #f8f9fa;">
                <h6>样式预览:</h6>
                <div id="style-preview-container" style="text-align: center;"></div>
                <div style="font-size: 11px; color: #666; margin-top: 10px;">URL: ${randomUrl}</div>
            </div>
        `;
        
        previewArea.innerHTML = previewHtml;
        
        // 创建预览图片
        createImageElement(randomUrl, 'style-preview-container', true);
    }

    // 根据样式创建图片元素
    function createImageElement(url, containerId, isPreview = false) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'AI回复图片';
        
        // 应用样式
        applyImageStyle(img, config.imageStyle, isPreview);
        
        // 点击打开原图
        img.addEventListener('click', function() {
            window.open(url, '_blank');
        });
        
        // 加载处理
        img.addEventListener('load', function() {
            console.log('图片加载成功:', url);
            if (isPreview) {
                updateStatus('✅ 预览图片加载成功');
            }
        });
        
        img.addEventListener('error', function() {
            console.error('图片加载失败:', url);
            this.style.opacity = '0.3';
            this.style.borderColor = 'red';
            if (isPreview) {
                updateStatus('❌ 预览图片加载失败', true);
            }
        });
        
        container.appendChild(img);
        return img;
    }

    // 应用图片样式
    function applyImageStyle(img, style, isPreview = false) {
        const baseSize = isPreview ? '200px' : '300px';
        
        switch(style) {
            case 'modern':
                img.style.maxWidth = baseSize;
                img.style.maxHeight = '250px';
                img.style.borderRadius = '15px';
                img.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                img.style.border = '2px solid #e0e0e0';
                img.style.cursor = 'pointer';
                img.style.transition = 'all 0.3s ease';
                break;
                
            case 'simple':
                img.style.maxWidth = baseSize;
                img.style.maxHeight = '200px';
                img.style.borderRadius = '8px';
                img.style.border = '1px solid #ddd';
                break;
                
            case 'classic':
                img.style.maxWidth = baseSize;
                img.style.maxHeight = '220px';
                img.style.borderRadius = '5px';
                img.style.border = '3px solid #8B4513';
                img.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                break;
        }
        
        img.style.marginTop = '10px';
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
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
        // 过滤有效的图片URL
        const validUrls = config.imageUrls.filter(url => 
            url.match(/\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i)
        );
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
        
        // 创建容器
        const container = document.createElement('div');
        container.className = 'media-insert-container';
        container.style.textAlign = 'center';
        container.style.marginTop = '15px';
        container.style.marginBottom = '10px';
        
        // 创建图片
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'AI回复图片';
        
        // 应用样式
        applyImageStyle(img, config.imageStyle);
        
        // 加载处理
        img.addEventListener('error', function() {
            this.style.opacity = '0.3';
            this.style.borderColor = 'red';
        });
        
        container.appendChild(img);
        messageTextElement.appendChild(container);
        
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
        
        if (config.imageUrls.length === 0) {
            updateStatus('❌ 请先添加图片URL', true);
            return;
        }
        
        // 查找最新的AI消息
        const messages = document.querySelectorAll('.mes');
        let lastAIMessage = null;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].querySelector('.mes_user')) {
                lastAIMessage = messages[i];
                break;
            }
        }
        
        if (lastAIMessage) {
            const messageId = lastAIMessage.id.replace('mes_', '');
            const success = insertImageToMessage(messageId);
            
            if (success) {
                updateStatus('✅ 测试插入成功！');
                lastAIMessage.scrollIntoView({ behavior: 'smooth' });
            } else {
                updateStatus('❌ 插入失败', true);
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
                    if (node.nodeType === 1 && node.id && node.id.startsWith('mes_')) {
                        setTimeout(() => {
                            // 检查是否为AI消息（没有mes_user类）
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
        
        console.log('✅ 自动插入监听已启动');
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
