// 确保插件加载时扩展API可用
export default {
    name: 'Web Media Player',
    author: 'YourName',
    version: '1.0.0',
    description: '从网络加载图片/视频并在聊天中展示',
    
    // 显式声明依赖文件
    scripts: ['settings.js', 'script.js'],
    styles: ['style.css'],
    
    async load() {
        console.groupCollapsed('[Web Media Player] 插件加载信息');
        console.log('插件名称:', this.name);
        console.log('插件版本:', this.version);
        console.log('SillyTavern版本:', window.sillytavern?.version || '未知');
        console.log('扩展API状态:', typeof extensions !== 'undefined' ? '可用' : '不可用');
        console.groupEnd();
        console.log('[Web Media Player] 插件开始加载');
        
        // 手动加载设置模块
        try {
            const { initSettings } = await import('./settings.js');
            initSettings();
            console.log('[Web Media Player] 设置模块已加载');
        } catch (e) {
            console.error('[Web Media Player] 设置模块加载失败:', e);
        }
        
        // 手动加载核心功能
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
