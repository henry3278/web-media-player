// index.js - 媒体播放器（含本地媒体功能）
(function() {
    console.log('🎵 媒体播放器加载...');
    
    const PLUGIN_NAME = 'minimal-media-player';
    const PLUGIN_VERSION = '1.0.7'; // 修改：版本号改为v1.0.7
    
    // 配置 - 增加权重配置、备注配置和本地媒体配置
    let config = {
        enabled: true,
        mediaType: 'online-mixed',
        playMode: 'sequential',
        mediaUrls: [
            'https://sns-video-hw.xhscdn.com/1040g00g31nrg28c5g6g05pcs0eo8i3aglumsqv0'
        ],
        localVideos: [], // 新增：本地视频列表
        maxLocalVideos: 50, // 修改：默认50个，最大500个
        slideInterval: 3000,
        videoMuted: true,
        playerWidth: 300,
        playerOpacity: 0.95,
        controlsOpacity: 0.9,
        settingsCollapsed: false,
        activeTab: 'main',
        maxOnlineUrls: 5000,
        playbackMemory: false,
        buttonSize: 'medium',
        buttonColor: 'default', // 新增：播放键颜色，'default' 或 'random'
        domainWeights: {},  // 域名权重配置 {domain: weight}
        domainNotes: {}     // 新增：域名备注配置 {domain: note}
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
    let isFullscreen = false;
    let urlSearchQuery = '';
    let weightSearchQuery = '';  // 权重搜索查询
    let localVideoSearchQuery = ''; // 新增：本地视频搜索查询
    let lastPreviewedUrl = ''; // 新增：最后一次预览的URL
    let currentPreviewIndex = -1; // 新增：当前预览的URL索引
    let currentPreviewUrls = []; // 新增：当前预览的URL列表
    let currentPreviewTab = 'all'; // 新增：当前预览的标签页
    let lastPreviewedLocalVideo = ''; // 新增：最后一次预览的本地视频路径

    // 新增：预览记忆系统 - 分别记忆4个标签页，使用LocalStorage存储
    let previewMemory = {
        all: '',      // 全部标签页最后预览
        images: '',   // 图片标签页最后预览  
        videos: '',   // 视频标签页最后预览
        others: ''    // 其它标签页最后预览
    };

    // 播放记忆存储
    let playbackMemory = {
        url: null,
        time: 0,
        type: null // 'online' 或 'local'
    };

    // 视频缓存优化
    const videoBufferCache = new Map();
    const MAX_CACHE_SIZE = 5;

    // IndexedDB 数据库
    let db = null;
    const DB_NAME = 'MediaPlayerDB';
    const DB_VERSION = 3; // 版本升级，修复播放问题
    const LOCAL_VIDEOS_STORE = 'localVideos';

    // 检测设备类型
    function isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // 获取按钮尺寸像素值
    function getButtonSizePixels() {
        switch (config.buttonSize) {
            case 'small': return 35;
            case 'medium': return 50;
            case 'large': return 65;
            case 'xlarge': return 80;
            default: return 50;
        }
    }

    // 获取播放键颜色样式
    function getButtonColorStyle() {
        if (config.buttonColor === 'random') {
            // 颜色方案 - 生成随机渐变
            const hue1 = Math.floor(Math.random() * 360);
            const hue2 = (hue1 + 60 + Math.floor(Math.random() * 120)) % 360;
            const saturation1 = 70 + Math.floor(Math.random() * 20);
            const saturation2 = 70 + Math.floor(Math.random() * 20);
            const lightness1 = 60 + Math.floor(Math.random() * 20);
            const lightness2 = 60 + Math.floor(Math.random() * 20);
            
            return `linear-gradient(135deg, 
                hsl(${hue1}, ${saturation1}%, ${lightness1}%) 0%, 
                hsl(${hue2}, ${saturation2}%, ${lightness2}%) 100%)`;
        } else {
            // 默认颜色
            return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    // 获取进度条颜色样式
    function getProgressColorStyle() {
        if (config.buttonColor === 'random') {
            // 使用固定的随机颜色，与播放键颜色一致
            // 这里我们使用一个固定的随机种子，确保每次播放颜色一致
            const seed = localStorage.getItem('media_player_random_color_seed') || Math.random().toString(36).substr(2, 9);
            localStorage.setItem('media_player_random_color_seed', seed);
            
            // 基于种子生成固定颜色
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = seed.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            const hue1 = Math.abs(hash % 360);
            const hue2 = (hue1 + 60 + Math.abs((hash >> 8) % 120)) % 360;
            
            return `linear-gradient(90deg, 
                hsl(${hue1}, 75%, 65%) 0%, 
                hsl(${hue2}, 75%, 65%) 100%)`;
        } else {
            // 默认颜色
            return 'linear-gradient(90deg, #667eea, #764ba2)';
        }
    }

    // 初始化 IndexedDB
    function initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('❌ IndexedDB 初始化失败');
                reject(new Error('IndexedDB 初始化失败'));
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('✅ IndexedDB 初始化成功');
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                const oldVersion = event.oldVersion;
                
                // 创建本地视频存储
                if (!database.objectStoreNames.contains(LOCAL_VIDEOS_STORE)) {
                    const store = database.createObjectStore(LOCAL_VIDEOS_STORE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('path', 'path', { unique: true });
                    store.createIndex('name', 'name', { unique: false });
                    console.log('✅ 创建本地视频存储');
                }
                
                // 版本2升级：添加文件数据存储
                if (oldVersion < 2) {
                    console.log('🔄 升级到版本2：支持文件数据存储');
                }
                
                // 版本3升级：移除预览记忆存储，改为LocalStorage
                if (oldVersion < 3) {
                    console.log('🔄 升级到版本3：预览记忆改为LocalStorage存储');
                }
            };
        });
    }

    // 保存预览记忆到 LocalStorage
    function savePreviewMemory() {
        try {
            localStorage.setItem('media_player_preview_memory', JSON.stringify(previewMemory));
            console.log('✅ 预览记忆保存到 LocalStorage');
        } catch (error) {
            console.error('❌ 预览记忆保存失败:', error);
        }
    }

    // 从 LocalStorage 加载预览记忆
    function loadPreviewMemory() {
        try {
            const savedMemory = localStorage.getItem('media_player_preview_memory');
            if (savedMemory) {
                previewMemory = { ...previewMemory, ...JSON.parse(savedMemory) };
                console.log('✅ 预览记忆从 LocalStorage 加载成功:', previewMemory);
            } else {
                console.log('ℹ️ 没有找到预览记忆，使用默认值');
            }
        } catch (error) {
            console.error('❌ 预览记忆加载失败:', error);
        }
    }

    // 保存本地视频到 IndexedDB（修复版）
    async function saveLocalVideosToDB() {
        if (!db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([LOCAL_VIDEOS_STORE], 'readwrite');
            const store = transaction.objectStore(LOCAL_VIDEOS_STORE);
            
            // 清空现有数据
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // 保存新数据
                const videosToSave = config.localVideos.map((video, index) => ({
                    id: index + 1,
                    path: video.path,
                    name: video.name,
                    size: video.size,
                    lastModified: video.lastModified,
                    // 注意：IndexedDB 无法直接存储 File 对象，需要重新选择
                    fileData: null // 文件数据需要重新选择
                }));
                
                let completed = 0;
                if (videosToSave.length === 0) {
                    resolve();
                    return;
                }
                
                videosToSave.forEach(video => {
                    const addRequest = store.add(video);
                    addRequest.onsuccess = () => {
                        completed++;
                        if (completed === videosToSave.length) {
                            console.log('✅ 本地视频数据保存到 IndexedDB');
                            resolve();
                        }
                    };
                    addRequest.onerror = () => {
                        console.error('❌ 保存本地视频失败:', video.name);
                        reject(new Error('保存本地视频失败'));
                    };
                });
            };
            
            clearRequest.onerror = () => {
                console.error('❌ 清空本地视频数据失败');
                reject(new Error('清空本地视频数据失败'));
            };
        });
    }

    // 从 IndexedDB 加载本地视频
    async function loadLocalVideosFromDB() {
        if (!db) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([LOCAL_VIDEOS_STORE], 'readonly');
            const store = transaction.objectStore(LOCAL_VIDEOS_STORE);
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                const videos = event.target.result;
                console.log(`✅ 从 IndexedDB 加载 ${videos.length} 个本地视频`);
                resolve(videos);
            };
            
            request.onerror = () => {
                console.error('❌ 从 IndexedDB 加载本地视频失败');
                reject(new Error('从 IndexedDB 加载本地视频失败'));
            };
        });
    }

    // 首先加载CSS
    function loadCSS() {
        if (document.getElementById('media-player-css')) return;
        
        const style = document.createElement('style');
        style.id = 'media-player-css';
        style.textContent = `
            /* 媒体播放器样式 - 保持原有样式不变 */
            #minimal-player {
                transition: all 0.3s ease;
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
            
            #minimal-player.fullscreen {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                border-radius: 0 !important;
                background: #000 !important;
                z-index: 100000 !important;
                transform: none !important;
            }
            
            #minimal-player:hover {
                transform: scale(1.02);
            }
            
            #player-content {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            
            #player-img, #player-video {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: none;
            }
            
            #minimal-player.fullscreen #player-img,
            #minimal-player.fullscreen #player-video {
                max-width: 100vw;
                max-height: 100vh;
                width: auto;
                height: auto;
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
            
            .fullscreen-btn {
                background: none;
                border: none;
                color: rgba(255,255,255,0.9);
                font-size: 16px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.3s ease;
            }
            
            .fullscreen-btn:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }
            
            /* 移动端隐藏全屏按钮 */
            @media (max-width: 768px) {
                .fullscreen-btn {
                    display: none !important;
                }
            }
            
            #media-control-btn {
                position: fixed;
                border-radius: 50%;
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
                font-size: 20px;
            }
            
            #media-control-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            
            #media-control-btn:active {
                transform: scale(0.95);
            }
            
            /* 设置面板样式 */
            .media-player-panel {
                overflow: hidden;
            }
            
            /* 标题栏样式 */
            .media-player-header {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                user-select: none;
                min-height: auto;
                margin: 0;
            }
            
            .media-player-header h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .media-player-header .version {
                font-size: 12px;
                opacity: 0.9;
                margin-left: 8px;
                font-weight: 700;
            }
            
            .media-player-header .toggle-icon {
                transition: transform 0.3s ease;
                font-size: 14px;
            }
            
            .media-player-header .toggle-icon.collapsed {
                transform: rotate(-90deg);
            }
            
            .panel-content {
                padding: 0;
                overflow: hidden;
            }
            
            .panel-content.collapsed {
                display: none;
            }
            
            .panel-content.expanded {
                display: block;
                padding: 20px;
            }
            
            /* 标签页样式 */
            .tab-nav {
                display: flex;
                border-radius: 8px;
                padding: 4px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 4px;
                border: 1px solid; /* 实线边框 */
            }
            
            .tab-nav-item {
                flex: 1;
                padding: 10px 12px;
                text-align: center;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.3s ease;
                font-weight: 500;
                min-width: 0;
                box-sizing: border-box;
                font-size: 13px;
                border: 1px dashed; /* 未选中用虚线 */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .tab-nav-item.active {
                border: 1px solid; /* 选中用实线 */
            }
            
            .tab-nav-item:hover:not(.active) {
                background: rgba(0, 0, 0, 0.05);
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* 设置项样式 */
            .setting-group {
                margin-bottom: 20px;
            }
            
            .setting-group:last-child {
                margin-bottom: 0;
            }
            
            .setting-group-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid;
            }
            
            .setting-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid;
                gap: 15px;
            }
            
            .setting-item:last-child {
                border-bottom: none;
            }
            
            .setting-label {
                flex: 1;
                font-size: 13px;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .setting-control {
                flex-shrink: 0;
                display: flex;
                align-items: center;
            }
            
            /* 播放键颜色设置样式 */
            .button-color-control {
                display: flex;
                gap: 8px;
                align-items: center;
                width: 140px; 
                justify-content: flex-end;
            }
            
            .color-btn {
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
                background: transparent;
                flex: 1;
                text-align: center;
                min-width: 0;
                box-sizing: border-box;
            }
            
            .color-btn.active {
                border: 1px solid; /* 当前使用的按键用实线 */
            }
            
            .color-btn:not(.active) {
                border: 1px dashed; /* 另一个用虚线 */
            }
            
            .color-btn:hover {
                background: rgba(0, 0, 0, 0.05);
            }
            
            /* 表单控件样式 */
            .setting-control select {
                padding: 6px 12px;
                border: 1px solid;
                border-radius: 6px;
                font-size: 13px;
                min-width: 140px;
                padding-right: 25px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M3 4l3 3 3-3z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 8px center;
                background-size: 12px;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
            }
            
            .setting-control input[type="checkbox"] {
                margin: 0;
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            
            .setting-control input[type="range"] {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            
            /* 滑块样式 */
            .setting-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                cursor: pointer;
            }
            
            /* 移动端滑块厚度减半，但滑块按钮保持原大小 */
            @media (max-width: 768px) {
                .setting-control input[type="range"] {
                    height: 3px;
                }
                
                .setting-control input[type="range"]::-webkit-slider-thumb {
                    width: 16px;
                    height: 16px;
                }
                
                /* 修复：手机端滑块和输入框之间增加12px间隙 */
                .slider-container {
                    gap: 12px !important;
                }
            }
            
            .setting-control input[type="number"] {
                padding: 4px 8px;
                border: 1px solid;
                border-radius: 4px;
                font-size: 12px;
                width: 60px;
                text-align: center;
                background: transparent; 
            }
            
            .slider-container {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
            }
            
            .slider-container input[type="range"] {
                min-width: 120px;
            }
            
            .slider-container input[type="number"] {
                width: 80px;
                min-width: 70px;
            }
            
            .slider-value {
                min-width: 50px;
                text-align: right;
                font-size: 12px;
                flex-shrink: 0;
            }
            
            /* 按钮样式 */
            .button-group {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 15px;
            }
            
            .btn {
                padding: 8px 16px;
                border: 1px solid; /* 实线边框 */
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 120px;
                box-sizing: border-box;
                font-weight: 500;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent; 
            }
            
            /* URL管理样式 */
            .url-management {
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
                border: 1px solid; /* 实线边框 */
            }
            
            .url-stats {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
                font-size: 12px;
            }
            
            .url-stat-item {
                padding: 8px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid; /* 实线边框 */
            }
            
            .url-stat-value {
                font-weight: 600;
                font-size: 14px;
            }
            
            /* URL标签页导航 */
            .url-tabs-container {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            
            .url-tabs {
                display: flex;
                border-radius: 6px;
                overflow: hidden;
                flex: 1;
                border: 1px solid; /* 实线边框 */
            }
            
            .url-tab {
                flex: 1;
                padding: 8px 12px;
                text-align: center;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
                min-width: 0;
                border-bottom: 2px solid transparent;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .url-tab.active {
                border-bottom-color: currentColor;
            }
            
            /* 上次预览按键 - 外框高度与标签页一致，基于预览记忆状态改变边框 */
            .last-preview-btn {
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
                background: transparent;
                white-space: nowrap;
                flex-shrink: 0;
                /* 默认虚线边框 */
                border: 1px dashed;
                /* 确保外框高度与标签页一致 */
                height: 100%;
                min-height: 36px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* 修改：当前标签有预览记忆时变实线 */
            .last-preview-btn.has-memory {
                border: 1px solid;
            }
            
            .last-preview-btn:hover {
                background: rgba(0, 0, 0, 0.05);
            }
            
            .url-tab-content {
                display: none;
            }
            
            .url-tab-content.active {
                display: block;
            }
            
            /* URL列表样式 */
            .url-list-container {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid;
                border-radius: 6px;
                margin-bottom: 15px;
                overflow-x: hidden;
            }
            
            .url-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .url-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid;
                gap: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .url-item:last-child {
                border-bottom: none;
            }
            
            .url-item:hover {
                background: rgba(0, 0, 0, 0.05);
            }
            
            .url-item.last-previewed {
                background: rgba(0, 0, 0, 0.1);
                border-left: 3px solid;
            }
            
            .url-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }
            
            .url-text {
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: normal;
                line-height: 1.4;
                word-wrap: break-word;
                font-weight: 500;
                max-height: 2.8em;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .url-type {
                font-size: 11px;
                font-weight: 600;
                flex-shrink: 0;
                margin-right: 8px;
            }
            
            /* 修复：移除URL删除按键 */
            .url-actions {
                display: none; /* 隐藏删除按键 */
            }
            
            .url-remove {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .url-remove:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            /* 文件上传样式 */
            .file-upload-area {
                border: 2px dashed;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin-top: 15px;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .file-upload-area:hover {
                background: rgba(0, 0, 0, 0.05);
            }
            
            .file-upload-area.dragover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .file-input {
                display: none;
            }
            
            .file-upload-label {
                display: block;
                font-weight: 600;
                margin-bottom: 5px;
                cursor: pointer;
            }
            
            .file-types {
                font-size: 11px;
            }
            
            /* 搜索框样式 */
            .search-container {
                margin-bottom: 15px;
            }
            
            .search-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid;
                border-radius: 6px;
                font-size: 13px;
                box-sizing: border-box;
                background: transparent; 
            }
            
            .search-input:focus {
                outline: none;
            }
            
            /* 缓存统计样式 */
            .cache-stats {
                border-radius: 8px;
                padding: 15px;
                margin-top: 20px;
                margin-bottom: 15px;
                border: 1px solid; /* 实线边框 */
            }
            
            .cache-stats-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .cache-stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 8px;
                font-size: 12px;
            }
            
            .cache-stat-item {
                padding: 8px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid; /* 实线边框 */
            }
            
            .cache-stat-label {
                margin-bottom: 4px;
                font-size: 11px;
            }
            
            .cache-stat-value {
                font-weight: 600;
                font-size: 13px;
            }
            
            /* 权重管理样式 */
            .weight-management {
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
                border: 1px solid; /* 实线边框 */
            }
            
            .weight-stats {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
                font-size: 12px;
            }
            
            .weight-stat-item {
                padding: 8px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid; /* 实线边框 */
            }
            
            .weight-stat-value {
                font-weight: 600;
                font-size: 14px;
            }
            
            .weight-list-container {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            
            .weight-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .weight-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid;
                gap: 10px;
            }
            
            .weight-item:last-child {
                border-bottom: none;
            }
            
            .weight-item:hover {
                background: rgba(0, 0, 0, 0.05);
            }
            
            .weight-domain-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }
            
            .weight-domain {
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                cursor: pointer;
                font-weight: 600;
            }
            
            .weight-domain:hover {
                text-decoration: underline;
            }
            
            .weight-url-count {
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .weight-url-count-number {
                font-weight: 600;
            }
            
            .weight-note {
                font-size: 11px;
                font-style: italic;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 200px;
            }
            
            .weight-note.empty {
                font-style: normal;
            }
            
            .weight-control {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            
            .weight-input {
                width: 60px;
                padding: 4px 8px;
                border: 1px solid;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
                background: transparent; 
            }
            
            .weight-input:focus {
                outline: none;
            }
            
            .weight-badge {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                min-width: 30px;
                text-align: center;
            }
            
            .weight-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }
            
            .weight-actions .btn {
                flex: 1;
                min-width: auto;
            }
            
            /* 权重说明列表样式 */
            .weight-explanation-list {
                list-style: none;
                padding: 0;
                margin: 0;
                border-radius: 6px;
                border: 1px solid; /* 实线边框 */
                overflow: hidden;
            }
            
            .weight-explanation-item {
                display: flex;
                align-items: flex-start;
                padding: 8px 12px;
                border-bottom: 1px solid;
                gap: 10px;
                min-height: 32px;
            }
            
            .weight-explanation-item:last-child {
                border-bottom: none;
            }
            
            .weight-explanation-label {
                flex: 0 0 120px;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.4;
                white-space: nowrap;
            }
            
            .weight-explanation-value {
                flex: 1;
                font-size: 11px;
                line-height: 1.4;
                word-wrap: break-word;
            }
            
            /* 本地媒体管理样式 */
            .local-media-management {
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
                border: 1px solid; /* 实线边框 */
            }
            
            .local-media-stats {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
                font-size: 12px;
            }
            
            .local-media-stat-item {
                padding: 8px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid; /* 实线边框 */
            }
            
            .local-media-stat-value {
                font-weight: 600;
                font-size: 14px;
            }
            
            .local-video-list-container {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid;
                border-radius: 6px;
                margin-bottom: 15px;
                overflow-x: hidden;
            }
            
            .local-video-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .local-video-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid;
                gap: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .local-video-item:last-child {
                border-bottom: none;
            }
            
            .local-video-item:hover {
                background: rgba(0, 0, 0, 0.05);
            }
            
            .local-video-item.last-previewed {
                background: rgba(0, 0, 0, 0.1);
                border-left: 3px solid;
            }
            
            .local-video-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }
            
            /* 优化本地视频文件名显示 - 多行显示 */
            .local-video-name {
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: normal;
                line-height: 1.4;
                word-wrap: break-word;
                font-weight: 500;
                max-height: 2.8em;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            /* 移除路径显示 */
            .local-video-path {
                display: none;
            }
            
            .local-video-size {
                font-size: 11px;
                font-weight: 600;
                flex-shrink: 0;
                margin-right: 8px;
            }
            
            /* 修复：移除本地视频删除按键 */
            .local-video-actions {
                display: none; /* 隐藏删除按键 */
            }
            
            .local-video-remove {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .local-video-remove:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            /* URL预览窗口样式 */
            .url-preview-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10002;
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                display: none;
                border: 1px solid; /* 添加边框 */
                background: inherit; 
            }
            
            .url-preview-header {
                padding: 12px 16px;
                border-radius: 8px 8px 0 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid;
            }
            
            .url-preview-title {
                font-size: 14px;
                font-weight: 600;
            }
            
            .url-preview-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            
            .url-preview-close:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .url-preview-content {
                padding: 16px;
                max-height: calc(80vh - 120px);
                overflow-y: auto;
            }
            
            .url-preview-media {
                width: 100%;
                max-height: 400px;
                object-fit: contain;
                border-radius: 6px;
                margin-bottom: 12px;
            }
            
            .url-preview-info {
                margin-bottom: 12px;
            }
            
            .url-preview-url {
                font-size: 12px;
                word-break: break-all;
                line-height: 1.4;
                padding: 8px;
                border-radius: 4px;
                border: 1px solid;
            }
            
            .url-preview-actions {
                display: flex;
                gap: 8px;
                justify-content: space-between;
                margin-top: 15px;
            }
            
            .url-preview-actions .btn {
                min-width: 80px;
                flex: 1;
            }
            
            .url-preview-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: none;
            }
            
            /* 本地视频预览窗口样式 */
            .local-video-preview-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10002;
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                display: none;
                border: 1px solid; /* 添加边框 */
                background: inherit; 
            }
            
            .local-video-preview-header {
                padding: 12px 16px;
                border-radius: 8px 8px 0 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid;
            }
            
            .local-video-preview-title {
                font-size: 14px;
                font-weight: 600;
            }
            
            .local-video-preview-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            
            .local-video-preview-close:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .local-video-preview-content {
                padding: 16px;
                max-height: calc(80vh - 120px);
                overflow-y: auto;
            }
            
            .local-video-preview-media {
                width: 100%;
                max-height: 400px;
                object-fit: contain;
                border-radius: 6px;
                margin-bottom: 12px;
            }
            
            .local-video-preview-info {
                margin-bottom: 12px;
            }
            
            .local-video-preview-name {
                font-size: 12px;
                word-break: break-all;
                line-height: 1.4;
                padding: 8px;
                border-radius: 4px;
                border: 1px solid;
            }
            
            .local-video-preview-actions {
                display: flex;
                gap: 8px;
                justify-content: space-between;
                margin-top: 15px;
            }
            
            .local-video-preview-actions .btn {
                min-width: 80px;
                flex: 1;
            }
            
            .local-video-preview-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: none;
            }
            
            /* 备注编辑样式 */
            .note-edit-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10002;
                width: 400px;
                max-width: 90vw;
                display: none;
                border: 1px solid; /* 添加边框 */
                background: inherit; 
            }
            
            .note-edit-header {
                padding: 12px 16px;
                border-radius: 8px 8px 0 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid;
            }
            
            .note-edit-title {
                font-size: 14px;
                font-weight: 600;
            }
            
            .note-edit-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            
            .note-edit-close:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .note-edit-content {
                padding: 16px;
            }
            
            .note-edit-domain {
                font-size: 13px;
                margin-bottom: 8px;
                padding: 8px;
                border-radius: 4px;
                font-weight: 600;
                border: 1px solid;
            }
            
            .note-edit-textarea {
                width: 100%;
                min-height: 80px;
                border: 1px solid;
                border-radius: 6px;
                padding: 8px;
                font-size: 12px;
                resize: vertical;
                box-sizing: border-box;
                margin-bottom: 12px;
                background: transparent;
            }
            
            .note-edit-textarea:focus {
                outline: none;
            }
            
            .note-edit-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .note-edit-actions .btn {
                min-width: 80px;
            }
            
            .note-edit-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: none;
            }
            
            /* 批量导入输入框样式 */
            .url-textarea {
                width: 100%;
                min-height: 120px;
                border: 1px solid;
                border-radius: 6px;
                padding: 8px;
                font-size: 12px;
                resize: vertical;
                box-sizing: border-box;
                font-family: monospace;
                line-height: 1.4;
                background: transparent;
            }
            
            .url-textarea:focus {
                outline: none;
            }
            
            /* 状态提示 */
            .status-message {
                padding: 8px 12px;
                border-radius: 6px;
                margin-top: 10px;
                font-size: 12px;
                text-align: center;
            }
            
            .status-success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .status-error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .status-info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .status-warning {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            /* 移动端优化 */
            @media (max-width: 768px) {
                .media-player-header {
                    padding: 10px 15px;
                    min-height: auto;
                }
                
                .media-player-header h4 {
                    font-size: 16px;
                }
                
                .panel-content.expanded {
                    padding: 15px;
                }
                
                .tab-nav {
                    flex-direction: row;
                    gap: 4px;
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .tab-nav-item {
                    padding: 8px 12px;
                    min-width: 0;
                    flex: 1;
                    white-space: nowrap;
                    font-size: 12px;
                }
                
                .setting-item {
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }
                
                .setting-label {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .setting-control {
                    margin-left: 0;
                    flex-shrink: 0;
                }
                
                .slider-container {
                    width: 100%;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px; /* 修复：手机端滑块和输入框之间增加12px间隙 */
                }
                
                .slider-container input[type="range"] {
                    width: 100%;
                }
                
                .slider-container input[type="number"] {
                    width: 100%;
                }
                
                .button-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                
                .btn {
                    min-width: auto;
                    width: 100%;
                }
                
                /* URL标签页容器移动端适配 */
                .url-tabs-container {
                    flex-direction: row;
                    gap: 8px;
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .url-tabs {
                    width: auto;
                    flex: 1;
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .url-tab {
                    min-width: 0;
                    flex: 1;
                    white-space: nowrap;
                }
                
                /* 修改：上次预览按键在移动端保持高度一致 */
                .last-preview-btn {
                    width: auto;
                    min-width: 80px;
                    text-align: center;
                    white-space: nowrap;
                    min-height: 36px;
                    height: auto;
                }
                
                .url-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .cache-stats-grid {
                    grid-template-columns: 1fr 1fr;
                }
                
                .weight-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .local-media-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .weight-item {
                    flex-direction: row;
                    align-items: center;
                    gap: 8px;
                }
                
                .weight-domain-info {
                    width: 100%;
                }
                
                .weight-control {
                    justify-content: flex-end;
                    width: auto;
                    flex-shrink: 0;
                }
                
                .weight-note {
                    max-width: none;
                }
                
                .weight-actions {
                    flex-direction: row;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                
                .weight-actions .btn {
                    width: 100%;
                }
                
                .weight-explanation-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                    min-height: auto;
                }
                
                .weight-explanation-label {
                    flex: none;
                    width: 100%;
                }
                
                .weight-explanation-value {
                    flex: none;
                    width: 100%;
                }
                
                .note-edit-container {
                    width: 95vw;
                    max-width: 95vw;
                    top: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    margin: 0;
                }
                
                .url-preview-container {
                    width: 95vw;
                    max-width: 95vw;
                    top: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    margin: 0;
                }
                
                .local-video-preview-container {
                    width: 95vw;
                    max-width: 95vw;
                    top: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    margin: 0;
                }
                
                .note-edit-content {
                    padding: 12px;
                }
                
                .url-preview-content {
                    padding: 12px;
                }
                
                .local-video-preview-content {
                    padding: 12px;
                }
            }
            
            /* 超小屏幕优化 */
            @media (max-width: 480px) {
                .tab-nav-item {
                    min-width: 0;
                    padding: 6px 8px;
                    font-size: 11px;
                }
                
                .setting-item {
                    padding: 8px 0;
                }
                
                .url-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .button-group {
                    grid-template-columns: 1fr 1fr;
                }
                
                .cache-stats-grid {
                    grid-template-columns: 1fr 1fr;
                }
                
                .weight-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .local-media-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .weight-actions {
                    grid-template-columns: 1fr 1fr;
                }
                
                .weight-control {
                    gap: 6px;
                }
                
                .weight-input {
                    width: 50px;
                    font-size: 11px;
                }
                
                .weight-badge {
                    min-width: 25px;
                    font-size: 10px;
                }
                
                .local-video-item {
                    padding: 8px 10px;
                }
                
                .local-video-name {
                    font-size: 11px;
                }
                
                .local-video-size {
                    font-size: 10px;
                }
                
                .url-item {
                    padding: 8px 10px;
                }
                
                .url-text {
                    font-size: 11px;
                }
                
                .url-type {
                    font-size: 10px;
                }
                
                /* 超小屏幕URL标签页优化 */
                .url-tabs-container {
                    gap: 4px;
                }
                
                .url-tab {
                    padding: 6px 8px;
                    font-size: 11px;
                }
                
                .last-preview-btn {
                    padding: 6px 8px;
                    font-size: 11px;
                    min-width: 70px;
                    min-height: 32px;
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
    
    // 视频缓存管理
    function manageVideoCache(url) {
        if (videoBufferCache.has(url)) {
            return videoBufferCache.get(url);
        }
        
        if (videoBufferCache.size >= MAX_CACHE_SIZE) {
            const firstKey = videoBufferCache.keys().next().value;
            videoBufferCache.delete(firstKey);
        }
        
        return null;
    }
    
    // 预加载下一个视频
    function preloadNextVideo() {
        if (config.mediaUrls.length <= 1) return;
        
        const nextIndex = config.playMode === 'random' ? 
            Math.floor(Math.random() * config.mediaUrls.length) : 
            (currentIndex + 1) % config.mediaUrls.length;
        const nextUrl = config.mediaUrls[nextIndex];
        
        if (isVideoUrl(nextUrl) || isOtherUrl(nextUrl)) {
            if (!videoBufferCache.has(nextUrl)) {
                const video = document.createElement('video');
                video.preload = 'auto';
                video.src = nextUrl;
                video.load();
                
                videoBufferCache.set(nextUrl, video);
                console.log('📥 预加载下一个视频:', nextUrl);
            }
        }
    }
    
    // 全屏切换
    function toggleFullscreen() {
        const player = document.getElementById('minimal-player');
        if (!player) return;
        
        if (!isFullscreen) {
            // 保存原始位置和尺寸
            const originalStyle = {
                left: player.style.left,
                top: player.style.top,
                width: player.style.width,
                height: player.style.height,
                borderRadius: player.style.borderRadius,
                background: player.style.background,
                transform: player.style.transform
            };
            player.setAttribute('data-original-style', JSON.stringify(originalStyle));
            
            // 应用全屏样式
            player.classList.add('fullscreen');
            isFullscreen = true;
        } else {
            // 恢复原始样式
            const originalStyle = player.getAttribute('data-original-style');
            if (originalStyle) {
                const style = JSON.parse(originalStyle);
                player.style.left = style.left;
                player.style.top = style.top;
                player.style.width = style.width;
                player.style.height = style.height;
                player.style.borderRadius = style.borderRadius;
                player.style.background = style.background;
                player.style.transform = style.transform;
            }
            
            player.classList.remove('fullscreen');
            isFullscreen = false;
        }
        
        showControls();
    }

    // 调整播放器高度
    function adjustPlayerHeight() {
        const player = document.getElementById('minimal-player');
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        
        if (isFullscreen) {
            player.style.height = '100vh';
            return;
        }
        
        let mediaElement = img.style.display !== 'none' ? img : 
        video.style.display !== 'none' ? video : null;
        
        if (mediaElement && (mediaElement.naturalHeight || video.videoHeight)) {
            const naturalWidth = mediaElement.naturalWidth || video.videoWidth;
            const naturalHeight = mediaElement.naturalHeight || video.videoHeight;
            
            if (naturalWidth && naturalHeight) {
                const aspectRatio = naturalHeight / naturalWidth;
                let calculatedHeight = config.playerWidth * aspectRatio;
                
                if (isMobileDevice()) {
                    calculatedHeight = Math.min(calculatedHeight, window.innerHeight * 0.9);
                } else {
                    calculatedHeight = Math.min(calculatedHeight, window.innerHeight * 0.9);
                }
                
                player.style.height = calculatedHeight + 'px';
                ensurePlayerInViewport();
            }
        } else {
            const defaultHeight = Math.min(config.playerWidth * 0.75, window.innerHeight * 0.6);
            player.style.height = defaultHeight + 'px';
        }
    }

    // 计算缓存大小
    function calculateCacheSizes() {
        const onlineCacheSize = Array.from(urlValidationCache).reduce((total, [url, isValid]) => {
            return total + (url.length * 2);
        }, 0) + (videoBufferCache.size * 1024 * 1024);
        
        const configCacheSize = JSON.stringify(config).length * 2;
        
        // 计算本地视频缓存大小
        const localVideosCacheSize = config.localVideos.reduce((total, video) => {
            return total + (video.path.length * 2) + (video.name.length * 2);
        }, 0);
        
        return {
            online: formatFileSize(onlineCacheSize),
            config: formatFileSize(configCacheSize),
            local: formatFileSize(localVideosCacheSize),
            total: formatFileSize(onlineCacheSize + configCacheSize + localVideosCacheSize)
        };
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 更新缓存统计显示
    function updateCacheStats() {
        const cacheSizes = calculateCacheSizes();
        const cacheStatsElement = document.getElementById('cache-stats');
        
        if (cacheStatsElement) {
            cacheStatsElement.innerHTML = `
                    <div class="cache-stats-title">缓存占用统计</div>
                    <div class="cache-stats-grid">
                        <div class="cache-stat-item">
                            <div class="cache-stat-label">在线媒体</div>
                            <div class="cache-stat-value">${cacheSizes.online}</div>
                        </div>
                        <div class="cache-stat-item">
                            <div class="cache-stat-label">本地媒体</div>
                            <div class="cache-stat-value">${cacheSizes.local}</div>
                        </div>
                        <div class="cache-stat-item">
                            <div class="cache-stat-label">配置数据</div>
                            <div class="cache-stat-value">${cacheSizes.config}</div>
                        </div>
                        <div class="cache-stat-item">
                            <div class="cache-stat-label">总计占用</div>
                            <div class="cache-stat-value">${cacheSizes.total}</div>
                        </div>
                    </div>
                `;
        }
    }

    // 智能URL筛选
    function smartUrlFilter(urls, maxUrls = config.maxOnlineUrls) {
        if (urls.length <= maxUrls) {
            return urls;
        }
        
        console.log(`📊 URL数量 ${urls.length} 超过限制 ${maxUrls}，进行智能筛选`);
        
        const selectedUrls = [...urls]
        .sort(() => Math.random() - 0.5)
        .slice(0, maxUrls);
        
        console.log(`✅ 智能筛选结果: ${selectedUrls.length} 个URL`);
        return selectedUrls;
    }

    // URL排序函数 - 按域名和路径排序
    function sortUrls(urls) {
        return urls.sort((a, b) => {
            try {
                const urlA = new URL(a);
                const urlB = new URL(b);
                
                // 先按域名排序
                const domainCompare = urlA.hostname.localeCompare(urlB.hostname);
                if (domainCompare !== 0) return domainCompare;
                
                // 域名相同按路径排序
                return urlA.pathname.localeCompare(urlB.pathname);
            } catch (e) {
                // 如果URL解析失败，按字符串排序
                return a.localeCompare(b);
            }
        });
    }

    // 获取过滤后的URL列表（用于搜索功能）
    function getFilteredUrls() {
        let filteredUrls = [...config.mediaUrls];
        
        // 应用标签过滤
        if (currentPreviewTab === 'images') {
            filteredUrls = filteredUrls.filter(url => isImageUrl(url));
        } else if (currentPreviewTab === 'videos') {
            filteredUrls = filteredUrls.filter(url => isVideoUrl(url));
        } else if (currentPreviewTab === 'others') {
            filteredUrls = filteredUrls.filter(url => isOtherUrl(url));
        }
        // 'all' 标签不进行过滤
        
        // 应用搜索过滤
        if (urlSearchQuery) {
            const query = urlSearchQuery.toLowerCase();
            filteredUrls = filteredUrls.filter(url => 
                url.toLowerCase().includes(query)
            );
        }
        
        return sortUrls(filteredUrls);
    }

    // 获取过滤后的本地视频列表（新增搜索功能）
    function getFilteredLocalVideos() {
        if (!localVideoSearchQuery) {
            return [...config.localVideos];
        }
        
        const query = localVideoSearchQuery.toLowerCase();
        return config.localVideos.filter(video => 
            video.name.toLowerCase().includes(query) || 
            video.path.toLowerCase().includes(query)
        );
    }

    // 清除当前显示的URL（考虑搜索过滤）
    function clearDisplayedUrls() {
        const filteredUrls = getFilteredUrls();
        if (filteredUrls.length === 0) {
            showStatus('没有URL可清除', 'info');
            return 0;
        }
        
        if (!confirm(`确定要清除当前显示的 ${filteredUrls.length} 个URL吗？此操作不可撤销。`)) {
            return 0;
        }
        
        // 从原始URL列表中移除当前显示的URL
        const originalCount = config.mediaUrls.length;
        config.mediaUrls = config.mediaUrls.filter(url => !filteredUrls.includes(url));
        const removedCount = originalCount - config.mediaUrls.length;
        
        saveConfig();
        updateUrlList();
        updateUrlStats();
        
        // 清空搜索条件
        urlSearchQuery = '';
        $('#url-search-input').val('');
        
        return removedCount;
    }

    // 检测当前显示的URL（新增功能）
    async function validateDisplayedUrls() {
        const displayedUrls = getFilteredUrls();
        
        if (displayedUrls.length === 0) {
            showStatus('当前没有URL需要检测', 'info');
            return null;
        }
        
        let validImages = 0, invalidImages = 0;
        let validVideos = 0, invalidVideos = 0;
        let validOthers = 0, invalidOthers = 0;
        
        const totalUrls = displayedUrls.length;
        let currentIndex = 0;
        
        const statsEl = $('#validation-stats');
        statsEl.html('<div class="validation-progress" id="validation-progress">开始检测当前列表URL...</div>');
        
        for (const url of displayedUrls) {
            const isValid = await validateUrl(url, currentIndex, totalUrls);
            
            // 根据URL类型统计
            if (isImageUrl(url)) {
                if (isValid) validImages++; else invalidImages++;
            } else if (isVideoUrl(url)) {
                if (isValid) validVideos++; else invalidVideos++;
            } else {
                if (isValid) validOthers++; else invalidOthers++;
            }
            
            currentIndex++;
        }
        
        return {
            images: { valid: validImages, invalid: invalidImages, total: validImages + invalidImages },
            videos: { valid: validVideos, invalid: invalidVideos, total: validVideos + invalidVideos },
            others: { valid: validOthers, invalid: invalidOthers, total: validOthers + invalidOthers },
            total: {
                valid: validImages + validVideos + validOthers,
                invalid: invalidImages + invalidVideos + invalidOthers,
                total: displayedUrls.length
            },
            displayedCount: displayedUrls.length
        };
    }

    // 权重管理相关函数
    // 提取顶级域名（修复版）
    function extractTopLevelDomain(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // 处理IP地址
            if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
                return hostname;
            }
            
            // 处理localhost
            if (hostname === 'localhost') {
                return hostname;
            }
            
            // 分割域名部分
            const parts = hostname.split('.');
            
            // 处理特殊情况：只有一级域名
            if (parts.length <= 2) {
                return hostname;
            }
            
            // 处理常见的二级域名情况
            // 如：xxx.com.cn, xxx.co.uk 等
            const secondLevelDomains = ['com', 'org', 'net', 'edu', 'gov', 'mil'];
            const countryDomains = ['cn', 'uk', 'jp', 'de', 'fr', 'it', 'es', 'ru', 'br', 'in', 'au', 'ca', 'mx'];
            
            // 如果倒数第二部分是常见的二级域名，且最后一部分是国家域名，则取最后三级
            if (parts.length >= 3 && 
                secondLevelDomains.includes(parts[parts.length - 2]) && 
                countryDomains.includes(parts[parts.length - 1])) {
                return parts.slice(-3).join('.');
            }
            
            // 默认取最后两级作为顶级域名
            return parts.slice(-2).join('.');
            
        } catch (e) {
            // 如果URL解析失败，返回原始URL
            console.warn('URL解析失败:', url, e);
            return url;
        }
    }

    // 获取域名下的URL数量
    function getDomainUrlCount(domain) {
        return config.mediaUrls.filter(url => extractTopLevelDomain(url) === domain).length;
    }

    // 获取域名备注
    function getDomainNote(domain) {
        return config.domainNotes && config.domainNotes[domain] ? config.domainNotes[domain] : '';
    }

    // 设置域名备注
    function setDomainNote(domain, note) {
        if (!config.domainNotes) {
            config.domainNotes = {};
        }
        
        if (note && note.trim()) {
            config.domainNotes[domain] = note.trim();
        } else {
            delete config.domainNotes[domain];
        }
        
        saveConfig();
        return true;
    }

    // 修复权重0问题
    function getDomainWeight(domain) {
        // 如果明确设置了权重，返回设置的值（包括0）
        if (config.domainWeights.hasOwnProperty(domain)) {
            return config.domainWeights[domain];
        }
        // 否则返回默认权重50
        return 50;
    }

    function setDomainWeight(domain, weight) {
        // 检查权重100是否已经存在
        if (weight === 100) {
            const existing100Domain = Object.keys(config.domainWeights).find(d => config.domainWeights[d] === 100);
            if (existing100Domain && existing100Domain !== domain) {
                showStatus('权重100只能设置一个域名', 'error');
                return false;
            }
        }
        
        // 如果权重是50，从配置中移除（使用默认值）
        if (weight === 50) {
            delete config.domainWeights[domain];
        } else {
            // 否则设置权重值（包括0）
            config.domainWeights[domain] = Math.max(0, Math.min(100, weight));
        }
        
        saveConfig();
        
        // 实时更新播放列表
        updatePlayableUrls();
        
        // 更新权重统计
        updateWeightStats();
        
        return true;
    }

    function removeDomainWeight(domain) {
        delete config.domainWeights[domain];
        saveConfig();
        updatePlayableUrls();
        updateWeightStats();
    }

    // 获取所有唯一的顶级域名
    function getAllDomains() {
        const domains = new Set();
        config.mediaUrls.forEach(url => {
            domains.add(extractTopLevelDomain(url));
        });
        return Array.from(domains).sort();
    }

    function getFilteredDomains() {
        const allDomains = getAllDomains();
        if (!weightSearchQuery) {
            return allDomains;
        }
        
        const query = weightSearchQuery.toLowerCase();
        return allDomains.filter(domain => 
            domain.toLowerCase().includes(query) || 
            (getDomainNote(domain) && getDomainNote(domain).toLowerCase().includes(query))
        );
    }

    function updateWeightList() {
        const weightListContainer = document.getElementById('weight-list');
        if (!weightListContainer) return;
        
        const filteredDomains = getFilteredDomains();
        
        if (filteredDomains.length === 0) {
            weightListContainer.innerHTML = '<div style="padding: 20px; text-align: center;">没有域名可显示</div>';
            return;
        }
        
        let html = '';
        filteredDomains.forEach(domain => {
            const weight = getDomainWeight(domain);
            const urlCount = getDomainUrlCount(domain);
            const note = getDomainNote(domain);
            
            html += `
                <li class="weight-item">
                    <div class="weight-domain-info">
                        <div class="weight-domain" title="${domain}" data-domain="${domain}">
                            ${domain} <span class="weight-url-count-number">(${urlCount}url)</span>
                        </div>
                        <div class="weight-note ${note ? '' : 'empty'}" title="${note || '点击添加备注'}">
                            ${note || '无备注'}
                        </div>
                    </div>
                    <div class="weight-control">
                        <input type="number" class="weight-input" value="${weight}" min="0" max="100" data-domain="${domain}">
                        <span class="weight-badge">${weight}</span>
                    </div>
                </li>
            `;
        });
        
        weightListContainer.innerHTML = html;
        
        // 绑定权重输入事件
        $('.weight-input').on('input', function() {
            const domain = $(this).data('domain');
            const weight = parseInt($(this).val()) || 0; // 修复：允许0值
            
            if (setDomainWeight(domain, weight)) {
                // 更新徽章显示
                const badge = $(this).siblings('.weight-badge');
                badge.text(weight);
                
                showStatus(`已设置 ${domain} 的权重为 ${weight}`, 'success');
            } else {
                // 恢复原值
                $(this).val(getDomainWeight(domain));
            }
        });
        
        // 绑定域名点击事件（编辑备注）
        $('.weight-domain').on('click', function() {
            const domain = $(this).data('domain');
            openNoteEditor(domain);
        });
        
        // 绑定备注点击事件（编辑备注）
        $('.weight-note').on('click', function() {
            const domain = $(this).closest('.weight-item').find('.weight-domain').data('domain');
            openNoteEditor(domain);
        });
    }

    // 打开备注编辑器
    function openNoteEditor(domain) {
        // 创建编辑器HTML（如果不存在）
        if (!document.getElementById('note-edit-overlay')) {
            const editorHTML = `
                <div class="note-edit-overlay" id="note-edit-overlay"></div>
                <div class="note-edit-container" id="note-edit-container">
                    <div class="note-edit-header">
                        <div class="note-edit-title">编辑域名备注</div>
                        <button class="note-edit-close" id="note-edit-close">×</button>
                    </div>
                    <div class="note-edit-content">
                        <div class="note-edit-domain" id="note-edit-domain"></div>
                        <textarea class="note-edit-textarea" id="note-edit-textarea" placeholder="输入域名备注信息..."></textarea>
                        <div class="note-edit-actions">
                            <button class="btn btn-secondary" id="note-edit-cancel">取消</button>
                            <button class="btn btn-primary" id="note-edit-save">保存</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', editorHTML);
            
            // 绑定编辑器事件
            $('#note-edit-close, #note-edit-cancel').on('click', closeNoteEditor);
            $('#note-edit-overlay').on('click', closeNoteEditor);
            $('#note-edit-save').on('click', saveNote);
            
            // ESC键关闭
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape' && $('#note-edit-overlay').is(':visible')) {
                    closeNoteEditor();
                }
            });
        }
        
        // 填充数据
        $('#note-edit-domain').text(domain);
        $('#note-edit-textarea').val(getDomainNote(domain));
        
        // 显示编辑器
        $('#note-edit-overlay').show();
        $('#note-edit-container').show();
        
        // 移动端特殊定位
        if (isMobileDevice()) {
            const container = document.getElementById('note-edit-container');
            if (container) {
                container.style.top = '50px';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
            }
        }
        
        // 聚焦到文本框
        setTimeout(() => {
            $('#note-edit-textarea').focus();
        }, 100);
    }

    // 关闭备注编辑器
    function closeNoteEditor() {
        $('#note-edit-overlay').hide();
        $('#note-edit-container').hide();
        
        // 恢复PC端定位
        if (!isMobileDevice()) {
            const container = document.getElementById('note-edit-container');
            if (container) {
                container.style.top = '50%';
                container.style.left = '50%';
                container.style.transform = 'translate(-50%, -50%)';
            }
        }
    }

    // 保存备注
    function saveNote() {
        const domain = $('#note-edit-domain').text();
        const note = $('#note-edit-textarea').val().trim();
        
        if (setDomainNote(domain, note)) {
            closeNoteEditor();
            updateWeightList();
            showStatus(`✅ ${domain} 的备注已${note ? '保存' : '清除'}`, 'success');
        }
    }

    function resetAllWeights() {
        if (!confirm('确定要重置所有域名的权重为默认值50吗？')) {
            return;
        }
        
        config.domainWeights = {};
        saveConfig();
        updateWeightList();
        updateWeightStats();
        updatePlayableUrls();
        showStatus('所有域名权重已重置为50', 'success');
    }

    function updateWeightStats() {
        const totalDomains = getAllDomains().length;
        // 已设置权重：只统计明确设置了权重的域名（不包括默认值50）
        const weightedDomains = Object.keys(config.domainWeights).length;
        const highWeightDomains = Object.values(config.domainWeights).filter(weight => weight === 100).length;
        const notedDomains = config.domainNotes ? Object.keys(config.domainNotes).length : 0;
        
        $('.weight-stat-value').eq(0).text(totalDomains);
        $('.weight-stat-value').eq(1).text(weightedDomains);
        $('.weight-stat-value').eq(2).text(highWeightDomains);
        $('.weight-stat-value').eq(3).text(notedDomains);
    }

    // 根据权重过滤可播放的URL
    function getPlayableUrls() {
        const allUrls = config.mediaUrls;
        
        // 检查是否有权重为100的域名
        const domainWith100Weight = Object.keys(config.domainWeights).find(domain => config.domainWeights[domain] === 100);
        
        if (domainWith100Weight) {
            // 如果有权重100的域名，只播放该域名下的URL
            const filteredUrls = allUrls.filter(url => {
                const domain = extractTopLevelDomain(url);
                return domain === domainWith100Weight;
            });
            console.log(`🎯 权重100生效，只播放 ${domainWith100Weight} 域名下的 ${filteredUrls.length} 个URL`);
            return filteredUrls;
        }
        
        // 过滤掉权重为0的域名下的URL
        const urlsAfterZeroFilter = allUrls.filter(url => {
            const domain = extractTopLevelDomain(url);
            const weight = getDomainWeight(domain);
            const shouldPlay = weight > 0;
            
            if (!shouldPlay) {
                console.log(`⏭️ 跳过权重为0的域名: ${domain}`);
            }
            return shouldPlay;
        });
        
        console.log(`📊 权重过滤后剩余 ${urlsAfterZeroFilter.length} 个可播放URL`);
        return urlsAfterZeroFilter;
    }

    // 更新可播放URL列表
    function updatePlayableUrls() {
        // 这个函数会在权重改变时被调用，确保播放逻辑实时生效
        console.log('🔄 更新可播放URL列表');
        
        // 如果当前播放器正在播放，重新加载当前媒体
        if (isPlayerVisible) {
            const currentUrl = config.mediaUrls[currentIndex];
            const playableUrls = getPlayableUrls();
            
            // 如果当前URL不在可播放列表中，切换到下一个
            if (!playableUrls.includes(currentUrl)) {
                console.log('⏭️ 当前URL不可播放，切换到下一个');
                nextMedia();
            }
        }
    }

    // 优化后的随机播放算法 - 按顶级域名权重抽取
    function getNextRandomUrl() {
        const playableUrls = getPlayableUrls();
        if (playableUrls.length === 0) return null;
        
        // 按顶级域名分组
        const domainGroups = {};
        playableUrls.forEach(url => {
            const domain = extractTopLevelDomain(url);
            if (!domainGroups[domain]) {
                domainGroups[domain] = [];
            }
            domainGroups[domain].push(url);
        });
        
        // 创建域名权重数组
        const weightedDomains = [];
        Object.keys(domainGroups).forEach(domain => {
            const weight = getDomainWeight(domain);
            // 根据权重重复域名在数组中的次数
            const repetitions = Math.max(1, Math.floor(weight / 10));
            for (let i = 0; i < repetitions; i++) {
                weightedDomains.push(domain);
            }
        });
        
        if (weightedDomains.length === 0) return null;
        
        // 从加权域名数组中随机选择一个域名
        const randomDomainIndex = Math.floor(Math.random() * weightedDomains.length);
        const selectedDomain = weightedDomains[randomDomainIndex];
        
        // 从该域名下的URL中随机选择一个
        const domainUrls = domainGroups[selectedDomain];
        const randomUrlIndex = Math.floor(Math.random() * domainUrls.length);
        const selectedUrl = domainUrls[randomUrlIndex];
        
        console.log(`🎲 随机播放: 权重抽取域名 ${selectedDomain} (权重: ${getDomainWeight(selectedDomain)})，随机选择URL: ${selectedUrl}`);
        
        return selectedUrl;
    }

    // 根据权重获取下一个URL（顺序播放模式）
    function getNextSequentialUrl() {
        const playableUrls = getPlayableUrls();
        if (playableUrls.length === 0) return null;
        
        // 简单的顺序播放
        const nextIndex = (currentIndex + 1) % playableUrls.length;
        return playableUrls[nextIndex];
    }

    // 本地媒体相关函数
    // 递归扫描文件夹中的视频文件
    async function scanFolderForVideos(entry) {
        const videoFiles = [];
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.wmv', '.mpg', '.mpeg', '.3gp'];
        
        async function scanDirectory(directoryEntry) {
            const reader = directoryEntry.createReader();
            
            return new Promise((resolve) => {
                reader.readEntries(async (entries) => {
                    for (const entry of entries) {
                        if (entry.isDirectory) {
                            // 递归扫描子文件夹
                            await scanDirectory(entry);
                        } else if (entry.isFile) {
                            const name = entry.name.toLowerCase();
                            // 检查是否是视频文件
                            if (videoExtensions.some(ext => name.endsWith(ext))) {
                                try {
                                    const file = await new Promise((resolve, reject) => {
                                        entry.file(resolve, reject);
                                    });
                                    
                                    videoFiles.push({
                                        file: file,
                                        path: entry.fullPath || entry.name,
                                        name: entry.name,
                                        size: file.size,
                                        lastModified: file.lastModified
                                    });
                                } catch (error) {
                                    console.warn('无法读取文件:', entry.name, error);
                                }
                            }
                        }
                    }
                    resolve();
                });
            });
        }
        
        await scanDirectory(entry);
        return videoFiles;
    }

    // 随机抽取文件夹中的视频
    async function randomSelectVideosFromFolder() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;
            input.multiple = true;
            
            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.wmv', '.mpg', '.mpeg', '.3gp'];
                
                // 过滤视频文件
                const videoFiles = files.filter(file => {
                    const name = file.name.toLowerCase();
                    return videoExtensions.some(ext => name.endsWith(ext));
                });
                
                if (videoFiles.length === 0) {
                    showStatus('所选文件夹中没有找到视频文件', 'error');
                    resolve([]);
                    return;
                }
                
                // 智能筛选：如果超过限制，随机抽取
                let selectedVideos = videoFiles;
                if (videoFiles.length > config.maxLocalVideos) {
                    selectedVideos = [...videoFiles]
                        .sort(() => Math.random() - 0.5)
                        .slice(0, config.maxLocalVideos);
                    showStatus(`视频数量超过限制，已随机抽取 ${config.maxLocalVideos} 个视频`, 'warning');
                }
                
                // 转换为本地视频格式
                const localVideos = selectedVideos.map(file => ({
                    path: file.webkitRelativePath || file.name,
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified,
                    file: file // 保留文件对象用于播放
                }));
                
                resolve(localVideos);
            };
            
            input.click();
        });
    }

    // 添加单个视频文件
    function addSingleVideo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.multiple = false;
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.wmv', '.mpg', '.mpeg', '.3gp'];
            const name = file.name.toLowerCase();
            
            if (!videoExtensions.some(ext => name.endsWith(ext))) {
                showStatus('请选择视频文件', 'error');
                return;
            }
            
            // 检查是否已达到最大数量
            if (config.localVideos.length >= config.maxLocalVideos) {
                showStatus(`本地视频数量已达上限 (${config.maxLocalVideos}个)`, 'error');
                return;
            }
            
            // 检查是否已存在相同文件
            const existingVideo = config.localVideos.find(video => 
                video.name === file.name && video.size === file.size
            );
            
            if (existingVideo) {
                showStatus('该视频已存在', 'warning');
                return;
            }
            
            // 添加视频
            const localVideo = {
                path: file.name,
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                file: file
            };
            
            config.localVideos.push(localVideo);
            saveConfig();
            saveLocalVideosToDB();
            updateLocalVideoList();
            updateLocalMediaStats();
            updateCacheStats();
            
            showStatus(`✅ 已添加视频: ${file.name}`, 'success');
        };
        
        input.click();
    }

    // 更新本地视频列表显示 支持预览记忆
    function updateLocalVideoList() {
        const localVideoListContainer = document.getElementById('local-video-list');
        if (!localVideoListContainer) return;
        
        const filteredVideos = getFilteredLocalVideos();
        
        if (filteredVideos.length === 0) {
            localVideoListContainer.innerHTML = '<div style="padding: 20px; text-align: center;">暂无本地视频</div>';
            return;
        }
        
        let html = '';
        filteredVideos.forEach((video, index) => {
            const sizeText = formatFileSize(video.size);
            const isLastPreviewed = video.path === lastPreviewedLocalVideo; // 标记最后一次预览的视频
            
            html += `
                <li class="local-video-item ${isLastPreviewed ? 'last-previewed' : ''}" data-index="${config.localVideos.indexOf(video)}">
                    <div class="local-video-info">
                        <div class="local-video-name" title="${video.name}">${video.name}</div>
                    </div>
                    <div class="local-video-size">${sizeText}</div>
                    <!-- 修复：移除删除按键 -->
                </li>
            `;
        });
        
        localVideoListContainer.innerHTML = html;
        
        // 绑定点击事件 - 打开预览窗口
        $('.local-video-item').on('click', function(e) {
            const index = parseInt($(this).data('index'));
            openLocalVideoPreview(index);
        });
    }

    // 打开本地视频预览窗口 
    function openLocalVideoPreview(index) {
        if (index < 0 || index >= config.localVideos.length) {
            showStatus('视频索引无效', 'error');
            return;
        }
        
        const video = config.localVideos[index];
        
        // 创建预览窗口HTML（如果不存在）
        if (!document.getElementById('local-video-preview-overlay')) {
            const previewHTML = `
                <div class="local-video-preview-overlay" id="local-video-preview-overlay"></div>
                <div class="local-video-preview-container" id="local-video-preview-container">
                    <div class="local-video-preview-header">
                        <div class="local-video-preview-title">本地视频预览</div>
                        <button class="local-video-preview-close" id="local-video-preview-close">×</button>
                    </div>
                    <div class="local-video-preview-content">
                        <div class="local-video-preview-media-container">
                            <video class="local-video-preview-media" id="local-video-preview-video" controls></video>
                        </div>
                        <div class="local-video-preview-info">
                            <div class="local-video-preview-name" id="local-video-preview-name"></div>
                        </div>
                        <div class="local-video-preview-actions">
                            <button class="btn btn-secondary" id="local-video-preview-prev">上一个</button>
                            <button class="btn btn-secondary" id="local-video-preview-next">下一个</button>
                            <button class="btn btn-danger" id="local-video-preview-delete">删除</button>
                            <button class="btn btn-primary" id="local-video-preview-close-btn">关闭</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', previewHTML);
            
            // 绑定预览窗口事件
            $('#local-video-preview-close, #local-video-preview-close-btn').on('click', closeLocalVideoPreview);
            $('#local-video-preview-overlay').on('click', closeLocalVideoPreview);
            $('#local-video-preview-prev').on('click', prevPreviewLocalVideo);
            $('#local-video-preview-next').on('click', nextPreviewLocalVideo);
            $('#local-video-preview-delete').on('click', deletePreviewLocalVideo);
            
            // ESC键关闭
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape' && $('#local-video-preview-overlay').is(':visible')) {
                    closeLocalVideoPreview();
                }
            });
        }
        
        // 设置当前预览的视频列表和索引
        currentPreviewIndex = index;
        
        // 加载预览内容
        loadLocalVideoPreviewContent(video);
        
        // 显示预览窗口
        $('#local-video-preview-overlay').show();
        $('#local-video-preview-container').show();
        
        // 移动端特殊定位
        if (isMobileDevice()) {
            const container = document.getElementById('local-video-preview-container');
            if (container) {
                container.style.top = '50px';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
            }
        }
        
        // 标记为最后一次预览的视频
        lastPreviewedLocalVideo = video.path;
        updateLocalVideoList();
    }

    // 加载本地视频预览内容 - 关联主设置静音开关，新增自动播放和自动换下一个，修复手机端自动全屏
    function loadLocalVideoPreviewContent(video) {
        const videoElement = document.getElementById('local-video-preview-video');
        const nameElement = document.getElementById('local-video-preview-name');
        
        if (!videoElement || !nameElement) return;
        
        // 设置视频名称
        nameElement.textContent = video.name;
        
        // 创建对象URL
        const objectUrl = URL.createObjectURL(video.file);
        videoElement.src = objectUrl;
        
        // 关联主设置静音开关
        videoElement.muted = config.videoMuted;
        
        // 修复：应用智能拖动优化
        setupSmartSeek(videoElement);
        
        // 修复：手机端防止自动全屏
        if (isMobileDevice()) {
            // iOS特定设置
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('webkit-playsinline', 'true');
            videoElement.setAttribute('x-webkit-airplay', 'allow');
            
            // 防止自动全屏
            videoElement.addEventListener('webkitbeginfullscreen', () => {
                console.log('📱 iOS全屏开始');
            });
            videoElement.addEventListener('webkitendfullscreen', () => {
                console.log('📱 iOS全屏结束');
            });
            
            // 检测Android WebView环境
            const isAndroidWebView = /; wv/.test(navigator.userAgent);
            if (isAndroidWebView) {
                // WebView中可能需要特殊处理
                videoElement.setAttribute('playsinline', 'true');
            }
        }
        
        // 新增：自动播放
        videoElement.play().then(() => {
            console.log('✅ 本地预览视频自动播放成功');
        }).catch(e => {
            console.log('❌ 本地预览视频自动播放失败:', e);
        });
        
        // 新增：视频结束后自动换下一个
        videoElement.onended = function() {
            console.log('🎬 本地预览视频播放结束，自动切换到下一个');
            nextPreviewLocalVideo();
            // 清理对象URL
            URL.revokeObjectURL(objectUrl);
        };
        
        videoElement.onerror = function() {
            showStatus('视频加载失败', 'error');
            // 清理对象URL
            URL.revokeObjectURL(objectUrl);
        };
        
        videoElement.oncanplay = function() {
            console.log('✅ 本地预览视频可以播放');
        };
        
        // 更新按钮状态 - 优化：当没有上一个/下一个时隐藏按键
        updateLocalVideoPreviewButtons();
    }

    // 修复：智能拖动优化 - 解决视频拖动卡顿问题
    function setupSmartSeek(videoElement) {
        let isSeeking = false;
        let lastSeekTime = 0;
        
        // 监听拖动开始
        videoElement.addEventListener('seeking', () => {
            isSeeking = true;
            lastSeekTime = videoElement.currentTime;
            console.log('🔍 开始拖动，目标时间:', lastSeekTime);
        });
        
        // 监听拖动结束
        videoElement.addEventListener('seeked', () => {
            isSeeking = false;
            console.log('✅ 拖动完成');
        });
        
        // 监听时间更新，检测是否卡住
        videoElement.addEventListener('timeupdate', () => {
            if (!isSeeking) return;
            
            const currentTime = videoElement.currentTime;
            const targetTime = lastSeekTime;
            
            // 如果时间在走但画面卡住，尝试重新加载
            if (Math.abs(currentTime - targetTime) > 2) {
                console.log('⚠️ 检测到拖动卡顿，尝试恢复播放');
                forceResumePlayback(videoElement);
            }
        });
        
        // 覆盖默认的进度条拖动行为
        const progressInput = document.getElementById('video-progress');
        if (progressInput) {
            progressInput.addEventListener('input', function() {
                if (videoElement.duration) {
                    const targetTime = (this.value / 100) * videoElement.duration;
                    smartSeek(videoElement, targetTime);
                }
            });
        }
    }

    // 智能拖动方法 - 解决关键帧定位问题
    function smartSeek(videoElement, targetTime) {
        console.log('🎯 智能拖动到:', targetTime);
        
        // 先暂停，设置时间，然后播放
        videoElement.pause();
        videoElement.currentTime = targetTime;
        
        // 给解码器一点时间准备
        setTimeout(() => {
            videoElement.play().catch(e => {
                console.warn('智能拖动播放失败:', e);
                // 如果播放失败，尝试轻微调整时间点
                videoElement.currentTime = targetTime + 0.001;
                videoElement.play().catch(e => {
                    console.error('二次播放尝试失败:', e);
                });
            });
        }, 50);
    }

    // 强制恢复播放 - 解决卡顿问题
    function forceResumePlayback(videoElement) {
        // 暂停再播放（重置解码器）
        videoElement.pause();
        setTimeout(() => {
            videoElement.play().catch(e => {
                console.log('播放恢复失败:', e);
            });
        }, 100);
        
        // 轻微调整当前时间点
        const currentTime = videoElement.currentTime;
        videoElement.currentTime = currentTime + 0.001;
    }

    // 更新本地视频预览按钮状态 - 优化：当没有上一个/下一个时隐藏按键
    function updateLocalVideoPreviewButtons() {
        const hasPrev = currentPreviewIndex > 0;
        const hasNext = currentPreviewIndex < config.localVideos.length - 1;
        
        // 优化：当没有上一个/下一个时隐藏按键
        $('#local-video-preview-prev').toggle(hasPrev).prop('disabled', !hasPrev);
        $('#local-video-preview-next').toggle(hasNext).prop('disabled', !hasNext);
    }

    // 上一个预览本地视频
    function prevPreviewLocalVideo() {
        if (currentPreviewIndex > 0) {
            currentPreviewIndex--;
            const prevVideo = config.localVideos[currentPreviewIndex];
            loadLocalVideoPreviewContent(prevVideo);
            // 标记为最后一次预览的视频
            lastPreviewedLocalVideo = prevVideo.path;
            updateLocalVideoList();
        }
    }

    // 下一个预览本地视频
    function nextPreviewLocalVideo() {
        if (currentPreviewIndex < config.localVideos.length - 1) {
            currentPreviewIndex++;
            const nextVideo = config.localVideos[currentPreviewIndex];
            loadLocalVideoPreviewContent(nextVideo);
            // 标记为最后一次预览的视频
            lastPreviewedLocalVideo = nextVideo.path;
            updateLocalVideoList();
        }
    }

    // 删除预览的本地视频
    function deletePreviewLocalVideo() {
        const currentVideo = config.localVideos[currentPreviewIndex];
        if (!currentVideo) return;
        
        if (!confirm('确定要删除这个视频吗？')) {
            return;
        }
        
        // 从配置中移除视频
        const videoIndex = config.localVideos.indexOf(currentVideo);
        if (videoIndex !== -1) {
            config.localVideos.splice(videoIndex, 1);
            saveConfig();
            saveLocalVideosToDB();
            
            // 如果删除的是最后一次预览的视频，清除标记
            if (lastPreviewedLocalVideo === currentVideo.path) {
                lastPreviewedLocalVideo = '';
            }
            
            // 更新视频列表
            updateLocalVideoList();
            updateLocalMediaStats();
            updateCacheStats();
            
            showStatus('✅ 视频已删除', 'success');
            
            // 如果还有视频，显示下一个，否则关闭预览
            if (config.localVideos.length > 0) {
                if (currentPreviewIndex >= config.localVideos.length) {
                    currentPreviewIndex = config.localVideos.length - 1;
                }
                const nextVideo = config.localVideos[currentPreviewIndex];
                loadLocalVideoPreviewContent(nextVideo);
                // 标记为最后一次预览的视频
                lastPreviewedLocalVideo = nextVideo.path;
            } else {
                closeLocalVideoPreview();
            }
        }
    }

    // 关闭本地视频预览
    function closeLocalVideoPreview() {
        $('#local-video-preview-overlay').hide();
        $('#local-video-preview-container').hide();
        
        // 恢复PC端定位
        if (!isMobileDevice()) {
            const container = document.getElementById('local-video-preview-container');
            if (container) {
                container.style.top = '50%';
                container.style.left = '50%';
                container.style.transform = 'translate(-50%, -50%)';
            }
        }
        
        // 更新视频列表以显示预览状态
        updateLocalVideoList();
    }

    // 播放本地视频（修复版）- 自动切换媒体类型，修复播放失败提示问题，修复手机端自动全屏
    function playLocalVideo(index) {
        if (index < 0 || index >= config.localVideos.length) {
            showStatus('视频索引无效', 'error');
            return;
        }
        
        const video = config.localVideos[index];
        
        // 检查文件对象是否存在，如果不存在需要重新选择
        if (!video.file) {
            showStatus('视频文件已丢失，请重新添加', 'error');
            return;
        }
        
        // 自动切换到本地视频播放模式
        if (config.mediaType !== 'local-video') {
            config.mediaType = 'local-video';
            // 更新设置面板中的媒体类型选择器
            const mediaTypeSelect = document.getElementById('mp-media-type');
            if (mediaTypeSelect) {
                mediaTypeSelect.value = 'local-video';
            }
            saveConfig();
            console.log('🔄 自动切换到本地视频播放模式');
        }
        
        // 确保播放器可见
        if (!isPlayerVisible) {
            togglePlayer();
        }
        
        // 切换到本地视频播放模式
        currentIndex = index;
        playbackMemory.type = 'local';
        
        console.log('🎬 播放本地视频:', video.name);
        
        // 加载本地视频
        loadLocalVideo(video);
        
        // 更新列表高亮
        updateLocalVideoList();
    }

    // 加载本地视频到播放器（修复版）- 修复播放失败提示问题，修复手机端自动全屏
    function loadLocalVideo(video) {
        const videoElement = document.getElementById('player-video');
        const imgElement = document.getElementById('player-img');
        const videoControls = document.getElementById('video-controls');
        
        if (!videoElement) return;
        
        // 隐藏图片，显示视频
        if (imgElement) imgElement.style.display = 'none';
        videoElement.style.display = 'block';
        if (videoControls) videoControls.style.display = 'flex';
        
        // 创建对象URL
        const objectUrl = URL.createObjectURL(video.file);
        videoElement.src = objectUrl;
        
        // 设置静音
        if (config.videoMuted) videoElement.muted = true;
        
        // 修复：手机端防止自动全屏
        if (isMobileDevice()) {
            // iOS特定设置
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('webkit-playsinline', 'true');
            videoElement.setAttribute('x-webkit-airplay', 'allow');
            
            // 防止自动全屏
            videoElement.addEventListener('webkitbeginfullscreen', () => {
                console.log('📱 iOS全屏开始');
            });
            videoElement.addEventListener('webkitendfullscreen', () => {
                console.log('📱 iOS全屏结束');
            });
            
            // 检测Android WebView环境
            const isAndroidWebView = /; wv/.test(navigator.userAgent);
            if (isAndroidWebView) {
                // WebView中可能需要特殊处理
                videoElement.setAttribute('playsinline', 'true');
            }
        }
        
        // 修复：应用智能拖动优化
        setupSmartSeek(videoElement);
        
        // 播放视频 - 修复：移除错误的错误处理，使用更精确的播放状态检测
        videoElement.play().then(() => {
            console.log('✅ 本地视频播放成功');
            isVideoPlaying = true;
            showControls();
            
            // 保存播放记忆
            if (config.playbackMemory) {
                playbackMemory.url = video.path;
                playbackMemory.time = 0;
                playbackMemory.type = 'local';
            }
            
            // 修复：播放成功时不显示失败提示
            showStatus(`✅ 正在播放: ${video.name}`, 'success');
        }).catch(e => {
            console.log('❌ 本地视频播放失败:', e);
            // 修复：只在真正播放失败时显示错误提示
            if (e.name !== 'AbortError') {
                showStatus('视频播放失败: ' + e.message, 'error');
            }
        });
        
        // 清理对象URL
        videoElement.onended = function() {
            URL.revokeObjectURL(objectUrl);
        };
        
        // 修复：添加更精确的播放状态检测
        videoElement.oncanplay = function() {
            console.log('✅ 本地视频可以播放');
        };
        
        videoElement.onerror = function() {
            console.log('❌ 本地视频加载错误');
            showStatus('视频加载失败', 'error');
        };
        
        updateMediaOpacity();
        setTimeout(adjustPlayerHeight, 100);
    }

    // 移除本地视频
    function removeLocalVideo(index) {
        if (index < 0 || index >= config.localVideos.length) return;
        
        const video = config.localVideos[index];
        
        if (!confirm(`确定要删除视频 "${video.name}" 吗？`)) {
            return;
        }
        
        // 如果正在播放这个视频，停止播放
        if (isPlayerVisible && playbackMemory.type === 'local' && playbackMemory.url === video.path) {
            stopPlayback();
        }
        
        // 从列表中移除
        config.localVideos.splice(index, 1);
        saveConfig();
        saveLocalVideosToDB();
        updateLocalVideoList();
        updateLocalMediaStats();
        updateCacheStats();
        
        showStatus(`✅ 已删除视频: ${video.name}`, 'success');
    }

    // 清除所有本地视频
    function clearAllLocalVideos() {
        if (config.localVideos.length === 0) {
            showStatus('没有本地视频可清除', 'info');
            return;
        }
        
        if (!confirm(`确定要清除所有 ${config.localVideos.length} 个本地视频吗？此操作不可撤销。`)) {
            return;
        }
        
        // 如果正在播放本地视频，停止播放
        if (isPlayerVisible && playbackMemory.type === 'local') {
            stopPlayback();
        }
        
        config.localVideos = [];
        saveConfig();
        saveLocalVideosToDB();
        updateLocalVideoList();
        updateLocalMediaStats();
        updateCacheStats();
        
        showStatus('✅ 已清除所有本地视频', 'success');
    }

    // 更新本地媒体统计
    function updateLocalMediaStats() {
        const totalSize = config.localVideos.reduce((total, video) => total + video.size, 0);
        const sizeText = formatFileSize(totalSize);
        
        $('.local-media-stat-value').eq(0).text(config.localVideos.length);
        $('.local-media-stat-value').eq(1).text(config.maxLocalVideos);
        $('.local-media-stat-value').eq(2).text(sizeText);
    }

    // 更新URL列表显示 
    function updateUrlList() {
        const urlListContainer = document.getElementById('url-list');
        if (!urlListContainer) return;
        
        const filteredUrls = getFilteredUrls();
        
        if (filteredUrls.length === 0) {
            urlListContainer.innerHTML = '<div style="padding: 20px; text-align: center;">暂无URL</div>';
            return;
        }
        
        let html = '';
        filteredUrls.forEach((url, index) => {
            const isImage = isImageUrl(url);
            const isVideo = isVideoUrl(url);
            const isOther = isOtherUrl(url);
            
            // 新增：根据当前标签页获取对应的预览记忆
            const lastPreviewedUrl = previewMemory[currentPreviewTab];
            const isLastPreviewed = url === lastPreviewedUrl; // 标记最后一次预览的URL
            
            let typeText = '';
            if (isImage) typeText = '图片';
            else if (isVideo) typeText = '视频';
            else typeText = '其它';
            
            html += `
                <li class="url-item ${isLastPreviewed ? 'last-previewed' : ''}" data-url="${url}">
                    <div class="url-info">
                        <div class="url-text" title="${url}">${url}</div>
                    </div>
                    <div class="url-type">${typeText}</div>
                    <!-- 修复：移除删除按键 -->
                </li>
            `;
        });
        
        urlListContainer.innerHTML = html;
        
        // 绑定点击事件 - 预览URL
        $('.url-item').on('click', function(e) {
            const url = $(this).data('url');
            openUrlPreview(url);
        });
    }

    // 打开URL预览窗口 - 新增自动播放和自动换下一个功能，修复手机端自动全屏
    function openUrlPreview(url) {
        // 创建预览窗口HTML（如果不存在）
        if (!document.getElementById('url-preview-overlay')) {
            const previewHTML = `
                <div class="url-preview-overlay" id="url-preview-overlay"></div>
                <div class="url-preview-container" id="url-preview-container">
                    <div class="url-preview-header">
                        <div class="url-preview-title">URL预览</div>
                        <button class="url-preview-close" id="url-preview-close">×</button>
                    </div>
                    <div class="url-preview-content">
                        <div class="url-preview-media-container">
                            <img class="url-preview-media" id="url-preview-img" style="display: none;">
                            <video class="url-preview-media" id="url-preview-video" style="display: none;" controls></video>
                        </div>
                        <div class="url-preview-info">
                            <div class="url-preview-url" id="url-preview-url"></div>
                        </div>
                        <div class="url-preview-actions">
                            <button class="btn btn-secondary" id="url-preview-prev">上一个</button>
                            <button class="btn btn-secondary" id="url-preview-next">下一个</button>
                            <button class="btn btn-danger" id="url-preview-delete">删除</button>
                            <button class="btn btn-primary" id="url-preview-close-btn">关闭</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', previewHTML);
            
            // 绑定预览窗口事件
            $('#url-preview-close, #url-preview-close-btn').on('click', closeUrlPreview);
            $('#url-preview-overlay').on('click', closeUrlPreview);
            $('#url-preview-prev').on('click', prevPreviewUrl);
            $('#url-preview-next').on('click', nextPreviewUrl);
            $('#url-preview-delete').on('click', deletePreviewUrl);
            
            // ESC键关闭
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape' && $('#url-preview-overlay').is(':visible')) {
                    closeUrlPreview();
                }
            });
        }
        
        // 设置当前预览的URL列表和索引
        currentPreviewUrls = getFilteredUrls();
        currentPreviewIndex = currentPreviewUrls.indexOf(url);
        
        if (currentPreviewIndex === -1) {
            showStatus('URL未找到', 'error');
            return;
        }
        
        // 加载预览内容
        loadPreviewContent(url);
        
        // 显示预览窗口
        $('#url-preview-overlay').show();
        $('#url-preview-container').show();
        
        // 移动端特殊定位
        if (isMobileDevice()) {
            const container = document.getElementById('url-preview-container');
            if (container) {
                container.style.top = '50px';
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
            }
        }
        
        // 新增：保存预览记忆到对应标签页
        previewMemory[currentPreviewTab] = url;
        savePreviewMemory();
        
        // 更新URL列表以显示预览状态
        updateUrlList();
        
        // 更新上次预览按钮状态
        updateLastPreviewButton();
    }

    // 加载预览内容 - 关联主设置静音开关，新增自动播放和自动换下一个，修复手机端自动全屏
    function loadPreviewContent(url) {
        const imgElement = document.getElementById('url-preview-img');
        const videoElement = document.getElementById('url-preview-video');
        const urlElement = document.getElementById('url-preview-url');
        
        if (!imgElement || !videoElement || !urlElement) return;
        
        // 隐藏所有媒体元素
        imgElement.style.display = 'none';
        videoElement.style.display = 'none';
        
        // 设置URL文本
        urlElement.textContent = url;
        
        // 根据URL类型加载相应媒体
        if (isImageUrl(url)) {
            imgElement.src = url;
            imgElement.style.display = 'block';
            imgElement.onerror = function() {
                showStatus('图片加载失败', 'error');
            };
            imgElement.onload = function() {
                console.log('✅ 预览图片加载成功');
            };
        } else if (isVideoUrl(url) || isOtherUrl(url)) {
            videoElement.src = url;
            videoElement.style.display = 'block';
            // 关联主设置静音开关
            videoElement.muted = config.videoMuted;
            
            // 修复：手机端防止自动全屏
            if (isMobileDevice()) {
                // iOS特定设置
                videoElement.setAttribute('playsinline', 'true');
                videoElement.setAttribute('webkit-playsinline', 'true');
                videoElement.setAttribute('x-webkit-airplay', 'allow');
                
                // 防止自动全屏
                videoElement.addEventListener('webkitbeginfullscreen', () => {
                    console.log('📱 iOS全屏开始');
                });
                videoElement.addEventListener('webkitendfullscreen', () => {
                    console.log('📱 iOS全屏结束');
                });
                
                // 检测Android WebView环境
                const isAndroidWebView = /; wv/.test(navigator.userAgent);
                if (isAndroidWebView) {
                    // WebView中可能需要特殊处理
                    videoElement.setAttribute('playsinline', 'true');
                }
            }
            
            // 修复：应用智能拖动优化
            setupSmartSeek(videoElement);
            
            // 新增：自动播放
            videoElement.play().then(() => {
                console.log('✅ 预览视频自动播放成功');
            }).catch(e => {
                console.log('❌ 预览视频自动播放失败:', e);
            });
            
            // 新增：视频结束后自动换下一个
            videoElement.onended = function() {
                console.log('🎬 预览视频播放结束，自动切换到下一个');
                nextPreviewUrl();
            };
            
            videoElement.onerror = function() {
                showStatus('视频加载失败', 'error');
            };
            videoElement.oncanplay = function() {
                console.log('✅ 预览视频可以播放');
            };
        } else {
            showStatus('无法预览此类型的URL', 'warning');
        }
        
        // 更新按钮状态 - 优化：当没有上一个/下一个时隐藏按键
        updatePreviewButtons();
    }

    // 更新预览按钮状态 - 优化：当没有上一个/下一个时隐藏按键
    function updatePreviewButtons() {
        const hasPrev = currentPreviewIndex > 0;
        const hasNext = currentPreviewIndex < currentPreviewUrls.length - 1;
        
        // 优化：当没有上一个/下一个时隐藏按键
        $('#url-preview-prev').toggle(hasPrev).prop('disabled', !hasPrev);
        $('#url-preview-next').toggle(hasNext).prop('disabled', !hasNext);
    }

    // 上一个预览URL
    function prevPreviewUrl() {
        if (currentPreviewIndex > 0) {
            currentPreviewIndex--;
            const prevUrl = currentPreviewUrls[currentPreviewIndex];
            loadPreviewContent(prevUrl);
            
            // 新增：保存预览记忆到对应标签页
            previewMemory[currentPreviewTab] = prevUrl;
            savePreviewMemory();
            
            updateUrlList();
        }
    }

    // 下一个预览URL
    function nextPreviewUrl() {
        if (currentPreviewIndex < currentPreviewUrls.length - 1) {
            currentPreviewIndex++;
            const nextUrl = currentPreviewUrls[currentPreviewIndex];
            loadPreviewContent(nextUrl);
            
            // 新增：保存预览记忆到对应标签页
            previewMemory[currentPreviewTab] = nextUrl;
            savePreviewMemory();
            
            updateUrlList();
        }
    }

    // 删除预览的URL
    function deletePreviewUrl() {
        const currentUrl = currentPreviewUrls[currentPreviewIndex];
        if (!currentUrl) return;
        
        if (!confirm('确定要删除这个URL吗？')) {
            return;
        }
        
        // 从配置中移除URL
        const urlIndex = config.mediaUrls.indexOf(currentUrl);
        if (urlIndex !== -1) {
            config.mediaUrls.splice(urlIndex, 1);
            saveConfig();
            
            // 如果删除的是最后一次预览的URL，清除标记
            if (previewMemory[currentPreviewTab] === currentUrl) {
                previewMemory[currentPreviewTab] = '';
                savePreviewMemory();
            }
            
            // 更新URL列表
            updateUrlList();
            updateUrlStats();
            updateWeightStats();
            updateWeightList();
            
            showStatus('✅ URL已删除', 'success');
            
            // 如果还有URL，显示下一个，否则关闭预览
            currentPreviewUrls = getFilteredUrls();
            if (currentPreviewUrls.length > 0) {
                if (currentPreviewIndex >= currentPreviewUrls.length) {
                    currentPreviewIndex = currentPreviewUrls.length - 1;
                }
                const nextUrl = currentPreviewUrls[currentPreviewIndex];
                loadPreviewContent(nextUrl);
                
                // 更新预览记忆
                previewMemory[currentPreviewTab] = nextUrl;
                savePreviewMemory();
            } else {
                closeUrlPreview();
            }
        }
    }

    // 关闭URL预览
    function closeUrlPreview() {
        $('#url-preview-overlay').hide();
        $('#url-preview-container').hide();
        
        // 恢复PC端定位
        if (!isMobileDevice()) {
            const container = document.getElementById('url-preview-container');
            if (container) {
                container.style.top = '50%';
                container.style.left = '50%';
                container.style.transform = 'translate(-50%, -50%)';
            }
        }
        
        // 更新URL列表以显示预览状态
        updateUrlList();
    }

    // 删除URL
    function removeUrl(url) {
        if (!confirm('确定要删除这个URL吗？')) {
            return;
        }
        
        const urlIndex = config.mediaUrls.indexOf(url);
        if (urlIndex !== -1) {
            config.mediaUrls.splice(urlIndex, 1);
            saveConfig();
            
            // 如果删除的是最后一次预览的URL，清除标记
            if (previewMemory[currentPreviewTab] === url) {
                previewMemory[currentPreviewTab] = '';
                savePreviewMemory();
            }
            
            // 更新显示
            updateUrlList();
            updateUrlStats();
            updateWeightStats();
            updateWeightList();
            
            showStatus('✅ URL已删除', 'success');
        }
    }

    // URL标签页切换 
    function switchUrlTab(tabName) {
        // 更新URL标签页导航
        $('.url-tab').removeClass('active');
        $(`.url-tab[data-tab="${tabName}"]`).addClass('active');
        
        // 设置当前预览标签页
        currentPreviewTab = tabName;
        
        // 更新URL列表显示
        updateUrlList();
        
        // 更新上次预览按钮状态
        updateLastPreviewButton();
    }

    // 新增：上次预览功能
    function lastPreview() {
        const lastPreviewedUrl = previewMemory[currentPreviewTab];
        if (!lastPreviewedUrl) {
            showStatus('当前标签页没有预览记忆', 'info');
            return;
        }
        
        const filteredUrls = getFilteredUrls();
        const lastIndex = filteredUrls.indexOf(lastPreviewedUrl);
        
        if (lastIndex === -1) {
            showStatus('预览记忆的URL在当前列表中不存在', 'warning');
            return;
        }
        
        // 滚动到最后一个预览的URL
        const urlListContainer = document.querySelector('.url-list-container');
        const urlItems = urlListContainer.querySelectorAll('.url-item');
        
        if (urlItems.length > lastIndex) {
            const targetItem = urlItems[lastIndex];
            targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 添加高亮效果
            urlItems.forEach(item => item.classList.remove('highlight'));
            targetItem.classList.add('highlight');
            
            setTimeout(() => {
                targetItem.classList.remove('highlight');
            }, 2000);
            
            showStatus(`已滚动到上次预览的URL (${lastIndex + 1}/${filteredUrls.length})`, 'success');
        }
    }

    // 新增：更新上次预览按钮状态 - 修改：基于预览记忆状态改变边框样式
    function updateLastPreviewButton() {
        const lastPreviewBtn = document.getElementById('last-preview-btn');
        if (lastPreviewBtn) {
            const hasMemory = !!previewMemory[currentPreviewTab];
            
            // 修改：当前标签有预览记忆时变实线，否则虚线
            if (hasMemory) {
                lastPreviewBtn.classList.add('has-memory');
                lastPreviewBtn.title = `上次预览: ${previewMemory[currentPreviewTab]}`;
            } else {
                lastPreviewBtn.classList.remove('has-memory');
                lastPreviewBtn.title = '当前标签页没有预览记忆';
            }
        }
    }

    // 更新URL文本框显示（考虑搜索过滤）- 现在使用新的列表样式
    function updateUrlTextareas() {
        // 不再使用文本框，使用新的列表样式
        updateUrlList();
    }

    // 创建播放器 - 使用坐标定位，修复手机端自动全屏
    function createPlayer() {
        console.log('🔄 创建播放器...', '移动端:', isMobileDevice());
        
        // 移除已存在的元素
        const existingPlayer = document.getElementById('minimal-player');
        const existingBtn = document.getElementById('media-control-btn');
        if (existingPlayer) existingPlayer.remove();
        if (existingBtn) existingBtn.remove();
        
        const isMobile = isMobileDevice();
        const buttonSize = getButtonSizePixels();
        
        // 播放器位置 - 使用固定坐标
        const savedPlayerPos = localStorage.getItem('media_player_position');
        let playerStyle = `width: ${config.playerWidth}px; position: fixed;`;
        
        if (savedPlayerPos) {
            const pos = JSON.parse(savedPlayerPos);
            playerStyle += `left: ${pos.x}px; top: ${pos.y}px;`;
        } else {
            // 默认位置：距离顶部10px，左边10px
            playerStyle += 'left: 10px; top: 10px;';
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
                        <video id="player-video" playsinline webkit-playsinline preload="auto"></video>
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
                            ${!isMobileDevice() ? `
                            <button class="fullscreen-btn" id="fullscreen-btn" title="全屏">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                </svg>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        
        // 播放键位置 - 使用固定坐标
        const savedButtonPos = localStorage.getItem('media_button_position');
        let buttonStyle = `width: ${buttonSize}px; height: ${buttonSize}px; font-size: ${buttonSize * 0.4}px; position: fixed;`;
        
        if (savedButtonPos) {
            const pos = JSON.parse(savedButtonPos);
            buttonStyle += `left: ${pos.x}px; top: ${pos.y}px;`;
        } else {
            // 默认位置：距离顶部50px，左边50px
            buttonStyle += 'left: 50px; top: 50px;';
        }
        
        // 应用播放键颜色
        const buttonColorStyle = getButtonColorStyle();
        buttonStyle += `background: ${buttonColorStyle};`;
        
        const buttonHTML = `
                <div id="media-control-btn" style="${buttonStyle}" title="点击切换媒体播放 | 拖动移动位置">
                    <svg width="${buttonSize * 0.5}" height="${buttonSize * 0.5}" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        
        console.log('✅ 播放器和播放键创建完成');
        
        bindPlayerEvents();
        bindButtonEvents();
        updateMediaOpacity();
        
        // 移动端特殊处理
        if (isMobile) {
            const player = document.getElementById('minimal-player');
            const button = document.getElementById('media-control-btn');
            const video = document.getElementById('player-video');
            
            if (player) {
                player.style.touchAction = 'none';
            }
            
            if (button) {
                button.style.touchAction = 'manipulation';
            }
            
            if (video) {
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.setAttribute('x-webkit-airplay', 'allow');
                
                // 防止自动全屏
                video.addEventListener('webkitbeginfullscreen', () => {
                    console.log('📱 iOS全屏开始');
                });
                video.addEventListener('webkitendfullscreen', () => {
                    console.log('📱 iOS全屏结束');
                });
                
                // 检测Android WebView环境
                const isAndroidWebView = /; wv/.test(navigator.userAgent);
                if (isAndroidWebView) {
                    // WebView中可能需要特殊处理
                    video.setAttribute('playsinline', 'true');
                }
            }
        }
        
        // 确保播放键立即显示
        setTimeout(() => {
            const btn = document.getElementById('media-control-btn');
            if (btn) {
                btn.style.display = 'flex';
                btn.style.visibility = 'visible';
            }
        }, 100);
    }

    // 保存播放器位置
    function savePlayerPosition() {
        const player = document.getElementById('minimal-player');
        if (player && player.style.display !== 'none' && !isFullscreen) {
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
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        
        if (!player || !video) {
            console.error('❌ 播放器元素未找到');
            return;
        }
        
        // 全屏按钮事件（仅PC端）
        if (fullscreenBtn && !isMobileDevice()) {
            fullscreenBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleFullscreen();
                showControls();
            });
        }
        
        // PC端双击切换下一个媒体
        player.addEventListener('dblclick', function(e) {
            if (!isMobileDevice() && e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && e.target.id !== 'fullscreen-btn') {
                showControls();
                nextMedia();
            }
        });
        
        // 手机端双击切换媒体
        if (isMobileDevice()) {
            let tapCount = 0;
            let tapTimer = null;
            
            player.addEventListener('touchstart', function(e) {
                if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && e.target.id !== 'fullscreen-btn' && isVideoPlaying) {
                    tapCount++;
                    
                    if (tapCount === 1) {
                        showControls();
                        tapTimer = setTimeout(() => {
                            tapCount = 0;
                        }, 300);
                    } else if (tapCount === 2) {
                        clearTimeout(tapTimer);
                        tapCount = 0;
                        nextMedia();
                    }
                }
            });
            
            content.addEventListener('touchstart', function(e) {
                if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && e.target.id !== 'fullscreen-btn' && isVideoPlaying) {
                    showControls();
                }
            });
        } else {
            content.addEventListener('click', function(e) {
                if (e.target.id !== 'video-progress' && !e.target.classList.contains('custom-slider-thumb') && e.target.id !== 'fullscreen-btn' && isVideoPlaying) {
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
            
            preloadNextVideo();
        });
        
        video.addEventListener('canplay', function() {
            console.log('✅ 视频可以播放');
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
            // 播放结束时清除播放记忆
            clearPlaybackMemory();
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

    // 确保播放键在视口内
    function ensureButtonInViewport() {
        const button = document.getElementById('media-control-btn');
        if (!button) return;
        
        const rect = button.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let newX = parseFloat(button.style.left) || 50;
        let newY = parseFloat(button.style.top) || 50;
        
        const margin = 10;
        
        if (newX < margin) newX = margin;
        if (newY < margin) newY = margin;
        if (newX + rect.width > viewportWidth - margin) newX = viewportWidth - rect.width - margin;
        if (newY + rect.height > viewportHeight - margin) newY = viewportHeight - rect.height - margin;
        
        button.style.left = newX + 'px';
        button.style.top = newY + 'px';
        
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
        const customThumb = document.querySelector('.custom-slider-thumb');
        
        if (!video.duration) return;
        
        isDraggingProgress = true;
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
            
            if (bufferPercent > 80) {
                preloadNextVideo();
            }
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
            
            // 保存播放记忆
            if (config.playbackMemory && isVideoPlaying) {
                if (playbackMemory.type === 'online') {
                    playbackMemory.time = video.currentTime;
                } else if (playbackMemory.type === 'local') {
                    playbackMemory.time = video.currentTime;
                }
            }
        }
    }

    // 绑定播放键事件
    function bindButtonEvents() {
        const button = document.getElementById('media-control-btn');
        
        if (!button) {
            console.error('❌ 播放键元素未找到');
            return;
        }
        
        console.log('🔗 绑定播放键事件...');
        
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
                
                // 防止双击误触
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                if (tapLength < 500 && tapLength > 0) {
                    return;
                }
                lastTapTime = currentTime;
                
                // 标记为点击而非拖动
                isDraggingButton = false;
            });
            
            currentButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (!isDraggingButton) {
                    togglePlayer();
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
                        startButtonDrag(e);
                    }
            });
            
        } else {
            // PC端事件
            console.log('💻 绑定PC端点击事件');
            
            currentButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (!isDraggingButton) {
                    togglePlayer();
                }
            });
        }
        
        // 拖动事件（PC和移动端共用）
        currentButton.addEventListener('mousedown', startButtonDrag);
        
        console.log('✅ 播放键事件绑定完成');
    }

    // 开始拖动播放键
    function startButtonDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingButton = true;
        
        const button = document.getElementById('media-control-btn');
        const rect = button.getBoundingClientRect();
        
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

    // 播放键拖动中
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
    }

    // 停止拖动播放键
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
    }

    // 开始拖动播放器
    function startPlayerDrag(e) {
        if (e.target.id === 'video-progress' || e.target.classList.contains('custom-slider-thumb') || e.target.id === 'fullscreen-btn' || isFullscreen) return;
        
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
        if (!player || player.style.display === 'none' || isFullscreen) return;
        
        const rect = player.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let newX = parseFloat(player.style.left) || 10;
        let newY = parseFloat(player.style.top) || 10;
        
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

    // 更新媒体透明度
    function updateMediaOpacity() {
        const img = document.getElementById('player-img');
        const video = document.getElementById('player-video');
        const player = document.getElementById('minimal-player');
        const videoControls = document.getElementById('video-controls');
        const timeDisplay = document.getElementById('video-time');
        
        if (player && !isFullscreen) player.style.background = `rgba(0, 0, 0, ${config.playerOpacity})`;
        if (img) img.style.opacity = config.playerOpacity;
        if (video) video.style.opacity = config.playerOpacity;
        
        if (videoControls) {
            const baseOpacity = config.controlsOpacity;
            videoControls.style.background = `rgba(0,0,0,${Math.min(baseOpacity + 0.3, 0.95)})`;
            
            const buffer = document.getElementById('video-buffer');
            const played = document.getElementById('video-played');
            if (buffer) buffer.style.background = `rgba(255,255,255,${baseOpacity * 0.4})`;
            if (played) {
                // 应用进度条颜色样式 
                const progressColorStyle = getProgressColorStyle();
                played.style.background = progressColorStyle;
                played.style.opacity = baseOpacity;
            }
        }
        
        if (timeDisplay) timeDisplay.style.opacity = config.controlsOpacity;
    }

    // 播放记忆功能
    function savePlaybackMemory(url, time, type) {
        if (config.playbackMemory) {
            playbackMemory = {
                url: url,
                time: time,
                type: type
            };
            console.log('💾 保存播放记忆:', { url: url, time: time, type: type });
        }
    }

    function clearPlaybackMemory() {
        playbackMemory = {
            url: null,
            time: 0,
            type: null
        };
        console.log('🗑️ 清除播放记忆');
    }

    function hasPlaybackMemory() {
        return config.playbackMemory && playbackMemory.url !== null;
    }

    // 播放器控制函数
    function togglePlayer() {
        console.log('🔄 togglePlayer called, current state:', isPlayerVisible);
        
        isPlayerVisible = !isPlayerVisible;
        const player = document.getElementById('minimal-player');
        const btn = document.getElementById('media-control-btn');
        
        if (!player || !btn) {
            console.error('❌ 播放器或播放键元素未找到');
            return;
        }
        
        if (isPlayerVisible) {
            console.log('▶️ 显示播放器');
            player.style.display = 'block';
            btn.innerHTML = `
                    <svg width="${getButtonSizePixels() * 0.5}" height="${getButtonSizePixels() * 0.5}" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h12v12H6z"/>
                    </svg>
                `;
            btn.title = '停止播放';
            
            // 检查是否有播放记忆
            if (hasPlaybackMemory()) {
                console.log('🎯 检测到播放记忆，继续播放');
                continueFromMemory();
            } else {
                startPlayback();
            }
            
            ensurePlayerInViewport();
            
            // 移动端特殊处理
            if (isMobileDevice()) {
                player.style.zIndex = '10000';
                player.style.visibility = 'visible';
            }
        } else {
            console.log('⏸️ 隐藏播放器');
            player.style.display = 'none';
            btn.innerHTML = `
                    <svg width="${getButtonSizePixels() * 0.5}" height="${getButtonSizePixels() * 0.5}" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
            btn.title = '开始播放';
            
            // 停止播放时保存播放记忆
            const video = document.getElementById('player-video');
            if (video && !video.paused && config.playbackMemory) {
                if (playbackMemory.type === 'online') {
                    const currentUrl = config.mediaUrls[currentIndex];
                    if (currentUrl) {
                        savePlaybackMemory(currentUrl, video.currentTime, 'online');
                    }
                } else if (playbackMemory.type === 'local') {
                    const currentVideo = config.localVideos[currentIndex];
                    if (currentVideo) {
                        savePlaybackMemory(currentVideo.path, video.currentTime, 'local');
                    }
                }
            }
            
            stopPlayback();
        }
        savePlayerPosition();
        
        console.log('✅ 播放器状态切换完成，新状态:', isPlayerVisible);
    }

    // 从记忆继续播放
    function continueFromMemory() {
        console.log('🎵 从记忆继续播放:', playbackMemory);
        
        if (playbackMemory.type === 'online') {
            // 在线媒体记忆
            const memoryIndex = config.mediaUrls.findIndex(url => url === playbackMemory.url);
            if (memoryIndex !== -1) {
                currentIndex = memoryIndex;
                loadCurrentMediaWithMemory(playbackMemory.time);
            } else {
                // 记忆的URL不存在，正常播放
                startPlayback();
            }
        } else if (playbackMemory.type === 'local') {
            // 本地媒体记忆
            const memoryIndex = config.localVideos.findIndex(video => video.path === playbackMemory.url);
            if (memoryIndex !== -1) {
                currentIndex = memoryIndex;
                playLocalVideoWithMemory(memoryIndex, playbackMemory.time);
            } else {
                // 记忆的视频不存在，正常播放
                startPlayback();
            }
        } else {
            startPlayback();
        }
    }

    // 从记忆播放本地视频
    function playLocalVideoWithMemory(index, startTime) {
        if (index < 0 || index >= config.localVideos.length) {
            startPlayback();
            return;
        }
        
        const video = config.localVideos[index];
        playbackMemory.type = 'local';
        
        console.log('🎬 从记忆播放本地视频:', video.name, '时间:', startTime);
        
        // 加载本地视频
        loadLocalVideoWithMemory(video, startTime);
        
        // 更新列表高亮
        updateLocalVideoList();
    }

    // 从记忆加载本地视频
    function loadLocalVideoWithMemory(video, startTime) {
        const videoElement = document.getElementById('player-video');
        const imgElement = document.getElementById('player-img');
        const videoControls = document.getElementById('video-controls');
        
        if (!videoElement) return;
        
        // 隐藏图片，显示视频
        if (imgElement) imgElement.style.display = 'none';
        videoElement.style.display = 'block';
        if (videoControls) videoControls.style.display = 'flex';
        
        // 创建对象URL
        const objectUrl = URL.createObjectURL(video.file);
        videoElement.src = objectUrl;
        
        // 设置静音
        if (config.videoMuted) videoElement.muted = true;
        
        // 设置开始时间
        videoElement.currentTime = startTime;
        
        // 修复：应用智能拖动优化
        setupSmartSeek(videoElement);
        
        // 播放视频 - 修复：移除错误的错误处理，使用更精确的播放状态检测
        videoElement.play().then(() => {
            console.log('✅ 本地视频从记忆播放成功');
            isVideoPlaying = true;
            showControls();
            
            // 修复：播放成功时不显示失败提示
            showStatus(`✅ 正在播放: ${video.name}`, 'success');
        }).catch(e => {
            console.log('❌ 本地视频播放失败:', e);
            // 修复：只在真正播放失败时显示错误提示
            if (e.name !== 'AbortError') {
                showStatus('视频播放失败: ' + e.message, 'error');
            }
        });
        
        // 清理对象URL
        videoElement.onended = function() {
            URL.revokeObjectURL(objectUrl);
        };
        
        // 修复：添加更精确的播放状态检测
        videoElement.oncanplay = function() {
            console.log('✅ 本地视频可以播放');
        };
        
        videoElement.onerror = function() {
            console.log('❌ 本地视频加载错误');
            showStatus('视频加载失败', 'error');
        };
        
        updateMediaOpacity();
        setTimeout(adjustPlayerHeight, 100);
    }

    function startPlayback() {
        console.log('🎵 开始播放');
        
        // 根据媒体类型选择播放源
        if (config.mediaType === 'local-video') {
            // 本地视频播放
            if (config.localVideos.length === 0) {
                console.warn('⚠️ 没有可用的本地视频');
                showStatus('没有本地视频可播放', 'warning');
                return;
            }
            
            // 本地视频随机播放
            const randomIndex = Math.floor(Math.random() * config.localVideos.length);
            currentIndex = randomIndex;
            playLocalVideo(randomIndex);
            
        } else {
            // 在线媒体播放
            if (config.mediaUrls.length === 0) {
                console.warn('⚠️ 没有可用的在线媒体URL');
                return;
            }
            
            // 根据播放模式选择起始索引
            if (config.playMode === 'random') {
                const playableUrls = getPlayableUrls();
                if (playableUrls.length === 0) {
                    console.warn('⚠️ 没有可播放的URL（可能都被权重过滤了）');
                    return;
                }
                const randomUrl = getNextRandomUrl();
                currentIndex = config.mediaUrls.indexOf(randomUrl);
            } else {
                currentIndex = 0;
            }
            
            loadCurrentMedia();
        }
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
        loadCurrentMediaWithMemory(0);
    }

    function loadCurrentMediaWithMemory(startTime = 0) {
        // 根据媒体类型选择播放源
        if (config.mediaType === 'local-video') {
            // 本地视频播放
            if (config.localVideos.length === 0) return;
            const video = config.localVideos[currentIndex];
            loadLocalVideoWithMemory(video, startTime);
        } else {
            // 在线媒体播放
            const playableUrls = getPlayableUrls();
            if (playableUrls.length === 0) {
                console.warn('⚠️ 没有可播放的URL（可能都被权重过滤了）');
                return;
            }
            
            const url = config.mediaUrls[currentIndex];
            const isVideo = isVideoUrl(url) || isOtherUrl(url);
            
            console.log('📺 加载在线媒体:', url, '类型:', isVideo ? '视频' : '图片', '开始时间:', startTime);
            
            // 检查媒体类型过滤
            const shouldShow = (config.mediaType === 'online-mixed') || 
            (config.mediaType === 'online-image' && !isVideo) ||
            (config.mediaType === 'online-video' && (isVideoUrl(url) || isOtherUrl(url)));
            
            if (!shouldShow) {
                console.log('⏭️ 跳过不符合媒体类型的URL');
                nextMedia();
                return;
            }
            
            // 检查权重过滤
            const domain = extractTopLevelDomain(url);
            const weight = getDomainWeight(domain);
            if (weight === 0) {
                console.log(`⏭️ 跳过权重为0的域名: ${domain}`);
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
                    // 使用缓存视频或加载新视频
                    const cachedVideo = manageVideoCache(url);
                    if (cachedVideo) {
                        console.log('📥 使用缓存视频');
                        video.src = cachedVideo.src;
                    } else {
                        video.src = url;
                    }
                    
                    video.style.display = 'block';
                    if (videoControls) videoControls.style.display = 'flex';
                    if (config.videoMuted) video.muted = true;
                    
                    // 修复：应用智能拖动优化
                    setupSmartSeek(video);
                    
                    // 设置开始时间
                    if (startTime > 0) {
                        video.currentTime = startTime;
                    }
                    
                    video.play().then(() => {
                        console.log('✅ 视频播放成功');
                        playbackMemory.type = 'online';
                    }).catch(e => {
                        console.log('❌ 视频播放失败:', e);
                        urlValidationCache.set(url, false);
                        setTimeout(nextMedia, 1000);
                    });
                }
            } else {
                if (img) {
                    img.src = url;
                    img.style.display = 'block';
                    img.onerror = function() {
                        console.log('❌ 图片加载失败:', url);
                        urlValidationCache.set(url, false);
                        nextMedia();
                    };
                    img.onload = function() {
                        console.log('✅ 图片加载成功');
                        playbackMemory.type = 'online';
                    };
                    slideTimer = setInterval(nextMedia, config.slideInterval);
                    hideControls();
                }
            }
            
            updateMediaOpacity();
            setTimeout(adjustPlayerHeight, 100);
        }
    }

    function nextMedia() {
        // 切换媒体时清除播放记忆
        clearPlaybackMemory();
        
        // 根据媒体类型选择下一个媒体
        if (config.mediaType === 'local-video') {
            // 本地视频随机播放
            if (config.localVideos.length === 0) {
                console.warn('⚠️ 没有本地视频');
                return;
            }
            
            const randomIndex = Math.floor(Math.random() * config.localVideos.length);
            currentIndex = randomIndex;
            playLocalVideo(randomIndex);
            
        } else {
            // 在线媒体播放
            const playableUrls = getPlayableUrls();
            if (playableUrls.length === 0) {
                console.warn('⚠️ 没有可播放的URL');
                return;
            }
            
            if (config.playMode === 'random') {
                // 随机播放模式 - 使用优化后的算法
                const nextUrl = getNextRandomUrl();
                if (nextUrl) {
                    currentIndex = config.mediaUrls.indexOf(nextUrl);
                    console.log('🎲 随机播放，切换到:', nextUrl);
                }
            } else {
                // 顺序播放模式
                let found = false;
                let attempts = 0;
                const maxAttempts = config.mediaUrls.length;
                
                while (!found && attempts < maxAttempts) {
                    currentIndex = (currentIndex + 1) % config.mediaUrls.length;
                    const url = config.mediaUrls[currentIndex];
                    const domain = extractTopLevelDomain(url);
                    const weight = getDomainWeight(domain);
                    
                    // 检查权重过滤
                    if (weight > 0) {
                        found = true;
                        console.log('⏭️ 顺序播放，切换到:', url);
                    } else {
                        attempts++;
                        console.log(`⏭️ 跳过权重为0的域名: ${domain}`);
                    }
                }
                
                if (!found) {
                    console.warn('⚠️ 没有找到可播放的URL');
                    return;
                }
            }
            
            loadCurrentMedia();
        }
        showControls();
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg|mov|avi|m3u8|flv|mkv|wmv|mpg|mpeg|3gp)/i.test(url);
    }

    function isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|tif)/i.test(url);
    }

    function isOtherUrl(url) {
        return !isImageUrl(url) && !isVideoUrl(url);
    }

    // 备份设置功能 - 排除本地文件列表
    function backupSettings() {
        const backupData = {
            config: {
                enabled: config.enabled,
                mediaType: config.mediaType,
                playMode: config.playMode,
                slideInterval: config.slideInterval,
                videoMuted: config.videoMuted,
                playerWidth: config.playerWidth,
                playerOpacity: config.playerOpacity,
                controlsOpacity: config.controlsOpacity,
                maxOnlineUrls: config.maxOnlineUrls,
                maxLocalVideos: config.maxLocalVideos,
                playbackMemory: config.playbackMemory,
                buttonSize: config.buttonSize,
                buttonColor: config.buttonColor, // 新增：播放键颜色
                domainWeights: config.domainWeights,
                domainNotes: config.domainNotes
            },
            mediaUrls: config.mediaUrls,
            // 排除本地视频列表，因为文件对象无法序列化
            localVideos: [], // 清空本地视频列表
            backupTime: new Date().toISOString(),
            version: PLUGIN_VERSION
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `media_player_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showStatus('✅ 设置备份成功（已排除本地文件列表）', 'success');
    }

    // 恢复设置功能
    function restoreSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // 验证备份文件格式
                    if (!backupData.config || !backupData.mediaUrls) {
                        throw new Error('无效的备份文件格式');
                    }
                    
                    if (!confirm('确定要恢复备份设置吗？这将覆盖当前的所有设置和媒体列表。')) {
                        return;
                    }
                    
                    // 恢复配置
                    Object.assign(config, backupData.config);
                    config.mediaUrls = backupData.mediaUrls;
                    
                    // 恢复时清空本地视频列表，因为浏览器重新打开时需要重新选择
                    config.localVideos = [];
                    
                    // 如果备份中没有权重数据，初始化空对象
                    if (!config.domainWeights) {
                        config.domainWeights = {};
                    }
                    
                    // 如果备份中没有备注数据，初始化空对象
                    if (!config.domainNotes) {
                        config.domainNotes = {};
                    }
                    
                    // 如果备份中没有本地视频最大数量，设置默认值50
                    if (!config.maxLocalVideos) {
                        config.maxLocalVideos = 50;
                    }
                    
                    // 如果备份中没有播放键颜色，设置默认值
                    if (!config.buttonColor) {
                        config.buttonColor = 'default';
                    }
                    
                    // 保存配置
                    saveConfig();
                    saveLocalVideosToDB();
                    
                    // 重新创建播放器和播放键
                    createPlayer();
                    
                    // 更新设置面板
                    createSettingsPanel();
                    
                    showStatus('✅ 设置恢复成功（本地视频列表已清空）', 'success');
                    
                } catch (error) {
                    showStatus('❌ 恢复设置失败: ' + error.message, 'error');
                }
            };
            
            reader.onerror = function() {
                showStatus('❌ 读取备份文件失败', 'error');
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    function extractUrlsFromText(text) {
        const urlRegex = /https?:\/\/[^\s<>"',;()\u4e00-\u9fff]+/gi;
        const urls = text.match(urlRegex) || [];
        
        const cleanedUrls = urls
        .filter(url => url.trim())
        .filter(url => url.startsWith('http'))
        .map(url => {
            return url.replace(/[,，;；()（）\u4e00-\u9fff]+$/, '');
        })
        .filter(url => url.length > 10);
        
        const uniqueUrls = [...new Set(cleanedUrls)];
        
        console.log('🔍 从文本中识别到URL:', uniqueUrls);
        return uniqueUrls;
    }

    function extractUrlsFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    let urls = [];
                    
                    switch (fileExtension) {
                        case 'txt':
                            urls = extractUrlsFromText(content);
                            break;
                        case 'csv':
                        case 'tsv':
                            const delimiter = fileExtension === 'csv' ? ',' : '\t';
                            const lines = content.split('\n');
                            lines.forEach(line => {
                                const cells = line.split(delimiter);
                                cells.forEach(cell => {
                                    const cellUrls = extractUrlsFromText(cell);
                                    urls.push(...cellUrls);
                                });
                            });
                            break;
                        case 'json':
                            const jsonData = JSON.parse(content);
                            const extractUrlsFromObject = (obj) => {
                                if (typeof obj === 'string') {
                                    return extractUrlsFromText(obj);
                                } else if (Array.isArray(obj)) {
                                    return obj.flatMap(extractUrlsFromObject);
                                } else if (typeof obj === 'object' && obj !== null) {
                                    return Object.values(obj).flatMap(extractUrlsFromObject);
                                }
                                return [];
                            };
                            urls = extractUrlsFromObject(jsonData);
                            break;
                        case 'xls':
                        case 'xlsx':
                            urls = extractUrlsFromText(content);
                            break;
                        default:
                            urls = extractUrlsFromText(content);
                    }
                    
                    const uniqueUrls = [...new Set(urls)].filter(url => url.trim());
                    resolve(uniqueUrls);
                    
                } catch (error) {
                    reject(new Error(`文件解析失败: ${error.message}`));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('文件读取失败'));
            };
            
            if (fileExtension === 'xls' || fileExtension === 'xlsx') {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        });
    }

    async function validateUrl(url, index, total) {
        if (urlValidationCache.has(url)) return urlValidationCache.get(url);
        
        updateValidationProgress(`正在检测第 ${index + 1} 个/总共 ${total} 个URL`);
        
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
            } else if (isVideoUrl(url) || isOtherUrl(url)) {
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
                fetch(url, { method: 'HEAD', mode: 'no-cors' })
                .then(() => { 
                    clearTimeout(timer); 
                    urlValidationCache.set(url, true); 
                    resolve(true); 
                })
                .catch(() => { 
                    fetch(url, { method: 'GET', mode: 'no-cors' })
                    .then(() => { 
                        clearTimeout(timer); 
                        urlValidationCache.set(url, true); 
                        resolve(true); 
                    })
                    .catch(() => { 
                        clearTimeout(timer); 
                        urlValidationCache.set(url, false); 
                        resolve(false); 
                    });
                });
            }
        });
    }

    function updateValidationProgress(message) {
        const progressEl = document.getElementById('validation-progress');
        if (progressEl) {
            progressEl.textContent = message;
        }
    }

    // 移除失效URL
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

    function clearAllUrls() {
        config.mediaUrls = [];
        saveConfig();
        urlValidationCache.clear();
        videoBufferCache.clear();
        return true;
    }

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

    function importFromText(text, mode) {
        const newUrls = text.split('\n')
        .filter(url => url.trim())
        .filter((url, index, self) => self.indexOf(url) === index);
        
        // 如果超过限制，进行智能筛选
        let filteredUrls = newUrls;
        if (newUrls.length > config.maxOnlineUrls) {
            filteredUrls = smartUrlFilter(newUrls, config.maxOnlineUrls);
            showStatus(`URL数量超过限制，已智能筛选保留 ${filteredUrls.length} 个URL`, 'warning');
        }
        
        if (mode === 'replace') {
            config.mediaUrls = filteredUrls;
        } else {
            const combinedUrls = [...new Set([...config.mediaUrls, ...filteredUrls])];
            // 如果合并后超过限制，再次进行智能筛选
            if (combinedUrls.length > config.maxOnlineUrls) {
                config.mediaUrls = smartUrlFilter(combinedUrls, config.maxOnlineUrls);
                showStatus(`URL数量超过限制，已智能筛选保留 ${config.mediaUrls.length} 个URL`, 'warning');
            } else {
                config.mediaUrls = combinedUrls;
            }
        }
        
        saveConfig();
        return filteredUrls.length;
    }

    function loadConfig() {
        try {
            const saved = localStorage.getItem('minimal_media_config');
            if (saved) {
                Object.assign(config, JSON.parse(saved));
                // 确保权重配置存在
                if (!config.domainWeights) {
                    config.domainWeights = {};
                }
                // 确保备注配置存在
                if (!config.domainNotes) {
                    config.domainNotes = {};
                }
                // 确保本地视频配置存在
                if (!config.localVideos) {
                    config.localVideos = [];
                }
                // 确保本地视频最大数量配置存在，默认50，最大500
                if (!config.maxLocalVideos) {
                    config.maxLocalVideos = 50;
                }
                // 确保播放键颜色配置存在
                if (!config.buttonColor) {
                    config.buttonColor = 'default';
                }
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

    // 创建设置面板
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
        const otherUrls = config.mediaUrls.filter(url => isOtherUrl(url));
        const allDomains = getAllDomains();
        
        const isCollapsed = config.settingsCollapsed;
        const contentClass = isCollapsed ? 'collapsed' : 'expanded';
        
        // 极简线条样式，适配更多模版
        const html = `
            <div class="media-player-panel" id="media-player-settings">
                <div class="inline-drawer-toggle inline-drawer-header media-player-header">
                    <b>媒体播放器<span class="th-text-xs font-bold text-red-500"> v${PLUGIN_VERSION}</span></b>
                    <div class="inline-drawer-icon fa-solid interactable ${isCollapsed ? 'fa-circle-chevron-down' : 'up fa-circle-chevron-up'}" tabindex="0" role="button"></div>
                </div>
                
                <div class="panel-content ${contentClass}" id="settings-content">
                    <!-- 标签页导航 -->
                    <div class="tab-nav">
                        <div class="tab-nav-item ${config.activeTab === 'main' ? 'active' : ''}" data-tab="main">主设置</div>
                        <div class="tab-nav-item ${config.activeTab === 'media' ? 'active' : ''}" data-tab="media">在线媒体</div>
                        <div class="tab-nav-item ${config.activeTab === 'local' ? 'active' : ''}" data-tab="local">本地媒体</div>
                        <div class="tab-nav-item ${config.activeTab === 'weights' ? 'active' : ''}" data-tab="weights">播放权重</div>
                    </div>
                    
                    <!-- 主设置标签页 -->
                    <div class="tab-content ${config.activeTab === 'main' ? 'active' : ''}" id="tab-main">
                        <!-- 基本设置 -->
                        <div class="setting-group">
                            <div class="setting-group-title">基本设置</div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label for="mp-enabled">启用播放器</label>
                                </div>
                                <div class="setting-control">
                                    <input type="checkbox" id="mp-enabled" ${config.enabled ? 'checked' : ''}>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label for="mp-media-type">媒体类型</label>
                                </div>
                                <div class="setting-control">
                                    <select class="form-control" id="mp-media-type">
                                        <option value="online-mixed" ${config.mediaType === 'online-mixed' ? 'selected' : ''}>在线混合</option>
                                        <option value="online-image" ${config.mediaType === 'online-image' ? 'selected' : ''}>在线图片</option>
                                        <option value="online-video" ${config.mediaType === 'online-video' ? 'selected' : ''}>在线视频(包含其它类型)</option>
                                        <option value="local-video" ${config.mediaType === 'local-video' ? 'selected' : ''}>本地视频</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label for="mp-play-mode">播放模式</label>
                                </div>
                                <div class="setting-control">
                                    <select class="form-control" id="mp-play-mode">
                                        <option value="sequential" ${config.playMode === 'sequential' ? 'selected' : ''}>顺序播放</option>
                                        <option value="random" ${config.playMode === 'random' ? 'selected' : ''}>随机播放</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label for="mp-muted">视频静音</label>
                                </div>
                                <div class="setting-control">
                                    <input type="checkbox" id="mp-muted" ${config.videoMuted ? 'checked' : ''}>
                                </div>
                            </div>
                            
                            <!-- 播放记忆设置 -->
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label for="mp-playback-memory">播放记忆</label>
                                </div>
                                <div class="setting-control">
                                    <input type="checkbox" id="mp-playback-memory" ${config.playbackMemory ? 'checked' : ''}>
                                </div>
                            </div>
                            
                            <!-- 播放键大小设置 -->
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label for="mp-button-size">播放键大小</label>
                                </div>
                                <div class="setting-control">
                                    <select class="form-control" id="mp-button-size">
                                        <option value="small" ${config.buttonSize === 'small' ? 'selected' : ''}>小 (35px)</option>
                                        <option value="medium" ${config.buttonSize === 'medium' ? 'selected' : ''}>中 (50px)</option>
                                        <option value="large" ${config.buttonSize === 'large' ? 'selected' : ''}>大 (65px)</option>
                                        <option value="xlarge" ${config.buttonSize === 'xlarge' ? 'selected' : ''}>特大 (80px)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- 播放键颜色设置 -->
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>播放键颜色</label>
                                </div>
                                <div class="setting-control">
                                    <div class="button-color-control">
                                        <button class="color-btn ${config.buttonColor === 'default' ? 'active' : ''}" data-color="default">默认</button>
                                        <button class="color-btn ${config.buttonColor === 'random' ? 'active' : ''}" data-color="random">随机</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 显示设置 -->
                        <div class="setting-group">
                            <div class="setting-group-title">显示设置</div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>播放器透明度: <span class="slider-value" id="opacity-value">${Math.round(config.playerOpacity * 100)}%</span></label>
                                </div>
                                <div class="setting-control">
                                    <div class="slider-container">
                                        <input type="range" id="mp-opacity" min="10" max="100" value="${config.playerOpacity * 100}">
                                        <input type="number" id="mp-opacity-input" min="10" max="100" value="${Math.round(config.playerOpacity * 100)}">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>控制条透明度: <span class="slider-value" id="controls-opacity-value">${Math.round(config.controlsOpacity * 100)}%</span></label>
                                </div>
                                <div class="setting-control">
                                    <div class="slider-container">
                                        <input type="range" id="mp-controls-opacity" min="10" max="100" value="${config.controlsOpacity * 100}">
                                        <input type="number" id="mp-controls-opacity-input" min="10" max="100" value="${Math.round(config.controlsOpacity * 100)}">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>播放器宽度: <span class="slider-value" id="width-value">${config.playerWidth}px</span></label>
                                </div>
                                <div class="setting-control">
                                    <div class="slider-container">
                                        <input type="range" id="mp-width" min="200" max="800" value="${config.playerWidth}">
                                        <input type="number" id="mp-width-input" min="200" max="800" value="${config.playerWidth}">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>图片切换间隔: <span class="slider-value" id="interval-value">${config.slideInterval}ms</span></label>
                                </div>
                                <div class="setting-control">
                                    <div class="slider-container">
                                        <input type="range" id="mp-interval" min="500" max="10000" step="500" value="${config.slideInterval}">
                                        <input type="number" id="mp-interval-input" min="500" max="10000" step="500" value="${config.slideInterval}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 缓存统计 -->
                        <div class="cache-stats" id="cache-stats">
                            <!-- 缓存统计内容由JavaScript动态生成 -->
                        </div>
                        
                        <!-- 操作按钮 -->
                        <div class="button-group">
                            <button class="btn btn-success" id="mp-save">保存设置</button>
                            <button class="btn btn-primary" id="mp-test">测试播放</button>
                            <button class="btn btn-info" id="mp-backup">备份设置</button>
                            <button class="btn btn-warning" id="mp-restore">恢复设置</button>
                            <button class="btn btn-secondary" id="mp-reset-btn">重置播放键位置</button>
                            <button class="btn btn-secondary" id="mp-reset-player-pos">重置播放器位置</button>
                        </div>
                    </div>
                    
                    <!-- 在线媒体标签页 -->
                    <div class="tab-content ${config.activeTab === 'media' ? 'active' : ''}" id="tab-media">
                        <!-- URL统计 -->
                        <div class="url-stats">
                            <div class="url-stat-item">
                                <div>总计URL</div>
                                <div class="url-stat-value">${config.mediaUrls.length}</div>
                            </div>
                            <div class="url-stat-item">
                                <div>图片URL</div>
                                <div class="url-stat-value">${imageUrls.length}</div>
                            </div>
                            <div class="url-stat-item">
                                <div>视频URL</div>
                                <div class="url-stat-value">${videoUrls.length}</div>
                            </div>
                            <div class="url-stat-item">
                                <div>其它URL</div>
                                <div class="url-stat-value">${otherUrls.length}</div>
                            </div>
                        </div>
                        
                        <!-- URL上限设置 -->
                        <div class="setting-group">
                            <div class="setting-group-title">URL上限设置</div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>总URL上限: <span class="slider-value" id="max-online-urls-value">${config.maxOnlineUrls}</span></label>
                                </div>
                                <div class="setting-control">
                                    <div class="slider-container">
                                        <input type="range" id="mp-max-online-urls" min="${Math.max(100, config.mediaUrls.length)}" max="15000" step="100" value="${config.maxOnlineUrls}">
                                        <input type="number" id="mp-max-online-urls-input" min="${Math.max(100, config.mediaUrls.length)}" max="15000" step="100" value="${config.maxOnlineUrls}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 搜索功能 -->
                        <div class="search-container">
                            <input type="text" class="search-input" id="url-search-input" placeholder="搜索URL..." value="${urlSearchQuery}">
                        </div>
                        
                        <!-- URL管理 - 新增上次预览功能 -->
                        <div class="url-management">
                            <!-- 修改：URL标签页容器，包含标签页和上次预览按键 -->
                            <div class="url-tabs-container">
                                <div class="url-tabs">
                                    <div class="url-tab active" data-tab="all">全部</div>
                                    <div class="url-tab" data-tab="images">图片</div>
                                    <div class="url-tab" data-tab="videos">视频</div>
                                    <div class="url-tab" data-tab="others">其它</div>
                                </div>
                                <!-- 修改：上次预览按键，右对齐 -->
                                <button class="last-preview-btn" id="last-preview-btn" title="当前标签页没有预览记忆">上次预览</button>
                            </div>
                            
                            <!-- URL列表容器 -->
                            <div class="url-list-container">
                                <ul class="url-list" id="url-list">
                                    <!-- URL列表内容由JavaScript动态生成 -->
                                </ul>
                            </div>
                            
                            <div class="button-group">
                                <button class="btn btn-info" id="mp-validate-urls">检测URL</button>
                                <button class="btn btn-warning" id="mp-clear-invalid">清除失效URL</button>
                                <button class="btn btn-danger" id="mp-clear-displayed">清除列表URL</button>
                                <button class="btn btn-danger" id="mp-clear-all">清除所有URL</button>
                                <button class="btn btn-success" id="mp-export-urls">导出URL</button>
                            </div>
                            
                            <div id="validation-stats" style="margin-top: 10px; font-size: 12px; text-align: center;">
                                点击"检测URL"验证可用性
                            </div>
                        </div>
                        
                        <!-- 批量导入 -->
                        <div class="setting-group" style="margin-top: 20px;">
                            <div class="setting-group-title">批量导入</div>
                            
                            <textarea class="url-textarea" id="mp-import-text" placeholder="粘贴URL列表，每行一个URL，自动去重"></textarea>
                            
                            <div class="button-group">
                                <button class="btn btn-primary" id="mp-import-append">追加导入</button>
                                <button class="btn btn-danger" id="mp-import-replace">覆盖导入</button>
                                <button class="btn btn-info" id="mp-extract-urls">识别URL</button>
                            </div>
                            
                            <!-- 文件导入 -->
                            <div class="file-upload-area" id="file-upload-container">
                                <input type="file" id="mp-file-input" class="file-input" accept=".txt,.csv,.tsv,.json,.xls,.xlsx">
                                <label for="mp-file-input" class="file-upload-label">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                                        <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                                    </svg>
                                    选择文件导入
                                </label>
                                <div class="file-types">支持格式: txt, csv, tsv, json, xls, xlsx</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 本地媒体标签页 -->
                    <div class="tab-content ${config.activeTab === 'local' ? 'active' : ''}" id="tab-local">
                        <!-- 本地媒体统计 -->
                        <div class="local-media-stats">
                            <div class="local-media-stat-item">
                                <div>当前视频数</div>
                                <div class="local-media-stat-value">${config.localVideos.length}</div>
                            </div>
                            <div class="local-media-stat-item">
                                <div>最大视频数</div>
                                <div class="local-media-stat-value">${config.maxLocalVideos}</div>
                            </div>
                            <div class="local-media-stat-item">
                                <div>总大小</div>
                                <div class="local-media-stat-value">${formatFileSize(config.localVideos.reduce((total, video) => total + video.size, 0))}</div>
                            </div>
                        </div>
                        
                        <!-- 最大视频数量设置 - 修改为最大500 -->
                        <div class="setting-group">
                            <div class="setting-group-title">视频数量设置</div>
                            
                            <div class="setting-item">
                                <div class="setting-label">
                                    <label>最大视频数量: <span class="slider-value" id="max-local-videos-value">${config.maxLocalVideos}</span></label>
                                </div>
                                <div class="setting-control">
                                    <div class="slider-container">
                                        <input type="range" id="mp-max-local-videos" min="1" max="500" step="1" value="${config.maxLocalVideos}">
                                        <input type="number" id="mp-max-local-videos-input" min="1" max="500" step="1" value="${config.maxLocalVideos}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 本地视频搜索功能 -->
                        <div class="search-container">
                            <input type="text" class="search-input" id="local-video-search-input" placeholder="搜索本地视频..." value="${localVideoSearchQuery}">
                        </div>
                        
                        <!-- 本地视频管理 -->
                        <div class="local-media-management">
                            <div class="button-group" style="margin-bottom: 15px;">
                                <button class="btn btn-primary" id="mp-add-single-video">添加视频</button>
                                <button class="btn btn-info" id="mp-random-select-videos">随机抽取</button>
                                <button class="btn btn-danger" id="mp-clear-local-videos">清除全部</button>
                            </div>
                            
                            <!-- 本地视频列表 -->
                            <div class="local-video-list-container">
                                <ul class="local-video-list" id="local-video-list">
                                    <!-- 本地视频列表内容由JavaScript动态生成 -->
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 播放权重标签页 -->
                    <div class="tab-content ${config.activeTab === 'weights' ? 'active' : ''}" id="tab-weights">
                        <!-- 权重统计 -->
                        <div class="weight-stats">
                            <div class="weight-stat-item">
                                <div>总域名数</div>
                                <div class="weight-stat-value">${allDomains.length}</div>
                            </div>
                            <div class="weight-stat-item">
                                <div>已设置权重</div>
                                <div class="weight-stat-value">${Object.keys(config.domainWeights).length}</div>
                            </div>
                            <div class="weight-stat-item">
                                <div>权重100</div>
                                <div class="weight-stat-value">${Object.values(config.domainWeights).filter(weight => weight === 100).length}</div>
                            </div>
                            <div class="weight-stat-item">
                                <div>已备注</div>
                                <div class="weight-stat-value">${config.domainNotes ? Object.keys(config.domainNotes).length : 0}</div>
                            </div>
                        </div>
                        
                        <!-- 权重说明 -->
                        <div class="setting-group">
                            <div class="setting-group-title">权重说明</div>
                            <div style="font-size: 12px; line-height: 1.5; padding: 10px; border-radius: 6px;">
                                <ul class="weight-explanation-list">
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">默认权重</div>
                                        <div class="weight-explanation-value">50</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">权重范围</div>
                                        <div class="weight-explanation-value">0-100</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">权重为0</div>
                                        <div class="weight-explanation-value">该域名下所有URL都不播放</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">权重为100</div>
                                        <div class="weight-explanation-value">只播放该域名下的URL</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">随机播放算法</div>
                                        <div class="weight-explanation-value">先按顶级域名权重抽取域名，再从该域名中随机选择URL</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">权重100限制</div>
                                        <div class="weight-explanation-value">只能设置一个域名</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">域名提取</div>
                                        <div class="weight-explanation-value">自动提取顶级域名（如 sss.xxx.com → xxx.com）</div>
                                    </li>
                                    <li class="weight-explanation-item">
                                        <div class="weight-explanation-label">备注功能</div>
                                        <div class="weight-explanation-value">点击域名或备注文字可编辑备注信息</div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <!-- 权重搜索 -->
                        <div class="search-container">
                            <input type="text" class="search-input" id="weight-search-input" placeholder="搜索域名或备注..." value="${weightSearchQuery}">
                        </div>
                        
                        <!-- 权重列表 -->
                        <div class="weight-management">
                            <div class="weight-list-container">
                                <ul class="weight-list" id="weight-list">
                                    <!-- 权重列表内容由JavaScript动态生成 -->
                                </ul>
                            </div>
                            
                            <div class="weight-actions">
                                <button class="btn btn-info" id="mp-refresh-weights">刷新列表</button>
                                <button class="btn btn-warning" id="mp-reset-weights">重置权重</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 状态提示 -->
                    <div id="mp-status"></div>
                </div>
            </div>
        `;
    
        extensionsArea.insertAdjacentHTML('beforeend', html);
        bindSettingsEvents();
        
        // 更新缓存统计
        updateCacheStats();
        
        // 更新权重列表
        updateWeightList();
        
        // 更新本地视频列表
        updateLocalVideoList();
        updateLocalMediaStats();
        
        // 更新URL列表
        updateUrlList();
        updateUrlStats();
        
        // 更新上次预览按钮状态
        updateLastPreviewButton();
        
        console.log('✅ 完整版设置面板创建完成（含本地媒体功能）');
    }

    // 切换设置面板折叠状态
    function toggleSettingsPanel() {
        config.settingsCollapsed = !config.settingsCollapsed;
        saveConfig();
        
        const header = document.querySelector('.media-player-header');
        const content = document.getElementById('settings-content');
        const toggleIcon = header.querySelector('.inline-drawer-icon');
        
        if (header && content && toggleIcon) {
            if (config.settingsCollapsed) {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                toggleIcon.classList.remove('fa-circle-chevron-up', 'up');
                toggleIcon.classList.add('fa-circle-chevron-down');
            } else {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                toggleIcon.classList.remove('fa-circle-chevron-down');
                toggleIcon.classList.add('fa-circle-chevron-up', 'up');
            }
        }
    }

    // 切换标签页
    function switchTab(tabName) {
        config.activeTab = tabName;
        saveConfig();
        
        // 更新标签页导航
        document.querySelectorAll('.tab-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });
        
        // 更新标签页内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
        
        // 更新缓存统计
        updateCacheStats();
        
        // 如果切换到权重标签页，更新权重列表
        if (tabName === 'weights') {
            updateWeightList();
            updateWeightStats();
        }
        
        // 如果切换到本地媒体标签页，更新本地视频列表
        if (tabName === 'local') {
            updateLocalVideoList();
            updateLocalMediaStats();
        }
        
        // 如果切换到在线媒体标签页，更新URL列表
        if (tabName === 'media') {
            updateUrlList();
            updateUrlStats();
            updateLastPreviewButton();
        }
    }

    // URL标签页切换
    function switchUrlTab(tabName) {
        // 更新URL标签页导航
        $('.url-tab').removeClass('active');
        $(`.url-tab[data-tab="${tabName}"]`).addClass('active');
        
        // 设置当前预览标签页
        currentPreviewTab = tabName;
        
        // 更新URL列表显示
        updateUrlList();
        
        // 更新上次预览按钮状态
        updateLastPreviewButton();
    }

    function bindSettingsEvents() {
        // 设置面板折叠/展开
        $('.media-player-header').on('click', function() {
            toggleSettingsPanel();
        });
        
        // 图标点击事件
        $('.inline-drawer-icon').on('click', function(e) {
            e.stopPropagation();
            toggleSettingsPanel();
        });
        
        // 标签页切换
        $('.tab-nav-item').on('click', function() {
            const tab = $(this).data('tab');
            switchTab(tab);
        });
        
        // URL标签页切换
        $('.url-tab').on('click', function() {
            const tab = $(this).data('tab');
            switchUrlTab(tab);
        });
        
        // 修改：上次预览按键事件
        $('#last-preview-btn').on('click', function() {
            lastPreview();
        });
        
        // URL搜索功能
        $('#url-search-input').on('input', function() {
            urlSearchQuery = $(this).val().toLowerCase().trim();
            updateUrlList();
        });
        
        // 本地视频搜索功能（新增）
        $('#local-video-search-input').on('input', function() {
            localVideoSearchQuery = $(this).val().toLowerCase().trim();
            updateLocalVideoList();
        });
        
        // 权重搜索功能
        $('#weight-search-input').on('input', function() {
            weightSearchQuery = $(this).val().toLowerCase().trim();
            updateWeightList();
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
            showStatus('设置已更新', 'success');
        });
        
        // 媒体类型
        $('#mp-media-type').on('change', function() {
            config.mediaType = this.value;
            // 切换媒体类型时清除播放记忆
            clearPlaybackMemory();
            saveConfig();
            showStatus('媒体类型已更新', 'success');
        });
        
        // 播放记忆
        $('#mp-playback-memory').on('change', function() {
            config.playbackMemory = this.checked;
            if (!this.checked) {
                clearPlaybackMemory();
            }
            saveConfig();
            showStatus('播放记忆已' + (this.checked ? '开启' : '关闭'), 'success');
        });
        
        // 播放键大小
        $('#mp-button-size').on('change', function() {
            config.buttonSize = this.value;
            saveConfig();
            
            // 更新播放键尺寸
            const button = document.getElementById('media-control-btn');
            if (button) {
                const buttonSize = getButtonSizePixels();
                button.style.width = buttonSize + 'px';
                button.style.height = buttonSize + 'px';
                button.style.fontSize = (buttonSize * 0.4) + 'px';
                
                // 更新图标尺寸
                const svg = button.querySelector('svg');
                if (svg) {
                    svg.setAttribute('width', buttonSize * 0.5);
                    svg.setAttribute('height', buttonSize * 0.5);
                }
            }
            showStatus('播放键大小已更新', 'success');
        });
        
        // 播放键颜色
        $('.color-btn').on('click', function() {
            const color = $(this).data('color');
            config.buttonColor = color;
            saveConfig();
            
            // 更新按钮激活状态
            $('.color-btn').removeClass('active');
            $(this).addClass('active');
            
            // 更新播放键颜色
            const button = document.getElementById('media-control-btn');
            if (button) {
                const buttonColorStyle = getButtonColorStyle();
                button.style.background = buttonColorStyle;
            }
            
            // 更新进度条颜色
            updateMediaOpacity();
            
            showStatus('播放键颜色已设置为' + (color === 'default' ? '默认' : '随机'), 'success');
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
        
        // 在线URL上限设置
        $('#mp-max-online-urls').on('input', function() {
            const value = parseInt(this.value);
            $('#mp-max-online-urls-input').val(value);
            $('#max-online-urls-value').text(value);
            config.maxOnlineUrls = value;
            
            // 更新滑块最小值
            const minValue = Math.max(100, config.mediaUrls.length);
            $(this).attr('min', minValue);
            $('#mp-max-online-urls-input').attr('min', minValue);
            
            saveConfig();
            showStatus('URL上限已更新', 'success');
        });
        
        $('#mp-max-online-urls-input').on('input', function() {
            let value = parseInt(this.value) || 5000;
            value = Math.max(Math.max(100, config.mediaUrls.length), Math.min(15000, value));
            $('#mp-max-online-urls').val(value);
            $('#max-online-urls-value').text(value);
            config.maxOnlineUrls = value;
            
            // 更新滑块最小值
            const minValue = Math.max(100, config.mediaUrls.length);
            $('#mp-max-online-urls').attr('min', minValue);
            $(this).attr('min', minValue);
            
            saveConfig();
            showStatus('URL上限已更新', 'success');
        });
        
        // 本地视频最大数量设置 - 修改为最大500
        $('#mp-max-local-videos').on('input', function() {
            const value = parseInt(this.value);
            $('#mp-max-local-videos-input').val(value);
            $('#max-local-videos-value').text(value);
            config.maxLocalVideos = value;
            saveConfig();
            updateLocalMediaStats();
            showStatus('本地视频最大数量已更新', 'success');
        });
        
        $('#mp-max-local-videos-input').on('input', function() {
            let value = parseInt(this.value) || 50;
            value = Math.max(1, Math.min(500, value));
            $('#mp-max-local-videos').val(value);
            $('#max-local-videos-value').text(value);
            config.maxLocalVideos = value;
            saveConfig();
            updateLocalMediaStats();
            showStatus('本地视频最大数量已更新', 'success');
        });
        
        // 其他设置
        $('#mp-play-mode').on('change', function() {
            config.playMode = this.value;
            saveConfig();
            showStatus('播放模式已更新', 'success');
        });
        
        $('#mp-muted').on('change', function() {
            config.videoMuted = this.checked;
            saveConfig();
            showStatus('静音设置已更新', 'success');
        });
        
        // 权重管理相关事件
        $('#mp-refresh-weights').on('click', function() {
            updateWeightList();
            updateWeightStats();
            showStatus('权重列表已刷新', 'success');
        });
        
        $('#mp-reset-weights').on('click', function() {
            resetAllWeights();
        });
        
        // 本地媒体相关事件
        $('#mp-add-single-video').on('click', function() {
            addSingleVideo();
        });
        
        $('#mp-random-select-videos').on('click', async function() {
            const button = $(this);
            button.prop('disabled', true).text('扫描中...');
            
            try {
                const selectedVideos = await randomSelectVideosFromFolder();
                if (selectedVideos.length > 0) {
                    // 检查是否超过最大数量
                    const availableSlots = config.maxLocalVideos - config.localVideos.length;
                    if (availableSlots <= 0) {
                        showStatus(`本地视频数量已达上限 (${config.maxLocalVideos}个)`, 'error');
                        return;
                    }
                    
                    // 智能筛选：如果选择的视频超过可用位置，随机抽取
                    let videosToAdd = selectedVideos;
                    if (selectedVideos.length > availableSlots) {
                        videosToAdd = [...selectedVideos]
                            .sort(() => Math.random() - 0.5)
                            .slice(0, availableSlots);
                        showStatus(`视频数量超过限制，已随机抽取 ${availableSlots} 个视频`, 'warning');
                    }
                    
                    // 添加视频（去重）
                    let addedCount = 0;
                    videosToAdd.forEach(video => {
                        const existingVideo = config.localVideos.find(v => 
                            v.name === video.name && v.size === video.size
                        );
                        
                        if (!existingVideo) {
                            config.localVideos.push(video);
                            addedCount++;
                        }
                    });
                    
                    if (addedCount > 0) {
                        saveConfig();
                        saveLocalVideosToDB();
                        updateLocalVideoList();
                        updateLocalMediaStats();
                        updateCacheStats();
                        showStatus(`✅ 已添加 ${addedCount} 个本地视频`, 'success');
                    } else {
                        showStatus('没有新的视频可添加', 'info');
                    }
                }
            } catch (error) {
                showStatus('选择视频失败: ' + error.message, 'error');
            } finally {
                button.prop('disabled', false).text('随机抽取');
            }
        });
        
        $('#mp-clear-local-videos').on('click', function() {
            clearAllLocalVideos();
        });
        
        // 检测URL
        $('#mp-validate-urls').on('click', async function() {
            const button = $(this);
            button.prop('disabled', true).text('检测中...');
            
            try {
                const stats = await validateDisplayedUrls();
                
                if (stats) {
                    const statsEl = $('#validation-stats');
                    
                    let statsHtml = `
                            <div style="margin-bottom: 5px;">检测完成 (当前列表: ${stats.displayedCount}个URL):</div>
                            <div>图片: <span style="font-weight: bold;">${stats.images.valid}正常</span> / <span style="font-weight: bold;">${stats.images.invalid}失效</span></div>
                            <div>视频: <span style="font-weight: bold;">${stats.videos.valid}正常</span> / <span style="font-weight: bold;">${stats.videos.invalid}失效</span></div>
                            <div>其它: <span style="font-weight: bold;">${stats.others.valid}正常</span> / <span style="font-weight: bold;">${stats.others.invalid}失效</span></div>
                            <div style="margin-top: 5px;">总计: <span style="font-weight: bold;">${stats.total.valid}正常</span> / <span style="font-weight: bold;">${stats.total.invalid}失效</span></div>
                        `;
                    
                    statsEl.html(statsHtml);
                    showStatus('✅ 当前列表URL检测完成', 'success');
                }
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
                // 更新URL列表
                updateUrlList();
                updateUrlStats();
                updateWeightStats();
                updateWeightList();
                showStatus(`✅ 已清除 ${removedCount} 个失效URL`, 'success');
            } else {
                showStatus('没有发现失效的URL', 'info');
            }
        });
        
        // 清除列表URL
        $('#mp-clear-displayed').on('click', function() {
            const removedCount = clearDisplayedUrls();
            if (removedCount > 0) {
                updateUrlList();
                updateUrlStats();
                updateWeightStats();
                updateWeightList();
                showStatus(`✅ 已清除 ${removedCount} 个URL`, 'success');
            }
        });
        
        // 清除所有URL
        $('#mp-clear-all').on('click', function() {
            if (!confirm('确定要清除所有URL吗？此操作不可撤销。')) {
                return;
            }
            
            if (clearAllUrls()) {
                // 清空URL列表
                updateUrlList();
                updateUrlStats();
                updateWeightStats();
                updateWeightList();
                showStatus('✅ 已清除所有URL', 'success');
            }
        });
        
        // 导出URL
        $('#mp-export-urls').on('click', function() {
            exportUrls();
            showStatus('✅ URL列表已导出', 'success');
        });
        
        // 识别URL按钮
        $('#mp-extract-urls').on('click', function() {
            const importText = $('#mp-import-text').val().trim();
            if (!importText) {
                showStatus('请先粘贴包含URL的文本', 'error');
                return;
            }
            
            const extractedUrls = extractUrlsFromText(importText);
            if (extractedUrls.length === 0) {
                showStatus('未识别到有效的URL', 'error');
                return;
            }
            
            // 将识别出的URL填充到导入文本框，每行一个，只保留URL
            $('#mp-import-text').val(extractedUrls.join('\n'));
            showStatus(`✅ 已识别出 ${extractedUrls.length} 个URL`, 'success');
        });
        
        // 文件导入功能
        $('#mp-file-input').on('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['txt', 'csv', 'tsv', 'json', 'xls', 'xlsx'];
            
            if (!allowedExtensions.includes(fileExtension)) {
                showStatus('不支持的文件格式', 'error');
                return;
            }
            
            const button = $(this).siblings('.file-upload-label');
            button.text('读取中...');
            
            extractUrlsFromFile(file)
            .then(urls => {
                if (urls.length === 0) {
                    showStatus('文件中未找到URL', 'error');
                } else {
                    // 将识别出的URL填充到导入文本框，每行一个
                    $('#mp-import-text').val(urls.join('\n'));
                    showStatus(`✅ 从文件中识别出 ${urls.length} 个URL`, 'success');
                }
                button.text('选择文件导入');
                // 清空文件输入框，允许重复选择同一文件
                $(this).val('');
            })
            .catch(error => {
                showStatus(`❌ 文件导入失败: ${error.message}`, 'error');
                button.text('选择文件导入');
                $(this).val('');
            });
        });
        
        // 文件拖放功能
        const fileUploadContainer = document.getElementById('file-upload-container');
        if (fileUploadContainer) {
            fileUploadContainer.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
            });
            
            fileUploadContainer.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });
            
            fileUploadContainer.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    $('#mp-file-input')[0].files = files;
                    $('#mp-file-input').trigger('change');
                }
            });
        }
        
        // 输入框导入URL
        $('#mp-import-append').on('click', function() {
            const importText = $('#mp-import-text').val().trim();
            if (!importText) {
                showStatus('请输入要导入的URL', 'error');
                return;
            }
            
            const importedCount = importFromText(importText, 'append');
            
            // 更新URL列表
            updateUrlList();
            updateUrlStats();
            updateWeightStats();
            updateWeightList();
            $('#mp-import-text').val(''); // 清空输入框
            showStatus(`✅ 已追加导入 ${importedCount} 个URL（自动去重）`, 'success');
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
            
            const importedCount = importFromText(importText, 'replace');
            
            // 更新URL列表
            updateUrlList();
            updateUrlStats();
            updateWeightStats();
            updateWeightList();
            $('#mp-import-text').val(''); // 清空输入框
            showStatus(`✅ 已覆盖导入 ${importedCount} 个URL（自动去重）`, 'success');
        });
        
        // 备份设置
        $('#mp-backup').on('click', function() {
            backupSettings();
        });
        
        // 恢复设置
        $('#mp-restore').on('click', function() {
            restoreSettings();
        });
        
        // 重置播放器位置
        $('#mp-reset-player-pos').on('click', function() {
            localStorage.removeItem('media_player_position');
            // 只重新创建播放器，不重新创建播放键
            const existingPlayer = document.getElementById('minimal-player');
            if (existingPlayer) existingPlayer.remove();
            
            const isMobile = isMobileDevice();
            const playerStyle = `width: ${config.playerWidth}px; position: fixed; left: 10px; top: 10px;`;
            
            const playerHTML = `
                    <div id="minimal-player" style="${playerStyle}">
                        <div id="player-content">
                            <img id="player-img">
                            <video id="player-video" playsinline webkit-playsinline preload="auto"></video>
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
                                ${!isMobileDevice() ? `
                                <button class="fullscreen-btn" id="fullscreen-btn" title="全屏">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                    </svg>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            
            document.body.insertAdjacentHTML('beforeend', playerHTML);
            bindPlayerEvents();
            updateMediaOpacity();
            
            if (isMobile) {
                const player = document.getElementById('minimal-player');
                if (player) {
                    player.style.touchAction = 'none';
                }
            }
            
            showStatus('✅ 播放器位置已恢复默认位置', 'success');
        });
        
        // 重置播放键位置 - 修复：实时生效，不需要刷新浏览器
        $('#mp-reset-btn').on('click', function() {
            localStorage.removeItem('media_button_position');
            
            // 实时更新播放键位置，不需要重新创建
            const button = document.getElementById('media-control-btn');
            if (button) {
                button.style.left = '50px';
                button.style.top = '50px';
                
                // 立即保存新位置
                localStorage.setItem('media_button_position', JSON.stringify({
                    x: 50,
                    y: 50
                }));
                
                showStatus('✅ 播放键位置已实时恢复默认位置', 'success');
            } else {
                showStatus('❌ 播放键未找到', 'error');
            }
        });
        
        $('#mp-save').on('click', function() {
            saveConfig();
            showStatus('✅ 所有设置已保存', 'success');
        });
        
        $('#mp-test').on('click', function() {
            if (!isPlayerVisible) togglePlayer();
            showStatus('🎵 播放器测试中...', 'success');
        });
    }

    // 更新URL统计信息
    function updateUrlStats() {
        const imageUrls = config.mediaUrls.filter(url => isImageUrl(url));
        const videoUrls = config.mediaUrls.filter(url => isVideoUrl(url));
        const otherUrls = config.mediaUrls.filter(url => isOtherUrl(url));
        
        $('.url-stat-value').eq(0).text(config.mediaUrls.length);
        $('.url-stat-value').eq(1).text(imageUrls.length);
        $('.url-stat-value').eq(2).text(videoUrls.length);
        $('.url-stat-value').eq(3).text(otherUrls.length);
    }

    function showStatus(message, type = 'success') {
        const statusEl = document.getElementById('mp-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message status-${type}`;
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = '';
            }, 3000);
        }
    }

    // 初始化 - 浏览器重新打开时自动清除本地视频列表
    async function initialize() {
        console.log('🔧 初始化完整版媒体播放器（含本地媒体功能）...');
        
        // 首先加载CSS
        loadCSS();
        
        // 加载配置
        loadConfig();
        
        // 加载预览记忆
        loadPreviewMemory();
        
        // 浏览器重新打开时自动清除本地视频列表
        console.log('🔄 浏览器重新打开，自动清除本地视频列表');
        config.localVideos = [];
        saveConfig();
        
        // 初始化 IndexedDB
        try {
            await initIndexedDB();
            // 从 IndexedDB 加载本地视频数据（但会被上面的清空覆盖）
            const savedLocalVideos = await loadLocalVideosFromDB();
            if (savedLocalVideos.length > 0) {
                console.log(`📥 从 IndexedDB 加载 ${savedLocalVideos.length} 个本地视频，但浏览器重新打开已自动清除`);
            }
        } catch (error) {
            console.warn('❌ IndexedDB 初始化失败，使用内存存储:', error.message);
        }
        
        // 创建播放器和设置面板
        createPlayer();
        createSettingsPanel();
        
        // 窗口大小变化时重新定位
        window.addEventListener('resize', function() {
            console.log('🔄 窗口大小变化，重新创建播放器');
            createPlayer();
        });
        
        // 定期更新缓存统计
        setInterval(updateCacheStats, 5000);
        
        console.log('✅ 完整版媒体播放器初始化完成');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();