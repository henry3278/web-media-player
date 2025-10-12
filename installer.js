#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TavernPluginInstaller {
  constructor() {
    this.pluginName = 'ai-tavern-image-grabber';
    this.pluginDir = __dirname;
    this.isFixMode = process.argv.includes('--fix');
    this.tavernRoot = this.findTavernRoot();
    this.extensionsDir = this.findExtensionsDir();
  }

  async install() {
    console.log('🚀 AI云酒馆图片抓取插件安装程序\n');
    
    try {
      this.showBanner();
      await this.diagnoseEnvironment();
      
      if (this.isFixMode) {
        await this.fixInstallation();
      } else {
        await this.performInstallation();
      }
      
      console.log('\n✅ 操作完成！');
      this.showNextSteps();
      
    } catch (error) {
      console.error('\n❌ 操作失败:', error.message);
      this.showTroubleshootingTips(error);
      process.exit(1);
    }
  }

  findTavernRoot() {
    console.log('🔍 定位云酒馆根目录...');
    
    let currentDir = this.pluginDir;
    const maxDepth = 10;
    
    for (let i = 0; i < maxDepth; i++) {
      const possibleFiles = ['package.json', 'app.js', 'server.js', 'main.js'];
      const hasProjectFiles = possibleFiles.some(file => 
        fs.existsSync(path.join(currentDir, file))
      );
      
      if (hasProjectFiles) {
        console.log(`   📍 发现项目根目录: ${currentDir}`);
        return currentDir;
      }
      
      if (currentDir === path.dirname(currentDir)) break;
      currentDir = path.dirname(currentDir);
    }
    
    // 使用当前工作目录作为备选
    const fallbackDir = process.cwd();
    console.log(`   ⚠️  使用当前目录: ${fallbackDir}`);
    return fallbackDir;
  }

  findExtensionsDir() {
    console.log('🔍 检测扩展目录结构...');
    
    const possibleLocations = [
      // 标准云酒馆结构
      path.join(this.tavernRoot, 'public', 'scripts', 'extensions', 'third-party', this.pluginName),
      path.join(this.tavernRoot, 'public', 'extensions', this.pluginName),
      path.join(this.tavernRoot, 'extensions', this.pluginName),
      path.join(this.tavernRoot, 'plugins', this.pluginName),
      path.join(this.tavernRoot, 'src', 'extensions', this.pluginName),
      
      // 备用位置
      path.join(this.tavernRoot, 'dist', 'extensions', this.pluginName),
      path.join(this.tavernRoot, 'build', 'extensions', this.pluginName)
    ];
    
    for (const location of possibleLocations) {
      const parentDir = path.dirname(location);
      if (fs.existsSync(parentDir)) {
        console.log(`   📍 使用扩展目录: ${path.relative(this.tavernRoot, location)}`);
        return location;
      }
    }
    
    // 创建默认目录
    const defaultLocation = path.join(this.tavernRoot, 'public', 'scripts', 'extensions', 'third-party', this.pluginName);
    console.log(`   📍 创建默认目录: ${path.relative(this.tavernRoot, defaultLocation)}`);
    return defaultLocation;
  }

  async diagnoseEnvironment() {
    console.log('\n🔧 环境诊断...');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    console.log(`   ✅ Node.js版本: ${nodeVersion}`);
    
    if (parseFloat(nodeVersion.slice(1)) < 14.0) {
      throw new Error('Node.js版本需要14.0或更高');
    }
    
    // 检查关键目录
    const criticalDirs = [
      this.tavernRoot,
      path.dirname(this.extensionsDir)
    ];
    
    for (const dir of criticalDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`   ✅ 创建目录: ${path.relative(this.tavernRoot, dir)}`);
        } else {
          fs.accessSync(dir, fs.constants.W_OK);
          console.log(`   ✅ 目录可写: ${path.relative(this.tavernRoot, dir)}`);
        }
      } catch (error) {
        throw new Error(`目录不可写: ${dir} - ${error.message}`);
      }
    }
    
    // 检查是否已安装
    if (fs.existsSync(this.extensionsDir) && !this.isFixMode) {
      console.log(`   ⚠️  插件已存在: ${path.relative(this.tavernRoot, this.extensionsDir)}`);
      const shouldContinue = await this.promptContinue('是否继续安装（将覆盖现有文件）？');
      if (!shouldContinue) {
        throw new Error('安装已取消');
      }
    }
  }

  async performInstallation() {
    console.log('\n📦 开始安装...');
    
    await this.backupExisting();
    await this.createExtensionStructure();
    await this.copyPluginFiles();
    await this.installDependencies();
    await this.patchMainApplication();
    await this.registerExtension();
    await this.createManifestFile();
    await this.createConfigFile();
    
    console.log('   ✅ 安装步骤完成');
  }

  async fixInstallation() {
    console.log('\n🔧 修复安装...');
    
    if (!fs.existsSync(this.extensionsDir)) {
      throw new Error('扩展目录不存在，请先运行正常安装');
    }
    
    console.log(`   修复目录: ${path.relative(this.tavernRoot, this.extensionsDir)}`);
    
    // 检查并修复关键文件
    const criticalFiles = ['manifest.json', 'grabber.js', 'config.json'];
    let fixedCount = 0;
    
    for (const file of criticalFiles) {
      const filePath = path.join(this.extensionsDir, file);
      if (!fs.existsSync(filePath)) {
        await this.createFile(file, filePath);
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`   ✅ 修复了 ${fixedCount} 个文件`);
    } else {
      console.log('   ✅ 未发现需要修复的文件');
    }
    
    // 重新注册扩展
    await this.registerExtension();
  }

  async backupExisting() {
    if (fs.existsSync(this.extensionsDir)) {
      console.log('\n📦 备份现有文件...');
      
      const backupDir = this.extensionsDir + '.backup.' + Date.now();
      try {
        fs.cpSync(this.extensionsDir, backupDir, { recursive: true });
        console.log(`   ✅ 备份完成: ${path.basename(backupDir)}`);
      } catch (error) {
        console.log(`   ⚠️  备份失败: ${error.message}`);
      }
    }
  }

  async createExtensionStructure() {
    console.log('\n📁 创建扩展结构...');
    
    // 确保所有父目录存在
    const parentDir = path.dirname(this.extensionsDir);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
      console.log(`   ✅ 创建父目录: ${path.relative(this.tavernRoot, parentDir)}`);
    }
    
    // 创建扩展目录
    if (!fs.existsSync(this.extensionsDir)) {
      fs.mkdirSync(this.extensionsDir, { recursive: true });
      console.log(`   ✅ 创建扩展目录: ${path.relative(this.tavernRoot, this.extensionsDir)}`);
    }
    
    // 清理目录（保留配置文件）
    if (fs.existsSync(this.extensionsDir)) {
      try {
        const items = fs.readdirSync(this.extensionsDir);
        const filesToKeep = ['config.json', 'manifest.json'];
        
        for (const item of items) {
          if (!filesToKeep.includes(item)) {
            const itemPath = path.join(this.extensionsDir, item);
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        }
        console.log('   ✅ 目录清理完成');
      } catch (error) {
        console.log(`   ⚠️  清理目录时出错: ${error.message}`);
      }
    }
  }

  async copyPluginFiles() {
    console.log('\n📄 复制插件文件...');
    
    const filesToCopy = [
      'grabber.js',
      'admin-api.js', 
      'admin-integration.js',
      'admin-component.vue'
    ];
    
    for (const file of filesToCopy) {
      await this.copyFile(file, path.join(this.extensionsDir, file));
    }
  }

  async copyFile(sourceFile, targetPath) {
    const sourcePath = path.join(this.pluginDir, sourceFile);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`   ✅ ${sourceFile}`);
    } else {
      console.log(`   ⚠️  源文件不存在: ${sourceFile}`);
    }
  }

  async createFile(fileName, targetPath) {
    const templates = {
      'manifest.json': () => JSON.stringify({
        "name": "ai-tavern-image-grabber",
        "version": "1.1.0",
        "description": "AI云酒馆图片抓取插件",
        "type": "extension",
        "author": "AI云酒馆",
        "entry": "./grabber.js",
        "adminEntry": "./admin-component.vue",
        "config": "./config.json",
        "dependencies": ["axios", "cheerio"],
        "permissions": ["network", "filesystem"],
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
      }, null, 2),
      
      'config.json': () => JSON.stringify({
        "enabled": true,
        "targetWebsite": "https://www.kchai.org/",
        "imageSelectors": ["img[src*='.jpg']", "img[src*='.png']", "img[src*='.webp']"],
        "excludeKeywords": ["icon", "logo", "ad", "spacer"],
        "insertPosition": "after_first_sentence",
        "maxImageWidth": "400px",
        "requestTimeout": 5000,
        "cacheDuration": 300000,
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }, null, 2)
    };
    
    if (templates[fileName]) {
      fs.writeFileSync(targetPath, templates[fileName]());
      console.log(`   ✅ 创建 ${fileName}`);
    } else {
      fs.writeFileSync(targetPath, '');
      console.log(`   ✅ 创建空文件 ${fileName}`);
    }
  }

  async installDependencies() {
    console.log('\n📦 安装依赖...');
    
    const dependencies = ['axios@^1.6.0', 'cheerio@^1.0.0-rc.12'];
    
    for (const dep of dependencies) {
      try {
        console.log(`   安装 ${dep}...`);
        execSync(`cd "${this.tavernRoot}" && npm install ${dep} --save`, {
          stdio: 'inherit',
          timeout: 120000
        });
      } catch (error) {
        console.log(`   ⚠️  安装 ${dep} 失败: ${error.message}`);
      }
    }
  }

  async patchMainApplication() {
    console.log('\n🔧 集成到主程序...');
    
    const mainFiles = this.findMainApplicationFiles();
    
    for (const mainFile of mainFiles) {
      await this.patchFile(mainFile);
    }
    
    if (mainFiles.length === 0) {
      console.log('   ⚠️  未找到主程序文件，需要手动集成');
      this.showManualIntegrationGuide();
    }
  }

  findMainApplicationFiles() {
    const possibleFiles = [
      'app.js', 'server.js', 'index.js', 'main.js',
      'src/app.js', 'src/server.js', 'src/index.js', 'src/main.js',
      'dist/app.js', 'dist/server.js', 'dist/index.js', 'dist/main.js'
    ];
    
    return possibleFiles.filter(file => 
      fs.existsSync(path.join(this.tavernRoot, file))
    );
  }

  async patchFile(filePath) {
    console.log(`   处理文件: ${filePath}`);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // 添加引入语句
      if (!content.includes('ai-tavern-image-grabber')) {
        const importStatement = `\n// AI云酒馆图片抓取插件\nconst imageGrabber = require('./${path.relative(this.tavernRoot, path.join(this.extensionsDir, 'grabber.js'))}');\n`;
        
        if (content.includes('require(')) {
          const lastRequire = content.lastIndexOf('require(');
          const insertIndex = content.indexOf('\n', lastRequire) + 1;
          content = content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
          modified = true;
        }
      }
      
      // 添加API路由
      if (!content.includes('/api/plugins/image-grabber')) {
        const routeStatement = `\n// 图片抓取插件API路由\napp.use('/api/plugins/image-grabber', require('./${path.relative(this.tavernRoot, path.join(this.extensionsDir, 'admin-api.js'))}'));\n`;
        
        if (content.includes('app.use')) {
          const lastAppUse = content.lastIndexOf('app.use(');
          const insertIndex = content.indexOf('\n', lastAppUse) + 1;
          content = content.slice(0, insertIndex) + routeStatement + content.slice(insertIndex);
          modified = true;
        }
      }
      
      if (modified) {
        // 备份原文件
        const backupFile = filePath + '.backup.' + Date.now();
        fs.copyFileSync(filePath, backupFile);
        
        fs.writeFileSync(filePath, content);
        console.log(`   ✅ 成功修改 ${path.basename(filePath)}`);
      } else {
        console.log(`   ⚠️  ${path.basename(filePath)} 无需修改`);
      }
      
    } catch (error) {
      console.log(`   ❌ 修改 ${filePath} 失败: ${error.message}`);
    }
  }

  async registerExtension() {
    console.log('\n📝 注册扩展...');
    
    const registryFiles = this.findRegistryFiles();
    
    for (const registryFile of registryFiles) {
      await this.updateRegistry(registryFile);
    }
    
    if (registryFiles.length === 0) {
      console.log('   ⚠️  未找到扩展注册文件');
    }
  }

  findRegistryFiles() {
    const possibleFiles = [
      'extensions.json',
      'plugins.json',
      'extension-registry.json',
      'src/config/extensions.json',
      'config/plugins.json',
      'public/scripts/extensions/manifest.json'
    ];
    
    return possibleFiles.filter(file => 
      fs.existsSync(path.join(this.tavernRoot, file))
    );
  }

  async updateRegistry(registryPath) {
    try {
      let registry = {};
      if (fs.existsSync(registryPath)) {
        const content = fs.readFileSync(registryPath, 'utf8');
        registry = JSON.parse(content);
      }
      
      const extensionInfo = {
        name: this.pluginName,
        version: "1.1.0",
        enabled: true,
        path: path.relative(this.tavernRoot, this.extensionsDir),
        manifest: "./manifest.json",
        entry: "./grabber.js",
        config: "./config.json"
      };
      
      if (Array.isArray(registry)) {
        // 数组格式的注册表
        const existingIndex = registry.findIndex(ext => ext.name === this.pluginName);
        if (existingIndex >= 0) {
          registry[existingIndex] = extensionInfo;
        } else {
          registry.push(extensionInfo);
        }
      } else {
        // 对象格式的注册表
        registry[this.pluginName] = extensionInfo;
      }
      
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
      console.log(`   ✅ 注册到: ${path.basename(registryPath)}`);
      
    } catch (error) {
      console.log(`   ⚠️  注册到 ${path.basename(registryPath)} 失败: ${error.message}`);
    }
  }

  async createManifestFile() {
    const manifestPath = path.join(this.extensionsDir, 'manifest.json');
    await this.createFile('manifest.json', manifestPath);
  }

  async createConfigFile() {
    const configPath = path.join(this.extensionsDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      await this.createFile('config.json', configPath);
    } else {
      console.log('   ✅ config.json 已存在（保留原配置）');
    }
  }

  async promptContinue(question) {
    return true; // 简化版本，总是继续
  }

  showBanner() {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║           AI云酒馆图片抓取插件               ║
    ║               修复版 v1.1.0                  ║
    ╚══════════════════════════════════════════════╝
    `);
  }

  showNextSteps() {
    console.log('\n🎉 下一步操作:');
    console.log(`
1. 重启云酒馆服务:
   cd "${this.tavernRoot}"
   npm start

2. 访问管理界面配置插件

3. 测试图片抓取功能

4. 如有问题运行修复命令:
   npx github:yourusername/ai-tavern-image-grabber --fix
    `);
  }

  showTroubleshootingTips(error) {
    console.log('\n🔧 故障排除建议:');
    console.log(`
• 检查目录权限: sudo chown -R $USER "${this.tavernRoot}"
• 手动创建manifest.json文件
• 尝试修复模式: npm run fix
• 查看详细日志: 设置 DEBUG=tavern-installer 环境变量
    `);
    
    if (error.message.includes('manifest.json')) {
      console.log('\n📋 Manifest文件问题解决方案:');
      console.log(`
1. 手动创建manifest.json:
   echo '${JSON.stringify({
     "name": "ai-tavern-image-grabber",
     "version": "1.1.0",
     "description": "AI云酒馆图片抓取插件",
     "type": "extension",
     "entry": "./grabber.js"
   }, null, 2)}' > "${path.join(this.extensionsDir, 'manifest.json')}"

2. 重新运行安装程序
      `);
    }
  }

  showManualIntegrationGuide() {
    console.log('\n📝 手动集成指南:');
    console.log(`
1. 在主程序文件顶部添加:
   const imageGrabber = require('./${path.relative(this.tavernRoot, path.join(this.extensionsDir, 'grabber.js'))}');

2. 添加API路由:
   app.use('/api/plugins/image-grabber', require('./${path.relative(this.tavernRoot, path.join(this.extensionsDir, 'admin-api.js'))}'));

3. 在AI回复处理中添加:
   if (imageGrabber.isEnabled()) {
     response = await imageGrabber.addImageToText(response);
   }
    `);
  }
}

// 运行安装
if (require.main === module) {
  new TavernPluginInstaller().install().catch(console.error);
}

module.exports = TavernPluginInstaller;
