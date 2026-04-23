# User Guide

English | [简体中文](./guide.zh-CN.md)

This guide covers startup, interaction, shot planning, splat cleanup, and MP4 export. The top-level `README.md` is kept short for project overview and quick start, while this file keeps the full operating notes.

## 1. Overview

`3DGS Viewer` is a browser-based 3D Gaussian Splatting viewer and light editor built on top of `Spark.js` and `Three.js`. The current version focuses on two main workflows:

- Pivot-centered shot planning with MP4 export
- In-browser splat deletion editing with `.ply` save

The project no longer follows a manual "drag camera and record keyframes" workflow. The current planner is built around shot points:

- Double-click the model to set a fixed `Pivot`
- Plan the path with discrete shot points
- Keep every shot point and interpolated frame looking at the `Pivot`
- Use the same sampling logic for `P` preview and MP4 export

## 2. Requirements and Startup

### Requirements

- Chrome or Edge with `WebCodecs` support
- Access the project through an HTTP server instead of opening `index.html` directly

### Example Layout

```text
3dgs-viewer-web/
├── assets/
│   └── demo-zh-CN.gif
├── docs/
│   ├── guide.md
│   ├── guide.zh-CN.md
│   └── images/
├── index.html
├── viewer.js
├── README.md
├── README.zh-CN.md
└── LICENSE
```

### Start the App

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## 3. Recommended Workflow

### 3.1 Load a Model

- The page starts in an empty state and does not auto-load a bundled scene
- Click `Open File` in the left panel or the center empty-state button to choose a local 3DGS file
- You can also drag the model file directly into the page
- Supported formats: `.ply` / `.splat` / `.spz` / `.ksplat`

### 3.2 Navigate the Scene

- Left mouse drag: rotate
- Right mouse drag: pan
- Mouse wheel: dolly
- Arrow keys: adjust view direction

### 3.3 Set the Pivot

- Double-click the model to set the fixed shot `Pivot`
- After that, shot planning, path preview, and export all work around this center
- Regular panning and dollying do not move the `Pivot`

### 3.4 Enter Shot Planner Mode

- Click `Enter Planner`
- No default shot points are created automatically
- In planner mode, press `+` to insert a shot point from the current camera pose

### 3.5 Organize the Camera Path

- Click a shot point to preview that view
- `+`: insert after the selected point, or append when nothing is selected
- `Del`: delete the current shot point
- `C`: clear all shot points
- `P`: preview the full path in order

Notes:

- Playback and export require at least `2` shot points
- All shot points face the center by default
- Interpolated frames between shot points also keep `lookAt(Pivot)`

### 3.6 Export Video

- Configure resolution, FPS, duration, and bitrate in the upper-right panel
- Click `Export MP4`
- Export uses an off-screen rendering path and shares the same shot sampling logic as preview

## 4. Interaction Reference

### 4.1 Navigation

| Action | Result |
| --- | --- |
| Click `Open File` | Choose a local 3DGS model |
| Drag a file into the page | Load a local 3DGS model |
| Left mouse drag | Rotate the camera |
| Right mouse drag | Pan |
| Mouse wheel | Dolly |
| Arrow keys | Rotate / pitch the view |
| `R` + left mouse drag | Orbit around the current center |
| Double-click the model | Set or reset the fixed shot pivot |

### 4.2 Shot Planner

| Action | Result |
| --- | --- |
| `Enter Planner` | Switch into shot planning mode |
| Click a shot point | Select and preview the shot point |
| `+` | Insert a shot point from the current camera pose |
| `Del` | Delete the selected shot point |
| `C` | Clear all shot points |
| `P` | Play / stop path preview |

### 4.3 Editing

| Action | Result |
| --- | --- |
| `E` | Enter / exit edit mode |
| `1` | Picker |
| `2` | Brush |
| Picker left click | Single-point selection |
| Picker left drag | Box selection |
| Brush left drag | Brush selection |
| `Shift` | Add to selection |
| `Ctrl/Cmd` | Subtract from selection |
| `[` / `]` | Change brush radius |
| `Esc` | Clear selection |
| `Del` | Delete selected splats |
| `Ctrl+Z` | Undo deletion |
| `Ctrl+Y` | Redo deletion |
| `Ctrl+S` | Export visible splats as `.ply` |

The meaning of `Del` depends on the current mode:

- In shot planner mode, `Del` deletes a shot point
- In edit mode, `Del` deletes selected splats

## 5. Core Mechanics

### 5.1 Pivot-Centered Shot Planning

The shot system is driven by:

- `shotPivot`: the fixed center point
- `shotPoints`: the array of planned shot points

Each shot point stores a parameterized position instead of a manually edited quaternion:

- `radius`
- `azimuth`
- `height`

The real camera position is computed from `shotPivot + polar coordinates`, and camera orientation is generated through `lookAt(shotPivot)`.

### 5.2 Preview and Export Stay in Sync

Both `P` preview and MP4 export consume the same path derived from the shot points, which keeps:

- The same path order
- The same sampling orientation
- The same framing logic between preview and export

Helper overlays are hidden automatically during export so they do not appear in the video.

### 5.3 Editing and Saving

Deletion editing does not modify the original source file. Instead, the runtime hides selected splats. Saving writes the current visible result into a new `.ply` file.

Typical use cases:

- Remove floating noise
- Trim scene edges
- Save a cleaner presentation version

## 6. Models and Formats

The current version does not depend on a fixed `./model.ply` startup asset. Users choose or drag a local file directly in the page.

Supported 3DGS formats:

- `.ply`
- `.splat`
- `.spz`
- `.ksplat`

After a successful model switch, the app resets shot planning and editing state, then focuses the new model automatically.

## 7. Known Limitations

- The project is still a pure static frontend with no backend
- Only local uploads are supported for now; there is no server storage or URL loading yet
- There is no numeric shot-point editor yet; shot points are still inserted from the current camera pose
- Screenshot and demo assets can still be expanded

## 8. Development Notes

If you plan to extend the project, these are good next steps:

- Add a visible shot-point list with reorder support
- Improve upload progress and error feedback
- Add more README and demo assets
- Introduce a build workflow such as `Vite`
- Split `viewer.js` into navigation, planner, editing, and export modules

## 9. Acknowledgements

- [Spark.js](https://github.com/sparkjsdev/spark)
- [Three.js](https://github.com/mrdoob/three.js)
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer)

## 10. License

This repository is released under the [MIT License](../LICENSE).
