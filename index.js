// index.js - 修复移动端问题版媒体播放器
(function() {
    console.log('🎵 修复移动端问题版媒体播放器加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '2.4.1';
    
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
    let isDraggingProgress = false;
    
    // 检测设备类型 - 修复检测逻辑
    function isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // 首先加载CSS - 修复移动端样式
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
                touch-action: none;
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
            
            /* 移动端专属优化 - 修复按钮大小 */
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
                cursor: pointer !important;
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
                
                #media-control-btn {
                    -webkit-user-select: none;
                    -webkit-touch-callout: none;
                    -webkit-tap-highlight-color: transparent;
                }
            }
            
            /* 确保移动端按钮始终显示 */
            #media-control-btn {
                display: flex !important;
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
    
    // 创建播放器 - 修复移动端显示问题
    function createPlayer() {
        console.log('🔧 创建播放器，设备类型:', isMobileDevice() ? '移动端' : 'PC端');
        
        // 移除已存在的元素
        const existingPlayer = document.getElementById('minimal-player');
        const existingBtn = document.getElementById('media-control-btn');
        if (existingPlayer) existingPlayer.remove();
        if (existingBtn) existingBtn.remove();
        
        // 检测移动端并添加相应类名
        const isMobile = isMobileDevice();
        if (isMobile) {
            document.body.classList.add('mobile-optimized');
            console.log('📱 应用移动端优化样式');
        } else {
            document.body.classList.remove('mobile-optimized');
        }
        
        // 获取保存的播放器位置
        const savedPlayerPos = localStorage.getItem('media_player_position');
        let playerStyle = `width: ${config.playerWidth}px;`;
        
        if (savedPlayerPos) {
            const pos = JSON.parse(savedPlayerPos);
            playerStyle += `left: ${pos.x}px; top: ${pos.y}px; transform: none;`;
        } else {
            // 移动端默认居中显示
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
        
        // 创建控制按钮 - 修复移动端按钮大小和显示问题
        const buttonPosition = getButtonPosition(isMobile);
        const buttonSize = isMobile ? '50px' : '50px'; // 统一使用50px
        const buttonFontSize = isMobile ? '20px' : '20px';
        
        const buttonHTML = `
            <div id="media-control-btn" style="
                ${buttonPosition}
                width: ${buttonSize};
                height: ${buttonSize};
                font-size: ${buttonFontSize};
                display: flex !important;
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
        const button = document.getElementById('media-control-btn');
        if (button) {
            button.style.display = 'flex';
        }
    }
    
    // 移动端优化
    function optimizeForMobile() {
        const player = document.getElementById('minimal-player');
        const button = document.getElementById('media-control-btn');
        const video = document.getElementById('player-video');
        
        console.log('📱 执行移动端优化');
        
        if (player) {
            // 确保播放器在视口内
            ensurePlayerInViewport();
            
            // 添加触摸事件优化
            player.style.touchAction = 'none';
        }
        
        if (button) {
            // 移动端按钮优化
            button.style.touchAction = 'none';
            button.style.display = 'flex';
            console.log('✅ 移动端按钮样式应用');
        }
        
        if (video) {
            // 移动端视频优化
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.setAttribute('x5-playsinline', '');
            video.setAttribute('x-webkit-airplay', 'allow');
        }
    }
    
    // 获取按钮位置 - 修复移动端位置问题
    function getButtonPosition(isMobile) {
        const savedPos = localStorage.getItem('media_button_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            return `left: ${pos.x}px; top: ${pos.y}px;`;
        }
        
        if (isMobile) {
            // 移动端默认位置：右下角，留出安全边距
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
    
    // 绑定播放器事件 - 修复事件绑定
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
        
        console.log('🔧 绑定播放器事件');
        
        // 双击切换下一个媒体
        player.addEventListener('dblclick', function(e) {
            if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb')) {
                showControls();
                nextMedia();
            }
        });
        
        // 单击视频区域显示控制条
        content.addEventListener('click', function(e) {
            if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && isVideoPlaying) {
                showControls();
            }
        });
        
        // 移动端触摸事件
        player.addEventListener('touchstart', function(e) {
            if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && isVideoPlaying) {
                showControls();
            }
        });
        
        player.addEventListener('mousedown', startPlayerDrag);
        player.addEventListener('touchstart', startPlayerDrag);
        
        // 进度条事件
        if (progress) {
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
        }
        
        // 自定义进度条拖动
        if (progressContainer) {
            progressContainer.addEventListener('mousedown', startProgressDrag);
            progressContainer.addEventListener('touchstart', startProgressDrag);
        }
        
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
            console.log('🔄 窗口大小变化，重新创建播放器');
            createPlayer();
        });
    }
    
    // 绑定按钮事件 - 修复点击无响应问题
    function bindButtonEvents() {
        const button = document.getElementById('media-control-btn');
        
        if (!button) {
            console.error('❌ 按钮元素未找到');
            return;
        }
        
        console.log('🔧 绑定按钮事件');
        
        // 移除所有现有事件监听器，避免重复绑定
        button.replaceWith(button.cloneNode(true));
        const newButton = document.getElementById('media-control-btn');
        
        newButton.addEventListener('click', function(e) {
            console.log('🎵 按钮被点击');
            e.stopPropagation();
            if (!isDraggingButton) {
                togglePlayer();
            }
        });
        
        newButton.addEventListener('mousedown', startButtonDrag);
        newButton.addEventListener('touchstart', startButtonDrag);
        
        // 移动端触摸优化
        newButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (isMobileDevice()) {
                // 移动端触摸反馈
                this.style.transform = 'scale(0.95)';
            }
        });
        
        newButton.addEventListener('touchend', function() {
            if (isMobileDevice()) {
                this.style.transform = 'scale(1)';
            }
        });
        
        console.log('✅ 按钮事件绑定完成');
    }
    
    // 开始拖动按钮
    function startButtonDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingButton = true;
        
        const button = document.getElementById('media-control-btn');
        const rect = button.getBoundingClientRect();
        
        if (e.type === 'mousedown') {
            buttonDragOffset.x = e.clientX - rect.left;
            buttonDragOffset.y = e.clientY - rect.top;
            document.addEventListener('mousemove', onButtonDrag);
            document.addEventListener('mouseup', stopButtonDrag);
        } else {
            const touch = e.touches[0];
            buttonDragOffset.x = touch.clientX - rect.left;
            buttonDragOffset.y = touch.clientY - rect.top;
            document.addEventListener('touchmove', onButtonDrag);
            document.addEventListener('touchend', stopButtonDrag);
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
            button.style.transform = 'scale(1)';
            
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
    }
    
    // 播放器控制函数 - 修复状态切换问题
    function togglePlayer() {
        console.log('🔘 切换播放器状态，当前状态:', isPlayerVisible ? '显示' : '隐藏');
        
        isPlayerVisible = !isPlayerVisible;
        const player = document.getElementById('minimal-player');
        const btn = document.getElementById('media-control-btn');
        
        if (!player || !btn) {
            console.error('❌ 播放器或按钮元素未找到');
            return;
        }
        
        if (isPlayerVisible) {
            player.style.display = 'block';
            btn.innerHTML = '⏹️';
            btn.title = '停止播放';
            startPlayback();
            ensurePlayerInViewport();
            console.log('▶️ 播放器显示，开始播放');
        } else {
            player.style.display = 'none';
            btn.innerHTML = '🎵';
            btn.title = '开始播放';
            stopPlayback();
            console.log('⏸️ 播放器隐藏，停止播放');
        }
        savePlayerPosition();
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
        
        // 移动端更大的安全边距
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
    
    // 其他函数保持不变...
    // [这里省略了其他函数的代码，保持与之前相同]
    // 包括：startProgressDrag, onProgressDrag, stopProgressDrag, updateCustomThumbPosition,
    // updateVideoBuffer, updateVideoProgress, startPlayback, stopPlayback, loadCurrentMedia,
    // nextMedia, formatTime, isVideoUrl, isImageUrl, validateUrl, validateAllUrls,
    // removeInvalidUrls, exportUrls, importFromText, loadConfig, saveConfig,
    // createSettingsPanel, bindSettingsEvents, updateUrlStats, showStatus 等函数
    
    // 初始化 - 修复初始化逻辑
    function initialize() {
        console.log('🔧 初始化修复移动端问题版播放器...');
        
        // 首先加载CSS
        loadCSS();
        
        loadConfig();
        
        // 延迟创建播放器，确保DOM完全加载
        setTimeout(() => {
            createPlayer();
            createSettingsPanel();
            
            // 确保按钮立即显示
            const button = document.getElementById('media-control-btn');
            if (button) {
                button.style.display = 'flex';
                console.log('✅ 按钮显示状态确认');
            }
        }, 100);
        
        console.log('✅ 修复移动端问题版播放器初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
