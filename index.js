// 文件名: index.js - 修复加载问题的媒体播放器
(function() {
    console.log('🎵 媒体播放器插件开始加载...');
    
    // 等待SillyTavern环境就绪
    function waitForSillyTavern() {
        return new Promise((resolve) => {
            if (window.SillyTavern) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.SillyTavern) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }
    
    // 主初始化函数
    async function initializePlugin() {
        try {
            console.log('🔧 等待SillyTavern环境...');
            await waitForSillyTavern();
            console.log('✅ SillyTavern环境就绪');
            
            // 插件配置
            const PLUGIN_NAME = 'minimal-media-player';
            const PLUGIN_VERSION = '1.2.0';
            
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
                playerHeight: 200
            };
            
            let currentIndex = 0;
            let isPlayerVisible = false;
            let slideTimer = null;
            let isDraggingPlayer = false;
            let playerDragOffset = { x: 0, y: 0 };
            
            // 加载配置
            function loadConfig() {
                try {
                    const saved = localStorage.getItem('minimal_media_config');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        Object.assign(config, parsed);
                        console.log('✅ 配置加载成功');
                    }
                } catch (error) {
                    console.warn('⚠️ 加载配置失败，使用默认配置');
                }
            }
            
            // 保存配置
            function saveConfig() {
                try {
                    localStorage.setItem('minimal_media_config', JSON.stringify(config));
                    console.log('💾 配置已保存');
                } catch (error) {
                    console.error('❌ 保存配置失败');
                }
            }
            
            // 创建播放器UI
            function createPlayerUI() {
                // 如果已存在，先移除
                const existingPlayer = document.getElementById('minimal-player');
                const existingBtn = document.getElementById('media-control-btn');
                if (existingPlayer) existingPlayer.remove();
                if (existingBtn) existingBtn.remove();
                
                // 创建播放器
                const playerHTML = `
                    <div id="minimal-player" style="
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: ${config.playerWidth}px;
                        height: ${config.playerHeight}px;
                        background: rgba(0, 0, 0, 0.95);
                        border-radius: 12px;
                        z-index: 10000;
                        display: none;
                        overflow: hidden;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                        cursor: move;
                        border: 2px solid rgba(255,255,255,0.1);
                    ">
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
                        
                        <div id="player-content" style="
                            width: 100%;
                            height: ${config.playerHeight - 30}px;
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
                
                // 创建控制按钮
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
                        display: ${config.enabled ? 'flex' : 'none'};
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
                document.body.insertAdjacentHTML('beforeend', buttonHTML);
                bindPlayerEvents();
            }
            
            // 绑定播放器事件
            function bindPlayerEvents() {
                const player = document.getElementById('minimal-player');
                const header = document.getElementById('player-header');
                const closeBtn = document.getElementById('player-close');
                const controlBtn = document.getElementById('media-control-btn');
                const video = document.getElementById('player-video');
                const progress = document.getElementById('video-progress');
                
                // 控制按钮点击
                controlBtn.addEventListener('click', togglePlayer);
                
                // 播放器拖动
                header.addEventListener('mousedown', startPlayerDrag);
                header.addEventListener('touchstart', startPlayerDrag);
                
                // 关闭按钮
                closeBtn.addEventListener('click', togglePlayer);
                
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
                });
                
                video.addEventListener('ended', nextMedia);
                
                // 移动端优化
                controlBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    this.style.transform = 'scale(0.95)';
                });
                
                controlBtn.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    this.style.transform = 'scale(1)';
                    togglePlayer();
                });
            }
            
            // 播放器拖动函数
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
            
            function stopPlayerDrag() {
                isDraggingPlayer = false;
                document.getElementById('minimal-player').style.cursor = 'move';
                ['mousemove', 'mouseup', 'touchmove', 'touchend'].forEach(event => {
                    document.removeEventListener(event, arguments.callee.caller);
                });
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
                    videoControls.style.display = 'block';
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
            
            // 创建设置面板
            function createSettingsPanel() {
                const extensionsArea = document.getElementById('extensions_settings');
                if (!extensionsArea) {
                    console.error('❌ 找不到扩展设置区域');
                    setTimeout(createSettingsPanel, 500);
                    return;
                }
                
                // 移除旧的设置项
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
                        
                        <div class="row">
                            <div class="col-6">
                                <label>播放器宽度:</label>
                                <input type="number" class="form-control" id="mp-width" value="${config.playerWidth}" min="200" max="800">
                            </div>
                            <div class="col-6">
                                <label>播放器高度:</label>
                                <input type="number" class="form-control" id="mp-height" value="${config.playerHeight}" min="150" max="600">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>媒体URL列表:</label>
                            <textarea class="form-control" id="mp-urls" rows="5" placeholder="每行一个URL" style="font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                        </div>
                        
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success" id="mp-save">保存设置</button>
                            <button class="btn btn-sm btn-primary" id="mp-test">测试播放</button>
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
                
                $('#mp-width, #mp-height').on('input', function() {
                    config.playerWidth = parseInt($('#mp-width').val()) || 300;
                    config.playerHeight = parseInt($('#mp-height').val()) || 200;
                    const player = document.getElementById('minimal-player');
                    const content = document.getElementById('player-content');
                    if (player) {
                        player.style.width = config.playerWidth + 'px';
                        player.style.height = config.playerHeight + 'px';
                        content.style.height = (config.playerHeight - 30) + 'px';
                    }
                    saveConfig();
                    showStatus('播放器尺寸已更新');
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
            }
            
            function showStatus(message) {
                const statusEl = $('#mp-status');
                statusEl.text(message).css('color', 'green');
                setTimeout(() => statusEl.text(''), 3000);
            }
            
            // 添加CSS样式
            const style = document.createElement('style');
            style.textContent = `
                #minimal-player {
                    transition: transform 0.3s ease;
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
                #media-control-btn:active {
                    transform: scale(0.95);
                }
            `;
            document.head.appendChild(style);
            
            // 初始化执行
            loadConfig();
            createPlayerUI();
            createSettingsPanel();
            
            console.log('🎊 媒体播放器插件初始化完成');
            
        } catch (error) {
            console.error('❌ 插件初始化失败:', error);
        }
    }
    
    // 启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePlugin);
    } else {
        initializePlugin();
    }
    
})();
