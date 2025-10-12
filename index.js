// 文件名: index.js (智能自适应版 v8.0)
(function () {
    const extensionName = 'smart-media-collector';
    const extensionVersion = '8.0.0';

    // 智能网站规则库
    const intelligentRules = {
        'kchai.org': {
            name: 'KChai图库',
            parseMode: 'html',
            selector: '.post-item img, .grid-item img, article img',
            attribute: 'data-src',
            useProxy: true,
            confidence: 0.9
        },
        'xsnvshen.co': {
            name: '女神站',
            parseMode: 'html', 
            selector: '.photo-item img, .gallery-img, .album-img',
            attribute: 'data-src',
            useProxy: true,
            confidence: 0.7
        },
        'inewgirl.com': {
            name: 'NewGirl',
            parseMode: 'json',
            jsonPath: 'data.feedList',
            urlKey: 'img',
            useProxy: false,
            confidence: 0.95,
            // 专用JSON解析器
            customParser: function(data) {
                try {
                    const nuxtData = window.__NUXT__ || data;
                    if (nuxtData && nuxtData.data && Array.isArray(nuxtData.data[0]?.feedList)) {
                        return nuxtData.data[0].feedList.map(item => item.img).filter(url => url && url.includes('http'));
                    }
                } catch (e) {}
                return [];
            }
        },
        // 通用规则（兜底）
        'default': {
            parseMode: 'html',
            selector: 'img',
            attribute: 'src',
            useProxy: true,
            confidence: 0.3
        }
    };

    const defaultSettings = {
        enabled: true,
        sourceUrl: '',
        mediaType: 'image',
        autoDetect: true, // 新增：智能检测开关
        manualMode: 'auto', // auto, html, json
        manualSelector: 'img',
        manualJsonPath: 'data.images',
        manualUrlKey: 'url',
        useProxy: true,
        maxWidth: '80%',
        maxHeight: '450px'
    };

    let settings = { ...defaultSettings };
    let mediaCache = [];

    /**
     * 智能网站检测器
     */
    function detectSiteConfig(url) {
        const domain = new URL(url).hostname;
        
        // 精确匹配
        for (const [siteDomain, config] of Object.entries(intelligentRules)) {
            if (domain.includes(siteDomain) || siteDomain.includes(domain)) {
                console.log(`[${extensionName}] 智能匹配到网站: ${config.name}`);
                return { ...config, detected: true };
            }
        }
        
        // 使用默认规则
        console.log(`[${extensionName}] 使用默认规则采集: ${domain}`);
        return { ...intelligentRules.default, detected: false };
    }

    /**
     * 智能采集引擎
     */
    async function intelligentCollect(url) {
        const siteConfig = settings.autoDetect ? detectSiteConfig(url) : getManualConfig();
        
        try {
            if (siteConfig.parseMode === 'html') {
                return await smartHTMLCollect(url, siteConfig);
            } else {
                return await smartJSONCollect(url, siteConfig);
            }
        } catch (error) {
            console.warn(`[${extensionName}] 智能采集失败，尝试备用方案:`, error);
            return await fallbackCollect(url);
        }
    }

    /**
     * 智能HTML采集
     */
    async function smartHTMLCollect(url, config) {
        const debugInfo = $('#smc-debug-info');
        const finalUrl = url;
        let requestUrl, fetchOptions = {};

        if (config.useProxy) {
            requestUrl = '/api/proxy';
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: finalUrl,
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                })
            };
        } else {
            requestUrl = finalUrl;
        }

        const response = await fetch(requestUrl, fetchOptions);
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 多选择器尝试策略
        const selectors = Array.isArray(config.selector) ? config.selector : [config.selector];
        let mediaUrls = [];
        
        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            console.log(`[${extensionName}] 尝试选择器 "${selector}"，找到 ${elements.length} 个元素`);
            
            if (elements.length > 0) {
                elements.forEach(el => {
                    const src = el.dataset[config.attribute] || el.getAttribute(config.attribute) || el.src;
                    if (src && src.startsWith('http')) {
                        mediaUrls.push(src);
                    }
                });
                break; // 使用第一个成功的选择器
            }
        }
        
        return mediaUrls;
    }

    /**
     * 智能JSON采集（特别优化inewgirl.com）
     */
    async function smartJSONCollect(url, config) {
        const debugInfo = $('#smc-debug-info');
        let requestUrl = url;
        let fetchOptions = {};
        
        if (config.useProxy) {
            requestUrl = '/api/proxy';
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, method: 'GET' })
            };
        }

        const response = await fetch(requestUrl, fetchOptions);
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);

        // 特殊处理inewgirl.com的NUXT数据
        if (config.customParser) {
            const html = await response.text();
            // 尝试从script标签提取NUXT数据
            const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*({[^;]+});/);
            if (nuxtMatch) {
                try {
                    const nuxtData = JSON.parse(nuxtMatch[1]);
                    return config.customParser(nuxtData);
                } catch (e) {
                    console.warn('解析NUXT数据失败:', e);
                }
            }
        }

        // 标准JSON解析
        const data = await response.json();
        if (config.customParser) {
            return config.customParser(data);
        }
        
        const items = getObjectByPath(data, config.jsonPath);
        if (!Array.isArray(items)) throw new Error('JSON路径无效');
        
        return items.map(item => item[config.urlKey]).filter(url => url && url.startsWith('http'));
    }

    /**
     * 备用采集方案
     */
    async function fallbackCollect(url) {
        console.log(`[${extensionName}] 启用备用采集方案`);
        // 尝试通用图片采集
        const elements = document.querySelectorAll('img');
        return Array.from(elements).map(img => img.src).filter(src => src.startsWith('http'));
    }

    // 辅助函数
    function getObjectByPath(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    function getManualConfig() {
        return {
            parseMode: settings.manualMode === 'auto' ? 'html' : settings.manualMode,
            selector: settings.manualSelector,
            jsonPath: settings.manualJsonPath,
            urlKey: settings.manualUrlKey,
            useProxy: settings.useProxy
        };
    }

    // 设置面板（简化版，专注于智能功能）
    function addSettingsPanel() {
        const settingsHtml = `
            <div class="list-group-item" id="smart-media-settings">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">🤖 智能媒体采集器</h5>
                    <small>v${extensionVersion}</small>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="smc-enabled" ${settings.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label for="smc-sourceUrl">🔗 资源网址</label>
                    <input type="text" id="smc-sourceUrl" class="form-control" value="${settings.sourceUrl}" placeholder="输入网址，插件自动识别">
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="smc-autoDetect" ${settings.autoDetect ? 'checked' : ''}> 智能网站识别</label>
                    <small class="form-text text-muted">自动识别常见图片网站并应用最优采集规则</small>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="smc-useProxy" ${settings.useProxy ? 'checked' : ''}> 使用代理请求</label>
                </div>
                
                <div class="wmp-test-area">
                    <button type="button" id="smc-test-collect" class="btn btn-primary btn-sm">🔍 智能测试</button>
                    <div id="smc-debug-info" class="wmp-status info"></div>
                    <div id="smc-test-result" class="wmp-status"></div>
                </div>
            </div>
        `;
        $('#extensions_settings').append(settingsHtml);
    }

    // 事件监听
    function addSettingsEventListeners() {
        $('#smart-media-settings').on('change', '#smc-enabled', updateSetting('enabled', 'checkbox'));
        $('#smart-media-settings').on('input', '#smc-sourceUrl', updateSetting('sourceUrl', 'text', true));
        $('#smart-media-settings').on('change', '#smc-autoDetect', updateSetting('autoDetect', 'checkbox'));
        $('#smart-media-settings').on('change', '#smc-useProxy', updateSetting('useProxy', 'checkbox'));
        $('#smart-media-settings').on('click', '#smc-test-collect', testIntelligentCollect);
    }

    async function testIntelligentCollect() {
        const status = $('#smc-test-result');
        const debugInfo = $('#smc-debug-info');
        
        status.removeClass('success error').html('🔍 智能识别中...').addClass('info').show();
        debugInfo.html('').show();
        
        try {
            const urls = await intelligentCollect(settings.sourceUrl);
            if (urls.length > 0) {
                status.html(`✅ 智能采集成功！找到 ${urls.length} 个媒体文件`).addClass('success');
                debugInfo.html(`识别规则: ${detectSiteConfig(settings.sourceUrl).name}<br>采集模式: ${detectSiteConfig(settings.sourceUrl).parseMode}`);
                mediaCache = urls;
            } else {
                status.html('❌ 未找到媒体文件').addClass('error');
            }
        } catch (error) {
            status.html(`❌ 采集失败: ${error.message}`).addClass('error');
        }
    }

    // 原有的autoInsertMedia等函数保持不变
    async function autoInsertMedia(type, data) {
        const message = data.message;
        if (!settings.enabled || message.is_user || !message.mes) return;

        const messageElement = document.querySelector(`#mes_${message.id} .mes_text`);
        if (!messageElement) return;

        const mediaUrl = await getRandomMediaUrl();
        if (!mediaUrl) return;

        const container = document.createElement('div');
        container.className = 'media-container';
        const mediaElement = document.createElement('img');
        mediaElement.src = mediaUrl;
        mediaElement.style.maxWidth = settings.maxWidth;
        mediaElement.style.maxHeight = settings.maxHeight;
        mediaElement.onclick = () => window.open(mediaUrl, '_blank');
        
        container.appendChild(mediaElement);
        messageElement.appendChild(container);
    }

    async function getRandomMediaUrl() {
        if (mediaCache.length === 0) {
            try {
                const urls = await intelligentCollect(settings.sourceUrl);
                mediaCache = urls;
            } catch (error) {
                return null;
            }
        }
        return mediaCache[Math.floor(Math.random() * mediaCache.length)];
    }

    // 初始化
    $(document).ready(async function () {
        try {
            const loadedSettings = await SillyTavern.extension.loadSettings(extensionName);
            settings = { ...defaultSettings, ...loadedSettings };
        } catch (error) {
            console.error(`[${extensionName}] 加载设置失败:`, error);
        }

        addSettingsPanel();
        addSettingsEventListeners();
        SillyTavern.events.on('message-rendered', autoInsertMedia);
        console.log(`[${extensionName} v${extensionVersion}] 智能采集器已加载`);
    });

})();
