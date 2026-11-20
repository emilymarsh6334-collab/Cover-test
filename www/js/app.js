/* Cover test v1.0.0 - Core Optical Simulation & App Logic */

document.addEventListener('DOMContentLoaded', () => {
  const APP_VERSION = 'v1.1.0 (Build 2026.11)';
  const STORAGE_PREFS = 'cover_test_prefs_v1';
  const STORAGE_STATS = 'cover_test_stats_v1';
  const STORAGE_CASES = 'cover_test_cases_v1';

  // ================== 1. 本地持久化设置与统计 ==================
  const defaultPrefs = {
    theme: 'system',
    irisColor: 'brown',
    wakeLock: false,
    actInterval: 1350,
    prismStep: 1,
    slowRate: 0.4,
    examTolerance: 2,
    haptics: true
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch {
      return { ...fallback };
    }
  }

  function loadArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  let prefs = loadJSON(STORAGE_PREFS, defaultPrefs);
  let stats = loadJSON(STORAGE_STATS, { total: 0, pass: 0, history: [] });
  let savedCases = loadArray(STORAGE_CASES);

  function savePrefs() {
    try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs)); } catch {}
  }
  function saveStats() {
    try { localStorage.setItem(STORAGE_STATS, JSON.stringify(stats)); } catch {}
  }
  function saveCases() {
    try { localStorage.setItem(STORAGE_CASES, JSON.stringify(savedCases)); } catch {}
  }

  function vibrate(ms = 12) {
    if (prefs.haptics && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch {}
    }
  }

  // ================== 2. 病例预设库 ==================
  const PRESETS = [
    {
      id: 'ortho',
      name: '正位眼 (Ortho)',
      distance: { type: 'ortho', eye: 'OD', recovery: 'fast', hDir: 'none', hPrism: 0, vDir: 'none', vPrism: 0 },
      near:     { type: 'ortho', eye: 'OD', recovery: 'fast', hDir: 'none', hPrism: 0, vDir: 'none', vPrism: 0 }
    },
    {
      id: 'exophoria',
      name: '基本型外隐斜 (X)',
      distance: { type: 'phoria', eye: 'OD', recovery: 'fast', hDir: 'exo', hPrism: 12, vDir: 'none', vPrism: 0 },
      near:     { type: 'phoria', eye: 'OD', recovery: 'fast', hDir: 'exo', hPrism: 14, vDir: 'none', vPrism: 0 }
    },
    {
      id: 'esophoria',
      name: '基本型内隐斜 (E)',
      distance: { type: 'phoria', eye: 'OD', recovery: 'fast', hDir: 'eso', hPrism: 10, vDir: 'none', vPrism: 0 },
      near:     { type: 'phoria', eye: 'OD', recovery: 'fast', hDir: 'eso', hPrism: 12, vDir: 'none', vPrism: 0 }
    },
    {
      id: 'alt_xt',
      name: '交替性外斜 (Alt XT)',
      distance: { type: 'alternating', eye: 'OD', recovery: 'medium', hDir: 'exo', hPrism: 25, vDir: 'none', vPrism: 0 },
      near:     { type: 'alternating', eye: 'OD', recovery: 'medium', hDir: 'exo', hPrism: 22, vDir: 'none', vPrism: 0 }
    },
    {
      id: 'di',
      name: '散开不足 (DI)',
      distance: { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'eso', hPrism: 20, vDir: 'none', vPrism: 0 },
      near:     { type: 'phoria',   eye: 'OD', recovery: 'fast',   hDir: 'eso', hPrism: 4,  vDir: 'none', vPrism: 0 }
    },
    {
      id: 'ci',
      name: '集合不足 (CI)',
      distance: { type: 'phoria', eye: 'OD', recovery: 'fast', hDir: 'exo', hPrism: 2,  vDir: 'none', vPrism: 0 },
      near:     { type: 'phoria', eye: 'OD', recovery: 'slow', hDir: 'exo', hPrism: 18, vDir: 'none', vPrism: 0 }
    },
    {
      id: 'rht',
      name: '右眼上斜 (RHT)',
      distance: { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'none', hPrism: 0, vDir: 'r_hyper', vPrism: 12 },
      near:     { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'none', hPrism: 0, vDir: 'r_hyper', vPrism: 12 }
    },
    {
      id: 'xt_rht',
      name: '复合：外斜+右上斜 (XT+RHT)',
      distance: { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'exo', hPrism: 20, vDir: 'r_hyper', vPrism: 10 },
      near:     { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'exo', hPrism: 22, vDir: 'r_hyper', vPrism: 10 }
    },
    {
      id: 'et_lht',
      name: '复合：内斜+左上斜 (ET+LHT)',
      distance: { type: 'alternating', eye: 'OS', recovery: 'medium', hDir: 'eso', hPrism: 18, vDir: 'l_hyper', vPrism: 8 },
      near:     { type: 'alternating', eye: 'OS', recovery: 'medium', hDir: 'eso', hPrism: 20, vDir: 'l_hyper', vPrism: 8 }
    },
    {
      id: 'x_rh',
      name: '复合隐斜 (X+RH)',
      distance: { type: 'phoria', eye: 'OD', recovery: 'slow', hDir: 'exo', hPrism: 12, vDir: 'r_hyper', vPrism: 5, cDir: 'none', cDeg: 0, kappa: 0 },
      near:     { type: 'phoria', eye: 'OD', recovery: 'slow', hDir: 'exo', hPrism: 16, vDir: 'r_hyper', vPrism: 6, cDir: 'none', cDeg: 0, kappa: 0 }
    },
    {
      id: 'sop',
      name: '上斜肌麻痹 (RHT+外旋)',
      distance: { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'none', hPrism: 0, vDir: 'r_hyper', vPrism: 10, cDir: 'excyclo', cDeg: 10, kappa: 0 },
      near:     { type: 'constant', eye: 'OD', recovery: 'medium', hDir: 'none', hPrism: 0, vDir: 'r_hyper', vPrism: 12, cDir: 'excyclo', cDeg: 12, kappa: 0 }
    },
    {
      id: 'excyclo',
      name: '纯外旋隐斜 (Excyclo)',
      distance: { type: 'phoria', eye: 'OD', recovery: 'medium', hDir: 'none', hPrism: 0, vDir: 'none', vPrism: 0, cDir: 'excyclo', cDeg: 12, kappa: 0 },
      near:     { type: 'phoria', eye: 'OD', recovery: 'medium', hDir: 'none', hPrism: 0, vDir: 'none', vPrism: 0, cDir: 'excyclo', cDeg: 12, kappa: 0 }
    },
    {
      id: 'pseudo_xt',
      name: '假性外斜 (大+Kappa角)',
      distance: { type: 'ortho', eye: 'OD', recovery: 'fast', hDir: 'none', hPrism: 0, vDir: 'none', vPrism: 0, cDir: 'none', cDeg: 0, kappa: 14 },
      near:     { type: 'ortho', eye: 'OD', recovery: 'fast', hDir: 'none', hPrism: 0, vDir: 'none', vPrism: 0, cDir: 'none', cDeg: 0, kappa: 14 }
    },
    {
      id: 'dvd',
      name: '分离性垂直偏斜 (DVD)',
      distance: { type: 'dvd', eye: 'OD', recovery: 'slow', hDir: 'none', hPrism: 0, vDir: 'r_hyper', vPrism: 14, cDir: 'excyclo', cDeg: 6, kappa: 0 },
      near:     { type: 'dvd', eye: 'OD', recovery: 'slow', hDir: 'none', hPrism: 0, vDir: 'r_hyper', vPrism: 14, cDir: 'excyclo', cDeg: 6, kappa: 0 }
    }
  ];

  const IRIS_PALETTES = {
    brown: ['#5c3a21', '#3f2614', '#261509', '#120a04', 'rgba(180, 125, 80, 0.22)'],
    amber: ['#a96d35', '#7c4c1f', '#4e2f12', '#261507', 'rgba(235, 180, 110, 0.28)'],
    blue:  ['#6899b8', '#426d8a', '#264459', '#132433', 'rgba(180, 225, 250, 0.28)']
  };

  // ================== 3. 核心状态 ==================
  const state = {
    appMode: 'teach',
    examBlind: false,
    examRevealed: false,
    dist: 'distance',
    activePresetId: 'exophoria',
    config: {
      distance: { ...PRESETS[1].distance },
      near:     { ...PRESETS[1].near }
    },
    prism: { eye: 'OD', sx: 0, sy: 0, lastAngle: 0 },
    cover: 'none',
    prevCover: 'none',
    isAlternating: false,
    altTimer: null,
    fixatingEye: 'BOTH',
    intermittentBroken: false,
    xray: false,
    slowMo: false,
    showTorsionGuide: false
  };

  const phys = {
    OD: { x: 0, y: 0, tx: 0, ty: 0, rot: 0, tRot: 0, speed: 12, pupil: 14.5, tPupil: 14.5 },
    OS: { x: 0, y: 0, tx: 0, ty: 0, rot: 0, tRot: 0, speed: 12, pupil: 14.5, tPupil: 14.5 },
    occOD: 0,
    occOS: 0,
    blink: 0,
    blinkTimer: 2.8,
    time: 0
  };

  // ================== 4. DOM 引用 ==================
  const canvas = document.getElementById('eyeCanvas');
  const ctx = canvas.getContext('2d');
  const canvasWrap = document.getElementById('canvasWrap');
  const prismDial = document.getElementById('prismDial');
  const dCtx = prismDial.getContext('2d');

  const examPanel = document.getElementById('examPanel');
  const patientConfigPanel = document.getElementById('patientConfigPanel');
  const examStatusBadge = document.getElementById('examStatusBadge');
  const examStepTitle = document.getElementById('examStepTitle');
  const examStepDesc = document.getElementById('examStepDesc');
  const examResultBox = document.getElementById('examResultBox');

  const selType = document.getElementById('selType');
  const selEye = document.getElementById('selEye');
  const selRecovery = document.getElementById('selRecovery');
  const selHDir = document.getElementById('selHDir');
  const rangeHPrism = document.getElementById('rangeHPrism');
  const selVDir = document.getElementById('selVDir');
  const rangeVPrism = document.getElementById('rangeVPrism');
  const valHText = document.getElementById('valHText');
  const valVText = document.getElementById('valVText');
  const selCDir = document.getElementById('selCDir');
  const rangeCDeg = document.getElementById('rangeCDeg');
  const valCText = document.getElementById('valCText');
  const rangeKappa = document.getElementById('rangeKappa');
  const valKappaText = document.getElementById('valKappaText');
  const torsionToggle = document.getElementById('torsionToggle');
  const torsionPill = document.getElementById('torsionPill');
  const clinicalRecordText = document.getElementById('clinicalRecordText');

  const sliderPrismH = document.getElementById('sliderPrismH');
  const sliderPrismV = document.getElementById('sliderPrismV');
  const sliderPrismAngle = document.getElementById('sliderPrismAngle');
  const lblSliderH = document.getElementById('lblSliderH');
  const lblSliderV = document.getElementById('lblSliderV');
  const lblSliderAngle = document.getElementById('lblSliderAngle');
  const endLeftH = document.getElementById('endLeftH');
  const endRightH = document.getElementById('endRightH');
  const readPrismH = document.getElementById('readPrismH');
  const readPrismV = document.getElementById('readPrismV');
  const readPrismPolar = document.getElementById('readPrismPolar');

  const btnCoverOD = document.getElementById('btnCoverOD');
  const btnCoverOS = document.getElementById('btnCoverOS');
  const btnUncover = document.getElementById('btnUncover');
  const btnAlternate = document.getElementById('btnAlternate');
  const xrayToggle = document.getElementById('xrayToggle');
  const slowToggle = document.getElementById('slowToggle');
  const xrayPill = document.getElementById('xrayPill');
  const slowPill = document.getElementById('slowPill');

  const presetChips = document.getElementById('presetChips');
  const editingDistLabel = document.getElementById('editingDistLabel');
  const currentModeBadge = document.getElementById('currentModeBadge');
  const prismBadge = document.getElementById('prismBadge');
  const appliedPrismBadge = document.getElementById('appliedPrismBadge');
  const hirschbergBadge = document.getElementById('hirschbergBadge');
  const hintOD = document.getElementById('hintOD');
  const hintOS = document.getElementById('hintOS');
  const noteStageTag = document.getElementById('noteStageTag');
  const noteTitle = document.getElementById('noteTitle');
  const noteDesc = document.getElementById('noteDesc');
  const noteWatchEye = document.getElementById('noteWatchEye');
  const noteDynamics = document.getElementById('noteDynamics');
  const noteResH = document.getElementById('noteResH');
  const noteResV = document.getElementById('noteResV');

  // Settings DOM
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const settingsDrawer = document.getElementById('settingsDrawer');
  const setTheme = document.getElementById('setTheme');
  const setIrisColor = document.getElementById('setIrisColor');
  const setWakeLock = document.getElementById('setWakeLock');
  const setActInterval = document.getElementById('setActInterval');
  const setPrismStep = document.getElementById('setPrismStep');
  const setSlowRate = document.getElementById('setSlowRate');
  const setExamTolerance = document.getElementById('setExamTolerance');
  const setHaptics = document.getElementById('setHaptics');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');
  const toastEl = document.getElementById('toast');

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function getCurCfg() { return state.config[state.dist]; }

  // ================== 5. 主题与常亮引擎 ==================
  const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const resolved = prefs.theme === 'system' ? (darkMedia.matches ? 'dark' : 'light') : prefs.theme;
    document.documentElement.setAttribute('data-theme', resolved);
    const metaTheme = document.getElementById('metaThemeColor');
    if (metaTheme) metaTheme.setAttribute('content', resolved === 'dark' ? '#131c31' : '#ffffff');
    drawPrismDial();
  }
  darkMedia.addEventListener('change', () => { if (prefs.theme === 'system') applyTheme(); });

  let wakeLockSentinel = null;
  async function syncWakeLock() {
    if (prefs.wakeLock && 'wakeLock' in navigator) {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
      } catch {}
    } else if (wakeLockSentinel) {
      try { await wakeLockSentinel.release(); } catch {}
      wakeLockSentinel = null;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && prefs.wakeLock) syncWakeLock();
  });

  function applyPrismStepSetting() {
    const step = Number(prefs.prismStep) || 1;
    sliderPrismH.step = step;
    sliderPrismV.step = step;
    document.querySelectorAll('.stepHint').forEach(el => el.textContent = step);
  }

  // ================== 6. 严格光学向量引擎 ==================
  function getTrueDeviationD_OD(cfg) {
    if (cfg.type === 'ortho') return { x: 0, y: 0 };
    let dx = 0, dy = 0;
    const hp = cfg.hDir === 'none' ? 0 : Number(cfg.hPrism);
    const vp = cfg.vDir === 'none' ? 0 : Number(cfg.vPrism);
    if (cfg.hDir === 'exo') dx = -hp;
    else if (cfg.hDir === 'eso') dx = +hp;
    if (cfg.vDir === 'r_hyper') dy = +vp;
    else if (cfg.vDir === 'l_hyper') dy = -vp;
    return { x: dx, y: dy };
  }

  function getPrismVectors() {
    const P_OD = state.prism.eye === 'OD' ? { x: state.prism.sx, y: state.prism.sy } : { x: 0, y: 0 };
    const P_OS = state.prism.eye === 'OS' ? { x: state.prism.sx, y: state.prism.sy } : { x: 0, y: 0 };
    return { P_OD, P_OS };
  }

  function getResidualVector(cfg) {
    const D = getTrueDeviationD_OD(cfg);
    const { P_OD, P_OS } = getPrismVectors();
    return { x: D.x + P_OD.x - P_OS.x, y: D.y + P_OD.y - P_OS.y };
  }

  function getRecoverySpeed(recovery) {
    return recovery === 'fast' ? 7.5 : recovery === 'medium' ? 4.2 : 1.9;
  }

  function formatPrismH(sx, eye) {
    const v = Math.round(sx * 10) / 10;
    if (Math.abs(v) < 0.05) return '0Δ';
    const isBI = eye === 'OD' ? (v > 0) : (v < 0);
    return `${Math.abs(v).toFixed(v % 1 === 0 ? 0 : 1)}Δ ${isBI ? 'BI' : 'BO'}`;
  }

  function formatPrismV(sy) {
    const v = Math.round(sy * 10) / 10;
    if (Math.abs(v) < 0.05) return '0Δ';
    return `${Math.abs(v).toFixed(v % 1 === 0 ? 0 : 1)}Δ ${v > 0 ? 'BU' : 'BD'}`;
  }

  // 返回旋转斜视在 Canvas 中的目标角度（顺时针为正）
  // OD(左屏): 外旋(12点向颞侧/左) = -deg; 内旋(12点向鼻侧/右) = +deg
  // OS(右屏): 外旋(12点向颞侧/右) = +deg; 内旋(12点向鼻侧/左) = -deg
  function getTorsionDeg(eye, cfg) {
    const deg = (!cfg.cDir || cfg.cDir === 'none') ? 0 : Number(cfg.cDeg || 0);
    if (deg <= 0) return 0;
    if (cfg.cDir === 'excyclo') return eye === 'OD' ? -deg : deg;
    if (cfg.cDir === 'incyclo') return eye === 'OD' ? deg : -deg;
    return 0;
  }

  function formatTrueDesc(cfg) {
    if (cfg.type === 'dvd') {
      const vp = Number(cfg.vPrism || 12);
      const cStr = (cfg.cDir && cfg.cDir !== 'none' && cfg.cDeg > 0) ? `+${cfg.cDir === 'excyclo' ? '外旋' : '内旋'}${cfg.cDeg}°` : '';
      return `DVD(上漂${vp}Δ${cStr})`;
    }
    if (cfg.type === 'ortho') {
      const k = Number(cfg.kappa || 0);
      return k !== 0 ? `假性${k > 0 ? '外斜' : '内斜'}(Kappa ${k > 0 ? '+' : ''}${k}Δ)` : '正位 0Δ';
    }
    const parts = [];
    if (cfg.hDir !== 'none' && cfg.hPrism > 0) parts.push(`${cfg.hDir === 'exo' ? '外偏' : '内偏'}${cfg.hPrism}Δ`);
    if (cfg.vDir !== 'none' && cfg.vPrism > 0) parts.push(`${cfg.vDir === 'r_hyper' ? '右上' : '左上'}${cfg.vPrism}Δ`);
    if (cfg.cDir && cfg.cDir !== 'none' && cfg.cDeg > 0) parts.push(`${cfg.cDir === 'excyclo' ? '外旋' : '内旋'}${cfg.cDeg}°`);
    return parts.length ? parts.join('+') : '正位 0Δ';
  }

  function formatSingleRecord(cfg, isNear) {
    const suf = isNear ? "'" : '';
    if (cfg.type === 'dvd') return `DVD${suf} (+${cfg.vPrism || 14}Δ)`;
    if (cfg.type === 'ortho') {
      const k = Number(cfg.kappa || 0);
      return k !== 0 ? `Ortho${suf} (Kappa ${k > 0 ? '+' : ''}${k}Δ)` : `Ortho${suf}`;
    }
    const parts = [];
    if (cfg.hDir !== 'none' && cfg.hPrism > 0) {
      let code = cfg.hDir === 'exo' ? 'X' : 'E';
      if (cfg.type === 'constant') code = (cfg.eye === 'OD' ? 'R' : 'L') + code + 'T';
      else if (cfg.type === 'alternating') code = 'Alt ' + code + 'T';
      else if (cfg.type === 'intermittent') code = code + '(T)';
      parts.push(`${cfg.hPrism}Δ ${code}${suf}`);
    }
    if (cfg.vDir !== 'none' && cfg.vPrism > 0) {
      const eyePfx = cfg.vDir === 'r_hyper' ? 'R' : 'L';
      const vCode = (cfg.type === 'phoria') ? `${eyePfx}H` : `${eyePfx}HT`;
      parts.push(`${cfg.vPrism}Δ ${vCode}${suf}`);
    }
    if (cfg.cDir && cfg.cDir !== 'none' && cfg.cDeg > 0) {
      parts.push(`${cfg.cDeg}° ${cfg.cDir === 'excyclo' ? 'Excyclo' : 'Incyclo'}`);
    }
    return parts.length ? parts.join(' + ') : `Ortho${suf}`;
  }

  // ================== 7. 眼位运动与临床注文同步 ==================
  function updateTargetsAndNotes(actionType) {
    const cfg = getCurCfg();
    const D = getTrueDeviationD_OD(cfg);
    const { P_OD, P_OS } = getPrismVectors();
    const R = getResidualVector(cfg);

    const hasTrueDev = Math.hypot(D.x, D.y) > 0.1;
    const resMag = Math.hypot(R.x, R.y);
    const isNeutralized = resMag < 0.75;
    const isBlind = state.appMode === 'exam' && state.examBlind && !state.examRevealed;

    const fixOD = { x: -P_OD.x, y: -P_OD.y };
    const fixOS = { x: -P_OS.x, y: -P_OS.y };
    let odTarget = { ...fixOD };
    let osTarget = { ...fixOS };
    let odRot = 0, osRot = 0;
    let odSpeed = 14, osSpeed = 14;
    const hasTorsion = cfg.cDir && cfg.cDir !== 'none' && Number(cfg.cDeg || 0) > 0;
    const kappaVal = Number(cfg.kappa || 0);

    let stageText = '自然双眼注视 (Binocular)';
    let titleText = '';
    let descText = '';
    let watchText = '观察双眼角膜映光 (Hirschberg)';
    let dynText = '静止固视 (Fixation)';

    hintOD.classList.remove('focus-target');
    hintOS.classList.remove('focus-target');
    hintOD.textContent = '患者右眼 (OD) — 点击画布左侧遮盖';
    hintOS.textContent = '患者左眼 (OS) — 点击画布右侧遮盖';

    if (state.cover === 'none') {
      phys.OD.tPupil = 14.5;
      phys.OS.tPupil = 14.5;

      if (!hasTrueDev || cfg.type === 'ortho') {
        state.fixatingEye = 'BOTH';
        stageText = actionType === 'uncover' ? '去遮盖期 (Uncover)' : '自然双眼注视 (Binocular)';
        titleText = isNeutralized ? '双眼正位，无恢复性眼动' : '正位眼戴入棱镜，去遮盖时产生棱镜诱发融像移动';
        descText = isNeutralized ? '双眼视轴对准视标，角膜映光点居中。' : '由于放置了额外棱镜，双眼需要克服棱镜量进行融像转正。';
      } else if (cfg.type === 'phoria') {
        state.fixatingEye = 'BOTH';
        const recSpeed = getRecoverySpeed(cfg.recovery);
        odSpeed = recSpeed; osSpeed = recSpeed;
        if (actionType === 'uncover' && state.prevCover !== 'none') {
          const uncovered = state.prevCover;
          stageText = `去遮盖期 (Uncover) — 移开${uncovered === 'OD' ? '右眼' : '左眼'}遮盖板`;
          if (isNeutralized) {
            titleText = `已达中和点！去遮盖瞬间 ${uncovered} 纹丝不动`;
            descText = '当前棱镜已精准抵消潜藏隐斜，打破与恢复融像瞬间眼球均不再移动。';
            dynText = '已中和 · 零眼动';
          } else {
            titleText = `去遮盖瞬间 ${uncovered} 发生融像恢复移动`;
            descText = `移开遮盖板恢复融像后，${uncovered} 仍存在残余恢复性微动，请结合水平与垂直方向继续增减棱镜直至完全不动。`;
            dynText = '融像性聚散恢复 (Vergence)';
          }
          watchText = `盯紧刚去遮盖的 ${uncovered}`;
          if (uncovered === 'OD') { hintOD.classList.add('focus-target'); hintOD.textContent = '👁️ 盯紧右眼 (OD)：观察去遮盖微动'; }
          else { hintOS.classList.add('focus-target'); hintOS.textContent = '👁️ 盯紧左眼 (OS)：观察去遮盖微动'; }
        } else {
          stageText = '自然双眼注视 (融像代偿中)';
          titleText = isBlind ? '外观正位（可能潜藏隐斜或间歇性斜视）' : `外观正位（潜藏 ${formatTrueDesc(cfg)}）`;
          descText = '自然状态下大脑融像维持眼位，请点击遮盖按钮或交替遮盖 (ACT) 打破融像进行检查。';
          dynText = '融像维持';
        }
      } else if (cfg.type === 'constant') {
        const soundEye = cfg.eye === 'OD' ? 'OS' : 'OD';
        state.fixatingEye = soundEye;
        if (soundEye === 'OS') { osTarget = { ...fixOS }; odTarget = { x: fixOS.x + D.x, y: fixOS.y + D.y }; }
        else { odTarget = { ...fixOD }; osTarget = { x: fixOD.x - D.x, y: fixOD.y - D.y }; }
        odSpeed = 16; osSpeed = 16;
        stageText = actionType === 'uncover' ? '去遮盖期 (Uncover) — 健眼主导' : '自然双眼注视 (恒定性显斜)';
        titleText = isBlind ? `自然状态下可见显斜，健眼 (${soundEye}) 主导固视` : `健眼 (${soundEye}) 固视，患眼 (${cfg.eye}) 持续偏斜`;
        descText = '单眼恒定性显斜状态下，请使用<strong>交替遮盖 (ACT)</strong> 配合棱镜排镜中和眼位，直至交替瞬间双眼完全不动。';
        dynText = actionType === 'uncover' ? '快速扫视 (Saccade)' : '显斜维持';
      } else if (cfg.type === 'alternating') {
        if (state.fixatingEye === 'BOTH') state.fixatingEye = cfg.eye === 'OD' ? 'OS' : 'OD';
        if (state.fixatingEye === 'OS') { osTarget = { ...fixOS }; odTarget = { x: fixOS.x + D.x, y: fixOS.y + D.y }; }
        else { odTarget = { ...fixOD }; osTarget = { x: fixOD.x - D.x, y: fixOD.y - D.y }; }
        stageText = actionType === 'uncover' ? '去遮盖期 (Uncover) — 交替保持' : '自然双眼注视 (交替性显斜)';
        titleText = `当前由 ${state.fixatingEye} 保持固视，对侧眼停留在斜位`;
        descText = '双眼交替性显斜特征：移开遮盖板后不抢注视权。请用交替遮盖 (ACT) + 棱镜排镜中和。';
        dynText = '交替保持';
      } else if (cfg.type === 'intermittent') {
        if (actionType === 'uncover' && state.intermittentBroken) {
          const recSpeed = getRecoverySpeed(cfg.recovery);
          odSpeed = recSpeed; osSpeed = recSpeed;
          state.fixatingEye = 'BOTH';
          state.intermittentBroken = false;
          stageText = '去遮盖期 (Uncover) — 间歇性显斜恢复';
          titleText = isNeutralized ? '已中和，去遮盖无恢复移动' : '去遮盖后眼球缓慢拉回正位';
          descText = '间歇性斜视在遮盖打破融像后显现偏斜，去遮盖时缓慢融像拉回。';
          dynText = isNeutralized ? '已中和 (0Δ)' : '迟缓融像拉回';
        } else {
          state.fixatingEye = 'BOTH';
          stageText = '自然双眼注视 (间歇正位期)';
          titleText = '当前双眼维持正位，请用交替遮盖 (ACT) 充分打破融像';
          descText = '遮盖打破融像后即可完整暴露偏斜量并进行棱镜中和。';
        }
      }
    } else {
      const covered = state.cover;
      const uncovered = covered === 'OD' ? 'OS' : 'OD';
      phys[covered].tPupil = 19.2;
      phys[uncovered].tPupil = 14.5;

      const isACT = state.isAlternating;
      stageText = isACT ? `交替遮盖 (ACT) — 遮盖 ${covered}` : `遮盖期 (Cover) — 遮盖 ${covered}`;

      if (covered === 'OD') { osTarget = { ...fixOS }; odTarget = { x: fixOS.x + D.x, y: fixOS.y + D.y }; }
      else { odTarget = { ...fixOD }; osTarget = { x: fixOD.x - D.x, y: fixOD.y - D.y }; }

      if (cfg.type === 'phoria' && !isACT) {
        if (covered === 'OD') odSpeed = 2.8; else osSpeed = 2.8;
      } else {
        odSpeed = 16; osSpeed = 16;
      }

      if (cfg.type === 'intermittent') state.intermittentBroken = true;
      state.fixatingEye = uncovered;

      if (isNeutralized) {
        titleText = `已达中和点！遮盖 ${covered} 时，${uncovered} 纹丝不动`;
        descText = '当前棱镜排镜已精确中和斜视向量（残余 < 0.75Δ）。可尝试再加 2Δ 确认是否出现<strong>反向微动（过矫点）</strong>！';
        dynText = '已中和 · 零眼动';
      } else {
        const moveVec = uncovered === 'OS' ? { x: R.x, y: R.y } : { x: -R.x, y: -R.y };
        const hMoveDesc = Math.abs(moveVec.x) < 0.75 ? '水平不动' :
          (uncovered === 'OD'
            ? (moveVec.x > 0 ? '由外向内动 (残余外偏，加 BI)' : '由内向外动 (残余内偏，加 BO)')
            : (moveVec.x < 0 ? '由外向内动 (残余外偏，加 BI)' : '由内向外动 (残余内偏，加 BO)'));
        const vMoveDesc = Math.abs(moveVec.y) < 0.75 ? '垂直不动' :
          (moveVec.y < 0
            ? `${uncovered} 向下转正 (原偏上，${uncovered} 加 BD / 对侧加 BU)`
            : `${uncovered} 向上转正 (原偏下，${uncovered} 加 BU / 对侧加 BD)`);

        titleText = `遮盖 ${covered}：紧盯未遮盖眼 (${uncovered}) 运动方向`;
        descText = `<strong>水平：</strong>${hMoveDesc}<br/><strong>垂直：</strong>${vMoveDesc}`;
        dynText = (cfg.type === 'phoria' && !isACT) ? '板后慢漂 (Drift)' : '快速转正扫视 (Saccade)';
      }

      watchText = `盯紧未遮盖眼 ${uncovered}`;
      if (uncovered === 'OD') { hintOD.classList.add('focus-target'); hintOD.textContent = '👁️ 盯紧未遮盖眼：右眼 (OD)'; }
      else { hintOS.classList.add('focus-target'); hintOS.textContent = '👁️ 盯紧未遮盖眼：左眼 (OS)'; }
    }

    // 特殊眼位：分离性垂直偏斜 (DVD) 独立覆盖
    if (cfg.type === 'dvd') {
      const dvdAmt = Math.max(6, Number(cfg.vPrism || 14));
      if (state.cover === 'OD') {
        osTarget = { ...fixOS };
        odTarget = { x: fixOD.x, y: fixOD.y + dvdAmt };
        odRot = getTorsionDeg('OD', cfg);
        odSpeed = 2.2;
        titleText = 'DVD 特征：被遮盖的右眼 (OD) 缓慢上漂（可伴外旋），左眼不动';
        descText = '分离性垂直偏斜 (DVD) 违背 Hering 定律：无论遮盖哪只眼，<strong>被遮盖眼均会缓慢上漂</strong>，且对侧眼不会发生下斜，三棱镜常规中和法不适用。';
        dynText = '非等量缓慢上漂 (DVD Drift)';
      } else if (state.cover === 'OS') {
        odTarget = { ...fixOD };
        osTarget = { x: fixOS.x, y: fixOS.y + dvdAmt };
        osRot = getTorsionDeg('OS', cfg);
        osSpeed = 2.2;
        titleText = 'DVD 特征：被遮盖的左眼 (OS) 缓慢上漂（可伴外旋），右眼不动';
        descText = '分离性垂直偏斜 (DVD) 特征：改遮左眼时左眼同样向上漂移，去遮盖后缓慢回落，不伴随对侧眼下斜。';
        dynText = '非等量缓慢上漂 (DVD Drift)';
      } else {
        odTarget = { ...fixOD }; osTarget = { ...fixOS };
        odSpeed = 2.8; osSpeed = 2.8;
        titleText = actionType === 'uncover' ? '去遮盖后，刚才上漂的眼球缓慢回落正位' : '自然双眼注视（分离性垂直偏斜 DVD 潜伏期）';
        descText = '请分别遮盖右眼 (OD) 与左眼 (OS)（建议开启“透视”），观察双眼被遮盖时各自独立上漂的经典表现。';
      }
    } else if (hasTorsion) {
      // 常规旋转斜视扭转计算
      if (state.cover === 'none') {
        if (cfg.type === 'constant') {
          if (cfg.eye === 'OD') odRot = getTorsionDeg('OD', cfg);
          else osRot = getTorsionDeg('OS', cfg);
        } else if (cfg.type === 'alternating') {
          const devEye = state.fixatingEye === 'OD' ? 'OS' : 'OD';
          if (devEye === 'OD') odRot = getTorsionDeg('OD', cfg);
          else osRot = getTorsionDeg('OS', cfg);
        }
      } else if (state.cover === 'OD') {
        odRot = getTorsionDeg('OD', cfg);
      } else if (state.cover === 'OS') {
        osRot = getTorsionDeg('OS', cfg);
      }
      if (!isBlind) {
        descText += `<br/><span style="color:var(--purple);"><strong>旋转分量提示：</strong>存在 ${cfg.cDeg}° ${cfg.cDir === 'excyclo' ? '外旋' : '内旋'}（建议开启顶部“12点刻度”观察虹膜扭转）。三棱镜<strong>无法中和旋转斜视</strong>，临床需用双马氏杆 (Double Maddox Rod) 定量。</span>`;
      }
    }

    // 假性斜视 (大 Kappa 角) 提示
    if (cfg.type === 'ortho' && Math.abs(kappaVal) >= 4 && !isBlind) {
      titleText = `假性${kappaVal > 0 ? '外斜' : '内斜'} (Kappa 角 ${kappaVal > 0 ? '+' : ''}${kappaVal}Δ) — 遮盖试验双眼纹丝不动！`;
      descText = `虽然角膜映光点向${kappaVal > 0 ? '鼻侧' : '颞侧'}偏移、外观酷似${kappaVal > 0 ? '外斜视' : '内斜视'}，但遮盖-去遮盖及交替遮盖时<strong>眼球完全无移动</strong>，这是鉴别真假斜视的金标准。`;
    }

    phys.OD.tx = odTarget.x; phys.OD.ty = odTarget.y; phys.OD.tRot = odRot; phys.OD.speed = odSpeed;
    phys.OS.tx = osTarget.x; phys.OS.ty = osTarget.y; phys.OS.tRot = osRot; phys.OS.speed = osSpeed;

    const allPresets = [...PRESETS, ...savedCases];
    const presetObj = allPresets.find(item => item.id === state.activePresetId);
    if (isBlind) {
      currentModeBadge.textContent = '盲测中';
      prismBadge.textContent = '眼位：??? Δ';
      prismBadge.className = 'badge warn';
    } else {
      currentModeBadge.textContent = presetObj ? presetObj.name : '自定义复合';
      prismBadge.textContent = `眼位：${formatTrueDesc(cfg)}`;
      prismBadge.className = 'badge ok';
    }

    const pMag = Math.hypot(state.prism.sx, state.prism.sy);
    if (pMag < 0.05) {
      appliedPrismBadge.textContent = '排镜：0Δ';
    } else {
      const pAng = ((Math.round(Math.atan2(state.prism.sy, state.prism.sx) * 180 / Math.PI) % 360) + 360) % 360;
      appliedPrismBadge.textContent = `排镜(${state.prism.eye})：${pMag.toFixed(1)}Δ@${pAng}°`;
    }

    const odOff = Math.hypot(odTarget.x, odTarget.y);
    const osOff = Math.hypot(osTarget.x, osTarget.y);
    if (odOff < 1 && osOff < 1) {
      hirschbergBadge.textContent = '映光：居中';
      hirschbergBadge.className = 'badge ok';
    } else {
      const devEye = odOff >= osOff ? 'OD' : 'OS';
      const vec = devEye === 'OD' ? odTarget : osTarget;
      const shifts = [];
      if (Math.abs(vec.x) >= 1) {
        const isNasal = devEye === 'OD' ? (vec.x < 0) : (vec.x > 0);
        shifts.push(isNasal ? '偏鼻' : '偏颞');
      }
      if (Math.abs(vec.y) >= 1) shifts.push(vec.y > 0 ? '偏下' : '偏上');
      hirschbergBadge.textContent = `映光(${devEye})：${shifts.join('+')}`;
      hirschbergBadge.className = 'badge warn';
    }

    noteStageTag.textContent = stageText;
    noteTitle.textContent = titleText;
    noteDesc.innerHTML = descText;
    noteWatchEye.textContent = watchText;
    noteDynamics.textContent = dynText;

    noteResH.textContent = Math.abs(R.x) < 0.75 ? '已中和 (水平不动)' :
      (isBlind ? (R.x < 0 ? '仍有残余外偏' : '仍有残余内偏') : `残余 ${Math.abs(R.x).toFixed(1)}Δ (${R.x < 0 ? '外偏' : '内偏'})`);
    noteResV.textContent = Math.abs(R.y) < 0.75 ? '已中和 (垂直不动)' :
      (isBlind ? (R.y > 0 ? '仍有残余右上/左下' : '仍有残余左上/右下') : `残余 ${Math.abs(R.y).toFixed(1)}Δ (${R.y > 0 ? '右上' : '左上'})`);

    if (clinicalRecordText) {
      clinicalRecordText.textContent = isBlind
        ? '盲测中（提交或查看答案后显示标准病历写法）'
        : `D: ${formatSingleRecord(state.config.distance, false)}  |  N: ${formatSingleRecord(state.config.near, true)}`;
    }
    updateButtonStates();
  }

  function updateButtonStates() {
    btnCoverOD.classList.toggle('active-occ', state.cover === 'OD' && !state.isAlternating);
    btnCoverOS.classList.toggle('active-occ', state.cover === 'OS' && !state.isAlternating);
    btnAlternate.classList.toggle('alt-running', state.isAlternating);
    btnAlternate.textContent = state.isAlternating ? '停止交替' : '交替 ACT';
  }

  function stopAlternating() {
    if (state.altTimer) { clearInterval(state.altTimer); state.altTimer = null; }
    state.isAlternating = false;
  }

  function setCover(target) {
    vibrate(10);
    stopAlternating();
    state.prevCover = state.cover;
    state.cover = target;
    updateTargetsAndNotes(target === 'none' ? 'uncover' : 'cover');
  }

  function startActIntervalLoop() {
    if (state.altTimer) clearInterval(state.altTimer);
    const baseMs = Number(prefs.actInterval) || 1350;
    const intervalMs = state.slowMo ? Math.round(baseMs / (Number(prefs.slowRate) || 0.4)) : baseMs;
    state.altTimer = setInterval(() => {
      state.prevCover = state.cover;
      state.cover = state.cover === 'OD' ? 'OS' : 'OD';
      updateTargetsAndNotes('cover');
    }, intervalMs);
  }

  function toggleAlternating() {
    vibrate(14);
    if (state.isAlternating) {
      stopAlternating();
      state.prevCover = state.cover;
      state.cover = 'none';
      updateTargetsAndNotes('uncover');
      return;
    }
    state.isAlternating = true;
    state.prevCover = state.cover;
    state.cover = 'OD';
    updateTargetsAndNotes('cover');
    startActIntervalLoop();
  }

  // ================== 8. 2D 十字 + 外圈 360° 棱镜盘 ==================
  function syncPrismUI() {
    const { sx, sy, eye } = state.prism;
    const mag = Math.hypot(sx, sy);
    if (mag > 0.05) {
      state.prism.lastAngle = ((Math.round(Math.atan2(sy, sx) * 180 / Math.PI) % 360) + 360) % 360;
    }
    const ang = state.prism.lastAngle;

    sliderPrismH.value = Math.round(sx * 2) / 2;
    sliderPrismV.value = Math.round(sy * 2) / 2;
    sliderPrismAngle.value = ang;

    const hTxt = formatPrismH(sx, eye);
    const vTxt = formatPrismV(sy);
    lblSliderH.textContent = hTxt;
    lblSliderV.textContent = vTxt;
    lblSliderAngle.textContent = `${ang}°`;

    readPrismH.textContent = hTxt;
    readPrismV.textContent = vTxt;
    readPrismPolar.textContent = mag < 0.05 ? '0Δ @ 0°' : `${mag.toFixed(1)}Δ @ ${ang}°`;

    if (eye === 'OD') {
      endLeftH.textContent = '← BO 底外 (180°)';
      endRightH.textContent = 'BI 底内 (0°) →';
    } else {
      endLeftH.textContent = '← BI 底内 (180°)';
      endRightH.textContent = 'BO 底外 (0°) →';
    }

    drawPrismDial();
    updateTargetsAndNotes('prism');
  }

  function drawPrismDial() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const rect = prismDial.getBoundingClientRect();
    const size = Math.max(180, Math.round(rect.width || 224));
    const dpr = window.devicePixelRatio || 1;
    if (prismDial.width !== size * dpr) {
      prismDial.width = size * dpr;
      prismDial.height = size * dpr;
    }
    dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dCtx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const outerR = size * 0.435;
    const innerR = size * 0.33;
    const eye = state.prism.eye;

    // 外圈 360° 轨道
    dCtx.beginPath();
    dCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
    dCtx.strokeStyle = isDark ? '#24324d' : '#e2e8f0';
    dCtx.lineWidth = Math.max(14, size * 0.08);
    dCtx.stroke();

    for (let deg = 0; deg < 360; deg += 30) {
      const rad = deg * Math.PI / 180;
      dCtx.beginPath();
      dCtx.moveTo(cx + Math.cos(rad) * (outerR - 8), cy - Math.sin(rad) * (outerR - 8));
      dCtx.lineTo(cx + Math.cos(rad) * (outerR + 8), cy - Math.sin(rad) * (outerR + 8));
      dCtx.strokeStyle = deg % 90 === 0 ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#334155' : '#cbd5e1');
      dCtx.lineWidth = deg % 90 === 0 ? 1.8 : 1;
      dCtx.stroke();
    }

    // 内盘
    dCtx.beginPath();
    dCtx.arc(cx, cy, innerR, 0, Math.PI * 2);
    dCtx.fillStyle = isDark ? '#1a2540' : '#f8fafc';
    dCtx.fill();
    dCtx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    dCtx.lineWidth = 1.5;
    dCtx.stroke();

    [15, 30].forEach(p => {
      dCtx.beginPath();
      dCtx.arc(cx, cy, (p / 45) * innerR, 0, Math.PI * 2);
      dCtx.strokeStyle = isDark ? '#26344f' : '#e2e8f0';
      dCtx.lineWidth = 1;
      dCtx.stroke();
    });

    dCtx.beginPath();
    dCtx.moveTo(cx - innerR, cy); dCtx.lineTo(cx + innerR, cy);
    dCtx.moveTo(cx, cy - innerR); dCtx.lineTo(cx, cy + innerR);
    dCtx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    dCtx.lineWidth = 1.2;
    dCtx.stroke();

    dCtx.fillStyle = isDark ? '#94a3b8' : '#475569';
    dCtx.font = '700 9.5px -apple-system, sans-serif';
    dCtx.textAlign = 'center';
    dCtx.textBaseline = 'middle';
    dCtx.fillText('90° BU', cx, cy - innerR + 10);
    dCtx.fillText('270° BD', cx, cy + innerR - 10);

    dCtx.textAlign = 'left';
    dCtx.fillText(eye === 'OD' ? 'BO' : 'BI', cx - innerR + 4, cy - 7);
    dCtx.fillText('180°', cx - innerR + 4, cy + 7);

    dCtx.textAlign = 'right';
    dCtx.fillText(eye === 'OD' ? 'BI' : 'BO', cx + innerR - 4, cy - 7);
    dCtx.fillText('0°', cx + innerR - 4, cy + 7);

    const px = cx + (state.prism.sx / 45) * innerR;
    const py = cy - (state.prism.sy / 45) * innerR;
    const mag = Math.hypot(state.prism.sx, state.prism.sy);

    if (mag > 0.2) {
      dCtx.beginPath();
      dCtx.moveTo(cx, cy);
      dCtx.lineTo(px, py);
      dCtx.strokeStyle = '#3b82f6';
      dCtx.lineWidth = 2.5;
      dCtx.stroke();
    }

    dCtx.beginPath();
    dCtx.arc(cx, cy, 3, 0, Math.PI * 2);
    dCtx.fillStyle = '#94a3b8';
    dCtx.fill();

    dCtx.beginPath();
    dCtx.arc(px, py, 8, 0, Math.PI * 2);
    dCtx.fillStyle = '#3b82f6';
    dCtx.fill();
    dCtx.strokeStyle = '#ffffff';
    dCtx.lineWidth = 2.2;
    dCtx.stroke();

    const angRad = state.prism.lastAngle * Math.PI / 180;
    const rx = cx + Math.cos(angRad) * outerR;
    const ry = cy - Math.sin(angRad) * outerR;

    dCtx.beginPath();
    dCtx.arc(cx, cy, outerR, -angRad - 0.18, -angRad + 0.18);
    dCtx.strokeStyle = isDark ? '#a78bfa' : '#7c3aed';
    dCtx.lineWidth = 10;
    dCtx.lineCap = 'round';
    dCtx.stroke();

    dCtx.beginPath();
    dCtx.arc(rx, ry, 8, 0, Math.PI * 2);
    dCtx.fillStyle = isDark ? '#a78bfa' : '#7c3aed';
    dCtx.fill();
    dCtx.strokeStyle = '#ffffff';
    dCtx.lineWidth = 2.2;
    dCtx.stroke();
  }

  let dialDragMode = null;
  function handleDialPointer(e) {
    const rect = prismDial.getBoundingClientRect();
    const size = rect.width || 224;
    const innerR = size * 0.33;
    const x = (e.clientX - rect.left) - size / 2;
    const y = -((e.clientY - rect.top) - size / 2);
    const dist = Math.hypot(x, y);

    if (!dialDragMode) dialDragMode = dist >= innerR + 5 ? 'ring' : 'pad';

    if (dialDragMode === 'ring') {
      const ang = ((Math.round(Math.atan2(y, x) * 180 / Math.PI) % 360) + 360) % 360;
      state.prism.lastAngle = ang;
      let mag = Math.hypot(state.prism.sx, state.prism.sy);
      if (mag < 1) mag = 6;
      const rad = ang * Math.PI / 180;
      state.prism.sx = Math.max(-45, Math.min(45, mag * Math.cos(rad)));
      state.prism.sy = Math.max(-25, Math.min(25, mag * Math.sin(rad)));
    } else {
      const step = Number(prefs.prismStep) || 1;
      const snap = (val) => Math.round(val / step) * step;
      const clampedX = Math.max(-45, Math.min(45, (x / innerR) * 45));
      const clampedY = Math.max(-25, Math.min(25, (y / innerR) * 45));
      state.prism.sx = Math.abs(clampedX) < 0.8 ? 0 : snap(clampedX);
      state.prism.sy = Math.abs(clampedY) < 0.8 ? 0 : snap(clampedY);
    }
    syncPrismUI();
  }

  prismDial.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    prismDial.setPointerCapture(e.pointerId);
    dialDragMode = null;
    handleDialPointer(e);
  });
  prismDial.addEventListener('pointermove', (e) => {
    if (dialDragMode) { e.preventDefault(); handleDialPointer(e); }
  });
  prismDial.addEventListener('pointerup', () => { dialDragMode = null; });
  prismDial.addEventListener('pointercancel', () => { dialDragMode = null; });

  // ================== 9. 患者参数、收藏病例与预设 ==================
  function renderPresets() {
    presetChips.innerHTML = '';
    const all = [...PRESETS, ...savedCases];
    all.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (state.activePresetId === p.id ? ' active' : '') + (p.isCustom ? ' saved-case' : '');
      btn.textContent = p.isCustom ? `★ ${p.name}` : p.name;
      btn.addEventListener('click', () => {
        vibrate(8);
        stopAlternating();
        state.activePresetId = p.id;
        state.config.distance = { ...p.distance };
        state.config.near = { ...p.near };
        state.cover = 'none';
        state.prevCover = 'none';
        state.fixatingEye = 'BOTH';
        state.intermittentBroken = false;
        if ((p.distance.cDir && p.distance.cDir !== 'none' && p.distance.cDeg > 0) && !state.showTorsionGuide) {
          state.showTorsionGuide = true;
          torsionToggle.checked = true;
          torsionPill.classList.add('checked');
        }
        syncFormFromConfig();
        renderPresets();
        updateTargetsAndNotes('init');
      });
      presetChips.appendChild(btn);
    });
    document.getElementById('savedCasesCount').textContent = `已收藏 ${savedCases.length} 个自定义病例 · 全部纯本地存储`;
  }

  function syncFormFromConfig() {
    const cfg = getCurCfg();
    selType.value = cfg.type;
    selEye.value = cfg.eye;
    selRecovery.value = cfg.recovery;
    selHDir.value = cfg.hDir;
    rangeHPrism.value = cfg.hPrism;
    selVDir.value = cfg.vDir;
    rangeVPrism.value = cfg.vPrism;

    valHText.textContent = cfg.hDir === 'none' || cfg.hPrism == 0
      ? '无水平偏斜 (0Δ)'
      : `${cfg.hDir === 'exo' ? '外偏 (Exo)' : '内偏 (Eso)'} ${cfg.hPrism}Δ`;
    valVText.textContent = cfg.vDir === 'none' || cfg.vPrism == 0
      ? '无垂直偏斜 (0Δ)'
      : `${cfg.vDir === 'r_hyper' ? '右眼上偏 (RHT/RH)' : '左眼上偏 (LHT/LH)'} ${cfg.vPrism}Δ`;

    selCDir.value = cfg.cDir || 'none';
    rangeCDeg.value = cfg.cDeg || 0;
    valCText.textContent = (!cfg.cDir || cfg.cDir === 'none' || !cfg.cDeg)
      ? '无旋转偏斜 (0°)'
      : `${cfg.cDir === 'excyclo' ? '外旋 (Excyclo)' : '内旋 (Incyclo)'} ${cfg.cDeg}°`;

    const kv = Number(cfg.kappa || 0);
    rangeKappa.value = kv;
    valKappaText.textContent = kv === 0 ? '正常 (0Δ)' : `${kv > 0 ? '+' : ''}${kv}Δ (${kv > 0 ? '似外斜' : '似内斜'})`;

    editingDistLabel.textContent = state.dist === 'distance' ? '看远 5m' : '看近 40cm';
  }

  function onCustomParamChange() {
    state.activePresetId = null;
    const cfg = getCurCfg();
    cfg.type = selType.value;
    cfg.eye = selEye.value;
    cfg.recovery = selRecovery.value;
    cfg.hDir = selHDir.value;
    cfg.hPrism = cfg.hDir === 'none' ? 0 : Number(rangeHPrism.value);
    if (cfg.hDir !== 'none' && cfg.hPrism === 0) cfg.hPrism = 10;
    cfg.vDir = selVDir.value;
    cfg.vPrism = cfg.vDir === 'none' ? 0 : Number(rangeVPrism.value);
    if (cfg.vDir !== 'none' && cfg.vPrism === 0) cfg.vPrism = 6;
    cfg.cDir = selCDir.value;
    cfg.cDeg = cfg.cDir === 'none' ? 0 : Number(rangeCDeg.value);
    if (cfg.cDir !== 'none' && cfg.cDeg === 0) cfg.cDeg = 8;
    cfg.kappa = Number(rangeKappa.value || 0);
    syncFormFromConfig();
    renderPresets();
    updateTargetsAndNotes('custom');
  }

  document.getElementById('btnSaveCustomCase').addEventListener('click', () => {
    const cfg = getCurCfg();
    const label = formatTrueDesc(cfg);
    const newCase = {
      id: 'custom_' + Date.now(),
      name: label,
      isCustom: true,
      distance: { ...state.config.distance },
      near: { ...state.config.near }
    };
    savedCases.unshift(newCase);
    if (savedCases.length > 10) savedCases.pop();
    saveCases();
    state.activePresetId = newCase.id;
    renderPresets();
    vibrate(15);
    showToast(`已收藏病例：${label}`);
  });

  // ================== 10. 考场与练习统计 ==================
  function renderStats() {
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPass').textContent = stats.pass;
    const rate = stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0;
    document.getElementById('statRate').textContent = `${rate}%`;

    const list = document.getElementById('historyList');
    if (!stats.history || stats.history.length === 0) {
      list.innerHTML = '<div style="text-align:center; font-size:12px; color:var(--muted); padding:8px 0;">暂无实战盲测记录</div>';
      return;
    }
    list.innerHTML = stats.history.slice(0, 8).map(item => `
      <div class="history-item">
        <span><strong>${item.truth}</strong> · 误差 H:${item.errH}Δ/V:${item.errV}Δ</span>
        <span style="font-weight:700; color:${item.pass ? 'var(--success)' : 'var(--danger)'};">${item.pass ? '通过' : '未达标'}</span>
      </div>
    `).join('');
  }

  function switchMobileTab(tabName) {
    if (tabName === 'settings') {
      openSettings();
      return;
    }
    document.body.setAttribute('data-active-mtab', tabName);
    document.querySelectorAll('#mobileBottomNav .nav-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.target === tabName);
    });
    if (tabName === 'prism') setTimeout(drawPrismDial, 25);
  }

  function startBlindExam(kind) {
    vibrate(14);
    stopAlternating();
    const cfg = getCurCfg();
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    if (kind !== 'custom') {
      state.activePresetId = null;
      cfg.type = pick(['phoria', 'constant', 'alternating']);
      cfg.eye = pick(['OD', 'OS']);
      cfg.recovery = pick(['fast', 'medium']);
      if (kind === 'horiz') {
        cfg.hDir = pick(['exo', 'eso']); cfg.hPrism = randInt(3, 15) * 2;
        cfg.vDir = 'none'; cfg.vPrism = 0;
      } else if (kind === 'vert') {
        cfg.hDir = 'none'; cfg.hPrism = 0;
        cfg.vDir = pick(['r_hyper', 'l_hyper']); cfg.vPrism = randInt(2, 9) * 2;
      } else {
        cfg.hDir = pick(['exo', 'eso']); cfg.hPrism = randInt(4, 14) * 2;
        cfg.vDir = pick(['r_hyper', 'l_hyper']); cfg.vPrism = randInt(2, 7) * 2;
      }
      syncFormFromConfig();
      renderPresets();
    }

    state.prism.sx = 0;
    state.prism.sy = 0;
    state.examBlind = true;
    state.examRevealed = false;
    state.cover = 'none';
    state.prevCover = 'none';
    state.fixatingEye = 'BOTH';

    patientConfigPanel.classList.add('hidden');
    examResultBox.className = 'exam-result-box';
    examStatusBadge.textContent = '盲测中';
    examStepTitle.textContent = '盲测已开始！请用交替遮盖 (ACT) + 棱镜排镜中和';
    examStepDesc.textContent = '先中和水平移动（BI/BO），再中和垂直移动（BU/BD），也可拖动下方 2D 盘或外圈 360° 环。';

    switchMobileTab('prism');
    syncPrismUI();
  }

  function evaluateExam(revealOnly = false) {
    const cfg = getCurCfg();
    const D = getTrueDeviationD_OD(cfg);
    const R = getResidualVector(cfg);
    const errH = Math.abs(R.x);
    const errV = Math.abs(R.y);
    const tol = Number(prefs.examTolerance) || 2;

    const idealP = state.prism.eye === 'OD' ? { x: -D.x, y: -D.y } : { x: D.x, y: D.y };
    const idealMag = Math.hypot(idealP.x, idealP.y);
    const idealAng = idealMag < 0.1 ? 0 : ((Math.round(Math.atan2(idealP.y, idealP.x) * 180 / Math.PI) % 360) + 360) % 360;

    const isPass = !revealOnly && errH <= tol && errV <= Math.min(tol, 2);

    if (!revealOnly && state.examBlind && !state.examRevealed) {
      stats.total += 1;
      if (isPass) stats.pass += 1;
      stats.history = stats.history || [];
      stats.history.unshift({
        truth: formatTrueDesc(cfg),
        errH: errH.toFixed(1),
        errV: errV.toFixed(1),
        pass: isPass
      });
      if (stats.history.length > 20) stats.history.pop();
      saveStats();
      renderStats();
    }

    state.examRevealed = true;
    patientConfigPanel.classList.remove('hidden');
    examResultBox.className = 'exam-result-box show ' + (isPass ? 'pass' : 'fail');
    vibrate(isPass ? [15, 40, 20] : 25);

    const headerText = revealOnly
      ? '📋 真实眼位与标准中和棱镜参考：'
      : (isPass ? `🎉 恭喜！棱镜中和达标（容差 ±${tol}Δ）` : `⚠️ 尚未完全中和（当前容差 ±${tol}Δ）`);

    examResultBox.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">${headerText}</div>
      <div>• <strong>真实眼位：</strong>${formatTrueDesc(cfg)}（${selType.options[selType.selectedIndex].text}）</div>
      <div>• <strong>标准排镜 (${state.prism.eye})：</strong>${formatPrismH(idealP.x, state.prism.eye)} / ${formatPrismV(idealP.y)}（360°：<strong>${idealMag.toFixed(1)}Δ @ ${idealAng}°</strong>）</div>
      <div>• <strong>你的排镜 (${state.prism.eye})：</strong>${formatPrismH(state.prism.sx, state.prism.eye)} / ${formatPrismV(state.prism.sy)}（误差 H:${errH.toFixed(1)}Δ / V:${errV.toFixed(1)}Δ）</div>
    `;
    examStatusBadge.textContent = isPass ? '考核通过' : '已公布答案';
    updateTargetsAndNotes('exam_reveal');
  }

  // ================== 11. 高帧率 Canvas 2D 拟人眼球渲染 ==================
  let canvasW = 800, canvasH = 220;
  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    canvasW = Math.max(280, rect.width || 800);
    canvasH = Math.max(140, rect.height || 220);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvasW * dpr);
    canvas.height = Math.floor(canvasH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPrismDial();
  }
  new ResizeObserver(resizeCanvas).observe(canvasWrap);
  resizeCanvas();

  function drawEye(cx, cy, eyeCode, eyePhys) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const palette = IRIS_PALETTES[prefs.irisColor] || IRIS_PALETTES.brown;
    const rx = Math.min(72, canvasW * 0.165, canvasH * 0.35);
    const ry = rx * 0.56;
    const scalePx = (rx / 82) * 0.86;
    const microX = Math.sin(phys.time * 4.3 + (eyeCode === 'OD' ? 0 : 2)) * 0.22;
    const microY = Math.cos(phys.time * 3.7 + (eyeCode === 'OD' ? 1 : 3)) * 0.18;

    const offsetX = eyePhys.x * scalePx + microX;
    const offsetY = -eyePhys.y * scalePx + microY;

    ctx.save();

    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, rx * 1.08, ry * 1.18, 0, 0, Math.PI * 2);
    const orbitGrad = ctx.createRadialGradient(cx, cy, ry * 0.5, cx, cy, rx * 1.15);
    orbitGrad.addColorStop(0, isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(180, 130, 100, 0.22)');
    orbitGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbitGrad;
    ctx.fill();

    const blinkFactor = Math.max(0.05, 1 - phys.blink);
    const curRy = ry * blinkFactor;

    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.quadraticCurveTo(cx, cy - curRy * 1.42, cx + rx, cy);
    ctx.quadraticCurveTo(cx, cy + curRy * 1.25, cx - rx, cy);
    ctx.closePath();

    const scleraGrad = ctx.createRadialGradient(cx + offsetX * 0.3, cy + offsetY * 0.3, 10, cx, cy, rx);
    scleraGrad.addColorStop(0, isDark ? '#f1f5f9' : '#ffffff');
    scleraGrad.addColorStop(0.78, isDark ? '#e2e8f0' : '#f8fafc');
    scleraGrad.addColorStop(1, isDark ? '#b8a9a3' : '#e2d5cf');
    ctx.fillStyle = scleraGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();

    const caruncleX = eyeCode === 'OD' ? cx + rx - 5 : cx - rx + 5;
    ctx.beginPath();
    ctx.arc(caruncleX, cy + 1, Math.max(5, rx * 0.11), 0, Math.PI * 2);
    ctx.fillStyle = '#e79d9d';
    ctx.fill();

    const irisX = cx + offsetX;
    const irisY = cy + offsetY;
    const irisR = rx * 0.45;

    const irisGrad = ctx.createRadialGradient(irisX, irisY, irisR * 0.2, irisX, irisY, irisR);
    irisGrad.addColorStop(0, palette[0]);
    irisGrad.addColorStop(0.55, palette[1]);
    irisGrad.addColorStop(0.88, palette[2]);
    irisGrad.addColorStop(1, palette[3]);
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    const pupilR = eyePhys.pupil * (rx / 82);
    const rotRad = (eyePhys.rot || 0) * Math.PI / 180;

    // 旋转坐标系绘制虹膜纹理与特征斑（直观呈现旋转斜视）
    ctx.save();
    ctx.translate(irisX, irisY);
    ctx.rotate(rotRad);

    ctx.strokeStyle = palette[4];
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (pupilR + 2), Math.sin(ang) * (pupilR + 2));
      ctx.lineTo(Math.cos(ang) * (irisR - 2), Math.sin(ang) * (irisR - 2));
      ctx.stroke();
    }

    // 自然虹膜特征斑点（辅助无刻度时观察扭转）
    ctx.fillStyle = 'rgba(255, 225, 180, 0.28)';
    ctx.beginPath();
    ctx.arc(0, -(pupilR + (irisR - pupilR) * 0.55), 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(irisR * 0.62, irisR * 0.25, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 12点刻度（旋转指示针）
    if (state.showTorsionGuide) {
      ctx.beginPath();
      ctx.moveTo(0, -(pupilR + 1));
      ctx.lineTo(0, -(irisR - 1));
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -(irisR - 3), 2.8, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }
    ctx.restore();

    // 固定垂直参考虚线（对比12点旋转角度）
    if (state.showTorsionGuide) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(irisX, irisY - irisR - 6);
      ctx.lineTo(irisX, irisY - pupilR);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(irisX, irisY, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();

    // 唯一角膜反光点 (Hirschberg 单光点，叠加 Kappa 角偏移)
    // 正 Kappa 角使反光点向鼻侧偏移（OD 向右 +x，OS 向左 -x）
    const kappaPx = Number(getCurCfg().kappa || 0) * scalePx * 0.72;
    const kappaShiftX = eyeCode === 'OD' ? kappaPx : -kappaPx;
    const reflexX = cx + offsetX * 0.10 + kappaShiftX;
    const reflexY = cy + offsetY * 0.10;
    ctx.beginPath();
    ctx.arc(reflexX, reflexY, Math.max(2.8, rx * 0.052), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.rect(cx - rx, cy - ry * 1.4, rx * 2, ry * 0.6);
    const lidShadow = ctx.createLinearGradient(0, cy - curRy * 1.1, 0, cy - curRy * 0.2);
    lidShadow.addColorStop(0, 'rgba(30, 20, 15, 0.30)');
    lidShadow.addColorStop(1, 'rgba(30, 20, 15, 0)');
    ctx.fillStyle = lidShadow;
    ctx.fill();

    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.quadraticCurveTo(cx, cy - curRy * 1.42, cx + rx, cy);
    ctx.strokeStyle = isDark ? '#1e1b18' : '#291d18';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.quadraticCurveTo(cx, cy + curRy * 1.25, cx + rx, cy);
    ctx.strokeStyle = isDark ? '#786258' : '#9c7868';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '700 11.5px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(eyeCode === 'OD' ? '右眼 (OD)' : '左眼 (OS)', cx, cy + ry + 22);

    ctx.restore();
  }

  function drawPrismLens(cx, cy, eyeCode) {
    if (state.prism.eye !== eyeCode) return;
    const mag = Math.hypot(state.prism.sx, state.prism.sy);
    if (mag < 0.15) return;

    const r = Math.min(78, canvasW * 0.175, canvasH * 0.39);
    const angRad = Math.atan2(state.prism.sy, state.prism.sx);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(0, 0, r, -angRad - 0.35, -angRad + 0.35);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function drawOccluder(cx, cy, progress) {
    if (progress <= 0.01) return;
    const r = Math.min(80, canvasW * 0.18, canvasH * 0.40);
    const yPos = cy + (1 - progress) * (canvasH * 0.8);

    ctx.save();
    ctx.globalAlpha = state.xray ? 0.30 * progress : 0.96 * progress;

    ctx.beginPath();
    ctx.roundRect(cx - 8, yPos + r - 6, 16, 120, 7);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, yPos, r, 0, Math.PI * 2);
    const occGrad = ctx.createRadialGradient(cx - 16, yPos - 16, 8, cx, yPos, r);
    occGrad.addColorStop(0, '#334155');
    occGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = occGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = state.xray ? '#38bdf8' : '#475569';
    ctx.stroke();
    ctx.restore();
  }

  let lastTs = performance.now();
  function loop(ts) {
    const rawDt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const slowFactor = Number(prefs.slowRate) || 0.4;
    const dt = state.slowMo ? rawDt * slowFactor : rawDt;
    phys.time += dt;

    ['OD', 'OS'].forEach(k => {
      const e = phys[k];
      const factor = 1 - Math.exp(-e.speed * dt);
      e.x += (e.tx - e.x) * factor;
      e.y += (e.ty - e.y) * factor;
      e.rot += (e.tRot - e.rot) * factor;
      e.pupil += (e.tPupil - e.pupil) * (1 - Math.exp(-6 * dt));
    });

    const tOccOD = state.cover === 'OD' ? 1 : 0;
    const tOccOS = state.cover === 'OS' ? 1 : 0;
    const occFactor = 1 - Math.exp(-15 * dt);
    phys.occOD += (tOccOD - phys.occOD) * occFactor;
    phys.occOS += (tOccOS - phys.occOS) * occFactor;

    phys.blinkTimer -= rawDt;
    if (phys.blinkTimer <= 0) {
      phys.blink = Math.sin(Math.min(1, -phys.blinkTimer / 0.16) * Math.PI);
      if (phys.blinkTimer <= -0.16) {
        phys.blink = 0;
        phys.blinkTimer = 3.2 + Math.random() * 2.5;
      }
    }

    ctx.clearRect(0, 0, canvasW, canvasH);
    const cy = canvasH * 0.44;
    const odX = canvasW * 0.28;
    const osX = canvasW * 0.72;

    ctx.beginPath();
    ctx.moveTo(canvasW * 0.5, cy - 28);
    ctx.lineTo(canvasW * 0.5, cy + 44);
    ctx.strokeStyle = 'rgba(180, 140, 115, 0.16)';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.stroke();

    drawEye(odX, cy, 'OD', phys.OD);
    drawEye(osX, cy, 'OS', phys.OS);
    drawPrismLens(odX, cy, 'OD');
    drawPrismLens(osX, cy, 'OS');
    drawOccluder(odX, cy, phys.occOD);
    drawOccluder(osX, cy, phys.occOS);

    requestAnimationFrame(loop);
  }

  // ================== 12. 设置抽屉、弹窗与 PWA 安装 ==================
  function openSettings() {
    vibrate(8);
    renderStats();
    drawerBackdrop.classList.add('open');
    settingsDrawer.classList.add('open');
    settingsDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    drawerBackdrop.classList.remove('open');
    settingsDrawer.classList.remove('open');
    settingsDrawer.setAttribute('aria-hidden', 'true');
  }

  function openModal(html) {
    modalContent.innerHTML = html;
    modalOverlay.classList.add('open');
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.getElementById('btnOpenSettings').addEventListener('click', openSettings);
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
  document.getElementById('btnFooterSettings').addEventListener('click', openSettings);
  drawerBackdrop.addEventListener('click', closeSettings);

  // 绑定设置表单初始值与变更
  setTheme.value = prefs.theme;
  setIrisColor.value = prefs.irisColor;
  setWakeLock.checked = !!prefs.wakeLock;
  setActInterval.value = String(prefs.actInterval);
  setPrismStep.value = String(prefs.prismStep);
  setSlowRate.value = String(prefs.slowRate);
  setExamTolerance.value = String(prefs.examTolerance);
  setHaptics.checked = prefs.haptics !== false;

  setTheme.addEventListener('change', () => { prefs.theme = setTheme.value; savePrefs(); applyTheme(); });
  setIrisColor.addEventListener('change', () => { prefs.irisColor = setIrisColor.value; savePrefs(); });
  setWakeLock.addEventListener('change', () => { prefs.wakeLock = setWakeLock.checked; savePrefs(); syncWakeLock(); showToast(prefs.wakeLock ? '已开启防息屏常亮' : '已关闭防息屏常亮'); });
  setActInterval.addEventListener('change', () => {
    prefs.actInterval = Number(setActInterval.value);
    savePrefs();
    if (state.isAlternating) startActIntervalLoop();
  });
  setPrismStep.addEventListener('change', () => { prefs.prismStep = Number(setPrismStep.value); savePrefs(); applyPrismStepSetting(); });
  setSlowRate.addEventListener('change', () => {
    prefs.slowRate = Number(setSlowRate.value);
    savePrefs();
    if (state.isAlternating && state.slowMo) startActIntervalLoop();
  });
  setExamTolerance.addEventListener('change', () => { prefs.examTolerance = Number(setExamTolerance.value); savePrefs(); });
  setHaptics.addEventListener('change', () => { prefs.haptics = setHaptics.checked; savePrefs(); if (prefs.haptics) vibrate(15); });

  // 重置数据
  document.getElementById('btnResetData').addEventListener('click', () => {
    openModal(`
      <h3>重置本地数据与设置</h3>
      <p style="margin-bottom:14px;">确定要清空所有实战练习记录、收藏病例并恢复默认设置吗？此操作无法撤销。</p>
      <div style="display:flex; gap:10px;">
        <button class="btn" style="flex:1;" id="cancelResetBtn">取消</button>
        <button class="btn danger-outline" style="flex:1;" id="confirmResetBtn">确认清空</button>
      </div>
    `);
    document.getElementById('cancelResetBtn').addEventListener('click', closeModal);
    document.getElementById('confirmResetBtn').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_PREFS);
      localStorage.removeItem(STORAGE_STATS);
      localStorage.removeItem(STORAGE_CASES);
      prefs = { ...defaultPrefs };
      stats = { total: 0, pass: 0, history: [] };
      savedCases = [];
      setTheme.value = prefs.theme;
      setIrisColor.value = prefs.irisColor;
      setWakeLock.checked = false;
      setActInterval.value = String(prefs.actInterval);
      setPrismStep.value = String(prefs.prismStep);
      setSlowRate.value = String(prefs.slowRate);
      setExamTolerance.value = String(prefs.examTolerance);
      setHaptics.checked = true;
      applyTheme();
      applyPrismStepSetting();
      renderPresets();
      renderStats();
      closeModal();
      showToast('已重置全部数据与设置');
    });
  });

  // 点击放大收款二维码
  document.getElementById('btnZoomQr').addEventListener('click', () => {
    openModal(`
      <div style="text-align:center;">
        <h3>微信赞赏支持作者</h3>
        <p style="margin-bottom:12px;">感谢对 <strong>Cover test</strong> 与作者 <strong>玉米</strong> 的支持 ☕</p>
        <img src="./assets/donate-qr.png" alt="微信收款码" style="width:100%; max-width:300px; border-radius:12px; border:1px solid var(--border);" />
        <p style="font-size:12px; color:var(--muted); margin:10px 0 14px;">长按保存图片或截图，打开微信扫一扫即可赞赏</p>
        <button class="btn primary" style="width:100%;" id="closeQrModalBtn">关闭</button>
      </div>
    `);
    document.getElementById('closeQrModalBtn').addEventListener('click', closeModal);
  });

  // 复制微信与反馈模板
  function copyText(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => showToast(successMsg));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      showToast(successMsg);
    }
  }

  document.getElementById('btnCopyVx').addEventListener('click', () => {
    vibrate(12);
    copyText('kwqwq3', '已复制微信号：kwqwq3');
  });

  document.getElementById('btnCopyFeedback').addEventListener('click', () => {
    vibrate(12);
    const tpl = `【Cover test 反馈】\n版本：${APP_VERSION}\n屏幕：${window.innerWidth}x${window.innerHeight}\n问题/建议描述：`;
    copyText(tpl, '已复制反馈模板，请粘贴发送至微信 kwqwq3');
  });

  // 更新日志弹窗
  document.getElementById('btnOpenChangelog').addEventListener('click', () => {
    openModal(`
      <h3>版本更新日志</h3>
      <ul>
        <li><strong>v1.1.0 (2026.11)</strong>：新增<strong>旋转斜视 (Cyclodeviation)</strong> 虹膜扭转引擎与 12 点参考刻度、<strong>假性斜视 (大 Kappa 角)</strong> 模拟、<strong>分离性垂直偏斜 (DVD)</strong>、<strong>基本型内隐斜 (E)</strong> 及一键复制标准病历简写。</li>
        <li><strong>v1.0.0 (2026.11)</strong>：正式升级为 <strong>Cover test</strong> 独立应用架构，支持 PWA 离线运行与手机桌面安装。</li>
        <li>新增暗室护眼深色模式、虹膜色系切换、常亮防息屏、ACT 频率与 0.5Δ/1Δ/2Δ 步长自定义。</li>
        <li>内置复合水平+垂直斜视向量引擎、单光点角膜映光 (Hirschberg)、2D+360° 棱镜排镜中和实战与本地统计。</li>
      </ul>
      <button class="btn primary" style="width:100%;" id="closeLogBtn">我知道了</button>
    `);
    document.getElementById('closeLogBtn').addEventListener('click', closeModal);
  });

  // 医学免责声明与隐私政策
  document.getElementById('btnOpenLegal').addEventListener('click', () => {
    openModal(`
      <h3>医学免责声明与隐私政策</h3>
      <p style="margin-bottom:8px;"><strong>1. 医学教学免责声明</strong><br/>Cover test 仅作为眼科与视光专业学习、课堂演示及棱镜中和技能模拟训练工具使用。仿真动画基于标准几何光学与共同性斜视模型简化呈现，<strong>不可替代执业医师或视光师的真实临床诊断与处方依据</strong>。</p>
      <p style="margin-bottom:14px;"><strong>2. 本地隐私承诺</strong><br/>本应用 100% 运行于您的本地设备，不接入任何第三方广告或统计追踪代码。您的设置偏好、收藏病例及练习统计均仅保存于本机浏览器/App 存储中，可随时在设置中一键清空。</p>
      <button class="btn primary" style="width:100%;" id="closeLegalBtn">已阅读并同意</button>
    `);
    document.getElementById('closeLegalBtn').addEventListener('click', closeModal);
  });

  // PWA 安装提示支持
  let deferredInstallPrompt = null;
  const btnInstallApp = document.getElementById('btnInstallApp');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    btnInstallApp.textContent = '一键安装 App';
  });

  btnInstallApp.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btnInstallApp.textContent = '安装指引';
      return;
    }
    openModal(`
      <h3>将 Cover test 安装到手机桌面</h3>
      <ul>
        <li><strong>iPhone (Safari 浏览器)</strong>：点击屏幕底部中间的 <strong>“分享”</strong> 图标 → 往下滑点击 <strong>“添加到主屏幕”</strong> → 点击右上角“添加”，即可获得全屏原生 App 图标！</li>
        <li><strong>Android (Chrome / Edge / 夸克)</strong>：点击浏览器菜单 <strong>“⋮”</strong> → 选择 <strong>“添加到主屏幕”</strong> 或 <strong>“安装应用”</strong>。</li>
        <li>安装后支持<strong>无网离线秒开</strong>，顶部无浏览器地址栏干扰。</li>
      </ul>
      <button class="btn primary" style="width:100%;" id="closeInstallBtn">知道了</button>
    `);
    document.getElementById('closeInstallBtn').addEventListener('click', closeModal);
  });

  // 注册离线 Service Worker（仅在 http/https 下）
  const offlineStatusText = document.getElementById('offlineStatusText');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => { offlineStatusText.textContent = '离线引擎：已就绪（支持断网打开）'; })
      .catch(() => { offlineStatusText.textContent = '离线引擎：在线运行模式'; });
  } else {
    offlineStatusText.textContent = '离线引擎：本地文件 / WebView 独立运行';
  }

  // ================== 13. 主工作区事件绑定 ==================
  btnCoverOD.addEventListener('click', () => setCover('OD'));
  btnCoverOS.addEventListener('click', () => setCover('OS'));
  btnUncover.addEventListener('click', () => setCover('none'));
  btnAlternate.addEventListener('click', toggleAlternating);

  canvasWrap.addEventListener('click', (e) => {
    const rect = canvasWrap.getBoundingClientRect();
    const clickedEye = (e.clientX - rect.left) < rect.width / 2 ? 'OD' : 'OS';
    if (state.cover === clickedEye && !state.isAlternating) setCover('none');
    else setCover(clickedEye);
  });

  xrayToggle.addEventListener('change', () => {
    vibrate(8);
    state.xray = xrayToggle.checked;
    xrayPill.classList.toggle('checked', state.xray);
  });
  slowToggle.addEventListener('change', () => {
    vibrate(8);
    state.slowMo = slowToggle.checked;
    slowPill.classList.toggle('checked', state.slowMo);
    if (state.isAlternating) startActIntervalLoop();
  });

  // 底部导航栏
  document.querySelectorAll('#mobileBottomNav .nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      vibrate(8);
      switchMobileTab(btn.dataset.target);
    });
  });

  // 桌面与手机同步模式切换
  function setAppMode(mode) {
    vibrate(10);
    state.appMode = mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'exam') {
      examPanel.classList.remove('hidden');
      state.examBlind = false;
      state.examRevealed = false;
      patientConfigPanel.classList.remove('hidden');
      examResultBox.className = 'exam-result-box';
      examStatusBadge.textContent = '准备出题';
      switchMobileTab('prism');
    } else {
      examPanel.classList.add('hidden');
      state.examBlind = false;
      state.examRevealed = false;
      patientConfigPanel.classList.remove('hidden');
    }
    updateTargetsAndNotes('mode');
  }

  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setAppMode(btn.dataset.mode));
  });

  // 远近距离切换
  document.querySelectorAll('#distGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      vibrate(8);
      document.querySelectorAll('#distGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dist = btn.dataset.dist;
      syncFormFromConfig();
      updateTargetsAndNotes('dist');
    });
  });

  // 棱镜放左眼/右眼切换
  document.querySelectorAll('#prismEyeGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      vibrate(8);
      document.querySelectorAll('#prismEyeGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.prism.eye = btn.dataset.peye;
      syncPrismUI();
    });
  });

  document.getElementById('btnResetPrism').addEventListener('click', () => {
    vibrate(10);
    state.prism.sx = 0; state.prism.sy = 0;
    syncPrismUI();
  });

  // 棱镜滑块 + 步进微调
  sliderPrismH.addEventListener('input', () => { state.prism.sx = Number(sliderPrismH.value); syncPrismUI(); });
  document.getElementById('btnHMinus').addEventListener('click', () => {
    vibrate(8);
    const step = Number(prefs.prismStep) || 1;
    state.prism.sx = Math.max(-45, Math.round((state.prism.sx - step) * 2) / 2);
    syncPrismUI();
  });
  document.getElementById('btnHPlus').addEventListener('click', () => {
    vibrate(8);
    const step = Number(prefs.prismStep) || 1;
    state.prism.sx = Math.min(45, Math.round((state.prism.sx + step) * 2) / 2);
    syncPrismUI();
  });

  sliderPrismV.addEventListener('input', () => { state.prism.sy = Number(sliderPrismV.value); syncPrismUI(); });
  document.getElementById('btnVMinus').addEventListener('click', () => {
    vibrate(8);
    const step = Number(prefs.prismStep) || 1;
    state.prism.sy = Math.max(-25, Math.round((state.prism.sy - step) * 2) / 2);
    syncPrismUI();
  });
  document.getElementById('btnVPlus').addEventListener('click', () => {
    vibrate(8);
    const step = Number(prefs.prismStep) || 1;
    state.prism.sy = Math.min(25, Math.round((state.prism.sy + step) * 2) / 2);
    syncPrismUI();
  });

  function applyAngle(ang) {
    const normAng = ((ang % 360) + 360) % 360;
    state.prism.lastAngle = normAng;
    let mag = Math.hypot(state.prism.sx, state.prism.sy);
    if (mag < 1) mag = 6;
    const rad = normAng * Math.PI / 180;
    state.prism.sx = Math.max(-45, Math.min(45, mag * Math.cos(rad)));
    state.prism.sy = Math.max(-25, Math.min(25, mag * Math.sin(rad)));
    syncPrismUI();
  }
  sliderPrismAngle.addEventListener('input', () => applyAngle(Number(sliderPrismAngle.value)));
  document.getElementById('btnAMinus').addEventListener('click', () => { vibrate(8); applyAngle(state.prism.lastAngle - 5); });
  document.getElementById('btnAPlus').addEventListener('click', () => { vibrate(8); applyAngle(state.prism.lastAngle + 5); });

  // 考场按钮
  document.getElementById('btnRandHoriz').addEventListener('click', () => startBlindExam('horiz'));
  document.getElementById('btnRandVert').addEventListener('click', () => startBlindExam('vert'));
  document.getElementById('btnRandComplex').addEventListener('click', () => startBlindExam('complex'));
  document.getElementById('btnLockCustom').addEventListener('click', () => startBlindExam('custom'));
  document.getElementById('btnSubmitExam').addEventListener('click', () => evaluateExam(false));
  document.getElementById('btnRevealExam').addEventListener('click', () => evaluateExam(true));

  torsionToggle.addEventListener('change', () => {
    vibrate(8);
    state.showTorsionGuide = torsionToggle.checked;
    torsionPill.classList.toggle('checked', state.showTorsionGuide);
  });

  document.getElementById('btnCopyRecord').addEventListener('click', () => {
    vibrate(12);
    copyText(clinicalRecordText.textContent, '已复制标准病历简写');
  });

  [selType, selEye, selRecovery, selHDir, selVDir, selCDir].forEach(el => el.addEventListener('change', onCustomParamChange));
  [rangeHPrism, rangeVPrism, rangeCDeg, rangeKappa].forEach(el => el.addEventListener('input', onCustomParamChange));

  // 启动初始化
  applyTheme();
  applyPrismStepSetting();
  renderPresets();
  renderStats();
  syncFormFromConfig();
  syncPrismUI();
  requestAnimationFrame(loop);
});
