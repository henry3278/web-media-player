// 文件名: index.js - 简洁可拖动媒体播放器
(function() {
    console.log('🎵 简洁媒体播放器加载...');
    
    const PLUGIN_NAME = 'simple-media-player';
    const PLUGIN_VERSION = '1.0.0';
    
    // 配置
    let config = {
        enabled: true,
        mediaType: 'mixed', // mixed, image, video
        mediaUrls: [
            'https://picsum.photos/400/300?random=1',
            'https://picsum.photos/400/300?random=2'
        ],
        autoPlay: true,
        loop: true
    };
    
    let currentIndex = 0;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // 创建浮动按钮
    function createFloatButton() {
        const buttonHTML = `
            <div id="media-float-btn" style="
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                font-size: 24px;
                cursor: move;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                user-select: none;
                touch-action: none;
            " title="媒体播放器">
                🎵
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        bindButtonEvents();
    }
    
    // 绑定按钮事件（拖动+点击）
    function bindButtonEvents() {
        const btn = document.getElementById('media-float-btn');
        
        // 鼠标/触摸拖动
        btn.addEventListener('mousedown', startDrag);
        btn.addEventListener('touchstart', startDrag);
        
        // 点击打开播放器
        btn.addEventListener('click', function(e) {
            if (!isDragging) {
                openPlayer();
            }
        });
        
        // 移动端优化：防止滚动时误触
        btn.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    
    // 开始拖动
    function startDrag(e) {
        isDragging = true;
        const btn = document.getElementById('media-float-btn');
        const rect = btn.getBoundingClientRect();
        
        if (e.type === 'mousedown') {
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        } else {
            const touch = e.touches[0];
            dragOffset.x = touch.clientX - rect.left;
            dragOffset.y = touch.clientY - rect.top;
            document.addEventListener('touchmove', onDrag);
            document.addEventListener('touchend', stopDrag);
        }
        
        btn.style.cursor = 'grabbing';
        btn.style.opacity = '0.8';
    }
    
    // 拖动中
    function onDrag(e) {
        if (!isDragging) return;
        
        const btn = document.getElementById('media-float-btn');
        let clientX, clientY;
        
        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        
        // 限制在窗口范围内
        const x = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, clientX - dragOffset.x));
        const y = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, clientY - dragOffset.y));
        
        btn.style.left = x + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
        btn.style.top = y + 'px';
    }
    
    // 停止拖动
    function stopDrag() {
        isDragging = false;
        const btn = document.getElementById('media-float-btn');
        btn.style.cursor = 'grab';
        btn.style.opacity = '1';
        
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', stopDrag);
        
        // 保存位置
        saveButtonPosition();
    }
    
    // 保存按钮位置
    function saveButtonPosition() {
        const btn = document.getElementById('media-float-btn');
        const rect = btn.getBoundingClientRect();
        localStorage.setItem('media_btn_position', JSON.stringify({
            x: rect.left,
            y: rect.top
        }));
    }
    
    // 加载按钮位置
    function loadButtonPosition() {
        const saved = localStorage.getItem('media_btn_position');
        if (saved) {
            const pos = JSON.parse(saved);
            const btn = document.getElementById('media-float-btn');
            btn.style.left = pos.x + 'px';
            btn.style.top = pos.y + 'px';
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
        }
    }
    
    // 打开播放器
    function openPlayer() {
        // 如果已有播放器，先关闭
        closePlayer();
        
        const playerHTML = `
            <div id="media-player" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90vw;
                max-width: 500px;
                max-height: 80vh;
                background: rgba(45, 55, 72, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                z-index: 10001;
                color: white;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            ">
                <!-- 标题栏 -->
                <div style="padding: 15px; border-bottom: 1px solid #4a5568; display: flex; justify-content: space-between; align-items: center;">
                    <strong>媒体播放器</strong>
                    <button onclick="closePlayer()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
                </div>
                
                <!-- 内容区域 -->
                <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <!-- 媒体显示 -->
                    <div id="media-display" style="width: 100%; text-align: center;">
                        <img id="player-img" style="max-width: 100%; max-height: 300px; border-radius: 10px; display: none;">
                        <video id="player-video" controls style="max-width: 100%; max-height: 300px; border-radius: 10px; display: none;"></video>
                    </div>
                    
                    <!-- 控制按钮 -->
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                        <button onclick="prevMedia()" class="media-control-btn">⬅️</button>
                        <button onclick="togglePlay()" class="media-control-btn" id="play-btn">▶️</button>
                        <button onclick="nextMedia()" class="media-control-btn">➡️</button>
                    </div>
                    
                    <!-- 进度信息 -->
                    <div style="font-size: 14px; color: #a0aec0;">
                        <span id="media-info">-/-</span>
                    </div>
                </div>
            </div>
            
            <!-- 遮罩层 -->
            <div id="media-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            " onclick="closePlayer()"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        loadCurrentMedia();
        
        // 添加到全局函数
        window.closePlayer = closePlayer;
        window.prevMedia = prevMedia;
        window.nextMedia = nextMedia;
        window.togglePlay = togglePlay;
    }
    
    // 关闭播放器
    function closePlayer() {
        const player = document.getElementById('media-player');
        const overlay = document.getElementById('media-overlay');
        if (player) player.remove();
        if (overlay) overlay.remove();
    }
    
    // 加载当前媒体
    function loadCurrentMedia() {
        if (config.mediaUrls.length === 0) return;
        
        const url = config.mediaUrls[currentIndex];
        const isVideo = isVideoUrl(url);
        const shouldShow = (config.mediaType === 'mixed') || 
                          (config.mediaType === 'image' && !isVideo) ||
                          (config.mediaType === 'video' && isVideo);
        
        if (!shouldShow) {
            // 跳过不符合类型的媒体
            nextMedia();
            return;
        }
        
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        
        img.style.display = 'none';
        video.style.display = 'none';
        
        if (isVideo) {
            video.src = url;
            video.style.display = 'block';
            if (config.autoPlay) video.play();
            if (config.loop) video.loop = true;
        } else {
            img.src = url;
            img.style.display = 'block';
        }
        
        updateMediaInfo();
    }
    
    // 上一个媒体
    function prevMedia() {
        if (config.mediaUrls.length === 0) return;
        currentIndex = (currentIndex - 1 + config.mediaUrls.length) % config.mediaUrls.length;
        loadCurrentMedia();
    }
    
    // 下一个媒体
    function nextMedia() {
        if (config.mediaUrls.length === 0) return;
        currentIndex = (currentIndex + 1) % config.mediaUrls.length;
        loadCurrentMedia();
    }
    
    // 播放/暂停
    function togglePlay() {
        const video = document.getElementById('player-video');
        const btn = document.getElementById('play-btn');
        
        if (video && video.style.display !== 'none') {
            if (video.paused) {
                video.play();
                btn.innerHTML = '⏸️';
            } else {
                video.pause();
                btn.innerHTML = '▶️';
            }
        }
    }
    
    // 更新媒体信息
    function updateMediaInfo() {
        const info = document.getElementById('media-info');
        info.textContent = `${currentIndex + 1}/${config.mediaUrls.length}`;
    }
    
    // 判断URL类型
    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi)/i.test(url);
    }
    
    // 保存配置
    function saveConfig() {
        localStorage.setItem('simple_media_config', JSON.stringify(config));
    }
    
    // 加载配置
    function loadConfig() {
        const saved = localStorage.getItem('simple_media_config');
        if (saved) {
            config = JSON.parse(saved);
        }
    }
    
    // 创建设置面板
    function createSettingsPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🎵 简洁媒体播放器 v${PLUGIN_VERSION}</h5>
                
                <div class="form-group">
                    <label><input type="checkbox" id="sm-enabled" ${config.enabled ? 'checked' : ''}> 启用播放器</label>
                </div>
                
                <div class="form-group">
                    <label>媒体类型:</label>
                    <select class="form-control" id="sm-media-type">
                        <option value="mixed" ${config.mediaType === 'mixed' ? 'selected' : ''}>混合模式</option>
                        <option value="image" ${config.mediaType === 'image' ? 'selected' : ''}>仅图片</option>
                        <option value="video" ${config.mediaType === 'video' ? 'selected' : ''}>仅视频</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>媒体URL列表:</label>
                    <textarea class="form-control" id="sm-urls" rows="4" placeholder="每行一个URL" style="font-size: 12px;">${config.mediaUrls.join('\n')}</textarea>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="sm-autoplay" ${config.autoPlay ? 'checked' : ''}> 自动播放视频</label>
                </div>
                
                <div class="form-group">
                    <label><input type="checkbox" id="sm-loop" ${config.loop ? 'checked' : ''}> 循环播放</label>
                </div>
                
                <button class="btn btn-sm btn-success" id="sm-save">保存设置</button>
                <button class="btn btn-sm btn-primary" id="sm-test">测试播放器</button>
                
                <div id="sm-status" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        
        // 绑定设置事件
        $('#sm-enabled').on('change', function() {
            config.enabled = this.checked;
            document.getElementById('media-float-btn').style.display = this.checked ? 'flex' : 'none';
            saveConfig();
        });
        
        $('#sm-media-type, #sm-autoplay, #sm-loop').on('change', function() {
            config.mediaType = $('#sm-media-type').val();
            config.autoPlay = $('#sm-autoplay').is(':checked');
            config.loop = $('#sm-loop').is(':checked');
            saveConfig();
        });
        
        $('#sm-urls').on('input', function() {
            config.mediaUrls = this.value.split('\n').filter(url => url.trim());
            saveConfig();
        });
        
        $('#sm-save').on('click', function() {
            saveConfig();
            showStatus('✅ 设置已保存');
        });
        
        $('#sm-test').on('click', function() {
            openPlayer();
            showStatus('🎵 播放器已打开');
        });
    }
    
    // 显示状态
    function showStatus(message) {
        $('#sm-status').text(message).css('color', 'green');
        setTimeout(() => $('#sm-status').text(''), 3000);
    }
    
    // 初始化
    function initialize() {
        console.log('🔧 初始化简洁播放器...');
        
        loadConfig();
        createFloatButton();
        loadButtonPosition();
        createSettingsPanel();
        
        // 根据启用状态显示/隐藏按钮
        document.getElementById('media-float-btn').style.display = config.enabled ? 'flex' : 'none';
        
        console.log('✅ 简洁播放器初始化完成');
    }
    
    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .media-control-btn {
            background: #4a5568;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 15px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        
        .media-control-btn:hover {
            background: #2d3748;
        }
        
        @media (max-width: 768px) {
            #media-float-btn {
                width: 60px;
                height: 60px;
                font-size: 28px;
                bottom: 80px;
                right: 15px;
            }
            
            #media-player {
                width: 95vw;
                max-height: 85vh;
            }
            
            .media-control-btn {
                padding: 12px 18px;
                font-size: 18px;
            }
        }
        
        @media (max-width: 480px) {
            #media-float-btn {
                width: 70px;
                height: 70px;
                font-size: 32px;
            }
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
