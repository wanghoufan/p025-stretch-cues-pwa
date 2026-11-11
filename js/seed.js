/**
 * Preset catalog ported 1:1 from the original app's `src/data/seeds.ts`
 * (59 actions, 9 example routines). Names, durations and spoken text match the
 * source: the original speaks the action name (with a 左侧/右侧 prefix for
 * bilateral moves) through system TTS, so each step here carries that same
 * spoken text, pre-recorded as an MP3 clip.
 *
 * `SEED_VERSION` guards the one-time upgrade that replaces the three legacy
 * PWA presets with this catalog.
 */
export const SEED_VERSION = 3;

const HOLD_CUE_ZH = '保持 30 秒。';
const HOLD_CUE_EN = 'Hold for 30 seconds.';

const ACTIONS = [
  // neck
  { key: 'neck-side-bend', zh: '颈部侧屈拉伸', en: 'Neck Side Bend', category: ['办公'], difficulty: '中', bodypart: ['颈', '肩'], bilateral: true },
  { key: 'upper-trap', zh: '上斜方肌拉伸', en: 'Upper Trap Stretch', category: ['办公'], difficulty: '中', bodypart: ['颈', '肩'], bilateral: true },
  { key: 'levator-scapulae', zh: '肩胛提肌拉伸', en: 'Levator Scapulae Stretch', category: ['办公'], difficulty: '中', bodypart: ['颈', '肩'], bilateral: true },
  { key: 'neck-rotation', zh: '颈部旋转', en: 'Neck Rotation', category: ['办公'], difficulty: '低', bodypart: ['颈'], bilateral: true },
  { key: 'upper-trap-press', zh: '上斜方肌加压', en: 'Upper Trap Press', category: ['办公'], difficulty: '中', bodypart: ['颈', '肩'], bilateral: true },
  // shoulder
  { key: 'cross-body-shoulder', zh: '十字肩拉伸', en: 'Cross-Body Shoulder Stretch', category: ['办公'], difficulty: '中', bodypart: ['肩'], bilateral: true },
  { key: 'shoulder-rolls', zh: '肩部环绕', en: 'Shoulder Rolls', category: ['热身'], difficulty: '低', bodypart: ['肩'], bilateral: false },
  { key: 'towel-shoulder', zh: '毛巾绕肩', en: 'Towel Shoulder Stretch', category: ['办公'], difficulty: '低', bodypart: ['肩'], bilateral: false },
  // chest
  { key: 'doorway-chest', zh: '开门胸部拉伸', en: 'Doorway Chest Stretch', category: ['胸', '办公'], difficulty: '中', bodypart: ['胸', '肩'], bilateral: false },
  { key: 'wall-chest', zh: '靠墙胸部拉伸', en: 'Wall Chest Stretch', category: ['胸'], difficulty: '中', bodypart: ['胸', '肩'], bilateral: false },
  { key: 'wall-chest-3angle', zh: '扶墙三角度胸拉伸', en: 'Three-Angle Wall Chest Stretch', category: ['胸', '办公'], difficulty: '中', bodypart: ['胸', '肩'], bilateral: true },
  // back
  { key: 'side-bend', zh: '体侧屈拉伸', en: 'Side Bend', category: ['背'], difficulty: '中', bodypart: ['腰腹', '背'], bilateral: true },
  { key: 'supine-spinal-twist', zh: '仰卧脊柱扭转', en: 'Supine Spinal Twist', category: ['睡前'], difficulty: '中', bodypart: ['背', '腰腹'], bilateral: true },
  { key: 'cat-cow', zh: '猫牛式', en: 'Cat-Cow', category: ['晨起', '睡前'], difficulty: '低', bodypart: ['背'], bilateral: false },
  { key: 'child-pose', zh: '儿童式', en: "Child's Pose", category: ['晨起', '睡前'], difficulty: '低', bodypart: ['背', '腰腹'], bilateral: false },
  { key: 'cobra', zh: '眼镜蛇式', en: 'Cobra', category: ['晨起'], difficulty: '中', bodypart: ['背', '腰腹'], bilateral: false },
  { key: 'thoracic-rotation', zh: '坐姿胸椎旋转', en: 'Seated Thoracic Rotation', category: ['办公'], difficulty: '中', bodypart: ['背'], bilateral: true },
  { key: 'supine-knee-hug', zh: '仰卧抱膝拉伸', en: 'Supine Knee Hug', category: ['睡前'], difficulty: '低', bodypart: ['腰腹', '背'], bilateral: false },
  { key: 'lat-side-bend', zh: '阔背肌侧屈', en: 'Lat Side Bend', category: ['背'], difficulty: '中', bodypart: ['背', '腰腹'], bilateral: true },
  { key: 'camel', zh: '骆驼式', en: 'Camel', category: ['晨起'], difficulty: '高', bodypart: ['背', '腰腹'], bilateral: false },
  // arm
  { key: 'triceps', zh: '肱三头肌拉伸', en: 'Triceps Stretch', category: ['办公'], difficulty: '中', bodypart: ['肩'], bilateral: true },
  { key: 'biceps-wall', zh: '靠墙肱二头肌拉伸', en: 'Wall Biceps Stretch', category: ['办公'], difficulty: '中', bodypart: ['肩'], bilateral: true },
  { key: 'forearm-wrist', zh: '前臂拉伸', en: 'Forearm Stretch', category: ['办公'], difficulty: '中', bodypart: ['肩'], bilateral: true },
  // hip
  { key: 'kneeling-hip-flexor', zh: '跪姿髋屈肌拉伸', en: 'Kneeling Hip Flexor Stretch', category: ['跑后'], difficulty: '中', bodypart: ['髋臀', '腿'], bilateral: true },
  { key: 'butterfly', zh: '蝴蝶式坐姿', en: 'Butterfly', category: ['睡前'], difficulty: '中', bodypart: ['髋臀'], bilateral: false },
  { key: 'glute-piriformis', zh: '仰卧梨状肌拉伸', en: 'Supine Piriformis Stretch', category: ['睡前'], difficulty: '中', bodypart: ['髋臀'], bilateral: true },
  { key: 'figure-four', zh: '坐姿四字臀部拉伸', en: 'Seated Figure Four', category: ['睡前'], difficulty: '中', bodypart: ['髋臀'], bilateral: true },
  { key: 'adductor-wide', zh: '大腿内侧拉伸', en: 'Wide Adductor Stretch', category: ['跑后'], difficulty: '中', bodypart: ['腿', '髋臀'], bilateral: false },
  { key: 'pigeon', zh: '鸽式', en: 'Pigeon', category: ['跑后'], difficulty: '中', bodypart: ['髋臀', '腿'], bilateral: true },
  { key: 'ninety-ninety', zh: '90/90转体', en: '90/90 Rotation', category: ['办公'], difficulty: '中', bodypart: ['髋臀'], bilateral: true },
  { key: 'frog', zh: '青蛙式', en: 'Frog', category: ['跑后'], difficulty: '高', bodypart: ['腿', '髋臀'], bilateral: false },
  { key: 'front-split', zh: '纵劈叉渐进', en: 'Front Split Progression', category: ['跑后'], difficulty: '高', bodypart: ['腿', '髋臀'], bilateral: false },
  // leg
  { key: 'standing-quad', zh: '站姿股四头肌拉伸', en: 'Standing Quad Stretch', category: ['跑后'], difficulty: '中', bodypart: ['腿'], bilateral: true },
  { key: 'standing-hamstring', zh: '站姿腿后肌拉伸', en: 'Standing Hamstring Stretch', category: ['跑后', '热身'], difficulty: '中', bodypart: ['腿'], bilateral: true },
  { key: 'seated-hamstring', zh: '坐姿腿后肌拉伸', en: 'Seated Hamstring Stretch', category: ['跑后'], difficulty: '中', bodypart: ['腿'], bilateral: true },
  { key: 'standing-calf', zh: '站姿小腿拉伸', en: 'Standing Calf Stretch', category: ['跑后', '热身'], difficulty: '中', bodypart: ['小腿'], bilateral: true },
  { key: 'kneeling-calf', zh: '跪姿小腿拉伸', en: 'Kneeling Calf Stretch', category: ['跑后'], difficulty: '中', bodypart: ['小腿'], bilateral: true },
  { key: 'step-calf-hang', zh: '台阶悬垂小腿', en: 'Step Calf Hang', category: ['跑后'], difficulty: '中', bodypart: ['小腿'], bilateral: true },
  // full body
  { key: 'full-body-reach', zh: '全身伸展', en: 'Full-Body Reach', category: ['晨起'], difficulty: '低', bodypart: ['全身'], bilateral: false },
  { key: 'worlds-greatest', zh: '世界最伟大拉伸', en: "World's Greatest Stretch", category: ['热身'], difficulty: '中', bodypart: ['全身', '肩', '髋臀'], bilateral: true },
  // warm-up
  { key: 'march-in-place', zh: '原地踏步', en: 'March in Place', category: ['热身'], difficulty: '低', bodypart: ['全身'], bilateral: false },
  { key: 'high-knees', zh: '高抬腿', en: 'High Knees', category: ['热身'], difficulty: '中', bodypart: ['腿', '腰腹'], bilateral: false },
  { key: 'jumping-jacks', zh: '开合跳', en: 'Jumping Jacks', category: ['热身'], difficulty: '中', bodypart: ['全身'], bilateral: false },
  { key: 'arm-swings', zh: '摆臂绕肩', en: 'Arm Swings', category: ['热身'], difficulty: '低', bodypart: ['肩'], bilateral: false },
  { key: 'lunge-twist', zh: '弓步转体', en: 'Lunge Twist', category: ['热身'], difficulty: '中', bodypart: ['腿', '腰腹'], bilateral: false },
  { key: 'side-lunge', zh: '侧弓步', en: 'Side Lunge', category: ['热身'], difficulty: '中', bodypart: ['腿'], bilateral: false },
  { key: 'inchworm', zh: '毛虫爬', en: 'Inchworm', category: ['热身'], difficulty: '中', bodypart: ['全身', '腰腹'], bilateral: false },
  { key: 'mountain-climber', zh: '登山跑', en: 'Mountain Climber', category: ['热身', '核心'], difficulty: '高', bodypart: ['腰腹', '腿'], bilateral: false },
  // core
  { key: 'dead-bug-bent', zh: '死虫屈膝版', en: 'Bent-Knee Dead Bug', category: ['核心'], difficulty: '低', bodypart: ['腰腹'], bilateral: false },
  { key: 'dead-bug', zh: '死虫标准版', en: 'Dead Bug', category: ['核心'], difficulty: '中', bodypart: ['腰腹'], bilateral: false },
  { key: 'dead-bug-slow', zh: '死虫慢速版', en: 'Slow Dead Bug', category: ['核心'], difficulty: '高', bodypart: ['腰腹'], bilateral: false },
  { key: 'glute-bridge', zh: '臀桥双腿', en: 'Glute Bridge', category: ['核心'], difficulty: '低', bodypart: ['髋臀', '腰腹'], bilateral: false },
  { key: 'glute-bridge-march', zh: '臀桥行进', en: 'Glute Bridge March', category: ['核心'], difficulty: '中', bodypart: ['髋臀', '腰腹'], bilateral: false },
  { key: 'single-leg-glute-bridge', zh: '单腿臀桥', en: 'Single-Leg Glute Bridge', category: ['核心'], difficulty: '高', bodypart: ['髋臀', '腰腹'], bilateral: false },
  { key: 'bird-dog', zh: '鸟狗式', en: 'Bird Dog', category: ['核心'], difficulty: '中', bodypart: ['腰腹', '背'], bilateral: false },
  { key: 'forearm-plank', zh: '前平板', en: 'Forearm Plank', category: ['核心'], difficulty: '中', bodypart: ['腰腹'], bilateral: false },
  { key: 'side-plank', zh: '侧平板', en: 'Side Plank', category: ['核心'], difficulty: '高', bodypart: ['腰腹'], bilateral: false },
  { key: 'clamshell', zh: '蚌式', en: 'Clamshell', category: ['核心'], difficulty: '中', bodypart: ['髋臀'], bilateral: false },
  { key: 'plank-hip-taps', zh: '平板髋摆动', en: 'Plank Hip Taps', category: ['核心'], difficulty: '高', bodypart: ['腰腹'], bilateral: false },
];

function sceneOf(action) {
  if (action.category.includes('热身')) return 'warmup';
  if (action.category.includes('核心')) return 'core';
  return 'stretch';
}

export const SEED_ACTIONS = ACTIONS.map((action) => ({
  ...action,
  scene: sceneOf(action),
  clip: 'action-' + action.key,
  seconds: 30,
  cueZh: HOLD_CUE_ZH,
  cueEn: HOLD_CUE_EN,
}));

const ACTION_BY_KEY = new Map(SEED_ACTIONS.map((action) => [action.key, action]));

const SIDES = [
  { side: 'left', nameZh: '（左）', nameEn: ' (Left)', speakZh: '左侧', speakEn: 'Left side, ', clip: 'side-l-' },
  { side: 'right', nameZh: '（右）', nameEn: ' (Right)', speakZh: '右侧', speakEn: 'Right side, ', clip: 'side-r-' },
];

/**
 * A plan entry is either an action key, or a tuple for the core routines whose
 * spoken cue carries the rep count: [key, speakZh, speakEn, cueZh, cueEn].
 */
function buildSteps(routineId, plan) {
  const steps = [];
  let index = 0;

  plan.forEach((entry) => {
    const key = Array.isArray(entry) ? entry[0] : entry;
    const action = ACTION_BY_KEY.get(key);
    if (!action) {
      throw new Error('Unknown preset action: ' + key);
    }
    const speakZh = Array.isArray(entry) ? entry[1] : '';
    const speakEn = Array.isArray(entry) ? entry[2] : '';
    const cueZh = Array.isArray(entry) ? entry[3] : '';
    const cueEn = Array.isArray(entry) ? entry[4] : '';

    if (action.bilateral) {
      SIDES.forEach((side) => {
        index += 1;
        steps.push({
          id: routineId + '-' + index,
          nameZh: action.zh + side.nameZh,
          nameEn: action.en + side.nameEn,
          speakZh: side.speakZh + action.zh,
          speakEn: side.speakEn + action.en,
          cueZh: HOLD_CUE_ZH,
          cueEn: HOLD_CUE_EN,
          seconds: action.seconds,
          clip: side.clip + key,
        });
      });
      return;
    }

    index += 1;
    steps.push({
      id: routineId + '-' + index,
      nameZh: action.zh,
      nameEn: action.en,
      speakZh: speakZh || action.zh,
      speakEn: speakEn || action.en,
      cueZh: cueZh || HOLD_CUE_ZH,
      cueEn: cueEn || HOLD_CUE_EN,
      seconds: action.seconds,
      clip: speakZh ? 'step-' + routineId + '-' + index : action.clip,
    });
  });

  return steps;
}

const ROUTINE_DEFS = [
  {
    id: 'morning-full',
    nameZh: '晨起全身拉伸',
    nameEn: 'Morning Full-Body Stretch',
    category: ['晨起'],
    difficulty: '低',
    bodypart: ['全身'],
    restSec: 5,
    plan: ['neck-side-bend', 'cross-body-shoulder', 'doorway-chest', 'side-bend', 'cat-cow', 'cobra', 'child-pose'],
  },
  {
    id: 'post-run-lower',
    nameZh: '跑后下肢放松',
    nameEn: 'Post-Run Lower Body',
    category: ['跑后'],
    difficulty: '中',
    bodypart: ['腿', '髋臀', '小腿'],
    restSec: 5,
    plan: ['standing-quad', 'seated-hamstring', 'standing-calf', 'kneeling-hip-flexor', 'butterfly'],
  },
  {
    id: 'office-desk',
    nameZh: '办公室久坐放松',
    nameEn: 'Office Desk Relief',
    category: ['办公'],
    difficulty: '低',
    bodypart: ['颈', '肩', '背', '腰腹', '髋臀', '腿'],
    restSec: 5,
    plan: ['neck-side-bend', 'upper-trap', 'levator-scapulae', 'cross-body-shoulder', 'thoracic-rotation', 'cat-cow', 'child-pose', 'supine-spinal-twist', 'side-bend', 'butterfly', 'seated-hamstring', 'figure-four'],
  },
  {
    id: 'bedtime-full',
    nameZh: '睡前全身放松',
    nameEn: 'Bedtime Full-Body Relax',
    category: ['睡前'],
    difficulty: '低',
    bodypart: ['背', '腰腹', '髋臀'],
    restSec: 5,
    plan: ['cat-cow', 'child-pose', 'supine-spinal-twist', 'supine-knee-hug', 'glute-piriformis', 'figure-four', 'butterfly'],
  },
  {
    id: 'quick-warmup',
    nameZh: '5分钟快速热身',
    nameEn: '5-Minute Quick Warm-Up',
    category: ['热身'],
    difficulty: '低',
    bodypart: ['全身', '肩', '腿'],
    restSec: 5,
    plan: ['shoulder-rolls', 'cross-body-shoulder', 'standing-quad', 'standing-hamstring', 'standing-calf'],
  },
  {
    id: 'desk-worker',
    nameZh: '久坐办公族拉伸',
    nameEn: 'Desk Worker Stretch',
    category: ['办公'],
    difficulty: '低',
    bodypart: ['颈', '肩', '背', '腰腹', '髋臀', '腿'],
    restSec: 5,
    plan: ['neck-side-bend', 'upper-trap-press', 'levator-scapulae', 'cross-body-shoulder', 'towel-shoulder', 'cat-cow', 'child-pose', 'supine-spinal-twist', 'lat-side-bend', 'butterfly', 'seated-hamstring', 'figure-four'],
  },
  {
    id: 'core-beginner',
    nameZh: '初级核心',
    nameEn: 'Beginner Core',
    category: ['核心'],
    difficulty: '低',
    bodypart: ['腰腹', '髋臀', '背'],
    restSec: 45,
    plan: [
      ['dead-bug-bent', '死虫屈膝版，每侧8次', 'Bent-knee dead bug, 8 reps per side', '每侧 8 次', '8 reps per side'],
      ['glute-bridge', '臀桥双腿，8次', 'Glute bridge, 8 reps', '8 次', '8 reps'],
      ['bird-dog', '鸟狗式，每侧8次', 'Bird dog, 8 reps per side', '每侧 8 次', '8 reps per side'],
    ],
  },
  {
    id: 'core-intermediate',
    nameZh: '中级核心',
    nameEn: 'Intermediate Core',
    category: ['核心'],
    difficulty: '中',
    bodypart: ['腰腹', '髋臀', '背'],
    restSec: 30,
    plan: [
      ['dead-bug', '死虫标准版，每侧10次', 'Dead bug, 10 reps per side', '每侧 10 次', '10 reps per side'],
      ['glute-bridge-march', '臀桥行进，每侧10次', 'Glute bridge march, 10 reps per side', '每侧 10 次', '10 reps per side'],
      ['forearm-plank', '前平板，保持30秒', 'Forearm plank, hold 30 seconds', '保持 30 秒', 'Hold 30 seconds'],
      ['bird-dog', '鸟狗式，每侧10次', 'Bird dog, 10 reps per side', '每侧 10 次', '10 reps per side'],
      ['clamshell', '蚌式，每侧10次', 'Clamshell, 10 reps per side', '每侧 10 次', '10 reps per side'],
    ],
  },
  {
    id: 'core-advanced',
    nameZh: '高级核心',
    nameEn: 'Advanced Core',
    category: ['核心'],
    difficulty: '高',
    bodypart: ['腰腹', '髋臀', '腿'],
    restSec: 20,
    plan: [
      ['dead-bug-slow', '死虫慢速版，每侧12次', 'Slow dead bug, 12 reps per side', '每侧 12 次', '12 reps per side'],
      ['single-leg-glute-bridge', '单腿臀桥，每侧12次', 'Single-leg glute bridge, 12 reps per side', '每侧 12 次', '12 reps per side'],
      ['side-plank', '侧平板，保持30秒', 'Side plank, hold 30 seconds', '保持 30 秒', 'Hold 30 seconds'],
      ['mountain-climber', '登山跑，每侧12次', 'Mountain climber, 12 reps per side', '每侧 12 次', '12 reps per side'],
      ['plank-hip-taps', '平板髋摆动，每侧12次', 'Plank hip taps, 12 reps per side', '每侧 12 次', '12 reps per side'],
    ],
  },
];

export const SEED_ROUTINES = ROUTINE_DEFS.map(({ plan, restSec = 5, ...routine }) => ({
  ...routine,
  restSec,
  builtin: true,
  steps: buildSteps(routine.id, plan),
}));
