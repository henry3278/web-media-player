// 确保在插件加载时注册设置面板
if (typeof extensions !== 'undefined') {
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
    extensions.registerSettings('webMediaPlayer', {
        name: 'Web Media Player',
        icon: '🎬',
        settings: {
            onSettingsLoad: () => {
                const settings = loadSettings();
                return `
                    <div class="web-media-settings">
                        <h3>媒体播放设置</h3>
                        
                        <label>最大宽度：</label>
                        <input type="text" id="webMediaMaxWidth" value="${settings.maxWidth}" placeholder="例如: 100% 或 500px">
                        
                        <label>最大高度：</label>
                        <input type="text" id="webMediaMaxHeight" value="${settings.maxHeight}" placeholder="例如: 400px">
                        
                        <label>
                            <input type="checkbox" id="webMediaAutoPlay" ${settings.autoPlayVideos ? 'checked' : ''}>
                            自动播放视频
                        </label>
                        
                        <label>允许的域名 (逗号分隔)：</label>
                        <textarea id="webMediaAllowedDomains" rows="3">${settings.allowedDomains}</textarea>
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
                toastr.success('设置已保存');
            }
        }
    });

    // 应用样式设置
    function applyMediaSettings() {
        const settings = loadSettings();
        const style = document.createElement('style');
        style.id = 'web-media-dynamic-styles';
        style.textContent = `
            .web-media-container {
                max-width: ${settings.maxWidth};
                max-height: ${settings.maxHeight};
                margin: 10px 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .web-media-container video {
                ${settings.autoPlayVideos ? 'autoplay muted playsinline' : ''}
            }
        `;
        
        // 移除旧样式并添加新样式
        const oldStyle = document.getElementById('web-media-dynamic-styles');
        if (oldStyle) oldStyle.remove();
        document.head.appendChild(style);
    }

    // 初始化应用设置
    applyMediaSettings();
} else {
    console.error('无法注册设置面板: extensions API 不可用');
}
