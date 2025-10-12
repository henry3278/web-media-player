// ========== 插件初始化 ==========
console.log('[Web Media Player] 插件开始加载');

// 加载样式
const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = 'plugins/third-party/st_web_media_player/style.css';
document.head.appendChild(styleLink);

// ========== 配置管理 ==========
const defaultSettings = {
    maxWidth: '100%',
    maxHeight: '400px',
    autoPlayVideos: false,
    allowedDomains: 'i.imgur.com,example.com'
};

function loadSettings() {
    return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem('webMediaPlayerSettings') || '{}')
    };
}

function saveSettings(settings) {
    localStorage.setItem('webMediaPlayerSettings', JSON.stringify(settings));
    applyMediaSettings();
}

// ========== 设置面板注册 ==========
window.addEventListener('plugin_settings', function(e) {
    if (e.detail.name === 'st_web_media_player') {
        const settings = loadSettings();
        
        e.detail.addHeading('媒体播放设置');
        
        e.detail.addTextInput(
            '最大宽度',
            'webMediaMaxWidth',
            settings.maxWidth,
            '例如: 100% 或 500px'
        );
        
        e.detail.addTextInput(
            '最大高度',
            'webMediaMaxHeight',
            settings.maxHeight,
            '例如: 400px'
        );
        
        e.detail.addCheckbox(
            '自动播放视频',
            'webMediaAutoPlay',
            settings.autoPlayVideos
        );
        
        e.detail.addTextarea(
            '允许的域名 (逗号分隔)',
            'webMediaAllowedDomains',
            settings.allowedDomains,
            3
        );
        
        e.detail.addButton('保存设置', () => {
            const newSettings = {
                maxWidth: document.getElementById('webMediaMaxWidth').value,
                maxHeight: document.getElementById('webMediaMaxHeight').value,
                autoPlayVideos: document.getElementById('webMediaAutoPlay').checked,
                allowedDomains: document.getElementById('webMediaAllowedDomains').value
            };
            
            saveSettings(newSettings);
            toastr.success('设置已保存');
        });
        
        // 添加预览区域
        e.detail.addHTML(`
            <div class="media-preview">
                <h4>预览效果</h4>
                <div class="preview-container">
                    <div class="web-media-container" data-type="image">
                        <img src="https://via.placeholder.com/300x200?text=图片预览" alt="预览">
                    </div>
                </div>
                <div class="preview-container">
                    <div class="web-media-container" data-type="video">
                        <video controls muted playsinline>
                            <source src="https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4" type="video/mp4">
                        </video>
                    </div>
                </div>
            </div>
        `);
    }
});

// ========== 应用样式设置 ==========
function applyMediaSettings() {
    const settings = loadSettings();
    const style = document.createElement('style');
    style.id = 'web-media-dynamic-styles';
    style.textContent = `
        .web-media-container {
            max-width: ${settings.maxWidth};
            max-height: ${settings.maxHeight};
        }
        
        .web-media-container video {
            ${settings.autoPlayVideos ? 'autoplay: true; muted: true; playsinline: true;' : ''}
        }
    `;
    
    const oldStyle = document.getElementById('web-media-dynamic-styles');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);
}

// 初始应用设置
applyMediaSettings();

// ========== 核心功能 ==========
function parseMediaContent(message) {
    const mediaRegex = /\[(image|video):(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|mp4|webm|mov))\]/gi;
    return message.replace(mediaRegex, (match, type, url) => {
        try {
            // 检查域名是否允许
            const settings = loadSettings();
            const allowedDomains = settings.allowedDomains.split(',').map(d => d.trim());
            const domain = new URL(url).hostname;
            
            if (!allowedDomains.some(d => domain.endsWith(d))) {
                return `<div class="web-media-container blocked" data-type="blocked">
                    <span>⚠️ 不允许的媒体来源: ${domain}</span>
                </div>`;
            }
            
            return type === 'image' 
                ? `<div class="web-media-container" data-type="image"><img src="${url}" alt="网络图片"></div>`
                : `<div class="web-media-container" data-type="video"><video controls ${settings.autoPlayVideos ? 'autoplay muted playsinline' : ''}><source src="${url}" type="video/mp4"></video></div>`;
        } catch (e) {
            return `<div class="web-media-container error" data-type="error">
                <span>❌ 无效的媒体URL</span>
            </div>`;
        }
    });
}

// 消息处理钩子
window.addEventListener('modify_message', function(e) {
    if (e.detail.content) {
        e.detail.content = parseMediaContent(e.detail.content);
    }
});

// 注册工具栏按钮
window.addEventListener('toolbar_interaction', function(e) {
    if (e.detail === 'add_media') {
        const url = prompt('请输入媒体URL (支持JPG/PNG/GIF/MP4):', 'https://');
        if (url) {
            try {
                new URL(url);
                
                const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url);
                const isVideo = /\.(mp4|webm|mov)$/i.test(url);
                
                if (isImage || isVideo) {
                    const textarea = document.getElementById('send_textarea');
                    if (textarea) {
                        textarea.value += `[${isImage ? 'image' : 'video'}:${url}]`;
                    }
                } else {
                    toastr.error('不支持的媒体格式');
                }
            } catch (e) {
                toastr.error('无效的URL格式');
            }
        }
    }
});

// 添加工具栏按钮
window.addEventListener('plugin_loaded', function() {
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
        const btn = document.createElement('button');
        btn.className = 'button';
        btn.innerHTML = '🖼️ 插入媒体';
        btn.dataset.interaction = 'add_media';
        btn.style.marginLeft = '10px';
        toolbar.appendChild(btn);
    }
});

console.log('[Web Media Player] 插件加载完成');
