# SwiftResume

模块化、离线优先的中文简历浏览器扩展。简历内容以结构化 JSON 保存，编辑界面与排版模板彼此独立。

## 当前能力

- 教育、技能、项目、工作、荣誉和自定义模块
- 模块增删、复制、隐藏和拖动排序
- A4 实时预览、三档排版密度和自定义强调色
- 预览面板可随时收起或重新展开，收起后自动扩大编辑区域
- IndexedDB 自动保存，JSON 导入和备份
- 多个浏览器页面实时同步，默认开启并可随时关闭
- 设置页可调整同步/保存延迟、导出方式、溢出提示和预览缩放
- 浏览器内 Typst/WASM 中文 PDF 导出，失败时自动使用打印方案

## 本地开发

```bash
npm install
npm run dev
```

## 加载扩展

```bash
npm run build
```

然后在 Chrome 或 Edge 的扩展管理页面启用开发者模式，选择“加载已解压的扩展”，加载 `dist` 目录。

Typst、WASM 和中文字体都会打包进 `dist`，运行和导出时不依赖远程服务。

内置中文字体为 Noto Sans CJK SC，采用 SIL Open Font License 1.1；许可证保存在 `public/fonts/LICENSE-NOTO-SANS-CJK.txt`。
