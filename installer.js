const fs = require('fs');
const path = require('path');

// 简单安装脚本
const pluginDir = path.join(__dirname);
const extensionsDir = path.join(process.cwd(), 'public', 'scripts', 'extensions', 'third-party', 'st-web-media-grabber');

if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
}

['grabber.js', 'admin-api.js', 'media-panel.js', 'manifest.json', 'config.json'].forEach(file => {
    fs.copyFileSync(path.join(pluginDir, file), path.join(extensionsDir, file));
});

console.log('✅ 网页媒体抓取插件安装完成！');
