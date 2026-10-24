# 课知伴品牌资源

正式名称统一为 **课知伴**，图形使用 2026-10-24 候选方案 **03「同频伙伴」**。

- `symbol.svg`：沿选中图片的双伙伴轮廓提取、平滑后的矢量图形；保留相互呼应的对话形状与中央负空间，去除白底和生成噪点。
- `wordmark.svg`：中文「课知伴」标字，使用 Microsoft YaHei Bold 转曲，不依赖访问者安装字体，也不会出现中文字体加载失败。
- 深蓝 `#143D4D` 与青绿 `#25A596` 取自选中图片。深色背景版本将深蓝部分改为浅色，保留青绿色。

## 生成

在仓库根目录、安装项目依赖后执行：

```sh
node scripts/generate-brand-assets.mjs
pnpm --filter @deeix/desktop exec tauri icon src-tauri/icons/source.png --output src-tauri/icons
pnpm --filter @deeix/web sync:pwa-assets
```

第一步更新网页的四种 Logo、favicon、PWA 图标和桌面图标源，第二步生成桌面各平台图标，第三步刷新 PWA 内容哈希清单。Tauri CLI 默认也会生成 Android/iOS 目录；当前项目只交付桌面客户端，可以不保留这些移动端衍生文件。

`outputs/branding/ke-zhi-ban/brand-preview.png` 是浅色、深色版本的并排预览。

展示名称与产品标字使用「课知伴」。现有仓库 URL、内部包名、数据存储键、应用标识与更新渠道维持兼容。
