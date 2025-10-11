#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复AI云酒馆图片抓取插件安装...');

// 检测可能的安装目录
const possibleDirs = [
    'public/scripts/extensions/third-party/ai-tavern-image-grabber',
    'extensions/ai-tavern-image-grabber',
    'plugins/ai-tavern-image-grabber'
];

let targetDir = null;
for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
        targetDir = dir;
        console.log(`📍 找到插件目录: ${dir}`);
        break;
    }
}

if (!targetDir) {
    console.log('❌ 未找到插件目录，请先运行安装脚本');
    process.exit(1);
}

// 清理目录但不删除配置
try {
    const filesToKeep = ['config.json'];
    const items = fs.readdirSync(targetDir);
    
    let removedCount = 0;
    items.forEach(item => {
        if (!filesToKeep.includes(item)) {
            const itemPath = path.join(targetDir, item);
            fs.rmSync(itemPath, { recursive: true, force: true });
            removedCount++;
        }
    });
    
    console.log(`✅ 清理完成，移除了 ${removedCount} 个文件`);
    
    // 重新复制核心文件
    const pluginFiles = ['grabber.js', 'admin-api.js', 'admin.html'];
    pluginFiles.forEach(file => {
        const source = path.join(__dirname, file);
        if (fs.existsSync(source)) {
            fs.copyFileSync(source, path.join(targetDir, file));
            console.log(`✅ 更新: ${file}`);
        }
    });
    
    console.log('\n🎉 修复完成！请重启云酒馆服务。');
    
} catch (error) {
    console.error('❌ 修复失败:', error.message);
}
