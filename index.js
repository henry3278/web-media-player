// 文件名: index.js - 修复配置保存问题
(function() {
    console.log('🎲 URL媒体池插件加载...');
    
    const PLUGIN_NAME = 'url-media-pool';
    const PLUGIN_VERSION = '1.1.0';
    
    // 默认配置 - 包含一些示例URL用于测试
    let config = {
        enabled: true,
        autoInsert: true,
        mediaUrls: [
            'https://picsum.photos/800/600',  // 测试图片1
            'https://picsum.photos/800/601',  // 测试图片2
            'https://picsum.photos/800/602'   // 测试图片3
        ],
        maxWidth: '80%',
        maxHeight: '400px'
    };
    
    // 创建设置面板
    function createSettingsPanel() {
        // 确保配置中的URL是数组格式
        if (typeof config.mediaUrls === 'string') {
            config.mediaUrls = config.mediaUrls.split('\n').filter(url => url.trim());
        }
        
        const html = `
            <div class="list-group-item">
                <h5>🎲 URL媒体池 v${PLUGIN_VERSION}</h5>
                <p style="color: #666; font-size: 12px;">状态: <span id="ump-config-status">加载中...</span></p>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="ump-auto-insert" ${config.autoInsert ? 'checked' : ''}> AI回复时自动插入媒体</label>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表 (每行一个):</label>
                    <textarea class="form-control" id="ump-urls" rows="6" placeholder="https://example.com/image1.jpg&#10;https://example.com/video1.mp4" style="font-family: monospace; font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                    <small class="form-text text-muted">
                        支持图片(.jpg .png .gif .webp)和视频(.mp4 .webm)<br>
                        <button type="button" class="btn btn-sm btn-outline-secondary mt-1" onclick="addExampleUrls()">添加测试URL</button>
                    </small>
                </div>
                
                <div class="btn-group mt-2">
                    <button class="btn btn-sm btn-primary" id="ump-test-random">🎲 测试随机</button>
                    <button class="btn btn-sm btn-success" id="ump-test-insert">➕ 测试插入</button>
                    <button class="btn btn-sm btn-info" id="ump-debug">🐛 调试信息</button>
                </div>
                
                <div id="ump-status" style="margin-top: 10px; min-height: 20px; font-size: 12px;"></div>
                <div id="ump-debug-info" style="margin-top: 10px; display: none; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 11px; font-family: monospace;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
        updateStatus();
        
        // 添加示例URL的全局函数
        window.addExampleUrls = function() {
            const exampleUrls = [
                'https://picsum.photos/800/600',
                'https://picsum.photos/800/601', 
                'https://picsum.photos/800/602',
                'https://picsum.photos/800/603',
                'https://picsum.photos/800/604'
            ];
            $('#ump-urls').val(exampleUrls.join('\n'));
            config.mediaUrls = exampleUrls;
            saveConfig();
            updateStatus();
            showStatus('✅ 已添加测试URL');
        };
    }
    
    // 绑定事件
    function bindEvents() {
        $('#ump-enabled').on('change', function() {
            config.enabled = this.checked;
            saveConfig();
            showStatus(`插件已${config.enabled ? '启用' : '禁用'}`);
        });
        
        $('#ump-auto-insert').on('change', function() {
            config.autoInsert = this.checked;
            saveConfig();
            showStatus(`自动插入已${config.autoInsert ? '开启' : '关闭'}`);
        });
        
        $('#ump-urls').on('input', debounce(() => {
            const urlsText = $('#ump-urls').val();
            config.mediaUrls = urlsText.split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0 && url.startsWith('http'));
            saveConfig();
            updateStatus();
        }, 800));
        
        $('#ump-test-random').on('click', testRandomSelection);
        $('#ump-test-insert').on('click', testInsert);
        $('#ump-debug').on('click', showDebugInfo);
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
    
    // 显示状态
    function showStatus(message, type = 'info') {
        const colors = { info: 'blue', success: 'green', error: 'red' };
        $('#ump-status').html(`<span style="color: ${colors[type]};">${message}</span>`);
    }
    
    // 更新状态显示
    function updateStatus() {
        const count = config.mediaUrls.length;
        $('#ump-config-status').html(`已配置 ${count} 个媒体URL`);
        $('#ump-config-status').css('color', count > 0 ? 'green' : 'red');
    }
    
    // 保存配置
    async function saveConfig() {
        try {
            console.log('💾 保存配置:', config);
            await SillyTavern.extension.saveSettings(PLUGIN_NAME, config);
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            showStatus('❌ 保存配置失败: ' + error.message, 'error');
        }
    }
    
    // 加载配置
    async function loadConfig() {
        try {
            console.log('🔍 加载配置...');
            const saved = await SillyTavern.extension.loadSettings(PLUGIN_NAME);
            console.log('加载到的配置:', saved);
            
            if (saved) {
                // 深度合并配置
                config = { 
                    enabled: saved.enabled !== false,
                    autoInsert: saved.autoInsert !== false,
                    mediaUrls: Array.isArray(saved.mediaUrls) ? saved.mediaUrls : 
                              (typeof saved.mediaUrls === 'string' ? saved.mediaUrls.split('\n').filter(url => url.trim()) : []),
                    maxWidth: saved.maxWidth || '80%',
                    maxHeight: saved.maxHeight || '400px'
                };
            }
        } catch (error) {
            console.warn('⚠️ 加载配置失败，使用默认配置:', error);
        }
    }
    
    // 显示调试信息
    function showDebugInfo() {
        const debugInfo = {
            '配置状态': config,
            '媒体URL数量': config.mediaUrls.length,
            '第一个URL': config.mediaUrls[0] || '无',
            'SillyTavern版本': window.SillyTavern ? '已加载' : '未找到'
        };
        
        let debugHtml = '<strong>调试信息:</strong><br>';
        for (const [key, value] of Object.entries(debugInfo)) {
            debugHtml += `${key}: ${JSON.stringify(value)}<br>`;
        }
        
        $('#ump-debug-info').html(debugHtml).toggle();
    }
    
    // 随机选择URL
    function getRandomMediaUrl() {
        if (!config.mediaUrls || config.mediaUrls.length === 0) {
            console.warn('❌ 媒体列表为空');
            return null;
        }
        const randomIndex = Math.floor(Math.random() * config.mediaUrls.length);
        const url = config.mediaUrls[randomIndex];
        console.log('🎲 随机选择:', url);
        return url;
    }
    
    // 测试随机选择
    function testRandomSelection() {
        const url = getRandomMediaUrl();
        if (!url) {
            showStatus('❌ 媒体列表为空，请先添加URL', 'error');
            return;
        }
        
        showStatus(`✅ 随机选择: ${url.substring(0, 50)}...`, 'success');
        
        // 创建预览
        const previewHtml = `
            <div style="border: 2px solid #4CAF50; padding: 10px; margin-top: 10px; border-radius: 5px;">
                <p><strong>🎲 随机选择预览</strong></p>
                <img src="${url}" style="max-width: 200px; max-height: 150px; border: 1px solid #ccc;" 
                     onerror="this.src='https://via.placeholder.com/200x150/ff0000/ffffff?text=加载失败'">
                <p style="word-break: break-all; font-size: 10px; margin: 5px 0;">${url}</p>
            </div>
        `;
        
        $('#ump-status').after(previewHtml);
    }
    
    // 测试插入
    function testInsert() {
        console.log('🧪 开始测试插入...');
        
        if (!config.mediaUrls || config.mediaUrls.length === 0) {
            showStatus('❌ 插入失败：媒体列表为空', 'error');
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
        
        if (!lastAIMessage) {
            showStatus('❌ 找不到AI回复消息，请先让AI回复一条消息', 'error');
            return;
        }
        
        const messageId = lastAIMessage.id.replace('mes_', '');
        const url = getRandomMediaUrl();
        
        if (!url) {
            showStatus('❌ 获取随机URL失败', 'error');
            return;
        }
        
        // 插入媒体
        const messageElement = lastAIMessage.querySelector('.mes_text');
        if (!messageElement) {
            showStatus('❌ 找不到消息内容元素', 'error');
            return;
        }
        
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="margin-top: 10px; text-align: center; border-left: 3px solid #4CAF50; padding-left: 10px;">
                <small style="color: #666;">🔧 [测试插入]</small>
                <img src="${url}" style="max-width: 300px; max-height: 200px; border-radius: 5px; border: 2px solid #4CAF50;" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                <div style="display: none; color: red; font-size: 12px;">❌ 图片加载失败</div>
            </div>
        `;
        
        messageElement.appendChild(container);
        showStatus('✅ 测试插入成功！已在AI回复后添加媒体', 'success');
        
        // 滚动到最新消息
        lastAIMessage.scrollIntoView({ behavior: 'smooth' });
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || !config.autoInsert || data.message.is_user) return;
        
        console.log('🤖 AI回复，准备插入媒体...');
        
        setTimeout(() => {
            if (!config.mediaUrls || config.mediaUrls.length === 0) {
                console.warn('❌ 自动插入失败：媒体列表为空');
                return;
            }
            
            const url = getRandomMediaUrl();
            if (!url) return;
            
            const messageElement = document.querySelector(`#mes_${data.message.id} .mes_text`);
            if (!messageElement) return;
            
            const container = document.createElement('div');
            container.style.marginTop = '10px';
            container.style.textAlign = 'center';
            
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = '80%';
            img.style.maxHeight = '400px';
            img.style.borderRadius = '5px';
            img.onerror = function() {
                this.style.opacity = '0.3';
            };
            
            container.appendChild(img);
            messageElement.appendChild(container);
            
            console.log('✅ 自动插入成功:', url);
        }, 100);
    }
    
    // 初始化
    async function initialize() {
        console.log('🔧 初始化插件...');
        await loadConfig();
        createSettingsPanel();
        
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
            console.log('✅ 事件监听器已注册');
        }
        
        console.log('🎊 URL媒体池插件初始化完成');
        showStatus('✅ 插件加载完成，请添加媒体URL后测试', 'success');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
