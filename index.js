// 文件名: index.js - 智能图库插件
(function() {
    console.log('🏞️ 智能图库插件加载...');
    
    const PLUGIN_NAME = 'smart-gallery';
    const PLUGIN_VERSION = '1.0.0';
    
    // 默认配置
    let config = {
        enabled: true,
        autoScan: true,
        imageDirs: ['/uploads/images/', '/images/'], // 自动扫描的目录
        fileExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        maxImages: 100, // 最大缓存图片数
        insertMode: 'random' // random, sequential
    };
    
    let imageCache = [];
    let currentIndex = 0;
    
    // 创建设置面板
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🏞️ 智能图库插件 v${PLUGIN_VERSION}</h5>
                
                <div class="form-group">
                    <label><input type="checkbox" id="sg-enabled" ${config.enabled ? 'checked' : ''}> 启用插件</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="sg-auto-scan" ${config.autoScan ? 'checked' : ''}> 自动扫描图片目录</label>
                </div>
                
                <div class="form-group">
                    <label>扫描目录 (每行一个):</label>
                    <textarea class="form-control" id="sg-dirs" rows="3">${config.imageDirs.join('\n')}</textarea>
                    <small class="form-text text-muted">插件会自动扫描这些目录下的图片文件</small>
                </div>
                
                <div class="form-group">
                    <label>文件扩展名:</label>
                    <input type="text" class="form-control" id="sg-extensions" value="${config.fileExtensions.join(', ')}">
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" id="sg-scan-now">🔍 立即扫描</button>
                    <button class="btn btn-sm btn-secondary" id="sg-clear-cache">🗑️ 清空缓存</button>
                    <button class="btn btn-sm btn-success" id="sg-test-insert">➕ 测试插入</button>
                </div>
                
                <div id="sg-status" style="margin-top: 10px;"></div>
                <div id="sg-preview" style="margin-top: 10px;"></div>
                <div id="sg-file-list" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindEvents();
    }
    
    // 绑定事件
    function bindEvents() {
        $('#sg-enabled').on('change', function() {
            config.enabled = this.checked;
            saveConfig();
            showStatus(`插件已${config.enabled ? '启用' : '禁用'}`);
        });
        
        $('#sg-auto-scan').on('change', function() {
            config.autoScan = this.checked;
            saveConfig();
        });
        
        $('#sg-scan-now').on('click', scanForImages);
        $('#sg-clear-cache').on('click', clearCache);
        $('#sg-test-insert').on('click', testInsert);
        
        // 实时保存配置
        $('#sg-dirs').on('input', debounce(() => {
            config.imageDirs = $('#sg-dirs').val().split('\n').filter(dir => dir.trim());
            saveConfig();
        }, 500));
        
        $('#sg-extensions').on('input', debounce(() => {
            config.fileExtensions = $('#sg-extensions').val().split(',').map(ext => ext.trim()).filter(ext => ext);
            saveConfig();
        }, 500));
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
        $('#sg-status').html(`<span style="color: ${colors[type]};">${message}</span>`);
    }
    
    // 保存配置
    async function saveConfig() {
        try {
            await SillyTavern.extension.saveSettings(PLUGIN_NAME, config);
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
    
    // 加载配置
    async function loadConfig() {
        try {
            const saved = await SillyTavern.extension.loadSettings(PLUGIN_NAME);
            if (saved) {
                config = { ...config, ...saved };
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置');
        }
    }
    
    // 核心功能：扫描图片目录
    async function scanForImages() {
        showStatus('🔄 扫描图片文件中...');
        
        const foundImages = [];
        
        // 尝试多种扫描方式
        const scanMethods = [
            scanViaFileAPI,
            scanViaDirectoryListing,
            scanViaKnownPaths
        ];
        
        for (const method of scanMethods) {
            try {
                const images = await method();
                if (images.length > 0) {
                    foundImages.push(...images);
                    break; // 找到图片就停止尝试其他方法
                }
            } catch (error) {
                console.warn(`扫描方法失败:`, error);
            }
        }
        
        // 去重
        imageCache = [...new Set(foundImages)].slice(0, config.maxImages);
        
        if (imageCache.length > 0) {
            showStatus(`✅ 找到 ${imageCache.length} 张图片`, 'success');
            updateFileList();
        } else {
            showStatus('❌ 未找到图片文件', 'error');
        }
        
        return imageCache;
    }
    
    // 方法1: 通过文件API扫描（如果支持）
    async function scanViaFileAPI() {
        const images = [];
        
        for (const dir of config.imageDirs) {
            try {
                // 尝试读取目录（需要服务器支持目录列表）
                const response = await fetch(dir);
                if (response.ok) {
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // 解析目录列表中的文件链接
                    const links = doc.querySelectorAll('a[href]');
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && isImageFile(href)) {
                            images.push(dir + href);
                        }
                    });
                }
            } catch (error) {
                // 忽略错误，继续尝试其他方法
            }
        }
        
        return images;
    }
    
    // 方法2: 通过已知路径尝试
    async function scanViaKnownPaths() {
        const images = [];
        const testFiles = ['photo1.jpg', 'image1.png', 'test.jpg', 'avatar.png'];
        
        for (const dir of config.imageDirs) {
            for (const file of testFiles) {
                const testUrl = dir + file;
                if (await checkFileExists(testUrl)) {
                    images.push(testUrl);
                }
            }
        }
        
        return images;
    }
    
    // 方法3: 目录列表扫描（备用）
    async function scanViaDirectoryListing() {
        // 这里可以添加更复杂的目录扫描逻辑
        return [];
    }
    
    // 检查文件是否存在
    async function checkFileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    // 判断是否是图片文件
    function isImageFile(filename) {
        return config.fileExtensions.some(ext => 
            filename.toLowerCase().endsWith(ext.toLowerCase())
        );
    }
    
    // 更新文件列表显示
    function updateFileList() {
        const fileList = imageCache.slice(0, 20).map((url, index) => 
            `<div style="font-size: 12px; margin: 2px 0;">
                ${index + 1}. <a href="${url}" target="_blank">${url.split('/').pop()}</a>
            </div>`
        ).join('');
        
        $('#sg-file-list').html(`
            <div style="border: 1px solid #ccc; padding: 10px;">
                <strong>发现的图片文件 (最多显示20个):</strong>
                ${fileList}
                ${imageCache.length > 20 ? `<div>... 还有 ${imageCache.length - 20} 个文件</div>` : ''}
            </div>
        `);
    }
    
    // 清空缓存
    function clearCache() {
        imageCache = [];
        currentIndex = 0;
        $('#sg-file-list').empty();
        $('#sg-preview').empty();
        showStatus('缓存已清空');
    }
    
    // 获取下一张图片
    function getNextImage() {
        if (imageCache.length === 0) return null;
        
        if (config.insertMode === 'sequential') {
            const image = imageCache[currentIndex];
            currentIndex = (currentIndex + 1) % imageCache.length;
            return image;
        } else {
            // 随机模式
            return imageCache[Math.floor(Math.random() * imageCache.length)];
        }
    }
    
    // 插入图片到消息
    function insertImageToMessage(messageId) {
        const imageUrl = getNextImage();
        if (!imageUrl) return false;
        
        const messageElement = document.querySelector(`#mes_${messageId} .mes_text`);
        if (!messageElement) return false;
        
        const container = document.createElement('div');
        container.className = 'smart-gallery-image';
        container.style.marginTop = '10px';
        container.style.textAlign = 'center';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'AI回复图片';
        img.style.maxWidth = '80%';
        img.style.maxHeight = '400px';
        img.style.borderRadius = '8px';
        img.style.border = '2px solid #e0e0e0';
        img.style.cursor = 'pointer';
        
        img.onclick = () => window.open(imageUrl, '_blank');
        img.onerror = () => {
            console.error('图片加载失败:', imageUrl);
            container.innerHTML = '<span style="color: red;">图片加载失败</span>';
        };
        
        container.appendChild(img);
        messageElement.appendChild(container);
        
        return true;
    }
    
    // 测试插入
    function testInsert() {
        const messages = document.querySelectorAll('.mes');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && !lastMessage.querySelector('.mes_user')) {
            const messageId = lastMessage.id.replace('mes_', '');
            if (insertImageToMessage(messageId)) {
                showStatus('✅ 测试插入成功');
            } else {
                showStatus('❌ 插入失败，请先扫描图片', 'error');
            }
        } else {
            showStatus('❌ 找不到AI回复消息', 'error');
        }
    }
    
    // AI回复时自动插入
    function onMessageRendered(event, data) {
        if (!config.enabled || data.message.is_user) return;
        
        if (config.autoScan && imageCache.length === 0) {
            // 自动扫描图片
            scanForImages().then(() => {
                setTimeout(() => insertImageToMessage(data.message.id), 100);
            });
        } else {
            setTimeout(() => insertImageToMessage(data.message.id), 100);
        }
    }
    
    // 初始化
    async function initialize() {
        await loadConfig();
        createSettingsPanel();
        
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-rendered', onMessageRendered);
        }
        
        // 启动时自动扫描（如果启用）
        if (config.autoScan) {
            setTimeout(scanForImages, 1000);
        }
        
        console.log('🏞️ 智能图库插件初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
