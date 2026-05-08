<div align="center">
  <img src="src/renderer/assets/app-icon.png" alt="i 人朋友圈图标" width="112">
  <h1>i 人朋友圈</h1>
  <p><strong>一个只给自己看的本地私密朋友圈桌面应用</strong></p>
  <p>
    <img alt="platform" src="https://img.shields.io/badge/platform-macOS-555">
    <img alt="runtime" src="https://img.shields.io/badge/built%20with-Electron-2f6651">
    <img alt="storage" src="https://img.shields.io/badge/storage-local%20only-7a4b59">
    <img alt="privacy" src="https://img.shields.io/badge/network-not%20required-376b72">
  </p>
</div>

---

## 界面预览

| 动态流 | 外观设置 |
| --- | --- |
| ![动态流](docs/images/log-timeline.png) | ![外观设置](docs/images/log-appearance.png) |

| 搜索筛选 | 日历回看 |
| --- | --- |
| ![搜索筛选](docs/images/log-search.png) | ![日历回看](docs/images/log-calendar.png) |

<details>
<summary>入口封面</summary>

![登录封面](src/renderer/assets/logincover.png)

</details>

## 功能

- 本地点击进入，不需要账号和密码
- 发布文字、图片、心情、标签和位置
- 支持图片选择、拖拽、复制粘贴和应用内查看
- 动态流、日历视图、月份回看、收藏和回顾
- 点赞、收藏、编辑、删除
- 搜索、心情筛选、标签筛选、日期筛选
- 外观设置：颜色、背景图案、字体和字号
- JSON 导出

## 本地数据

内容和图片都保存在本机应用数据目录，不依赖网络服务。图片会统一复制到应用私有目录，原始文件移动或删除后，已保存日志中的图片仍可查看。

## 开发运行

```bash
npm install
npm start
```

## 测试

```bash
npm test
npm run smoke
```

## 打包 macOS App

```bash
npm run package:mac
```

打包结果会生成在：

```text
release/i 人朋友圈-darwin-arm64/i 人朋友圈.app
```

## 目录

```text
assets/              应用图标资源
docs/images/         README 界面截图
scripts/             图标生成、截图生成与冒烟测试脚本
src/main/            Electron 主进程与本地存储
src/renderer/        前端界面
src/shared/          共享常量
tests/               存储层测试
```
