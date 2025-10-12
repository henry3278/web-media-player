import './settings.js';
import './script.js';

export default {
    name: 'Web Media Player',
    author: 'YourName',
    version: '1.0.0',
    description: '从网络加载图片/视频并在聊天中展示',
    
    styles: ['style.css'],
    
    load() {
        console.log('Web Media Player 插件已加载');
    },
    
    unload() {
        console.log('Web Media Player 插件已卸载');
    }
};
