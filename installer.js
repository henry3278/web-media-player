#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SimplePluginInstaller {
  constructor() {
    this.pluginName = 'ai-tavern-image-grabber-simple';
    this.pluginDir = __dirname;
    this.tavernRoot = this.findTavernRoot();
    this.extensionsDir = path.join(this.tavernRoot, 'extensions', this.pluginName);
  }

  async install() {
    console.log('🚀 安装简化版图片抓取插件...\n');
    
    try {
      this.showBanner();
      this.checkEnvironment();
      this.createExtensionDir();
      this.copyFiles();
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
  }

  createExtensionDir() {
    console.log('\n📁 创建扩展目录...');
    
    if (fs.existsSync(this.extensionsDir)) {
      console.log('   目录已存在，覆盖安装');
      fs.rmSync(this.extensionsDir, { recursive: true });
    }
    
    fs.mkdirSync(this.extensionsDir, { recursive: true });
    console.log(`   创建目录: ${path.relative(this.tavernRoot, this.extensionsDir)}`);
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

  patchMainApp() {
    console.log('\n🔧 集成到主程序...');
    
    if (!fs.existsSync(this.mainAppFile)) {
      console.log('   ⚠️ 主程序文件不存在');
      return;
    }
    
    let content = fs.readFileSync(this.mainAppFile, 'utf8');
    
    // 检查是否已集成
    if (content.includes(this.pluginName)) {
      console.log('   ⚠️ 已集成，跳过');
      return;
    }
    
    // 添加引入语句
    const importStr = `\n// 图片抓取插件\nconst imageGrabber = require('./extensions/${this.pluginName}/grabber');\n`;
    
    if (content.includes('require(')) {
      const lastRequire = content.lastIndexOf('require(');
      const insertIndex = content.indexOf('\n', lastRequire) + 1;
      content = content.slice(0, insertIndex) + importStr + content.slice(insertIndex);
    } else {
      content = importStr + content;
    }
    
    // 在AI回复处理中添加调用
    const aiPatterns = [
      /(async\s+)?function\s+generateAIResponse\s*\([^)]*\)\s*{/,
      /(let|const|var)\s+\w+\s*=\s*await\s+generateAIResponse\([^)]*\);/
    ];
    
    for (const pattern of aiPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          if (match.includes('function')) {
            return match + `\n  // 图片抓取插件\n  if (imageGrabber.isEnabled()) {\n    text = await imageGrabber.addImageToText(text);\n  }`;
          } else {
            return match + `\n  // 图片抓取插件\n  if (imageGrabber.isEnabled()) {\n    ${match.split('=')[0].trim()} = await imageGrabber.addImageToText(${match.split('=')[0].trim()});\n  }`;
          }
        });
        break;
      }
    }
    
    // 备份原文件
    const backupFile = this.mainAppFile + '.backup.' + Date.now();
    fs.copyFileSync(this.mainAppFile, backupFile);
    
    fs.writeFileSync(this.mainAppFile, content);
    console.log('   ✅ 主程序修改完成');
    console.log(`   💾 原文件备份: ${path.basename(backupFile)}`);
  }

  showBanner() {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║          图片抓取插件 - 简化版               ║
    ║              无管理面板 v3.0.0               ║
    ╚══════════════════════════════════════════════╝
    `);
  }

  showConfigInstructions() {
    console.log(`
🎯 配置说明：

1. 编辑配置文件:
   ${path.relative(this.tavernRoot, path.join(this.extensionsDir, 'config.js'))}

2. 修改配置参数:
   - enabled: true/false (启用/禁用)
   - targetWebsite: "https://www.kchai.org/" (目标网站)
   - 其他参数根据需求调整

3. 重启云酒馆服务:
   cd "${this.tavernRoot}"
   npm start

4. 测试功能:
   - 发送消息看是否自动插入图片
   - 查看控制台日志确认运行状态

📝 配置文件位置:
${path.join(this.extensionsDir, 'config.js')}
    `);
  }
}

// 运行安装
if (require.main === module) {
  new SimplePluginInstaller().install().catch(console.error);
}
