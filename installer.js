#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TavernPluginInstaller {
  constructor() {
    this.pluginName = 'ai-tavern-image-grabber';
    this.pluginDir = path.join(__dirname);
    this.tavernRoot = this.findTavernRoot();
    this.extensionsDir = path.join(this.tavernRoot, 'extensions', this.pluginName);
  }

  findTavernRoot() {
    let currentDir = __dirname;
    
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
        if (pkg.name && pkg.name.includes('tavern')) {
          return currentDir;
        }
      }
      currentDir = path.dirname(currentDir);
    }
    
    return path.dirname(__dirname);
  }

  async install() {
    console.log('🚀 开始安装 AI 云酒馆图片抓取插件...\n');
    
    try {
      this.showBanner();
      this.checkEnvironment();
      this.createExtensionsDir();
      this.copyPluginFiles();
      this.installDependencies();
      this.patchMainApp();
      this.createConfig();
      
      console.log('\n✅ 插件安装完成！');
      this.showNextSteps();
      
    } catch (error) {
      console.error('\n❌ 安装失败:', error.message);
      process.exit(1);
    }
  }

  showBanner() {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║           AI云酒馆图片抓取插件               ║
    ║             一键安装程序 v1.0                ║
    ╚══════════════════════════════════════════════╝
    `);
    console.log(`📍 云酒馆路径: ${this.tavernRoot}`);
    console.log(`📍 插件路径: ${this.extensionsDir}\n`);
  }

  checkEnvironment() {
    console.log('🔍 检查环境...');
    
    const nodeVersion = process.version;
    console.log(`   Node.js 版本: ${nodeVersion}`);
    
    if (!fs.existsSync(path.join(this.tavernRoot, 'package.json'))) {
      throw new Error('未找到云酒馆的 package.json，请确保在正确目录运行');
    }
    
    const appFiles = ['app.js', 'server.js', 'index.js'].filter(file => 
      fs.existsSync(path.join(this.tavernRoot, file))
    );
    
    if (appFiles.length === 0) {
      throw new Error('未找到云酒馆主程序文件 (app.js/server.js/index.js)');
    }
    
    console.log(`   主程序文件: ${appFiles[0]}`);
    this.mainAppFile = path.join(this.tavernRoot, appFiles[0]);
  }

  createExtensionsDir() {
    console.log('\n📁 创建扩展目录...');
    
    if (fs.existsSync(this.extensionsDir)) {
      console.log('   扩展目录已存在，执行更新操作');
      const backupDir = this.extensionsDir + '.backup.' + Date.now();
      fs.cpSync(this.extensionsDir, backupDir, { recursive: true });
      console.log(`   旧版本已备份至: ${path.basename(backupDir)}`);
    } else {
      fs.mkdirSync(this.extensionsDir, { recursive: true });
      console.log('   扩展目录创建成功');
    }
  }

  copyPluginFiles() {
    console.log('\n📄 复制插件文件...');
    
    const filesToCopy = [
      'grabber.js',
      'admin-api.js', 
      'admin.html',
      'config.json'
    ];
    
    filesToCopy.forEach(file => {
      const source = path.join(this.pluginDir, file);
      const target = path.join(this.extensionsDir, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ⚠️  ${file} 不存在，跳过`);
      }
    });
  }

  installDependencies() {
    console.log('\n📦 安装依赖...');
    
    try {
      const mainPackageJson = JSON.parse(
        fs.readFileSync(path.join(this.tavernRoot, 'package.json'), 'utf8')
      );
      
      const depsToInstall = [
        { pkg: 'axios', version: '^1.6.0' },
        { pkg: 'cheerio', version: '^1.0.0-rc.12' }
      ];
      
      depsToInstall.forEach(({ pkg, version }) => {
        if (!mainPackageJson.dependencies?.[pkg] && !mainPackageJson.devDependencies?.[pkg]) {
          console.log(`   安装 ${pkg}@${version}...`);
          execSync(`cd "${this.tavernRoot}" && npm install ${pkg}@${version}`, {
            stdio: 'inherit'
          });
        } else {
          console.log(`   ✅ ${pkg} 已安装`);
        }
      });
      
    } catch (error) {
      console.log('   ⚠️  依赖安装跳过:', error.message);
    }
  }

  patchMainApp() {
    console.log('\n🔧 集成到主程序...');
    
    if (!fs.existsSync(this.mainAppFile)) {
      console.log('   ⚠️  主程序文件不存在，跳过集成');
      return;
    }
    
    let content = fs.readFileSync(this.mainAppFile, 'utf8');
    
    const backupFile = this.mainAppFile + '.backup.' + Date.now();
    fs.copyFileSync(this.mainAppFile, backupFile);
    console.log(`   原文件已备份: ${path.basename(backupFile)}`);
    
    if (content.includes('ai-tavern-image-grabber')) {
      console.log('   ⚠️  检测到已集成，跳过...');
      return;
    }
    
    const importStatement = `\n// AI云酒馆图片抓取插件\nconst imageGrabber = require('./extensions/ai-tavern-image-grabber/grabber');\n`;
    
    if (content.includes("require(")) {
      const lastRequireIndex = content.lastIndexOf("require(");
      const insertIndex = content.indexOf('\n', lastRequireIndex) + 1;
      content = content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
    } else {
      content = importStatement + content;
    }
    
    let patched = false;
    const patterns = [
      /app\.(post|get)\(['"]\/api\/chat['"][^}]+{([^}]+)(await\s+)?generateAIResponse[^}]+}/g,
      /function\s+processAIResponse\s*\([^)]*\)\s*{([^}]+)(await\s+)?generateAIResponse[^}]+}/g
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          return match.replace(/(let|const|var)\s+(\w+)\s*=\s*await generateAIResponse[^;]+;/, 
            `$1 $2 = await generateAIResponse$'; \n      // 图片抓取插件处理\n      if (imageGrabber.isEnabled()) {\n        $2 = await imageGrabber.addImageToText($2);\n      }`);
        });
        patched = true;
        break;
      }
    }
    
    if (!patched) {
      console.log('   ⚠️  未找到合适的集成点，需要手动集成');
      this.showManualIntegrationGuide();
      return;
    }
    
    const expressPattern = /app\.use\(express\.json\(\)\);/;
    if (expressPattern.test(content)) {
      content = content.replace(expressPattern, 
        `app.use(express.json());\n\n// 图片抓取插件管理路由\napp.use('/api/plugins/image-grabber', require('./extensions/ai-tavern-image-grabber/admin-api'));\napp.use('/extensions/image-grabber', express.static('extensions/ai-tavern-image-grabber'));`
      );
    }
    
    fs.writeFileSync(this.mainAppFile, content);
    console.log('   ✅ 主程序集成完成');
  }

  showManualIntegrationGuide() {
    console.log('\n📝 需要手动集成，请在适当位置添加以下代码:');
    console.log(`
// 1. 在文件顶部添加:
const imageGrabber = require('./extensions/ai-tavern-image-grabber/grabber');

// 2. 在AI回复处理中添加:
let aiResponse = await generateAIResponse(userInput);
if (imageGrabber.isEnabled()) {
  aiResponse = await imageGrabber.addImageToText(aiResponse);
}

// 3. 添加路由:
app.use('/api/plugins/image-grabber', require('./extensions/ai-tavern-image-grabber/admin-api'));
app.use('/extensions/image-grabber', express.static('extensions/ai-tavern-image-grabber'));
    `);
  }

  createConfig() {
    console.log('\n⚙️  创建配置文件...');
    
    const configFile = path.join(this.extensionsDir, 'config.json');
    const defaultConfig = {
      "enabled": true,
      "targetWebsite": "https://www.kchai.org/",
      "imageSelectors": ["img[src*='.jpg']", "img[src*='.png']", "img[src*='.webp']"],
      "excludeKeywords": ["icon", "logo", "ad", "spacer"],
      "insertPosition": "after_first_sentence",
      "maxImageWidth": "400px",
      "requestTimeout": 5000,
      "cacheDuration": 300000
    };
    
    if (!fs.existsSync(configFile)) {
      fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
      console.log('   ✅ 默认配置文件已创建');
    } else {
      console.log('   ⚠️  配置文件已存在，保留原配置');
    }
  }

  showNextSteps() {
    console.log(`
🎉 安装完成！接下来：

1. 重启云酒馆服务:
   cd "${this.tavernRoot}"
   npm start

2. 访问管理界面:
   http://localhost:3000/extensions/image-grabber/admin.html

3. 配置抓取设置并测试

如需帮助，请参考项目README文件
    `);
  }
}

if (require.main === module) {
  new TavernPluginInstaller().install().catch(console.error);
}

module.exports = TavernPluginInstaller;
