// 文件名: index.js - 功能完整版
(function() {
    console.log('🎯 媒体播放器插件开始加载...');
    
    const PLUGIN_NAME = 'media-player';
    const PLUGIN_VERSION = '1.1.0';
    
    // 插件设置
    let settings = {
        enabled: true,
        sourceUrl: 'https://www.kchai.org/',
        useProxy: true,
        autoInsert: true
    };
    
    let mediaCache = [];
    
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
    
    // 加载保存的设置
    async function loadSettings() {
        try {
            const saved = await SillyTavern.extension.loadSettings(PLUGIN_NAME);
            if (saved) {
                settings = { ...settings, ...saved };
                console.log('✅ 设置加载完成:', settings);
            }
        } catch (error) {
            console.warn('⚠️ 加载设置失败，使用默认设置:', error);
        }
    }
    
    // 保存设置
    async function saveSettings() {
        try {
            await SillyTavern.extension.saveSettings(PLUGIN_NAME, settings);
            console.log('💾 设置已保存');
        } catch (error) {
            console.error('❌ 保存设置失败:', error);
        }
    }
    
    // 创建设置面板
    function createSettingsPanel() {
        console.log('🛠️ 创建设置面板...');
        
        const extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            console.error('❌ 找不到扩展设置区域');
            return;
        }
        
        const pluginHtml = `
            <div class="list-group-item" id="media-player-settings">
                <h5>🎨 媒体播放器 v${PLUGIN_VERSION}</h5>
                <p style="color: green;">✅ 插件工作正常</p>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-enabled" ${settings.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-auto-insert" ${settings.autoInsert ? 'checked' : ''}> AI回复时自动插入图片</label>
                </div>
                
                <div class="form-group">
                    <label for="mp-source-url">图片网址:</label>
                    <input type="text" class="form-control" id="mp-source-url" value="${settings.sourceUrl}" 
                           placeholder="https://www.kchai.org/">
                    <small class="form-text text-muted">包含图片的网页地址</small>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-use-proxy" ${settings.useProxy ? 'checked' : ''}> 使用代理请求</label>
                    <small class="form-text text-muted">解决跨域问题，建议开启</small>
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" id="mp-test-fetch">🔍 测试采集</button>
                    <button class="btn btn-sm btn-secondary" id="mp-clear-cache">🗑️ 清除缓存</button>
                    <button class="btn btn-sm btn-success" id="mp-test-insert">➕ 测试插入</button>
                </div>
                
                <div id="mp-status" style="margin-top: 10px; min-height: 20px;"></div>
                <div id="mp-preview" style="margin-top: 10px;"></div>
            </div>
        `;
        
        // 移除旧的设置项（如果存在）
        const oldSettings = document.getElementById('media-player-settings');
        if (oldSettings) {
            oldSettings.remove();
        }
        
        extensionsArea.insertAdjacentHTML('beforeend', pluginHtml);
        console.log('✅ 设置面板创建完成');
        
        bindSettingsEvents();
    }
    
    // 绑定设置事件
    function bindSettingsEvents() {
        // 启用开关
        $('#mp-enabled').on('change', function() {
            settings.enabled = this.checked;
            saveSettings();
            showStatus(`插件已${settings.enabled ? '启用' : '禁用'}`, 'success');
        });
        
        // 自动插入开关
        $('#mp-auto-insert').on('change', function() {
            settings.autoInsert = this.checked;
            saveSettings();
            showStatus(`自动插入已${settings.autoInsert ? '开启' : '关闭'}`, 'info');
        });
        
        // 网址输入
        $('#mp-source-url').on('input', function() {
            settings.sourceUrl = this.value;
            mediaCache = []; // 清空缓存
            saveSettings();
        });
        
        // 代理开关
        $('#mp-use-proxy').on('change', function() {
            settings.useProxy = this.checked;
            saveSettings();
        });
        
        // 测试采集
        $('#mp-test-fetch').on('click', testMediaFetch);
        
        // 清除缓存
        $('#mp-clear-cache').on('click', function() {
            mediaCache = [];
            showStatus('图片缓存已清除', 'info');
            $('#mp-preview').empty();
        });
        
        // 测试插入
        $('#mp-test-insert').on('click', testMediaInsert);
        
        console.log('✅ 设置事件绑定完成');
    }
    
    // 显示状态信息
    function showStatus(message, type = 'info') {
        const statusEl = $('#mp-status');
        const colors = { info: 'blue', success: 'green', error: 'red' };
        statusEl.html(`<span style="color: ${colors[type]}; font-weight: bold;">${message}</span>`).show();
    }
    
    // 核心功能：采集图片
    async function fetchImageUrls() {
        console.log('🔄 开始采集图片...');
        
        if (!settings.sourceUrl) {
            throw new Error('请先设置图片网址');
        }
        
        let requestUrl, options = {};
        
        if (settings.useProxy) {
            requestUrl = '/api/proxy';
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: settings.sourceUrl,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                })
            };
        } else {
            requestUrl = settings.sourceUrl;
        }
        
        console.log(`📡 请求URL: ${requestUrl}`);
        
        const response = await fetch(requestUrl, options);
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log(`📄 获取到HTML，长度: ${html.length} 字符`);
        
        // 解析HTML，提取图片
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.querySelectorAll('img');
        
        console.log(`🖼️ 找到 ${images.length} 个图片标签`);
        
        const urls = [];
        images.forEach((img, index) => {
            // 优先使用data-src（懒加载），其次使用src
            const url = img.getAttribute('data-src') || img.src;
            if (url && url.startsWith('http')) {
                urls.push(url);
                if (index < 3) { // 只打印前3个URL用于调试
                    console.log(`  ${index + 1}. ${url}`);
                }
            }
        });
        
        return urls;
    }
    
    // 测试采集功能
    async function testMediaFetch() {
        showStatus('正在采集图片...', 'info');
        $('#mp-preview').empty();
        
        try {
            const urls = await fetchImageUrls();
            mediaCache = urls;
            
            if (urls.length === 0) {
                showStatus('❌ 未找到任何图片', 'error');
                return;
            }
            
            showStatus(`✅ 成功采集到 ${urls.length} 张图片！`, 'success');
            
            // 显示预览
            const previewHtml = `
                <div style="border: 1px solid #ccc; padding: 10px; margin-top: 10px;">
                    <p><strong>图片预览（第一张）:</strong></p>
                    <img src="${urls[0]}" style="max-width: 200px; max-height: 150px; border: 1px solid #ddd;">
                    <p style="font-size: 12px; word-break: break-all;">${urls[0]}</p>
                </div>
            `;
            $('#mp-preview').html(previewHtml);
            
        } catch (error) {
            console.error('采集失败:', error);
            showStatus(`❌ 采集失败: ${error.message}`, 'error');
        }
    }
    
    // 获取随机图片
    async function getRandomImageUrl() {
        if (mediaCache.length === 0) {
            console.log('🔄 缓存为空，开始自动采集...');
            try {
                const urls = await fetchImageUrls();
                mediaCache = urls;
            } catch (error) {
                console.error('自动采集失败:', error);
                return null;
            }
        }
        
        if (mediaCache.length > 0) {
            const randomIndex = Math.floor(Math.random() * mediaCache.length);
            return mediaCache[randomIndex];
        }
        
        return null;
    }
    
    // 插入图片到消息
    function insertImageToMessage(messageId, imageUrl) {
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) {
            console.warn('❌ 找不到消息元素');
            return false;
        }
        
        // 创建图片容器
        const container = document.createElement('div');
        container.className = 'media-player-container';
        container.style.marginTop = '10px';
        container.style.textAlign = 'center';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '随机图片';
        img.style.maxWidth = '80%';
        img.style.maxHeight = '400px';
        img.style.borderRadius = '8px';
        img.style.cursor = 'pointer';
        img.style.border = '2px solid #e0e0e0';
        
        img.onclick = function() {
            window.open(imageUrl, '_blank');
        };
        
        container.appendChild(img);
        messageElement.appendChild(container);
        
        console.log('✅ 图片插入成功');
        return true;
    }
    
    // 测试插入功能
    async function testMediaInsert() {
        if (!settings.enabled) {
            showStatus('❌ 请先启用插件', 'error');
            return;
        }
        
        showStatus('正在测试插入图片...', 'info');
        
        // 获取最新的一条AI消息
        const messages = Array.from(document.querySelectorAll('.mes')).reverse();
        let lastAIMessage = null;
        
        for (const message of messages) {
            if (!message.querySelector('.mes_user')) { // 不是用户消息
                lastAIMessage = message;
                break;
            }
        }
        
        if (!lastAIMessage) {
            showStatus('❌ 找不到AI回复消息', 'error');
            return;
        }
        
        const messageId = lastAIMessage.id.replace('mes_', '');
        const imageUrl = await getRandomImageUrl();
        
        if (!imageUrl) {
            showStatus('❌ 没有可用的图片', 'error');
            return;
        }
        
        const success = insertImageToMessage(messageId, imageUrl);
        if (success) {
            showStatus('✅ 测试插入成功！', 'success');
        }
    }
    
    // AI回复时自动插入图片
    function onMessageRendered(event, data) {
        if (!settings.enabled || !settings.autoInsert) {
            return;
        }
        
        const message = data.message;
        if (message.is_user) {
            return; // 忽略用户消息
        }
        
        console.log(`🤖 AI回复，准备插入图片到消息 ${message.id}`);
        
        // 稍等片刻让消息完全渲染
        setTimeout(async () => {
            const imageUrl = await getRandomImageUrl();
            if (imageUrl) {
                insertImageToMessage(message.id, imageUrl);
            }
        }, 100);
    }
    
    // 主初始化函数
    async function initializePlugin() {
        console.log('🔧 初始化媒体播放器插件...');
        
        try {
            await waitForSillyTavern();
            console.log('✅ SillyTavern环境就绪');
            
            await loadSettings();
            createSettingsPanel();
            
            // 注册事件监听
            if (SillyTavern.events) {
                SillyTavern.events.on('message-rendered', onMessageRendered);
                console.log('✅ 消息渲染事件监听器已注册');
            }
            
            console.log('🎊 媒体播放器插件初始化完成！');
            
        } catch (error) {
            console.error('❌ 插件初始化失败:', error);
        }
    }
    
    // 启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePlugin);
    } else {
        initializePlugin();
    }
    
})();
