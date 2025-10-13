// index.js - 完善版媒体播放器
(function() {
    console.log('🎵 完善版媒体播放器加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '1.8.0';
    
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
        
        // 创建播放器
        const playerHTML = `
            <div id="minimal-player" style="
                position: fixed;
                ${playerStyle}
                background: rgba(0, 0, 0, ${config.playerOpacity});
                border-radius: 12px;
                z-index: 10000;
                display: none;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                cursor: move;
                border: 2px solid rgba(255,255,255,0.1);
            ">
                <!-- 媒体显示区域 -->
                <div id="player-content" style="
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                ">
                    <img id="player-img" style="
                        max-width: 100%;
                        max-height: 80vh;
                        object-fit: contain;
                        display: none;
                        opacity: ${config.playerOpacity};
                    ">
                    <video id="player-video" style="
                        max-width: 100%;
                        max-height: 80vh;
                        object-fit: contain;
                        display: none;
                        opacity: ${config.playerOpacity};
                    "></video>
                </div>
                
                <!-- 视频进度条（合并的进度显示） -->
                <div id="video-controls" style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    padding: 8px;
                    display: none;
                    opacity: ${config.controlsOpacity};
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="video-progress-container" style="
                            position: relative;
                            flex: 1;
                            height: 6px;
                            background: rgba(255,255,255,0.1);
                            border-radius: 3px;
                            margin-right: 8px;
                        ">
                            <!-- 缓存进度条 -->
                            <div id="video-buffer" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                height: 100%;
                                background: rgba(255,255,255,0.3);
                                border-radius: 3px;
                                pointer-events: none;
                                z-index: 1;
                            "></div>
                            <!-- 播放进度条 -->
                            <div id="video-played" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                height: 100%;
                                background: rgba(100,100,100,0.6);
                                border-radius: 3px;
                                pointer-events: none;
                                z-index: 2;
                            "></div>
                            <!-- 拖动滑块 -->
                            <input type="range" id="video-progress" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                margin: 0;
                                opacity: 0;
                                cursor: pointer;
                                z-index: 3;
                            " min="0" max="100" value="0">
                        </div>
                        <span id="video-time" style="color: rgba(255,255,255,0.9); font-size: 11px; min-width: 75px;">0:00 / 0:00</span>
                    </div>
                </div>
            </div>
        `;
        
        // 创建控制按钮
        const buttonPosition = getButtonPosition();
        const buttonHTML = `
            <div id="media-control-btn" style="
                position: fixed;
                ${buttonPosition}
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                font-size: 20px;
                cursor: move;
                z-index: 10001;
                display: ${config.enabled ? 'flex' : 'none'};
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                user-select: none;
            " title="点击切换媒体播放 | 拖动移动位置">
                🎵
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        bindPlayerEvents();
        bindButtonEvents();
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
            case 'bottom-left':
                return 'bottom: 60px; left: 20px;';
            case 'top-left':
                return 'top: 20px; left: 20px;';
            case 'top-right':
                return 'top: 20px; right: 20px;';
            default:
                return 'bottom: 60px; right: 20px;';
        }
    }
    
    // 绑定播放器事件
    function bindPlayerEvents() {
        const player = document.getElementById('minimal-player');
        const content = document.getElementById('player-content');
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        
        // 双击切换下一个媒体
        player.addEventListener('dblclick', function(e) {
            if (e.target.id !== 'video-progress') {
                nextMedia();
            }
        });
        
        // 整个播放器可拖动
        player.addEventListener('mousedown', startPlayerDrag);
        player.addEventListener('touchstart', startPlayerDrag);
        
        // 视频控制
        progress.addEventListener('input', function() {
            if (video.duration) {
                video.currentTime = (this.value / 100) * video.duration;
            }
        });
        
        video.addEventListener('timeupdate', updateVideoProgress);
        video.addEventListener('progress', updateVideoBuffer);
        video.addEventListener('loadedmetadata', function() {
            if (config.videoMuted) video.muted = true;
            updateVideoProgress();
            updateVideoBuffer();
            adjustPlayerHeight();
            ensurePlayerInViewport();
        });
        
        video.addEventListener('ended', nextMedia);
        
        // 图片加载后自适应
        const img = document.getElementById('player-img');
        img.addEventListener('load', function() {
            adjustPlayerHeight();
            ensurePlayerInViewport();
        });
        
        // 窗口关闭前保存位置
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
            if (!isDraggingButton) {
                togglePlayer();
            }
        });
        
        button.addEventListener('mousedown', startButtonDrag);
        button.addEventListener('touchstart', startButtonDrag);
        
        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
        });
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
        
        const x = Math.max(10, Math.min(window.innerWidth - button.offsetWidth - 10, clientX - buttonDragOffset.x));
        const y = Math.max(10, Math.min(window.innerHeight - button.offsetHeight - 10, clientY - buttonDragOffset.y));
        
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
        if (e.target.id === 'video-progress') return;
        
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
        savePlayerPosition(); // 拖动结束时保存位置
        
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
        
        if (player) {
            player.style.background = `rgba(0, 0, 0, ${config.playerOpacity})`;
        }
        if (img) {
            img.style.opacity = config.playerOpacity;
        }
        if (video) {
            video.style.opacity = config.playerOpacity;
        }
        if (videoControls) {
            videoControls.style.opacity = config.controlsOpacity;
        }
        if (timeDisplay) {
            timeDisplay.style.opacity = config.controlsOpacity;
        }
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
        }
        document.getElementById('player-img').style.display = 'none';
        document.getElementById('player-video').style.display = 'none';
        document.getElementById('video-controls').style.display = 'none';
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
        videoControls.style.display = 'none';
        
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
        
        if (isVideo) {
            video.src = url;
            video.style.display = 'block';
            videoControls.style.display = 'flex';
            if (config.videoMuted) video.muted = true;
            video.play().catch(e => {
                console.log('视频播放失败:', e);
                // 标记为失效URL
                urlValidationCache.set(url, false);
                setTimeout(nextMedia, 1000);
            });
        } else {
            img.src = url;
            img.style.display = 'block';
            // 检查图片是否加载成功
            img.onerror = function() {
                console.log('图片加载失败:', url);
                urlValidationCache.set(url, false);
                nextMedia();
            };
            slideTimer = setInterval(nextMedia, config.slideInterval);
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
    
    // 改进的URL验证函数
    async function validateUrl(url) {
        if (urlValidationCache.has(url)) {
            return urlValidationCache.get(url);
        }
        
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(false);
                console.log('URL验证超时:', url);
            }, 8000); // 8秒超时
            
            if (isImageUrl(url)) {
                // 图片验证
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
                // 视频验证
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
                // 其他类型URL
                fetch(url, { 
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-cache'
                }).then(() => {
                    clearTimeout(timer);
                    urlValidationCache.set(url, true);
                    resolve(true);
                }).catch(() => {
                    clearTimeout(timer);
                    urlValidationCache.set(url, false);
                    resolve(false);
                });
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
        
        // 验证图片
        for (const url of imageUrls) {
            const isValid = await validateUrl(url);
            if (isValid) validImages++; else invalidImages++;
        }
        
        // 验证视频
        for (const url of videoUrls) {
            const isValid = await validateUrl(url);
            if (isValid) validVideos++; else invalidVideos++;
        }
        
        // 验证其他
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
    
    // 导入URL列表
    function importUrls(text, mode) {
        const newUrls = text.split('\n').filter(url => url.trim());
        
        if (mode === 'replace') {
            config.mediaUrls = [...new Set(newUrls)];
        } else { // append
            config.mediaUrls = [...new Set([...config.mediaUrls, ...newUrls])];
        }
        
        saveConfig();
        return newUrls.length;
    }
    
    // 配置管理
    function loadConfig() {
        try {
            const saved = localStorage.getItem('minimal_media_config');
            if (saved) {
                Object.assign(config, JSON.parse(saved));
            }
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
        const extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            setTimeout(createSettingsPanel, 100);
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
                <p style="color: #28a745; font-size: 12px;">✅ 插件加载成功 - 双击播放器切换下一个</p>
                
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
                    <input type="number" class="form-control mt-1" id="mp-opacity-input" min="10" max="100" value="${Math.round(config.playerOpacity * 100)}" style="width: 100px; display: inline-block;">
                    <span>%</span>
                </div>
                
                <div class="form-group">
                    <label>控制条透明度: <span id="controls-opacity-value">${Math.round(config.controlsOpacity * 100)}%</span></label>
                    <input type="range" class="form-control-range" id="mp-controls-opacity" min="10" max="100" value="${config.controlsOpacity * 100}">
                    <input type="number" class="form-control mt-1" id="mp-controls-opacity-input" min="10" max="100" value="${Math.round(config.controlsOpacity * 100)}" style="width: 100px; display: inline-block;">
                    <span>%</span>
                </div>
                
                <div class="form-group">
                    <label>播放器宽度: <span id="width-value">${config.playerWidth}px</span></label>
                    <input type="range" class="form-control-range" id="mp-width" min="200" max="800" value="${config.playerWidth}">
                    <input type="number" class="form-control mt-1" id="mp-width-input" min="200" max="800" value="${config.playerWidth}" style="width: 100px; display: inline-block;">
                    <span>px</span>
                </div>
                
                <div class="form-group">
                    <label>图片切换间隔: <span id="interval-value">${config.slideInterval}ms</span></label>
                    <input type="range" class="form-control-range" id="mp-interval" min="500" max="10000" step="500" value="${config.slideInterval}">
                    <input type="number" class="form-control mt-1" id="mp-interval-input" min="500" max="10000" step="500" value="${config.slideInterval}" style="width: 100px; display: inline-block;">
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
                        <label>导入URL:</label>
                        <textarea class="form-control" id="mp-import-text" rows="3" placeholder="粘贴URL列表，每行一个" style="font-size: 12px;"></textarea>
                        <div class="btn-group mt-1 w-100">
                            <button class="btn btn-sm btn-primary" id="mp-import-append">追加导入</button>
                            <button class="btn btn-sm btn-danger" id="mp-import-replace">覆盖导入</button>
                        </div>
                    </div>
                </div>
                
                <div class="btn-group">
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
    
    function bindSettingsEvents() {
        // 启用开关
        $('#mp-enabled').on('change', function() {
            config.enabled = this.checked;
            document.getElementById('media-control-btn').style.display = this.checked ? 'flex' : 'none';
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
        
        // 导入URL
        $('#mp-import-append').on('click', function() {
            const importText = $('#mp-import-text').val().trim();
            if (!importText) {
                showStatus('请输入要导入的URL', 'error');
                return;
            }
            
            const importedCount = importUrls(importText, 'append');
            // 更新所有URL文本框
            $('#mp-urls').val(config.mediaUrls.join('\n'));
            
            // 更新分类URL文本框
            const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
            const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
            $('#mp-urls-images').val(imageUrls.join('\n'));
            $('#mp-urls-videos').val(videoUrls.join('\n'));
            
            updateUrlStats();
            showStatus(`✅ 已追加导入 ${importedCount} 个URL`);
        });
        
        $('#mp-import-replace').on('click', function() {
            const importText = $('#mp-import-text').val().trim();
            if (!importText) {
                showStatus('请输入要导入的URL', 'error');
                return;
            }
            
            if (!confirm('确定要覆盖现有的URL列表吗？此操作不可撤销。')) {
                return;
            }
            
            const importedCount = importUrls(importText, 'replace');
            // 更新所有URL文本框
            $('#mp-urls').val(config.mediaUrls.join('\n'));
            
            // 更新分类URL文本框
            const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
            const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
            $('#mp-urls-images').val(imageUrls.join('\n'));
            $('#mp-urls-videos').val(videoUrls.join('\n'));
            
            updateUrlStats();
            showStatus(`✅ 已覆盖导入 ${importedCount} 个URL`);
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
    }
    
    // 更新URL统计信息
    function updateUrlStats() {
        const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
        const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
        const otherUrls = config.mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url));
        
        $('#url-stats').html(`
            <div>总计: ${config.mediaUrls.length}个URL</div>
            <div>图片: ${imageUrls.length}个 | 视频: ${videoUrls.length}个 | 其他: ${otherUrls.length}个</div>
            <div id="validation-stats">点击"检测URL"验证可用性</div>
        `);
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
        console.log('🔧 初始化完善版播放器...');
        
        loadConfig();
        createPlayer();
        createSettingsPanel();
        
        // 加载CSS文件
        loadCSS();
        
        // 窗口大小变化时重新定位
        window.addEventListener('resize', function() {
            if (isPlayerVisible) {
                ensurePlayerInViewport();
            }
        });
        
        console.log('✅ 完善版播放器初始化完成');
    }
    
    // 加载CSS文件
    function loadCSS() {
        // 检查是否已加载CSS
        if (document.getElementById('media-player-css')) return;
        
        // 创建style元素并插入CSS内容
        const style = document.createElement('style');
        style.id = 'media-player-css';
        style.textContent = `
            #minimal-player {
                transition: transform 0.3s ease;
            }
            #minimal-player:hover {
                transform: scale(1.02);
            }
            .video-progress-container {
                position: relative;
                flex: 1;
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                margin-right: 8px;
            }
            #video-progress {
                -webkit-appearance: none;
                width: 100%;
                height: 100%;
                background: transparent;
                border-radius: 3px;
                outline: none;
                cursor: pointer;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 3;
            }
            #video-progress::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #6b7280;
                cursor: pointer;
                border: 2px solid #d1d5db;
            }
            #video-progress::-webkit-slider-runnable-track {
                width: 100%;
                height: 100%;
                background: transparent;
                border-radius: 3px;
            }
            #video-progress::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #6b7280;
                cursor: pointer;
                border: 2px solid #d1d5db;
            }
            #video-progress::-moz-range-track {
                width: 100%;
                height: 100%;
                background: transparent;
                border-radius: 3px;
                border: none;
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
            }
            .url-status-invalid {
                color: #dc3545;
            }
            .url-stats {
                font-size: 12px;
                margin-bottom: 10px;
                padding: 5px;
                background: #f8f9fa;
                border-radius: 3px;
            }
            .url-tabs {
                display: flex;
                margin-bottom: 10px;
                border-bottom: 1px solid #dee2e6;
            }
            .url-tab {
                padding: 8px 16px;
                cursor: pointer;
                border: 1px solid transparent;
                border-bottom: none;
                border-radius: 4px 4px 0 0;
                margin-right: 5px;
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
        `;
        document.head.appendChild(style);
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
