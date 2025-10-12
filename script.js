(function () {
    // 使用最古老的 var 关键字，确保最大兼容性
    var extensionName = 'web-media-player';
    var extensionAuthor = 'Diagnostic Test';

    // 定义一个最简单的函数
    function onExtensionLoaded(context) {
        // 这是最重要的诊断信息！
        console.log('DIAGNOSTIC SCRIPT: onExtensionLoaded function was CALLED!');

        var diagnosticHtml =
            '<div class="list-group-item">' +
            '<h5>Diagnostic Check PASSED</h5>' +
            '<p>If you see this, the script file was executed and the registration function was called correctly.</p>' +
            '</div>';

        context.addSettings(diagnosticHtml);
    }

    // 在调用前，先检查 SillyTavern 核心对象是否存在
    if (window.SillyTavern && window.SillyTavern.extension && window.SillyTavern.extension.register) {
        console.log('DIAGNOSTIC SCRIPT: SillyTavern.extension.register API found. Attempting to register...');
        
        try {
            SillyTavern.extension.register(extensionName, extensionAuthor, {
                onExtensionLoaded: onExtensionLoaded
            });
        } catch (error) {
            // 如果注册函数本身抛出错误，打印出来
            console.error('DIAGNOSTIC SCRIPT: CRITICAL ERROR during register() call!', error);
        }

    } else {
        // 如果连核心API都找不到，说明加载时机或环境有问题
        console.error('DIAGNOSTIC SCRIPT: CRITICAL ERROR! SillyTavern.extension.register API was NOT FOUND when script ran.');
    }

})();
