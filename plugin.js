export default {
    name: 'Web Media Player',
    author: 'YourName',
    version: '1.0.0',
    description: '从网络加载图片/视频并在聊天中展示',
    
    // 加载依赖文件
    async load() {
        // 加载CSS
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = 'plugins/third-party/st_web_media_player/style.css';
        document.head.appendChild(style);
        
        // 加载JS文件 - 确保settings.js在script.js之前加载
        await this.loadScript('settings.js');
        await this.loadScript('script.js');
        
        console.log('Web Media Player 插件已加载');
    },
    
    // 卸载清理
    unload() {
        // 移除CSS
        const style = document.querySelector('link[href="plugins/third-party/st_web_media_player/style.css"]');
        if (style) style.remove();
        
        // 移除动态样式
        const dynamicStyle = document.getElementById('web-media-dynamic-styles');
        if (dynamicStyle) dynamicStyle.remove();
        
        console.log('Web Media Player 插件已卸载');
    },
    
    // 辅助函数：加载JS文件
    loadScript(src) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = `plugins/third-party/st_web_media_player/${src}`;
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
};
