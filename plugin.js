export default {
    name: 'Web Media Player',
    author: 'YourName',
    version: '1.0.0',
    description: '从网络加载图片/视频并在聊天中展示',
    
    // 加载依赖文件
    load() {
        this.loadCSS('style.css');
        this.loadScript('settings.js');
        this.loadScript('script.js');
        console.log('Web Media Player 插件已加载');
    },
    
    // 卸载清理
    unload() {
        this.removeCSS();
        console.log('Web Media Player 插件已卸载');
    }
};
