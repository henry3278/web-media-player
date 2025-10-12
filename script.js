// 导出初始化函数
export function initScript() {
    console.log('[Web Media Player] 正在初始化核心功能');
    
    // 确保extensions API可用
    if (typeof extensions === 'undefined') {
        console.error('[Web Media Player] extensions API 不可用');
        return;
    }
    
    // 加载设置
    const settings = loadSettings();
    
    // 媒体解析器
    function parseMediaContent(message) {
        const mediaRegex = /\[(image|video):(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|mp4|webm|mov))\]/gi;
        return message.replace(mediaRegex, (match, type, url) => {
            // 检查域名是否允许
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
        });
    }

    // 消息处理钩子
    extensions.register('messageModifier', {
        id: 'webMediaPlayer.modifier',
        priority: 10,
        modify: (message) => {
            if (message.content) {
                message.content = parseMediaContent(message.content);
            }
            return message;
        }
    });

    // 发送媒体指令
    extensions.registerButton('webMedia', {
        name: '插入媒体',
        icon: '🖼️',
        onClick: async (context) => {
            const url = prompt('请输入媒体URL (支持JPG/PNG/GIF/MP4):', 'https://');
            if (url) {
                try {
                    new URL(url); // 验证URL格式
                    
                    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url);
                    const isVideo = /\.(mp4|webm|mov)$/i.test(url);
                    
                    if (isImage || isVideo) {
                        context.setMessageText(`${context.getMessageText()}[${isImage ? 'image' : 'video'}:${url}]`);
                    } else {
                        if (typeof toastr !== 'undefined') {
                            toastr.error('不支持的媒体格式');
                        } else {
                            alert('不支持的媒体格式');
                        }
                    }
                } catch (e) {
                    if (typeof toastr !== 'undefined') {
                        toastr.error('无效的URL格式');
                    } else {
                        alert('无效的URL格式');
                    }
                }
            }
        }
    });
    
    console.log('[Web Media Player] 核心功能初始化完成');
}

// 从settings.js导入loadSettings函数
import { loadSettings } from './settings.js';
