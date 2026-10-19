# CourseMate 桌面客户端

客户端基于 Tauri 2，复用 Web 端的《信号与系统》课程、章节实验、AI 助教、信号工作台、快问快答和间隔复习。

## 项目配置

| 项目 | 配置 |
| --- | --- |
| 应用名称 | `CourseMate`；开发版为 `CourseMate Dev` |
| 应用标识 | `io.github.wangxingfan.coursemate` |
| 仓库与下载 | <https://github.com/WangXingFan/CourseMate/releases> |
| 稳定版更新清单 | `https://github.com/WangXingFan/CourseMate/releases/latest/download/latest.json` |
| 测试版更新清单 | `https://github.com/WangXingFan/CourseMate/releases/download/desktop-beta/latest.json` |
| 安装包命名 | `CourseMate-<version>-<os>-<arch>…` |
| Windows 便携版 | `CourseMate/CourseMate.exe`，同目录包含本地服务、`LICENSE` 与 `NOTICE` |
| Windows 组策略 | `SOFTWARE\Policies\CourseMate`；模板位于 [`deploy/windows/policies`](../deploy/windows/policies) |
| 图标 | 书本与信号波形；SVG 源文件位于 [`apps/desktop/src-tauri/icons`](../apps/desktop/src-tauri/icons) |

CourseMate 使用独立的应用标识、MSI 产品标识和更新签名，与原项目的安装、凭据和本地数据目录隔离。不自动迁移原项目的数据。旧桌面 OAuth 客户端 ID 仍由后端兼容，并继续执行相同的回环地址校验。

`@deeix/*` 工作区名称和 Go module 路径作为内部代码命名保留；许可证及原有来源版权声明仍随客户端分发。

客户端复用的 Web 界面同步使用 CourseMate 字标、浏览器/PWA 图标和学习功能介绍。“关于”页面链接到本项目、作者、Issues 和来源声明。

## 构建与下载

按项目规划，编译和测试在 GitHub Actions 执行：

1. 打开 [Desktop Release](https://github.com/WangXingFan/CourseMate/actions/workflows/desktop-release.yml)。
2. 选择需要构建的分支，手动运行工作流。
3. 成功后从该次运行的 Artifacts 下载 Windows x64、macOS arm64/x64 或 Linux x64 安装包。

手动运行只上传构建产物。版本标签会创建 GitHub Release 草稿；发布草稿后，已安装客户端才会收到更新。普通合并到 `dev` 不会自动生成客户端安装包。

本仓库内修改桌面代码或发布工作流的 PR 也会构建四个平台并上传安装包，便于合并前验证；来自外部 Fork 的 PR 不执行需要签名 Secrets 的客户端打包任务。

平台产物：Windows EXE、MSI 与便携 ZIP；macOS DMG；Linux AppImage 与 DEB。包含 WebView2 的离线便携包需要额外配置工作流变量。

自动更新使用 Windows 原始安装程序、Linux 原始 AppImage、macOS 更新 tarball。客户端关闭旧版 Windows ZIP 和 Linux tar.gz 更新兼容功能，避免引入未使用的 ZIP 解包依赖；便携 ZIP 仍通过下载后手动替换更新。

## 签名

更新签名使用 CourseMate 独立密钥，公钥嵌入 `tauri.conf.json`。私钥与密码分别存入仓库的 `TAURI_SIGNING_PRIVATE_KEY`、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` Secrets，不能提交到 Git。

macOS 公证及 Windows 代码签名需要另行提供平台证书；未配置时，工作流生成 macOS 临时签名包和 Windows 未签名安装包。更新签名用于校验更新包，不能替代操作系统代码签名。

更多说明见 [客户端 README](../apps/desktop/README.md) 和 [Windows 部署指南](../deploy/windows/README.md)。
