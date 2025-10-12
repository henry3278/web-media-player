// 默认配置
const defaultSettings = {
    maxWidth: '100%',
    maxHeight: '400px',
    autoPlayVideos: false,
    allowedDomains: 'i.imgur.com,example.com'
};

// 加载配置
function loadSettings() {
    return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem('webMediaPlayerSettings') || '{}')
    };
}

// 注册设置面板
export function initSettings() {
    console.log('[Web Media Player] 正在注册设置面板');
    
    // 确保在扩展API加载完成后注册
    const register = () => {
        try {
            extensions.registerSettings('webMediaPlayer', {
                name: 'Web Media Player',
                icon: '🎬',
                settings: {
                    onSettingsLoad: () => {
                        console.log('[Web Media Player] 设置面板被打开');
                        const settings = loadSettings();
                        
                        return `
                            <div class="web-media-settings">
                                <h3>媒体播放设置</h3>
                                
                                <div class="input-group">
                                    <label>最大宽度：</label>
                                    <input type="text" id="webMediaMaxWidth" value="${settings.maxWidth}" placeholder="例如: 100% 或 500px">
                                </div>
                                
                                <div class="input-group">
                                    <label>最大高度：</label>
                                    <input type="text" id="webMediaMaxHeight" value="${settings.maxHeight}" placeholder="例如: 400px">
                                </div>
                                
                                <div class="checkbox-group">
                                    <label>
                                        <input type="checkbox" id="webMediaAutoPlay" ${settings.autoPlayVideos ? 'checked' : ''}>
                                        自动播放视频
                                    </label>
                                </div>
                                
                                <div class="input-group">
                                    <label>允许的域名 (逗号分隔)：</label>
                                    <textarea id="webMediaAllowedDomains" rows="3">${settings.allowedDomains}</textarea>
                                </div>
                                
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
                            </div>
                        `;
                    },
                    onSettingsSave: () => {
                        const settings = {
                            maxWidth: document.getElementById('webMediaMaxWidth').value,
                            maxHeight: document.getElementById('webMediaMaxHeight').value,
                            autoPlayVideos: document.getElementById('webMediaAutoPlay').checked,
                            allowedDomains: document.getElementById('webMediaAllowedDomains').value
                        };
                        
                        localStorage.setItem('webMediaPlayerSettings', JSON.stringify(settings));
                        applyMediaSettings();
                        
                        // 显示保存成功的通知
                        if (typeof toastr !== 'undefined') {
                            toastr.success('设置已保存');
                        } else {
                            alert('设置已保存');
                        }
                        
                        console.log('[Web Media Player] 设置已保存', settings);
                    }
                }
            });
            
            console.log('[Web Media Player] 设置面板注册成功');
            applyMediaSettings();
        } catch (e) {
            console.error('[Web Media Player] 设置面板注册失败:', e);
        }
    };
    
    // 检查扩展API是否已加载
    if (typeof extensions !== 'undefined') {
        register();
    } else {
        // 等待扩展API加载完成
        window.addEventListener('extensionsLoaded', register);
    }
}

// 应用样式设置
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
    
    // 移除旧样式并添加新样式
    const oldStyle = document.getElementById('web-media-dynamic-styles');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);
}

// 导出loadSettings函数供其他模块使用
export { loadSettings };
