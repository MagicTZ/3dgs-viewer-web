import * as THREE from "three";
import { SparkControls, SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

const HIGHLIGHT_RGB = [255, 196, 64];
const PICK_THRESHOLD_PX = 12;
const BRUSH_APPLY_INTERVAL_MS = 50;
const HISTORY_LIMIT = 50;
const ORBIT_SPEED = 0.005;
const ORBIT_TRANSITION_SPEED = 1.0;
const LOOK_SPEED = 0.004;
const KEYBOARD_LOOK_SPEED = 1.8;
const HIDDEN_SPLAT_SCALE = 1e-5;
const SH_C0 = 0.28209479177387814;
const WHEEL_DOLLY_FACTOR = 0.035;
const WHEEL_DOLLY_MIN_STEP = 0.015;
const WHEEL_DOLLY_MAX_UNITS = 2.0;
const SHOT_MIN_RADIUS = 0.08;
const SHOT_PATH_COLOR = 0x7cf6c7;
const SHOT_POINT_COLOR = 0x71cdff;
const SHOT_POINT_SELECTED_COLOR = 0xffc857;
const SHOT_PIVOT_COLOR = 0x58f0ff;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const SHOT_PICK_SCREEN_RADIUS_PX = 22;
const MODEL_FILE_EXTENSIONS = new Set(["ply", "splat", "spz", "ksplat"]);
const UI_CANVAS_FONT_FAMILY = '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Noto Sans SC", sans-serif';

const EXPORT_RESOLUTIONS = {
  "1080": { width: 1920, height: 1080 },
  "2160": { width: 2560, height: 1440 },
  "4320": { width: 3840, height: 2160 }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 1000);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

const shotHelperRoot = new THREE.Group();
scene.add(shotHelperRoot);

const crosshairEl = document.getElementById("crosshair");
const selectionRectEl = document.getElementById("selectionRect");
const brushCursorEl = document.getElementById("brushCursor");
const viewGizmoEl = document.getElementById("viewGizmo");
const languageButtons = Array.from(document.querySelectorAll(".languageBtn"));
const translatableElements = Array.from(document.querySelectorAll("[data-i18n]"));
const modelInputEl = document.getElementById("modelInput");
const emptyStateEl = document.getElementById("emptyState");
const emptyStateTextEl = document.getElementById("emptyStateText");
const emptyStateOpenBtn = document.getElementById("emptyStateOpenBtn");
const dragOverlayEl = document.getElementById("dragOverlay");
const kfCountEl = document.getElementById("kfCount");
const playStatusEl = document.getElementById("playStatus");

const openModelBtn = document.getElementById("openModelBtn");
const modelStatusLabelEl = document.getElementById("modelStatusLabel");
const modelNameLabelEl = document.getElementById("modelNameLabel");
const modelHintEl = document.getElementById("modelHint");

const resSelect = document.getElementById("resSelect");
const fpsInput = document.getElementById("fpsInput");
const durationInput = document.getElementById("durationInput");
const bitrateInput = document.getElementById("bitrateInput");
const exportBtn = document.getElementById("exportBtn");
const exportProgress = document.getElementById("exportProgress");
const exportProgressBar = document.getElementById("exportProgressBar");
const exportStatusEl = document.getElementById("exportStatus");
const exportFrameInfo = document.getElementById("exportFrameInfo");

const toggleEditBtn = document.getElementById("toggleEditBtn");
const resetViewBtn = document.getElementById("resetViewBtn");
const toolButtons = Array.from(document.querySelectorAll(".toolBtn"));
const radiusLabelEl = document.getElementById("radiusLabel");
const radiusInput = document.getElementById("radiusInput");
const editHintEl = document.getElementById("editHint");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const deleteSelectionBtn = document.getElementById("deleteSelectionBtn");
const cleanupScalePercentileInput = document.getElementById("cleanupScalePercentileInput");
const cleanupMinScaleRatioInput = document.getElementById("cleanupMinScaleRatioInput");
const cleanupNeighborRadiusInput = document.getElementById("cleanupNeighborRadiusInput");
const cleanupMinNeighborsInput = document.getElementById("cleanupMinNeighborsInput");
const cleanupOpacityFloorInput = document.getElementById("cleanupOpacityFloorInput");
const analyzeFloatersBtn = document.getElementById("analyzeFloatersBtn");
const applyFloaterFilterBtn = document.getElementById("applyFloaterFilterBtn");
const cleanupStatusEl = document.getElementById("cleanupStatus");
const saveSceneBtn = document.getElementById("saveSceneBtn");
const saveStatusEl = document.getElementById("saveStatus");
const activeToolLabelEl = document.getElementById("activeToolLabel");
const selectionCountEl = document.getElementById("selectionCount");
const deletedCountEl = document.getElementById("deletedCount");
const shotPanelEl = document.getElementById("shotPanel");
const shotModeBadgeEl = document.getElementById("shotModeBadge");
const togglePlannerBtn = document.getElementById("togglePlannerBtn");
const insertShotBtn = document.getElementById("insertShotBtn");
const deleteShotBtn = document.getElementById("deleteShotBtn");
const clearShotsBtn = document.getElementById("clearShotsBtn");
const shotHintEl = document.getElementById("shotHint");
const selectedShotLabelEl = document.getElementById("selectedShotLabel");
const shotPointCountEl = document.getElementById("shotPointCount");

const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "3dgs-viewer-language";
const I18N = {
  en: {
    "export.title": "Export Video",
    "export.resolution": "Resolution",
    "export.fps": "Frame Rate (FPS)",
    "export.duration": "Duration (s)",
    "export.bitrate": "Bitrate (Mbps)",
    "export.button": "Export MP4",
    "export.frameInfo": "Frames: {frames} | Output: {width}x{height}",
    "export.status.needTwo": "Create at least 2 shot points first",
    "export.status.unsupportedWebCodecs": "WebCodecs is not supported in this browser. Use Chrome or Edge.",
    "export.status.loadingEncoder": "Loading encoder...",
    "export.status.loadingMuxerFailed": "Failed to load mp4-muxer: {message}",
    "export.status.encoderError": "Encoder error: {message}",
    "export.status.rendering": "Rendering... {current}/{total} ({percent}%)",
    "export.status.compositing": "Compositing video...",
    "export.status.done": "Export complete: {sizeMb} MB, {totalFrames} frames",
    "export.status.failed": "Export failed: {message}",
    "export.error.canvasContext": "Unable to create an export canvas context",
    "info.title": "Quick Controls",
    "info.model.label": "Model",
    "info.model.value": "Open file / Drag and drop / Supports .ply .splat .spz .ksplat",
    "info.navigation.label": "Navigation",
    "info.navigation.value": "Left drag rotate / Right drag pan / Wheel dolly / Arrow keys look / R+Left drag orbit",
    "info.shot.label": "Shots",
    "info.shot.value": "Double-click to set pivot / Preview shot points in planner / + insert / Del delete / C clear / P play",
    "info.edit.label": "Edit",
    "info.edit.value": "E toggle / 1 Picker / 2 Brush / Esc clear / Del delete / Ctrl+Z/Y undo redo",
    "empty.title": "Load a 3DGS Model to Start",
    "empty.openFile": "Open Local File",
    "empty.meta": "Supported formats: .ply / .splat / .spz / .ksplat",
    "drag.title": "Drop the Model Here",
    "drag.subtitle": "Release to load the local 3DGS file immediately",
    "model.title": "Model Loader",
    "model.openFile": "Open File",
    "model.currentStatus": "Current Status:",
    "model.currentModel": "Current Model:",
    "model.notLoaded": "Not loaded",
    "model.status.loading": "Loading",
    "model.status.loaded": "Loaded",
    "model.status.error": "Load failed",
    "model.status.waiting": "Waiting for upload",
    "model.empty.loading": "Loading {name}. Please wait.",
    "model.empty.retry": "{error} Click the button to choose again, or drag another model file into the page.",
    "model.empty.default": "No model loaded. Choose a local file or drag a 3DGS file into the page.",
    "model.error.unsupportedFormat": "Unsupported model format: {name}",
    "model.error.loadFailed": "Failed to load model: {message}",
    "shot.title": "Shot Planner",
    "shot.insert": "Insert (+)",
    "shot.delete": "Delete (Del)",
    "shot.clear": "Clear (C)",
    "shot.current": "Current Shot:",
    "shot.count": "Shot Points:",
    "shot.mode.browse": "Browse",
    "shot.mode.edit": "Editing",
    "shot.mode.planner": "Shot Planner",
    "shot.mode.badge": "Current Mode: {mode}",
    "shot.toggle.enter": "Enter Planner",
    "shot.toggle.exit": "Exit Planner",
    "shot.kfCount": "Shot Points: {count}",
    "shot.noneSelected": "None",
    "shot.pivotLabel": "Pivot",
    "shot.hint.loading": "Model loading. Shot planning is temporarily unavailable.",
    "shot.hint.noModel": "Upload and load a model first.",
    "shot.hint.noPivot": "Double-click the model to set a fixed pivot.",
    "shot.hint.noPoints": "No shot points yet. Press + to insert from the current view. Playback/export requires at least 2 points.",
    "shot.hint.previewReady": "Click a shot point to preview it, or click empty space to clear the selection. + insert, Del delete, P preview.",
    "shot.hint.previewOnePoint": "Click a shot point to preview it. + insert. Playback/export requires at least 2 points.",
    "shot.hint.browse": "Enter planner mode to preview shot points; double-click to reset the pivot.",
    "edit.title": "Splat Editing",
    "edit.resetView": "Reset View",
    "edit.toolPicker": "Picker (1)",
    "edit.toolBrush": "Brush (2)",
    "edit.currentTool": "Active Tool:",
    "edit.selected": "Selected:",
    "edit.deleted": "Deleted:",
    "edit.clearSelection": "Clear Selection (Esc)",
    "edit.undo": "Undo (Ctrl+Z)",
    "edit.redo": "Redo (Ctrl+Y)",
    "edit.deleteSelection": "Delete Selected (Del)",
    "edit.enter": "Enter Edit (E)",
    "edit.exit": "Exit Edit (E)",
    "edit.radius": "Brush Radius (px)",
    "edit.save": "Save .ply (Ctrl+S)",
    "edit.saving": "Saving...",
    "edit.hint.loading": "Model loading. Editing is temporarily unavailable.",
    "edit.hint.noModel": "Upload and load a model first.",
    "edit.hint.plannerActive": "Shot planner is active. Press E to return to editing.",
    "edit.hint.enter": "Press E to enter edit mode. Left click selects, right drag and wheel navigate.",
    "edit.hint.picker": "Click to pick, drag to box-select. Shift adds, Ctrl/Cmd subtracts.",
    "edit.hint.brush": "Left drag to brush-select. [ / ] changes radius. Shift adds, Ctrl/Cmd subtracts.",
    "cleanup.scalePercentile": "Scale Percentile",
    "cleanup.minScaleRatio": "Min Scale Ratio",
    "cleanup.neighborRadius": "Neighbor Radius Ratio",
    "cleanup.minNeighbors": "Min Neighbors",
    "cleanup.opacityFloor": "Opacity Floor",
    "cleanup.analyze": "Analyze Floaters",
    "cleanup.apply": "Apply Filter",
    "cleanup.status.ready": "Ready to analyze floating splats.",
    "cleanup.status.analyzed": "Selected {count} candidates from {largeCount} large splats. Scale >= {scaleThreshold}, radius {radius}.",
    "cleanup.status.none": "No floating-splat candidates found.",
    "cleanup.status.applied": "Filtered {count} floating-splat candidates.",
    "tool.picker": "Picker",
    "tool.brush": "Brush",
    "play.status.stopped": "Paused",
    "play.status.pathUpdated": "Path updated",
    "play.status.needsTwoShots": "At least 2 shot points are required",
    "play.status.playing": "Playing...",
    "play.status.finished": "Playback finished",
    "play.status.progress": "Playing {percent}%",
    "save.error.noVisibleSplats": "No visible splats to save",
    "save.status.noVisibleSplats": "No visible splats to save.",
    "save.status.saving": "Saving... ({count} splats)",
    "save.status.saved": "Saved {count} splats.",
    "save.status.failed": "Save failed: {message}"
  },
  "zh-CN": {
    "export.title": "导出视频",
    "export.resolution": "分辨率",
    "export.fps": "帧率 (FPS)",
    "export.duration": "总时长 (秒)",
    "export.bitrate": "码率 (Mbps)",
    "export.button": "导出 MP4 视频",
    "export.frameInfo": "总帧数: {frames} | 画幅: {width}x{height}",
    "export.status.needTwo": "请先创建至少 2 个镜头点",
    "export.status.unsupportedWebCodecs": "浏览器不支持 WebCodecs，请使用 Chrome 或 Edge",
    "export.status.loadingEncoder": "加载编码器...",
    "export.status.loadingMuxerFailed": "加载 mp4-muxer 失败: {message}",
    "export.status.encoderError": "编码错误: {message}",
    "export.status.rendering": "渲染中... {current}/{total} ({percent}%)",
    "export.status.compositing": "正在合成视频...",
    "export.status.done": "导出完成：{sizeMb} MB，共 {totalFrames} 帧",
    "export.status.failed": "导出失败: {message}",
    "export.error.canvasContext": "无法创建导出画布上下文",
    "info.title": "快捷操作",
    "info.model.label": "模型",
    "info.model.value": "打开文件 / 拖拽加载 / 支持 .ply .splat .spz .ksplat",
    "info.navigation.label": "导航",
    "info.navigation.value": "左拖旋转 / 右拖平移 / 滚轮缩放 / 方向键转向 / R+左拖环绕",
    "info.shot.label": "镜头",
    "info.shot.value": "双击设中心 / 规划模式点位预览 / + 插点 / Del 删点 / C 清空 / P 播放",
    "info.edit.label": "编辑",
    "info.edit.value": "E 切换 / 1 点选 / 2 刷选 / Esc 清选 / Del 删除 / Ctrl+Z/Y 撤销重做",
    "empty.title": "上传一个 3DGS 模型开始",
    "empty.openFile": "打开本地文件",
    "empty.meta": "支持格式：.ply / .splat / .spz / .ksplat",
    "drag.title": "拖拽模型到这里",
    "drag.subtitle": "松开鼠标后立即加载本地 3DGS 文件",
    "model.title": "模型加载",
    "model.openFile": "打开文件",
    "model.currentStatus": "当前状态:",
    "model.currentModel": "当前模型:",
    "model.notLoaded": "未加载",
    "model.status.loading": "加载中",
    "model.status.loaded": "已加载",
    "model.status.error": "加载失败",
    "model.status.waiting": "等待上传",
    "model.empty.loading": "正在加载 {name}，请稍候。",
    "model.empty.retry": "{error} 点击按钮重新选择，或直接拖拽新的模型文件到页面。",
    "model.empty.default": "当前未加载模型。点击按钮选择本地文件，或直接把 3DGS 文件拖到页面中。",
    "model.error.unsupportedFormat": "不支持的模型格式: {name}",
    "model.error.loadFailed": "加载模型失败: {message}",
    "shot.title": "镜头规划",
    "shot.insert": "插点 (+)",
    "shot.delete": "删点 (Del)",
    "shot.clear": "清空 (C)",
    "shot.current": "当前镜头点:",
    "shot.count": "镜头点数量:",
    "shot.mode.browse": "浏览",
    "shot.mode.edit": "删除编辑",
    "shot.mode.planner": "镜头规划",
    "shot.mode.badge": "当前模式: {mode}",
    "shot.toggle.enter": "进入规划",
    "shot.toggle.exit": "退出规划",
    "shot.kfCount": "镜头点: {count}",
    "shot.noneSelected": "未选中",
    "shot.pivotLabel": "中心",
    "shot.hint.loading": "模型加载中，镜头规划暂不可用。",
    "shot.hint.noModel": "请先上传并加载一个模型。",
    "shot.hint.noPivot": "双击模型设置固定镜头中心点。",
    "shot.hint.noPoints": "当前无镜头点，按 + 从当前机位插点。少于 2 个点时无法播放或导出。",
    "shot.hint.previewReady": "点镜头点预览，点空白取消。+ 插点，Del 删点，P 预览。",
    "shot.hint.previewOnePoint": "点镜头点预览，+ 插点。少于 2 个点时无法播放或导出。",
    "shot.hint.browse": "进入规划后点镜头点预览；双击重设中心。",
    "edit.title": "编辑删除",
    "edit.resetView": "重置视角",
    "edit.toolPicker": "点选 (1)",
    "edit.toolBrush": "刷选 (2)",
    "edit.currentTool": "当前工具:",
    "edit.selected": "已选择:",
    "edit.deleted": "已删除:",
    "edit.clearSelection": "清空选择 (Esc)",
    "edit.undo": "撤销 (Ctrl+Z)",
    "edit.redo": "重做 (Ctrl+Y)",
    "edit.deleteSelection": "删除所选 (Del)",
    "edit.enter": "进入编辑 (E)",
    "edit.exit": "退出编辑 (E)",
    "edit.radius": "画笔半径 (px)",
    "edit.save": "保存 .ply (Ctrl+S)",
    "edit.saving": "保存中...",
    "edit.hint.loading": "模型加载中，删除编辑暂不可用。",
    "edit.hint.noModel": "请先上传并加载一个模型。",
    "edit.hint.plannerActive": "镜头规划开启中，按 E 可切回删除编辑。",
    "edit.hint.enter": "按 E 进入编辑。左键选择，右键拖拽与滚轮导航。",
    "edit.hint.picker": "单击选点，拖拽框选。Shift 加选，Ctrl/Cmd 减选。",
    "edit.hint.brush": "左键刷选，[ / ] 调半径。Shift 加选，Ctrl/Cmd 减选。",
    "cleanup.scalePercentile": "尺度分位数",
    "cleanup.minScaleRatio": "最小尺度比例",
    "cleanup.neighborRadius": "邻域半径比例",
    "cleanup.minNeighbors": "最少邻居数",
    "cleanup.opacityFloor": "透明度下限",
    "cleanup.analyze": "分析漂浮球",
    "cleanup.apply": "应用过滤",
    "cleanup.status.ready": "可分析漂浮 splats。",
    "cleanup.status.analyzed": "已从 {largeCount} 个大尺度 splats 中选中 {count} 个候选。尺度 >= {scaleThreshold}，半径 {radius}。",
    "cleanup.status.none": "未发现漂浮 splat 候选。",
    "cleanup.status.applied": "已过滤 {count} 个漂浮 splat 候选。",
    "tool.picker": "点选",
    "tool.brush": "刷选",
    "play.status.stopped": "已停止",
    "play.status.pathUpdated": "路径已更新",
    "play.status.needsTwoShots": "至少需要 2 个镜头点",
    "play.status.playing": "播放中...",
    "play.status.finished": "播放完成",
    "play.status.progress": "播放 {percent}%",
    "save.error.noVisibleSplats": "没有可保存的 splats",
    "save.status.noVisibleSplats": "没有可保存的 splats。",
    "save.status.saving": "正在保存... ({count} splats)",
    "save.status.saved": "已保存 {count} 个 splats。",
    "save.status.failed": "保存失败: {message}"
  }
};

function isSupportedLanguage(language) {
  return Object.prototype.hasOwnProperty.call(I18N, language);
}

function getStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch (_error) {
    return DEFAULT_LANGUAGE;
  }
}

let currentLanguage = getStoredLanguage();

const controls = new SparkControls({ canvas: renderer.domElement });
controls.pointerControls.enable = false;

const raycaster = new THREE.Raycaster();
const orbitTarget = new THREE.Vector3();
const shotPivot = new THREE.Vector3();
const startQuaternion = new THREE.Quaternion();
const tempMatrix = new THREE.Matrix4();
const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempQuatB = new THREE.Quaternion();
const tempColor = new THREE.Color();
const tempVec2A = new THREE.Vector2();
const tempVec2B = new THREE.Vector2();
const tempViewportSize = new THREE.Vector2();

const viewGizmoCtx = viewGizmoEl.getContext("2d");
const VIEW_GIZMO_SIZE = 132;
const VIEW_GIZMO_AXES = [
  { label: "X", color: "#ff5a52", vector: new THREE.Vector3(1, 0, 0) },
  { label: "Y", color: "#6dff4d", vector: new THREE.Vector3(0, 1, 0) },
  { label: "Z", color: "#6f73ff", vector: new THREE.Vector3(0, 0, 1) }
];
const viewGizmoHitTargets = [];
let viewGizmoClickTimer = 0;

const keyframes = [];
let pathLine = null;
let positionCurve = null;
let playing = false;
let playT = 0;
let playLastTime = 0;
let playbackPreviewLockedAspect = false;

let exporting = false;
let hasOrbitTarget = false;
let hasShotPivot = false;
let orbitTransition = 0;
let rKeyDown = false;

const shotState = {
  plannerMode: false,
  points: [],
  selectedIndex: -1,
  hoverIndex: -1,
  pivotExplicit: false,
  sceneRadius: 1,
  helperBaseScale: 0.05,
  helperMinScale: 0.02,
  helperMaxScale: 0.08,
  visuals: [],
  helperVisible: true,
  helperActivated: false
};

const shotPivotMarker = createShotPivotMarker();
shotHelperRoot.add(shotPivotMarker.group);

const editState = {
  ready: false,
  editMode: false,
  activeTool: "picker",
  brushRadiusPx: 24,
  selectionHighlightEnabled: true,
  savingScene: false,
  numSplats: 0,
  worldCenters: null,
  baseCenters: null,
  baseScales: null,
  baseQuaternions: null,
  baseOpacities: null,
  baseColors: null,
  splatData: null,
  selectedMask: null,
  hiddenMask: null,
  selectedCount: 0,
  hiddenCount: 0,
  cleanupCandidateCount: 0,
  cleanupLastStats: null,
  undoStack: [],
  redoStack: [],
  projectionX: null,
  projectionY: null,
  projectionDepth: null,
  projectionVisible: null
};

const pointerState = {
  action: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  selectionMode: "replace",
  lastBrushApplyTime: 0,
  rectVisible: false
};

const keyboardLookState = {
  left: false,
  right: false,
  up: false,
  down: false
};

const modelState = {
  ready: false,
  loading: false,
  activeName: "",
  pendingName: "",
  errorKey: "",
  errorParams: {},
  requestToken: 0,
  dragDepth: 0,
  dragActive: false
};

let splats = null;
const uiMessageState = {
  playStatus: { key: "", params: {} },
  saveStatus: { key: "", params: {} },
  cleanupStatus: { key: "", params: {} },
  exportStatus: { key: "", params: {} }
};

function t(key, params = {}) {
  const dictionary = I18N[currentLanguage] ?? I18N[DEFAULT_LANGUAGE];
  const fallbackDictionary = I18N[DEFAULT_LANGUAGE];
  const template = dictionary[key] ?? fallbackDictionary[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? ""));
}

function setUiMessage(slot, key = "", params = {}) {
  uiMessageState[slot] = { key, params };
  renderUiMessage(slot);
}

function renderUiMessage(slot) {
  const state = uiMessageState[slot];
  const text = state.key ? t(state.key, state.params) : "";

  if (slot === "playStatus") {
    playStatusEl.textContent = text;
  } else if (slot === "saveStatus") {
    saveStatusEl.textContent = text;
  } else if (slot === "cleanupStatus") {
    cleanupStatusEl.textContent = text;
  } else if (slot === "exportStatus") {
    exportStatusEl.textContent = text;
  }
}

function renderAllUiMessages() {
  renderUiMessage("playStatus");
  renderUiMessage("saveStatus");
  renderUiMessage("cleanupStatus");
  renderUiMessage("exportStatus");
}

function updateLanguageButtons() {
  for (const button of languageButtons) {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function applyStaticTranslations() {
  for (const element of translatableElements) {
    element.textContent = t(element.dataset.i18n);
  }
  document.documentElement.lang = currentLanguage;
  updateLanguageButtons();
}

function getModelErrorText() {
  return modelState.errorKey ? t(modelState.errorKey, modelState.errorParams) : "";
}

function renderLocalizedUi() {
  applyStaticTranslations();
  updateShotPivotMarkerLabel();
  updateFrameInfo();
  updateModelUi();
  updateEditUi();
  updateShotUi();
  renderAllUiMessages();
}

function setLanguage(language, { persist = true } = {}) {
  if (!isSupportedLanguage(language)) {
    return;
  }

  currentLanguage = language;
  if (persist) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (_error) {
      // Ignore storage failures and keep the current in-memory language.
    }
  }

  renderLocalizedUi();
}

function isInputFocused() {
  const active = document.activeElement;
  return active && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName);
}

function getModelFileExtension(name = "") {
  const match = /\.([^.]+)$/.exec(name.toLowerCase());
  return match ? match[1] : "";
}

function isSupportedModelFileName(name) {
  return MODEL_FILE_EXTENSIONS.has(getModelFileExtension(name));
}

function isModelInteractionBlocked() {
  return exporting || modelState.loading;
}

function disposeCurrentModel() {
  if (!splats) {
    return;
  }
  scene.remove(splats);
  splats.dispose();
  splats = null;
}

function clearEditState() {
  editState.ready = false;
  editState.editMode = false;
  editState.activeTool = "picker";
  editState.selectionHighlightEnabled = true;
  editState.savingScene = false;
  editState.numSplats = 0;
  editState.worldCenters = null;
  editState.baseCenters = null;
  editState.baseScales = null;
  editState.baseQuaternions = null;
  editState.baseOpacities = null;
  editState.baseColors = null;
  editState.splatData = null;
  editState.selectedMask = null;
  editState.hiddenMask = null;
  editState.selectedCount = 0;
  editState.hiddenCount = 0;
  editState.cleanupCandidateCount = 0;
  editState.cleanupLastStats = null;
  editState.undoStack.length = 0;
  editState.redoStack.length = 0;
  editState.projectionX = null;
  editState.projectionY = null;
  editState.projectionDepth = null;
  editState.projectionVisible = null;
  setUiMessage("saveStatus");
  setUiMessage("cleanupStatus");
}

function clearShotState() {
  shotState.plannerMode = false;
  shotState.points.length = 0;
  shotState.selectedIndex = -1;
  shotState.hoverIndex = -1;
  shotState.pivotExplicit = false;
  shotState.helperActivated = false;
  shotState.helperVisible = true;
  hasShotPivot = false;
  keyframes.length = 0;
  updatePathLine();
  updateShotVisuals();
}

function resetModelBoundState() {
  stopPlayback();
  hasOrbitTarget = false;
  orbitTransition = 0;
  endPointerAction();
  updateBrushCursor();
  clearShotState();
  clearEditState();
}

function setDragOverlayActive(active) {
  modelState.dragActive = active;
  dragOverlayEl.classList.toggle("active", active && !exporting);
}

function updateModelUi() {
  const hasModel = modelState.ready && !!splats;
  const visibleName = modelState.loading && modelState.pendingName
    ? modelState.pendingName
    : (modelState.activeName || t("model.notLoaded"));
  const modelErrorText = getModelErrorText();

  openModelBtn.disabled = isModelInteractionBlocked();
  emptyStateOpenBtn.disabled = isModelInteractionBlocked();

  if (modelState.loading) {
    modelStatusLabelEl.textContent = t("model.status.loading");
  } else if (hasModel) {
    modelStatusLabelEl.textContent = t("model.status.loaded");
  } else if (modelErrorText) {
    modelStatusLabelEl.textContent = t("model.status.error");
  } else {
    modelStatusLabelEl.textContent = t("model.status.waiting");
  }

  modelNameLabelEl.textContent = visibleName;

  if (modelErrorText) {
    modelHintEl.textContent = modelErrorText;
  } else {
    modelHintEl.textContent = "";
  }

  emptyStateEl.hidden = hasModel;
  if (!hasModel) {
    if (modelState.loading) {
      emptyStateTextEl.textContent = t("model.empty.loading", { name: modelState.pendingName });
    } else if (modelErrorText) {
      emptyStateTextEl.textContent = t("model.empty.retry", { error: modelErrorText });
    } else {
      emptyStateTextEl.textContent = t("model.empty.default");
    }
  }

  dragOverlayEl.classList.toggle("active", modelState.dragActive && !exporting);
}

function setModelError(key, params = {}) {
  modelState.loading = false;
  modelState.pendingName = "";
  modelState.errorKey = key;
  modelState.errorParams = params;
  updateModelUi();
  updateEditUi();
  updateShotUi();
}

function applyLoadedModel(mesh, name) {
  resetModelBoundState();
  disposeCurrentModel();

  splats = mesh;
  scene.add(splats);
  alignSplatSceneToWorldUp(mesh);
  const focus = autoFocusMesh(mesh);
  initializeEditing(mesh, focus);
  refreshShotHelperMetricsFromVisibleSplats();

  modelState.ready = true;
  modelState.loading = false;
  modelState.pendingName = "";
  modelState.activeName = name;
  modelState.errorKey = "";
  modelState.errorParams = {};

  updateModelUi();
  updateEditUi();
  updateShotUi();
}

async function loadModelFromFile(file) {
  if (!file || exporting) {
    return;
  }
  if (!isSupportedModelFileName(file.name)) {
    setModelError("model.error.unsupportedFormat", { name: file.name });
    return;
  }

  if (playing) {
    stopPlayback("play.status.stopped");
  }

  const requestToken = modelState.requestToken + 1;
  modelState.requestToken = requestToken;
  modelState.loading = true;
  modelState.pendingName = file.name;
  modelState.errorKey = "";
  modelState.errorParams = {};
  updateModelUi();
  updateEditUi();
  updateShotUi();

  let mesh = null;
  try {
    mesh = new SplatMesh({
      stream: file.stream(),
      streamLength: file.size,
      fileName: file.name
    });
    mesh.quaternion.set(1, 0, 0, 0);
    await mesh.initialized;
  } catch (error) {
    if (mesh) {
      mesh.dispose();
    }
    if (requestToken !== modelState.requestToken) {
      return;
    }
    setModelError("model.error.loadFailed", { message: error.message });
    return;
  }

  if (requestToken !== modelState.requestToken) {
    mesh.dispose();
    return;
  }

  applyLoadedModel(mesh, file.name);
}

function openModelPicker() {
  if (isModelInteractionBlocked()) {
    return;
  }
  modelInputEl.click();
}

function getFirstFile(fileList) {
  if (!fileList || fileList.length === 0) {
    return null;
  }
  return fileList[0] ?? null;
}

function eventHasFiles(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function opacityToLogit(opacity) {
  const clamped = THREE.MathUtils.clamp(opacity, 1e-6, 1 - 1e-6);
  return Math.log(clamped / (1 - clamped));
}

function getSelectionMode(event) {
  if (event && (event.ctrlKey || event.metaKey)) {
    return "subtract";
  }
  if (event && event.shiftKey) {
    return "add";
  }
  return "replace";
}

function toolLabel(tool) {
  if (tool === "brush") return t("tool.brush");
  return t("tool.picker");
}

function normalizeAngle(angle) {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

function disposeSprite(sprite) {
  if (sprite.material.map) {
    sprite.material.map.dispose();
  }
  sprite.material.dispose();
}

function createLineMaterial(color) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createLabelSprite(
  text,
  {
    background = "rgba(26, 38, 48, 0.88)",
    border = "#71cdff",
    color = "#ffffff",
    width = 256,
    height = 128,
    fontSize = 52
  } = {}
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  drawRoundedRect(ctx, 8, 8, width - 16, height - 16, 28);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `700 ${fontSize}px ${UI_CANVAS_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width * 0.5, height * 0.56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 1200;
  return sprite;
}

function createCircleLoop(radius, color, segments = 48) {
  const points = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineLoop(geometry, createLineMaterial(color));
  line.renderOrder = 1100;
  return line;
}

function createShotPivotMarker() {
  const group = new THREE.Group();
  const ring = createCircleLoop(1, SHOT_PIVOT_COLOR, 64);
  const crossGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.18, 0, 0),
    new THREE.Vector3(1.18, 0, 0),
    new THREE.Vector3(0, -1.18, 0),
    new THREE.Vector3(0, 1.18, 0)
  ]);
  const cross = new THREE.LineSegments(crossGeometry, createLineMaterial(SHOT_PIVOT_COLOR));
  cross.renderOrder = 1100;

  const label = createLabelSprite(t("shot.pivotLabel"), {
    background: "rgba(11, 35, 42, 0.92)",
    border: "#58f0ff",
    color: "#dffcff",
    width: 300,
    height: 120,
    fontSize: 42
  });
  label.position.set(0, 1.45, 0);
  label.scale.set(1.55, 0.62, 1);

  group.add(ring, cross, label);
  group.visible = false;
  return { group, label };
}

function updateShotPivotMarkerLabel() {
  const position = shotPivotMarker.label.position.clone();
  const scale = shotPivotMarker.label.scale.clone();
  shotPivotMarker.group.remove(shotPivotMarker.label);
  disposeSprite(shotPivotMarker.label);

  shotPivotMarker.label = createLabelSprite(t("shot.pivotLabel"), {
    background: "rgba(11, 35, 42, 0.92)",
    border: "#58f0ff",
    color: "#dffcff",
    width: 300,
    height: 120,
    fontSize: 42
  });
  shotPivotMarker.label.position.copy(position);
  shotPivotMarker.label.scale.copy(scale);
  shotPivotMarker.group.add(shotPivotMarker.label);
}

function createShotFrustumGeometry() {
  const positions = new Float32Array([
    0, 0, 0, -1, -1, -1,
    0, 0, 0, 1, -1, -1,
    0, 0, 0, 1, 1, -1,
    0, 0, 0, -1, 1, -1,
    -1, -1, -1, 1, -1, -1,
    1, -1, -1, 1, 1, -1,
    1, 1, -1, -1, 1, -1,
    -1, 1, -1, -1, -1, -1
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function createShotPointVisual(index) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 14),
    new THREE.MeshBasicMaterial({
      color: SHOT_POINT_COLOR,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    })
  );
  body.renderOrder = 1100;

  const pickMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 10, 10),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    })
  );
  pickMesh.userData.shotPointIndex = index;

  const label = createLabelSprite(String(index + 1));
  label.position.set(0, 0.62, 0);
  label.scale.set(1.2, 0.58, 1);

  const frustum = new THREE.LineSegments(createShotFrustumGeometry(), createLineMaterial(SHOT_POINT_COLOR));
  frustum.renderOrder = 1085;
  frustum.material.opacity = 0.58;
  frustum.visible = false;

  group.add(frustum, body, pickMesh, label);
  group.visible = false;
  shotHelperRoot.add(group);

  return {
    group,
    body,
    pickMesh,
    label,
    frustum,
    labelText: "",
    selected: false
  };
}

function disposeShotPointVisual(visual) {
  visual.group.removeFromParent();
  visual.body.geometry.dispose();
  visual.body.material.dispose();
  visual.pickMesh.geometry.dispose();
  visual.pickMesh.material.dispose();
  visual.frustum.geometry.dispose();
  visual.frustum.material.dispose();
  disposeSprite(visual.label);
}

function projectWorldToScreen(worldPoint, target = new THREE.Vector2()) {
  tempVecA.copy(worldPoint).project(camera);
  if (!Number.isFinite(tempVecA.x) || !Number.isFinite(tempVecA.y) || !Number.isFinite(tempVecA.z)) {
    return null;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  const width = rect.width || renderer.domElement.clientWidth || innerWidth;
  const height = rect.height || renderer.domElement.clientHeight || innerHeight;
  target.set(
    rect.left + (tempVecA.x * 0.5 + 0.5) * width,
    rect.top + (-tempVecA.y * 0.5 + 0.5) * height
  );
  return target;
}

function getWorldUnitsPerPixel(worldPoint) {
  const viewportHeight = Math.max(renderer.domElement.clientHeight || innerHeight, 1);
  const distance = Math.max(camera.position.distanceTo(worldPoint), 0.1);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const worldHeight = 2 * Math.tan(fov * 0.5) * distance;
  return worldHeight / viewportHeight;
}

function getSelectedOutputResolution() {
  return EXPORT_RESOLUTIONS[resSelect.value] ?? EXPORT_RESOLUTIONS["1080"];
}

function getSelectedOutputAspect() {
  const resolution = getSelectedOutputResolution();
  return resolution.width / resolution.height;
}

function setPlaybackPreviewAspectLocked(locked) {
  playbackPreviewLockedAspect = locked;
  if (exporting) {
    return;
  }
  camera.aspect = locked ? getSelectedOutputAspect() : innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}

function getAspectViewport(aspect, width, height) {
  let viewportWidth = width;
  let viewportHeight = Math.round(width / aspect);

  if (viewportHeight > height) {
    viewportHeight = height;
    viewportWidth = Math.round(height * aspect);
  }

  return {
    x: Math.floor((width - viewportWidth) * 0.5),
    y: Math.floor((height - viewportHeight) * 0.5),
    width: Math.max(1, viewportWidth),
    height: Math.max(1, viewportHeight)
  };
}

function renderSceneFrame() {
  renderer.getSize(tempViewportSize);
  const width = Math.max(Math.round(tempViewportSize.x), 1);
  const height = Math.max(Math.round(tempViewportSize.y), 1);

  if (!playbackPreviewLockedAspect) {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.render(scene, camera);
    return;
  }

  const viewport = getAspectViewport(getSelectedOutputAspect(), width, height);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.clear();
  renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
  renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
}

function writeFlippedRgbaToImageData(sourcePixels, imageData, width, height) {
  const rowBytes = width * 4;
  const targetPixels = imageData.data;
  for (let row = 0; row < height; row += 1) {
    const srcOffset = (height - 1 - row) * rowBytes;
    const dstOffset = row * rowBytes;
    targetPixels.set(sourcePixels.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
  }
}

function jacobiDiagonalizeSymmetric3(matrix) {
  const a = matrix.slice();
  const v = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ];

  for (let iter = 0; iter < 12; iter += 1) {
    let p = 0;
    let q = 1;
    let maxAbs = Math.abs(a[1]);

    if (Math.abs(a[2]) > maxAbs) {
      p = 0;
      q = 2;
      maxAbs = Math.abs(a[2]);
    }
    if (Math.abs(a[5]) > maxAbs) {
      p = 1;
      q = 2;
      maxAbs = Math.abs(a[5]);
    }
    if (maxAbs < 1e-10) {
      break;
    }

    const appIndex = p * 3 + p;
    const aqqIndex = q * 3 + q;
    const apqIndex = p * 3 + q;
    const app = a[appIndex];
    const aqq = a[aqqIndex];
    const apq = a[apqIndex];

    const tau = (aqq - app) / (2 * apq);
    const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    a[appIndex] = app - t * apq;
    a[aqqIndex] = aqq + t * apq;
    a[apqIndex] = 0;
    a[q * 3 + p] = 0;

    for (let r = 0; r < 3; r += 1) {
      if (r === p || r === q) {
        continue;
      }

      const arpIndex = r * 3 + p;
      const arqIndex = r * 3 + q;
      const arp = a[arpIndex];
      const arq = a[arqIndex];
      const nextArp = c * arp - s * arq;
      const nextArq = c * arq + s * arp;

      a[arpIndex] = nextArp;
      a[p * 3 + r] = nextArp;
      a[arqIndex] = nextArq;
      a[q * 3 + r] = nextArq;
    }

    for (let r = 0; r < 3; r += 1) {
      const vrpIndex = r * 3 + p;
      const vrqIndex = r * 3 + q;
      const vrp = v[vrpIndex];
      const vrq = v[vrqIndex];
      v[vrpIndex] = c * vrp - s * vrq;
      v[vrqIndex] = c * vrq + s * vrp;
    }
  }

  return {
    eigenvalues: [a[0], a[4], a[8]],
    eigenvectors: v
  };
}

function estimateSceneUpFromWorldCenters(worldCenters, count) {
  const sampleLimit = Math.min(count, 4096);
  const step = Math.max(1, Math.floor(count / sampleLimit));

  let sampleCount = 0;
  let meanX = 0;
  let meanY = 0;
  let meanZ = 0;

  for (let index = 0; index < count; index += step) {
    const offset = index * 3;
    meanX += worldCenters[offset];
    meanY += worldCenters[offset + 1];
    meanZ += worldCenters[offset + 2];
    sampleCount += 1;
  }

  if (sampleCount < 3) {
    return new THREE.Vector3(0, 1, 0);
  }

  meanX /= sampleCount;
  meanY /= sampleCount;
  meanZ /= sampleCount;

  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;

  for (let index = 0; index < count; index += step) {
    const offset = index * 3;
    const dx = worldCenters[offset] - meanX;
    const dy = worldCenters[offset + 1] - meanY;
    const dz = worldCenters[offset + 2] - meanZ;

    xx += dx * dx;
    xy += dx * dy;
    xz += dx * dz;
    yy += dy * dy;
    yz += dy * dz;
    zz += dz * dz;
  }

  const { eigenvalues, eigenvectors } = jacobiDiagonalizeSymmetric3([
    xx, xy, xz,
    xy, yy, yz,
    xz, yz, zz
  ]);

  let minIndex = 0;
  if (eigenvalues[1] < eigenvalues[minIndex]) {
    minIndex = 1;
  }
  if (eigenvalues[2] < eigenvalues[minIndex]) {
    minIndex = 2;
  }

  const estimatedUp = new THREE.Vector3(
    eigenvectors[minIndex],
    eigenvectors[3 + minIndex],
    eigenvectors[6 + minIndex]
  );

  if (estimatedUp.lengthSq() < 1e-10) {
    return WORLD_UP.clone();
  }

  estimatedUp.normalize();
  if (estimatedUp.dot(camera.up) < 0) {
    estimatedUp.negate();
  }
  return estimatedUp;
}

function estimateSceneUpFromMesh(mesh) {
  const count = mesh.numSplats ?? 0;
  if (count < 3) {
    return WORLD_UP.clone();
  }

  const sampleLimit = Math.min(count, 4096);
  const step = Math.max(1, Math.floor(count / sampleLimit));
  const sampledCenters = new Float32Array(sampleLimit * 3);

  mesh.updateWorldMatrix(true, false);
  const worldMatrix = mesh.matrixWorld.clone();
  let sampleCount = 0;

  mesh.forEachSplat((index, center) => {
    if (sampleCount >= sampleLimit || index % step !== 0) {
      return;
    }

    tempVecA.copy(center).applyMatrix4(worldMatrix);
    const offset = sampleCount * 3;
    sampledCenters[offset] = tempVecA.x;
    sampledCenters[offset + 1] = tempVecA.y;
    sampledCenters[offset + 2] = tempVecA.z;
    sampleCount += 1;
  });

  return estimateSceneUpFromWorldCenters(sampledCenters, sampleCount);
}

function alignSplatSceneToWorldUp(mesh) {
  const estimatedUp = estimateSceneUpFromMesh(mesh);
  const dot = THREE.MathUtils.clamp(estimatedUp.dot(WORLD_UP), -1, 1);
  if (dot > 0.9999) {
    return;
  }

  tempQuat.setFromUnitVectors(estimatedUp, WORLD_UP);
  mesh.quaternion.premultiply(tempQuat);
  mesh.updateWorldMatrix(true, false);
}

function getAdaptiveShotHelperScale(
  worldPoint,
  {
    screenPixels = 14,
    minFactor = 1,
    maxFactor = 1,
    baseFactor = 1
  } = {}
) {
  const scaleFromScreen = getWorldUnitsPerPixel(worldPoint) * screenPixels;
  const minScale = shotState.helperMinScale * minFactor;
  const maxScale = shotState.helperMaxScale * maxFactor;
  const baseScale = Math.max(scaleFromScreen, shotState.helperBaseScale * baseFactor);
  return THREE.MathUtils.clamp(baseScale, minScale, maxScale);
}

function updateShotHelperMetricsFromSize(size) {
  shotState.sceneRadius = Math.max(size.length() * 0.5, 0.5);
  shotState.helperMinScale = Math.max(shotState.sceneRadius * 0.012, 0.014);
  shotState.helperBaseScale = Math.max(shotState.sceneRadius * 0.02, shotState.helperMinScale * 1.2);
  shotState.helperMaxScale = Math.max(shotState.sceneRadius * 0.042, shotState.helperBaseScale * 1.75);
}

function getAdaptiveShotMarkerOpacity(
  worldPoint,
  worldRadius,
  {
    selected = false,
    hovered = false
  } = {}
) {
  const distance = camera.position.distanceTo(worldPoint);
  const nearDistance = Math.max(shotState.sceneRadius * 0.2, 0.18);
  const farDistance = Math.max(shotState.sceneRadius * 0.85, nearDistance + 0.12);
  const distanceFactor = THREE.MathUtils.clamp(
    (distance - nearDistance) / Math.max(farDistance - nearDistance, 1e-6),
    0,
    1
  );

  const unitsPerPixel = Math.max(getWorldUnitsPerPixel(worldPoint), 1e-6);
  const screenRadiusPx = worldRadius / unitsPerPixel;
  const clearRadiusPx = selected ? 8 : hovered ? 7 : 6;
  const fadeRadiusPx = selected ? 26 : hovered ? 24 : 22;
  const screenFactor = THREE.MathUtils.clamp(
    (fadeRadiusPx - screenRadiusPx) / Math.max(fadeRadiusPx - clearRadiusPx, 1e-6),
    0,
    1
  );

  const visibilityFactor = Math.min(distanceFactor, screenFactor);
  const minOpacity = selected ? 0.42 : hovered ? 0.34 : 0.22;
  const maxOpacity = selected ? 0.9 : hovered ? 0.76 : 0.62;
  return THREE.MathUtils.lerp(minOpacity, maxOpacity, visibilityFactor);
}

function setShotHoverIndex(index) {
  const nextIndex = index >= 0 && index < shotState.points.length ? index : -1;
  if (shotState.hoverIndex === nextIndex) {
    return;
  }
  shotState.hoverIndex = nextIndex;
  updateShotVisuals();
}

function updateBrushCursor(clientX = null, clientY = null) {
  const visible = editState.editMode && editState.activeTool === "brush" && clientX !== null && clientY !== null && !exporting;
  if (!visible) {
    brushCursorEl.style.display = "none";
    return;
  }
  const size = editState.brushRadiusPx * 2;
  brushCursorEl.style.width = `${size}px`;
  brushCursorEl.style.height = `${size}px`;
  brushCursorEl.style.left = `${clientX}px`;
  brushCursorEl.style.top = `${clientY}px`;
  brushCursorEl.style.display = "block";
}

function getShotPointPosition(shotPoint, target = new THREE.Vector3()) {
  target.set(
    shotPivot.x + Math.cos(shotPoint.azimuth) * shotPoint.radius,
    shotPivot.y + shotPoint.height,
    shotPivot.z + Math.sin(shotPoint.azimuth) * shotPoint.radius
  );
  return target;
}

function getShotPointQuaternion(position, target = new THREE.Quaternion()) {
  const lookAtMatrix = new THREE.Matrix4().lookAt(position, shotPivot, camera.up);
  target.setFromRotationMatrix(lookAtMatrix);
  return target;
}

function getShotPointViewQuaternion(shotPoint, position, target = new THREE.Quaternion()) {
  if (!shotState.pivotExplicit && shotPoint.quaternion instanceof THREE.Quaternion) {
    return target.copy(shotPoint.quaternion);
  }
  return getShotPointQuaternion(position, target);
}

function getPlaybackQuaternionAt(t, position, target = new THREE.Quaternion()) {
  if (shotState.pivotExplicit && hasShotPivot) {
    return getShotPointQuaternion(position, target);
  }

  if (keyframes.length === 0) {
    return target.copy(camera.quaternion);
  }
  if (keyframes.length === 1 || !positionCurve) {
    return target.copy(keyframes[0].quaternion);
  }

  const clampedT = THREE.MathUtils.clamp(t, 0, 1);
  const curveT = typeof positionCurve.getUtoTmapping === "function"
    ? positionCurve.getUtoTmapping(clampedT)
    : clampedT;
  const scaled = curveT * (keyframes.length - 1);
  const index = Math.min(Math.floor(scaled), keyframes.length - 2);
  const localT = THREE.MathUtils.clamp(scaled - index, 0, 1);
  return target.copy(keyframes[index].quaternion).slerp(keyframes[index + 1].quaternion, localT);
}

function stopPlayback(statusKey = "", params = {}) {
  playing = false;
  playT = 0;
  playLastTime = 0;
  setPlaybackPreviewAspectLocked(false);
  setUiMessage("playStatus", statusKey, params);
}

function updateShotLabelVisual(visual, labelText, selected) {
  const nextKey = `${labelText}-${selected ? "selected" : "normal"}`;
  if (visual.labelText === nextKey) {
    return;
  }

  const position = visual.label.position.clone();
  const scale = visual.label.scale.clone();
  visual.group.remove(visual.label);
  disposeSprite(visual.label);

  visual.label = createLabelSprite(labelText, selected
    ? {
        background: "rgba(61, 39, 7, 0.94)",
        border: "#ffc857",
        color: "#fff6da",
        width: 270,
        height: 132,
        fontSize: 58
      }
    : {
        background: "rgba(19, 38, 56, 0.9)",
        border: "#71cdff",
        color: "#eaf9ff",
        width: 240,
        height: 124,
        fontSize: 52
      });

  visual.label.position.copy(position);
  visual.label.scale.copy(scale);
  visual.group.add(visual.label);
  visual.labelText = nextKey;
}

function ensureShotPointVisuals() {
  while (shotState.visuals.length < shotState.points.length) {
    shotState.visuals.push(createShotPointVisual(shotState.visuals.length));
  }
  while (shotState.visuals.length > shotState.points.length) {
    const visual = shotState.visuals.pop();
    disposeShotPointVisual(visual);
  }
}

function areShotHelpersVisible() {
  return shotState.helperVisible && shotState.helperActivated;
}

function revealShotHelpers() {
  if (shotState.helperActivated) {
    return;
  }
  shotState.helperActivated = true;
  updateShotVisuals();
  if (pathLine) {
    pathLine.visible = areShotHelpersVisible() && keyframes.length >= 2;
  }
}

function updateShotVisuals() {
  ensureShotPointVisuals();
  if (shotState.hoverIndex >= shotState.points.length) {
    shotState.hoverIndex = -1;
  }
  const helperVisible = areShotHelpersVisible();

  shotPivotMarker.group.visible = helperVisible && hasShotPivot && shotState.pivotExplicit;
  if (hasShotPivot) {
    const pivotScale = getAdaptiveShotHelperScale(shotPivot, {
      screenPixels: 18,
      minFactor: 1.1,
      maxFactor: 1.22
    });
    shotPivotMarker.group.position.copy(shotPivot);
    shotPivotMarker.group.quaternion.copy(camera.quaternion);
    shotPivotMarker.group.scale.setScalar(pivotScale);
  }

  for (let index = 0; index < shotState.visuals.length; index += 1) {
    const shotPoint = shotState.points[index];
    const visual = shotState.visuals[index];
    const selected = index === shotState.selectedIndex;
    const hovered = shotState.plannerMode && index === shotState.hoverIndex;
    const emphasized = selected || hovered;
    const position = getShotPointPosition(shotPoint, tempVecA);
    const frustumQuaternion = getShotPointViewQuaternion(shotPoint, position, tempQuat);
    const color = selected ? SHOT_POINT_SELECTED_COLOR : SHOT_POINT_COLOR;
    const markerScale = getAdaptiveShotHelperScale(position, {
      screenPixels: selected ? 11 : hovered ? 10 : 9,
      minFactor: selected ? 0.66 : hovered ? 0.62 : 0.58,
      maxFactor: selected ? 0.9 : hovered ? 0.84 : 0.8,
      baseFactor: selected ? 0.5 : hovered ? 0.46 : 0.42
    });
    const frustumScale = getAdaptiveShotHelperScale(position, {
      screenPixels: selected ? 18 : 15,
      minFactor: selected ? 0.7 : 0.62,
      maxFactor: selected ? 0.96 : 0.86,
      baseFactor: selected ? 0.56 : 0.48
    });
    const previewingCurrentPoint = selected
      && camera.position.distanceToSquared(position) <= 1e-8
      && camera.quaternion.angleTo(frustumQuaternion) <= 1e-4;
    const bodyScale = selected ? 1.12 : hovered ? 1.04 : 0.98;
    const labelYOffset = selected ? 0.72 : hovered ? 0.66 : 0.6;

    visual.group.visible = helperVisible && !previewingCurrentPoint;
    if (!visual.group.visible) {
      continue;
    }
    visual.group.position.copy(position);
    visual.group.scale.setScalar(markerScale);

    const markerWorldRadius = 0.22 * markerScale * bodyScale;
    const markerOpacity = getAdaptiveShotMarkerOpacity(position, markerWorldRadius, {
      selected,
      hovered
    });
    visual.body.material.color.setHex(color);
    visual.body.material.opacity = markerOpacity;
    visual.body.scale.setScalar(bodyScale);
    visual.pickMesh.userData.shotPointIndex = index;
    visual.pickMesh.scale.setScalar(selected ? 1.5 : hovered ? 1.35 : 1.2);
    visual.frustum.visible = emphasized;
    visual.frustum.quaternion.copy(frustumQuaternion);
    visual.frustum.material.color.setHex(color);
    visual.frustum.material.opacity = selected ? 0.62 : 0.42;
    const frustumHalfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const frustumHalfWidth = frustumHalfHeight * camera.aspect;
    const frustumDepth = selected ? 1.8 : 1.35;
    const frustumScaleRatio = frustumScale / Math.max(markerScale, 1e-6);
    visual.frustum.scale.set(
      frustumHalfWidth * frustumDepth * frustumScaleRatio,
      frustumHalfHeight * frustumDepth * frustumScaleRatio,
      frustumDepth * frustumScaleRatio
    );

    visual.label.position.set(0, labelYOffset, 0);
    visual.label.scale.set(selected ? 1.22 : hovered ? 1.14 : 1.08, selected ? 0.61 : hovered ? 0.58 : 0.54, 1);
    updateShotLabelVisual(visual, String(index + 1), selected);
  }
}

function setShotHelperVisibility(visible) {
  shotState.helperVisible = visible;
  updateShotVisuals();
  if (pathLine) {
    pathLine.visible = areShotHelpersVisible() && keyframes.length >= 2;
  }
}

function previewShotPoint(index) {
  const frame = keyframes[index];
  if (!frame || !hasShotPivot) {
    return;
  }
  shotState.hoverIndex = -1;
  camera.position.copy(frame.position);
  camera.quaternion.copy(frame.quaternion);
  orbitTarget.copy(shotPivot);
  hasOrbitTarget = true;
}

function selectShotPoint(index, { preview = true } = {}) {
  shotState.hoverIndex = -1;
  if (index < 0 || index >= shotState.points.length) {
    shotState.selectedIndex = -1;
    updateShotVisuals();
    updateShotUi();
    return;
  }

  shotState.selectedIndex = index;
  updateShotVisuals();
  if (preview) {
    previewShotPoint(index);
  }
  updateShotUi();
}

function syncShotPlanner({ previewSelection = false } = {}) {
  if (playing) {
    stopPlayback("play.status.pathUpdated");
  }

  shotState.hoverIndex = -1;
  keyframes.length = 0;
  for (const shotPoint of shotState.points) {
    const position = getShotPointPosition(shotPoint, new THREE.Vector3());
    const quaternion = getShotPointViewQuaternion(shotPoint, position, new THREE.Quaternion());
    keyframes.push({ position, quaternion });
  }

  updatePathLine();
  updateShotVisuals();

  if (previewSelection && shotState.selectedIndex !== -1) {
    previewShotPoint(shotState.selectedIndex);
  }
  if (!shotState.points.length) {
    setUiMessage("playStatus");
  }
  updateShotUi();
}

function setShotPivot(point, { syncOrbit = true, previewSelection = true, revealHelpers = false, explicit = true } = {}) {
  shotPivot.copy(point);
  hasShotPivot = true;
  shotState.pivotExplicit = explicit;
  if (syncOrbit) {
    orbitTarget.copy(point);
    hasOrbitTarget = true;
  }
  if (revealHelpers) {
    revealShotHelpers();
  }
  syncShotPlanner({ previewSelection });
}

function initializeShotPlanner(focus) {
  updateShotHelperMetricsFromSize(focus.size);
  shotState.points.length = 0;
  shotState.selectedIndex = -1;
  shotState.hoverIndex = -1;
  setShotPivot(focus.center, { syncOrbit: true, previewSelection: false, explicit: false });
}

function setPlannerMode(enabled) {
  if (!editState.ready) {
    return;
  }
  shotState.plannerMode = enabled;
  shotState.hoverIndex = -1;
  if (enabled) {
    revealShotHelpers();
  }
  endPointerAction();
  if (enabled && editState.editMode) {
    editState.editMode = false;
    updateBrushCursor();
    updateEditUi();
  }
  if (enabled && shotState.selectedIndex !== -1) {
    previewShotPoint(shotState.selectedIndex);
  }
  updateShotUi();
}

function createShotPointFromCurrentCamera() {
  const offsetX = camera.position.x - shotPivot.x;
  const offsetY = camera.position.y - shotPivot.y;
  const offsetZ = camera.position.z - shotPivot.z;
  const radius = Math.max(SHOT_MIN_RADIUS, Math.hypot(offsetX, offsetZ));

  const shotPoint = {
    radius,
    azimuth: normalizeAngle(Math.atan2(offsetZ, offsetX)),
    height: offsetY
  };

  if (!shotState.pivotExplicit) {
    shotPoint.quaternion = camera.quaternion.clone();
  }

  return shotPoint;
}

function insertShotPoint() {
  if (!hasShotPivot) {
    return;
  }

  revealShotHelpers();

  const points = shotState.points;
  let insertIndex = points.length;
  let nextPoint = createShotPointFromCurrentCamera();

  if (points.length > 0 && shotState.selectedIndex !== -1) {
    insertIndex = shotState.selectedIndex + 1;
  }

  points.splice(insertIndex, 0, nextPoint);
  syncShotPlanner();
  selectShotPoint(insertIndex);
}

function deleteSelectedShotPoint() {
  if (shotState.selectedIndex < 0 || shotState.selectedIndex >= shotState.points.length) {
    return;
  }

  const deletedIndex = shotState.selectedIndex;
  shotState.points.splice(deletedIndex, 1);
  if (!shotState.points.length) {
    shotState.selectedIndex = -1;
    syncShotPlanner();
    return;
  }

  shotState.selectedIndex = Math.min(deletedIndex, shotState.points.length - 1);
  syncShotPlanner({ previewSelection: true });
}

function clearShotPoints() {
  shotState.points.length = 0;
  shotState.selectedIndex = -1;
  syncShotPlanner();
}

function updateShotUi() {
  const hasModel = editState.ready;
  const hasSelection = shotState.selectedIndex >= 0 && shotState.selectedIndex < shotState.points.length;
  const plannerLabel = shotState.plannerMode
    ? t("shot.mode.planner")
    : editState.editMode
      ? t("shot.mode.edit")
      : t("shot.mode.browse");
  const canInsert = hasModel && hasShotPivot;
  const blocked = isModelInteractionBlocked();

  shotPanelEl.classList.toggle("active", shotState.plannerMode);
  shotModeBadgeEl.textContent = t("shot.mode.badge", { mode: plannerLabel });
  togglePlannerBtn.textContent = shotState.plannerMode ? t("shot.toggle.exit") : t("shot.toggle.enter");
  togglePlannerBtn.classList.toggle("active", shotState.plannerMode);
  togglePlannerBtn.disabled = !hasModel || blocked;
  insertShotBtn.disabled = !canInsert || blocked;
  deleteShotBtn.disabled = !hasSelection || blocked;
  clearShotsBtn.disabled = shotState.points.length === 0 || blocked;

  kfCountEl.textContent = t("shot.kfCount", { count: shotState.points.length });
  shotPointCountEl.textContent = String(shotState.points.length);
  selectedShotLabelEl.textContent = hasSelection ? `#${shotState.selectedIndex + 1}` : t("shot.noneSelected");

  if (modelState.loading) {
    shotHintEl.textContent = t("shot.hint.loading");
  } else if (!hasModel) {
    shotHintEl.textContent = t("shot.hint.noModel");
  } else if (!hasShotPivot) {
    shotHintEl.textContent = t("shot.hint.noPivot");
  } else if (shotState.plannerMode) {
    if (shotState.points.length === 0) {
      shotHintEl.textContent = t("shot.hint.noPoints");
    } else if (shotState.points.length >= 2) {
      shotHintEl.textContent = t("shot.hint.previewReady");
    } else {
      shotHintEl.textContent = t("shot.hint.previewOnePoint");
    }
  } else {
    shotHintEl.textContent = t("shot.hint.browse");
  }

  exportBtn.disabled = blocked || shotState.points.length < 2;
}

function updateSelectionRect(clientX, clientY) {
  const left = Math.min(pointerState.startX, clientX);
  const top = Math.min(pointerState.startY, clientY);
  const width = Math.abs(clientX - pointerState.startX);
  const height = Math.abs(clientY - pointerState.startY);
  selectionRectEl.style.left = `${left}px`;
  selectionRectEl.style.top = `${top}px`;
  selectionRectEl.style.width = `${width}px`;
  selectionRectEl.style.height = `${height}px`;
  selectionRectEl.style.display = width > 2 || height > 2 ? "block" : "none";
  pointerState.rectVisible = selectionRectEl.style.display === "block";
}

function hideSelectionRect() {
  selectionRectEl.style.display = "none";
  pointerState.rectVisible = false;
}

function focusCameraOnBounds(center, size) {
  const radius = Math.max(size.length() * 0.5, 0.1);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = radius / Math.sin(fov / 2);

  camera.getWorldDirection(tempVecA);
  camera.position.copy(center).sub(tempVecA.multiplyScalar(fitDistance * 1.2));
  camera.near = Math.max(0.01, fitDistance / 200);
  camera.far = Math.max(1000, fitDistance * 20);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  orbitTarget.copy(center);
  hasOrbitTarget = true;
}

function getVisibleSplatBounds() {
  if (!editState.ready) {
    return null;
  }

  let visibleCount = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.hiddenMask[index]) {
      continue;
    }
    const offset = index * 3;
    const x = editState.worldCenters[offset];
    const y = editState.worldCenters[offset + 1];
    const z = editState.worldCenters[offset + 2];

    sumX += x;
    sumY += y;
    sumZ += z;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
    visibleCount += 1;
  }

  if (visibleCount === 0) {
    return null;
  }

  const center = new THREE.Vector3(sumX / visibleCount, sumY / visibleCount, sumZ / visibleCount);
  const size = new THREE.Vector3(maxX - minX, maxY - minY, maxZ - minZ);
  return { center, size, visibleCount };
}

function refreshShotHelperMetricsFromVisibleSplats() {
  const bounds = getVisibleSplatBounds();
  if (!bounds) {
    return false;
  }

  updateShotHelperMetricsFromSize(bounds.size);
  updateShotVisuals();
  return true;
}

function focusVisibleSplats() {
  const bounds = getVisibleSplatBounds();
  if (!bounds) {
    return false;
  }

  const { center, size } = bounds;
  updateShotHelperMetricsFromSize(size);
  focusCameraOnBounds(center, size);
  updateShotVisuals();

  return true;
}

function getVisibleSplatCount() {
  if (!editState.ready) {
    return 0;
  }
  return editState.numSplats - editState.hiddenCount;
}

function downloadBytes(filename, bytes, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildVisiblePlyBytes() {
  const visibleCount = getVisibleSplatCount();
  if (visibleCount === 0) {
    throw new Error(t("save.error.noVisibleSplats"));
  }

  const header = [
    "ply",
    "format binary_little_endian 1.0",
    "comment saved from 3dgs-viewer-web",
    `element vertex ${visibleCount}`,
    "property float x",
    "property float y",
    "property float z",
    "property float scale_0",
    "property float scale_1",
    "property float scale_2",
    "property float rot_0",
    "property float rot_1",
    "property float rot_2",
    "property float rot_3",
    "property float opacity",
    "property float f_dc_0",
    "property float f_dc_1",
    "property float f_dc_2",
    "end_header\n"
  ].join("\n");

  const headerBytes = new TextEncoder().encode(header);
  const bytesPerSplat = 56;
  const buffer = new ArrayBuffer(headerBytes.length + visibleCount * bytesPerSplat);
  const u8 = new Uint8Array(buffer);
  u8.set(headerBytes, 0);

  const view = new DataView(buffer, headerBytes.length);
  let offset = 0;

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.hiddenMask[index]) {
      continue;
    }

    const vecOffset = index * 3;
    const quatOffset = index * 4;

    view.setFloat32(offset, editState.baseCenters[vecOffset], true);
    offset += 4;
    view.setFloat32(offset, editState.baseCenters[vecOffset + 1], true);
    offset += 4;
    view.setFloat32(offset, editState.baseCenters[vecOffset + 2], true);
    offset += 4;

    view.setFloat32(offset, Math.log(Math.max(editState.baseScales[vecOffset], 1e-6)), true);
    offset += 4;
    view.setFloat32(offset, Math.log(Math.max(editState.baseScales[vecOffset + 1], 1e-6)), true);
    offset += 4;
    view.setFloat32(offset, Math.log(Math.max(editState.baseScales[vecOffset + 2], 1e-6)), true);
    offset += 4;

    view.setFloat32(offset, editState.baseQuaternions[quatOffset + 3], true);
    offset += 4;
    view.setFloat32(offset, editState.baseQuaternions[quatOffset], true);
    offset += 4;
    view.setFloat32(offset, editState.baseQuaternions[quatOffset + 1], true);
    offset += 4;
    view.setFloat32(offset, editState.baseQuaternions[quatOffset + 2], true);
    offset += 4;

    view.setFloat32(offset, opacityToLogit(editState.baseOpacities[index]), true);
    offset += 4;

    view.setFloat32(offset, (editState.baseColors[vecOffset] - 0.5) / SH_C0, true);
    offset += 4;
    view.setFloat32(offset, (editState.baseColors[vecOffset + 1] - 0.5) / SH_C0, true);
    offset += 4;
    view.setFloat32(offset, (editState.baseColors[vecOffset + 2] - 0.5) / SH_C0, true);
    offset += 4;
  }

  return new Uint8Array(buffer);
}

async function saveEditedScene() {
  if (!editState.ready || editState.savingScene) {
    return;
  }

  const visibleCount = getVisibleSplatCount();
  if (visibleCount === 0) {
    setUiMessage("saveStatus", "save.status.noVisibleSplats");
    return;
  }

  editState.savingScene = true;
  setUiMessage("saveStatus", "save.status.saving", { count: visibleCount });
  updateEditUi();

  try {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const plyBytes = buildVisiblePlyBytes();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBytes(`edited_scene_${timestamp}.ply`, plyBytes, "application/octet-stream");
    setUiMessage("saveStatus", "save.status.saved", { count: visibleCount });
  } catch (error) {
    console.error("Failed to save scene:", error);
    setUiMessage("saveStatus", "save.status.failed", { message: error.message });
  } finally {
    editState.savingScene = false;
    updateEditUi();
  }
}

function updateEditUi() {
  toggleEditBtn.textContent = editState.editMode ? t("edit.exit") : t("edit.enter");
  activeToolLabelEl.textContent = toolLabel(editState.activeTool);
  selectionCountEl.textContent = String(editState.selectedCount);
  deletedCountEl.textContent = String(editState.hiddenCount);

  const hasModel = editState.ready;
  const hasVisibleSplats = hasModel && editState.hiddenCount < editState.numSplats;
  const usingRadius = editState.activeTool === "brush";
  const blocked = isModelInteractionBlocked();
  radiusLabelEl.textContent = t("edit.radius");
  toggleEditBtn.disabled = !hasModel || blocked;
  radiusInput.disabled = !hasModel || !usingRadius || blocked;
  resetViewBtn.disabled = !hasVisibleSplats || blocked;
  saveSceneBtn.disabled = !hasVisibleSplats || editState.savingScene || blocked;
  saveSceneBtn.textContent = editState.savingScene ? t("edit.saving") : t("edit.save");

  radiusInput.min = "1";
  radiusInput.step = "1";
  radiusInput.value = String(Math.round(editState.brushRadiusPx));

  for (const button of toolButtons) {
    const isActive = button.dataset.tool === editState.activeTool;
    button.classList.toggle("active", isActive);
    button.disabled = !hasModel || blocked;
  }

  clearSelectionBtn.disabled = !hasModel || editState.selectedCount === 0 || blocked;
  undoBtn.disabled = !hasModel || editState.undoStack.length === 0 || blocked;
  redoBtn.disabled = !hasModel || editState.redoStack.length === 0 || blocked;
  deleteSelectionBtn.disabled = !hasModel || editState.selectedCount === 0 || blocked;
  cleanupScalePercentileInput.disabled = !hasVisibleSplats || blocked;
  cleanupMinScaleRatioInput.disabled = !hasVisibleSplats || blocked;
  cleanupNeighborRadiusInput.disabled = !hasVisibleSplats || blocked;
  cleanupMinNeighborsInput.disabled = !hasVisibleSplats || blocked;
  cleanupOpacityFloorInput.disabled = !hasVisibleSplats || blocked;
  analyzeFloatersBtn.disabled = !hasVisibleSplats || blocked;
  applyFloaterFilterBtn.disabled = !hasVisibleSplats || editState.cleanupCandidateCount === 0 || blocked;

  if (modelState.loading) {
    editHintEl.textContent = t("edit.hint.loading");
  } else if (!hasModel) {
    editHintEl.textContent = t("edit.hint.noModel");
  } else if (shotState.plannerMode) {
    editHintEl.textContent = t("edit.hint.plannerActive");
  } else if (!editState.editMode) {
    editHintEl.textContent = t("edit.hint.enter");
  } else if (editState.activeTool === "picker") {
    editHintEl.textContent = t("edit.hint.picker");
  } else {
    editHintEl.textContent = t("edit.hint.brush");
  }
}

function setActiveTool(tool) {
  editState.activeTool = tool;
  hideSelectionRect();
  updateBrushCursor();
  updateEditUi();
}

function endPointerAction() {
  pointerState.action = null;
  hideSelectionRect();
  crosshairEl.style.display = "none";
}

function setEditMode(enabled) {
  if (enabled && shotState.plannerMode) {
    shotState.plannerMode = false;
  }
  editState.editMode = enabled;
  endPointerAction();
  updateBrushCursor();
  updateEditUi();
  updateShotUi();
}

function autoFocusMesh(mesh) {
  const localBox = mesh.getBoundingBox();
  mesh.updateWorldMatrix(true, false);
  const box = localBox.clone().applyMatrix4(mesh.matrixWorld);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  focusCameraOnBounds(center, size);
  initializeShotPlanner({ box, center, size });

  return { box, center, size };
}

function initializeEditing(mesh, focus) {
  const count = mesh.numSplats;
  const worldCenters = new Float32Array(count * 3);
  const baseCenters = new Float32Array(count * 3);
  const baseScales = new Float32Array(count * 3);
  const baseQuaternions = new Float32Array(count * 4);
  const baseOpacities = new Float32Array(count);
  const baseColors = new Float32Array(count * 3);
  const selectedMask = new Uint8Array(count);
  const hiddenMask = new Uint8Array(count);
  const projectionX = new Float32Array(count);
  const projectionY = new Float32Array(count);
  const projectionDepth = new Float32Array(count);
  const projectionVisible = new Uint8Array(count);
  const splatData = mesh.packedSplats ?? mesh.extSplats ?? mesh.splats ?? null;

  mesh.updateWorldMatrix(true, false);
  const worldMatrix = mesh.matrixWorld.clone();
  mesh.forEachSplat((index, center, scales, quaternion, opacity, color) => {
    const baseOffset = index * 3;
    baseCenters[baseOffset] = center.x;
    baseCenters[baseOffset + 1] = center.y;
    baseCenters[baseOffset + 2] = center.z;
    baseScales[baseOffset] = scales.x;
    baseScales[baseOffset + 1] = scales.y;
    baseScales[baseOffset + 2] = scales.z;
    baseColors[baseOffset] = color.r;
    baseColors[baseOffset + 1] = color.g;
    baseColors[baseOffset + 2] = color.b;

    const quatOffset = index * 4;
    baseQuaternions[quatOffset] = quaternion.x;
    baseQuaternions[quatOffset + 1] = quaternion.y;
    baseQuaternions[quatOffset + 2] = quaternion.z;
    baseQuaternions[quatOffset + 3] = quaternion.w;
    baseOpacities[index] = opacity;

    tempVecA.copy(center).applyMatrix4(worldMatrix);
    worldCenters[baseOffset] = tempVecA.x;
    worldCenters[baseOffset + 1] = tempVecA.y;
    worldCenters[baseOffset + 2] = tempVecA.z;
  });

  editState.ready = true;
  editState.numSplats = count;
  editState.worldCenters = worldCenters;
  editState.baseCenters = baseCenters;
  editState.baseScales = baseScales;
  editState.baseQuaternions = baseQuaternions;
  editState.baseOpacities = baseOpacities;
  editState.baseColors = baseColors;
  editState.splatData = splatData;
  editState.selectedMask = selectedMask;
  editState.hiddenMask = hiddenMask;
  editState.selectedCount = 0;
  editState.hiddenCount = 0;
  editState.cleanupCandidateCount = 0;
  editState.cleanupLastStats = null;
  editState.undoStack.length = 0;
  editState.redoStack.length = 0;
  editState.projectionX = projectionX;
  editState.projectionY = projectionY;
  editState.projectionDepth = projectionDepth;
  editState.projectionVisible = projectionVisible;

  setUiMessage("cleanupStatus", "cleanup.status.ready");
  updateEditUi();
  updateShotUi();
}

function applyVisualStateForIndex(index) {
  if (!editState.splatData) {
    return;
  }

  const vecOffset = index * 3;
  const quatOffset = index * 4;

  tempVecA.set(
    editState.baseCenters[vecOffset],
    editState.baseCenters[vecOffset + 1],
    editState.baseCenters[vecOffset + 2]
  );
  tempVecB.set(
    editState.baseScales[vecOffset],
    editState.baseScales[vecOffset + 1],
    editState.baseScales[vecOffset + 2]
  );
  tempQuat.set(
    editState.baseQuaternions[quatOffset],
    editState.baseQuaternions[quatOffset + 1],
    editState.baseQuaternions[quatOffset + 2],
    editState.baseQuaternions[quatOffset + 3]
  );

  if (!editState.hiddenMask[index] && editState.selectedMask[index] && editState.selectionHighlightEnabled) {
    tempColor.setRGB(HIGHLIGHT_RGB[0] / 255, HIGHLIGHT_RGB[1] / 255, HIGHLIGHT_RGB[2] / 255);
  } else {
    tempColor.setRGB(
      editState.baseColors[vecOffset],
      editState.baseColors[vecOffset + 1],
      editState.baseColors[vecOffset + 2]
    );
  }

  if (editState.hiddenMask[index]) {
    tempVecB.set(HIDDEN_SPLAT_SCALE, HIDDEN_SPLAT_SCALE, HIDDEN_SPLAT_SCALE);
  }

  const opacity = editState.hiddenMask[index] ? 0 : editState.baseOpacities[index];
  editState.splatData.setSplat(index, tempVecA, tempVecB, tempQuat, opacity, tempColor);
}

function syncSplatDataAfterMutation() {
  if (!editState.splatData || !splats) {
    return;
  }

  if (typeof editState.splatData.updateTextures === "function") {
    editState.splatData.updateTextures();
    for (const texture of editState.splatData.textures ?? []) {
      if (texture && texture.image) {
        texture.needsUpdate = true;
      }
    }
  } else {
    editState.splatData.needsUpdate = true;
    if (editState.splatData.source && editState.splatData.source.image) {
      editState.splatData.source.needsUpdate = true;
    }
  }

  splats.needsUpdate = true;
}

function applyVisualChanges(changedIndices) {
  if (!editState.ready || changedIndices.length === 0) {
    return;
  }
  for (const index of changedIndices) {
    applyVisualStateForIndex(index);
  }
  syncSplatDataAfterMutation();
}

function collectSelectedIndices() {
  const indices = [];
  if (!editState.ready || editState.selectedCount === 0) {
    return indices;
  }
  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.selectedMask[index]) {
      indices.push(index);
    }
  }
  return indices;
}

function clearSelection(changedIndices = []) {
  if (!editState.ready || editState.selectedCount === 0) {
    return changedIndices;
  }
  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.selectedMask[index]) {
      editState.selectedMask[index] = 0;
      editState.selectedCount -= 1;
      changedIndices.push(index);
    }
  }
  return changedIndices;
}

function setSelected(index, selected, changedIndices) {
  if (!editState.ready) {
    return;
  }
  if (selected && editState.hiddenMask[index]) {
    return;
  }
  const current = editState.selectedMask[index] === 1;
  if (current === selected) {
    return;
  }
  editState.selectedMask[index] = selected ? 1 : 0;
  editState.selectedCount += selected ? 1 : -1;
  changedIndices.push(index);
}

function commitSelectionChange(changedIndices) {
  editState.cleanupCandidateCount = 0;
  editState.cleanupLastStats = null;
  applyVisualChanges(changedIndices);
  updateEditUi();
}

function hideSplatIndices(indices, type = "delete") {
  const deletedIndices = [];
  for (const index of indices) {
    if (!editState.hiddenMask[index]) {
      if (editState.selectedMask[index]) {
        editState.selectedMask[index] = 0;
        editState.selectedCount -= 1;
      }
      editState.hiddenMask[index] = 1;
      editState.hiddenCount += 1;
      deletedIndices.push(index);
    }
  }

  if (deletedIndices.length === 0) {
    updateEditUi();
    return;
  }

  editState.cleanupCandidateCount = 0;
  editState.cleanupLastStats = null;
  editState.undoStack.push({ type, indices: Uint32Array.from(deletedIndices) });
  if (editState.undoStack.length > HISTORY_LIMIT) {
    editState.undoStack.shift();
  }
  editState.redoStack.length = 0;

  applyVisualChanges(deletedIndices);
  refreshShotHelperMetricsFromVisibleSplats();
  updateEditUi();
}

function deleteSelectedSplats() {
  if (!editState.ready || editState.selectedCount === 0) {
    return;
  }
  hideSplatIndices(collectSelectedIndices());
}

function readCleanupNumber(input, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const rawValue = Number.parseFloat(input.value);
  const parsed = Number.isFinite(rawValue) ? rawValue : fallback;
  const value = integer ? Math.round(parsed) : parsed;
  const clamped = THREE.MathUtils.clamp(value, min, max);
  input.value = integer ? String(clamped) : String(clamped);
  return clamped;
}

function getCleanupSettings() {
  return {
    scalePercentile: readCleanupNumber(cleanupScalePercentileInput, 95, { min: 50, max: 99.9 }),
    minScaleRatio: readCleanupNumber(cleanupMinScaleRatioInput, 0.015, { min: 0, max: 1 }),
    neighborRadiusRatio: readCleanupNumber(cleanupNeighborRadiusInput, 0.01, { min: 0.0001, max: 1 }),
    minNeighbors: readCleanupNumber(cleanupMinNeighborsInput, 20, { min: 0, max: 200, integer: true }),
    opacityFloor: readCleanupNumber(cleanupOpacityFloorInput, 0.02, { min: 0, max: 1 })
  };
}

function formatCleanupNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 100) {
    return value.toFixed(1);
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(3);
  }
  return value.toPrecision(3);
}

function makeGridKey(ix, iy, iz) {
  return `${ix},${iy},${iz}`;
}

function buildVisibleSplatGrid(radius) {
  const grid = new Map();
  const invRadius = 1 / radius;

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.hiddenMask[index]) {
      continue;
    }

    const offset = index * 3;
    const ix = Math.floor(editState.worldCenters[offset] * invRadius);
    const iy = Math.floor(editState.worldCenters[offset + 1] * invRadius);
    const iz = Math.floor(editState.worldCenters[offset + 2] * invRadius);
    const key = makeGridKey(ix, iy, iz);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(index);
  }

  return grid;
}

function countNeighborsWithinRadius(index, grid, radius, minNeighbors) {
  if (minNeighbors <= 0) {
    return 0;
  }

  const radiusSq = radius * radius;
  const invRadius = 1 / radius;
  const offset = index * 3;
  const x = editState.worldCenters[offset];
  const y = editState.worldCenters[offset + 1];
  const z = editState.worldCenters[offset + 2];
  const ix = Math.floor(x * invRadius);
  const iy = Math.floor(y * invRadius);
  const iz = Math.floor(z * invRadius);
  let count = 0;

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const bucket = grid.get(makeGridKey(ix + dx, iy + dy, iz + dz));
        if (!bucket) {
          continue;
        }
        for (const neighborIndex of bucket) {
          if (neighborIndex === index || editState.hiddenMask[neighborIndex]) {
            continue;
          }
          const neighborOffset = neighborIndex * 3;
          const nx = editState.worldCenters[neighborOffset] - x;
          const ny = editState.worldCenters[neighborOffset + 1] - y;
          const nz = editState.worldCenters[neighborOffset + 2] - z;
          if (nx * nx + ny * ny + nz * nz <= radiusSq) {
            count += 1;
            if (count >= minNeighbors) {
              return count;
            }
          }
        }
      }
    }
  }

  return count;
}

function collectVisibleScaleStats() {
  const visibleCount = getVisibleSplatCount();
  const scales = new Float32Array(visibleCount);
  const box = new THREE.Box3();
  let scaleOffset = 0;

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.hiddenMask[index]) {
      continue;
    }

    const vecOffset = index * 3;
    const maxScale = Math.max(
      editState.baseScales[vecOffset],
      editState.baseScales[vecOffset + 1],
      editState.baseScales[vecOffset + 2]
    );
    scales[scaleOffset] = maxScale;
    scaleOffset += 1;
    tempVecA.set(
      editState.worldCenters[vecOffset],
      editState.worldCenters[vecOffset + 1],
      editState.worldCenters[vecOffset + 2]
    );
    box.expandByPoint(tempVecA);
  }

  scales.sort();
  const diagonal = visibleCount > 1 ? box.getSize(tempVecA).length() : 1;
  return { visibleCount, scales, diagonal: Math.max(diagonal, 1e-6) };
}

function analyzeFloatingSplats() {
  if (!editState.ready || getVisibleSplatCount() === 0) {
    return;
  }

  const settings = getCleanupSettings();
  const stats = collectVisibleScaleStats();
  const percentileIndex = Math.min(
    stats.scales.length - 1,
    Math.max(0, Math.floor((settings.scalePercentile / 100) * (stats.scales.length - 1)))
  );
  const percentileScale = stats.scales[percentileIndex] ?? 0;
  const minSceneScale = stats.diagonal * settings.minScaleRatio;
  const scaleThreshold = Math.max(percentileScale, minSceneScale);
  const neighborRadius = Math.max(stats.diagonal * settings.neighborRadiusRatio, scaleThreshold);
  const grid = buildVisibleSplatGrid(neighborRadius);
  const candidates = [];
  let largeCount = 0;

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (editState.hiddenMask[index]) {
      continue;
    }

    const vecOffset = index * 3;
    const maxScale = Math.max(
      editState.baseScales[vecOffset],
      editState.baseScales[vecOffset + 1],
      editState.baseScales[vecOffset + 2]
    );
    if (maxScale < scaleThreshold) {
      continue;
    }

    largeCount += 1;
    const opacity = editState.baseOpacities[index];
    const neighborCount = countNeighborsWithinRadius(index, grid, neighborRadius, settings.minNeighbors);
    const isolated = settings.minNeighbors > 0 && neighborCount < settings.minNeighbors;
    const transparent = settings.opacityFloor > 0 && opacity < settings.opacityFloor;
    if (isolated || transparent) {
      candidates.push(index);
    }
  }

  const changedIndices = clearSelection([]);
  for (const index of candidates) {
    setSelected(index, true, changedIndices);
  }
  editState.cleanupCandidateCount = candidates.length;
  editState.cleanupLastStats = {
    largeCount,
    scaleThreshold,
    neighborRadius
  };
  applyVisualChanges(changedIndices);

  if (candidates.length > 0) {
    setUiMessage("cleanupStatus", "cleanup.status.analyzed", {
      count: candidates.length,
      largeCount,
      scaleThreshold: formatCleanupNumber(scaleThreshold),
      radius: formatCleanupNumber(neighborRadius)
    });
  } else {
    setUiMessage("cleanupStatus", "cleanup.status.none");
  }
  updateEditUi();
}

function applyFloatingSplatFilter() {
  if (!editState.ready || editState.cleanupCandidateCount === 0 || editState.selectedCount === 0) {
    return;
  }

  const candidates = collectSelectedIndices();
  hideSplatIndices(candidates, "floater-filter");
  setUiMessage("cleanupStatus", "cleanup.status.applied", { count: candidates.length });
}

function undoDelete() {
  const action = editState.undoStack.pop();
  if (!action) {
    return;
  }

  editState.cleanupCandidateCount = 0;
  editState.cleanupLastStats = null;
  const changedIndices = [];
  for (const index of action.indices) {
    if (editState.hiddenMask[index]) {
      editState.hiddenMask[index] = 0;
      editState.hiddenCount -= 1;
      changedIndices.push(index);
    }
  }
  editState.redoStack.push(action);
  applyVisualChanges(changedIndices);
  refreshShotHelperMetricsFromVisibleSplats();
  updateEditUi();
}

function redoDelete() {
  const action = editState.redoStack.pop();
  if (!action) {
    return;
  }

  editState.cleanupCandidateCount = 0;
  editState.cleanupLastStats = null;
  const changedIndices = [];
  for (const index of action.indices) {
    if (!editState.hiddenMask[index]) {
      editState.hiddenMask[index] = 1;
      if (editState.selectedMask[index]) {
        editState.selectedMask[index] = 0;
        editState.selectedCount -= 1;
      }
      editState.hiddenCount += 1;
      changedIndices.push(index);
    }
  }
  editState.undoStack.push(action);
  applyVisualChanges(changedIndices);
  refreshShotHelperMetricsFromVisibleSplats();
  updateEditUi();
}

function projectSplatsToScreen() {
  if (!editState.ready) {
    return false;
  }

  const width = renderer.domElement.clientWidth || innerWidth;
  const height = renderer.domElement.clientHeight || innerHeight;

  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  tempMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const e = tempMatrix.elements;

  for (let index = 0; index < editState.numSplats; index += 1) {
    const offset = index * 3;
    const x = editState.worldCenters[offset];
    const y = editState.worldCenters[offset + 1];
    const z = editState.worldCenters[offset + 2];

    const clipX = e[0] * x + e[4] * y + e[8] * z + e[12];
    const clipY = e[1] * x + e[5] * y + e[9] * z + e[13];
    const clipZ = e[2] * x + e[6] * y + e[10] * z + e[14];
    const clipW = e[3] * x + e[7] * y + e[11] * z + e[15];

    if (clipW <= 0) {
      editState.projectionVisible[index] = 0;
      continue;
    }

    const invW = 1 / clipW;
    const ndcX = clipX * invW;
    const ndcY = clipY * invW;
    const ndcZ = clipZ * invW;

    editState.projectionX[index] = (ndcX * 0.5 + 0.5) * width;
    editState.projectionY[index] = (-ndcY * 0.5 + 0.5) * height;
    editState.projectionDepth[index] = ndcZ;
    editState.projectionVisible[index] = ndcZ >= -1 && ndcZ <= 1 ? 1 : 0;
  }

  return true;
}

function selectAtScreenPoint(clientX, clientY, selectionMode) {
  if (!projectSplatsToScreen()) {
    return;
  }

  const changedIndices = [];
  if (selectionMode === "replace") {
    clearSelection(changedIndices);
  }

  let bestIndex = -1;
  let bestDistanceSq = PICK_THRESHOLD_PX * PICK_THRESHOLD_PX;
  let bestDepth = Number.POSITIVE_INFINITY;

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (!editState.projectionVisible[index] || editState.hiddenMask[index]) {
      continue;
    }
    const dx = editState.projectionX[index] - clientX;
    const dy = editState.projectionY[index] - clientY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > bestDistanceSq) {
      continue;
    }
    const depth = editState.projectionDepth[index];
    if (distanceSq < bestDistanceSq || depth < bestDepth) {
      bestIndex = index;
      bestDistanceSq = distanceSq;
      bestDepth = depth;
    }
  }

  if (bestIndex !== -1) {
    setSelected(bestIndex, selectionMode !== "subtract", changedIndices);
  }
  commitSelectionChange(changedIndices);
}

function selectInRectangle(x0, y0, x1, y1, selectionMode) {
  if (!projectSplatsToScreen()) {
    return;
  }

  const changedIndices = [];
  if (selectionMode === "replace") {
    clearSelection(changedIndices);
  }

  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const add = selectionMode !== "subtract";

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (!editState.projectionVisible[index] || editState.hiddenMask[index]) {
      continue;
    }
    const px = editState.projectionX[index];
    const py = editState.projectionY[index];
    if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
      setSelected(index, add, changedIndices);
    }
  }

  commitSelectionChange(changedIndices);
}

function applyBrushSelection(clientX, clientY) {
  if (!editState.ready) {
    return;
  }

  const radiusSq = editState.brushRadiusPx * editState.brushRadiusPx;
  const add = pointerState.selectionMode !== "subtract";
  const changedIndices = [];

  for (let index = 0; index < editState.numSplats; index += 1) {
    if (!editState.projectionVisible[index] || editState.hiddenMask[index]) {
      continue;
    }

    const dx = editState.projectionX[index] - clientX;
    const dy = editState.projectionY[index] - clientY;
    if (dx * dx + dy * dy <= radiusSq) {
      setSelected(index, add, changedIndices);
    }
  }

  commitSelectionChange(changedIndices);
}

function pickShotPoint(event) {
  if (!shotState.visuals.length) {
    return null;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  tempVec2A.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(tempVec2A, camera);
  const pickMeshes = shotState.visuals.map((visual) => visual.pickMesh);
  const intersects = raycaster.intersectObjects(pickMeshes, false);
  if (intersects[0]) {
    return intersects[0];
  }

  const pickRadiusSq = SHOT_PICK_SCREEN_RADIUS_PX * SHOT_PICK_SCREEN_RADIUS_PX;
  let bestIndex = -1;
  let bestDistanceSq = pickRadiusSq;
  let bestDepth = Number.POSITIVE_INFINITY;

  for (let index = 0; index < shotState.points.length; index += 1) {
    const position = getShotPointPosition(shotState.points[index], tempVecA);
    tempVecB.copy(position).project(camera);
    if (
      !Number.isFinite(tempVecB.x) ||
      !Number.isFinite(tempVecB.y) ||
      !Number.isFinite(tempVecB.z) ||
      tempVecB.z < -1 ||
      tempVecB.z > 1
    ) {
      continue;
    }

    const screenPoint = projectWorldToScreen(position, tempVec2B);
    if (!screenPoint) {
      continue;
    }

    const dx = screenPoint.x - event.clientX;
    const dy = screenPoint.y - event.clientY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > pickRadiusSq) {
      continue;
    }

    if (distanceSq < bestDistanceSq || (distanceSq === bestDistanceSq && tempVecB.z < bestDepth)) {
      bestIndex = index;
      bestDistanceSq = distanceSq;
      bestDepth = tempVecB.z;
    }
  }

  return bestIndex === -1 ? null : { object: { userData: { shotPointIndex: bestIndex } } };
}

function pickScenePoint(event) {
  if (!splats) {
    return null;
  }
  const ndc = new THREE.Vector2(
    (event.clientX / innerWidth) * 2 - 1,
    -(event.clientY / innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  return intersects.find((item) => item.object instanceof SplatMesh || item.object === splats) || null;
}

function beginOrbit(event) {
  pointerState.action = "orbit";
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
  orbitTransition = 0;
  startQuaternion.copy(camera.quaternion);

  const projected = orbitTarget.clone().project(camera);
  crosshairEl.style.left = `${((projected.x + 1) / 2) * innerWidth}px`;
  crosshairEl.style.top = `${((-projected.y + 1) / 2) * innerHeight}px`;
  crosshairEl.style.display = "block";
}

function updateOrbit(event) {
  const deltaX = event.clientX - pointerState.lastX;
  const deltaY = event.clientY - pointerState.lastY;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;

  const offset = camera.position.clone().sub(orbitTarget);
  const azimuth = -deltaX * ORBIT_SPEED;
  const cosA = Math.cos(azimuth);
  const sinA = Math.sin(azimuth);
  const newX = offset.x * cosA - offset.z * sinA;
  const newZ = offset.x * sinA + offset.z * cosA;
  offset.x = newX;
  offset.z = newZ;

  if (deltaY !== 0) {
    tempVecA.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    offset.applyAxisAngle(tempVecA, -deltaY * ORBIT_SPEED);
  }

  camera.position.copy(orbitTarget).add(offset);

  const lookAtMatrix = new THREE.Matrix4().lookAt(camera.position, orbitTarget, camera.up);
  tempQuat.setFromRotationMatrix(lookAtMatrix);

  if (orbitTransition < 1) {
    orbitTransition = Math.min(1, orbitTransition + ORBIT_TRANSITION_SPEED * 0.016);
    camera.quaternion.slerpQuaternions(startQuaternion, tempQuat, orbitTransition);
  } else {
    camera.quaternion.copy(tempQuat);
  }
}

function beginPan(event) {
  pointerState.action = "pan";
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
}

function beginRotate(event) {
  pointerState.action = "rotate";
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
}

function updateRotate(event) {
  const deltaX = event.clientX - pointerState.lastX;
  const deltaY = event.clientY - pointerState.lastY;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;

  if (deltaX !== 0) {
    tempQuat.setFromAxisAngle(WORLD_UP, -deltaX * LOOK_SPEED);
    camera.quaternion.premultiply(tempQuat);
  }
  if (deltaY !== 0) {
    tempVecA.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    tempQuat.setFromAxisAngle(tempVecA, -deltaY * LOOK_SPEED);
    camera.quaternion.premultiply(tempQuat);
  }
  camera.quaternion.normalize();
}

function resetKeyboardLookState() {
  keyboardLookState.left = false;
  keyboardLookState.right = false;
  keyboardLookState.up = false;
  keyboardLookState.down = false;
}

function setKeyboardLookKeyState(key, pressed) {
  if (key === "ArrowLeft") {
    keyboardLookState.left = pressed;
    return true;
  }
  if (key === "ArrowRight") {
    keyboardLookState.right = pressed;
    return true;
  }
  if (key === "ArrowUp") {
    keyboardLookState.up = pressed;
    return true;
  }
  if (key === "ArrowDown") {
    keyboardLookState.down = pressed;
    return true;
  }
  return false;
}

function updateKeyboardLook(deltaTime) {
  const yawInput = (keyboardLookState.left ? 1 : 0) - (keyboardLookState.right ? 1 : 0);
  const pitchInput = (keyboardLookState.up ? 1 : 0) - (keyboardLookState.down ? 1 : 0);
  if (yawInput === 0 && pitchInput === 0) {
    return;
  }

  const lookAmount = KEYBOARD_LOOK_SPEED * deltaTime;

  if (yawInput !== 0) {
    tempQuat.setFromAxisAngle(WORLD_UP, yawInput * lookAmount);
    camera.quaternion.premultiply(tempQuat);
  }

  if (pitchInput !== 0) {
    tempVecA.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    tempQuat.setFromAxisAngle(tempVecA, pitchInput * lookAmount);
    camera.quaternion.premultiply(tempQuat);
  }
  camera.quaternion.normalize();
}

function resizeViewGizmoCanvas() {
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  viewGizmoEl.width = Math.round(VIEW_GIZMO_SIZE * dpr);
  viewGizmoEl.height = Math.round(VIEW_GIZMO_SIZE * dpr);
  viewGizmoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getAxisAlignmentUp(axisVector) {
  if (Math.abs(axisVector.dot(WORLD_UP)) > 0.98) {
    return tempVecB.set(0, 0, 1);
  }
  return tempVecB.copy(WORLD_UP);
}

function alignCameraToAxis(axisVector, directionSign = 1) {
  const target = hasOrbitTarget ? orbitTarget : hasShotPivot ? shotPivot : null;
  if (!target) {
    return;
  }

  const distance = Math.max(camera.position.distanceTo(target), 0.25);
  tempVecA.copy(axisVector).normalize().multiplyScalar(distance * directionSign);
  camera.position.copy(target).add(tempVecA);

  const upVector = getAxisAlignmentUp(axisVector);
  tempMatrix.lookAt(camera.position, target, upVector);
  camera.quaternion.setFromRotationMatrix(tempMatrix);
  camera.quaternion.normalize();
}

function findViewGizmoAxisHit(event) {
  const rect = viewGizmoEl.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  for (const target of viewGizmoHitTargets) {
    const dx = x - target.x;
    const dy = y - target.y;
    if (dx * dx + dy * dy <= target.radius * target.radius) {
      return target;
    }
  }
  return null;
}

function drawViewGizmo() {
  const size = VIEW_GIZMO_SIZE;
  const center = size * 0.5;
  const axisRadius = size * 0.34;
  const nodeRadius = 14;
  const backNodes = [];
  const frontNodes = [];

  viewGizmoCtx.clearRect(0, 0, size, size);
  viewGizmoHitTargets.length = 0;

  viewGizmoCtx.beginPath();
  viewGizmoCtx.arc(center, center, size * 0.42, 0, Math.PI * 2);
  viewGizmoCtx.fillStyle = "rgba(8, 12, 16, 0.2)";
  viewGizmoCtx.fill();

  tempQuat.copy(camera.quaternion).invert();
  const axisEntries = VIEW_GIZMO_AXES.map((axis) => {
    const direction = axis.vector.clone().applyQuaternion(tempQuat);
    return {
      ...axis,
      direction,
      depth: direction.z
    };
  }).sort((a, b) => a.depth - b.depth);

  for (const axis of axisEntries) {
    const endpointX = center + axis.direction.x * axisRadius;
    const endpointY = center - axis.direction.y * axisRadius;
    const oppositeX = center - axis.direction.x * axisRadius;
    const oppositeY = center + axis.direction.y * axisRadius;
    const alpha = THREE.MathUtils.lerp(0.42, 0.98, (axis.depth + 1) * 0.5);

    viewGizmoCtx.beginPath();
    viewGizmoCtx.moveTo(center, center);
    viewGizmoCtx.lineTo(endpointX, endpointY);
    viewGizmoCtx.lineWidth = 3;
    viewGizmoCtx.strokeStyle = `${axis.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
    viewGizmoCtx.stroke();

    const positiveNode = {
      axis,
      x: endpointX,
      y: endpointY,
      radius: nodeRadius,
      depth: axis.depth,
      label: axis.label,
      color: axis.color,
      solid: true
    };
    const negativeNode = {
      axis,
      x: oppositeX,
      y: oppositeY,
      radius: nodeRadius * 0.9,
      depth: -axis.depth,
      label: "",
      color: axis.color,
      solid: false
    };

    (positiveNode.depth >= 0 ? frontNodes : backNodes).push(positiveNode);
    (negativeNode.depth >= 0 ? frontNodes : backNodes).push(negativeNode);
    viewGizmoHitTargets.push({
      axis,
      x: endpointX,
      y: endpointY,
      radius: nodeRadius + 5
    });
  }

  const drawNode = (node) => {
    viewGizmoCtx.beginPath();
    viewGizmoCtx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    viewGizmoCtx.lineWidth = 2;
    viewGizmoCtx.strokeStyle = node.solid ? "rgba(15, 20, 24, 0.9)" : `${node.color}cc`;
    if (node.solid) {
      viewGizmoCtx.fillStyle = node.color;
      viewGizmoCtx.fill();
    }
    viewGizmoCtx.stroke();

    if (node.label) {
      viewGizmoCtx.fillStyle = "#101418";
      viewGizmoCtx.font = `700 16px ${UI_CANVAS_FONT_FAMILY}`;
      viewGizmoCtx.textAlign = "center";
      viewGizmoCtx.textBaseline = "middle";
      viewGizmoCtx.fillText(node.label, node.x, node.y + 1);
    }
  };

  backNodes.sort((a, b) => a.depth - b.depth).forEach(drawNode);

  viewGizmoCtx.beginPath();
  viewGizmoCtx.arc(center, center, 5.5, 0, Math.PI * 2);
  viewGizmoCtx.fillStyle = "rgba(198, 212, 220, 0.85)";
  viewGizmoCtx.fill();

  frontNodes.sort((a, b) => a.depth - b.depth).forEach(drawNode);
}

function updatePan(event) {
  const deltaX = event.clientX - pointerState.lastX;
  const deltaY = event.clientY - pointerState.lastY;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;

  const navScale = hasOrbitTarget ? Math.max(camera.position.distanceTo(orbitTarget), 0.5) : 2;
  const panScale = navScale * 0.0025;

  tempVecA.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(-deltaX * panScale);
  tempVecB.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(deltaY * panScale);
  tempVecC.copy(tempVecA).add(tempVecB);

  camera.position.add(tempVecC);
  if (hasOrbitTarget) {
    orbitTarget.add(tempVecC);
  }
}

function normalizeWheelDelta(event) {
  let pixelDelta = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    pixelDelta *= 16;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    pixelDelta *= innerHeight;
  }
  return THREE.MathUtils.clamp(pixelDelta / 120, -WHEEL_DOLLY_MAX_UNITS, WHEEL_DOLLY_MAX_UNITS);
}

function applyDolly(event) {
  const navScale = hasOrbitTarget ? Math.max(camera.position.distanceTo(orbitTarget), 0.5) : 2;
  const wheelUnits = normalizeWheelDelta(event);
  const moveScale = Math.max(navScale * WHEEL_DOLLY_FACTOR, WHEEL_DOLLY_MIN_STEP);
  camera.getWorldDirection(tempVecA);

  let moveAmount = wheelUnits * moveScale;
  if (hasOrbitTarget && moveAmount > 0) {
    const maxForward = Math.max(camera.position.distanceTo(orbitTarget) - 0.05, 0);
    moveAmount = Math.min(moveAmount, maxForward);
  }

  camera.position.add(tempVecA.multiplyScalar(moveAmount));
}

function handleCanvasMouseDown(event) {
  if (exporting) {
    return;
  }

  if (event.button === 0 && rKeyDown && hasOrbitTarget) {
    setShotHoverIndex(-1);
    beginOrbit(event);
    event.preventDefault();
    return;
  }

  if (event.button === 2) {
    setShotHoverIndex(-1);
    beginPan(event);
    event.preventDefault();
    return;
  }

  if (shotState.plannerMode && event.button === 0) {
    const hit = pickShotPoint(event);
    if (hit) {
      const shotPointIndex = hit.object.userData.shotPointIndex;
      selectShotPoint(shotPointIndex);
      event.preventDefault();
      return;
    }

    selectShotPoint(-1, { preview: false });
  }

  if (!editState.editMode || !editState.ready) {
    if (event.button === 0) {
      setShotHoverIndex(-1);
      beginRotate(event);
      event.preventDefault();
    }
    return;
  }

  if (event.button !== 0) {
    return;
  }

  pointerState.startX = event.clientX;
  pointerState.startY = event.clientY;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
  pointerState.selectionMode = getSelectionMode(event);

  if (editState.activeTool === "picker") {
    pointerState.action = "pickerRect";
    hideSelectionRect();
    event.preventDefault();
    return;
  }

  if (editState.activeTool === "brush") {
    pointerState.action = "brush";
    pointerState.lastBrushApplyTime = 0;
    if (pointerState.selectionMode === "replace") {
      const changed = clearSelection([]);
      commitSelectionChange(changed);
    }
    projectSplatsToScreen();
    applyBrushSelection(event.clientX, event.clientY);
    updateBrushCursor(event.clientX, event.clientY);
    event.preventDefault();
  }
}

function handleWindowMouseMove(event) {
  if (pointerState.action === "orbit") {
    updateOrbit(event);
    return;
  }

  if (pointerState.action === "rotate") {
    updateRotate(event);
    return;
  }

  if (pointerState.action === "pan") {
    updatePan(event);
    return;
  }

  if (editState.editMode && editState.activeTool === "brush") {
    updateBrushCursor(event.clientX, event.clientY);
  }

  if (pointerState.action === "pickerRect") {
    updateSelectionRect(event.clientX, event.clientY);
    return;
  }

  if (pointerState.action === "brush") {
    updateBrushCursor(event.clientX, event.clientY);
    const now = performance.now();
    if (now - pointerState.lastBrushApplyTime >= BRUSH_APPLY_INTERVAL_MS) {
      pointerState.lastBrushApplyTime = now;
      applyBrushSelection(event.clientX, event.clientY);
    }
    return;
  }

  if (shotState.plannerMode) {
    const hit = pickShotPoint(event);
    setShotHoverIndex(hit ? hit.object.userData.shotPointIndex : -1);
  }
}

function handleWindowMouseUp(event) {
  if (pointerState.action === "orbit") {
    endPointerAction();
    return;
  }

  if (pointerState.action === "rotate") {
    endPointerAction();
    return;
  }

  if (pointerState.action === "pan") {
    endPointerAction();
    return;
  }

  if (pointerState.action === "pickerRect") {
    const distance = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
    const selectionMode = pointerState.selectionMode;
    endPointerAction();
    if (distance < 4) {
      selectAtScreenPoint(event.clientX, event.clientY, selectionMode);
    } else {
      selectInRectangle(pointerState.startX, pointerState.startY, event.clientX, event.clientY, selectionMode);
    }
    return;
  }

  if (pointerState.action === "brush") {
    applyBrushSelection(event.clientX, event.clientY);
    endPointerAction();
  }
}

function handleCanvasDoubleClick(event) {
  if (exporting || !editState.ready || modelState.loading) {
    return;
  }
  const hit = pickScenePoint(event);
  if (!hit) {
    return;
  }
  setShotPivot(hit.point, { revealHelpers: true, explicit: true });
}

function handleCanvasWheel(event) {
  if (exporting) {
    event.preventDefault();
    return;
  }
  applyDolly(event);
  event.preventDefault();
}

function updateFrameInfo() {
  const fps = parseInt(fpsInput.value, 10) || 30;
  const duration = parseFloat(durationInput.value) || 5;
  const resolution = getSelectedOutputResolution();
  exportFrameInfo.textContent = t("export.frameInfo", {
    frames: Math.round(fps * duration),
    width: resolution.width,
    height: resolution.height
  });

  if (playbackPreviewLockedAspect && !exporting) {
    setPlaybackPreviewAspectLocked(true);
  }
}

function updatePathLine() {
  if (pathLine) {
    shotHelperRoot.remove(pathLine);
    pathLine.geometry.dispose();
    pathLine.material.dispose();
    pathLine = null;
  }
  if (keyframes.length < 2) {
    positionCurve = null;
    return;
  }

  positionCurve = new THREE.CatmullRomCurve3(
    keyframes.map((kf) => kf.position.clone()),
    false,
    "catmullrom",
    0.5
  );
  const points = positionCurve.getPoints(keyframes.length * 50);
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: SHOT_PATH_COLOR,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  pathLine = new THREE.Line(geo, mat);
  pathLine.renderOrder = 1030;
  pathLine.visible = areShotHelpersVisible();
  shotHelperRoot.add(pathLine);
}

function getShotPreviewDuration() {
  return Math.max(0.5, parseFloat(durationInput.value) || 5);
}

function applyPlaybackFrame(t) {
  if (!positionCurve || keyframes.length < 2) {
    return;
  }

  const clampedT = THREE.MathUtils.clamp(t, 0, 1);
  camera.position.copy(positionCurve.getPointAt(clampedT));
  getPlaybackQuaternionAt(clampedT, camera.position, camera.quaternion);

  if (hasShotPivot) {
    orbitTarget.copy(shotPivot);
    hasOrbitTarget = true;
  }
}

function togglePlay() {
  if (keyframes.length < 2 || !positionCurve) {
    setUiMessage("playStatus", "play.status.needsTwoShots");
    return;
  }

  if (playing) {
    stopPlayback("play.status.stopped");
    return;
  }

  revealShotHelpers();
  playing = true;
  playT = 0;
  playLastTime = performance.now();
  setPlaybackPreviewAspectLocked(true);
  applyPlaybackFrame(0);
  setUiMessage("playStatus", "play.status.playing");
}

function updatePlayback(time) {
  if (!playing || !positionCurve) {
    return;
  }

  const dt = (time - playLastTime) / 1000;
  playLastTime = time;
  playT += dt / getShotPreviewDuration();

  if (playT >= 1) {
    playT = 1;
    applyPlaybackFrame(playT);
    playing = false;
    playLastTime = 0;
    setPlaybackPreviewAspectLocked(false);
    setUiMessage("playStatus", "play.status.finished");
    return;
  }

  applyPlaybackFrame(playT);
  setUiMessage("playStatus", "play.status.progress", { percent: Math.round(playT * 100) });
}

function hideHelperOverlaysForExport() {
  setShotHelperVisibility(false);
  selectionRectEl.style.display = "none";
  brushCursorEl.style.display = "none";

  if (editState.ready && editState.selectionHighlightEnabled && editState.selectedCount > 0) {
    editState.selectionHighlightEnabled = false;
    applyVisualChanges(collectSelectedIndices());
  }
}

function restoreHelperOverlaysAfterExport() {
  setShotHelperVisibility(true);

  if (editState.ready && !editState.selectionHighlightEnabled && editState.selectedCount > 0) {
    editState.selectionHighlightEnabled = true;
    applyVisualChanges(collectSelectedIndices());
  } else {
    editState.selectionHighlightEnabled = true;
  }
}

async function exportVideo() {
  if (exporting) {
    return;
  }
  if (keyframes.length < 2 || !positionCurve) {
    setUiMessage("exportStatus", "export.status.needTwo");
    return;
  }
  if (typeof VideoEncoder === "undefined") {
    setUiMessage("exportStatus", "export.status.unsupportedWebCodecs");
    return;
  }

  exporting = true;
  exportBtn.disabled = true;
  exportProgress.style.display = "block";
  setUiMessage("exportStatus", "export.status.loadingEncoder");
  updateModelUi();
  updateEditUi();
  updateShotUi();

  let mp4Muxer;
  try {
    mp4Muxer = await import("https://esm.sh/mp4-muxer@5");
  } catch (error) {
    setUiMessage("exportStatus", "export.status.loadingMuxerFailed", { message: error.message });
    exporting = false;
    updateModelUi();
    updateEditUi();
    updateShotUi();
    return;
  }

  const resolution = getSelectedOutputResolution();
  const fps = Math.max(1, parseInt(fpsInput.value, 10) || 30);
  const duration = Math.max(0.5, parseFloat(durationInput.value) || 5);
  const bitrate = Math.max(1, parseInt(bitrateInput.value, 10) || 10) * 1_000_000;
  const totalFrames = Math.max(1, Math.round(fps * duration));

  const pixels = resolution.width * resolution.height;
  const codecString = pixels > 5652480 ? "avc1.640034" : pixels > 2097152 ? "avc1.640032" : "avc1.640028";

  const muxer = new mp4Muxer.Muxer({
    target: new mp4Muxer.ArrayBufferTarget(),
    video: { codec: "avc", width: resolution.width, height: resolution.height },
    fastStart: "in-memory"
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      setUiMessage("exportStatus", "export.status.encoderError", { message: error.message });
    }
  });
  encoder.configure({
    codec: codecString,
    width: resolution.width,
    height: resolution.height,
    bitrate,
    framerate: fps
  });

  if (playing) {
    stopPlayback("play.status.stopped");
  }

  const originalAspect = camera.aspect;
  const originalPosition = camera.position.clone();
  const originalQuaternion = camera.quaternion.clone();
  const originalOrbitTarget = orbitTarget.clone();
  const originalHasOrbitTarget = hasOrbitTarget;
  let exportSpark = null;

  try {
    hideHelperOverlaysForExport();
    setUiMessage("exportStatus", "export.status.rendering", { current: 0, total: totalFrames, percent: 0 });
    exportProgressBar.style.width = "0%";

    camera.aspect = resolution.width / resolution.height;
    camera.updateProjectionMatrix();

    exportSpark = new SparkRenderer({
      renderer,
      target: {
        width: resolution.width,
        height: resolution.height
      },
      autoUpdate: false,
      preUpdate: true,
      premultipliedAlpha: spark.premultipliedAlpha,
      transparent: spark.material.transparent,
      depthTest: spark.material.depthTest,
      depthWrite: spark.material.depthWrite,
      maxStdDev: spark.maxStdDev,
      minPixelRadius: spark.minPixelRadius,
      maxPixelRadius: spark.maxPixelRadius,
      accumExtSplats: spark.accumExtSplats,
      covSplats: spark.covSplats,
      minAlpha: spark.minAlpha,
      enable2DGS: spark.enable2DGS,
      preBlurAmount: spark.preBlurAmount,
      blurAmount: spark.blurAmount,
      focalDistance: spark.focalDistance,
      apertureAngle: spark.apertureAngle,
      falloff: spark.falloff,
      clipXY: spark.clipXY,
      focalAdjustment: spark.focalAdjustment,
      encodeLinear: true,
      sortRadial: spark.sortRadial,
      minSortIntervalMs: 0,
      enableLod: spark.enableLod,
      enableDriveLod: spark.enableDriveLod,
      enableLodFetching: spark.enableLodFetching,
      lodSplatCount: spark.lodSplatCount,
      lodSplatScale: spark.lodSplatScale,
      lodRenderScale: spark.lodRenderScale,
      lodInflate: spark.lodInflate,
      pagedExtSplats: spark.pagedExtSplats,
      maxPagedSplats: spark.maxPagedSplats,
      numLodFetchers: spark.numLodFetchers,
      behindFoveate: spark.behindFoveate,
      coneFov0: spark.coneFov0,
      coneFov: spark.coneFov,
      coneFoveate: spark.coneFoveate,
      lodRaycast: spark.lodRaycast,
      lodRaycastIntervalMs: spark.lodRaycastIntervalMs
    });
    exportSpark.renderSize.set(resolution.width, resolution.height);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = resolution.width;
    exportCanvas.height = resolution.height;
    const exportContext = exportCanvas.getContext("2d", { alpha: false });
    if (!exportContext) {
      throw new Error(t("export.error.canvasContext"));
    }
    const exportImageData = exportContext.createImageData(resolution.width, resolution.height);

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      const t = totalFrames === 1 ? 0 : frameIndex / (totalFrames - 1);
      applyPlaybackFrame(Math.min(t, 1));
      camera.updateMatrixWorld(true);

      await exportSpark.update({ scene, camera });
      const rgbaPixels = await exportSpark.renderReadTarget({ scene, camera });
      writeFlippedRgbaToImageData(rgbaPixels, exportImageData, resolution.width, resolution.height);
      exportContext.putImageData(exportImageData, 0, 0);

      const timestamp = Math.round(frameIndex * (1_000_000 / fps));
      const frame = new VideoFrame(exportCanvas, { timestamp });
      encoder.encode(frame, { keyFrame: frameIndex % (fps * 2) === 0 });
      frame.close();

      const percent = Math.round(((frameIndex + 1) / totalFrames) * 100);
      exportProgressBar.style.width = `${percent}%`;
      setUiMessage("exportStatus", "export.status.rendering", {
        current: frameIndex + 1,
        total: totalFrames,
        percent
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    setUiMessage("exportStatus", "export.status.compositing");
    await encoder.flush();
    encoder.close();
    muxer.finalize();

    const mp4Blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(mp4Blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `render_${resSelect.value}p_${fps}fps.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    const sizeMb = (mp4Blob.size / 1048576).toFixed(1);
    setUiMessage("exportStatus", "export.status.done", { sizeMb, totalFrames });
  } catch (error) {
    try {
      encoder.close();
    } catch (_closeError) {
      // Ignore encoder close failures when export aborts early.
    }
    setUiMessage("exportStatus", "export.status.failed", { message: error.message });
  } finally {
    if (exportSpark) {
      exportSpark.dispose();
    }
    restoreHelperOverlaysAfterExport();
    camera.aspect = originalAspect;
    camera.updateProjectionMatrix();
    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalQuaternion);
    orbitTarget.copy(originalOrbitTarget);
    hasOrbitTarget = originalHasOrbitTarget;
    exporting = false;
    updateModelUi();
    updateEditUi();
    updateShotUi();
  }
}

function handleGlobalKeyDown(event) {
  if (isInputFocused()) {
    return;
  }

  if (exporting) {
    return;
  }

  if (event.key === "r" || event.key === "R") {
    rKeyDown = true;
  }

  const commandKey = event.ctrlKey || event.metaKey;
  if (commandKey && (event.key === "z" || event.key === "Z")) {
    if (event.shiftKey) {
      redoDelete();
    } else {
      undoDelete();
    }
    event.preventDefault();
    return;
  }

  if (commandKey && (event.key === "y" || event.key === "Y")) {
    redoDelete();
    event.preventDefault();
    return;
  }

  if (event.key === "e" || event.key === "E") {
    if (editState.ready) {
      setEditMode(!editState.editMode);
      event.preventDefault();
    }
    return;
  }

  if (commandKey && (event.key === "s" || event.key === "S")) {
    if (editState.ready) {
      void saveEditedScene();
      event.preventDefault();
    }
    return;
  }

  if (setKeyboardLookKeyState(event.key, true)) {
    event.preventDefault();
    return;
  }

  if (modelState.loading) {
    return;
  }

  if (!editState.ready) {
    return;
  }

  if (playing && event.key !== "p" && event.key !== "P") {
    return;
  }

  if (shotState.plannerMode && (event.key === "Delete" || event.key === "Backspace")) {
    deleteSelectedShotPoint();
    event.preventDefault();
    return;
  }

  if (editState.editMode) {
    if (event.key === "1") {
      setActiveTool("picker");
      event.preventDefault();
      return;
    }
    if (event.key === "2") {
      setActiveTool("brush");
      event.preventDefault();
      return;
    }
    if (event.key === "[" || event.key === "{") {
      if (editState.activeTool === "brush") {
        editState.brushRadiusPx = Math.max(2, editState.brushRadiusPx - 2);
      }
      updateEditUi();
      event.preventDefault();
      return;
    }
    if (event.key === "]" || event.key === "}") {
      if (editState.activeTool === "brush") {
        editState.brushRadiusPx += 2;
      }
      updateEditUi();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      const changed = clearSelection([]);
      commitSelectionChange(changed);
      event.preventDefault();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      deleteSelectedSplats();
      event.preventDefault();
      return;
    }
  }

  if (event.key === "+" || event.key === "=") {
    insertShotPoint();
    event.preventDefault();
  } else if (event.key === "p" || event.key === "P") {
    togglePlay();
    event.preventDefault();
  } else if (event.key === "c" || event.key === "C") {
    clearShotPoints();
    event.preventDefault();
  }
}

function handleGlobalKeyUp(event) {
  if (setKeyboardLookKeyState(event.key, false)) {
    event.preventDefault();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    rKeyDown = false;
    if (pointerState.action === "orbit") {
      endPointerAction();
    }
  }
}

function handleResize() {
  if (exporting) {
    return;
  }
  renderer.setSize(innerWidth, innerHeight);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  camera.aspect = playbackPreviewLockedAspect ? getSelectedOutputAspect() : innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  resizeViewGizmoCanvas();
  updateShotVisuals();
}

toggleEditBtn.addEventListener("click", () => {
  if (!editState.ready) {
    return;
  }
  setEditMode(!editState.editMode);
});

openModelBtn.addEventListener("click", openModelPicker);
emptyStateOpenBtn.addEventListener("click", openModelPicker);
modelInputEl.addEventListener("change", () => {
  const file = getFirstFile(modelInputEl.files);
  modelInputEl.value = "";
  if (!file) {
    return;
  }
  void loadModelFromFile(file);
});

togglePlannerBtn.addEventListener("click", () => {
  if (!editState.ready) {
    return;
  }
  setPlannerMode(!shotState.plannerMode);
});

insertShotBtn.addEventListener("click", insertShotPoint);
deleteShotBtn.addEventListener("click", deleteSelectedShotPoint);
clearShotsBtn.addEventListener("click", clearShotPoints);

resetViewBtn.addEventListener("click", () => {
  focusVisibleSplats();
});

for (const button of toolButtons) {
  button.addEventListener("click", () => {
    if (!editState.ready) {
      return;
    }
    setActiveTool(button.dataset.tool);
  });
}

radiusInput.addEventListener("input", () => {
  const value = Number.parseFloat(radiusInput.value);
  if (!Number.isFinite(value)) {
    return;
  }
  editState.brushRadiusPx = Math.max(2, Math.round(value));
  updateEditUi();
});

clearSelectionBtn.addEventListener("click", () => {
  const changed = clearSelection([]);
  commitSelectionChange(changed);
});

undoBtn.addEventListener("click", undoDelete);
redoBtn.addEventListener("click", redoDelete);
deleteSelectionBtn.addEventListener("click", deleteSelectedSplats);
analyzeFloatersBtn.addEventListener("click", analyzeFloatingSplats);
applyFloaterFilterBtn.addEventListener("click", applyFloatingSplatFilter);
for (const input of [
  cleanupScalePercentileInput,
  cleanupMinScaleRatioInput,
  cleanupNeighborRadiusInput,
  cleanupMinNeighborsInput,
  cleanupOpacityFloorInput
]) {
  input.addEventListener("input", () => {
    editState.cleanupCandidateCount = 0;
    editState.cleanupLastStats = null;
    if (editState.ready) {
      setUiMessage("cleanupStatus", "cleanup.status.ready");
    }
    updateEditUi();
  });
}
saveSceneBtn.addEventListener("click", () => {
  void saveEditedScene();
});

fpsInput.addEventListener("input", updateFrameInfo);
durationInput.addEventListener("input", updateFrameInfo);
resSelect.addEventListener("change", updateFrameInfo);
exportBtn.addEventListener("click", exportVideo);
for (const button of languageButtons) {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language);
  });
}
viewGizmoEl.addEventListener("click", (event) => {
  const hit = findViewGizmoAxisHit(event);
  if (!hit) {
    return;
  }
  event.preventDefault();
  if (viewGizmoClickTimer) {
    window.clearTimeout(viewGizmoClickTimer);
  }
  viewGizmoClickTimer = window.setTimeout(() => {
    viewGizmoClickTimer = 0;
    alignCameraToAxis(hit.axis.vector, 1);
  }, 220);
});
viewGizmoEl.addEventListener("dblclick", (event) => {
  const hit = findViewGizmoAxisHit(event);
  if (!hit) {
    return;
  }
  event.preventDefault();
  if (viewGizmoClickTimer) {
    window.clearTimeout(viewGizmoClickTimer);
    viewGizmoClickTimer = 0;
  }
  alignCameraToAxis(hit.axis.vector, -1);
});

renderer.domElement.addEventListener("mousedown", handleCanvasMouseDown);
renderer.domElement.addEventListener("dblclick", handleCanvasDoubleClick);
renderer.domElement.addEventListener("wheel", handleCanvasWheel, { passive: false });
renderer.domElement.addEventListener("mouseleave", () => {
  setShotHoverIndex(-1);
  if (editState.activeTool === "brush" && pointerState.action !== "brush") {
    updateBrushCursor();
  }
});

window.addEventListener("mousemove", handleWindowMouseMove);
window.addEventListener("mouseup", handleWindowMouseUp);
window.addEventListener("dragenter", (event) => {
  if (exporting || !eventHasFiles(event)) {
    return;
  }
  event.preventDefault();
  modelState.dragDepth += 1;
  setDragOverlayActive(true);
});
window.addEventListener("dragover", (event) => {
  if (exporting || !eventHasFiles(event)) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  setDragOverlayActive(true);
});
window.addEventListener("dragleave", (event) => {
  if (exporting || !eventHasFiles(event)) {
    return;
  }
  event.preventDefault();
  modelState.dragDepth = Math.max(0, modelState.dragDepth - 1);
  if (modelState.dragDepth === 0) {
    setDragOverlayActive(false);
  }
});
window.addEventListener("drop", (event) => {
  if (exporting || !eventHasFiles(event)) {
    return;
  }
  event.preventDefault();
  modelState.dragDepth = 0;
  setDragOverlayActive(false);
  const file = getFirstFile(event.dataTransfer.files);
  if (!file) {
    return;
  }
  void loadModelFromFile(file);
});
window.addEventListener("dragend", () => {
  modelState.dragDepth = 0;
  setDragOverlayActive(false);
});
window.addEventListener("keydown", handleGlobalKeyDown);
window.addEventListener("keyup", handleGlobalKeyUp);
window.addEventListener("resize", handleResize);
window.addEventListener("blur", () => {
  setShotHoverIndex(-1);
  resetKeyboardLookState();
  endPointerAction();
  updateBrushCursor();
  if (viewGizmoClickTimer) {
    window.clearTimeout(viewGizmoClickTimer);
    viewGizmoClickTimer = 0;
  }
  modelState.dragDepth = 0;
  setDragOverlayActive(false);
});

setLanguage(currentLanguage, { persist: false });
resizeViewGizmoCanvas();

renderer.setAnimationLoop((time) => {
  if (exporting) {
    return;
  }

  if (playing) {
    updatePlayback(time);
  } else {
    const deltaTime = (time - (controls.lastTime || time)) / 1000;
    controls.lastTime = time;
    updateKeyboardLook(deltaTime);
    controls.fpsMovement.update(deltaTime, camera);
  }

  updateShotVisuals();
  renderSceneFrame();
  drawViewGizmo();
});
