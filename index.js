// 文件名: index.js - 极简媒体播放器
(function() {
    console.log('🎵 极简媒体播放器加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '1.0.0';
    
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
        videoMuted: true        // 视频静音
    };
    
    let currentIndex = 0;
    let isPlayerVisible = false;
    let slideTimer = null;
    
    // 创建极简播放器
    function createMinimalPlayer() {
        const playerHTML = `
            <div id="minimal-player" style="
                position: fixed;
                bottom: 120px;
                right: 20px;
                width: 300px;
                height: 200px;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 10px;
                z-index: 10000;
                display: none;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
                <!-- 媒体显示区域 -->
                <div id="player-content" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <img id="player-img" style="max-width: 100%; max-height: 100%; object-fit: contain; display: none;">
                    <video id="player-video" style="width: 100%; height: 100%; object-fit: contain; display: none;"></video>
                </div>
                
                <!-- 视频进度条（仅视频模式显示） -->
                <div id="video-progress" style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.3);
                    display: none;
                ">
                    <div id="progress-bar" style="height: 100%; background: #4299e1; width: 0%; transition: width 0.1s;"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        
        // 视频进度更新
        const video = document.getElementById('player-video');
        video.addEventListener('timeupdate', updateVideoProgress);
        video.addEventListener('loadedmetadata', function() {
            if (config.videoMuted) {
                video.muted = true;
            }
        });
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
        
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        
        // 按钮点击事件
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
        
        // 图片模式：启动幻灯片
        if (config.mediaType === 'image' || config.mediaType === 'mixed') {
            startSlideShow();
        }
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
        document.getElementById('video-progress').style.display = 'none';
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
        const progress = document.getElementById('video-progress');
        
        // 隐藏所有
        img.style.display = 'none';
        video.style.display = 'none';
        progress.style.display = 'none';
        
        if (isVideo) {
            // 视频模式
            video.src = url;
            video.style.display = 'block';
            progress.style.display = 'block';
            
            if (config.videoMuted) {
                video.muted = true;
            }
            
            video.play().catch(e => {
                console.log('视频播放失败:', e);
            });
        } else {
            // 图片模式
            img.src = url;
            img.style.display = 'block';
        }
    }
    
    // 开始幻灯片播放（图片模式）
    function startSlideShow() {
        if (slideTimer) {
            clearInterval(slideTimer);
        }
        
        slideTimer = setInterval(() => {
            nextMedia();
        }, config.slideInterval);
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
    
    // 更新视频进度条
    function updateVideoProgress() {
        const video = document.getElementById('player-video');
        const progressBar = document.getElementById('progress-bar');
        
        if (video.duration > 0) {
            const progress = (video.currentTime / video.duration) * 100;
            progressBar.style.width = progress + '%';
        }
        
        // 视频播放结束自动下一个
        if (video.ended) {
            nextMedia();
        }
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
                
                <div class="form-group" id="slide-interval-group" style="${config.mediaType === 'video' ? 'display: none;' : ''}">
                    <label>图片切换间隔 (毫秒):</label>
                    <input type="number" class="form-control" id="mm-interval" value="${config.slideInterval}" min="1000" max="10000">
                </div>
                
                <div class="form-group" id="video-muted-group" style="${config.mediaType === 'image' ? 'display: none;' : ''}">
                    <label><input type="checkbox" id="mm-muted" ${config.videoMuted ? 'checked' : ''}> 视频静音播放</label>
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
        // 启用开关
        $('#mm-enabled').on('change', function() {
            config.enabled = this.checked;
            document.getElementById('media-control-btn').style.display = this.checked ? 'flex' : 'none';
            if (!this.checked) {
                togglePlayer(); // 如果禁用，关闭播放器
            }
            saveConfig();
        });
        
        // 媒体类型变化
        $('#mm-media-type').on('change', function() {
            config.mediaType = this.value;
            
            // 显示/隐藏相关设置
            if (this.value === 'image') {
                $('#slide-interval-group').show();
                $('#video-muted-group').hide();
            } else if (this.value === 'video') {
                $('#slide-interval-group').hide();
                $('#video-muted-group').show();
            } else {
                $('#slide-interval-group').show();
                $('#video-muted-group').show();
            }
            
            saveConfig();
        });
        
        // 其他设置
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
        
        $('#mm-urls').on('input', function() {
            config.mediaUrls = this.value.split('\n').filter(url => url.trim());
            saveConfig();
        });
        
        // 保存按钮
        $('#mm-save').on('click', function() {
            saveConfig();
            showStatus('✅ 设置已保存');
        });
        
        // 测试按钮
        $('#mm-test').on('click', function() {
            if (!isPlayerVisible) {
                togglePlayer();
            }
            showStatus('🎵 播放器已启动');
        });
    }
    
    // 显示状态
    function showStatus(message) {
        $('#mm-status').text(message).css('color', 'green');
        setTimeout(() => $('#mm-status').text(''), 3000);
    }
    
    // 初始化
    function initialize() {
        console.log('🔧 初始化极简播放器...');
        
        loadConfig();
        createMinimalPlayer();
        createControlButton();
        createSettingsPanel();
        
        // 根据启用状态显示/隐藏按钮
        document.getElementById('media-control-btn').style.display = config.enabled ? 'flex' : 'none';
        
        console.log('✅ 极简播放器初始化完成');
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
        
        #media-control-btn:active {
            transform: scale(0.95);
        }
        
        /* 移动端优化 */
        @media (max-width: 768px) {
            #minimal-player {
                width: 250px;
                height: 170px;
                bottom: 100px;
                right: 10px;
            }
            
            #media-control-btn {
                width: 60px;
                height: 60px;
                font-size: 24px;
                bottom: 70px;
                right: 15px;
            }
        }
        
        @media (max-width: 480px) {
            #minimal-player {
                width: 200px;
                height: 140px;
                bottom: 90px;
                right: 10px;
            }
            
            #media-control-btn {
                width: 70px;
                height: 70px;
                font-size: 28px;
                bottom: 60px;
                right: 10px;
            }
        }
        
        /* 视频进度条样式 */
        #video-progress:hover {
            height: 8px;
        }
        
        #progress-bar {
            transition: width 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
