// 文件名: index.js - 最终修复版媒体播放器
(function() {
    console.log('🎵 最终修复版媒体播放器加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '1.4.0';
    
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
        playerOpacity: 0.95,  // 播放器透明度
        buttonPosition: 'bottom-right'  // 按钮位置
    };
    
    let currentIndex = 0;
    let isPlayerVisible = false;
    let slideTimer = null;
    let isDraggingPlayer = false;
    let playerDragOffset = { x: 0, y: 0 };
    let isDraggingButton = false;
    let buttonDragOffset = { x: 0, y: 0 };
    
    // 创建播放器
    function createPlayer() {
        // 移除已存在的元素
        const existingPlayer = document.getElementById('minimal-player');
        const existingBtn = document.getElementById('media-control-btn');
        if (existingPlayer) existingPlayer.remove();
        if (existingBtn) existingBtn.remove();
        
        // 创建播放器（整个区域可拖动）
        const playerHTML = `
            <div id="minimal-player" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: ${config.playerWidth}px;
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
                    ">
                    <video id="player-video" style="
                        max-width: 100%;
                        max-height: 80vh;
                        object-fit: contain;
                        display: none;
                    "></video>
                </div>
                
                <!-- 视频进度条（更淡的样式） -->
                <div id="video-controls" style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    background: rgba(0,0,0,0.3);  /* 更淡的背景 */
                    padding: 6px 8px;
                    display: none;
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="video-progress" style="
                            flex: 1;
                            height: 4px;
                            background: rgba(255,255,255,0.2);
                            border-radius: 2px;
                            outline: none;
                            cursor: pointer;
                        " min="0" max="100" value="0">
                        <span id="video-time" style="color: rgba(255,255,255,0.8); font-size: 11px; min-width: 75px;">0:00 / 0:00</span>
                    </div>
                </div>
            </div>
        `;
        
        // 创建可拖动控制按钮
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
    
    // 获取按钮位置
    function getButtonPosition() {
        const savedPos = localStorage.getItem('media_button_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            return `left: ${pos.x}px; top: ${pos.y}px;`;
        }
        
        // 默认位置
        switch (config.buttonPosition) {
            case 'bottom-left':
                return 'bottom: 60px; left: 20px;';
            case 'top-left':
                return 'top: 20px; left: 20px;';
            case 'top-right':
                return 'top: 20px; right: 20px;';
            default: // bottom-right
                return 'bottom: 60px; right: 20px;';
        }
    }
    
    // 绑定播放器事件
    function bindPlayerEvents() {
        const player = document.getElementById('minimal-player');
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        
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
        video.addEventListener('loadedmetadata', function() {
            if (config.videoMuted) video.muted = true;
            updateVideoProgress();
            adjustPlayerHeight();
            ensurePlayerInViewport(); // 确保在视口内
        });
        
        video.addEventListener('ended', nextMedia);
        
        // 图片加载后自适应
        const img = document.getElementById('player-img');
        img.addEventListener('load', function() {
            adjustPlayerHeight();
            ensurePlayerInViewport(); // 确保在视口内
        });
    }
    
    // 绑定按钮事件
    function bindButtonEvents() {
        const button = document.getElementById('media-control-btn');
        
        // 按钮点击（切换播放器）
        button.addEventListener('click', function(e) {
            if (!isDraggingButton) {
                togglePlayer();
            }
        });
        
        // 按钮拖动
        button.addEventListener('mousedown', startButtonDrag);
        button.addEventListener('touchstart', startButtonDrag);
        
        // 移动端优化
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
        
        // 限制在窗口范围内
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
        
        // 保存按钮位置
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
        // 如果是进度条点击，不触发拖动
        if (e.target.id === 'video-progress' || e.target.id === 'video-time') return;
        
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
        
        // 检查边界
        if (newX < 0) newX = 10;
        if (newY < 0) newY = 10;
        if (newX + rect.width > viewportWidth) newX = viewportWidth - rect.width - 10;
        if (newY + rect.height > viewportHeight) newY = viewportHeight - rect.height - 10;
        
        player.style.left = newX + 'px';
        player.style.top = newY + 'px';
        player.style.transform = 'none';
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
                ensurePlayerInViewport(); // 调整高度后重新定位
            }
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
            ensurePlayerInViewport(); // 显示时确保在视口内
        } else {
            player.style.display = 'none';
            btn.innerHTML = '🎵';
            btn.title = '开始播放';
            stopPlayback();
        }
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
                setTimeout(nextMedia, 1000);
            });
        } else {
            img.src = url;
            img.style.display = 'block';
            slideTimer = setInterval(nextMedia, config.slideInterval);
        }
        
        setTimeout(adjustPlayerHeight, 100);
    }
    
    function nextMedia() {
        if (config.mediaUrls.length === 0) return;
        currentIndex = config.playMode === 'random' ? 
            Math.floor(Math.random() * config.mediaUrls.length) : 
            (currentIndex + 1) % config.mediaUrls.length;
        loadCurrentMedia();
    }
    
    function updateVideoProgress() {
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        const timeDisplay = document.getElementById('video-time');
        
        if (video.duration > 0) {
            const progressPercent = (video.currentTime / video.duration) * 100;
            progress.value = progressPercent;
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)/i.test(url);
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
                    <label>播放器透明度:</label>
                    <input type="range" class="form-control" id="mp-opacity" min="10" max="100" value="${config.playerOpacity * 100}">
                    <small class="form-text text-muted">当前: ${Math.round(config.playerOpacity * 100)}%</small>
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
                    <label>图片切换间隔 (毫秒):</label>
                    <input type="number" class="form-control" id="mp-interval" value="${config.slideInterval}" min="1000" max="10000">
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mp-muted" ${config.videoMuted ? 'checked' : ''}> 视频静音播放</label>
                </div>
                
                <div class="form-group">
                    <label>播放器宽度:</label>
                    <input type="number" class="form-control" id="mp-width" value="${config.playerWidth}" min="200" max="800">
                    <small class="form-text text-muted">高度会根据媒体比例自动调整</small>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表:</label>
                    <textarea class="form-control" id="mp-urls" rows="5" placeholder="每行一个URL" style="font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-sm btn-success" id="mp-save">保存设置</button>
                    <button class="btn btn-sm btn-primary" id="mp-test">测试播放</button>
                    <button class="btn btn-sm btn-secondary" id="mp-reset-btn">重置按钮位置</button>
                </div>
                
                <div id="mp-status" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
        `;
        
        extensionsArea.insertAdjacentHTML('beforeend', html);
        bindSettingsEvents();
    }
    
    function bindSettingsEvents() {
        $('#mp-enabled').on('change', function() {
            config.enabled = this.checked;
            document.getElementById('media-control-btn').style.display = this.checked ? 'flex' : 'none';
            if (!this.checked && isPlayerVisible) togglePlayer();
            saveConfig();
            showStatus('设置已更新');
        });
        
        $('#mp-button-position').on('change', function() {
            config.buttonPosition = this.value;
            localStorage.removeItem('media_button_position'); // 清除保存的位置
            createPlayer(); // 重新创建播放器
            saveConfig();
            showStatus('按钮位置已更新');
        });
        
        $('#mp-opacity').on('input', function() {
            const opacity = parseInt(this.value) / 100;
            config.playerOpacity = opacity;
            const player = document.getElementById('minimal-player');
            if (player) {
                player.style.background = `rgba(0, 0, 0, ${opacity})`;
            }
            $('small.form-text').text(`当前: ${this.value}%`);
            saveConfig();
        });
        
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
        
        $('#mp-interval').on('input', function() {
            config.slideInterval = parseInt(this.value) || 3000;
            saveConfig();
        });
        
        $('#mp-muted').on('change', function() {
            config.videoMuted = this.checked;
            saveConfig();
            showStatus('静音设置已更新');
        });
        
        $('#mp-width').on('input', function() {
            config.playerWidth = parseInt(this.value) || 300;
            const player = document.getElementById('minimal-player');
            if (player) {
                player.style.width = config.playerWidth + 'px';
                adjustPlayerHeight();
                ensurePlayerInViewport();
            }
            saveConfig();
            showStatus('播放器宽度已更新');
        });
        
        $('#mp-urls').on('input', function() {
            config.mediaUrls = this.value.split('\n').filter(url => url.trim());
            saveConfig();
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
    
    function showStatus(message) {
        const statusEl = document.getElementById('mp-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = 'green';
            setTimeout(() => statusEl.textContent = '', 3000);
        }
    }
    
    // 初始化
    function initialize() {
        console.log('🔧 初始化最终修复版播放器...');
        
        loadConfig();
        createPlayer();
        createSettingsPanel();
        
        // 添加CSS样式（优化进度条颜色）
        const style = document.createElement('style');
        style.textContent = `
            #minimal-player {
                transition: transform 0.3s ease;
            }
            #minimal-player:hover {
                transform: scale(1.02);
            }
            #video-progress::-webkit-slider-thumb {
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #6b7280;  /* 灰色，不显眼 */
                cursor: pointer;
                border: 2px solid #d1d5db;
            }
            #video-progress::-webkit-slider-runnable-track {
                background: rgba(255,255,255,0.1);  /* 淡色进度条 */
                height: 4px;
                border-radius: 2px;
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
                background: rgba(255,255,255,0.1);
                height: 4px;
                border-radius: 2px;
                border: none;
            }
            #media-control-btn:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
        
        // 窗口大小变化时重新定位
        window.addEventListener('resize', function() {
            if (isPlayerVisible) {
                ensurePlayerInViewport();
            }
        });
        
        console.log('✅ 最终修复版播放器初始化完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
