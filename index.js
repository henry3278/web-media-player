// 文件名: index.js - 最终修复版
(function() {
    console.log('🚀 最终修复版媒体插件加载...');
    
    const PLUGIN_NAME = 'media-plugin';
    const PLUGIN_VERSION = '4.0.0';
    
    // 默认配置 - 确保所有功能开箱即用
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [
            'https://picsum.photos/300/200?random=1',
            'https://picsum.photos/300/200?random=2',
            'https://picsum.photos/300/200?random=3'
        ],
        insertPosition: 'after', // after, before, inline
        imageWidth: '300px',
        imageHeight: 'auto'
    };
    
    // 创建设置面板
    function createSettingsPanel() {
        // 确保配置正确
        normalizeConfig();
        
        const html = `
            <div class="list-group-item">
                <h5>🚀 最终修复版媒体插件 v${PLUGIN_VERSION}</h5>
                <div class="alert alert-success" style="font-size: 13px; padding: 8px;">
                    ✅ 插件已加载 | URL数量: <strong id="mp-url-count">${config.mediaUrls.length}</strong>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入媒体</label>
                </div>
                
                <div class="form-group">
                    <label>插入位置:</label>
                    <select class="form-control" id="mp-insert-position">
                        <option value="after" ${config.insertPosition === 'after' ? 'selected' : ''}>回复之后</option>
                        <option value="before" ${config.insertPosition === 'before' ? 'selected' : ''}>回复之前</option>
                        <option value="inline" ${config.insertPosition === 'inline' ? 'selected' : ''}>段落中间</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表:</label>
                    <textarea class="form-control" id="mp-urls" rows="6" style="font-family: monospace; font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success" id="mp-save-urls">💾 保存URL</button>
                        <button class="btn btn-sm btn-secondary" id="mp-add-example">添加示例</button>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <label>图片宽度:</label>
                        <input type="text" class="form-control" id="mp-image-width" value="${config.imageWidth}">
                    </div>
                    <div class="col-6">
                        <label>图片高度:</label>
                        <input type="text" class="form-control" id="mp-image-height" value="${config.imageHeight}">
                    </div>
                </div>
                
                <div class="btn-group mt-3 w-100">
                    <button class="btn btn-sm btn-primary" id="mp-test-preview">👀 预览测试</button>
                    <button class="btn btn-sm btn-success" id="mp-test-insert">➕ 测试插入</button>
                </div>
                
                <div id="mp-status" class="mt-3 p-2 bg-light rounded" style="font-size: 13px;"></div>
                <div id="mp-preview" class="mt-2"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        showStatus('✅ 插件初始化完成，请先点击"预览测试"', 'success');
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
        $('#mp-enabled').on('change', function() {
            config.enabled = this.checked;
            saveConfig();
            showStatus(`插件已${config.enabled ? '启用' : '禁用'}`);
        });
        
        // 自动插入开关
        $('#mp-auto-insert').on('change', function() {
            config.autoInsert = this.checked;
            saveConfig();
            showStatus(`自动插入已${config.autoInsert ? '开启' : '关闭'}`);
        });
        
        // 插入位置
        $('#mp-insert-position').on('change', function() {
            config.insertPosition = this.value;
            saveConfig();
            showStatus(`插入位置: ${this.options[this.selectedIndex].text}`);
        });
        
        // 保存URL按钮
        $('#mp-save-urls').on('click', function() {
            updateUrlList();
            showStatus('✅ URL列表已保存', 'success');
        });
        
        // 添加示例URL
        $('#mp-add-example').on('click', function() {
            const exampleUrls = [
                'https://picsum.photos/300/200?random=4',
                'https://picsum.photos/300/200?random=5',
                'https://picsum.photos/300/200?random=6'
            ];
            $('#mp-urls').val($('#mp-urls').val() + '\n' + exampleUrls.join('\n'));
            updateUrlList();
            showStatus('✅ 已添加示例URL', 'success');
        });
        
        // 尺寸设置
        $('#mp-image-width, #mp-image-height').on('input', function() {
            config.imageWidth = $('#mp-image-width').val() || '300px';
            config.imageHeight = $('#mp-image-height').val() || 'auto';
            saveConfig();
        });
        
        // 预览测试
        $('#mp-test-preview').on('click', testPreview);
        
        // 测试插入
        $('#mp-test-insert').on('click', testInsert);
    }
    
    // 更新URL列表
    function updateUrlList() {
        try {
            const urlsText = $('#mp-urls').val();
            const urls = urlsText.split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);
            
            config.mediaUrls = urls;
            saveConfig();
            updateUrlCount();
            return true;
        } catch (error) {
            console.error('更新URL列表失败:', error);
            showStatus('❌ 更新URL列表失败', 'error');
            return false;
        }
    }
    
    // 更新URL计数
    function updateUrlCount() {
        const count = config.mediaUrls.length;
        $('#mp-url-count').text(count);
    }
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = {
            info: '#17a2b8',
            success: '#28a745', 
            error: '#dc3545'
        };
        $('#mp-status').html(`<span style="color: ${colors[type]}; font-weight: bold;">${message}</span>`);
    }
    
    // 保存配置
    function saveConfig() {
        try {
            localStorage.setItem(`mp_config`, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }
    
    // 加载配置
    function loadConfig() {
        try {
            const saved = localStorage.getItem(`mp_config`);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                return true;
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置');
        }
        return false;
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
            showStatus('❌ 没有可用的URL，请先添加URL', 'error');
            return;
        }
        
        showStatus(`🔍 测试URL: ${url}`, 'info');
        
        // 创建图片元素
        const img = new Image();
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '5px';
        img.style.border = '2px solid #007bff';
        
        // 创建预览容器
        const preview = document.createElement('div');
        preview.style.padding = '15px';
        preview.style.border = '2px solid #28a745';
        preview.style.borderRadius = '5px';
        preview.style.marginTop = '10px';
        preview.style.textAlign = 'center';
        
        const statusText = document.createElement('p');
        statusText.style.fontWeight = 'bold';
        statusText.style.marginBottom = '10px';
        
        const urlText = document.createElement('p');
        urlText.style.wordBreak = 'break-all';
        urlText.style.fontSize = '11px';
        urlText.style.color = '#666';
        urlText.textContent = url;
        
        preview.appendChild(statusText);
        preview.appendChild(img);
        preview.appendChild(urlText);
        
        // 添加到预览区域
        $('#mp-preview').html(preview);
        
        // 处理加载结果
        img.onload = function() {
            statusText.textContent = '✅ 图片加载成功';
            statusText.style.color = '#28a745';
            showStatus('✅ 图片预览加载成功', 'success');
        };
        
        img.onerror = function() {
            statusText.textContent = '❌ 图片加载失败';
            statusText.style.color = '#dc3545';
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
        img.style.borderRadius = '5px';
        img.style.border = '1px solid #ddd';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        
        img.onclick = function() {
            window.open(url, '_blank');
        };
        
        img.onerror = function() {
            this.style.opacity = '0.5';
            this.style.borderColor = 'red';
        };
        
        return img;
    }
    
    // 插入媒体到消息
    function insertMediaToMessage(messageId) {
        // 获取随机URL
        const url = getRandomMediaUrl();
        if (!url) {
            console.warn('插入失败：没有可用的URL');
            return false;
        }
        
        // 查找消息元素
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) {
            console.warn('插入失败：找不到消息元素');
            return false;
        }
        
        // 创建媒体元素
        const mediaElement = createMediaElement(url);
        
        // 根据插入位置决定插入方式
        if (config.insertPosition === 'before') {
            messageElement.insertBefore(mediaElement, messageElement.firstChild);
        } else if (config.insertPosition === 'inline') {
            // 在段落中间插入
            const textNodes = Array.from(messageElement.childNodes).filter(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
            );
            
            if (textNodes.length > 0) {
                const insertIndex = Math.floor(textNodes.length / 2);
                const insertNode = textNodes[insertIndex];
                
                // 创建容器
                const container = document.createElement('div');
                container.style.textAlign = 'center';
                container.style.margin = '10px 0';
                container.appendChild(mediaElement);
                
                // 插入媒体
                insertNode.parentNode.insertBefore(container, insertNode.nextSibling);
            } else {
                // 没有文本节点，插入到末尾
                messageElement.appendChild(mediaElement);
            }
        } else {
            // 默认插入到末尾
            messageElement.appendChild(mediaElement);
        }
        
        console.log('✅ 媒体插入成功');
        return true;
    }
    
    // 测试插入
    function testInsert() {
        // 查找最新的AI消息
        const messages = document.querySelectorAll('.mes');
        let lastAIMessage = null;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].querySelector('.mes_user')) {
                lastAIMessage = messages[i];
                break;
            }
        }
        
        if (!lastAIMessage) {
            showStatus('❌ 找不到AI回复消息，请先让AI回复一条消息', 'error');
            return;
        }
        
        const messageId = lastAIMessage.id.replace('mes_', '');
        const success = insertMediaToMessage(messageId);
        
        if (success) {
            showStatus('✅ 测试插入成功！', 'success');
            // 滚动到消息位置
            lastAIMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showStatus('❌ 插入失败，请检查配置', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || !config.autoInsert || data.message.is_user) {
            return;
        }
        
        // 延迟插入确保消息完全渲染
        setTimeout(() => {
            insertMediaToMessage(data.message.id);
        }, 300);
    }
    
    // 初始化
    function initialize() {
        // 加载配置
        loadConfig();
        
        // 创建设置面板
        createSettingsPanel();
        
        // 注册事件监听
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
        }
        
        console.log('✅ 插件初始化完成');
    }
    
    // 启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
