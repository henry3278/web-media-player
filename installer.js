#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TavernPluginInstaller {
  constructor() {
    this.pluginName = 'ai-tavern-image-grabber';
    this.pluginDir = __dirname;
    this.tavernRoot = this.findTavernRoot();
    this.extensionsDir = path.join(this.tavernRoot, 'extensions', this.pluginName);
  }

  findTavernRoot() {
    let currentDir = this.pluginDir;
    
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
        if (pkg.name && (pkg.name.includes('tavern') || pkg.name.includes('ai'))) {
          return currentDir;
        }
      }
      if (currentDir === path.dirname(currentDir)) break;
      currentDir = path.dirname(currentDir);
    }
    
    return process.cwd();
  }

  async install() {
    console.log('🚀 开始安装 AI 云酒馆图片抓取插件...\n');
    
    try {
      this.showBanner();
      this.checkEnvironment();
      await this.createExtensionsDir();
      this.copyPluginFiles();
      this.installDependencies();
      this.patchMainApp();
      await this.integrateWithAdmin();
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
    ║             集成管理界面版 v1.0              ║
    ╚══════════════════════════════════════════════╝
    `);
    console.log(`📍 云酒馆路径: ${this.tavernRoot}`);
    console.log(`📍 插件路径: ${this.extensionsDir}\n`);
  }

  checkEnvironment() {
    console.log('🔍 检查环境...');
    
    if (!fs.existsSync(path.join(this.tavernRoot, 'package.json'))) {
      throw new Error('未找到云酒馆项目，请确保在正确目录运行');
    }
    
    const appFiles = ['app.js', 'server.js', 'index.js', 'main.js'].filter(file => 
      fs.existsSync(path.join(this.tavernRoot, file))
    );
    
    if (appFiles.length === 0) {
      throw new Error('未找到云酒馆主程序文件');
    }
    
    this.mainAppFile = path.join(this.tavernRoot, appFiles[0]);
    console.log(`   主程序文件: ${appFiles[0]}`);
  }

  async createExtensionsDir() {
    console.log('\n📁 创建扩展目录...');
    
    if (fs.existsSync(this.extensionsDir)) {
      console.log('   扩展目录已存在，执行更新操作');
      const backupDir = this.extensionsDir + '.backup.' + Date.now();
      if (fs.existsSync(this.extensionsDir)) {
        fs.cpSync(this.extensionsDir, backupDir, { recursive: true });
        console.log(`   旧版本已备份至: ${path.basename(backupDir)}`);
      }
    }
    
    fs.mkdirSync(this.extensionsDir, { recursive: true });
    console.log('   扩展目录创建成功');
  }

  copyPluginFiles() {
    console.log('\n📄 复制插件文件...');
    
    const filesToCopy = [
      'grabber.js',
      'admin-api.js',
      'admin-integration.js',
      'admin-component.vue',
      'config.json'
    ];
    
    filesToCopy.forEach(file => {
      const source = path.join(this.pluginDir, file);
      const target = path.join(this.extensionsDir, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ⚠️  ${file} 不存在`);
      }
    });
  }

  installDependencies() {
    console.log('\n📦 安装依赖...');
    
    try {
      const depsToInstall = ['axios@^1.6.0', 'cheerio@^1.0.0-rc.12'];
      
      depsToInstall.forEach(pkg => {
        console.log(`   安装 ${pkg}...`);
        execSync(`cd "${this.tavernRoot}" && npm install ${pkg}`, {
          stdio: 'inherit'
        });
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
    
    // 备份原文件
    const backupFile = this.mainAppFile + '.backup.' + Date.now();
    fs.copyFileSync(this.mainAppFile, backupFile);
    console.log(`   原文件已备份: ${path.basename(backupFile)}`);
    
    // 检查是否已经集成
    if (content.includes('ai-tavern-image-grabber')) {
      console.log('   ⚠️  检测到已集成，跳过...');
      return;
    }
    
    // 添加引入语句
    const importStatement = `\n// AI云酒馆图片抓取插件\nconst imageGrabber = require('./extensions/ai-tavern-image-grabber/grabber');\n`;
    
    if (content.includes('require(')) {
      const lastRequire = content.lastIndexOf('require(');
      const insertIndex = content.indexOf('\n', lastRequire) + 1;
      content = content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
    } else {
      content = importStatement + content;
    }
    
    // 添加API路由
    const expressPattern = /app\.use\(express\.json\(\)\);/;
    if (expressPattern.test(content)) {
      content = content.replace(expressPattern, 
        `app.use(express.json());\n\n// 图片抓取插件API路由\napp.use('/api/plugins/image-grabber', require('./extensions/ai-tavern-image-grabber/admin-api'));`
      );
    }
    
    // 在AI回复处理中添加钩子
    this.injectAIResponseHook(content);
    
    fs.writeFileSync(this.mainAppFile, content);
    console.log('   ✅ 主程序集成完成');
  }

  injectAIResponseHook(content) {
    const patterns = [
      /(async\s+)?function\s+generateAIResponse\s*\([^)]*\)\s*{/g,
      /(let|const|var)\s+aiResponse\s*=\s*await\s+generateAIResponse\([^)]*\);/g,
      /app\.(post|get)\(['"]\/api\/chat['"][^}]+{([^}]*)(await\s+)?generateAIResponse[^}]*}/g
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          if (match.includes('function')) {
            return match.replace(/(async\s+)?function\s+generateAIResponse\s*\([^)]*\)\s*{/, 
              `$&\\n  // 图片抓取插件处理\\n  if (imageGrabber && imageGrabber.isEnabled()) {\\n    text = await imageGrabber.addImageToText(text);\\n  }`);
          } else if (match.includes('aiResponse')) {
            return match + `\\n  // 图片抓取插件处理\\n  if (imageGrabber && imageGrabber.isEnabled()) {\\n    aiResponse = await imageGrabber.addImageToText(aiResponse);\\n  }`;
          }
          return match;
        });
        console.log('   ✅ AI回复钩子注入完成');
        return;
      }
    }
    
    console.log('   ⚠️  未找到AI回复函数，需要手动集成');
  }

  async integrateWithAdmin() {
    console.log('\n🎨 集成到管理界面...');
    
    // 查找管理界面文件
    const adminFiles = this.findAdminFiles();
    
    if (adminFiles.length === 0) {
      console.log('   ⚠️  未找到管理界面文件，提供手动集成指南');
      this.showManualIntegrationGuide();
      return;
    }
    
    for (const adminFile of adminFiles) {
      await this.injectIntoAdminFile(adminFile);
    }
  }

  findAdminFiles() {
    const possiblePaths = [
      'admin.html',
      'admin.js',
      'src/admin/Admin.vue',
      'src/components/Admin.vue',
      'public/admin.html',
      'views/admin.ejs',
      'pages/admin.vue'
    ];
    
    return possiblePaths.filter(file => 
      fs.existsSync(path.join(this.tavernRoot, file))
    );
  }

  async injectIntoAdminFile(adminFile) {
    const fullPath = path.join(this.tavernRoot, adminFile);
    console.log(`   处理管理文件: ${adminFile}`);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    if (adminFile.endsWith('.vue')) {
      modified = this.injectIntoVueFile(content, fullPath);
    } else if (adminFile.endsWith('.html')) {
      modified = this.injectIntoHtmlFile(content, fullPath);
    } else if (adminFile.endsWith('.js')) {
      modified = this.injectIntoJsFile(content, fullPath);
    }
    
    if (modified) {
      console.log(`   ✅ 成功集成到 ${adminFile}`);
    } else {
      console.log(`   ⚠️  无法自动集成到 ${adminFile}`);
    }
  }

  injectIntoVueFile(content, filePath) {
    if (content.includes('image-grabber-settings')) return false;
    
    // 注入模板
    const templateInjection = /<div class="settings-section">/;
    if (templateInjection.test(content)) {
      content = content.replace(templateInjection, 
        `$&\\n      <image-grabber-settings></image-grabber-settings>`);
    }
    
    // 注入脚本
    const scriptInjection = /<script>/;
    if (scriptInjection.test(content)) {
      content = content.replace(scriptInjection, 
        `<script>\\nimport ImageGrabberSettings from '../extensions/ai-tavern-image-grabber/admin-component.vue';`);
      
      const componentsInjection = /components:\s*{/;
      if (componentsInjection.test(content)) {
        content = content.replace(componentsInjection, 
          'components: {\\n    ImageGrabberSettings,');
      }
    }
    
    fs.writeFileSync(filePath, content);
    return true;
  }

  injectIntoHtmlFile(content, filePath) {
    if (content.includes('image-grabber-settings')) return false;
    
    // 简单的HTML注入
    const injectionPoint = /<div class="settings-section">/;
    if (injectionPoint.test(content)) {
      content = content.replace(injectionPoint, 
        `$&\\n    <div id="image-grabber-settings"></div>`);
      
      // 添加脚本引用
      const bodyEnd = /<\/body>/;
      if (bodyEnd.test(content)) {
        content = content.replace(bodyEnd, 
          `<script src="/extensions/ai-tavern-image-grabber/admin-integration.js"></script>\\n</body>`);
      }
    }
    
    fs.writeFileSync(filePath, content);
    return true;
  }

  injectIntoJsFile(content, filePath) {
    if (content.includes('ImageGrabberSettings')) return false;
    
    // 在合适的JS文件中添加集成代码
    const integrationCode = `\\n// 图片抓取插件集成\\nimport ImageGrabberSettings from '../extensions/ai-tavern-image-grabber/admin-component.vue';\\n`;
    
    if (content.includes('import')) {
      const lastImport = content.lastIndexOf('import');
      const insertIndex = content.indexOf('\\n', lastImport) + 1;
      content = content.slice(0, insertIndex) + integrationCode + content.slice(insertIndex);
    } else {
      content = integrationCode + content;
    }
    
    fs.writeFileSync(filePath, content);
    return true;
  }

  showManualIntegrationGuide() {
    console.log('\\n📝 手动集成指南:');
    console.log(`
1. 在管理界面的合适位置添加:
   <image-grabber-settings></image-grabber-settings>

2. 引入组件:
   import ImageGrabberSettings from './extensions/ai-tavern-image-grabber/admin-component.vue';

3. 注册组件:
   components: { ImageGrabberSettings }

4. 或使用HTML方式:
   <div id="image-grabber-settings"></div>
   <script src="/extensions/ai-tavern-image-grabber/admin-integration.js"></script>
    `);
  }

  createConfig() {
    console.log('\\n⚙️  创建配置文件...');
    
    const configFile = path.join(this.extensionsDir, 'config.json');
    const defaultConfig = {
      "enabled": true,
      "targetWebsite": "https://www.kchai.org/",
      "imageSelectors": ["img[src*='.jpg']", "img[src*='.png']", "img[src*='.webp']"],
      "excludeKeywords": ["icon", "logo", "ad", "spacer"],
      "insertPosition": "after_first_sentence",
      "maxImageWidth": "400px",
      "requestTimeout": 5000,
      "cacheDuration": 300000,
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
    
    if (!fs.existsSync(configFile)) {
      fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
      console.log('   ✅ 默认配置文件已创建');
    }
  }

  showNextSteps() {
    console.log('\\n🎉 安装完成！接下来:');
    console.log(`
1. 重启云酒馆服务:
   cd "${this.tavernRoot}"
   npm start

2. 访问管理界面配置图片抓取设置

3. 测试功能是否正常工作

4. 如有问题请参考项目README文件
    `);
  }
}

// 运行安装
if (require.main === module) {
  new TavernPluginInstaller().install().catch(console.error);
}

module.exports = TavernPluginInstaller;
