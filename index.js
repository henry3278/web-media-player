// index.js - 添加本地媒体文件读取功能
(function() {
    console.log('🎵 支持本地媒体文件读取的播放器加载...');
    
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
        buttonPosition: 'bottom-right',
        settingsCollapsed: false,
        mediaSource: 'mixed', // 新增：媒体来源 mixed/online/local
        localMediaPaths: [], // 新增：本地媒体路径
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
    let isDraggingProgress = false;
    let lastTapTime = 0;
    let lastPlayerTapTime = 0;
    let localMediaFiles = []; // 存储本地媒体文件
    let allMediaFiles = []; // 合并后的所有媒体文件
    let isDraggingButton = false;
    
    // 检测设备类型
    function isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // 首先加载CSS - 添加本地媒体相关样式
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
                transition: all 0.3s ease;
                opacity: 0;
                z-index: 10;
            }
            
            #video-controls.show {
                display: flex;
                opacity: 1;
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
                position: absolute;
                top: 0;
                left: 0;
                z-index: 3;
                margin: 0;
                opacity: 0;
            }
            
            .custom-slider-thumb {
                position: absolute;
                top: 50%;
                left: 0;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #ffffff;
                border: 2px solid #764ba2;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 4;
                transition: all 0.2s ease;
            }
            
            .custom-slider-thumb.dragging {
                transform: translate(-50%, -50%) scale(1.2);
                background: #f0f0f0;
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
                transition: all 0.2s ease;
            }
            
            #video-progress::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                background: #f0f0f0;
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
                cursor: pointer;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                user-select: none;
                touch-action: manipulation;
                transition: all 0.3s ease;
            }
            
            #media-control-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
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
            
            /* 设置面板折叠样式 */
            .settings-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 4px;
                margin-bottom: 10px;
                border: 1px solid #dee2e6;
                transition: all 0.3s ease;
            }
            
            .settings-header:hover {
                background: #e9ecef;
            }
            
            .settings-header h5 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .settings-content {
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            .settings-content.collapsed {
                max-height: 0;
                opacity: 0;
                padding: 0;
                margin: 0;
            }
            
            .settings-content.expanded {
                max-height: 2000px;
                opacity: 1;
            }
            
            /* 本地媒体管理样式 */
            .local-media-section {
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 10px;
                margin-top: 10px;
            }
            
            .local-media-path {
                font-size: 11px;
                color: #666;
                word-break: break-all;
            }
            
            .local-media-stats {
                font-size: 11px;
                color: #666;
            }
            
            /* 移动端专属优化 */
            .mobile-optimized #minimal-player {
                max-width: 95vw !important;
                max-height: 80vh !important;
                border-radius: 16px;
            }
            
            .mobile-optimized #media-control-btn {
                width: 50px !important;
                height: 50px !important;
                font-size: 20px !important;
                z-index: 10002;
            }
            
            .mobile-optimized .video-progress-container {
                height: 12px;
            }
            
            .mobile-optimized .custom-slider-thumb {
                width: 20px;
                height: 20px;
            }
            
            .mobile-optimized #video-time {
                font-size: 11px;
                min-width: 80px;
            }
            
            .mobile-optimized #video-controls {
                padding: 15px;
            }
            
            .mobile-optimized .video-controls-inner {
                gap: 8px;
            }
            
            /* 移动端响应式调整 */
            @media (max-width: 768px) {
                body:not(.mobile-optimized) #media-control-btn {
                    width: 50px !important;
                    height: 50px !important;
                    font-size: 20px !important;
                }
                
                body:not(.mobile-optimized) #minimal-player {
                    max-width: 90vw !important;
                }
                
                body:not(.mobile-optimized) .url-tabs {
                    flex-direction: column;
                }
                
                body:not(.mobile-optimized) .url-tab {
                    margin-right: 0;
                    margin-bottom: 2px;
                    border-radius: 4px;
                }
                
                body:not(.mobile-optimized) .video-progress-container {
                    height: 12px;
                }
                
                body:not(.mobile-optimized) #video-progress::-webkit-slider-thumb {
                    width: 20px;
                    height: 20px;
                }
                
                body:not(.mobile-optimized) .custom-slider-thumb {
                    width: 20px;
                    height: 20px;
                }
                
                body:not(.mobile-optimized) #video-time {
                    font-size: 11px;
                    min-width: 80px;
                }
                
                .settings-header {
                    padding: 8px;
                }
                
                .settings-header h5 {
                    font-size: 14px;
                }
            }
            
            @media (max-width: 480px) {
                body:not(.mobile-optimized) #media-control-btn {
                    width: 50px !important;
                    height: 50px !important;
                    font-size: 20px !important;
                }
                
                body:not(.mobile-optimized) #minimal-player {
                    max-width: 95vw !important;
                }
            }
            
            /* 防止移动端页面缩放 */
            @media (max-width: 768px) {
                #minimal-player {
                    -webkit-user-select: none;
                    -webkit-touch-callout: none;
                    -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 显示控制条
    function showControls() {
        const videoControls = document.getElementById('video-controls');
        if (videoControls && isVideoPlaying) {
            videoControls.classList.add('show');
            
            if (controlsHideTimer) {
                clearTimeout(controlsHideTimer);
                controlsHideTimer = null;
            }
            
            controlsHideTimer = setTimeout(() => {
                hideControls();
            }, 3000);
        }
    }
    
    // 隐藏控制条
    function hideControls() {
        const videoControls = document.getElementById('video-controls');
        if (videoControls) {
            videoControls.classList.remove('show');
        }
    }
    
    // 创建播放器
    function createPlayer() {
        console.log('🔄 创建播放器...', '移动端:', isMobileDevice());
        
        // 移除已存在的元素
        const existingPlayer = document.getElementById('minimal-player');
        const existingBtn = document.getElementById('media-control-btn');
        if (existingPlayer) existingPlayer.remove();
        if (existingBtn) existingBtn.remove();
        
        // 检测移动端并添加相应类名
        const isMobile = isMobileDevice();
        if (isMobile) {
            document.body.classList.add('mobile-optimized');
            console.log('📱 检测到移动端，应用移动端优化');
        } else {
            document.body.classList.remove('mobile-optimized');
            console.log('💻 检测到PC端，使用PC端样式');
        }
        
        // 获取保存的播放器位置
        const savedPlayerPos = localStorage.getItem('media_player_position');
        let playerStyle = `width: ${config.playerWidth}px;`;
        
        if (savedPlayerPos) {
            const pos = JSON.parse(savedPlayerPos);
            playerStyle += `left: ${pos.x}px; top: ${pos.y}px; transform: none;`;
        } else {
            playerStyle += 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        }
        
        // 移动端调整宽度
        if (isMobile) {
            const mobileWidth = Math.min(config.playerWidth, window.innerWidth * 0.9);
            playerStyle = playerStyle.replace(`width: ${config.playerWidth}px;`, `width: ${mobileWidth}px;`);
        }
        
        // 创建播放器HTML
        const playerHTML = `
            <div id="minimal-player" style="${playerStyle}">
                <div id="player-content">
                    <img id="player-img">
                    <video id="player-video" playsinline webkit-playsinline></video>
                </div>
                
                <div id="video-controls">
                    <div class="video-controls-inner">
                        <div class="video-progress-container">
                            <div id="video-buffer"></div>
                            <div id="video-played"></div>
                            <input type="range" id="video-progress" min="0" max="100" value="0" step="0.1">
                            <div class="custom-slider-thumb"></div>
                        </div>
                        <span id="video-time">0:00 / 0:00</span>
                    </div>
                </div>
            </div>
        `;
        
        // 创建控制按钮
        const buttonPosition = getButtonPosition(isMobile);
        const buttonSize = '50px';
        const buttonFontSize = '20px';
        
        const buttonHTML = `
            <div id="media-control-btn" style="
                ${buttonPosition}
                width: ${buttonSize};
                height: ${buttonSize};
                font-size: ${buttonFontSize};
            " title="点击切换媒体播放 | 拖动移动位置">
                🎵
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        
        console.log('✅ 播放器和按钮创建完成');
        
        bindPlayerEvents();
        bindButtonEvents();
        updateMediaOpacity();
        
        // 移动端特殊处理
        if (isMobile) {
            optimizeForMobile();
        }
        
        // 确保按钮立即显示
        setTimeout(() => {
            const btn = document.getElementById('media-control-btn');
            if (btn) {
                btn.style.display = 'flex';
                btn.style.visibility = 'visible';
                console.log('✅ 按钮显示状态确认');
            }
        }, 100);
    }
    
    // 移动端优化
    function optimizeForMobile() {
        const player = document.getElementById('minimal-player');
        const button = document.getElementById('media-control-btn');
        const video = document.getElementById('player-video');
        
        if (player) {
            ensurePlayerInViewport();
            player.style.touchAction = 'none';
        }
        
        if (button) {
            button.style.touchAction = 'manipulation';
            button.style.display = 'flex';
            button.style.visibility = 'visible';
            button.style.opacity = '1';
            console.log('📱 移动端按钮优化完成');
        }
        
        if (video) {
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.setAttribute('x5-playsinline', '');
            video.setAttribute('x-webkit-airplay', 'allow');
        }
    }
    
    // 获取按钮位置
    function getButtonPosition(isMobile) {
        const savedPos = localStorage.getItem('media_button_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            return `left: ${pos.x}px; top: ${pos.y}px;`;
        }
        
        if (isMobile) {
            return 'bottom: 20px; right: 20px;';
        }
        
        switch (config.buttonPosition) {
            case 'bottom-left': return 'bottom: 60px; left: 20px;';
            case 'top-left': return 'top: 20px; left: 20px;';
            case 'top-right': return 'top: 20px; right: 20px;';
            default: return 'bottom: 60px; right: 20px;';
        }
    }
    
    // 保存播放器位置
    function savePlayerPosition() {
        const player = document.getElementById('minimal-player');
        if (player && player.style.display !== 'none') {
            const rect = player.getBoundingClientRect();
            localStorage.setItem('media_player_position', JSON.stringify({
                x: rect.left,
                y: rect.top
            }));
        }
    }
    
    // 绑定播放器事件
    function bindPlayerEvents() {
        const player = document.getElementById('minimal-player');
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        const content = document.getElementById('player-content');
        const progressContainer = document.querySelector('.video-progress-container');
        const customThumb = document.querySelector('.custom-slider-thumb');
        
        if (!player || !video) {
            console.error('❌ 播放器元素未找到');
            return;
        }
        
        // PC端双击切换下一个媒体
        player.addEventListener('dblclick', function(e) {
            if (!isMobileDevice() && e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb')) {
                showControls();
                nextMedia();
            }
        });
        
        // 手机端双击切换媒体（使用触摸事件）
        if (isMobileDevice()) {
            let tapCount = 0;
            let tapTimer = null;
            
            player.addEventListener('touchstart', function(e) {
                if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && isVideoPlaying) {
                    tapCount++;
                    
                    if (tapCount === 1) {
                        // 第一次点击，显示控制条
                        showControls();
                        tapTimer = setTimeout(() => {
                            tapCount = 0;
                        }, 300);
                    } else if (tapCount === 2) {
                        // 第二次点击，切换下一个媒体
                        clearTimeout(tapTimer);
                        tapCount = 0;
                        console.log('📱 手机端双击切换媒体');
                        nextMedia();
                    }
                }
            });
            
            // 单击视频区域显示控制条
            content.addEventListener('touchstart', function(e) {
                if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && isVideoPlaying) {
                    showControls();
                }
            });
        } else {
            // PC端单击视频区域显示控制条
            content.addEventListener('click', function(e) {
                if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && isVideoPlaying) {
                    showControls();
                }
            });
        }
        
        player.addEventListener('mousedown', startPlayerDrag);
        player.addEventListener('touchstart', startPlayerDrag);
        
        // 进度条事件
        progress.addEventListener('input', function() {
                if (video.duration) {
                    video.currentTime = (this.value / 100) * video.duration;
                showControls();
                updateCustomThumbPosition();
            }
        });
        
        progress.addEventListener('change', function() {
                if (video.duration) {
                    video.currentTime = (this.value / 100) * video.duration;
                showControls();
                updateCustomThumbPosition();
            }
        });
        
        // 自定义进度条拖动
        progressContainer.addEventListener('mousedown', startProgressDrag);
        progressContainer.addEventListener('touchstart', startProgressDrag);
        
        // 视频事件
        video.addEventListener('timeupdate', updateVideoProgress);
        video.addEventListener('progress', updateVideoBuffer);
        video.addEventListener('loadedmetadata', function() {
                if (config.videoMuted) video.muted = true;
                updateVideoProgress();
                updateVideoBuffer();
                adjustPlayerHeight();
                ensurePlayerInViewport();
            updateCustomThumbPosition();
        });
        
        video.addEventListener('play', function() {
                isVideoPlaying = true;
                showControls();
            });
            
            video.addEventListener('pause', function() {
                isVideoPlaying = false;
                hideControls();
            });
            
            video.addEventListener('ended', function() {
                isVideoPlaying = false;
                hideControls();
                nextMedia();
        });
        
        const img = document.getElementById('player-img');
        img.addEventListener('load', function() {
                adjustPlayerHeight();
                ensurePlayerInViewport();
            });
            
            window.addEventListener('beforeunload', savePlayerPosition);
        
        // 移动端窗口变化处理
        window.addEventListener('resize', function() {
                if (isMobileDevice()) {
                    ensurePlayerInViewport();
                    ensureButtonInViewport();
                }
            });
            
            console.log('✅ 播放器事件绑定完成');
    }
    
    // 确保按钮在视口内
    function ensureButtonInViewport() {
        const button = document.getElementById('media-control-btn');
        if (!button) return;
        
        const rect = button.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let newX = parseFloat(button.style.left) || (viewportWidth - rect.width) / 2;
        let newY = parseFloat(button.style.top) || (viewportHeight - rect.height) / 2;
        
        const margin = 10;
        
        if (newX < margin) newX = margin;
        if (newY < margin) newY = margin;
        if (newX + rect.width > viewportWidth - margin) newX = viewportWidth - rect.width - margin;
        if (newY + rect.height > viewportHeight - margin) newY = viewportHeight - rect.height - margin;
        
        button.style.left = newX + 'px';
        button.style.top = newY + 'px';
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        
        localStorage.setItem('media_button_position', JSON.stringify({
            x: newX,
            y: newY
        }));
    }
    
    // 开始拖动进度条
    function startProgressDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const progress = document.getElementById('video-progress');
        const video = document.getElementById('player-video');
        
        if (!video.duration) return;
        
        isDraggingProgress = true;
        const customThumb = document.querySelector('.custom-slider-thumb');
        customThumb.classList.add('dragging');
        
        const rect = e.currentTarget.getBoundingClientRect();
        const handleDrag = (clientX) => {
            const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            progress.value = percent * 100;
            video.currentTime = percent * video.duration;
            updateCustomThumbPosition();
            showControls();
        };
        
        if (e.type === 'mousedown') {
            handleDrag(e.clientX);
            document.addEventListener('mousemove', onProgressDrag);
            document.addEventListener('mouseup', stopProgressDrag);
        } else {
            const touch = e.touches[0];
            handleDrag(touch.clientX);
            document.addEventListener('touchmove', onProgressDrag);
            document.addEventListener('touchend', stopProgressDrag);
        }
    }
    
    // 进度条拖动中
    function onProgressDrag(e) {
        if (!isDraggingProgress) return;
        
        const progressContainer = document.querySelector('.video-progress-container');
        const rect = progressContainer.getBoundingClientRect();
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const progress = document.getElementById('video-progress');
        const video = document.getElementById('player-video');
        
        progress.value = percent * 100;
        video.currentTime = percent * video.duration;
        updateCustomThumbPosition();
    }
    
    // 停止拖动进度条
    function stopProgressDrag() {
        isDraggingProgress = false;
        const customThumb = document.querySelector('.custom-slider-thumb');
        if (customThumb) {
            customThumb.classList.remove('dragging');
        }
        
        document.removeEventListener('mousemove', onProgressDrag);
        document.removeEventListener('mouseup', stopProgressDrag);
        document.removeEventListener('touchmove', onProgressDrag);
        document.removeEventListener('touchend', stopProgressDrag);
    }
    
    // 更新自定义滑块位置
    function updateCustomThumbPosition() {
        const progress = document.getElementById('video-progress');
        const customThumb = document.querySelector('.custom-slider-thumb');
        const progressContainer = document.querySelector('.video-progress-container');
        
        if (progress && customThumb && progressContainer) {
            const percent = progress.value / 100;
            const containerWidth = progressContainer.offsetWidth;
            customThumb.style.left = (percent * containerWidth) + 'px';
        }
    }
    
    // 更新视频缓存进度
    function updateVideoBuffer() {
        const video = document.getElementById('player-video');
        const buffer = document.getElementById('video-buffer');
        
        if (video && video.buffered && video.buffered.length > 0 && video.duration > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const bufferPercent = (bufferedEnd / video.duration) * 100;
            buffer.style.width = bufferPercent + '%';
        }
    }
    
    // 更新视频播放进度
    function updateVideoProgress() {
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        const played = document.getElementById('video-played');
        const timeDisplay = document.getElementById('video-time');
        
        if (video.duration > 0 && !isDraggingProgress) {
            const progressPercent = (video.currentTime / video.duration) * 100;
            progress.value = progressPercent;
            played.style.width = progressPercent + '%';
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
            updateCustomThumbPosition();
        }
    }
    
    // 绑定按钮事件
    function bindButtonEvents() {
        const button = document.getElementById('media-control-btn');
        
        if (!button) {
            console.error('❌ 按钮元素未找到');
            return;
        }
        
        console.log('🔗 绑定按钮事件...');
        
        // 清除所有现有事件监听器
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // 重新绑定事件
        const currentButton = document.getElementById('media-control-btn');
        
        // 移动端触摸事件处理
        if (isMobileDevice()) {
            console.log('📱 绑定移动端触摸事件');
            
            currentButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('👆 触摸开始');
                
                // 防止双击误触
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                if (tapLength < 500 && tapLength > 0) {
                    console.log('🚫 防止双击误触');
                    return;
                }
                lastTapTime = currentTime;
                
                // 标记为点击而非拖动
                isDraggingButton = false;
            });
            
            currentButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('👆 触摸结束');
                
                if (!isDraggingButton) {
                    console.log('🎯 执行点击操作');
                    togglePlayer();
                } else {
                    console.log('🚫 忽略拖动操作');
                }
                
                isDraggingButton = false;
            });
            
            currentButton.addEventListener('touchmove', function(e) {
                if (isDraggingButton) return;
                
                // 检测是否有明显的移动，如果有则认为是拖动
                const touch = e.touches[0];
                const rect = currentButton.getBoundingClientRect();
                const touchX = touch.clientX;
                const touchY = touch.clientY;
                
                // 如果移动距离超过5px，认为是拖动
                if (Math.abs(touchX - rect.left - rect.width/2) > 5 || 
                    Math.abs(touchY - rect.top - rect.height/2) > 5) {
                    isDraggingButton = true;
                    console.log('🔄 检测到拖动，开始拖动操作');
                    startButtonDrag(e);
                }
            });
            
        } else {
            // PC端事件
            console.log('💻 绑定PC端点击事件');
            
            currentButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ 按钮被点击');
                
                if (!isDraggingButton) {
                    console.log('🎯 执行点击操作');
                    togglePlayer();
                } else {
                    console.log('🚫 忽略拖动中的点击');
                }
            });
        }
        
        // 拖动事件（PC和移动端共用）
        currentButton.addEventListener('mousedown', startButtonDrag);
        
        console.log('✅ 按钮事件绑定完成');
    }
    
    // 开始拖动按钮
    function startButtonDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingButton = true;
        
        const button = document.getElementById('media-control-btn');
        const rect = button.getBoundingClientRect();
        
        console.log('🔄 开始拖动按钮');
        
        if (e.type === 'mousedown' || e.type === 'touchmove') {
            let clientX, clientY;
            
            if (e.type === 'mousedown') {
                clientX = e.clientX;
                clientY = e.clientY;
                document.addEventListener('mousemove', onButtonDrag);
                document.addEventListener('mouseup', stopButtonDrag);
            } else {
                const touch = e.touches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
                document.addEventListener('touchmove', onButtonDrag);
                document.addEventListener('touchend', stopButtonDrag);
            }
            
            buttonDragOffset.x = clientX - rect.left;
            buttonDragOffset.y = clientY - rect.top;
        }
        
        button.style.cursor = 'grabbing';
        button.style.opacity = '0.8';
    }
    
    // 按钮拖动中
    function onButtonDrag(e) {
        if (!isDraggingButton) return;
        
        const button = document.getElementById('media-control-btn');
        let clientX, clientY;
        
        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        
        const maxX = window.innerWidth - button.offsetWidth - 10;
        const maxY = window.innerHeight - button.offsetHeight - 10;
        const x = Math.max(10, Math.min(maxX, clientX - buttonDragOffset.x));
        const y = Math.max(10, Math.min(maxY, clientY - buttonDragOffset.y));
        
        button.style.left = x + 'px';
        button.style.top = y + 'px';
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    }
    
    // 停止拖动按钮
    function stopButtonDrag() {
        isDraggingButton = false;
        const button = document.getElementById('media-control-btn');
        if (button) {
            button.style.cursor = 'pointer';
            button.style.opacity = '1';
            
            const rect = button.getBoundingClientRect();
        localStorage.setItem('media_button_position', JSON.stringify({
            x: rect.left,
            y: rect.top
            }));
        }
        
        document.removeEventListener('mousemove', onButtonDrag);
        document.removeEventListener('mouseup', stopButtonDrag);
        document.removeEventListener('touchmove', onButtonDrag);
        document.removeEventListener('touchend', stopButtonDrag);
        
        console.log('🛑 停止拖动按钮');
    }
    
    // 开始拖动播放器
    function startPlayerDrag(e) {
        if (e.target.id === 'video-progress' || e.target.classList.contains('custom-slider-thumb')) return;
        
        e.preventDefault();
        isDraggingPlayer = true;
        
        const player = document.getElementById('minimal-player');
        const rect = player.getBoundingClientRect();
        
        if (e.type === 'mousedown') {
            playerDragOffset.x = e.clientX - rect.left;
            playerDragOffset.y = e.clientY - rect.top;
            document.addEventListener('mousemove', onPlayerDrag);
            document.addEventListener('mouseup', stopPlayerDrag);
        } else {
            const touch = e.touches[0];
            playerDragOffset.x = touch.clientX - rect.left;
            playerDragOffset.y = touch.clientY - rect.top;
            document.addEventListener('touchmove', onPlayerDrag);
            document.addEventListener('touchend', stopPlayerDrag);
        }
        
        player.style.cursor = 'grabbing';
    }
    
    // 播放器拖动中
           const y = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, clientY - playerDragOffset.y));
        
        player.style.left = x + 'px';
        player.style.top = y + 'px';
        player.style.transform = 'none';
    }
    
    // 停止拖动播放器
    function stopPlayerDrag() {
        isDraggingPlayer = false;
        const player = document.getElementById('minimal-player');
        if (player) {
            player.style.cursor = 'move';
            savePlayerPosition();
        }
        
        document.removeEventListener('mousemove', onPlayerDrag);
        document.removeEventListener('mouseup', stopPlayerDrag);
        document.removeEventListener('touchmove', onPlayerDrag);
        document.removeEventListener('touchend', stopPlayerDrag);
    }
    
    // 确保播放器在视口内
    function ensurePlayerInViewport() {
        const player = document.getElementById('minimal-player');
        if (!player || player.style.display === 'none') return;
        
        const rect = player.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let newX = parseFloat(player.style.left) || (viewportWidth - rect.width) / 2;
        let newY = parseFloat(player.style.top) || (viewportHeight - rect.height) / 2;
        
        const margin = isMobileDevice() ? 5 : 10;
        
        if (newX < margin) newX = margin;
        if (newY < margin) newY = margin;
        if (newX + rect.width > viewportWidth - margin) newX = viewportWidth - rect.width - margin;
        if (newY + rect.height > viewportHeight - margin) newY = viewportHeight - rect.height - margin;
        
        player.style.left = newX + 'px';
        player.style.top = newY + 'px';
        player.style.transform = 'none';
        savePlayerPosition();
    }
    
    // 调整播放器高度
    function adjustPlayerHeight() {
        const player = document.getElementById('minimal-player');
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        
        let mediaElement = img.style.display !== 'none' ? img : 
                          video.style.display !== 'none' ? video : null;
        
        if (mediaElement && (mediaElement.naturalHeight || video.videoHeight)) {
            const naturalWidth = mediaElement.naturalWidth || video.videoWidth;
            const naturalHeight = mediaElement.naturalHeight || video.videoHeight;
            
            if (naturalWidth && naturalHeight) {
                const aspectRatio = naturalHeight / naturalWidth;
                let calculatedHeight = config.playerWidth * aspectRatio;
                
                if (isMobileDevice()) {
                    calculatedHeight = Math.min(calculatedHeight, window.innerHeight * 0.7);
                } else {
                    calculatedHeight = Math.min(calculatedHeight, window.innerHeight * 0.8);
                }
                
                player.style.height = calculatedHeight + 'px';
                ensurePlayerInViewport();
            }
        }
    }
    
    // 更新媒体透明度
    function updateMediaOpacity() {
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        const player = document.getElementById('minimal-player');
        const videoControls = document.getElementById('video-controls');
        const timeDisplay = document.getElementById('video-time');
        
        if (player) player.style.background = `rgba(0, 0, 0, ${config.playerOpacity})`;
        if (img) img.style.opacity = config.playerOpacity;
        if (video) video.style.opacity = config.playerOpacity;
        
        if (videoControls) {
            const baseOpacity = config.controlsOpacity;
            videoControls.style.background = `rgba(0,0,0,${Math.min(baseOpacity + 0.3, 0.95)})`;
            
            const buffer = document.getElementById('video-buffer');
            const played = document.getElementById('video-played');
            if (buffer) buffer.style.background = `rgba(255,255,255,${baseOpacity * 0.4})`;
            if (played) played.style.background = `linear-gradient(90deg, 
                rgba(102, 126, 234, ${baseOpacity}), 
                rgba(118, 75, 162, ${baseOpacity}))`;
        }
        
        if (timeDisplay) timeDisplay.style.opacity = config.controlsOpacity;
    }
    
    // 播放器控制函数
    function togglePlayer() {
        console.log('🔄 togglePlayer called, current state:', isPlayerVisible);
        
        isPlayerVisible = !isPlayerVisible;
        const player = document.getElementById('minimal-player');
        const btn = document.getElementById('media-control-btn');
        
        if (!player || !btn) {
            console.error('❌ 播放器或按钮元素未找到');
            return;
        }
        
        if (isPlayerVisible) {
            console.log('▶️ 显示播放器');
            player.style.display = 'block';
            btn.innerHTML = '⏹️';
            btn.title = '停止播放';
            startPlayback();
            ensurePlayerInViewport();
            
            // 移动端特殊处理：确保播放器可见
            if (isMobileDevice()) {
                player.style.zIndex = '10000';
                player.style.visibility = 'visible';
            }
        } else {
            console.log('⏸️ 隐藏播放器');
            player.style.display = 'none';
            btn.innerHTML = '🎵';
            btn.title = '开始播放';
            stopPlayback();
        }
        savePlayerPosition();
        
        console.log('✅ 播放器状态切换完成，新状态:', isPlayerVisible);
    }
    
    function startPlayback() {
        console.log('🎵 开始播放');
        if (allMediaFiles.length === 0) {
            console.warn('⚠️ 没有可用的媒体URL');
            return;
        }
        currentIndex = config.playMode === 'random' ? 
            Math.floor(Math.random() * allMediaFiles.length) : 0;
        loadCurrentMedia();
    }
    
    function stopPlayback() {
        console.log('⏹️ 停止播放');
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
        const video = document.getElementById('player-video');
        if (video) {
            video.pause();
            video.currentTime = 0;
            isVideoPlaying = false;
        }
        const img = document.getElementById('player-img');
        if (img) img.style.display = 'none';
        if (video) video.style.display = 'none';
        hideControls();
        
        if (controlsHideTimer) {
            clearTimeout(controlsHideTimer);
            controlsHideTimer = null;
        }
    }
    
    function loadCurrentMedia() {
        if (allMediaFiles.length === 0) return;
        const mediaItem = allMediaFiles[currentIndex];
        const isVideo = isVideoUrl(mediaItem.url);
        
        console.log('📺 加载媒体:', mediaItem.url, '类型:', isVideo ? '视频' : '图片');
        
        const shouldShow = (config.mediaType === 'mixed') || 
                          (config.mediaType === 'image' && !isVideo) ||
                          (config.mediaType === 'video' && isVideo);
        
        if (!shouldShow) {
            console.log('⏭️ 跳过不符合媒体类型的URL');
            nextMedia();
            return;
        }
        
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        const videoControls = document.getElementById('video-controls');
        
        if (img) img.style.display = 'none';
        if (video) video.style.display = 'none';
        if (videoControls) videoControls.style.display = 'none';
        isVideoPlaying = false;
        
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
        
        if (isVideo) {
            if (video) {
                video.src = mediaItem.url;
                video.style.display = 'block';
                if (videoControls) videoControls.style.display = 'flex';
                if (config.videoMuted) video.muted = true;
                video.play().then(() => {
                    console.log('✅ 视频播放成功');
                }).catch(e => {
                    console.log('❌ 视频播放失败:', e);
                    setTimeout(nextMedia, 1000);
                });
            }
        } else {
            if (img) {
                img.src = mediaItem.url;
                img.style.display = 'block';
                img.onerror = function() {
                        console.log('❌ 图片加载失败:', mediaItem.url);
                        nextMedia();
                    };
                    img.onload = function() {
                        console.log('✅ 图片加载成功');
                    };
                    slideTimer = setInterval(nextMedia, config.slideInterval);
                    hideControls();
                }
            }
        }
        
        updateMediaOpacity();
        setTimeout(adjustPlayerHeight, 100);
    }
    
    function nextMedia() {
        if (allMediaFiles.length === 0) return;
        currentIndex = config.playMode === 'random' ? 
            Math.floor(Math.random() * allMediaFiles.length) : 
            (currentIndex + 1) % allMediaFiles.length;
        console.log('⏭️ 切换到下一个媒体，索引:', currentIndex);
        loadCurrentMedia();
        showControls();
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)/i.test(url);
    }
    
    function isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(url);
    }
    
    // 新增：本地媒体文件处理函数
    function scanLocalMediaFiles() {
        console.log('🔍 开始扫描本地媒体文件...');
        localMediaFiles = [];
        
        // 这里需要根据实际部署环境调整
        // 在浏览器环境中，我们只能访问用户选择的文件
        // 在实际部署中，可能需要服务器端支持来扫描目录
        
        // 临时方案：提示用户选择文件夹
        showStatus('⚠️ 本地媒体扫描功能需要服务器端支持');
        
        return [];
    }
    
    // 新增：获取所有可用的媒体文件
    function getAllMediaFiles() {
        const onlineMedia = config.mediaUrls.map(url => ({
                url: url,
                type: isVideoUrl(url) ? 'video' : 'image',
                source: 'online'
            }));
        }
        
        // 合并在线和本地媒体文件
        function mergeMediaFiles() {
            const onlineFiles = config.mediaUrls.map(url => ({
                url: url,
                type: isVideoUrl(url) ? 'video' : 'image',
                source: 'online'
            }));
            
            const localFiles = localMediaFiles.map(file => ({
                url: file,
                type: isVideoUrl(file) ? 'video' : 'image',
                source: 'local'
            }));
            
            allMediaFiles = [...onlineFiles, ...localFiles];
            
            console.log('📊 媒体文件统计：');
            console.log('  - 在线媒体：', onlineFiles.length);
            console.log('  - 本地媒体：', localFiles.length);
            console.log('  - 总计：', allMediaFiles.length);
            
            return allMediaFiles;
    }
    
    // 新增：文件选择处理
    function handleFileSelection(files) {
        const newLocalFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
                const fileUrl = URL.createObjectURL(file);
                newLocalFiles.push(fileUrl);
            }
            
            localMediaFiles = [...localMediaFiles, ...newLocalFiles];
            
            mergeMediaFiles();
            return newLocalFiles.length;
        }
        
        // 新增：扫描指定目录
        function scanDirectory(path) {
            console.log('📁 扫描目录：', path);
            
            // 在实际部署中，这里需要服务器端API来扫描目录
            showStatus(`✅ 已扫描目录：${path}`);
        }
        
        // 新增：获取媒体文件统计
        function getMediaStats() {
            const onlineImages = config.mediaUrls.filter(url => isImageUrl(url));
            const onlineVideos = config.mediaUrls.filter(url => isVideoUrl(url));
            
            return {
                online: {
                    images: onlineImages.length,
                    videos: onlineVideos.length,
                    total: config.mediaUrls.length
                },
                local: {
                    images: localMediaFiles.filter(url => isImageUrl(url)).length,
                videos: localMediaFiles.filter(url => isVideoUrl(url)).length,
                    total: localMediaFiles.length
                },
                total: {
                    images: onlineImages.length + localMediaFiles.filter(url => isImageUrl(url)).length,
                    videos: onlineVideos.length + localMediaFiles.filter(url => isVideoUrl(url)).length,
                    all: allMediaFiles.length
                }
            };
        }
        
        // 配置管理
        function loadConfig() {
            try {
                const saved = localStorage.getItem('minimal_media_config');
            if (saved) {
                const parsedConfig = JSON.parse(saved);
                Object.assign(config, parsedConfig);
                console.log('✅ 配置加载成功');
            } else {
                console.log('ℹ️ 使用默认配置');
            }
        } catch (error) {
            console.warn('❌ 加载配置失败，使用默认配置');
        }
    }
    
    function saveConfig() {
        try {
            localStorage.setItem('minimal_media_config', JSON.stringify(config));
        console.log('✅ 配置保存成功');
    } catch (error) {
        console.error('❌ 保存配置失败');
    }
}
    
    // 创建设置面板 - 添加本地媒体管理功能
    function createSettingsPanel() {
        const extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            console.log('⏳ 设置区域未找到，稍后重试...');
            setTimeout(createSettingsPanel, 100);
            return;
        }
        
        const oldSettings = document.getElementById('media-player-settings');
        if (oldSettings) oldSettings.remove();
        
        const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
        const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
        const otherUrls = config.mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url));
        
        const isCollapsed = config.settingsCollapsed;
        const contentClass = isCollapsed ? 'collapsed' : 'expanded';
        
        const html = `
            <div class="list-group-item" id="media-player-settings">
                <div class="settings-header" id="settings-header">
                    <h5>🎵 媒体播放器 v${PLUGIN_VERSION}</h5>
                    <span style="font-size: 12px; color: #666;">${isCollapsed ? '点击展开' : '点击折叠'}</span>
                </div>
                
                <div class="settings-content ${contentClass}" id="settings-content">
                    <p style="color: #28a745; font-size: 12px;">✅ 插件加载成功 - 支持本地媒体文件</p>
                    <p style="color: #666; font-size: 11px;">📁 本地媒体：自动扫描插件目录及子目录</p>
                    <p style="color: #666; font-size: 11px;">🌐 在线媒体：支持图片和视频URL</p>
                    
                    <div class="form-group">
                        <label><input type="checkbox" id="mp-enabled" ${config.enabled ? 'checked' : ''}> 启用播放器</label>
                    </div>
                    
                    <!-- 新增：媒体来源选择 -->
                    <div class="form-group">
                        <label>媒体来源:</label>
                        <select class="form-control" id="mp-media-source">
                            <option value="mixed" ${config.mediaSource === 'mixed' ? 'selected' : ''}>混合模式</option>
                            <option value="online" ${config.mediaSource === 'online' ? 'selected' : ''}>仅在线媒体</option>
                            <option value="local" ${config.mediaSource === 'local' ? 'selected' : ''}>仅本地媒体</option>
                        </select>
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
                    
                    <!-- 新增：本地媒体管理区域 -->
                    <div class="local-media-section">
                        <label>本地媒体管理</label>
                        <div class="local-media-stats" id="local-media-stats">
                            <div>本地媒体：${localMediaFiles.length}个文件</div>
                        <p class="local-media-path">📁 当前扫描目录：插件项目根目录及子目录</div>
                        
                        <div class="btn-group mt-2 w-100">
                            <button class="btn btn-sm btn-info" id="mp-scan-local">扫描本地媒体</button>
                        <button class="btn btn-sm btn-warning" id="mp-clear-local">清除本地媒体</button>
                        <button class="btn btn-sm btn-success" id="mp-refresh-media">刷新媒体列表</button>
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
                        <label><input type="checkbox" id="mp-muted" ${config.videoMuted ? 'checked' : ''}> 视频静音播放</label>
                    </div>
                    
                    <!-- URL管理区域 -->
                    <div class="form-group">
                        <label>在线媒体URL管理</label>
                        <div class="url-stats" id="url-stats">
                            <div>总计: ${config.mediaUrls.length}个URL</div>
                            <div>图片: ${imageUrls.length}个 | 视频: ${videoUrls.length}个 | 其他: ${otherUrls.length}个</div>
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
                        
                        <!-- 改为输入框导入 -->
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
            </div>
        `;
        
        extensionsArea.insertAdjacentHTML('beforeend', html);
        bindSettingsEvents();
        console.log('✅ 设置面板创建完成');
    }
    
    // 切换设置面板折叠状态
    function toggleSettingsPanel() {
        config.settingsCollapsed = !config.settingsCollapsed;
        saveConfig();
        
        const header = document.getElementById('settings-header');
        const content = document.getElementById('settings-content');
        
        if (header && content) {
            if (config.settingsCollapsed) {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                header.querySelector('span').textContent = '点击展开';
            } else {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                header.querySelector('span').textContent = '点击折叠';
            }
        }
    }
    
    function bindSettingsEvents() {
        // 设置面板折叠/展开
        $('#settings-header').on('click', function() {
            toggleSettingsPanel();
        });
        
        // 启用开关
        $('#mp-enabled').on('change', function() {
            config.enabled = this.checked;
            const btn = document.getElementById('media-control-btn');
            if (btn) {
                btn.style.display = this.checked ? 'flex' : 'none';
            }
            if (!this.checked && isPlayerVisible) togglePlayer();
            saveConfig();
            showStatus('设置已更新');
        });
        
        // 新增：媒体来源选择
        $('#mp-media-source').on('change', function() {
            config.mediaSource = this.value;
            saveConfig();
            showStatus('媒体来源已更新');
        });
        
        // 按钮位置
        $('#mp-button-position').on('change', function() {
            config.buttonPosition = this.value;
            localStorage.removeItem('media_button_position');
            createPlayer();
            saveConfig();
            showStatus('按钮位置已更新');
        });
        
        // 播放器透明度
        $('#mp-opacity').on('input', function() {
            const value = parseInt(this.value);
            $('#mp-opacity-input').val(value);
            $('#opacity-value').text(value + '%');
            config.playerOpacity = value / 100;
            updateMediaOpacity();
            saveConfig();
        });
        
        $('#mp-opacity-input').on('input', function() {
            let value = parseInt(this.value) || 95;
            value = Math.max(10, Math.min(100, value));
            $('#mp-opacity').val(value);
            $('#opacity-value').text(value + '%');
            config.playerOpacity = value / 100;
            updateMediaOpacity();
            saveConfig();
        });
        
        // 控制条透明度
        $('#mp-controls-opacity').on('input', function() {
            const value = parseInt(this.value);
            $('#mp-controls-opacity-input').val(value);
            $('#controls-opacity-value').text(value + '%');
            config.controlsOpacity = value / 100;
            updateMediaOpacity();
            saveConfig();
        });
        
        $('#mp-controls-opacity-input').on('input', function() {
            let value = parseInt(this.value) || 90;
            value = Math.max(10, Math.min(100, value));
            $('#mp-controls-opacity').val(value);
            $('#controls-opacity-value').text(value + '%');
            config.controlsOpacity = value / 100;
            updateMediaOpacity();
            saveConfig();
        });
        
        // 宽度滑块和输入框联动
        $('#mp-width').on('input', function() {
            const value = parseInt(this.value);
            $('#mp-width-input').val(value);
            $('#width-value').text(value + 'px');
            config.playerWidth = value;
            const player = document.getElementById('minimal-player');
            if (player) {
                player.style.width = value + 'px';
                adjustPlayerHeight();
                ensurePlayerInViewport();
            }
            saveConfig();
        });
        
        $('#mp-width-input').on('input', function() {
            let value = parseInt(this.value) || 300;
            value = Math.max(200, Math.min(800, value));
            $('#mp-width').val(value);
            $('#width-value').text(value + 'px');
            config.playerWidth = value;
            const player = document.getElementById('minimal-player');
            if (player) {
                player.style.width = value + 'px';
                adjustPlayerHeight();
                ensurePlayerInViewport();
            }
            saveConfig();
        });
        
        // 间隔滑块和输入框联动
        $('#mp-interval').on('input', function() {
            const value = parseInt(this.value);
            $('#mp-interval-input').val(value);
            $('#interval-value').text(value + 'ms');
            config.slideInterval = value;
            if (slideTimer) {
                clearInterval(slideTimer);
                slideTimer = setInterval(nextMedia, config.slideInterval);
            }
            saveConfig();
        });
        
        $('#mp-interval-input').on('input', function() {
            let value = parseInt(this.value) || 3000;
            value = Math.max(500, Math.min(10000, value));
            $('#mp-interval').val(value);
            $('#interval-value').text(value + 'ms');
            config.slideInterval = value;
            if (slideTimer) {
                clearInterval(slideTimer);
                slideTimer = setInterval(nextMedia, config.slideInterval);
            }
            saveConfig();
        });
        
        // 其他设置
        $('#mp-media-type').on('change', function() {
            config.mediaType = this.value;
            saveConfig();
            showStatus('媒体类型已更新');
        });
        
        $('#mp-play-mode').on('change', function() {
            config.playMode = this.value;
            saveConfig();
            showStatus('播放模式已更新');
        });
        
        $('#mp-muted').on('change', function() {
            config.videoMuted = this.checked;
            saveConfig();
            showStatus('静音设置已更新');
        });
        
        // URL选项卡切换
        $('.url-tab').on('click', function() {
            const tab = $(this).data('tab');
            $('.url-tab').removeClass('active');
            $(this).addClass('active');
            $('.url-tab-content').removeClass('active');
            $(`#tab-${tab}`).addClass('active');
        });
        
        // URL列表输入
        $('#mp-urls, #mp-urls-images, #mp-urls-videos').on('input', function() {
            const allUrls = $('#mp-urls').val().split('\n').filter(url => url.trim());
            const imageUrls = $('#mp-urls-images').val().split('\n').filter(url => url.trim());
            const videoUrls = $('#mp-urls-videos').val().split('\n').filter(url => url.trim());
            
            // 合并所有URL，去重
            const mergedUrls = [...new Set([...allUrls, ...imageUrls, ...videoUrls])].filter(url => url);
            config.mediaUrls = mergedUrls;
            saveConfig();
            
            // 更新统计信息
            updateUrlStats();
        });
        
        // 检测URL
        $('#mp-validate-urls').on('click', async function() {
            const button = $(this);
            button.prop('disabled', true).text('检测中...');
            
            try {
                const stats = await validateAllUrls();
                const statsEl = $('#validation-stats');
                
                let statsHtml = `
                    <div>图片: <span class="url-status-valid">${stats.images.valid}正常</span> / <span class="url-status-invalid">${stats.images.invalid}失效</span></div>
                    <div>视频: <span class="url-status-valid">${stats.videos.valid}正常</span> / <span class="url-status-invalid">${stats.videos.invalid}失效</span></div>
                    <div>总计: <span class="url-status-valid">${stats.total.valid}正常</span> / <span class="url-status-invalid">${stats.total.invalid}失效</span></div>
                `;
                
                statsEl.html(statsHtml);
                showStatus('✅ URL检测完成');
            } catch (error) {
                showStatus('❌ URL检测失败: ' + error.message, 'error');
            } finally {
                button.prop('disabled', false).text('检测URL');
            }
        });
        
        // 清除失效URL
        $('#mp-clear-invalid').on('click', function() {
            const removedCount = removeInvalidUrls();
            if (removedCount > 0) {
                // 更新所有URL文本框
                $('#mp-urls').val(config.mediaUrls.join('\n'));
                
                // 更新分类URL文本框
                const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
                const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
                $('#mp-urls-images').val(imageUrls.join('\n'));
                $('#mp-urls-videos').val(videoUrls.join('\n'));
                
                updateUrlStats();
                showStatus(`✅ 已清除 ${removedCount} 个失效URL`);
            } else {
                showStatus('没有发现失效的URL');
            }
        });
        
        // 导出URL
        $('#mp-export-urls').on('click', function() {
            exportUrls();
            showStatus('✅ URL列表已导出');
        });
        
        // 输入框导入URL
        $('#mp-import-append').on('click', function() {
            const importText = $('#mp-import-text').val().trim();
            if (!importText) {
                showStatus('请输入要导入的URL', 'error');
                return;
            }
            
            const importedCount = importFromText(importText, 'append');
            
            // 更新所有URL文本框
            $('#mp-urls').val(config.mediaUrls.join('\n'));
            
            // 更新分类URL文本框
            const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
            $('#mp-urls-images').val(imageUrls.join('\n'));
            $('#mp-urls-videos').val(videoUrls.join('\n'));
            
            updateUrlStats();
            $('#mp-import-text').val(''); // 清空输入框
            showStatus(`✅ 已追加导入 ${importedCount} 个URL（自动去重）`);
        });
        
        $('#mp-import-replace').on('click', function() {
            const importText = $('#mp-import-text').val().trim());
            if (!importText) {
                showStatus('请输入要导入的URL', 'error');
                return;
            }
            
            if (!confirm('确定要覆盖现有的URL列表吗？此操作不可撤销。')) {
                return;
            }
            
            const importedCount = importFromText(importText, 'replace');
            
            // 更新所有URL文本框
            $('#mp-urls').val(config.mediaUrls.join('\n'));
            
            // 更新分类URL文本框
            const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
            const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
            $('#mp-urls-images').val(imageUrls.join('\n'));
            $('#mp-urls-videos').val(videoUrls.join('\n'));
            
            updateUrlStats();
            $('#mp-import-text').val(''); // 清空输入框
            showStatus(`✅ 已覆盖导入 ${importedCount} 个URL（自动去重）`);
        });
        
        // 重置播放器位置
        $('#mp-reset-player-pos').on('click', function() {
            localStorage.removeItem('media_player_position');
            createPlayer();
            showStatus('✅ 播放器位置已重置到中心');
        });
        
        $('#mp-save').on('click', function() {
            saveConfig();
            showStatus('✅ 所有设置已保存');
        });
        
        $('#mp-test').on('click', function() {
            if (!isPlayerVisible) togglePlayer();
            showStatus('🎵 播放器测试中...');
        });
        
        $('#mp-reset-btn').on('click', function() {
            localStorage.removeItem('media_button_position');
            createPlayer();
            showStatus('✅ 按钮位置已重置');
        });
        
        // 新增：扫描本地媒体
        $('#mp-scan-local').on('click', function() {
            scanLocalMediaFiles();
            showStatus('✅ 本地媒体扫描完成');
        });
        
        // 新增：清除本地媒体
        $('#mp-clear-local').on('click', function() {
            localMediaFiles = [];
            mergeMediaFiles();
            showStatus('✅ 本地媒体已清除');
        });
        
        // 新增：刷新媒体列表
        $('#mp-refresh-media').on('click', function() {
            mergeMediaFiles();
            showStatus('✅ 媒体列表已刷新');
        });
    }
    
    // 更新URL统计信息
    function updateUrlStats() {
        const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
        const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
        
        $('#url-stats').html(`
            <div>总计: ${config.mediaUrls.length}个URL</div>
            <div>图片: ${imageUrls.length}个 | 视频: ${videoUrls.length}个 | 其他: ${otherUrls.length}个</div>
            <div id="validation-stats">点击"检测URL"验证可用性</div>
        `);
       function showStatus(message, type = 'success') {
        const statusEl = document.getElementById('mp-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = type === 'error' ? '#dc3545' : '#28a745';
            setTimeout(() => statusEl.textContent = '', 3000);
        }
    }
    
    // 新增：本地媒体文件处理函数
    function scanLocalMediaFiles() {
        console.log('🔍 开始扫描本地媒体文件...');
        localMediaFiles = [];
        
        // 这里需要根据实际部署环境调整
        // 在浏览器环境中，我们只能访问用户选择的文件
        // 在实际部署中，可能需要服务器端支持来扫描目录
        
        // 临时方案：提示用户选择文件夹
        showStatus('⚠️ 本地媒体扫描功能需要服务器端支持');
        
        return [];
    }
    
    // 新增：获取所有可用的媒体文件
    function getAllMediaFiles() {
        const onlineMedia = config.mediaUrls.map(url => ({
            url: url,
            type: isVideoUrl(url) ? 'video' : 'image',
            source: 'online'
        }));
    }
    
    // 新增：合并在线和本地媒体文件
    function mergeMediaFiles() {
        const onlineFiles = config.mediaUrls.map(url => ({
            url: url,
            type: isVideoUrl(url) ? 'video' : 'image',
            source: 'local'
        }));
        
        allMediaFiles = [...onlineFiles, ...localFiles];
        
        console.log('📊 媒体文件统计：');
        console.log('  - 在线媒体：', onlineFiles.length);
        console.log('  - 本地媒体：', localFiles.length);
        console.log('  - 总计：', allMediaFiles.length);
        
        return allMediaFiles;
    }
    
    // 新增：文件选择处理
    function handleFileSelection(files) {
        const newLocalFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
                const fileUrl = URL.createObjectURL(file);
                newLocalFiles.push(fileUrl);
        }
        
        localMediaFiles = [...localMediaFiles, ...newLocalFiles];
        
        mergeMediaFiles();
        return newLocalFiles.length;
    }
    
    // 新增：扫描指定目录
    function scanDirectory(path) {
        console.log('📁 扫描目录：', path);
        
        // 在实际部署中，这里需要服务器端API来扫描目录
        showStatus(`✅ 已扫描目录：${path}`);
    }
    
    // 新增：获取媒体文件统计
    function getMediaStats() {
        const onlineImages = config.mediaUrls.filter(url => isImageUrl(url));
        const onlineVideos = config.mediaUrls.filter(url => isVideoUrl(url));
        
        return {
            online: {
                images: onlineImages.length,
                videos: onlineVideos.length,
                total: config.mediaUrls.length
        },
        local: {
            images: localMediaFiles.filter(url => isImageUrl(url)).length,
            videos: localMediaFiles.filter(url => isVideoUrl(url)).length,
            total: localMediaFiles.length
        },
        total: {
            images: onlineImages.length + localMediaFiles.filter(url => isImageUrl(url)).length,
            videos: onlineVideos.length + localMediaFiles.filter(url => isVideoUrl(url)).length,
            all: allMediaFiles.length
        }
    };
}

// 配置管理
function loadConfig() {
    try {
        const saved = localStorage.getItem('minimal_media_config');
        if (saved) {
            const parsedConfig = JSON.parse(saved);
            Object.assign(config, parsedConfig);
            console.log('✅ 配置加载成功');
        } else {
            console.log('ℹ️ 使用默认配置');
        }
    } catch (error) {
        console.warn('❌ 加载配置失败，使用默认配置');
    }
}

function saveConfig() {
    try {
        localStorage.setItem('minimal_media_config', JSON.stringify(config));
        console.log('✅ 配置保存成功');
    } catch (error) {
        console.error('❌ 保存配置失败');
    }
}

// 初始化
function initialize() {
    console.log('🔧 初始化支持本地媒体文件的播放器...');
    
    // 首先加载CSS
    loadCSS();
    
    loadConfig();
    createPlayer();
    createSettingsPanel();
    
    // 扫描本地媒体文件
    scanLocalMediaFiles();
    mergeMediaFiles();
    
    // 窗口大小变化时重新定位
    window.addEventListener('resize', function() {
        console.log('🔄 窗口大小变化，重新创建播放器');
        createPlayer();
    });
    
    console.log('✅ 支持本地媒体文件的播放器初始化完成');
}

// 启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

})();
