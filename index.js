export default {
    name: 'Web Media Player',
    author: 'Henry',
    version: '1.0.0',
    description: '从网络加载图片/视频并在聊天中展示',
    
    styles: ['style.css'],
    
    async load() {
        console.log('[Web Media Player] 插件开始加载');
        
        // 动态加载设置模块
        try {
            const { initSettings } = await import('./settings.js');
            initSettings();
            console.log('[Web Media Player] 设置模块已加载');
        } catch (e) {
            console.error('[Web Media Player] 设置模块加载失败:', e);
        }
        
        // 动态加载核心功能
        try {
            const { initScript } = await import('./script.js');
            initScript();
            console.log('[Web Media Player] 核心功能已加载');
        } catch (e) {
            console.error('[Web Media Player] 核心功能加载失败:', e);
        }
        
        console.log('[Web Media Player] 插件加载完成');
    },
    
    unload() {
        console.log('[Web Media Player] 插件已卸载');
        
        // 清理动态创建的元素
        const dynamicStyle = document.getElementById('web-media-dynamic-styles');
        if (dynamicStyle) dynamicStyle.remove();
    }
};
