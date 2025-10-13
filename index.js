// 文件名: index.js - 简单媒体播放器插件
(function() {
    console.log('🎵 媒体播放器插件加载...');
    
    const PLUGIN_NAME = 'media-player-panel';
    const PLUGIN_VERSION = '1.0.0';
    
    // 配置
    let config = {
        enabled: true,
        mediaUrls: [
            'https://picsum.photos/400/300?random=1',
            'https://picsum.photos/400/300?random=2',
            'https://picsum.photos/400/300?random=3'
        ],
        panelPosition: 'right' // right, left, bottom
    };
    
    let isPanelOpen = false;
    let currentMediaIndex = 0;
    
    // 创建播放器面板HTML
    function createPlayerPanel() {
        const panelHTML = `
            <div id="media-player-panel" style="
                position: fixed;
                ${config.panelPosition === 'right' ? 'right: 0;' : config.panelPosition === 'left' ? 'left: 0;' : 'bottom: 0; width: 100%;'}
                ${config.panelPosition === 'bottom' ? 'height: 300px;' : 'top: 0; width: 400px;'}
                background: #2d3748;
                color: white;
                z-index: 10000;
                border-left: ${config.panelPosition === 'right' ? '2px solid #4a5568' : 'none'};
                border-top: ${config.panelPosition === 'bottom' ? '2px solid #4a5568' : 'none'};
                display: none;
                flex-direction: column;
            ">
                <!-- 标题栏 -->
                <div style="padding: 10px; background: #4a5568; display: flex; justify-content: space-between; align-items: center;">
                    <strong>🎵 媒体播放器</strong>
                    <button id="media-panel-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
                </div>
                
                <!-- 内容区域 -->
                <div style="flex: 1; padding: 15px; overflow-y: auto;">
                    <!-- 媒体显示区域 -->
                    <div id="media-display" style="text-align: center; margin-bottom: 15px;">
                        <img id="current-media" src="" style="max-width: 100%; max-height: 200px; border-radius: 5px; display: none;">
                        <video id="current-video" controls style="max-width: 100%; max-height: 200px; border-radius: 5px; display: none;"></video>
                    </div>
                    
                    <!-- 控制按钮 -->
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;">
                        <button id="media-prev" class="media-btn">⬅️ 上一个</button>
                        <button id="media-play" class="media-btn">▶️ 播放</button>
                        <button id="media-next" class="media-btn">下一个 ➡️</button>
                    </div>
                    
                    <!-- URL列表 -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 12px;">媒体列表:</label>
                        <select id="media-select" style="width: 100%; padding: 5px; background: #4a5568; color: white; border: 1px solid #718096; border-radius: 3px;">
                            <!-- 动态填充 -->
                        </select>
                    </div>
                    
                    <!-- 添加URL -->
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="new-media-url" placeholder="输入新的媒体URL" style="width: 100%; padding: 5px; background: #4a5568; color: white; border: 1px solid #718096; border-radius: 3px; margin-bottom: 5px;">
                        <button id="add-media-url" style="width: 100%; padding: 5px; background: #4299e1; color: white; border: none; border-radius: 3px; cursor: pointer;">添加URL</button>
                    </div>
                </div>
                
                <!-- 状态栏 -->
                <div style="padding: 5px 10px; background: #4a5568; font-size: 12px; text-align: center;">
                    <span id="media-status">就绪</span>
                </div>
            </div>
        `;
        
        // 添加到页面
        if (!document.getElementById('media-player-panel')) {
            document.body.insertAdjacentHTML('beforeend', panelHTML);
            bindPanelEvents();
        }
    }
    
    // 创建工具栏按钮
    function createToolbarButton() {
        // 查找工具栏位置（参考TheWorld插件的设计）
        const toolbar = document.querySelector('.py-2.px-3.flex.items-center.justify-between') || 
                       document.querySelector('.flex.items-center.justify-between') ||
                       document.querySelector('#send_form');
        
        if (toolbar) {
            const buttonHTML = `
                <button id="media-player-btn" style="
                    background: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    padding: 8px 12px;
                    margin-left: 10px;
                    cursor: pointer;
                    font-size: 14px;
                " title="打开媒体播放器">
                    🎵 媒体播放器
                </button>
            `;
            
            toolbar.insertAdjacentHTML('beforeend', buttonHTML);
            
            // 绑定按钮事件
            document.getElementById('media-player-btn').addEventListener('click', togglePanel);
        } else {
            // 备用方案：添加到页面角落
            const floatButton = document.createElement('button');
            floatButton.id = 'media-player-float-btn';
            floatButton.innerHTML = '🎵';
            floatButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #4299e1;
                color: white;
                border: none;
                font-size: 20px;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(floatButton);
            floatButton.addEventListener('click', togglePanel);
        }
    }
    
    // 绑定面板事件
    function bindPanelEvents() {
        // 关闭按钮
        document.getElementById('media-panel-close').addEventListener('click', togglePanel);
        
        // 控制按钮
        document.getElementById('media-prev').addEventListener('click', prevMedia);
        document.getElementById('media-play').addEventListener('click', playMedia);
        document.getElementById('media-next').addEventListener('click', nextMedia);
        
        // 选择框
        document.getElementById('media-select').addEventListener('change', function() {
            currentMediaIndex = this.selectedIndex;
            loadCurrentMedia();
        });
        
        // 添加URL按钮
        document.getElementById('add-media-url').addEventListener('click', addNewMediaUrl);
        
        // 回车添加URL
        document.getElementById('new-media-url').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewMediaUrl();
            }
        });
    }
    
    // 切换面板显示/隐藏
    function togglePanel() {
        const panel = document.getElementById('media-player-panel');
        isPanelOpen = !isPanelOpen;
        
        if (isPanelOpen) {
            panel.style.display = 'flex';
            updateMediaList();
            loadCurrentMedia();
        } else {
            panel.style.display = 'none';
        }
    }
    
    // 更新媒体列表
    function updateMediaList() {
        const select = document.getElementById('media-select');
        select.innerHTML = '';
        
        config.mediaUrls.forEach((url, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `媒体 ${index + 1}: ${url.substring(0, 30)}...`;
            select.appendChild(option);
        });
        
        select.selectedIndex = currentMediaIndex;
    }
    
    // 加载当前媒体
    function loadCurrentMedia() {
        if (config.mediaUrls.length === 0) {
            updateStatus('❌ 没有可用的媒体');
            return;
        }
        
        const url = config.mediaUrls[currentMediaIndex];
        const isVideo = /\.(mp4|webm|ogg|mov|avi)/i.test(url);
        
        const imgElement = document.getElementById('current-media');
        const videoElement = document.getElementById('current-video');
        
        // 隐藏所有媒体元素
        imgElement.style.display = 'none';
        videoElement.style.display = 'none';
        
        if (isVideo) {
            videoElement.src = url;
            videoElement.style.display = 'block';
            updateStatus(`🎥 视频: ${currentMediaIndex + 1}/${config.mediaUrls.length}`);
        } else {
            imgElement.src = url;
            imgElement.style.display = 'block';
            updateStatus(`🖼️ 图片: ${currentMediaIndex + 1}/${config.mediaUrls.length}`);
        }
    }
    
    // 上一个媒体
    function prevMedia() {
        if (config.mediaUrls.length === 0) return;
        
        currentMediaIndex = (currentMediaIndex - 1 + config.mediaUrls.length) % config.mediaUrls.length;
        document.getElementById('media-select').selectedIndex = currentMediaIndex;
        loadCurrentMedia();
    }
    
    // 播放/暂停媒体
    function playMedia() {
        const video = document.getElementById('current-video');
        if (video.style.display !== 'none') {
            if (video.paused) {
                video.play();
                updateStatus('▶️ 播放中...');
            } else {
                video.pause();
                updateStatus('⏸️ 已暂停');
            }
        }
    }
    
    // 下一个媒体
    function nextMedia() {
        if (config.mediaUrls.length === 0) return;
        
        currentMediaIndex = (currentMediaIndex + 1) % config.mediaUrls.length;
        document.getElementById('media-select').selectedIndex = currentMediaIndex;
        loadCurrentMedia();
    }
    
    // 添加新URL
    function addNewMediaUrl() {
        const input = document.getElementById('new-media-url');
        const url = input.value.trim();
        
        if (url && url.startsWith('http')) {
            config.mediaUrls.push(url);
            saveConfig();
            updateMediaList();
            currentMediaIndex = config.mediaUrls.length - 1;
            loadCurrentMedia();
            input.value = '';
            updateStatus('✅ URL添加成功');
        } else {
            updateStatus('❌ 请输入有效的URL');
        }
    }
    
    // 更新状态
    function updateStatus(message) {
        document.getElementById('media-status').textContent = message;
    }
    
    // 保存配置
    function saveConfig() {
        try {
            localStorage.setItem('media_player_config', JSON.stringify(config));
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
    
    // 加载配置
    function loadConfig() {
        try {
            const saved = localStorage.getItem('media_player_config');
            if (saved) {
                config = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置');
        }
    }
    
    // 创建设置面板（简化版）
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🎵 媒体播放器面板 v${PLUGIN_VERSION}</h5>
                <p style="color: #666; font-size: 12px;">点击工具栏按钮打开播放器面板</p>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-enabled" ${config.enabled ? 'checked' : ''}> 启用播放器</label>
                </div>
                
                <div class="form-group">
                    <label>面板位置:</label>
                    <select class="form-control" id="mp-position">
                        <option value="right" ${config.panelPosition === 'right' ? 'selected' : ''}>右侧</option>
                        <option value="left" ${config.panelPosition === 'left' ? 'selected' : ''}>左侧</option>
                        <option value="bottom" ${config.panelPosition === 'bottom' ? 'selected' : ''}>底部</option>
                    </select>
                </div>
                
                <button class="btn btn-sm btn-primary" id="mp-open-now">立即打开播放器</button>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        
        // 绑定设置事件
        $('#mp-enabled').on('change', function() {
            config.enabled = this.checked;
            saveConfig();
            document.getElementById('media-player-btn').style.display = this.checked ? 'block' : 'none';
        });
        
        $('#mp-position').on('change', function() {
            config.panelPosition = this.value;
            saveConfig();
            // 重新创建面板（下次打开时生效）
            document.getElementById('media-player-panel')?.remove();
            createPlayerPanel();
        });
        
        $('#mp-open-now').on('click', function() {
            if (!isPanelOpen) {
                togglePanel();
            }
        });
    }
    
    // 初始化
    function initialize() {
        console.log('🔧 初始化媒体播放器...');
        
        loadConfig();
        createPlayerPanel();
        createToolbarButton();
        createSettingsPanel();
        
        console.log('✅ 媒体播放器初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
