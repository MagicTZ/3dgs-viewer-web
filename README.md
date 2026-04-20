# 3DGS Viewer

一个面向 3D Gaussian Splatting 场景的轻量级网页可视化页面，基于 `Spark.js` 与 `Three.js` 构建，支持交互式浏览、关键帧轨迹动画与浏览器端 MP4 导出。

本仓库适合用于：

- 个人 3DGS 模型可视化与展示
- 关键帧相机路径录制与预览
- 浏览器内直接导出漫游视频
- 作为后续可视化功能扩展的基础工程

## 特性

- 基于 `Spark.js` 的 3DGS 模型加载与渲染
- FPS 风格自由视角控制
- 双击模型设置环绕中心
- `R + 左键拖拽` 围绕目标点环绕观察
- 关键帧添加、轨迹预览与播放
- 浏览器端 MP4 导出，无需安装 `ffmpeg`
- 使用 CDN 加载依赖，适合快速部署与分享

## 在线/本地使用

本项目当前是一个纯前端静态页面，最简单的使用方式是将 `index.html` 与模型文件放在同一目录下，通过 HTTP 服务器访问。

### 环境要求

- 浏览器：Chrome 94+ 或 Edge 94+（导出 MP4 需要 WebCodecs）
- 运行方式：需要 HTTP 服务器，不能直接使用 `file://`

### 快速开始

目录示例：

```text
project/
├── index.html
├── model.splat
└── README.md
```

启动本地服务器：

```bash
# Python
python -m http.server 8080

# 或 Node.js
npx serve .
```

然后在浏览器打开 `http://localhost:8080`。

如果你后续要部署到 GitHub Pages，也可以直接把静态文件上传到仓库并启用 Pages，但模型文件体积较大时建议改用外部存储或 Git LFS。

## 仓库结构建议

公开仓库建议至少保留以下文件：

```text
your-3dgs-viewer/
├── index.html
├── README.md
├── LICENSE
└── model.splat            # 可选：示例模型，若体积合适
```

如果你的模型不方便公开，推荐不要直接提交大文件，而是在 `README.md` 中说明模型获取方式，或使用外部链接。

## 基础操作

| 操作 | 功能 |
|------|------|
| 鼠标左键拖拽 | 旋转视角 |
| 鼠标右键拖拽 | 平移 |
| 滚轮 | 前后移动 |
| `WASD` | 方向移动 |
| `Shift` | 加速移动 |
| `Ctrl` | 减速移动 |
| 双击模型 | 设置环绕中心 |
| `R` + 左键拖拽 | 围绕中心环绕 |
| `+` / `=` | 添加关键帧 |
| `P` | 播放/暂停轨迹 |
| `C` | 清除关键帧与轨迹 |

## 关键功能说明

### 1. 环绕浏览

双击模型表面后，可将命中点设置为环绕中心。按住 `R` 并拖拽鼠标左键后，相机会围绕该点平滑旋转，适合聚焦查看局部区域。

### 2. 关键帧与轨迹动画

你可以在任意相机位置按 `+` 添加关键帧。添加至少 2 个关键帧后，页面会生成预览轨迹线；按 `P` 可沿轨迹播放，朝向会在关键帧之间平滑插值。

### 3. 导出 MP4 视频

页面右上角导出面板支持：

- 分辨率：`1080p` / `2K` / `4K`
- 帧率：`1` 到 `120 FPS`
- 时长：`0.5` 到 `300` 秒
- 码率：`1` 到 `100 Mbps`

导出流程：

1. 至少添加 2 个关键帧
2. 设置分辨率、帧率、时长和码率
3. 点击“导出 MP4 视频”
4. 等待浏览器逐帧渲染与编码
5. 自动下载生成的视频文件

说明：

- 导出期间会自动隐藏辅助标记与轨迹线
- 导出分辨率独立于当前窗口大小
- 依赖浏览器的 `WebCodecs` 能力
- `4K` 导出时对浏览器与设备性能要求更高

## 模型文件说明

当前默认加载的模型路径为：

```javascript
const splats = new SplatMesh({
  url: "./model.splat",
});
```

你可以按需改成自己的模型路径，例如：

```javascript
const splats = new SplatMesh({ url: "./your_model.ply" });
const splats = new SplatMesh({ url: "./models/scene.spz" });
const splats = new SplatMesh({ url: "https://example.com/model.ply" });
```

如果模型显示方向不正确，可根据数据来源决定是否保留如下坐标系翻转：

```javascript
splats.quaternion.set(1, 0, 0, 0);
```

你也可以通过位置和缩放参数调整模型显示效果：

```javascript
splats.position.set(0, 0, -5);
splats.scale.setScalar(0.5);
```

## 支持的文件格式

根据 `Spark.js` 当前能力，本项目可支持以下常见格式：

| 格式 | 说明 |
|------|------|
| `.ply` | 原始 gsplat、压缩 gsplat、点云等 |
| `.spz` | 压缩格式 |
| `.splat` | 常见 splat 文件格式 |
| `.ksplat` | GaussianSplats3D 相关格式 |
| `.sog` / `.zip` | SOG 压缩格式 |
| `.rad` | Spark LoD 格式 |

具体兼容性请以 `Spark.js` 官方文档为准。

## 二次开发

如果你计划把这个页面继续扩展为更完整的前端项目，可以考虑：

- 将页面逻辑从 `index.html` 中拆分为独立模块
- 使用 `Vite` 管理依赖与构建流程
- 加入更完整的 UI 面板与模型配置项
- 支持多模型切换、参数保存与分享链接
- 接入你自己的模型管理或可视化平台

使用 `NPM` 集成时，可安装：

```bash
npm install three @sparkjsdev/spark
```

## 来源与致谢

本项目是基于以下开源项目构建的独立实现：

- [Spark.js](https://github.com/sparkjsdev/spark)
- [Three.js](https://github.com/mrdoob/three.js)
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer)

说明：

- 本仓库不是 `Spark.js` 官方项目
- 当前页面逻辑为基于上述库的自定义实现
- 如果你后续直接引入、改写了其他开源仓库中的代码，建议在本节继续补充原项目地址与许可证说明

## 常见问题

### 页面打开是空白的

- 确认你是通过 HTTP 服务器访问，而不是直接双击打开文件
- 打开浏览器开发者工具查看控制台错误
- 确认模型文件路径与文件名正确

### 模型加载很慢

- `.splat` 文件可能较大，建议改用压缩格式
- 可以先尝试更小的示例模型验证流程

### 无法导出 MP4

- 请确认浏览器支持 `WebCodecs`
- 建议使用最新版 Chrome 或 Edge

### 双击模型没有反应

- 请先确认模型已完成加载
- 可在浏览器控制台查看是否输出“加载完成”日志

## License

本仓库采用 [MIT License](./LICENSE)。

如果你在此基础上加入了受其他许可证约束的代码或资源，请同时遵守相应上游项目的许可证要求。
