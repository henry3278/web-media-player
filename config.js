// 图片抓取插件配置文件
// 修改后需要重启云酒馆服务生效

module.exports = {
  // 启用/禁用插件
  enabled: true,
  
  // 目标网站URL
  targetWebsite: "https://www.kchai.org/",
  
  // 图片选择器 (支持简单CSS选择器)
  imageSelectors: [
    "img",                    // 所有图片
    "img[src*='.jpg']",       // JPG图片
    "img[src*='.png']",       // PNG图片
    "img[src*='.webp']"       // WebP图片
  ],
  
  // 排除关键词 (不抓取包含这些关键词的图片)
  excludeKeywords: [
    "icon", "logo", "ad", "spacer", "pixel",
    "avatar", "thumbnail", "placeholder"
  ],
  
  // 图片插入位置
  // after_first_sentence: 第一个句子后
  // beginning: 文本开头  
  // end: 文本末尾
  insertPosition: "after_first_sentence",
  
  // 最大图片宽度
  maxImageWidth: "400px",
  
  // 请求超时时间 (毫秒)
  requestTimeout: 5000,
  
  // 缓存时间 (毫秒)
  cacheDuration: 300000,
  
  // User-Agent
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  
  // 调试模式
  debug: false,
  
  // 高级配置 (一般无需修改)
  advanced: {
    // 每页最大图片数量
    maxImagesPerPage: 50,
    
    // 最小图片尺寸 (像素)
    minImageSize: 100,
    
    // 重试次数
    retryAttempts: 2,
    
    // 启用备用图片
    enableFallback: false,
    
    // 备用图片URL
    fallbackImage: ""
  }
};

// 配置示例说明:
/*
// 更换目标网站示例:
targetWebsite: "https://example.com/photos",

// 更严格的图片过滤示例:
excludeKeywords: ["icon", "logo", "ad", "small", "thumb"],

// 只在文本末尾插入图片:
insertPosition: "end",

// 启用调试模式查看详细日志:
debug: true,
*/
