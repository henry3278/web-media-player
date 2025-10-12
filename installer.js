#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SimplePluginInstaller {
  constructor() {
    this.pluginName = 'ai-tavern-image-grabber-simple';
    this.pluginDir = __dirname;
    this.tavernRoot = this.findTavernRoot();
    this.extensionsDir = this.findExtensionsDir();
  }

  async install() {
    console.log('🚀 安装简化版图片抓取插件...\n');
    
    try {
      this.showBanner();
      this.checkEnvironment();
      this.createExtensionDir();
      this.copyFiles();
      this.createManifestFile();
      this.patchMainApp();
      
      console.log('\n✅ 安装完成！');
      this.showConfigInstructions();
      
    } catch (error) {
      console.error('\n❌ 安装失败:', error.message);
      process.exit(1);
    }
  }

  findTavernRoot() {
    let currentDir = this.pluginDir;
    
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return process.cwd();
  }

  findExtensionsDir() {
    // 优先使用云酒馆的标准扩展目录
    const possibleDirs = [
      path.join(this.tavernRoot, 'public', 'scripts', 'extensions', 'third-party', this.pluginName),
      path.join(this.tavernRoot, 'extensions', this.pluginName),
      path.join(this.tavernRoot, 'plugins', this.pluginName)
    ];
    
    for (const dir of possibleDirs) {
      const parentDir = path.dirname(dir);
      if (fs.existsSync(parentDir)) {
        return dir;
      }
    }
    
    // 创建标准目录
    return path.join(this.tavernRoot, 'public', 'scripts', 'extensions', 'third-party', this.pluginName);
  }

  checkEnvironment() {
    console.log('🔍 检查环境...');
    
    if (!fs.existsSync(path.join(this.tavernRoot, 'package.json'))) {
      throw new Error('未找到云酒馆项目');
    }
    
    const appFiles = ['app.js', 'server.js', 'index.js'].filter(file => 
      fs.existsSync(path.join(this.tavernRoot, file))
    );
    
    if (appFiles.length === 0) {
      throw new Error('未找到主程序文件');
    }
    
    this.mainAppFile = path.join(this.tavernRoot, appFiles[0]);
    console.log(`   主程序文件: ${appFiles[0]}`);
    console.log(`   扩展目录: ${path.relative(this.tavernRoot, this.extensionsDir)}`);
  }

  createExtensionDir() {
    console.log('\n📁 创建扩展目录...');
    
    // 创建所有必要的父目录
    const parentDir = path.dirname(this.extensionsDir);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
      console.log(`   创建父目录: ${path.relative(this.tavernRoot, parentDir)}`);
    }
    
    if (fs.existsSync(this.extensionsDir)) {
      console.log('   目录已存在，清理旧文件');
      fs.rmSync(this.extensionsDir, { recursive: true });
    }
    
    fs.mkdirSync(this.extensionsDir, { recursive: true });
    console.log(`   创建扩展目录成功`);
  }

  copyFiles() {
    console.log('\n📄 复制文件...');
    
    const files = {
      'grabber.js': '核心抓取逻辑',
      'config.js': '配置文件'
    };
    
    Object.entries(files).forEach(([file, desc]) => {
      const source = path.join(this.pluginDir, file);
      const target = path.join(this.extensionsDir, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`   ✅ ${file} - ${desc}`);
      } else {
        console.log(`   ❌ ${file} 不存在`);
      }
    });
  }

  createManifestFile() {
    console.log('\n📝 创建清单文件...');
    
    const manifestPath = path.join(this.extensionsDir, 'manifest.json');
    const manifest = {
      "name": "ai-tavern-image-grabber-simple",
      "version": "3.0.0",
      "description": "AI云酒馆图片抓取插件 - 简化版",
      "type": "extension",
      "author": "AI云酒馆",
      "entry": "./grabber.js",
      "config": "./config.js",
      "dependencies": [],
      "permissions": ["network"],
      "settings": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "label": "启用插件"
        },
        "targetWebsite": {
          "type": "string",
          "default": "https://www.kchai.org/",
          "label": "目标网站"
        }
      }
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('   ✅ manifest.json 创建成功');
  }

  patchMainApp() {
    console.log('\n🔧 集成到主程序...');
    
    if (!fs.existsSync(this.mainAppFile)) {
      console.log('   ⚠️ 主程序文件不存在，需要手动集成');
      this.showManualIntegration();
      return;
    }
    
    let content = fs.readFileSync(this.mainAppFile, 'utf8');
    
    // 检查是否已集成
    if (content.includes(this.pluginName)) {
      console.log('   ⚠️ 已集成，跳过');
      return;
    }
    
    // 添加引入语句
    const relativePath = path.relative(path.dirname(this.mainAppFile), this.extensionsDir);
    const importStr = `\n// 图片抓取插件\nconst imageGrabber = require('./${relativePath}/grabber');\n`;
    
    let newContent = content;
    
    // 在文件顶部添加引入
    if (content.includes('require(')) {
      const lastRequire = content.lastIndexOf('require(');
      const insertIndex = content.indexOf('\n', lastRequire) + 1;
      newContent = content.slice(0, insertIndex) + importStr + content.slice(insertIndex);
    } else {
      newContent = importStr + content;
    }
    
    // 在AI回复处理中添加调用
    const aiPatterns = [
      /(async\s+)?function\s+generateAIResponse\s*\([^)]*\)\s*\{/,
      /(let|const|var)\s+\w+\s*=\s*await\s+generateAIResponse\([^)]*\);/
    ];
    
    let patched = false;
    for (const pattern of aiPatterns) {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, (match) => {
          patched = true;
          if (match.includes('function')) {
            return match + `\n  // 图片抓取插件\n  if (imageGrabber.isEnabled()) {\n    text = await imageGrabber.addImageToText(text);\n  }`;
          } else {
            const varName = match.split('=')[0].trim();
            return match + `\n  // 图片抓取插件\n  if (imageGrabber.isEnabled()) {\n    ${varName} = await imageGrabber.addImageToText(${varName});\n  }`;
          }
        });
        break;
      }
    }
    
    if (!patched) {
      console.log('   ⚠️ 未找到AI回复函数，需要手动集成');
      this.showManualIntegration();
      return;
    }
    
    // 备份原文件
    const backupFile = this.mainAppFile + '.backup.' + Date.now();
    fs.copyFileSync(this.mainAppFile, backupFile);
    
    fs.writeFileSync(this.mainAppFile, newContent);
    console.log('   ✅ 主程序修改完成');
    console.log(`   💾 原文件备份: ${path.basename(backupFile)}`);
  }

  showManualIntegration() {
    console.log('\n📝 手动集成指南:');
    const relativePath = path.relative(path.dirname(this.mainAppFile), this.extensionsDir);
    
    console.log(`
1. 在 ${path.basename(this.mainAppFile)} 顶部添加:
   const imageGrabber = require('./${relativePath}/grabber');

2. 在AI回复处理函数中添加:
   if (imageGrabber.isEnabled()) {
     responseText = await imageGrabber.addImageToText(responseText);
   }
    `);
  }

  showBanner() {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║          图片抓取插件 - 简化版               ║
    ║          包含Manifest v3.0.0                 ║
    ╚══════════════════════════════════════════════╝
    `);
  }

  showConfigInstructions() {
    console.log(`
🎯 配置说明：

1. 编辑配置文件:
   ${path.relative(this.tavernRoot, path.join(this.extensionsDir, 'config.js'))}

2. 修改配置参数后重启服务

3. 常用配置选项:
   - enabled: true/false (启用/禁用)
   - targetWebsite: "目标网站URL"
   - excludeKeywords: ["icon", "logo", "ad"]

4. 重启服务:
   cd "${this.tavernRoot}"
   npm start

✅ 安装完成！插件已包含必要的 manifest.json 文件。
    `);
  }
}

// 运行安装
if (require.main === module) {
  new SimplePluginInstaller().install().catch(console.error);
}
