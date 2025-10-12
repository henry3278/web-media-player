// script.js
(function() {
    console.log('🎯 图片插件加载...');

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
        console.log('创建面板...');
        
        // 等待设置区域加载
        const checkInterval = setInterval(() => {
            const area = document.getElementById('extensions_settings');
            if (area) {
                clearInterval(checkInterval);
                
                const html = `
                    <div class="list-group-item">
                        <h5>🎯 图片插件</h5>
                        <label><input type="checkbox" id="img-enabled" checked> 启用</label>
                        <label><input type="checkbox" id="img-auto" checked> 自动插入</label>
                        <textarea id="img-urls" rows="3" style="width:100%;">${config.imageUrls.join('\n')}</textarea>
                        <button id="img-test" class="btn btn-sm btn-primary">测试插入</button>
                        <div id="img-status"></div>
                    </div>
                `;
                
                area.innerHTML += html;
                
                // 绑定事件
                document.getElementById('img-enabled').onchange = (e) => config.enabled = e.target.checked;
                document.getElementById('img-auto').onchange = (e) => config.autoInsert = e.target.checked;
                document.getElementById('img-urls').oninput = (e) => config.imageUrls = e.target.value.split('\n').filter(url => url.trim());
                document.getElementById('img-test').onclick = testInsert;
                
                console.log('✅ 面板创建完成');
            }
        }, 100);
    }

    // 显示状态
    function showStatus(msg) {
        const el = document.getElementById('img-status');
        if (el) el.innerHTML = msg;
    }

    // 获取随机图片
    function getRandomImage() {
        return config.imageUrls[Math.floor(Math.random() * config.imageUrls.length)];
    }

    // 插入图片（核心功能）
    function insertImage(messageId) {
        if (!config.enabled || !config.imageUrls.length) return false;
        
        const imgUrl = getRandomImage();
        const messageEl = document.getElementById(`mes_${messageId}`);
        
        if (!messageEl) {
            console.log('找不到消息:', `mes_${messageId}`);
            return false;
        }
        
        const textEl = messageEl.querySelector('.mes_text');
        if (!textEl) return false;
        
        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.marginTop = '10px';
        img.style.borderRadius = '5px';
        
        textEl.appendChild(img);
        console.log('✅ 图片插入成功');
        return true;
    }

    // 测试插入（这个功能你确认是工作的）
    function testInsert() {
        console.log('测试插入...');
        
        // 查找AI消息
        const messages = document.querySelectorAll('.mes');
        for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].querySelector('.mes_user')) {
                const msgId = messages[i].id.replace('mes_', '');
                if (insertImage(msgId)) {
                    showStatus('<span style="color:green">✅ 测试成功</span>');
                } else {
                    showStatus('<span style="color:red">❌ 插入失败</span>');
                }
                return;
            }
        }
        showStatus('<span style="color:red">❌ 找不到AI消息</span>');
    }

    // AI回复监听 - 这是需要修复的部分
    function setupAIAutoInsert() {
        console.log('设置AI自动插入监听...');
        
        // 方法1: 监听消息创建
        if (window.SillyTavern && SillyTavern.events) {
            SillyTavern.events.on('message-created', (event, data) => {
                if (config.enabled && config.autoInsert && !data.is_user) {
                    console.log('AI消息创建:', data);
                    setTimeout(() => insertImage(data.id), 500);
                }
            });
            console.log('✅ 使用SillyTavern事件系统');
            return;
        }
        
        // 方法2: 备用方案 - 监听DOM变化
        console.log('使用DOM监听备用方案');
        const observer = new MutationObserver((mutations) => {
            if (!config.enabled || !config.autoInsert) return;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('mes')) {
                        // 新消息节点
                        setTimeout(() => {
                            if (!node.querySelector('.mes_user')) { // AI消息
                                const msgId = node.id.replace('mes_', '');
                                insertImage(msgId);
                            }
                        }, 300);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化
    function init() {
        console.log('初始化插件...');
        createPanel();
        setupAIAutoInsert();
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
