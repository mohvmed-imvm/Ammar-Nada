import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';


const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const goalAudio = new Audio(`${ASSET_BASE}goal-song.mp3`);

goalAudio.preload = 'auto';
goalAudio.volume = 0.7;

const CONFIG = {
  playerUrl: `${ASSET_BASE}Goalkeeper%20Placing%20Ball.fbx`,
  keeperCharacterUrl: `${ASSET_BASE}Goalkeeper%20Diving%20Save.fbx`,
  keeperAnimationUrl: `${ASSET_BASE}Goalkeeper%20Diving%20Save.fbx`,

  fps: 30,
  ballShowFrame: 62,
  pauseFrame: 159,
  endFrame: 301,
  kickFrame: 219,

  oldAge: 19,
  newAge: 20,

  // حجم الشخصيات التقريبي
  characterHeight: 1.8,

  // مكان المرمى
  goalZ: -13,

  // التسديدة ناحية الشمال
  shotTargetX: -2.25,
  shotTargetY: 1.0,

  // سرعة انتقال الكورة للمرمى
  shotDuration: 0.72,

  // مكان الكورة عند الفريم 62
  ballShowX: 0.45,
  ballShowY: 0.12,
  ballShowZ: 1.5,

  // مكان الكورة عند الفريم 159
  ballPauseX: 0.45,
  ballPauseY: 0.12,
  ballPauseZ: 1.5,

  // نصف قطر الكورة
  ballRadius: 0.12
};


const $ = (selector) => document.querySelector(selector);

const canvas = $('#scene');
const loaderEl = $('#loader');
const loadText = $('#loadtext');
const promptTitle = $('#promptTitle');
const promptSub = $('#promptSub');
const promptEl = $('#prompt');
const intro = $('#intro');
const message = $('#message');
const errorEl = $('#error');

let scene;
let camera;
let renderer;
let clock;

let player;
let playerMixer;
let playerAction;
let playerClip;

let keeper;
let keeperMixer;
let keeperAction;
let ballShownDuringPlacing = false;
let ball;
let goal;
let trophy;
let field;
let trophyText;
let celebrationTime = 0;

const cameraStartPosition = new THREE.Vector3(0, 3.8, 10.5);
const cameraStartTarget = new THREE.Vector3(0, 1.2, -3);
let phase = 'loading';
let modelReady = false;
let ballKicked = false;
let messageShown = false;
let elapsed = 0;
let shotElapsed = 0;

let ballStart = new THREE.Vector3();
let ballTarget = new THREE.Vector3();

let ballReleasePosition = new THREE.Vector3(0.35, CONFIG.ballRadius, 2.6);

let handBone = null;
let keeperDiveStarted = false;

const loader = new FBXLoader();
const clockFallback = new THREE.Clock();

init();

/* =========================================================
   INITIALIZATION
========================================================= */

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071522);
  scene.fog = new THREE.FogExp2(0x071522, 0.009);

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    220
  );

  camera.position.set(0, 4.3, 10.5);
  camera.lookAt(0, 1.2, -3);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  clock = clockFallback;

  setupLighting();
  buildStadium();
  buildGoal();
  buildBall();
  buildTrophy();

  loadPlayer();
  loadKeeper();


window.addEventListener('resize', onResize);
canvas.addEventListener('pointerdown', onSceneTap);

setupMessageCameraControls();

$('#restartBtn').addEventListener('click', restartScene);


  animate();
}

/* =========================================================
   LIGHTING
========================================================= */

function setupLighting() {
  scene.add(new THREE.HemisphereLight(0xc8e7ff, 0x17251b, 2.1));

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff2dc, 3.2);
  key.position.set(-8, 16, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 24;
  key.shadow.camera.bottom = -24;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6bbcff, 2.2);
  rim.position.set(5, 10, -15);
  scene.add(rim);

  const warm = new THREE.PointLight(0xffd59a, 45, 35);
  warm.position.set(-8, 5, 2);
  scene.add(warm);

  // كشافات الاستاد
  for (const x of [-19, 19]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.13, 13, 12),
      new THREE.MeshStandardMaterial({
        color: 0x273849,
        metalness: 0.8,
        roughness: 0.28
      })
    );

    pole.position.set(x, 6.3, -13);
    pole.castShadow = true;
    scene.add(pole);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.65, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x253849,
        metalness: 0.65,
        roughness: 0.3
      })
    );

    frame.position.set(x, 12.8, -13);
    scene.add(frame);

    for (let i = 0; i < 7; i++) {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.2, 0.08),
        new THREE.MeshBasicMaterial({
          color: 0xffffff
        })
      );

      lamp.position.set(
        x - 1.05 + i * 0.35,
        12.8,
        -12.73
      );

      scene.add(lamp);
    }

    const glow = new THREE.SpotLight(
      0xe5f5ff,
      170,
      65,
      Math.PI / 4,
      0.55,
      1.1
    );

    glow.position.set(x, 12.4, -13);
    glow.target.position.set(0, 0, -5);
    scene.add(glow, glow.target);
  }
}
/* =========================================================
   STADIUM
========================================================= */

function buildStadium() {
  // أرضية العشب
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
      color: 0x176334,
      roughness: 0.95,
      metalness: 0
    })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.08, -7);
  ground.receiveShadow = true;
  field = ground;
  scene.add(ground);

  // شرائط عشب متبادلة
  for (let i = 0; i < 18; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 2.1),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x237842 : 0x1b6b37,
        roughness: 1
      })
    );

    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, -0.055, 12 - i * 4.2);
    stripe.receiveShadow = true;
    scene.add(stripe);
  }

  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });

  function line(width, height, x, z) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      lineMat
    );

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -0.025, z);
    scene.add(mesh);
  }

  // حدود الملعب
  line(40, 0.075, 0, 11);
  line(40, 0.075, 0, -25);
  line(0.075, 36, -20, -7);
  line(0.075, 36, 20, -7);

  // خط المنتصف
  line(40, 0.065, 0, -7);

  // دائرة المنتصف
  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(4.8, 4.88, 96),
    lineMat
  );

  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, -0.022, -7);
  scene.add(centerCircle);

  // نقطة المنتصف
  const centerSpot = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 24),
    lineMat
  );

  centerSpot.rotation.x = -Math.PI / 2;
  centerSpot.position.set(0, -0.018, -7);
  scene.add(centerSpot);

  // منطقة الجزاء
  line(17, 0.075, 0, -7.1);
  line(17, 0.075, 0, -23);
  line(0.075, 15.9, -8.5, -15);
  line(0.075, 15.9, 8.5, -15);

  // منطقة الست ياردات
  line(8, 0.075, 0, -10);
  line(8, 0.075, 0, -13.6);
  line(0.075, 3.6, -4, -11.8);
  line(0.075, 3.6, 4, -11.8);

  // نقطة الجزاء
  const penaltySpot = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 24),
    lineMat
  );

  penaltySpot.rotation.x = -Math.PI / 2;
  penaltySpot.position.set(0, -0.018, -9.7);
  scene.add(penaltySpot);

  // قوس منطقة الجزاء
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.52, 96, 1, 0, Math.PI),
    lineMat
  );

  arc.rotation.x = -Math.PI / 2;
  arc.rotation.z = Math.PI;
  arc.position.set(0, -0.02, -6.9);
  scene.add(arc);

  buildStands();
  buildCrowd();
}

function buildStands() {
  const materials = [
    0x101e30,
    0x172b42,
    0x203750,
    0x13273b,
    0x0c1928
  ].map(color => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.1
  }));

  // مدرجات خلف المرمى
  for (let i = 0; i < 7; i++) {
    const width = 46 + i * 2.2;

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.05, 2.1),
      materials[i % materials.length]
    );

    stand.position.set(
      0,
      1.15 + i * 0.78,
      -22 - i * 1.45
    );

    stand.castShadow = true;
    stand.receiveShadow = true;
    scene.add(stand);

    // حافة مضيئة لكل مستوى
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.045, 0.055),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x42c9ff : 0x8ceaff
      })
    );

    edge.position.set(
      0,
      stand.position.y + 0.52,
      stand.position.z + 1.02
    );

    scene.add(edge);
  }

  // المدرجات الجانبية
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.05, 42 + i * 2),
        materials[(i + 2) % materials.length]
      );

      stand.position.set(
        side * (21 + i * 1.25),
        1.1 + i * 0.7,
        -7
      );

      stand.castShadow = true;
      scene.add(stand);
    }
  }

  // شاشة استاد كبيرة خلف المدرجات
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(12, 3.1, 0.28),
    new THREE.MeshStandardMaterial({
      color: 0x071522,
      emissive: 0x063b63,
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.35
    })
  );

  screen.position.set(0, 7.8, -28);
  scene.add(screen);

  const screenText = new THREE.Mesh(
    new THREE.PlaneGeometry(10.8, 2.2),
    new THREE.MeshBasicMaterial({
      color: 0x8ceaff
    })
  );

  screenText.position.set(0, 7.8, -27.83);
  scene.add(screenText);
}
function buildCrowd() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0x65cfff),
    new THREE.Color(0xffd77a),
    new THREE.Color(0x407bff),
    new THREE.Color(0xff637d),
    new THREE.Color(0x83f0c4)
  ];

  // الجمهور على جانبي الملعب
  for (let i = 0; i < 3800; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;

    const x = side * (17.5 + Math.random() * 12);
    const y = 1.8 + Math.random() * 5.1;
    const z = -23 + Math.random() * 32;

    positions.push(x, y, z);

    const color = palette[
      Math.floor(Math.random() * palette.length)
    ];

    colors.push(color.r, color.g, color.b);
  }

  // الجمهور خلف المرمى
  for (let i = 0; i < 2600; i++) {
    const x = (Math.random() - 0.5) * 58;
    const y = 1.7 + Math.random() * 5.5;
    const z = -24 - Math.random() * 7;

    positions.push(x, y, z);

    const color = palette[
      Math.floor(Math.random() * palette.length)
    ];

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );

  const crowd = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.095,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true
    })
  );

  scene.add(crowd);
}

/* =========================================================
   GOAL AND NET
========================================================= */

function buildGoal() {
  goal = new THREE.Group();

  const goalWidth = 7.2;
  const goalHeight = 2.8;
  const goalDepth = 2.2;

  const left = -goalWidth / 2;
  const right = goalWidth / 2;
  const frontZ = CONFIG.goalZ;
  const backZ = CONFIG.goalZ - goalDepth;

  // بيانات اهتزاز المرمى عند دخول الكرة
  goal.userData.shakeTime = -1;
  goal.userData.impactTriggered = false;
  goal.userData.basePosition = new THREE.Vector3(0, 0, 0);
  goal.userData.baseRotationZ = 0;

  // معدن أبيض لامع بإضاءة واقعية
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    metalness: 0.82,
    roughness: 0.2
  });

  const frameHighlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.9,
    roughness: 0.14
  });

  // خامة خيوط الشبكة
  const netMaterial = new THREE.LineBasicMaterial({
    color: 0xc7d9e9,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });

  const netHighlight = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });

  // إنشاء ماسورة بين نقطتين
  function makeBar(start, end, radius = 0.055, material = frameMaterial) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);

    const direction = new THREE.Vector3().subVectors(b, a);
    const length = direction.length();

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 24, 1),
      material
    );

    mesh.position.copy(a).add(b).multiplyScalar(0.5);

    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    goal.add(mesh);

    return mesh;
  }

  // خطوط الشبكة
  function netLine(start, end, material = netMaterial) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    ]);

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 2;

    goal.add(line);

    return line;
  }

  // =====================================
  // إطار المرمى الأمامي
  // =====================================

  // القائمان
  makeBar(
    [left, 0, frontZ],
    [left, goalHeight, frontZ],
    0.065,
    frameHighlight
  );

  makeBar(
    [right, 0, frontZ],
    [right, goalHeight, frontZ],
    0.065,
    frameHighlight
  );

  // العارضة العلوية
  makeBar(
    [left, goalHeight, frontZ],
    [right, goalHeight, frontZ],
    0.068,
    frameHighlight
  );

  // تفاصيل معدنية صغيرة عند الزوايا
  for (const x of [left, right]) {
    for (const y of [0.08, goalHeight - 0.08]) {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 20, 16),
        frameMaterial
      );

      cap.position.set(x, y, frontZ);
      cap.castShadow = true;
      goal.add(cap);
    }
  }

  // =====================================
  // الهيكل الخلفي للشبكة
  // =====================================

  makeBar(
    [left, goalHeight, frontZ],
    [left, goalHeight, backZ],
    0.045
  );

  makeBar(
    [right, goalHeight, frontZ],
    [right, goalHeight, backZ],
    0.045
  );

  makeBar(
    [left, 0, backZ],
    [left, goalHeight, backZ],
    0.045
  );

  makeBar(
    [right, 0, backZ],
    [right, goalHeight, backZ],
    0.045
  );

  makeBar(
    [left, 0, frontZ],
    [left, 0, backZ],
    0.045
  );

  makeBar(
    [right, 0, frontZ],
    [right, 0, backZ],
    0.045
  );

  makeBar(
    [left, goalHeight, backZ],
    [right, goalHeight, backZ],
    0.045
  );

  makeBar(
    [left, 0, backZ],
    [right, 0, backZ],
    0.045
  );

  // =====================================
  // شبكة خلفية بتقسيمات منتظمة
  // =====================================

  const divisionsX = 28;
  const divisionsY = 14;
  const divisionsZ = 10;

  // الشبكة الخلفية الرأسية
  for (let i = 0; i <= divisionsX; i++) {
    const x = left + (goalWidth * i) / divisionsX;

    netLine(
      [x, 0, backZ],
      [x, goalHeight, backZ],
      i % 4 === 0 ? netHighlight : netMaterial
    );
  }

  // الشبكة الخلفية الأفقية
  for (let i = 0; i <= divisionsY; i++) {
    const y = (goalHeight * i) / divisionsY;

    netLine(
      [left, y, backZ],
      [right, y, backZ],
      i % 3 === 0 ? netHighlight : netMaterial
    );
  }

  // شبكة السقف
  for (let i = 0; i <= divisionsX; i++) {
    const x = left + (goalWidth * i) / divisionsX;

    netLine(
      [x, goalHeight, frontZ],
      [x, goalHeight, backZ]
    );
  }

  for (let i = 0; i <= divisionsZ; i++) {
    const z = frontZ - (goalDepth * i) / divisionsZ;

    netLine(
      [left, goalHeight, z],
      [right, goalHeight, z]
    );
  }

  // الشبكة الجانبية
  for (const x of [left, right]) {
    for (let i = 0; i <= divisionsZ; i++) {
      const z = frontZ - (goalDepth * i) / divisionsZ;

      netLine(
        [x, 0, z],
        [x, goalHeight, z]
      );
    }

    for (let i = 0; i <= divisionsY; i++) {
      const y = (goalHeight * i) / divisionsY;

      netLine(
        [x, y, frontZ],
        [x, y, backZ]
      );
    }
  }

  // تدعيمات مائلة في الجزء الخلفي للشبكة
  makeBar(
    [left, 0.05, backZ],
    [left + 0.55, 0.65, backZ],
    0.025,
    frameMaterial
  );

  makeBar(
    [right, 0.05, backZ],
    [right - 0.55, 0.65, backZ],
    0.025,
    frameMaterial
  );

  // إضافة المرمى للمشهد
  scene.add(goal);
}
/* =========================================================
   FOOTBALL
========================================================= */

function buildBall() {
  ball = new THREE.Group();

  const radius = CONFIG.ballRadius;

  const whiteMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0
  });

  const blackMaterial = new THREE.MeshStandardMaterial({
    color: 0x101115,
    roughness: 0.48,
    metalness: 0
  });

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    whiteMaterial
  );

  sphere.castShadow = true;
  sphere.receiveShadow = true;
  ball.add(sphere);

  // بقع سوداء موزعة على سطح الكورة
  const directions = [
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0.707, 0.5, 0.5],
    [-0.707, 0.5, 0.5],
    [0.707, -0.5, 0.5],
    [-0.707, -0.5, 0.5],
    [0.5, 0.5, -0.707],
    [-0.5, -0.5, -0.707]
  ];

  for (const values of directions) {
    const normal = new THREE.Vector3(...values).normalize();

    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.25, 5),
      blackMaterial
    );

    patch.position.copy(normal.clone().multiplyScalar(radius * 1.003));

    patch.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );

    ball.add(patch);
  }

  // الكورة مخفية لحد ما اللاعب يسيبها على الأرض
  ball.visible = false;
  scene.add(ball);
}

/* =========================================================
   TROPHY
========================================================= */






function buildTrophy() {
  trophy = new THREE.Group();

  const gold = new THREE.MeshStandardMaterial({
    color: 0xffc94a,
    metalness: 1,
    roughness: 0.19
  });

  const brightGold = new THREE.MeshStandardMaterial({
    color: 0xffe8a0,
    metalness: 1,
    roughness: 0.14
  });

  const darkGold = new THREE.MeshStandardMaterial({
    color: 0x805019,
    metalness: 0.9,
    roughness: 0.25
  });

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x151b27,
    metalness: 0.75,
    roughness: 0.24
  });

  // جسم الكأس
  const cupProfile = [
    [0.20, 1.02], [0.29, 1.08], [0.34, 1.18],
    [0.40, 1.36], [0.43, 1.52], [0.41, 1.63],
    [0.37, 1.69], [0.32, 1.67], [0.33, 1.59],
    [0.34, 1.48], [0.29, 1.32], [0.23, 1.19],
    [0.15, 1.12], [0.08, 1.10]
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const cup = new THREE.Mesh(
    new THREE.LatheGeometry(cupProfile, 64),
    gold
  );
  cup.castShadow = true;
  cup.receiveShadow = true;
  trophy.add(cup);

  // الجزء الداخلي للكأس
  const innerCup = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.08, 1.13),
      new THREE.Vector2(0.17, 1.17),
      new THREE.Vector2(0.25, 1.29),
      new THREE.Vector2(0.31, 1.46),
      new THREE.Vector2(0.33, 1.58)
    ], 48),
    darkGold
  );
  trophy.add(innerCup);

  // حافة الكأس
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.405, 0.035, 16, 64),
    brightGold
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.62;
  rim.castShadow = true;
  trophy.add(rim);

  const upperRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.025, 12, 48),
    brightGold
  );
  upperRing.rotation.x = Math.PI / 2;
  upperRing.position.y = 1.09;
  trophy.add(upperRing);

  // أيدي الكأس
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.035, 16, 48),
      gold
    );
    handle.position.set(side * 0.43, 1.43, 0);
    handle.scale.set(1, 1.25, 0.7);
    handle.castShadow = true;
    trophy.add(handle);

    const connector = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 20, 16),
      brightGold
    );
    connector.position.set(side * 0.36, 1.34, 0);
    connector.scale.set(1, 1.1, 0.8);
    trophy.add(connector);
  }

  // ساق الكأس
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.145, 0.32, 32),
    gold
  );
  stem.position.y = 0.91;
  stem.castShadow = true;
  trophy.add(stem);

  const stemRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.022, 12, 40),
    brightGold
  );
  stemRing.rotation.x = Math.PI / 2;
  stemRing.position.y = 0.77;
  trophy.add(stemRing);

  // قاعدة الكأس
  const lowerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.36, 0.13, 48),
    baseMaterial
  );
  lowerBase.position.y = 0.65;
  lowerBase.castShadow = true;
  lowerBase.receiveShadow = true;
  trophy.add(lowerBase);

  const goldBaseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.335, 0.36, 0.045, 48),
    gold
  );
  goldBaseRing.position.y = 0.72;
  trophy.add(goldBaseRing);

  const topBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.31, 0.09, 48),
    baseMaterial
  );
  topBase.position.y = 0.78;
  trophy.add(topBase);

  // لوحة الاسم والعمر
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.43, 0.105, 0.035),
    darkGold
  );
  plaque.position.set(0, 0.65, 0.352);
  trophy.add(plaque);

  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 1024;
  plaqueCanvas.height = 512;

  const plaqueCtx = plaqueCanvas.getContext('2d');
  plaqueCtx.fillStyle = '#111722';
  plaqueCtx.fillRect(0, 0, 1024, 512);
  plaqueCtx.textAlign = 'center';
  plaqueCtx.textBaseline = 'middle';

  plaqueCtx.fillStyle = '#fff0b5';
  plaqueCtx.font = 'bold 100px Arial';
  plaqueCtx.fillText('Mory', 512, 190);

  plaqueCtx.fillStyle = '#ffd15c';
  plaqueCtx.font = 'bold 115px Arial';
  plaqueCtx.fillText('20', 512, 355);

  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTexture.colorSpace = THREE.SRGBColorSpace;

  const plaqueText = new THREE.Mesh(
    new THREE.PlaneGeometry(0.37, 0.075),
    new THREE.MeshBasicMaterial({
      map: plaqueTexture,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  plaqueText.position.set(0, 0.65, 0.378);
  plaqueText.renderOrder = 5;
  trophy.add(plaqueText);

  // شعار الكأس
  const emblem = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 24, 20),
    brightGold
  );
  emblem.position.set(0, 1.02, 0.255);
  emblem.scale.set(1, 1.12, 0.45);
  trophy.add(emblem);

  const emblemCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 20, 16),
    darkGold
  );
  emblemCenter.position.set(0, 1.02, 0.29);
  emblemCenter.scale.set(1, 1, 0.4);
  trophy.add(emblemCenter);

  // =========================================
  // الرسالة: عدّل الكلام من هنا فقط
  // =========================================
  const PAPER_MESSAGE = `كل سنة وانت طيب ياموري كل سنه وأنت حبيبي وأجمل حاجة حصلتلي، كل سنة وأنت معايا وقريب من قلبي ومع بعض ف كل حاجه  ❤️ مش عارفة أقولك قد إيه وجودك في حياتي فارق معايا، وقد إيه بتمنى أشوفك دايمًا مبسوط وناجح ومحقق كل اللي نفسك فيه. يا رب سنتك الجديدة تكون مليانة خير وفرحة وراحة بال، وأفضل دايمًا جنبك في كل أعياد ميلادك الجاية. أنا مش بس بتمنالك عيد ميلاد سعيد، أنا بتمنى لنفسي أفضل أشوف ضحكتك وأشاركك أيامك وأكون سبب في سعادتك ولو بحاجة صغيرة. بحبك أوي، وكل سنة وأنت حبيبي  ❤️🎂`;

  // إعدادات الكتابة
  const canvasWidth = 768;
  const margin = 64;
  const textWidth = canvasWidth - margin * 2;
  const fontSize = 32;
  const lineHeight = 45;
  const paragraphGap = 18;
  const messageStartY = 190;
  const bottomPadding = 115;

  // قياس الكلام وتقسيمه على سطور
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = canvasWidth;
  measureCanvas.height = 64;

  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = `${fontSize}px Arial`;

  const paragraphs = PAPER_MESSAGE.split('\n');
  const messageLines = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (!trimmed) {
      messageLines.push({
        text: '',
        gap: true
      });
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine
        ? `${currentLine} ${word}`
        : word;

      if (
        measureCtx.measureText(testLine).width > textWidth &&
        currentLine
      ) {
        messageLines.push({
          text: currentLine,
          gap: false
        });
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      messageLines.push({
        text: currentLine,
        gap: false
      });
    }
  }

  // حساب ارتفاع الورقة تلقائيًا حسب عدد السطور
  let contentHeight = 0;

  for (const line of messageLines) {
    contentHeight += line.gap
      ? paragraphGap
      : lineHeight;
  }

  const canvasHeight = Math.max(
    1024,
    Math.ceil(
      messageStartY +
      contentHeight +
      bottomPadding
    )
  );

  const paperWidth = 0.43;
  const paperHeight = paperWidth * canvasHeight / canvasWidth;

  // رسم الورقة والرسالة
  const messageCanvas = document.createElement('canvas');
  messageCanvas.width = canvasWidth;
  messageCanvas.height = canvasHeight;

  const messageCtx = messageCanvas.getContext('2d');

  messageCtx.fillStyle = '#fff0cf';
  messageCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  // إطار زخرفي يتناسب مع طول الورقة
  messageCtx.strokeStyle = '#b18b4b';
  messageCtx.lineWidth = 8;
  messageCtx.strokeRect(
    22, 22,
    canvasWidth - 44,
    canvasHeight - 44
  );

  messageCtx.strokeStyle = '#d5b46d';
  messageCtx.lineWidth = 2;
  messageCtx.strokeRect(
    38, 38,
    canvasWidth - 76,
    canvasHeight - 76
  );

  messageCtx.textAlign = 'center';
  messageCtx.textBaseline = 'middle';
  messageCtx.direction = 'ltr';

  messageCtx.fillStyle = '#9b6a22';
  messageCtx.font = 'bold 36px Arial';
  messageCtx.fillText(
    'A SPECIAL MESSAGE',
    canvasWidth / 2,
    105
  );

  // خط زخرفي أسفل العنوان
  messageCtx.strokeStyle = '#c7a05c';
  messageCtx.lineWidth = 2;
  messageCtx.beginPath();
  messageCtx.moveTo(170, 145);
  messageCtx.lineTo(canvasWidth - 170, 145);
  messageCtx.stroke();

  let cursorY = messageStartY;

  for (const line of messageLines) {
    if (line.gap) {
      cursorY += paragraphGap;
      continue;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(line.text);

    messageCtx.direction = hasArabic ? 'rtl' : 'ltr';
    messageCtx.textAlign = 'center';

    if (hasArabic) {
      messageCtx.fillStyle = '#6e451c';
      messageCtx.font = `bold ${fontSize}px Arial`;
    } else {
      messageCtx.fillStyle = '#82551e';
      messageCtx.font = `${fontSize}px Arial`;
    }

    messageCtx.fillText(
      line.text,
      canvasWidth / 2,
      cursorY,
      textWidth
    );

    cursorY += lineHeight;
  }

  // خاتمة الورقة
  const footerY = cursorY + 40;

  messageCtx.direction = 'ltr';
  messageCtx.textAlign = 'center';
  messageCtx.fillStyle = '#9b6a22';
  messageCtx.font = 'bold 40px Arial';
  messageCtx.fillText(
    'Mory  •  20',
    canvasWidth / 2,
    footerY
  );

  const messageTexture = new THREE.CanvasTexture(messageCanvas);
  messageTexture.colorSpace = THREE.SRGBColorSpace;
  messageTexture.anisotropy = 8;

  // مجموعة الورقة
  const paperGroup = new THREE.Group();

  const paperMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff0cf,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide
  });

  const paperGeometry = new THREE.PlaneGeometry(
    paperWidth,
    paperHeight,
    8,
    Math.max(12, Math.ceil(paperHeight * 20))
  );

  // انحناء خفيف واقعي
  const positions = paperGeometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);

    positions.setZ(
      i,
      -0.025 *
      Math.sin((y / paperHeight + 0.5) * Math.PI) *
      Math.pow(Math.abs(x) / (paperWidth / 2), 2)
    );
  }

  paperGeometry.computeVertexNormals();

  const paper = new THREE.Mesh(paperGeometry, paperMaterial);
  paper.castShadow = true;
  paper.receiveShadow = true;
  paperGroup.add(paper);

  // الإطار الخارجي
  const borderPoints = [
    new THREE.Vector3(-paperWidth / 2, -paperHeight / 2, 0.008),
    new THREE.Vector3(paperWidth / 2, -paperHeight / 2, 0.008),
    new THREE.Vector3(paperWidth / 2, paperHeight / 2, 0.008),
    new THREE.Vector3(-paperWidth / 2, paperHeight / 2, 0.008),
    new THREE.Vector3(-paperWidth / 2, -paperHeight / 2, 0.008)
  ];

  const paperBorder = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(borderPoints),
    new THREE.LineBasicMaterial({
      color: 0xb18b4b,
      transparent: true,
      opacity: 0.8
    })
  );
  paperGroup.add(paperBorder);

  // وجه الكتابة على الورقة
  const messageFace = new THREE.Mesh(
    new THREE.PlaneGeometry(
      paperWidth * 0.91,
      paperHeight * 0.91
    ),
    new THREE.MeshBasicMaterial({
      map: messageTexture,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );

  messageFace.position.z = 0.012;
  messageFace.renderOrder = 5;
  paperGroup.add(messageFace);

  // تثبيت أعلى الورقة عند نقطة التعليق
  const paperTopY = 1.31;

  paperGroup.position.set(
    0.53,
    paperTopY - paperHeight / 2,
    0.15
  );

  paperGroup.rotation.z = -0.08;
  paperGroup.rotation.y = -0.08;

  // الخيط المعلق
  const stringMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4a24,
    roughness: 0.75,
    metalness: 0.05
  });

  const stringCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.43, 1.48, 0.03),
    new THREE.Vector3(0.50, 1.40, 0.10),
    new THREE.Vector3(0.58, 1.33, 0.15),
    new THREE.Vector3(0.55, 1.27, 0.15),
    new THREE.Vector3(0.53, paperTopY, 0.15)
  ]);

  const string = new THREE.Mesh(
    new THREE.TubeGeometry(stringCurve, 32, 0.009, 6, false),
    stringMaterial
  );
  string.castShadow = true;
  trophy.add(string);

  const paperLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.025, 0.007, 8, 20),
    brightGold
  );
  paperLoop.position.set(0.53, paperTopY, 0.16);
  trophy.add(paperLoop);

  // معلومات الرسالة التي تحتاجها الكاميرا
  paperGroup.userData.baseRotationZ = paperGroup.rotation.z;
  paperGroup.userData.baseRotationY = paperGroup.rotation.y;
  paperGroup.userData.swingTime = 0;

  paperGroup.userData.paperHeight = paperHeight;
  paperGroup.userData.canvasHeight = canvasHeight;
  paperGroup.userData.messageStartY = messageStartY;
  paperGroup.userData.messageEndY = cursorY;
  paperGroup.userData.lineCount = messageLines.filter(
    line => !line.gap
  ).length;

  trophy.add(paperGroup);

  trophy.userData.paperGroup = paperGroup;
  trophy.userData.plaqueFocus = new THREE.Vector3(0, 0.65, 0.42);
  trophy.userData.paperFocus = new THREE.Vector3(0.53, 1.00, 0.20);

  trophy.visible = false;
  trophy.position.set(0, 0, 2.4);
  trophy.scale.setScalar(0.5);

  scene.add(trophy);
}






/* =========================================================
   MODEL HELPERS
========================================================= */

function prepareCharacter(object, targetHeight = CONFIG.characterHeight) {
  object.traverse((part) => {
    if (!part.isMesh) return;

    part.castShadow = true;
    part.receiveShadow = true;

    if (part.material) {
      const materials = Array.isArray(part.material)
        ? part.material
        : [part.material];

      for (const material of materials) {
        material.side = THREE.DoubleSide;
      }
    }
  });

  // ضبط الحجم تلقائيًا
  object.scale.setScalar(1);

  let bounds = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();

  bounds.getSize(size);

  if (size.y > 0) {
    const scale = targetHeight / size.y;
    object.scale.setScalar(scale);
  }

  bounds = new THREE.Box3().setFromObject(object);

  if (Number.isFinite(bounds.min.y)) {
    object.position.y -= bounds.min.y;
  }

  object.updateMatrixWorld(true);
}

/* =========================================================
   PLAYER
========================================================= */

async function loadPlayer() {
  try {
    loadText.textContent = 'جاري تحميل شخصية اللاعب...';

    player = await loader.loadAsync(CONFIG.playerUrl);

    prepareCharacter(player, CONFIG.characterHeight);

    // اللاعب يواجه المرمى
    player.position.set(0, player.position.y, 2.8);
    player.rotation.y = Math.PI;

    scene.add(player);

    if (!player.animations || player.animations.length === 0) {
      throw new Error('ملف اللاعب لا يحتوي على أنيميشن');
    }

    playerClip = player.animations[0];
    playerMixer = new THREE.AnimationMixer(player);
    playerAction = playerMixer.clipAction(playerClip);

    playerAction.reset();
    playerAction.setLoop(THREE.LoopOnce, 1);
    playerAction.clampWhenFinished = true;
    playerAction.play();
    playerAction.time = 0;
    playerAction.paused = false;

    phase = 'placing';
    modelReady = true;

    loaderEl.style.opacity = '0';
    loaderEl.style.visibility = 'hidden';

    promptTitle.textContent = 'اللاعب بيجهّز الكرة...';
    promptSub.textContent = 'لحظة الحسم قربت';

    intro.querySelector('h1').innerHTML =
      '<em>Golden Shot</em>';

    camera.position.set(0, 3.8, 10.5);
    camera.lookAt(0, 1.2, -3);

  } catch (error) {
    console.error('Player loading error:', error);
    showError(
      'مش قادرين نحمّل اللاعب. اتأكد من اسم ملف Goalkeeper Placing Ball.fbx ومكانه داخل assets.'
    );
  }
}

/* =========================================================
   GOALKEEPER
========================================================= */

async function loadKeeper() {
  try {
    // نتجنب تحميل المسار التجريبي كما هو
    if (CONFIG.keeperCharacterUrl.includes('REPLACE_WITH')) {
      console.warn(
        'غيّر CONFIG.keeperCharacterUrl لاسم ملف شخصية الحارس.'
      );
      return;
    }

    loadText.textContent = 'جاري تحميل شخصية حارس المرمى...';

    keeper = await loader.loadAsync(CONFIG.keeperCharacterUrl);

    prepareCharacter(keeper, CONFIG.characterHeight);

    keeper.position.set(0, keeper.position.y, -11.7);

    // يواجه اللاعب
    keeper.rotation.y = 0;

    keeper.visible = true;
    scene.add(keeper);

    // تحميل أنيميشن الغطس منفصلًا
    const animationFBX = await loader.loadAsync(
      CONFIG.keeperAnimationUrl
    );

    if (!animationFBX.animations || animationFBX.animations.length === 0) {
      throw new Error('ملف أنيميشن الحارس لا يحتوي على حركة');
    }

    keeperMixer = new THREE.AnimationMixer(keeper);

    const diveClip = animationFBX.animations[0];

    keeperAction = keeperMixer.clipAction(diveClip);
    keeperAction.setLoop(THREE.LoopOnce, 1);
    keeperAction.clampWhenFinished = true;
    keeperAction.enabled = true;
    keeperAction.reset();
    keeperAction.play();
    keeperAction.paused = true;
    keeperAction.time = 0;

    console.log('Goalkeeper character and animation loaded.');

  } catch (error) {
    console.error('Goalkeeper loading error:', error);

    // المشهد الأساسي يظل يعمل حتى لو ملف الحارس لم يتحمل
    if (keeper) {
      keeper.visible = false;
    }
  }
}

/* =========================================================
   BALL RELEASE POSITION
========================================================= */

function findHandBone() {
  if (!player) return null;

  const candidates = [];

  player.traverse((object) => {
    if (!object.isBone) return;

    const name = object.name.toLowerCase();

    if (
      name.includes('hand') &&
      !name.includes('thumb') &&
      !name.includes('index') &&
      !name.includes('middle') &&
      !name.includes('ring') &&
      !name.includes('pinky')
    ) {
      candidates.push(object);
    }
  });

  if (candidates.length === 0) return null;

  player.updateMatrixWorld(true);

  // اختيار اليد الأقرب للأرض في وضعية وضع الكرة
  let bestBone = candidates[0];
  let lowestY = Infinity;

  for (const bone of candidates) {
    const worldPosition = new THREE.Vector3();

    bone.getWorldPosition(worldPosition);

    if (worldPosition.y < lowestY) {
      lowestY = worldPosition.y;
      bestBone = bone;
    }
  }

  return bestBone;
}

function calculateBallReleasePosition() {
  if (!player || !playerMixer || !playerAction || !playerClip) {
    return new THREE.Vector3(0.35, CONFIG.ballRadius, 2.6);
  }

  const pauseTime = Math.min(
    (CONFIG.pauseFrame - 1) / CONFIG.fps,
    playerClip.duration
  );

  // وضع اللاعب في لحظة ترك الكرة، ثم قراءة موقع اليد في العالم
  playerAction.paused = false;
  playerAction.time = pauseTime;
  playerMixer.update(0);
  player.updateMatrixWorld(true);

  handBone = findHandBone();

  if (!handBone) {
    // نقطة احتياطية إذا لم تكن أسماء عظام اليد معروفة
    return new THREE.Vector3(0.35, CONFIG.ballRadius, 2.6);
  }

  const handPosition = new THREE.Vector3();
  handBone.getWorldPosition(handPosition);

  // نأخذ X و Z من اليد، ونثبت ارتفاع الكرة على الأرض
  // قد يحتاج موضع X/Z لضبط بسيط حسب شكل أنيميشن اللاعب
return new THREE.Vector3(
  handPosition.x + 0.7,
  CONFIG.ballRadius,
  handPosition.z - 1.5
);
}

/* =========================================================
   INPUT
========================================================= */

function setupMessageCameraControls() {
  canvas.style.touchAction = 'none';

  let dragging = false;
  let startY = 0;
  let startScroll = 0;
  let activePointerId = null;

  canvas.addEventListener('pointerdown', (event) => {
    if (
      phase !== 'celebrating' ||
      !trophy?.userData.manualCameraReady
    ) {
      return;
    }

    dragging = true;
    activePointerId = event.pointerId;
    startY = event.clientY;
    startScroll = trophy.userData.cameraScrollTarget || 0;

    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (
      !dragging ||
      event.pointerId !== activePointerId ||
      phase !== 'celebrating'
    ) {
      return;
    }

    const start = trophy.userData.cameraStartY;
    const end = trophy.userData.cameraEndY;

    const maxScroll = Math.max(0, start - end);

    if (maxScroll <= 0) return;

    const height = canvas.clientHeight || window.innerHeight;

    // السحب لفوق ينزل في الرسالة، والسحب لتحت يرجع لأولها
    const delta = ((startY - event.clientY) / height) * maxScroll;

    trophy.userData.cameraScrollTarget = THREE.MathUtils.clamp(
      startScroll + delta,
      0,
      maxScroll
    );
  });

  function stopDragging(event) {
    if (
      activePointerId !== null &&
      event.pointerId !== activePointerId
    ) {
      return;
    }

    dragging = false;
    activePointerId = null;
  }

  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);
}

function onSceneTap() {
  if (!modelReady || !playerAction) return;

  if (phase === 'waiting') {
    phase = 'shooting';

    playerAction.paused = false;

    promptTitle.textContent = 'GO FOR THE GOAL!';
    promptSub.textContent = 'التسديدة بدأت';

    intro.style.opacity = '0.18';
intro.style.transform = 'translateX(-50%) translateY(-12px) scale(0.96)';
  }
}

/* =========================================================
   KICK AND KEEPER DIVE
========================================================= */

function launchBall() {
  if (ballKicked) return;

  ballKicked = true;
  shotElapsed = 0;

  ballStart.copy(ballReleasePosition);

  // نقطة التسديدة داخل المرمى
  ballTarget.set(
    CONFIG.shotTargetX,
    CONFIG.shotTargetY,
    CONFIG.goalZ - 1.35
  );

  ball.position.copy(ballStart);
  ball.visible = true;

  // تجهيز اهتزاز المرمى للتسديدة الجديدة
  if (goal) {
    goal.userData.shakeTime = -1;
    goal.userData.impactTriggered = false;
    goal.position.copy(goal.userData.basePosition);
    goal.rotation.z = goal.userData.baseRotationZ;
  }

  if (keeper) {
    keeper.visible = true;
  }

  if (keeperMixer && keeperAction) {
    keeperAction.reset();
    keeperAction.enabled = true;
    keeperAction.paused = false;
    keeperAction.time = 0;

    keeperDiveStarted = true;
  }
}

/* =========================================================
   MAIN ANIMATION LOOP
========================================================= */




function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.035);
  elapsed += dt;

  // حركة اللاعب
  if (playerMixer && playerAction && modelReady) {
    if (phase === 'placing') {
      const pauseTime = Math.min(
        (CONFIG.pauseFrame - 1) / CONFIG.fps,
        playerClip.duration
      );

      if (playerAction.time + dt >= pauseTime) {
        playerMixer.update(
          Math.max(0, pauseTime - playerAction.time)
        );

        playerAction.time = pauseTime;
        playerAction.paused = true;

        ballReleasePosition.set(
          CONFIG.ballPauseX,
          CONFIG.ballPauseY,
          CONFIG.ballPauseZ
        );

        ball.position.copy(ballReleasePosition);
        ball.visible = true;

        phase = 'waiting';

        promptTitle.textContent = 'دورك يا بطل — دوس على اللاعب';
        promptSub.textContent = 'الكرة جاهزة... اضغط عشان تسدد';

        intro.style.opacity = '0.42';
      } else {
        playerMixer.update(dt);

        const ballShowTime =
          (CONFIG.ballShowFrame - 1) / CONFIG.fps;

        if (
          !ballShownDuringPlacing &&
          playerAction.time >= ballShowTime
        ) {
          player.updateMatrixWorld(true);

          const hand = findHandBone();

          if (hand) {
            const handPosition = new THREE.Vector3();
            hand.getWorldPosition(handPosition);

            ball.position.set(
              CONFIG.ballShowX,
              CONFIG.ballShowY,
              CONFIG.ballShowZ
            );
          } else {
            ball.position.set(
              0.35,
              CONFIG.ballRadius,
              2.6
            );
          }

          ball.visible = true;
          ballShownDuringPlacing = true;
        }
      }
    } else if (phase === 'shooting') {
      const previousTime = playerAction.time;
      playerMixer.update(dt);

      const kickTime = Math.min(
        (CONFIG.kickFrame - 1) / CONFIG.fps,
        playerClip.duration
      );

      if (
        !ballKicked &&
        previousTime < kickTime &&
        playerAction.time >= kickTime
      ) {
        launchBall();
      }

      const endTime = Math.min(
        playerClip.duration,
        (CONFIG.endFrame - 1) / CONFIG.fps
      );

      if (playerAction.time >= endTime - 0.01) {
        playerAction.paused = true;
        phase = 'celebrating';

        trophy.visible = true;
        trophy.position.set(0, 0, 2.4);
        trophy.scale.setScalar(0.5);

        promptTitle.textContent = 'GOAL!!!';
        promptSub.textContent = 'THE CHAMPION';

        celebrationTime = 0;
      }
    }
  }

  // حركة الكرة
  if (ballKicked && phase !== 'finished') {
    shotElapsed += dt;

    const flightTime = CONFIG.shotDuration;
    const t = Math.min(shotElapsed / flightTime, 1);

    if (t < 1) {
      const eased = 1 - Math.pow(1 - t, 2.2);

      ball.position.lerpVectors(
        ballStart,
        ballTarget,
        eased
      );

      ball.position.y += Math.sin(t * Math.PI) * 0.55;
    } else {
if (goal && !goal.userData.impactTriggered) {
  goal.userData.impactTriggered = true;
  goal.userData.shakeTime = 0;

  goalAudio.currentTime = 0;
  goalAudio.play().catch(error => {
    console.log('Audio playback failed:', error);
  });
}

      const timeAfterGoal = shotElapsed - flightTime;

      ball.position.x = ballTarget.x;
      ball.position.z =
        ballTarget.z + Math.min(1.8, timeAfterGoal * 1.8);

      const gravity = 5.2;

      const fallingHeight =
        CONFIG.shotTargetY -
        0.5 * gravity * timeAfterGoal * timeAfterGoal;

      ball.position.y = Math.max(
        CONFIG.ballRadius,
        fallingHeight
      );

      if (ball.position.y <= CONFIG.ballRadius + 0.001) {
        const fallDuration = Math.sqrt(
          Math.max(
            0,
            (
              2 * Math.max(
                CONFIG.shotTargetY - CONFIG.ballRadius,
                0
              )
            ) / gravity
          )
        );

        const bounceTime = timeAfterGoal - fallDuration;

        if (bounceTime > 0 && bounceTime < 0.22) {
          ball.position.y =
            CONFIG.ballRadius +
            Math.sin((bounceTime / 0.22) * Math.PI) * 0.12;
        } else {
          ball.position.y = CONFIG.ballRadius;
        }
      }
    }

    if (shotElapsed < flightTime + 1.5) {
      ball.rotation.x += dt * 15;
      ball.rotation.z += dt * 11;
    }
  }

  // اهتزاز المرمى
  if (goal && goal.userData.shakeTime >= 0) {
    goal.userData.shakeTime += dt;

    const shakeTime = goal.userData.shakeTime;
    const shakeDuration = 0.85;

    if (shakeTime < shakeDuration) {
      const strength = Math.exp(-shakeTime * 4.2);

      const vibration =
        Math.sin(shakeTime * 48) * 0.055 * strength;

      const sway =
        Math.sin(shakeTime * 31) * 0.018 * strength;

      goal.position.x =
        goal.userData.basePosition.x + vibration;

      goal.position.y =
        goal.userData.basePosition.y +
        Math.abs(vibration) * 0.12;

      goal.rotation.z =
        goal.userData.baseRotationZ + sway;
    } else {
      goal.position.copy(goal.userData.basePosition);
      goal.rotation.z = goal.userData.baseRotationZ;
      goal.userData.shakeTime = -1;
    }
  }

  // الكأس والرسالة والتحكم اليدوي بالكاميرا
  if (phase === 'celebrating') {
    celebrationTime += dt;

    trophy.position.lerp(
      new THREE.Vector3(0, 0.65, 1.8),
      Math.min(1, dt * 1.5)
    );

    trophy.scale.lerp(
      new THREE.Vector3(1, 1, 1),
      Math.min(1, dt * 1.5)
    );

    const paperGroup = trophy.userData.paperGroup;

    if (paperGroup) {
      paperGroup.userData.swingTime += dt;

      const swingTime = paperGroup.userData.swingTime;

      paperGroup.rotation.z =
        paperGroup.userData.baseRotationZ +
        Math.sin(swingTime * 2.1) * 0.035;

      paperGroup.rotation.y =
        paperGroup.userData.baseRotationY +
        Math.sin(swingTime * 1.5) * 0.025;
    }

    const fullCameraPosition = new THREE.Vector3(
      0, 2.15, 3.35
    );

    const fullLookTarget = new THREE.Vector3(
      0, 1.65, 1.8
    );

    const plaqueCameraPosition = new THREE.Vector3(
      0, 1.55, 3.15
    );

    const plaqueFocus = new THREE.Vector3(
      0, 1.30, 2.22
    );

    let cameraPositionTarget;
    let cameraLookTarget;

    if (celebrationTime < 1.5) {
      cameraPositionTarget = fullCameraPosition;
      cameraLookTarget = fullLookTarget;
    } else if (celebrationTime < 2.8) {
      const progress = Math.min(
        1,
        (celebrationTime - 1.5) / 1.3
      );

      const eased =
        progress * progress * (3 - 2 * progress);

      cameraPositionTarget = fullCameraPosition.clone().lerp(
        plaqueCameraPosition,
        eased
      );

      cameraLookTarget = fullLookTarget.clone().lerp(
        plaqueFocus,
        eased
      );
    } else {
      const paperHeight = paperGroup
        ? paperGroup.userData.paperHeight
        : 0.62;

      const canvasHeight = paperGroup
        ? paperGroup.userData.canvasHeight
        : 1024;

      const messageStartY = paperGroup
        ? paperGroup.userData.messageStartY
        : 190;

      const messageEndY = paperGroup
        ? paperGroup.userData.messageEndY
        : 500;

      const paperTopY = 1.31;

      const localStartY =
        paperTopY -
        (messageStartY / canvasHeight) * paperHeight;

      const localEndY =
        paperTopY -
        (messageEndY / canvasHeight) * paperHeight;

      const trophyY = trophy.position.y;
      const trophyScale = trophy.scale.y;

      const worldStartY =
        trophyY + localStartY * trophyScale;

      const worldEndY =
        trophyY + localEndY * trophyScale;

      // نزول سينمائي مرة واحدة لأول الرسالة
      const introDuration = 1.2;
      const introProgress = Math.min(
        1,
        (celebrationTime - 2.8) / introDuration
      );

      const introEase =
        introProgress * introProgress * (3 - 2 * introProgress);

      const firstMessageY = worldStartY;

      const initialCameraPosition = new THREE.Vector3(
        0.43,
        firstMessageY + 0.20,
        3.05
      );

      const initialLookTarget = new THREE.Vector3(
        0.53,
        firstMessageY,
        1.98
      );

      if (celebrationTime < 4.0) {
        cameraPositionTarget = plaqueCameraPosition.clone().lerp(
          initialCameraPosition,
          introEase
        );

        cameraLookTarget = plaqueFocus.clone().lerp(
          initialLookTarget,
          introEase
        );
      } else {
        // ثبّت الكاميرا عند أول الرسالة
        cameraPositionTarget = initialCameraPosition;
        cameraLookTarget = initialLookTarget;

        // تهيئة تحكم السحب مرة واحدة
        if (!trophy.userData.manualCameraReady) {
          trophy.userData.manualCameraReady = true;
          trophy.userData.cameraScroll = 0;
          trophy.userData.cameraScrollTarget = 0;
          trophy.userData.cameraStartY = worldStartY;
          trophy.userData.cameraEndY = worldEndY;
        }

        const maxScroll = Math.max(
          0,
          trophy.userData.cameraStartY -
          trophy.userData.cameraEndY
        );

        const scroll = THREE.MathUtils.clamp(
          trophy.userData.cameraScrollTarget,
          0,
          maxScroll
        );

        trophy.userData.cameraScrollTarget = scroll;

        // تحريك الكاميرا فقط حسب سحب العميل
        trophy.userData.cameraScroll = THREE.MathUtils.damp(
          trophy.userData.cameraScroll || 0,
          scroll,
          7,
          dt
        );

        const currentY =
          trophy.userData.cameraStartY -
          trophy.userData.cameraScroll;

        cameraPositionTarget = new THREE.Vector3(
          0.43,
          currentY + 0.20,
          3.05
        );

        cameraLookTarget = new THREE.Vector3(
          0.53,
          currentY,
          1.98
        );
      }
    }

    camera.position.lerp(
      cameraPositionTarget,
      Math.min(1, dt * 2.2)
    );

    camera.lookAt(cameraLookTarget);

    if (celebrationTime > 0.5) {
      promptEl.style.opacity = '0';
      intro.style.opacity = '0';
    }

    // مفيش انتهاء تلقائي أثناء قراءة الرسالة
  }

  if (keeperMixer && keeperDiveStarted) {
    keeperMixer.update(dt);
  }

  renderer.render(scene, camera);
}



/* =========================================================
   BIRTHDAY MESSAGE
========================================================= */

function showBirthday() {
  if (messageShown) return;

  messageShown = true;
  phase = 'finished';

  $('#finalTitle').textContent =
    `كل سنة وأنت بطل الـ ${CONFIG.newAge}`;

  $('#finalMessage').textContent =
    'النهارده بداية موسم جديد في حياتك، مليان أهداف تحققها وانتصارات تستاهلها. افتكر دايمًا إن أحلى لحظاتك لسه جاية.';

  message.classList.add('show');
  promptEl.style.opacity = '0';
}

/* =========================================================
   RESTART
========================================================= */

function restartScene() {
    goalAudio.pause();
  goalAudio.currentTime = 0;
  message.classList.remove('show');
  celebrationTime = 0;
  
trophy.userData.manualCameraReady = false;
trophy.userData.cameraScroll = 0;
trophy.userData.cameraScrollTarget = 0;
trophy.userData.cameraStartY = 0;
trophy.userData.cameraEndY = 0;


intro.style.opacity = '1';
intro.style.transform = 'translateX(-50%)';

promptEl.style.opacity = '1';

camera.position.copy(cameraStartPosition);
camera.lookAt(cameraStartTarget);
  messageShown = false;
  ballKicked = false;
  shotElapsed = 0;
  keeperDiveStarted = false;

  ball.visible = false;
  ballShownDuringPlacing = false;

if (keeper) {
  keeper.visible = true;
  keeper.position.set(0, keeper.position.y, -11.7);
}

  if (keeperAction) {
    keeperAction.stop();
    keeperAction.reset();
    keeperAction.paused = true;
    keeperAction.time = 0;
    keeperAction.play();
    keeperAction.paused = true;
  }

  trophy.visible = false;

  intro.style.opacity = '1';
  intro.style.transform = 'translateX(-50%)';

  promptEl.style.opacity = '1';

  if (playerAction) {
    playerAction.stop();
    playerAction.reset();
    playerAction.play();
    playerAction.paused = false;
    playerAction.time = 0;
  }

  phase = 'placing';

  camera.position.set(0, 3.8, 10.5);
  camera.lookAt(0, 1.2, -3);

  promptTitle.textContent = 'اللاعب بيجهّز الكرة...';
  promptSub.textContent = 'لحظة الحسم قربت';
}

/* =========================================================
   ERROR AND RESIZE
========================================================= */

function showError(text) {
  loaderEl.style.opacity = '0';
  loaderEl.style.visibility = 'hidden';

  errorEl.textContent = text;
  errorEl.style.display = 'block';

  promptTitle.textContent = 'في مشكلة في تحميل الشخصية';
  promptSub.textContent = 'راجع اسم الملف ومكانه داخل assets';
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < 600 ? 47 : 40;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );
}
