// 文件名: index.js - 事件监听版
(function() {
    console.log('📸 事件监听图片插件加载...');
    
    let enabled = true;
    let imageUrls = [
        'https://picsum.photos/300/200',
        'https://picsum.photos/300/201',
        'https://picsum.photos/300/202'
    ];
    
    // 创建设置
    const panel = `
        <div class="list-group-item">
            <h5>📸 事件监听图片插件</h5>
            <label><input type="checkbox" id="event-enabled" checked> 启用</label>
            <button class="btn btn-sm btn-primary ml-2" id="event-test">测试插入</button>
            <div id="event-status" style="margin-top: 5px; font-size: 12px;"></div>
        </div>
    `;
    
    $('#extensions_settings').append(panel);
    
    $('#event-enabled').on('change', function() {
        enabled = this.checked;
    });
    
    $('#event-test').on('click', function() {
        // 查找最新的AI消息
        const aiMessages = $('.mes').not('.mes_user').last();
        if (aiMessages.length > 0) {
            const msgId = aiMessages.attr('id').replace('mes_', '');
            insertImage(msgId);
        } else {
            $('#event-status').text('❌ 找不到AI消息');
        }
    });
    
    function insertImage(messageId) {
        if (!enabled || imageUrls.length === 0) return;
        
        const randomUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];
        const img = `<img src="${randomUrl}" style="max-width: 300px; max-height: 200px; margin-top: 10px; border-radius: 5px;">`;
        
        $(`#mes_${messageId} .mes_text`).append(img);
        $('#event-status').text('✅ 图片插入成功');
    }
    
    // 监听AI回复
    if (window.SillyTavern && SillyTavern.events) {
        SillyTavern.events.on('message-created', function(event, data) {
            if (enabled && !data.is_user) {
                setTimeout(() => insertImage(data.id), 300);
            }
        });
    }
    
    console.log('✅ 事件监听插件加载完成');
})();
