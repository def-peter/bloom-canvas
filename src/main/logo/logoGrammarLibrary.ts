import type { LogoGrammarCard, LogoGrammarId } from '../../shared/logoDesign'

export const LOGO_GRAMMAR_LIBRARY_VERSION = 1 as const

const grammarEvidence = {
  'negative-space-fusion': {
    promptFragments: [
      'build one compact mark from two bold solid forms',
      'reveal one additional silhouette in broad negative space'
    ],
    reviewRules: [
      'the hidden silhouette survives monochrome',
      'the negative gap remains visible at 32px'
    ],
    sourceRefs: ['pentagram-conical', 'pentagram-mon-takanawa']
  },
  'monogram-synthesis': {
    promptFragments: [
      'merge only the specified initials into one shared skeleton',
      'make the combined letters read as one compact silhouette'
    ],
    reviewRules: [
      'every requested initial remains identifiable',
      'no extra or pseudo characters appear'
    ],
    sourceRefs: ['pentagram-sc', 'pentagram-pgc']
  },
  'semantic-hybrid': {
    promptFragments: [
      'fuse two brand truths into one inseparable symbol',
      'give the hybrid one dominant silhouette'
    ],
    reviewRules: [
      'the result is not two icons placed side by side',
      'both meanings support the same brand claim'
    ],
    sourceRefs: ['pentagram-conical', 'pentagram-payz']
  },
  'continuous-path': {
    promptFragments: [
      'use one broad uninterrupted path',
      'limit the path to three intentional turns'
    ],
    reviewRules: [
      'the route stays legible without self-intersection',
      'the stroke survives 32px reduction'
    ],
    sourceRefs: ['koto-uniqode', 'koto-pairpoint']
  },
  'modular-grid': {
    promptFragments: [
      'arrange two to four repeated modules on a clear grid',
      'make the outer boundary read before individual modules'
    ],
    reviewRules: [
      'the mark does not resemble a QR code',
      'the module count remains immediately scannable'
    ],
    sourceRefs: ['pentagram-univers', 'pentagram-dataland']
  },
  'interlocking-units': {
    promptFragments: [
      'interlock two to four solid units as one stable whole',
      'keep every joint broad and intentional'
    ],
    reviewRules: [
      'the whole reads before the pieces',
      'the units do not form a generic puzzle or flower'
    ],
    sourceRefs: ['koto-microsoft-50th', 'pentagram-pgc']
  },
  'frame-threshold': {
    promptFragments: [
      'use an open frame to define entry and focus',
      'make inside and outside space equally intentional'
    ],
    reviewRules: [
      'at least one side remains meaningfully open',
      'the result is not a generic rounded app square'
    ],
    sourceRefs: ['koto-faculty', 'pentagram-mosaic-rooms']
  },
  'fold-unfold': {
    promptFragments: [
      'show one plane completing a single unfold action',
      'keep the flat master readable without lighting'
    ],
    reviewRules: [
      'the silhouette works as flat monochrome',
      'the fold does not become a paper-plane cliche'
    ],
    sourceRefs: ['koto-coda', 'pentagram-hiut']
  },
  'radial-core': {
    promptFragments: [
      'organize three to five bold units around one stable core',
      'preserve one compact outer silhouette'
    ],
    reviewRules: [
      'the center remains stable at small size',
      'the result avoids flower, sun, and pinwheel readings'
    ],
    sourceRefs: ['koto-gofundme', 'koto-workday']
  },
  'signal-rhythm': {
    promptFragments: [
      'use a short sequence of bars or pulses as one symbol',
      'make intervals create a deliberate rhythm'
    ],
    reviewRules: [
      'the mark is not a generic equalizer or chart',
      'the rhythm forms a recognizable whole'
    ],
    sourceRefs: ['koto-deezer', 'koto-massivemusic']
  },
  'custom-wordmark': {
    promptFragments: [
      'spell the full brand name exactly',
      'customize only one or two repeated letter features'
    ],
    reviewRules: [
      'every character is correct and readable',
      'no pseudo characters or decorative substitutions appear'
    ],
    sourceRefs: ['koto-lyft', 'koto-bolt']
  },
  'symbol-as-system': {
    promptFragments: [
      'define one simple geometric rule that makes a standalone mark',
      'let the same rule support later patterns without adding logo detail'
    ],
    reviewRules: [
      'the core mark works without its applications',
      'the extension rule stays visibly related to the mark'
    ],
    sourceRefs: ['pentagram-mon-takanawa', 'koto-deezer']
  },
  'simplified-character': {
    promptFragments: [
      'compress the real character source into one bold silhouette',
      'use at most one facial or pose cue'
    ],
    reviewRules: [
      'the result reads as a mark rather than an illustration',
      'no small facial or costume details are required'
    ],
    sourceRefs: ['koto-tripadvisor', 'koto-yazio']
  },
  'dynamic-aperture': {
    promptFragments: [
      'build one stable form around a single opening axis',
      'choose a static keyframe that works without motion'
    ],
    reviewRules: [
      'the static mark is complete',
      'the opening behavior has one clear boundary and axis'
    ],
    sourceRefs: ['pentagram-mozilla-foundation', 'koto-coda']
  }
} satisfies Record<
  LogoGrammarId,
  Pick<LogoGrammarCard, 'promptFragments' | 'reviewRules' | 'sourceRefs'>
>

export const logoGrammarCards: LogoGrammarCard[] = [
  {
    id: 'negative-space-fusion',
    nameZh: '负形融合',
    mechanism: 'two bold forms reveal one meaningful negative shape',
    fitSignals: [
      '品牌有两个可由单一轮廓承载的互补概念',
      '需要紧凑且适合黑白输出的符号',
      '受众适合接受可发现的第二层含义'
    ],
    conflictSignals: [
      '品牌含义依赖三个以上并列对象',
      '核心概念只能依靠细节或文字解释',
      '目标负形与熟悉的市场商标高度接近'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'lettermark'],
    constructionRules: ['最多两个前景实体', '32px 负形仍可见', '内部间隙宽'],
    antiPatterns: ['装饰镂空', '需解释才能看见', '近似现有商标'],
    ...grammarEvidence['negative-space-fusion']
  },
  {
    id: 'monogram-synthesis',
    nameZh: '字母合成',
    mechanism: '1-3 specified initials share one silhouette',
    fitSignals: [
      '品牌有一至三个必须出现的明确首字母',
      '缩写比完整名称更适合建立识别',
      '需要紧凑的头像、图标或印章'
    ],
    conflictSignals: [
      '品牌必须优先展示完整名称',
      '指定字母过多或无法共享清晰骨架',
      '跨语言缩写或品牌首字母尚未确定'
    ],
    allowedLogoTypes: ['lettermark', 'combination-mark', 'emblem'],
    constructionRules: ['字母共享骨架', '只保留一个轮廓', '黑白可读'],
    antiPatterns: ['字母堆叠', '额外字符', '细碎切口'],
    ...grammarEvidence['monogram-synthesis']
  },
  {
    id: 'semantic-hybrid',
    nameZh: '语义融合',
    mechanism: 'two brand truths become one inseparable symbol',
    fitSignals: [
      '品牌有两个互补且同等真实的核心事实',
      '差异点来自功能与情感价值的结合',
      '需要一个可独立使用的紧凑符号'
    ],
    conflictSignals: [
      '品牌主张需要三个以上独立含义',
      '两个概念之间没有共同的品牌论点',
      '任一概念都只能通过复杂场景表达'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'emblem'],
    constructionRules: ['两个事实必须融合', '主次明确', '最多两个元素'],
    antiPatterns: ['并排图标', '机械拼贴', '行业图标合集'],
    ...grammarEvidence['semantic-hybrid']
  },
  {
    id: 'continuous-path',
    nameZh: '连续路径',
    mechanism: 'one broad continuous path forms the mark',
    fitSignals: [
      '品牌事实涉及旅程、连接、流动或连续性',
      '需要受控而有动势的符号',
      '主要触点要求小尺寸轮廓清晰'
    ],
    conflictSignals: [
      '核心叙事依赖多个分支或节点',
      '品牌气质要求完全静止和纪念碑感',
      '路径必须频繁转折才能表达含义'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'lettermark'],
    constructionRules: ['路径粗', '转折不超过三次', '避免自交'],
    antiPatterns: ['细线迷宫', '复杂结', '普通速度线'],
    ...grammarEvidence['continuous-path']
  },
  {
    id: 'modular-grid',
    nameZh: '模块网格',
    mechanism: '2-4 repeated modules form a compact system',
    fitSignals: [
      '品牌由少量可重复的产品、能力或单元构成',
      '秩序、结构或组合能力是差异点',
      '视觉身份需要自然延展到版式和图案'
    ],
    conflictSignals: [
      '品牌核心依赖自由有机或角色化轮廓',
      '概念需要五个以上模块才能成立',
      '行业语境容易把网格误读为编码或数据矩阵'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'lettermark', 'emblem'],
    constructionRules: ['模块数量有限', '网格清楚', '边界紧凑'],
    antiPatterns: ['QR 码', '节点网络', '密集小方块'],
    ...grammarEvidence['modular-grid']
  },
  {
    id: 'interlocking-units',
    nameZh: '互锁单元',
    mechanism: '2-4 solid units interlock as one whole',
    fitSignals: [
      '合作、整合、交换或相互支持是核心事实',
      '品牌涉及二至四个明确参与方或能力',
      '需要先表达统一整体再呈现组成关系'
    ],
    conflictSignals: [
      '品牌只有一个不可拆分的核心事实',
      '概念需要五个以上参与单元',
      '柔软角色感比结构关系更重要'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'lettermark'],
    constructionRules: ['单元少', '接缝宽', '整体先于局部'],
    antiPatterns: ['拼图模板', '花瓣旋转', '无意义交叠'],
    ...grammarEvidence['interlocking-units']
  },
  {
    id: 'frame-threshold',
    nameZh: '开放框域',
    mechanism: 'an open frame defines focus or entry',
    fitSignals: [
      '品牌主张涉及进入、聚焦、访问、策展或边界',
      '内外空间的关系可以承载品牌差异',
      '需要稳定但不封闭的视觉姿态'
    ],
    conflictSignals: [
      '安全、密封或完全容纳是不可让步的含义',
      '概念只能通过门窗等建筑物直译',
      '产品类别已有大量通用圆角方框标志'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'emblem'],
    constructionRules: ['至少一侧开放', '内外空间都参与', '轮廓稳定'],
    antiPatterns: ['普通 App 圆角框', '封闭相框', '门窗直译'],
    ...grammarEvidence['frame-threshold']
  },
  {
    id: 'fold-unfold',
    nameZh: '折叠展开',
    mechanism: 'one plane changes from closed to open',
    fitSignals: [
      '转化、揭示、展开或释放潜力是核心叙事',
      '品牌有清晰的前后状态但只需一个转折',
      '平面几何能够表达变化而不依赖写实材质'
    ],
    conflictSignals: [
      '品牌没有明确的变化或揭示逻辑',
      '故事需要多个连续阶段才能理解',
      '识别必须依赖立体光影或复杂透视'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark'],
    constructionRules: ['只保留一个折叠动作', '平面母版成立', '少量面'],
    antiPatterns: ['依赖 3D 光影', '纸飞机俗套', '多层折纸'],
    ...grammarEvidence['fold-unfold']
  },
  {
    id: 'radial-core',
    nameZh: '径向核心',
    mechanism: 'few units organize around a stable center',
    fitSignals: [
      '社区、汇聚、协调或共享核心是品牌事实',
      '三个至五个参与单元具有明确意义',
      '需要平衡、紧凑且易居中的符号'
    ],
    conflictSignals: [
      '品牌概念没有可解释的共同中心',
      '参与单元数量不在三至五个范围内',
      '行业语境极易产生花朵、太阳或旋叶误读'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'emblem'],
    constructionRules: ['3-5 个单元', '中心明确', '黑白轮廓成立'],
    antiPatterns: ['花朵', '太阳', '旋叶', '过多射线'],
    ...grammarEvidence['radial-core']
  },
  {
    id: 'signal-rhythm',
    nameZh: '信号节奏',
    mechanism: 'bars, pulses or intervals form one rhythm',
    fitSignals: [
      '声音、媒体、通信、数据脉冲或节奏是品牌事实',
      '短序列能够表达品牌特有的韵律',
      '需要在静态中保留时间感或活力'
    ],
    conflictSignals: [
      '品牌与信号、节奏或序列没有真实联系',
      '行业已经高度依赖均衡器和图表符号',
      '含义需要长序列或大量柱条才能成立'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark'],
    constructionRules: ['节拍少', '间距有意', '整体轮廓封闭或稳定'],
    antiPatterns: ['均衡器模板', '柱状图', '速度线'],
    ...grammarEvidence['signal-rhythm']
  },
  {
    id: 'custom-wordmark',
    nameZh: '定制字标',
    mechanism: 'one or two controlled features customize the full name',
    fitSignals: [
      '完整品牌名本身短而有辨识潜力',
      '准确拼写和即时可读性优先于独立符号',
      '字母结构存在可重复的一至两个定制机会'
    ],
    conflictSignals: [
      '品牌名称、拼写或语言版本尚未确定',
      '主要触点只能容纳无文字小图标',
      '名称过长且没有可控的重复字形特征'
    ],
    allowedLogoTypes: ['wordmark', 'combination-mark'],
    constructionRules: ['拼写精确', '只改 1-2 个特征', '优先可读'],
    antiPatterns: ['每字不同', '伪文字', '装饰字体堆砌'],
    ...grammarEvidence['custom-wordmark']
  },
  {
    id: 'symbol-as-system',
    nameZh: '符号系统',
    mechanism: 'one geometry rule can extend into layouts or motion',
    fitSignals: [
      '品牌需要跨版式、图案和动效保持统一',
      '一个简单几何规则能对应真实品牌行为',
      '独立标志与后续应用同等重要'
    ],
    conflictSignals: [
      '项目只需要一次性标志且没有延展触点',
      '应用规则无法从简单主形中推导',
      '核心符号离开图案或动效便无法识别'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark'],
    constructionRules: ['标志先独立成立', '规则可重复', '主形简单'],
    antiPatterns: ['只画应用图案', 'Logo 不完整', '元素无限增殖'],
    ...grammarEvidence['symbol-as-system']
  },
  {
    id: 'simplified-character',
    nameZh: '简化角色',
    mechanism: 'a real character source becomes one strong silhouette',
    fitSignals: [
      '品牌已有真实且可追溯的角色来源',
      '亲和、陪伴或人格感是重要品牌品质',
      '角色具有无需细节也能识别的姿态或轮廓'
    ],
    conflictSignals: [
      '品牌没有真实明确的角色来源',
      '角色身份依赖服装、表情或写实细节',
      '品牌气质要求纯抽象且去人格化'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark', 'emblem'],
    constructionRules: ['五官最多一个提示', '轮廓优先', '姿态单一'],
    antiPatterns: ['吉祥物插画', '写实细节', '多表情合集'],
    ...grammarEvidence['simplified-character']
  },
  {
    id: 'dynamic-aperture',
    nameZh: '动态开口',
    mechanism: 'one stable form opens, closes or scales',
    fitSignals: [
      '适应、响应、揭示或开放是核心品牌行为',
      '品牌需要静态标志与动效身份共享同一结构',
      '单一轴线能够解释全部开合变化'
    ],
    conflictSignals: [
      '静态关键帧无法独立表达完整标志',
      '概念需要多个方向同时随机变化',
      '识别主要依靠光效、粒子或生成式变形'
    ],
    allowedLogoTypes: ['symbol-mark', 'combination-mark'],
    constructionRules: ['静态关键帧成立', '运动轴单一', '边界清晰'],
    antiPatterns: ['随机变形', '仅靠动画可读', '发光 AI 火花'],
    ...grammarEvidence['dynamic-aperture']
  }
] satisfies LogoGrammarCard[]
