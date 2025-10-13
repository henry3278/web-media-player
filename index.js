// index.js - 完整修复版本
(function() {
    console.log('🎵 媒体播放器完整修复版本加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '2.6.0';
    
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
            
            /* 移动端适配 */
            @media (max-width: 768px) {
                #media-control-btn {
                    width: 60px !important;
                    height: 60px !important;
                    font-size: 24px !important;
                }
                
                #minimal-player {
                    max-width: 90vw !important;
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
            
            @media (max-width: 480px) {
                #media-control-btn {
                    width: 70px !important;
                    height: 70px !important;
                    font-size: 28px !important;
                }
                
                #minimal-player {
                    max-width: 95vw !important;
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
        
        // 创建控制按钮
        const buttonPosition = getButtonPosition();
        const isMobile = window.innerWidth <= 768;
        const buttonSize = isMobile ? '60px' : '50px';
        const buttonFontSize = isMobile ? '24px' : '20px';
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

    // 获取移动端按钮位置
    function getMobileButtonPosition() {
        const savedPos = localStorage.getItem('media_button_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            const maxX = window.innerWidth - 70;
            const maxY = window.innerHeight - 70;
            const x = Math.max(10, Math.min(maxX, pos.x));
            const y = Math.max(10, Math.min(maxY, pos.y));
            return `left: ${x}px; top: ${y}px;`;
        }
        return 'bottom: 20px; right: 20px;';
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

    // 获取按钮位置
    function getButtonPosition() {
        const savedPos = localStorage.getItem('media_button_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            return `left: ${pos.x}px; top: ${pos.y}px;`;
        }
        
        switch (config.buttonPosition) {
            case 'bottom-left': return 'bottom: 60px; left: 20px;';
            case 'top-left': return 'top: 20px; left: 20px;';
            case 'top-right': return 'top: 20px; right: 20px;';
            default: return 'bottom: 60px; right: 20px;';
        }
    }

    // 绑定播放器事件
    function bindPlayerEvents() {
        const player = document.getElementById('minimal-player');
        const video = document.getElementById('player-video');
        const img = document.getElementById('player-img');
        const progress = document.getElementById('video-progress');
        const progressContainer = document.querySelector('.video-progress-container');
        
        // 双击切换下一个媒体
        player.addEventListener('dblclick', function(e) {
            if (e.target.id !== 'video-progress' && e.target !== progressContainer) {
                nextMedia();
            }
        });
        
        // 单击视频显示控制条（图片不显示）
        video.addEventListener('click', function(e) {
            e.stopPropagation();
            showControls();
        });
        
        // 单击图片不显示控制条
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            nextMedia();
        });
        
        // 点击播放器其他区域
        player.addEventListener('click', function(e) {
            if (e.target === player) {
                if (video.style.display !== 'none') {
                    showControls();
                }
            }
        });
        
        player.addEventListener('mousedown', startPlayerDrag);
        player.addEventListener('touchstart', startPlayerDrag);
        
        // 进度条拖动功能
        progress.addEventListener('input', function() {
            if (video.duration) {
                video.currentTime = (this.value / 100) * video.duration;
                showControls();
            }
        });
        
        // 点击进度条容器也可以拖动
        if (progressContainer) {
            progressContainer.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (video.duration) {
                    video.currentTime = percent * video.duration;
                    updateVideoProgress();
                    showControls();
                }
            });
        }
        
        video.addEventListener('timeupdate', updateVideoProgress);
        video.addEventListener('progress', updateVideoBuffer);
        video.addEventListener('loadedmetadata', function() {
            if (config.videoMuted) video.muted = true;
            updateVideoProgress();
            updateVideoBuffer();
            adjustPlayerHeight();
            ensurePlayerInViewport();
            showControls();
        });
        
        video.addEventListener('play', function() {
            isVideoPlaying = true;
            showControls();
        });
        
        video.addEventListener('pause', function() {
            isVideoPlaying = false;
            showControls();
        });
        
        video.addEventListener('ended', function() {
            isVideoPlaying = false;
            nextMedia();
        });
        
        img.addEventListener('load', function() {
            adjustPlayerHeight();
            ensurePlayerInViewport();
        });
        
        window.addEventListener('beforeunload', savePlayerPosition);
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
        
        if (video.duration > 0) {
            const progressPercent = (video.currentTime / video.duration) * 100;
            progress.value = progressPercent;
            played.style.width = progressPercent + '%';
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    }

    // 绑定按钮事件
    function bindButtonEvents() {
        const button = document.getElementById('media-control-btn');
        
        button.addEventListener('click', function(e) {
            if (!isDraggingButton) togglePlayer();
        });
        
        button.addEventListener('mousedown', startButtonDrag);
        button.addEventListener('touchstart', startButtonDrag);
        button.addEventListener('touchstart', function(e) { e.preventDefault(); });
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
        button.style.cursor = 'move';
        button.style.opacity = '1';
        
        const rect = button.getBoundingClientRect();
        localStorage.setItem('media_button_position', JSON.stringify({
            x: rect.left,
            y: rect.top
        }));
        
        document.removeEventListener('mousemove', onButtonDrag);
        document.removeEventListener('mouseup', stopButtonDrag);
        document.removeEventListener('touchmove', onButtonDrag);
        document.removeEventListener('touchend', stopButtonDrag);
    }

    // 开始拖动播放器
    function startPlayerDrag(e) {
        if (e.target.id === 'video-progress' || e.target.classList.contains('video-progress-container')) return;
        
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
    function onPlayerDrag(e) {
        if (!isDraggingPlayer) return;
        
        const player = document.getElementById('minimal-player');
        let clientX, clientY;
        
        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        
        const x = Math.max(0, Math.min(window.innerWidth - player.offsetWidth, clientX - playerDragOffset.x));
        const y = Math.max(0, Math.min(window.innerHeight - player.offsetHeight, clientY - playerDragOffset.y));
        
        player.style.left = x + 'px';
        player.style.top = y + 'px';
        player.style.transform = 'none';
    }

    // 停止拖动播放器
    function stopPlayerDrag() {
        isDraggingPlayer = false;
        const player = document.getElementById('minimal-player');
        player.style.cursor = 'move';
        savePlayerPosition();
        
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
        
        if (newX < 0) newX = 10;
        if (newY < 0) newY = 10;
        if (newX + rect.width > viewportWidth) newX = viewportWidth - rect.width - 10;
        if (newY + rect.height > viewportHeight) newY = viewportHeight - rect.height - 10;
        
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
                const calculatedHeight = config.playerWidth * aspectRatio;
                const maxHeight = window.innerHeight * 0.8;
                const finalHeight = Math.min(calculatedHeight, maxHeight);
                
                player.style.height = finalHeight + 'px';
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
        isPlayerVisible = !isPlayerVisible;
        const player = document.getElementById('minimal-player');
        const btn = document.getElementById('media-control-btn');
        
        if (isPlayerVisible) {
            player.style.display = 'block';
            btn.innerHTML = '⏹️';
            btn.title = '停止播放';
            startPlayback();
            ensurePlayerInViewport();
        } else {
            player.style.display = 'none';
            btn.innerHTML = '🎵';
            btn.title = '开始播放';
            stopPlayback();
            if (controlsHideTimer) {
                clearTimeout(controlsHideTimer);
                controlsHideTimer = null;
            }
        }
        savePlayerPosition();
    }

    function startPlayback() {
        if (config.mediaUrls.length === 0) return;
        currentIndex = config.playMode === 'random' ? 
            Math.floor(Math.random() * config.mediaUrls.length) : 0;
        loadCurrentMedia();
    }

    function stopPlayback() {
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
        document.getElementById('player-img').style.display = 'none';
        document.getElementById('player-video').style.display = 'none';
        const videoControls = document.getElementById('video-controls');
        if (videoControls) {
            videoControls.style.display = 'none';
            videoControls.classList.add('hidden');
        }
    }

    function loadCurrentMedia() {
        if (config.mediaUrls.length === 0) return;
        const url = config.mediaUrls[currentIndex];
        const isVideo = isVideoUrl(url);
        
        const shouldShow = (config.mediaType === 'mixed') || 
                          (config.mediaType === 'image' && !isVideo) ||
                          (config.mediaType === 'video' && isVideo);
        
        if (!shouldShow) {
            nextMedia();
            return;
        }
        
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        const videoControls = document.getElementById('video-controls');
        
        img.style.display = 'none';
        video.style.display = 'none';
        if (videoControls) {
            videoControls.style.display = 'none';
            videoControls.classList.add('hidden');
        }
        
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
        
        if (isVideo) {
            video.src = url;
            video.style.display = 'block';
            if (videoControls) {
                videoControls.style.display = 'flex';
                videoControls.classList.remove('hidden');
            }
            if (config.videoMuted) video.muted = true;
            video.play().catch(e => {
                console.log('视频播放失败:', e);
                urlValidationCache.set(url, false);
                setTimeout(nextMedia, 1000);
            });
            showControls();
        } else {
            img.src = url;
            img.style.display = 'block';
            img.onerror = function() {
                console.log('图片加载失败:', url);
                urlValidationCache.set(url, false);
                nextMedia();
            };
            slideTimer = setInterval(nextMedia, config.slideInterval);
            if (videoControls) {
                videoControls.style.display = 'none';
                videoControls.classList.add('hidden');
            }
        }
        
        updateMediaOpacity();
        setTimeout(adjustPlayerHeight, 100);
    }

    function nextMedia() {
        if (config.mediaUrls.length === 0) return;
        currentIndex = config.playMode === 'random' ? 
            Math.floor(Math.random() * config.mediaUrls.length) : 
            (currentIndex + 1) % config.mediaUrls.length;
        loadCurrentMedia();
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

    // URL验证函数
    async function validateUrl(url) {
        if (urlValidationCache.has(url)) return urlValidationCache.get(url);
        
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(false);
                console.log('URL验证超时:', url);
            }, 8000);
            
            if (isImageUrl(url)) {
                const img = new Image();
                img.onload = function() {
                    clearTimeout(timer);
                    urlValidationCache.set(url, true);
                    resolve(true);
                };
                img.onerror = function() {
                    clearTimeout(timer);
                    urlValidationCache.set(url, false);
                    resolve(false);
                };
                img.src = url;
            } else if (isVideoUrl(url)) {
                const video = document.createElement('video');
                video.addEventListener('loadeddata', function() {
                    clearTimeout(timer);
                    urlValidationCache.set(url, true);
                    resolve(true);
                });
                video.addEventListener('error', function() {
                    clearTimeout(timer);
                    urlValidationCache.set(url, false);
                    resolve(false);
                });
                video.src = url;
                video.load();
            } else {
                fetch(url, { method: 'GET', mode: 'no-cors' })
                    .then(() => { clearTimeout(timer); urlValidationCache.set(url, true); resolve(true); })
                    .catch(() => { clearTimeout(timer); urlValidationCache.set(url, false); resolve(false); });
            }
        });
    }

    // 验证所有URL
    async function validateAllUrls() {
        const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
        const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
        const otherUrls = config.mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url));
        
        let validImages = 0, invalidImages = 0;
        let validVideos = 0, invalidVideos = 0;
        let validOthers = 0, invalidOthers = 0;
        
        for (const url of imageUrls) {
            const isValid = await validateUrl(url);
            if (isValid) validImages++; else invalidImages++;
        }
        
        for (const url of videoUrls) {
            const isValid = await validateUrl(url);
            if (isValid) validVideos++; else invalidVideos++;
        }
        
        for (const url of otherUrls) {
            const isValid = await validateUrl(url);
            if (isValid) validOthers++; else invalidOthers++;
        }
        
        return {
            images: { valid: validImages, invalid: invalidImages, total: imageUrls.length },
            videos: { valid: validVideos, invalid: invalidVideos, total: videoUrls.length },
            others: { valid: validOthers, invalid: invalidOthers, total: otherUrls.length },
            total: {
                valid: validImages + validVideos + validOthers,
                invalid: invalidImages + invalidVideos + invalidOthers,
                total: config.mediaUrls.length
            }
        };
    }

    // 清除无效URL
    function removeInvalidUrls() {
        const invalidUrls = [];
        const validUrls = [];
        
        config.mediaUrls.forEach(url => {
            if (urlValidationCache.get(url) === false) {
                invalidUrls.push(url);
            } else {
                validUrls.push(url);
            }
        });
        
        config.mediaUrls = validUrls;
        saveConfig();
        return invalidUrls.length;
    }

    // 导出URL列表
    function exportUrls() {
        const urlsText = config.mediaUrls.join('\n');
        const blob = new Blob([urlsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'media_urls.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    // 从文本导入URL列表
    function importFromText(text, mode) {
        const newUrls = text.split('\n')
            .filter(url => url.trim())
            .filter((url, index, self) => self.indexOf(url) === index);
        
        if (mode === 'replace') {
            config.mediaUrls = newUrls;
        } else {
            const combinedUrls = [...new Set([...config.mediaUrls, ...newUrls])];
            config.mediaUrls = combinedUrls;
        }
        
        saveConfig();
        return newUrls.length;
    }

    // 配置管理
    function loadConfig() {
        try {
            const saved = localStorage.getItem('minimal_media_config');
            if (saved) Object.assign(config, JSON.parse(saved));
        } catch (error) {
            console.warn('加载配置失败，使用默认配置');
        }
    }

    function saveConfig() {
        try {
            localStorage.setItem('minimal_media_config', JSON.stringify(config));
        } catch (error) {
            console.error('保存配置失败');
        }
    }

    // 创建设置面板
    function createSettingsPanel() {
        // 直接插入设置面板，不等待
        const extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            console.log('扩展设置区域未找到，稍后重试');
            setTimeout(createSettingsPanel, 1000);
            return;
        }
        
        const oldSettings = document.getElementById('media-player-settings');
        if (oldSettings) oldSettings.remove();
        
        const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
        const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
        const otherUrls = config.mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url));
        
        const html = `
            <div class="list-group-item" id="media-player-settings">
                <h5>🎵 媒体播放器 v${PLUGIN_VERSION}</h5>
                <p style="color: #28a745; font-size: 12px;">✅ 插件加载成功</p>
                
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

    // 绑定设置事件
    function bindSettingsEvents() {
        // 启用开关
        const enabledCheckbox = document.getElementById('mp-enabled');
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', function() {
                config.enabled = this.checked;
                const btn = document.getElementById('media-control-btn');
                if (btn) btn.style.display = this.checked ? 'flex' : 'none';
                if (!this.checked && isPlayerVisible) togglePlayer();
                saveConfig();
                showStatus('设置已更新');
            });
        }
        
        // 按钮位置
        const buttonPositionSelect = document.getElementById('mp-button-position');
        if (buttonPositionSelect) {
            buttonPositionSelect.addEventListener('change', function() {
                config.buttonPosition = this.value;
                localStorage.removeItem('media_button_position');
                createPlayer();
                saveConfig();
                showStatus('按钮位置已更新');
            });
        }
        
        // 播放器透明度
        const opacitySlider = document.getElementById('mp-opacity');
        const opacityInput = document.getElementById('mp-opacity-input');
        const opacityValue = document.getElementById('opacity-value');
        
        if (opacitySlider && opacityInput && opacityValue) {
            opacitySlider.addEventListener('input', function() {
                const value = parseInt(this.value);
                opacityInput.value = value;
                opacityValue.textContent = value + '%';
                config.playerOpacity = value / 100;
                updateMediaOpacity();
                saveConfig();
            });
            
            opacityInput.addEventListener('input', function() {
                let value = parseInt(this.value) || 95;
                value = Math.max(10, Math.min(100, value));
                opacitySlider.value = value;
                opacityValue.textContent = value + '%';
                config.playerOpacity = value / 100;
                updateMediaOpacity();
                saveConfig();
            });
        }
        
        // 控制条透明度
        const controlsOpacitySlider = document.getElementById('mp-controls-opacity');
        const controlsOpacityInput = document.getElementById('mp-controls-opacity-input');
        const controlsOpacityValue = document.getElementById('controls-opacity-value');
        
        if (controlsOpacitySlider && controlsOpacityInput && controlsOpacityValue) {
            controlsOpacitySlider.addEventListener('input', function() {
                const value = parseInt(this.value);
                controlsOpacityInput.value = value;
                controlsOpacityValue.textContent = value + '%';
                config.controlsOpacity = value / 100;
                updateMediaOpacity();
                saveConfig();
            });
            
            controlsOpacityInput.addEventListener('input', function() {
                let value = parseInt(this.value) || 90;
                value = Math.max(10, Math.min(100, value));
                controlsOpacitySlider.value = value;
                controlsOpacityValue.textContent = value + '%';
                config.controlsOpacity = value / 100;
                updateMediaOpacity();
                saveConfig();
            });
        }
        
        // 播放器宽度
        const widthSlider = document.getElementById('mp-width');
        const widthInput = document.getElementById('mp-width-input');
        const widthValue = document.getElementById('width-value');
        
        if (widthSlider && widthInput && widthValue) {
            widthSlider.addEventListener('input', function() {
                const value = parseInt(this.value);
                widthInput.value = value;
                widthValue.textContent = value + 'px';
                config.playerWidth = value;
                const player = document.getElementById('minimal-player');
                if (player) {
                    player.style.width = value + 'px';
                    adjustPlayerHeight();
                    ensurePlayerInViewport();
                }
                saveConfig();
            });
            
            widthInput.addEventListener('input', function() {
                let value = parseInt(this.value) || 300;
                value = Math.max(200, Math.min(800, value));
                widthSlider.value = value;
                widthValue.textContent = value + 'px';
                config.playerWidth = value;
                const player = document.getElementById('minimal-player');
                if (player) {
                    player.style.width = value + 'px';
                    adjustPlayerHeight();
                    ensurePlayerInViewport();
                }
                saveConfig();
            });
        }
        
        // 其他设置事件绑定...
        // 这里省略其他设置事件绑定代码以保持简洁
        
        // 保存按钮
        const saveButton = document.getElementById('mp-save');
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                saveConfig();
                showStatus('✅ 所有设置已保存');
            });
        }
        
        // 测试按钮
        const testButton = document.getElementById('mp-test');
        if (testButton) {
            testButton.addEventListener('click', function() {
                if (!isPlayerVisible) togglePlayer();
                showStatus('🎵 播放器测试中...');
            });
        }
    }

    function showStatus(message, type = 'success') {
        const statusEl = document.getElementById('mp-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = type === 'error' ? '#dc3545' : '#28a745';
            setTimeout(() => statusEl.textContent = '', 3000);
        }
    }

    // 初始化
    function initialize() {
        console.log('🔧 初始化媒体播放器...');
        
        // 首先加载CSS
        loadCSS();
        
        loadConfig();
        createPlayer();
        
        // 延迟创建设置面板
        setTimeout(createSettingsPanel, 100);
        
        // 窗口大小变化时重新定位
        window.addEventListener('resize', function() {
            createPlayer();
        });
        
        console.log('✅ 媒体播放器初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
