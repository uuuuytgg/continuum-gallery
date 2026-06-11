<div align="center">

# Continuum Gallery

把照片从相册列表，推向一个会呼吸的粒子空间。

[简体中文](README.md) · [English](README.en.md)

[在线体验](https://uuuuytgg.github.io/continuum-gallery/) ·
[宣传页](https://uuuuytgg.github.io/continuum-gallery/promo.html) ·
[更新日志](CHANGELOG.md)

<br>

<img src="assets/promo/sphere.png" alt="Continuum Gallery 日间粒子球态" width="100%">

</div>

## 项目定位

Continuum Gallery 是一个可以直接部署到 GitHub Pages 的沉浸式静态相册。它保留普通相册的浏览效率，同时把照片带入球形滑动、粒子球态、日夜主题、Google Photos 导入和可选手势控制组成的完整视觉系统。

宣传页负责展示项目气质和发布叙事；Gallery 本体负责真实交互体验。两者共用同一套最新截图、视觉语言和版本说明。

## 入口

| 入口 | 用途 |
| --- | --- |
| [打开 Gallery](https://uuuuytgg.github.io/continuum-gallery/) | 直接体验相册、模式切换、主题切换与手势入口 |
| [查看宣传页](https://uuuuytgg.github.io/continuum-gallery/promo.html) | 了解视觉方向、功能亮点和发布叙事 |
| [阅读更新日志](CHANGELOG.md) | 查看大版本变化、修复项和验证记录 |
| [English README](README.en.md) | 独立英文文档，不与默认中文首页混排 |

## 视觉预览

<table>
  <tr>
    <td width="50%">
      <img src="assets/promo/waterfall.png" alt="瀑布流模式">
      <br>
      <sub>瀑布流：快速浏览完整照片集。</sub>
    </td>
    <td width="50%">
      <img src="assets/promo/orbit.png" alt="球形滑动模式">
      <br>
      <sub>球形滑动：预览球与整体粒子流场一起移动。</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="assets/promo/sphere.png" alt="日间粒子球态">
      <br>
      <sub>日间粒子球：暖纸背景与克莱因蓝粒子。</sub>
    </td>
    <td width="50%">
      <img src="assets/promo/night.png" alt="夜间粒子球态">
      <br>
      <sub>夜间粒子球：锁定原版深蓝科幻场域。</sub>
    </td>
  </tr>
</table>

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 三种浏览形态 | 瀑布流、球形滑动、粒子球态，对应阅读、游移、沉浸三种使用状态 |
| WebGL 粒子系统 | 粒子会参与模式切换、滑动尾流和球态聚合，不只是静态背景贴图 |
| 日夜主题 | 日间使用暖纸与克莱因蓝；夜间保留深蓝、低照度、科幻感更强的原版方向 |
| Google Photos Picker | 在浏览器内选择照片，以只读 scope 导入预览 |
| 本地预览缓存 | 支持 IndexedDB 缓存导入后的预览资源，减少重复加载 |
| 可选手势交互 | MediaPipe Hands 支持 V、拇指、握拳三类手势控制 |
| 纯静态部署 | 只有 HTML、CSS、JavaScript，不需要构建流程或后端服务 |

## 三种模式

| 模式 | 体验重点 |
| --- | --- |
| 瀑布流 | 最接近传统相册，用于快速扫描与打开单张照片 |
| 球形滑动 | 圆形预览图漂浮在统一粒子流场前方，拖拽时背景产生延迟、尾流和能量变化 |
| 粒子球态 | 照片分布在发光粒子球表面，蓝白粒子聚成一个更明确的数字天体 |

## 控制方式

| 操作 | 效果 |
| --- | --- |
| 底部模式按钮 | 在瀑布流、球形滑动、粒子球态之间切换 |
| 拖拽画面 | 在球形滑动和粒子球态中移动视角 |
| 滚轮 | 在滑动模式中横向浏览 |
| `Ctrl + 滚轮` | 快速切换模式 |
| 顶部日夜按钮 | 在日间主题和夜间主题之间切换，并保留当前模式 |
| 顶部手势按钮 | 开启或关闭浏览器内手势识别 |

## 手势交互

手势识别通过 MediaPipe Hands 在浏览器本地运行。为降低误触，项目不再使用手掌横移切换模式，而是改成更明确的三类手势。

| 手势 | 动作 |
| --- | --- |
| `V` | 切换到下一档模式 |
| 大拇指 | 返回上一档模式 |
| 握拳 | 模拟鼠标拖拽 |

切换动画期间会降低手势推理压力，把更多渲染预算留给粒子重组和照片布局过渡。

## Google Photos 配置

1. 打开 Google Cloud Console。
2. 启用 Google Photos Picker API。
3. 创建 OAuth 2.0 Web Client ID。
4. 在 Authorized JavaScript origins 中加入 `https://uuuuytgg.github.io`。
5. 打开部署后的 Gallery。
6. 点击顶部 `Photos`，填入 Client ID，保存后选择照片。

请求 scope：

```text
https://www.googleapis.com/auth/photospicker.mediaitems.readonly
```

导入后的媒体会以浏览器对象 URL 的形式用于本地预览；浏览器支持时，会写入 IndexedDB 做预览缓存。

## 本地预览

```bash
python -m http.server 8765
```

打开：

| 页面 | 地址 |
| --- | --- |
| Gallery | http://127.0.0.1:8765/ |
| 宣传页 | http://127.0.0.1:8765/promo.html |

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `index.html` | Gallery 主入口 |
| `styles.css` | Gallery 布局、模式样式和日夜主题 |
| `app.js` | 画廊状态、粒子系统、Google Photos、Viewer、手势控制 |
| `promo.html` / `promo.css` / `promo.js` | 宣传页与发布叙事页面 |
| `assets/promo/` | README 与宣传页共用的项目预览图 |
| `CHANGELOG.md` | 版本记录、修复项和验证记录 |

## 版本重点

当前大版本完成了原版 HTML 闪烁修复、粒子球视觉升级、球形滑动真实粒子交互、手势控制改造、日夜双主题，以及开源发布页和双语 README。完整记录见 [CHANGELOG.md](CHANGELOG.md)。
