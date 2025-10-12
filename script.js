(function () {
    // 定义插件的基本信息
    const extensionName = 'web-media-player';
    const extensionAuthor = 'Test Author'; // 使用一个明确的测试作者名

    /**
     * 插件加载时执行的核心函数
     * @param {object} context - SillyTavern提供的上下文，包含 loadSettings, saveSettings, addSettings 等API
     */
    async function onExtensionLoaded(context) {
        // 在浏览器控制台（F12）打印一条消息，确认这个函数被执行了
        console.log('[Web Media Player] Minimal version has been loaded successfully!');

        // 创建一个最简单的HTML片段作为设置面板
        const minimalSettingsHtml = `
            <div class="list-group-item">
                <h5 class="mb-1">Web Media Player (Minimal Test)</h5>
                <p class="mb-1">
                    If you can see this message, it means the plugin has been registered correctly.
                    The registration mechanism is working.
                </p>
            </div>
        `;

        // 使用官方推荐的 context.addSettings() 方法来添加设置面板
        context.addSettings(minimalSettingsHtml);
    }

    // 使用 SillyTavern 的标准方式注册插件
    // 这是整个插件能被SillyTavern识别的关键
    SillyTavern.extension.register(extensionName, extensionAuthor, {
        onExtensionLoaded: onExtensionLoaded,
    });

})();
