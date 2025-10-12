// SillyTavern扩展插件标准结构
(function() {
    console.log('🖼️ 图片插入插件加载...');

    const EXTENSION_NAME = 'image-inserter';
    
    // 等待SillyTavern环境就绪
    function waitForSillyTavern() {
        return new Promise((resolve) => {
            if (window.SillyTavern && SillyTavern.extensions) {
                resolve();
            } else {
                const interval = setInterval(() => {
                    if (window.SillyTavern && SillyTavern.extensions) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    // 扩展主类
    class ImageInserterExtension {
        constructor() {
            this.name = EXTENSION_NAME;
            this.settings = {
                enabled: true,
                autoInsert: true,
                imageUrls: [
                    'https://picsum.photos/300/200?1',
                    'https://picsum.photos/300/200?2',
                    'https://picsum.photos/300/200?3'
                ]
            };
        }

        // 加载设置
        async loadSettings() {
            try {
                const saved = await SillyTavern.extensions.loadSettings(this.name);
                if (saved) {
                    this.settings = { ...this.settings, ...saved };
                }
            } catch (error) {
                console.warn('加载设置失败:', error);
            }
        }

        // 保存设置
        async saveSettings() {
            try {
                await SillyTavern.extensions.saveSettings(this.name, this.settings);
            } catch (error) {
                console.error('保存设置失败:', error);
            }
        }

        // 创建设置面板
        createSettingsPanel() {
            const html = `
                <div class="image_inserter_settings">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="${this.name}_enabled" ${this.settings.enabled ? 'checked' : ''}>
                            启用插件
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="${this.name}_auto_insert" ${this.settings.autoInsert ? 'checked' : ''}>
                            AI回复时自动插入
                        </label>
                    </div>
                    <div class="form-group">
                        <label>图片URL列表:</label>
                        <textarea class="text_pole" id="${this.name}_urls" rows="4">${this.settings.imageUrls.join('\n')}</textarea>
                    </div>
                    <button class="menu_button" id="${this.name}_test">测试插入</button>
                    <div id="${this.name}_status"></div>
                </div>
            `;

            // 添加到扩展设置区域
            const extensionsArea = document.getElementById('extensions_settings');
            if (extensionsArea) {
                extensionsArea.insertAdjacentHTML('beforeend', html);
                this.bindSettingsEvents();
            }
        }

        // 绑定设置事件
        bindSettingsEvents() {
            document.getElementById(`${this.name}_enabled`).addEventListener('change', (e) => {
                this.settings.enabled = e.target.checked;
                this.saveSettings();
                this.updateStatus(`插件${this.settings.enabled ? '启用' : '禁用'}`);
            });

            document.getElementById(`${this.name}_auto_insert`).addEventListener('change', (e) => {
                this.settings.autoInsert = e.target.checked;
                this.saveSettings();
                this.updateStatus(`自动插入${this.settings.autoInsert ? '启用' : '禁用'}`);
            });

            document.getElementById(`${this.name}_urls`).addEventListener('input', (e) => {
                this.settings.imageUrls = e.target.value.split('\n').filter(url => url.trim());
                this.saveSettings();
            });

            document.getElementById(`${this.name}_test`).addEventListener('click', () => {
                this.testInsert();
            });
        }

        // 更新状态显示
        updateStatus(message) {
            const statusEl = document.getElementById(`${this.name}_status`);
            if (statusEl) {
                statusEl.textContent = message;
            }
        }

        // 获取随机图片
        getRandomImage() {
            if (!this.settings.imageUrls.length) return null;
            return this.settings.imageUrls[Math.floor(Math.random() * this.settings.imageUrls.length)];
        }

        // 插入图片到消息
        insertImage(messageId) {
            if (!this.settings.enabled) return false;

            const imageUrl = this.getRandomImage();
            if (!imageUrl) return false;

            // 使用SillyTavern的消息选择器
            const messageElement = document.getElementById(`mes_${messageId}`);
            if (!messageElement) return false;

            const messageText = messageElement.querySelector('.mes_text');
            if (!messageText) return false;

            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.maxWidth = '300px';
            img.style.maxHeight = '200px';
            img.style.marginTop = '10px';

            messageText.appendChild(img);
            return true;
        }

        // 测试插入
        testInsert() {
            if (!this.settings.enabled) {
                this.updateStatus('插件未启用');
                return;
            }

            // 查找最新的AI消息
            const messages = document.querySelectorAll('[id^="mes_"]');
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (!msg.querySelector('.mes_user')) {
                    const messageId = msg.id.replace('mes_', '');
                    if (this.insertImage(messageId)) {
                        this.updateStatus('插入成功');
                    } else {
                        this.updateStatus('插入失败');
                    }
                    return;
                }
            }
            this.updateStatus('未找到AI消息');
        }

        // 初始化事件监听
        initEventListeners() {
            // 监听消息创建事件
            if (SillyTavern.events) {
                SillyTavern.events.on('message-created', (event, data) => {
                    if (this.settings.enabled && this.settings.autoInsert && !data.is_user) {
                        setTimeout(() => {
                            this.insertImage(data.id);
                        }, 100);
                    }
                });
            }
        }

        // 初始化扩展
        async init() {
            await this.loadSettings();
            this.createSettingsPanel();
            this.initEventListeners();
            console.log('✅ 图片插入插件初始化完成');
        }
    }

    // 主初始化函数
    async function initialize() {
        await waitForSillyTavern();
        
        const extension = new ImageInserterExtension();
        await extension.init();
        
        // 注册扩展
        window.imageInserterExtension = extension;
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
