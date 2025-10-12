#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PluginInstaller {
    constructor() {
        this.pluginName = 'st-web-media-grabber';
        this.tavernRoot = this.findTavernRoot();
        this.extensionsDir = path.join(this.tavernRoot, 'public', 'scripts', 'extensions', 'third-party', this.pluginName);
    }

    install() {
        console.log('🚀 安装网页媒体抓取插件...\n');
        
        try {
            this.createDirectories();
            this.copyFiles();
            this.updateMainApp();
            
            console.log('\n✅ 安装完成！');
            console.log('\n📋 使用说明:');
            console.log('1. 重启云酒馆服务');
            console.log('2. 访问管理界面 → 找到"网页媒体抓取"设置');
            console.log('3. 配置目标网站和抓取参数');
            console.log('4. 测试连接并开始使用');
            
        } catch (error) {
            console.error('\n❌ 安装失败:', error.message);
        }
    }

    findTavernRoot() {
        let currentDir = __dirname;
        for (let i = 0; i < 5; i++) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        return process.cwd();
    }

    createDirectories() {
        const parentDir = path.dirname(this.extensionsDir);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        if (!fs.existsSync(this.extensionsDir)) {
            fs.mkdirSync(this.extensionsDir, { recursive: true });
        }
    }

    copyFiles() {
        const files = ['grabber.js', 'admin-api.js', 'media-admin.js', 'manifest.json', 'config.json'];
        
        files.forEach(file => {
            const source = path.join(__dirname, file);
            const target = path.join(this.extensionsDir, file);
            
            if (fs.existsSync(source)) {
                fs.copyFileSync(source, target);
                console.log(`✅ 复制: ${file}`);
            }
        });
    }

    updateMainApp() {
        const mainFiles = ['app.js', 'server.js', 'index.js'].filter(file => 
            fs.existsSync(path.join(this.tavernRoot, file))
        );
        
        if (mainFiles.length === 0) {
            console.log('⚠️  未找到主程序文件，需要手动集成');
            return;
        }

        mainFiles.forEach(mainFile => {
            this.patchFile(path.join(this.tavernRoot, mainFile));
        });
    }

    patchFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes(this.pluginName)) {
            console.log(`⚠️  ${path.basename(filePath)} 已集成，跳过`);
            return;
        }

        // 添加引入语句
        const importStr = `\n// 网页媒体抓取插件\nconst webMediaGrabber = require('./${path.relative(path.dirname(filePath), path.join(this.extensionsDir, 'grabber.js'))}');\n`;
        
        if (content.includes('require(')) {
            const lastRequire = content.lastIndexOf('require(');
            const insertIndex = content.indexOf('\n', lastRequire) + 1;
            content = content.slice(0, insertIndex) + importStr + content.slice(insertIndex);
        }

        // 添加API路由
        const routeStr = `\n// 网页媒体抓取API\napp.use('/api/plugins/web-media-grabber', require('./${path.relative(path.dirname(filePath), path.join(this.extensionsDir, 'admin-api.js'))}'));\n`;
        
        if (content.includes('app.use')) {
            const lastAppUse = content.lastIndexOf('app.use(');
            const insertIndex = content.indexOf('\n', lastAppUse) + 1;
            content = content.slice(0, insertIndex) + routeStr + content.slice(insertIndex);
        }

        fs.writeFileSync(filePath, content);
        console.log(`✅ 修改: ${path.basename(filePath)}`);
    }
}

// 运行安装
new PluginInstaller().install();
