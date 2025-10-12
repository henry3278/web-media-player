// 文件名: index.js - 最简工作版
(function() {
    console.log('🖼️ 简单图片插件加载...');
    
    // 配置
    let config = {
        enabled: true,
        autoInsert: true,
        imageUrls: [
            'https://picsum.photos/300/200?1',
            'https://picsum.photos/300/200?2', 
            'https://picsum.photos/300/200?3'
        ]
    };
    
    // 创建设置面板
    function createPanel() {
        const html = `
            <div class="list-group-item">
                <h5>🖼️ 简单图片插件</h5>
                <div class="form-group">
                    <label><input type="checkbox" id="simple-enabled" checked> 启用插件</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="simple-auto" checked> AI回复自动插入图片</label>
                </div>
                <div class="form-group">
                    <label>图片URL列表:</label>
                    <textarea class="form-control" id="simple-urls" rows="3" style="font-size: 12px;">${config.imageUrls.join('\n')}</textarea>
                </div>
                <button class="btn btn-sm btn-primary" id="simple-test">测试插入</button>
                <div id="simple-status" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
        `;
        
        $('#extensions_settings').append(html);
        
        // 绑定事件
        $('#simple-enabled').on('change', function() {
            config.enabled = this.checked;
        });
        
        $('#simple-auto').on('change', function() {
            config.autoInsert = this.checked;
        });
        
        $('#simple-urls').on('input', function() {
            config.imageUrls = this.value.split('\n').filter(url => url.trim());
        });
        
        $('#simple-test').on('click', testInsert);
    }
    
    // 显示状态
    function showStatus(msg) {
        $('#simple-status').text(msg);
    }
    
    // 获取随机图片
    function getRandomImage() {
        if (config.imageUrls.length === 0) return null;
        return config.imageUrls[Math.floor(Math.random() * config.imageUrls.length)];
    }
    
    // 插入图片到消息
    function insertImageToMessage(messageId) {
        const imgUrl = getRandomImage();
        if (!imgUrl) {
            showStatus('❌ 没有图片URL');
            return false;
        }
        
        // 直接查找消息元素
        const messageEl = document.getElementById(`mes_${messageId}`);
        if (!messageEl) {
            showStatus('❌ 找不到消息');
            return false;
        }
        
        // 查找消息文本区域
        const textEl = messageEl.querySelector('.mes_text');
        if (!textEl) {
            showStatus('❌ 找不到消息文本');
            return false;
        }
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '5px';
        img.style.marginTop = '10px';
        img.style.display = 'block';
        
        // 直接插入到消息文本后面
        textEl.appendChild(img);
        
        showStatus('✅ 图片插入成功');
        return true;
    }
    
    // 测试插入
    function testInsert() {
        // 查找最新的AI消息
        const messages = document.querySelectorAll('.mes');
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            // 找到不是用户的消息（AI消息）
            if (!msg.querySelector('.mes_user')) {
                const msgId = msg.id.replace('mes_', '');
                insertImageToMessage(msgId);
                return;
            }
        }
        showStatus('❌ 找不到AI消息');
    }
    
    // AI回复时自动插入
    function onAIMessage(data) {
        if (!config.enabled || !config.autoInsert || data.is_user) return;
        
        // 简单延迟后插入
        setTimeout(() => {
            insertImageToMessage(data.id);
        }, 500);
    }
    
    // 初始化
    function init() {
        createPanel();
        
        // 监听消息事件
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-created', onAIMessage);
        }
        
        console.log('✅ 简单图片插件加载完成');
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
