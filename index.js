// 文件名: index.js - 基础测试版
(function() {
    console.log('🎯 媒体播放器插件开始加载...');
    
    // 插件基本信息
    const PLUGIN_NAME = 'media-player';
    const PLUGIN_VERSION = '1.0.0';
    
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
    
    // 创建最简单的设置面板
    function createBasicSettingsPanel() {
        console.log('🛠️ 尝试创建设置面板...');
        
        // 确保扩展设置区域存在
        let extensionsArea = document.getElementById('extensions_settings');
        if (!extensionsArea) {
            console.error('❌ 找不到扩展设置区域 (#extensions_settings)');
            
            // 尝试创建扩展设置区域（备用方案）
            extensionsArea = document.createElement('div');
            extensionsArea.id = 'extensions_settings';
            const settingsPanel = document.querySelector('.settings-content');
            if (settingsPanel) {
                settingsPanel.appendChild(extensionsArea);
                console.log('✅ 已创建扩展设置区域');
            } else {
                console.error('❌ 找不到设置面板容器');
                return;
            }
        }
        
        // 创建插件设置项
        const pluginHtml = `
            <div class="list-group-item" id="media-player-settings">
                <h5>🎨 媒体播放器 v${PLUGIN_VERSION}</h5>
                <p style="color: green; font-weight: bold;">✅ 插件加载成功！</p>
                <div class="form-group">
                    <label>测试开关: <input type="checkbox" id="mp-test-switch" checked></label>
                </div>
                <button class="btn btn-sm btn-primary" id="mp-test-btn">测试按钮</button>
                <div id="mp-status" style="margin-top: 10px;"></div>
            </div>
        `;
        
        extensionsArea.innerHTML += pluginHtml;
        console.log('✅ 设置面板创建完成');
        
        // 绑定测试事件
        document.getElementById('mp-test-btn').addEventListener('click', function() {
            document.getElementById('mp-status').innerHTML = 
                '<span style="color: blue;">🎉 测试成功！插件工作正常</span>';
        });
    }
    
    // 主初始化函数
    async function initializePlugin() {
        console.log('🔧 初始化媒体播放器插件...');
        
        try {
            // 等待SillyTavern环境
            await waitForSillyTavern();
            console.log('✅ SillyTavern环境就绪');
            
            // 创建设置面板
            createBasicSettingsPanel();
            
            // 注册消息事件监听（简化版）
            if (SillyTavern && SillyTavern.events) {
                SillyTavern.events.on('message-rendered', function(event, data) {
                    console.log('📨 收到消息渲染事件:', data);
                });
                console.log('✅ 事件监听器注册成功');
            }
            
            console.log('🎊 媒体播放器插件初始化完成！');
            
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
