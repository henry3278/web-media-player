// index.js - 修复设置面板和移动端适配版本
(function() {
    console.log('🎵 修复设置面板和移动端适配版本加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '2.5.0';
    
    // 配置
    let config = {
        enabled: true,
        mediaType: 'mixed',
        playMode: 'sequential',
        mediaUrls: [
            'https://picsum.photos/400/300?random=1',
            'https://picsum.photos/400/300?random=2'
        ],
        slideInterval: 3000,
        videoMuted: true,
        playerWidth: 300,
        playerOpacity: 0.95,
        controlsOpacity: 0.9,
        buttonPosition: 'bottom-right'
    };
    
    let currentIndex = 0;
    let isPlayerVisible = false;
    let slideTimer = null;
    let isDraggingPlayer = false;
    let playerDragOffset = { x: 0, y: 0 };
    let isDraggingButton = false;
    let buttonDragOffset = { x: 0, y: 0 };
    let urlValidationCache = new Map();
    let controlsHideTimer = null;
    let isVideoPlaying = false;
    
    // 首先加载CSS
    function loadCSS() {
        if (document.getElementById('media-player-css')) return;
        
        const style = document.createElement('style');
        style.id = 'media-player-css';
        style.textContent = `
            /* 媒体播放器样式 */
            #minimal-player {
                transition: transform 0.3s ease;
                position: fixed;
                background: rgba(0, 0, 0, 0.95);
                border-radius: 12px;
                z-index: 10000;
                display: none;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                cursor: move;
                border: none;
            }
            
            #minimal-player:hover {
                transform: scale(1.02);
            }
            
            #player-content {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            
            #player-img, #player-video {
                max-width: 100%;
                max-height: 80vh;
                object-fit: contain;
                display: none;
            }
            
            /* 视频控制条样式 */
            #video-controls {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                padding: 12px;
                display: none;
                background: rgba(0,0,0,0.8);
                box-sizing: border-box;
                transition: opacity 0.3s ease;
                opacity: 1;
            }
            
            #video-controls.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            .video-controls-inner {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
            }
            
            .video-progress-container {
                position: relative;
                flex: 1;
                height: 8px;
                background: rgba(255,255,255,0.15);
                border-radius: 4px;
                overflow: hidden;
                cursor: pointer;
            }
            
            #video-buffer {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: rgba(255,255,255,0.25);
                border-radius: 4px;
                pointer-events: none;
                z-index: 1;
                width: 0%;
                transition: width 0.3s ease;
            }
            
            #video-played {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                border-radius: 4px;
                pointer-events: none;
                z-index: 2;
                width: 0%;
                transition: width 0.1s ease;
            }
            
            #video-progress {
                -webkit-appearance: none;
                width: 100%;
                height: 100%;
                background: transparent;
                border-radius: 4px;
                outline: none;
                cursor: pointer;
                position: relative;
                z-index: 3;
                margin: 0;
                opacity: 0;
            }
            
            #video-progress::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #ffffff;
                cursor: pointer;
                border: 2px solid #764ba2;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            #video-progress::-webkit-slider-runnable-track {
                width: 100%;
                height: 100%;
                background: transparent;
                border-radius: 4px;
            }
            
            #video-progress::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #ffffff;
                cursor: pointer;
                border: 2px solid #764ba2;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            #video-progress::-moz-range-track {
                width: 100%;
                height: 100%;
                background: transparent;
                border-radius: 4px;
                border: none;
            }
            
            #video-time {
                color: rgba(255,255,255,0.9);
                font-size: 12px;
                min-width: 90px;
                text-align: center;
                font-family: monospace;
                font-weight: 500;
            }
            
            #media-control-btn {
                position: fixed;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                cursor: move;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                user-select: none;
                touch-action: none;
            }
            
            #media-control-btn:active {
                transform: scale(0.95);
            }
            
            .form-control-range {
                width: 100%;
                margin: 10px 0;
            }
            
            .url-status-valid {
                color: #28a745;
                font-weight: bold;
            }
            
            .url-status-invalid {
                color: #dc3545;
                font-weight: bold;
            }
            
            .url-stats {
                font-size: 12px;
                margin-bottom: 10px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            .url-tabs {
                display: flex;
                margin-bottom: 10px;
                border-bottom: 1px solid #dee2e6;
                flex-wrap: wrap;
            }
            
            .url-tab {
                padding: 8px 16px;
                cursor: pointer;
                border: 1px solid transparent;
                border-bottom: none;
                border-radius: 4px 4px 0 0;
                margin-right: 5px;
                background: #f8f9fa;
                transition: all 0.3s ease;
            }
            
            .url-tab:hover {
                background: #e9ecef;
            }
            
            .url-tab.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .url-tab-content {
                display: none;
            }
            
            .url-tab-content.active {
                display: block;
            }
            
            /* 移动端适配 - 修复苹果设备显示问题 */
            @media (max-width: 1024px) {
                #media-control-btn {
                    width: 70px !important;
                    height: 70px !important;
                    font-size: 28px !important;
                    z-index: 10002 !important;
                }
                
                #minimal-player {
                    max-width: 90vw !important;
                    z-index: 10001 !important;
                }
                
                .url-tabs {
                    flex-direction: column;
                }
                
                .url-tab {
                    margin-right: 0;
                    margin-bottom: 2px;
                    border-radius: 4px;
                }
                
                .video-progress-container {
                    height: 12px;
                }
                
                #video-progress::-webkit-slider-thumb {
                    width: 20px;
                    height: 20px;
                }
                
                #video-time {
                    font-size: 11px;
                    min-width: 80px;
                }
            }
            
            @media (max-width: 768px) {
                #media-control-btn {
                    width: 80px !important;
                    height: 80px !important;
                    font-size: 32px !important;
                }
                
                #minimal-player {
                    max-width: 95vw !important;
                }
                
                .video-progress-container {
                    height: 14px;
                }
                
                #video-progress::-webkit-slider-thumb {
                    width: 24px;
                    height: 24px;
                }
            }
            
            @media (max-width: 480px) {
                #media-control-btn {
                    width: 90px !important;
                    height: 90px !important;
                    font-size: 36px !important;
                }
                
                #minimal-player {
                    max-width: 98vw !important;
                }
            }
            
            /* 修复iPad mini 6 (768x1024) 特殊适配 */
            @media (width: 768px) and (height: 1024px) {
                #media-control-btn {
                    width: 75px !important;
                    height: 75px !important;
                    font-size: 30px !important;
                }
            }
            
            /* 修复iPhone 16 Pro Max 特殊适配 */
            @media (max-width: 430px) and (max-height: 932px) {
                #media-control-btn {
                    width: 85px !important;
                    height: 85px !important;
                    font-size: 34px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 显示控制条（仅视频时使用）
    function showControls() {
        const videoControls = document.getElementById('video-controls');
        const video = document.getElementById('player-video');
        
        if (video && video.style.display !== 'none' && videoControls) {
            videoControls.classList.remove('hidden');
            videoControls.style.display = 'flex';
            
            if (controlsHideTimer) {
                clearTimeout(controlsHideTimer);
            }
            
            controlsHideTimer = setTimeout(hideControls, 3000);
        }
    }

    // 隐藏控制条
    function hideControls() {
        const videoControls = document.getElementById('video-controls');
        if (videoControls) {
            videoControls.classList.add('hidden');
            setTimeout(() => {
                if (videoControls.classList.contains('hidden')) {
                    videoControls.style.display = 'none';
                }
            }, 300);
        }
    }

    // 创建播放器
    function createPlayer() {
        // 移除已存在的元素
        const existingPlayer = document.getElementById('minimal-player');
        const existingBtn = document.getElementById('media-control-btn');
        if (existingPlayer) existingPlayer.remove();
        if (existingBtn) existingBtn.remove();
        
        // 获取保存的播放器位置
        const savedPlayerPos = localStorage.getItem('media_player_position');
        let playerStyle = `width: ${config.playerWidth}px;`;
        if (savedPlayerPos) {
            const pos = JSON.parse(savedPlayerPos);
            playerStyle += `left: ${pos.x}px; top: ${pos.y}px; transform: none;`;
        } else {
            playerStyle += 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        }
        
        // 创建播放器HTML
        const playerHTML = `
            <div id="minimal-player" style="${playerStyle}">
                <div id="player-content">
                    <img id="player-img">
                    <video id="player-video"></video>
                </div>
                
                <div id="video-controls" class="hidden">
                    <div class="video-controls-inner">
                        <div class="video-progress-container">
                            <div id="video-buffer"></div>
                            <div id="video-played"></div>
                            <input type="range" id="video-progress" min="0" max="100" value="0">
                        </div>
                        <span id="video-time">0:00 / 0:00</span>
                    </div>
                </div>
            </div>
        `;
        
        // 创建控制按钮 - 修复移动端适配
        const buttonPosition = getButtonPosition();
        const isMobile = window.innerWidth <= 1024; // 扩大移动端判断范围
        const buttonSize = isMobile ? '70px' : '50px';
        const buttonFontSize = isMobile ? '28px' : '20px';
        const buttonPositionStyle = isMobile ? getMobileButtonPosition() : buttonPosition;
        
        const buttonHTML = `
            <div id="media-control-btn" style="
                ${buttonPositionStyle}
                width: ${buttonSize};
                height: ${buttonSize};
                font-size: ${buttonFontSize};
                display: ${config.enabled ? 'flex' : 'none'};
            " title="点击切换媒体播放 | 拖动移动位置">
                🎵
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        bindPlayerEvents();
        bindButtonEvents();
        updateMediaOpacity();
    }

    // 获取移动端按钮位置 - 修复苹果设备适配
    function getMobileButtonPosition() {
        const savedPos = localStorage.getItem('media_button_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            const maxX = window.innerWidth - 80;
            const maxY = window.innerHeight - 80;
            const x = Math.max(20, Math.min(maxX, pos.x));
            const y = Math.max(20, Math.min(maxY, pos.y));
            return `left: ${x}px; top: ${y}px;`;
        }
        return 'bottom: 30px; right: 30px;';
    }

    // 创建设置面板 - 修复设置面板消失问题
    function createSettingsPanel() {
        // 等待扩展设置区域加载
        const checkExtensionsArea = setInterval(() => {
            const extensionsArea = document.getElementById('extensions_settings');
            if (extensionsArea) {
                clearInterval(checkExtensionsArea);
                
                const oldSettings = document.getElementById('media-player-settings');
                if (oldSettings) oldSettings.remove();
                
                const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
                const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
                const otherUrls = config.mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url));
                
                const html = `
                    <div class="list-group-item" id="media-player-settings">
                        <h5>🎵 媒体播放器 v${PLUGIN_VERSION}</h5>
                        <p style="color: #28a745; font-size: 12px;">✅ 插件加载成功 - 修复移动端适配</p>
                        
                        <div class="form-group">
                            <label><input type="checkbox" id="mp-enabled" ${config.enabled ? 'checked' : ''}> 启用播放器</label>
                        </div>
                        
                        <div class="form-group">
                            <label>按钮位置:</label>
                            <select class="form-control" id="mp-button-position">
                                <option value="bottom-right" ${config.buttonPosition === 'bottom-right' ? 'selected' : ''}>右下角</option>
                                <option value="bottom-left" ${config.buttonPosition === 'bottom-left' ? 'selected' : ''}>左下角</option>
                                <option value="top-right" ${config.buttonPosition === 'top-right' ? 'selected' : ''}>右上角</option>
                                <option value="top-left" ${config.buttonPosition === 'top-left' ? 'selected' : ''}>左上角</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>播放器透明度: <span id="opacity-value">${Math.round(config.playerOpacity * 100)}%</span></label>
                            <input type="range" class="form-control-range" id="mp-opacity" min="10" max="100" value="${config.playerOpacity * 100}">
                            <input type="number" class="form-control mt-1" id="mp-opacity-input" min="10" max="100" value="${Math.round(config.playerOpacity * 100)}" style="width: 100px;">
                            <span>%</span>
                        </div>
                        
                        <div class="form-group">
                            <label>控制条透明度: <span id="controls-opacity-value">${Math.round(config.controlsOpacity * 100)}%</span></label>
                            <input type="range" class="form-control-range" id="mp-controls-opacity" min="10" max="100" value="${config.controlsOpacity * 100}">
                            <input type="number" class="form-control mt-1" id="mp-controls-opacity-input" min="10" max="100" value="${Math.round(config.controlsOpacity * 100)}" style="width: 100px;">
                            <span>%</span>
                        </div>
                        
                        <div class="form-group">
                            <label>播放器宽度: <span id="width-value">${config.playerWidth}px</span></label>
                            <input type="range" class="form-control-range" id="mp-width" min="200" max="800" value="${config.playerWidth}">
                            <input type="number" class="form-control mt-1" id="mp-width-input" min="200" max="800" value="${config.playerWidth}" style="width: 100px;">
                            <span>px</span>
                        </div>
                        
                        <div class="form-group">
                            <label>图片切换间隔: <span id="interval-value">${config.slideInterval}ms</span></label>
                            <input type="range" class="form-control-range" id="mp-interval" min="500" max="10000" step="500" value="${config.slideInterval}">
                            <input type="number" class="form-control mt-1" id="mp-interval-input" min="500" max="10000" step="500" value="${config.slideInterval}" style="width: 100px;">
                            <span>ms</span>
                        </div>
                        
                        <div class="form-group">
                            <label>媒体类型:</label>
                            <select class="form-control" id="mp-media-type">
                                <option value="mixed" ${config.mediaType === 'mixed' ? 'selected' : ''}>混合模式</option>
                                <option value="image" ${config.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                                <option value="video" ${config.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>播放模式:</label>
                            <select class="form-control" id="mp-play-mode">
                                <option value="sequential" ${config.playMode === 'sequential' ? 'selected' : ''}>顺序播放</option>
                                <option value="random" ${config.playMode === 'random' ? 'selected' : ''}>随机播放</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><input type="checkbox" id="mp-muted" ${config.videoMuted ? 'checked' : ''}> 视频静音播放</label>
                        </div>
                        
                        <!-- URL管理区域 -->
                        <div class="form-group">
                            <label>媒体URL管理</label>
                            <div class="url-stats" id="url-stats">
                                <div>总计: ${config.mediaUrls.length}个URL</div>
                                <div>图片: ${imageUrls.length}个 | 视频: ${videoUrls.length}个 | 其他: ${otherUrls.length}个</div>
                                <div id="validation-stats">点击"检测URL"验证可用性</div>
                            </div>
                            
                            <div class="url-tabs">
                                <div class="url-tab active" data-tab="all">全部URL</div>
                                <div class="url-tab" data-tab="images">图片</div>
                                <div class="url-tab" data-tab="videos">视频</div>
                            </div>
                            
                            <div class="url-tab-content active" id="tab-all">
                                <textarea class="form-control" id="mp-urls" rows="5" placeholder="每行一个URL" style="font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                            </div>
                            
                            <div class="url-tab-content" id="tab-images">
                                <textarea class="form-control" id="mp-urls-images" rows="3" placeholder="图片URL" style="font-size: 12px;">${imageUrls.join('\n')}</textarea>
                            </div>
                            
                            <div class="url-tab-content" id="tab-videos">
                                <textarea class="form-control" id="mp-urls-videos" rows="3" placeholder="视频URL" style="font-size: 12px;">${videoUrls.join('\n')}</textarea>
                            </div>
                            
                            <div class="btn-group mt-2">
                                <button class="btn btn-sm btn-info" id="mp-validate-urls">检测URL</button>
                                <button class="btn btn-sm btn-warning" id="mp-clear-invalid">清除失效URL</button>
                                <button class="btn btn-sm btn-success" id="mp-export-urls">导出URL</button>
                            </div>
                            
                            <div class="mt-2">
                                <label>批量导入URL:</label>
                                <textarea class="form-control" id="mp-import-text" rows="3" placeholder="粘贴URL列表，每行一个URL，自动去重" style="font-size: 12px;"></textarea>
                                <div class="btn-group mt-1 w-100">
                                    <button class="btn btn-sm btn-primary" id="mp-import-append">追加导入</button>
                                    <button class="btn btn-sm btn-danger" id="mp-import-replace">覆盖导入</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-group mt-3">
                            <button class="btn btn-sm btn-success" id="mp-save">保存设置</button>
                            <button class="btn btn-sm btn-primary" id="mp-test">测试播放</button>
                            <button class="btn btn-sm btn-secondary" id="mp-reset-btn">重置按钮位置</button>
                            <button class="btn btn-sm btn-outline-secondary" id="mp-reset-player-pos">重置播放器位置</button>
                        </div>
                        
                        <div id="mp-status" style="margin-top: 10px; font-size: 12px;"></div>
                    </div>
                `;
                
                extensionsArea.insertAdjacentHTML('beforeend', html);
                bindSettingsEvents();
            }
        }, 100);
    }

    // 绑定设置事件
    function bindSettingsEvents() {
        // 启用开关
        $('#mp-enabled').on('change', function() {
            config.enabled = this.checked;
            const btn = document.getElementById('media-control-btn');
            if (btn) btn.style.display = this.checked ? 'flex' : 'none';
            if (!this.checked && isPlayerVisible) togglePlayer();
            saveConfig();
            showStatus('设置已更新');
        });
        
        // 按钮位置
        $('#mp-button-position').on('change', function() {
            config.buttonPosition = this.value;
            localStorage.removeItem('media_button_position');
            createPlayer();
            saveConfig();
            showStatus('按钮位置已更新');
        });
        
        // 其他设置事件绑定保持不变...
        // ... (这里省略其他设置事件绑定代码，保持与之前相同)
    }

    // 初始化
    function initialize() {
        console.log('🔧 初始化修复版本...');
        
        // 首先加载CSS
        loadCSS();
        
        loadConfig();
        createPlayer();
        
        // 延迟创建设置面板，确保页面完全加载
        setTimeout(createSettingsPanel, 500);
        
        // 窗口大小变化时重新定位
        window.addEventListener('resize', function() {
            createPlayer();
        });
        
        console.log('✅ 修复版本初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // 其他辅助函数保持不变...
    // ... (这里省略其他辅助函数，保持与之前相同)
    
})();
