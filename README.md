# i 人朋友圈

一个只给自己看的本地私密朋友圈桌面应用。内容和图片都保存在本机应用数据目录，不依赖网络服务。

## 界面预览

![登录封面](src/renderer/assets/logincover.png)

![应用图标](src/renderer/assets/app-icon.png)

## 功能

- 本地点击进入
- 发布文字、图片、心情、标签和位置
- 动态流、日历视图、月份回看、收藏和回顾
- 点赞、收藏、编辑、删除
- 搜索、心情筛选、标签筛选、日期筛选
- 四套颜色风格
- JSON 导出

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
scripts/             图标生成与冒烟测试脚本
src/main/            Electron 主进程与本地存储
src/renderer/        前端界面
src/shared/          共享常量
tests/               存储层测试
```
