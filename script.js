// 媒体解析器
function parseMediaContent(message) {
    const mediaRegex = /\[(image|video):(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|mp4|webm|mov))\]/gi;
    return message.replace(mediaRegex, (match, type, url) => {
        return type === 'image' 
            ? `<div class="web-media-container"><img src="${url}" alt="网络图片"></div>`
            : `<div class="web-media-container"><video controls><source src="${url}" type="video/mp4"></video></div>`;
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
            const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url);
            const isVideo = /\.(mp4|webm|mov)$/i.test(url);
            
            if (isImage) {
                context.setMessageText(`${context.getMessageText()}[image:${url}]`);
            } else if (isVideo) {
                context.setMessageText(`${context.getMessageText()}[video:${url}]`);
            } else {
                toastr.error('不支持的媒体格式');
            }
        }
    }
});
