// 文件名: index.js (稳定核心版 v1.0)
(function () {
    console.log('🔧 媒体播放器插件开始加载...');

    const extensionName = 'media-player-stable';
    const defaultSettings = {
        enabled: true,
        sourceUrl: 'https://www.kchai.org/', // 默认一个可用的网址
        useProxy: true
    };
    let settings = { ...defaultSettings };
    let mediaCache = []; // 图片链接缓存

    // 1. 创建最简单的设置面板
    function createSimpleSettings() {
        // 确保设置区域存在
        if (!$('#extensions_settings').length) {
            console.error('找不到扩展设置区域！');
            return;
        }

        const html = `
            <div class="list-group-item">
                <h5>媒体播放器 (稳定版)</h5>
                <div class="form-group">
                    <label><input type="checkbox" id="mp-enabled" ${settings.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                <div class="form-group">
                    <label for="mp-sourceUrl">图片网址:</label>
                    <input type="text" class="form-control" id="mp-sourceUrl" value="${settings.sourceUrl}" placeholder="https://example.com">
                    <small class="form-text text-muted">输入一个包含图片的网页地址</small>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="mp-useProxy" ${settings.useProxy ? 'checked' : ''}> 使用代理 (解决跨域问题)</label>
                </div>
                <button class="btn btn-sm btn-primary" id="mp-test">测试采集</button>
                <button class="btn btn-sm btn-secondary" id="mp-clear">清除缓存</button>
                <div id="mp-status" style="margin-top: 10px; font-size: 0.9em;"></div>
            </div>
        `;
        $('#extensions_settings').append(html);
        console.log('✅ 设置面板创建完成');
    }

    // 2. 绑定设置事件
    function bindSettingsEvents() {
        // 启用开关
        $(document).on('change', '#mp-enabled', function() {
            settings.enabled = this.checked;
            saveSettings();
            showStatus(`插件已${settings.enabled ? '启用' : '禁用'}`, 'success');
        });

        // 网址输入
        $(document).on('input', '#mp-sourceUrl', function() {
            settings.sourceUrl = this.value;
            mediaCache = []; // 网址变化，清空缓存
            saveSettings();
        });

        // 代理开关
        $(document).on('change', '#mp-useProxy', function() {
            settings.useProxy = this.checked;
            saveSettings();
        });

        // 测试按钮
        $(document).on('click', '#mp-test', testMediaFetch);

        // 清除缓存
        $(document).on('click', '#mp-clear', function() {
            mediaCache = [];
            showStatus('图片缓存已清除', 'info');
        });

        console.log('✅ 设置事件绑定完成');
    }

    // 3. 保存设置
    async function saveSettings() {
        try {
            await SillyTavern.extension.saveSettings(extensionName, settings);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    // 4. 显示状态信息
    function showStatus(message, type = 'info') {
        const statusEl = $('#mp-status');
        statusEl.removeClass('text-success text-danger text-info')
               .addClass(`text-${type}`)
               .text(message)
               .show();
        setTimeout(() => statusEl.fadeOut(), 3000);
    }

    // 5. 核心功能：采集图片链接
    async function fetchImageUrls() {
        if (!settings.sourceUrl) {
            throw new Error('请先设置图片网址');
        }

        console.log('🔄 开始采集图片...');

        let requestUrl, options = {};

        if (settings.useProxy) {
            // 使用代理
            requestUrl = '/api/proxy';
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: settings.sourceUrl,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                })
            };
        } else {
            // 直接请求
            requestUrl = settings.sourceUrl;
        }

        const response = await fetch(requestUrl, options);
        
        if (!response.ok) {
            throw new Error(`网络请求失败: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 简单的图片采集逻辑：获取所有图片的 data-src 或 src
        const images = doc.querySelectorAll('img');
        const urls = [];

        images.forEach(img => {
            // 优先取 data-src (懒加载)，没有则取 src
            const url = img.dataset.src || img.src;
            if (url && url.startsWith('http')) {
                urls.push(url);
            }
        });

        console.log(`✅ 采集到 ${urls.length} 张图片`);
        return urls;
    }

    // 6. 测试采集功能
    async function testMediaFetch() {
        showStatus('正在采集图片...', 'info');
        
        try {
            const urls = await fetchImageUrls();
            mediaCache = urls; // 更新缓存
            showStatus(`成功采集到 ${urls.length} 张图片！`, 'success');
            
            // 显示第一张图片作为预览
            if (urls.length > 0) {
                $('#mp-status').append(`<br><img src="${urls[0]}" style="max-width: 200px; margin-top: 10px;">`);
            }
        } catch (error) {
            console.error('采集失败:', error);
            showStatus(`采集失败: ${error.message}`, 'danger');
        }
    }

    // 7. 获取随机图片链接
    async function getRandomImageUrl() {
        // 如果缓存为空，先采集
        if (mediaCache.length === 0) {
            console.log('缓存为空，开始采集...');
            try {
                const urls = await fetchImageUrls();
                mediaCache = urls;
            } catch (error) {
                console.error('自动采集失败:', error);
                return null;
            }
        }

        // 从缓存中随机选择一张
        if (mediaCache.length > 0) {
            const randomIndex = Math.floor(Math.random() * mediaCache.length);
            return mediaCache[randomIndex];
        }

        return null;
    }

    // 8. 核心功能：AI回复时插入图片
    async function onMessageRendered(event, data) {
        // 检查插件是否启用
        if (!settings.enabled) {
            return;
        }

        const message = data.message;
        
        // 只处理AI的回复，忽略用户消息
        if (message.is_user) {
            return;
        }

        console.log('🤖 检测到AI回复，准备插入图片...');

        // 获取消息的DOM元素
        const messageElement = document.querySelector(`#mes_${message.id} .mes_text`);
        if (!messageElement) {
            console.warn('找不到消息元素');
            return;
        }

        // 获取随机图片链接
        const imageUrl = await getRandomImageUrl();
        if (!imageUrl) {
            console.warn('没有可用的图片链接');
            return;
        }

        console.log(`🖼️ 插入图片: ${imageUrl}`);

        // 创建图片容器和图片元素
        const container = document.createElement('div');
        container.className = 'media-container';

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '随机图片';
        img.onclick = function() {
            window.open(imageUrl, '_blank');
        };

        container.appendChild(img);
        messageElement.appendChild(container);

        console.log('✅ 图片插入完成');
    }

    // 9. 插件初始化
    async function initializePlugin() {
        console.log('🔧 初始化插件...');
        
        try {
            // 加载设置
            const savedSettings = await SillyTavern.extension.loadSettings(extensionName);
            if (savedSettings) {
                settings = { ...defaultSettings, ...savedSettings };
            }
            console.log('✅ 设置加载完成');

            // 创建界面
            createSimpleSettings();
            bindSettingsEvents();

            // 监听消息渲染事件 - 这是最关键的一步！
            // 确保使用正确的事件名
            if (typeof SillyTavern !== 'undefined' && SillyTavern.events) {
                SillyTavern.events.on('message-rendered', onMessageRendered);
                console.log('✅ 消息渲染事件监听器已注册');
            } else {
                // 备用方案：直接监听DOM变化
                console.log('⚠️ 使用DOM变化监听作为备用方案');
                observeMessageChanges();
            }

            console.log('🎉 媒体播放器插件初始化完成！');
            
        } catch (error) {
            console.error('插件初始化失败:', error);
        }
    }

    // 10. DOM变化监听（备用方案）
    function observeMessageChanges() {
        // 简单的DOM观察，确保能捕获新消息
        let lastMessageCount = 0;
        
        setInterval(() => {
            const messages = document.querySelectorAll('.mes');
            if (messages.length > lastMessageCount) {
                // 有新消息，尝试为最新的AI消息插入图片
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && !lastMessage.querySelector('.mes_user')) {
                    // 模拟消息渲染事件
                    const fakeEvent = { type: 'message-rendered' };
                    const fakeData = { 
                        message: { 
                            id: lastMessage.id.replace('mes_', ''),
                            is_user: false,
                            mes: lastMessage.querySelector('.mes_text')?.textContent || ''
                        } 
                    };
                    onMessageRendered(fakeEvent, fakeData);
                }
                lastMessageCount = messages.length;
            }
        }, 1000);
    }

    // 页面加载完成后初始化插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePlugin);
    } else {
        initializePlugin();
    }

})();
