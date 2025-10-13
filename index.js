// 文件名: index.js - 修复版极简媒体播放器
(function() {
    console.log('🎵 修复版极简媒体播放器加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '1.1.0';
    
    // 配置
    let config = {
        enabled: true,
        mediaType: 'mixed',     // mixed, image, video
        playMode: 'sequential', // sequential, random
        mediaUrls: [
            'https://picsum.photos/400/300?random=1',
            'https://picsum.photos/400/300?random=2'
        ],
        slideInterval: 3000,    // 图片切换间隔(ms)
        videoMuted: true,       // 视频静音
        playerWidth: 300,       // 播放器宽度
        playerHeight: 200       // 播放器高度
    };
    
    let currentIndex = 0;
    let isPlayerVisible = false;
    let slideTimer = null;
    let isDraggingPlayer = false;
    let playerDragOffset = { x: 0, y: 0 };
    
    // 创建可拖动播放器
    function createDraggablePlayer() {
        const playerHTML = `
            <div id="minimal-player" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border-radius: 12px;
                z-index: 10000;
                display: none;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                cursor: move;
                border: 2px solid rgba(255,255,255,0.1);
            ">
                <!-- 标题栏（拖动区域） -->
                <div id="player-header" style="
                    padding: 8px 12px;
                    background: rgba(255,255,255,0.1);
                    cursor: move;
                    user-select: none;
                    font-size: 12px;
                    color: #ccc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>媒体播放器</span>
                    <span id="player-close" style="cursor: pointer; font-size: 16px;">×</span>
                </div>
                
                <!-- 媒体显示区域 -->
                <div id="player-content" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                ">
                    <img id="player-img" style="
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                        display: none;
                    ">
                    <video id="player-video" style="
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                        display: none;
                    "></video>
                </div>
                
                <!-- 视频进度条 -->
                <div id="video-controls" style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    background: rgba(0,0,0,0.7);
                    padding: 8px;
                    display: none;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" id="video-progress" style="
                            flex: 1;
                            height: 4px;
                            background: #555;
                            border-radius: 2px;
                            outline: none;
                            cursor: pointer;
                        " min="0" max="100" value="0">
                        <span id="video-time" style="color: #ccc; font-size: 11px; min-width: 80px;">0:00 / 0:00</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        bindPlayerEvents();
    }
    
    // 绑定播放器事件
    function bindPlayerEvents() {
        const player = document.getElementById('minimal-player');
        const header = document.getElementById('player-header');
        const closeBtn = document.getElementById('player-close');
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        
        // 拖动事件
        header.addEventListener('mousedown', startPlayerDrag);
        header.addEventListener('touchstart', startPlayerDrag);
        
        // 关闭按钮
        closeBtn.addEventListener('click', togglePlayer);
        
        // 视频进度条事件
        progress.addEventListener('input', function() {
            if (video.duration) {
                video.currentTime = (this.value / 100) * video.duration;
            }
        });
        
        progress.addEventListener('change', function() {
            if (video.duration) {
                video.currentTime = (this.value / 100) * video.duration;
            }
        });
        
        // 视频时间更新
        video.addEventListener('timeupdate', updateVideoProgress);
        video.addEventListener('loadedmetadata', function() {
            if (config.videoMuted) {
                video.muted = true;
            }
            updateVideoProgress();
        });
        
        video.addEventListener('ended', function() {
            // 视频结束自动下一个
            nextMedia();
        });
    }
    
    // 开始拖动播放器
    function startPlayerDrag(e) {
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
        
        // 限制在窗口范围内
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
    
    // 创建控制按钮
    function createControlButton() {
        const buttonHTML = `
            <div id="media-control-btn" style="
                position: fixed;
                bottom: 60px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                font-size: 20px;
                cursor: pointer;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                user-select: none;
                transition: transform 0.2s;
            " title="点击切换媒体播放">
                🎵
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        
        // 按钮事件
        document.getElementById('media-control-btn').addEventListener('click', togglePlayer);
        
        // 移动端优化
        document.getElementById('media-control-btn').addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.95)';
        });
        
        document.getElementById('media-control-btn').addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
            togglePlayer();
        });
    }
    
    // 切换播放器显示/隐藏
    function togglePlayer() {
        isPlayerVisible = !isPlayerVisible;
        const player = document.getElementById('minimal-player');
        const btn = document.getElementById('media-control-btn');
        
        updatePlayerSize(); // 更新播放器尺寸
        
        if (isPlayerVisible) {
            player.style.display = 'block';
            btn.innerHTML = '⏹️';
            btn.title = '停止播放';
            startPlayback();
        } else {
            player.style.display = 'none';
            btn.innerHTML = '🎵';
            btn.title = '开始播放';
            stopPlayback();
        }
    }
    
    // 更新播放器尺寸
    function updatePlayerSize() {
        const player = document.getElementById('minimal-player');
        const content = document.getElementById('player-content');
        
        player.style.width = config.playerWidth + 'px';
        player.style.height = config.playerHeight + 'px';
        content.style.width = config.playerWidth + 'px';
        content.style.height = (config.playerHeight - 30) + 'px'; // 减去标题栏高度
    }
    
    // 开始播放
    function startPlayback() {
        if (config.mediaUrls.length === 0) return;
        
        // 根据播放模式选择起始索引
        if (config.playMode === 'random') {
            currentIndex = Math.floor(Math.random() * config.mediaUrls.length);
        } else {
            currentIndex = 0;
        }
        
        loadCurrentMedia();
    }
    
    // 停止播放
    function stopPlayback() {
        // 停止幻灯片
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
        
        // 停止视频
        const video = document.getElementById('player-video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        
        // 隐藏所有媒体
        document.getElementById('player-img').style.display = 'none';
        document.getElementById('player-video').style.display = 'none';
        document.getElementById('video-controls').style.display = 'none';
    }
    
    // 加载当前媒体
    function loadCurrentMedia() {
        if (config.mediaUrls.length === 0) return;
        
        const url = config.mediaUrls[currentIndex];
        const isVideo = isVideoUrl(url);
        
        // 根据媒体类型过滤
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
        
        // 隐藏所有
        img.style.display = 'none';
        video.style.display = 'none';
        videoControls.style.display = 'none';
        
        // 停止之前的幻灯片
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
        
        if (isVideo) {
            // 视频模式
            video.src = url;
            video.style.display = 'block';
            videoControls.style.display = 'block';
            
            if (config.videoMuted) {
                video.muted = true;
            }
            
            video.play().catch(e => {
                console.log('视频播放失败:', e);
                // 播放失败时自动下一个
                setTimeout(nextMedia, 1000);
            });
        } else {
            // 图片模式 - 启动幻灯片
            img.src = url;
            img.style.display = 'block';
            
            slideTimer = setInterval(() => {
                nextMedia();
            }, config.slideInterval);
        }
    }
    
    // 下一个媒体
    function nextMedia() {
        if (config.mediaUrls.length === 0) return;
        
        if (config.playMode === 'random') {
            currentIndex = Math.floor(Math.random() * config.mediaUrls.length);
        } else {
            currentIndex = (currentIndex + 1) % config.mediaUrls.length;
        }
        
        loadCurrentMedia();
    }
    
    // 更新视频进度
    function updateVideoProgress() {
        const video = document.getElementById('player-video');
        const progress = document.getElementById('video-progress');
        const timeDisplay = document.getElementById('video-time');
        
        if (video.duration > 0) {
            const current = video.currentTime;
            const duration = video.duration;
            const progressPercent = (current / duration) * 100;
            
            progress.value = progressPercent;
            
            // 更新时间显示
            const currentTime = formatTime(current);
            const totalTime = formatTime(duration);
            timeDisplay.textContent = `${currentTime} / ${totalTime}`;
        }
    }
    
    // 格式化时间
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 判断URL类型
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)/i.test(url);
    }
    
    // 保存配置
    function saveConfig() {
        localStorage.setItem('minimal_media_config', JSON.stringify(config));
    }
    
    // 加载配置
    function loadConfig() {
        const saved = localStorage.getItem('minimal_media_config');
        if (saved) {
            config = JSON.parse(saved);
        }
    }
    
    // 创建设置面板
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🎵 极简媒体播放器 v${PLUGIN_VERSION}</h5>
                <p style="color: #666; font-size: 12px;">点击右下角按钮切换播放器显示/隐藏</p>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mm-enabled" ${config.enabled ? 'checked' : ''}> 启用播放器</label>
                </div>
                
                <div class="form-group">
                    <label>媒体类型:</label>
                    <select class="form-control" id="mm-media-type">
                        <option value="mixed" ${config.mediaType === 'mixed' ? 'selected' : ''}>混合模式</option>
                        <option value="image" ${config.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                        <option value="video" ${config.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>播放模式:</label>
                    <select class="form-control" id="mm-play-mode">
                        <option value="sequential" ${config.playMode === 'sequential' ? 'selected' : ''}>顺序播放</option>
                        <option value="random" ${config.playMode === 'random' ? 'selected' : ''}>随机播放</option>
                    </select>
                </div>
                
                <div class="form-group" id="slide-interval-group">
                    <label>图片切换间隔 (毫秒):</label>
                    <input type="number" class="form-control" id="mm-interval" value="${config.slideInterval}" min="1000" max="10000">
                    <small class="form-text text-muted">仅图片模式生效</small>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="mm-muted" ${config.videoMuted ? 'checked' : ''}> 视频静音播放</label>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <label>播放器宽度:</label>
                        <input type="number" class="form-control" id="mm-width" value="${config.playerWidth}" min="200" max="800">
                    </div>
                    <div class="col-6">
                        <label>播放器高度:</label>
                        <input type="number" class="form-control" id="mm-height" value="${config.playerHeight}" min="150" max="600">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表:</label>
                    <textarea class="form-control" id="mm-urls" rows="5" placeholder="每行一个URL" style="font-size: 12px; font-family: monospace;">${config.mediaUrls.join('\n')}</textarea>
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-sm btn-success" id="mm-save">保存设置</button>
                    <button class="btn btn-sm btn-primary" id="mm-test">测试播放</button>
                </div>
                
                <div id="mm-status" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        bindSettingsEvents();
    }
    
    // 绑定设置事件
    function bindSettingsEvents() {
        $('#mm-enabled').on('change', function() {
            config.enabled = this.checked;
            document.getElementById('media-control-btn').style.display = this.checked ? 'flex' : 'none';
            if (!this.checked && isPlayerVisible) {
                togglePlayer();
            }
            saveConfig();
        });
        
        $('#mm-media-type').on('change', function() {
            config.mediaType = this.value;
            saveConfig();
        });
        
        $('#mm-play-mode').on('change', function() {
            config.playMode = this.value;
            saveConfig();
        });
        
        $('#mm-interval').on('input', function() {
            config.slideInterval = parseInt(this.value) || 3000;
            saveConfig();
        });
        
        $('#mm-muted').on('change', function() {
            config.videoMuted = this.checked;
            saveConfig();
        });
        
        $('#mm-width, #mm-height').on('input', function() {
            config.playerWidth = parseInt($('#mm-width').val()) || 300;
            config.playerHeight = parseInt($('#mm-height').val()) || 200;
            if (isPlayerVisible) {
                updatePlayerSize();
            }
            saveConfig();
        });
        
        $('#mm-urls').on('input', function() {
            config.mediaUrls = this.value.split('\n').filter(url => url.trim());
            saveConfig();
        });
        
        $('#mm-save').on('click', function() {
            saveConfig();
            showStatus('✅ 设置已保存');
        });
        
        $('#mm-test').on('click', function() {
            if (!isPlayerVisible) {
                togglePlayer();
            }
            showStatus('🎵 播放器已启动');
        });
    }
    
    function showStatus(message) {
        $('#mm-status').text(message).css('color', 'green');
        setTimeout(() => $('#mm-status').text(''), 3000);
    }
    
    function initialize() {
        console.log('🔧 初始化修复版播放器...');
        
        loadConfig();
        createDraggablePlayer();
        createControlButton();
        createSettingsPanel();
        
        document.getElementById('media-control-btn').style.display = config.enabled ? 'flex' : 'none';
        
        console.log('✅ 修复版播放器初始化完成');
    }
    
    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        #minimal-player {
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        
        #minimal-player:hover {
            transform: scale(1.02);
        }
        
        #player-header:hover {
            background: rgba(255,255,255,0.15);
        }
        
        #player-close:hover {
            color: white;
            transform: scale(1.2);
        }
        
        #video-progress::-webkit-slider-thumb {
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4299e1;
            cursor: pointer;
        }
        
        #video-progress::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4299e1;
            cursor: pointer;
            border: none;
        }
        
        @media (max-width: 768px) {
            #media-control-btn {
                width: 60px;
                height: 60px;
                font-size: 24px;
                bottom: 70px;
                right: 15px;
            }
        }
    `;
    document.head.appendChild(style);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
