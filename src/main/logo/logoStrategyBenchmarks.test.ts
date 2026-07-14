import { describe, expect, test } from 'vitest'
import type {
  LogoBrandBriefV2,
  LogoBrandSemantics,
  LogoDesignStrategy
} from '../../shared/logoDesign'
import {
  logoBrandBriefV2Schema,
  logoBrandSemanticsSchema,
  logoDesignStrategySchema
} from '../../shared/schemas'
import { normalizeLogoBrief } from './logoBriefNormalizer'
import { validateLogoStrategies } from './logoStrategyValidator'

type StrategyFixture = Pick<
  LogoDesignStrategy,
  'id' | 'nameZh' | 'grammarId' | 'brandEvidence' | 'coreMetaphor' | 'construction' | 'silhouette'
> &
  Partial<
    Pick<
      LogoDesignStrategy,
      | 'summaryZh'
      | 'composition'
      | 'colorPlan'
      | 'recommendedRenderStyles'
      | 'exclusions'
      | 'rationaleZh'
      | 'imagePromptEn'
    >
  >

interface StrategyBenchmark {
  name: string
  brief: LogoBrandBriefV2
  modelOutput: string
}

function fixedStrategy(fixture: StrategyFixture): LogoDesignStrategy {
  return {
    version: 1,
    summaryZh: `${fixture.nameZh}以独立的形态语言回应品牌事实。`,
    composition: 'symbol paired with a clear, readable brand wordmark',
    colorPlan: 'one primary color with a flat monochrome fallback',
    recommendedRenderStyles: ['flat-monochrome', 'flat-duotone'],
    exclusions: ['decorative detail', 'pseudo-text', 'generic clip art'],
    rationaleZh: `${fixture.coreMetaphor}直接对应所引用的品牌事实。`,
    imagePromptEn: `Create one combination-mark logo. Core metaphor: ${fixture.coreMetaphor}. Construction: ${fixture.construction}.`,
    ...fixture
  }
}

function fixedModelOutput(
  semantics: LogoBrandSemantics,
  strategyFixtures: [StrategyFixture, StrategyFixture, StrategyFixture]
): string {
  return JSON.stringify({
    semantics,
    strategies: strategyFixtures.map(fixedStrategy)
  })
}

const benchmarks: StrategyBenchmark[] = [
  {
    name: '生花',
    brief: {
      brandName: '生花',
      brandNameAlt: 'BloomCanvas',
      shortName: 'BC',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者把想法快速转化为可继续编辑的视觉画布',
      targetAudience: '独立创作者与小型设计团队',
      brandKeywords: ['轻盈', '清晰', '创造力'],
      differentiator: '从文字灵感到视觉草稿的轻量连续工作流',
      avoidedElements: ['写实花朵', '复杂花瓣', '叶片'],
      preferredColors: ['明亮蓝', '珊瑚红'],
      avoidedColors: ['植物绿'],
      logoType: 'combination-mark',
      usageScenarios: ['app-icon', 'website', 'social-avatar']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['帮助创作者把想法快速转化为可继续编辑的视觉画布'],
        emotionalQualities: ['轻盈', '清晰', '创造力'],
        differentiators: ['从文字灵感到视觉草稿的轻量连续工作流'],
        audienceSignals: ['独立创作者与小型设计团队'],
        usableMetaphors: ['连续创作轨迹', '打开的画布边界', '可组合的创作单元'],
        literalMetaphorRisks: ['flower', 'petal', 'leaf', 'lotus', '花朵', '花瓣', '叶片'],
        industryCliches: ['glowing sparkles', 'robot heads', 'magic wand'],
        usageConstraints: ['32px app icon', 'clear website lockup', 'flat monochrome fallback']
      },
      [
        {
          id: 'bloom-continuous-creation',
          nameZh: '连续创作轨迹',
          grammarId: 'continuous-path',
          brandEvidence: ['从文字灵感到视觉草稿的轻量连续工作流'],
          coreMetaphor: 'a single idea trace becoming an editable canvas',
          construction:
            'one broad uninterrupted ribbon makes two controlled turns around an open center',
          silhouette: 'an asymmetric open loop with a decisive terminal edge',
          exclusions: ['flower', 'petal', 'leaf', 'lotus', 'magic wand']
        },
        {
          id: 'bloom-open-canvas',
          nameZh: '开放画布边界',
          grammarId: 'frame-threshold',
          brandEvidence: ['帮助创作者把想法快速转化为可继续编辑的视觉画布'],
          coreMetaphor: 'an invitation into an unfinished creative field',
          construction:
            'a weighty three-sided frame holds one offset plane while the upper boundary stays open',
          silhouette: 'a stable open rectangle with a shifted inner counter',
          exclusions: ['flower', 'petal', 'leaf', 'lotus', 'generic app tile']
        },
        {
          id: 'bloom-visual-building-blocks',
          nameZh: '视觉生成单元',
          grammarId: 'modular-grid',
          brandEvidence: ['帮助创作者把想法快速转化为可继续编辑的视觉画布'],
          coreMetaphor: 'small creative decisions assembling into one authored image',
          construction:
            'three unequal solid modules align on a two-column grid and share one compact outer boundary',
          silhouette: 'a stepped square mass with one generous internal gap',
          exclusions: ['flower', 'petal', 'leaf', 'lotus', 'QR code']
        }
      ]
    )
  },
  {
    name: 'BI 向前冲',
    brief: {
      brandName: 'BI 向前冲',
      brandNameAlt: 'BI Forward',
      shortName: 'BIF',
      industry: '商业智能与数据分析',
      businessDescription: '把分散经营数据整理成团队每天都能执行的决策节奏',
      targetAudience: '零售与互联网公司的业务负责人和分析团队',
      brandKeywords: ['果断', '敏捷', '可信'],
      differentiator: '从数据接入到行动复盘都保持同一业务语境',
      avoidedElements: ['上升箭头', '柱状图', '仪表盘'],
      preferredColors: ['电光青', '炭黑'],
      avoidedColors: ['财务绿'],
      logoType: 'combination-mark',
      usageScenarios: ['website', 'app-icon', 'social-avatar']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['把分散经营数据整理成团队每天都能执行的决策节奏'],
        emotionalQualities: ['果断', '敏捷', '可信'],
        differentiators: ['从数据接入到行动复盘都保持同一业务语境'],
        audienceSignals: ['零售与互联网公司的业务负责人和分析团队'],
        usableMetaphors: ['汇合跑道', '决策窗口', '协同接力'],
        literalMetaphorRisks: ['upward arrows', 'bar charts', 'dashboard gauges'],
        industryCliches: ['upward arrows', 'bar charts', 'dashboard gauges', 'network nodes'],
        usageConstraints: [
          'dense analytics navigation',
          '16px favicon',
          'presentation title lockup'
        ]
      },
      [
        {
          id: 'bi-decision-runway',
          nameZh: '决策跑道',
          grammarId: 'continuous-path',
          brandEvidence: ['把分散经营数据整理成团队每天都能执行的决策节奏'],
          coreMetaphor: 'a disciplined route that converts scattered inputs into forward cadence',
          construction:
            'one horizontal path compresses through two measured bends and ends in a broad stable platform',
          silhouette: 'a low elongated loop with a grounded right edge',
          exclusions: ['directional pointer', 'dashboard gauge', 'speed streak']
        },
        {
          id: 'bi-shared-context',
          nameZh: '同频协作块',
          grammarId: 'interlocking-units',
          brandEvidence: ['从数据接入到行动复盘都保持同一业务语境'],
          coreMetaphor: 'three business viewpoints locking into one executable decision',
          construction:
            'three stout offset units interlock through broad joints to create one horizontal whole',
          silhouette: 'a compact staggered capsule assembled from three masses',
          exclusions: ['puzzle piece', 'network node', 'spreadsheet cells']
        },
        {
          id: 'bi-action-window',
          nameZh: '行动窗口',
          grammarId: 'frame-threshold',
          brandEvidence: ['从数据接入到行动复盘都保持同一业务语境'],
          coreMetaphor: 'a focused opening where evidence becomes the next committed move',
          construction:
            'an open rectangular boundary compresses one side and leaves a deliberate passage at the base',
          silhouette: 'an upright open frame balanced by a single inner slab',
          exclusions: ['generic app square', 'magnifying glass', 'target icon']
        }
      ]
    )
  },
  {
    name: 'AI 安全平台',
    brief: {
      brandName: '界安',
      brandNameAlt: 'Boundary AI',
      shortName: 'BAI',
      industry: 'AI 安全平台',
      businessDescription: '持续评估企业 AI 应用的输入、输出与权限边界并提供可审计证据',
      targetAudience: '企业安全团队、模型平台团队与合规负责人',
      brandKeywords: ['严谨', '克制', '可验证'],
      differentiator: '把动态风险检测与可追溯治理证据放在同一控制面',
      avoidedElements: ['盾牌', '锁', '大脑', '电路板'],
      preferredColors: ['冷白', '警示黄', '深灰'],
      avoidedColors: ['霓虹紫'],
      logoType: 'combination-mark',
      usageScenarios: ['website', 'app-icon', 'social-avatar']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['持续评估企业 AI 应用的输入、输出与权限边界并提供可审计证据'],
        emotionalQualities: ['严谨', '克制', '可验证'],
        differentiators: ['把动态风险检测与可追溯治理证据放在同一控制面'],
        audienceSignals: ['企业安全团队、模型平台团队与合规负责人'],
        usableMetaphors: ['受控开口', '双向校验', '证据边界'],
        literalMetaphorRisks: ['brains', 'circuit boards', 'shields', 'locks'],
        industryCliches: [
          'brains',
          'circuit boards',
          'robot heads',
          'glowing sparkles',
          'shields',
          'locks'
        ],
        usageConstraints: ['security console header', 'audit report monochrome', '32px status icon']
      },
      [
        {
          id: 'ai-security-controlled-aperture',
          nameZh: '受控开口',
          grammarId: 'dynamic-aperture',
          brandEvidence: ['持续评估企业 AI 应用的输入、输出与权限边界并提供可审计证据'],
          coreMetaphor: 'a governed aperture that admits only verified exchange',
          construction:
            'two stable brackets share one horizontal opening axis and preserve a measured central gap',
          silhouette: 'a compact split disc with a calm rectangular opening',
          exclusions: ['keyhole', 'robot head', 'glowing sparkle']
        },
        {
          id: 'ai-security-mutual-check',
          nameZh: '双向校验',
          grammarId: 'interlocking-units',
          brandEvidence: ['把动态风险检测与可追溯治理证据放在同一控制面'],
          coreMetaphor: 'two independent checks forming one accountable boundary',
          construction:
            'a dark lower unit and light upper unit overlap through one broad audited seam',
          silhouette: 'a balanced hexagonal whole with two visible ownership zones',
          exclusions: ['padlock body', 'badge outline', 'neural nodes']
        },
        {
          id: 'ai-security-evidence-gap',
          nameZh: '证据负形',
          grammarId: 'negative-space-fusion',
          brandEvidence: ['持续评估企业 AI 应用的输入、输出与权限边界并提供可审计证据'],
          coreMetaphor: 'an observable proof channel between request and response',
          construction:
            'two blunt opposing forms reveal one wide central trace in untouched negative space',
          silhouette: 'a dense rounded diamond divided by a crisp vertical channel',
          exclusions: ['security badge', 'fingerprint', 'binary digits']
        }
      ]
    )
  },
  {
    name: '儿童科学教育',
    brief: {
      brandName: '小小实验局',
      brandNameAlt: 'Tiny Lab Club',
      shortName: 'TLC',
      industry: '儿童科学教育',
      businessDescription: '通过可在家复现的动手实验帮助儿童提出问题、记录观察并分享发现',
      targetAudience: '7 至 12 岁儿童及重视探究式学习的家长',
      brandKeywords: ['好奇', '友好', '动手'],
      differentiator: '每节课都留下可复现的实验记录而不只提供知识讲解',
      avoidedElements: ['博士帽', '原子轨道', '卡通火箭'],
      preferredColors: ['柠檬黄', '湖蓝', '番茄红'],
      avoidedColors: ['沉闷灰'],
      logoType: 'combination-mark',
      usageScenarios: ['website', 'packaging', 'social-avatar']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['通过可在家复现的动手实验帮助儿童提出问题、记录观察并分享发现'],
        emotionalQualities: ['好奇', '友好', '动手'],
        differentiators: ['每节课都留下可复现的实验记录而不只提供知识讲解'],
        audienceSignals: ['7 至 12 岁儿童及重视探究式学习的家长'],
        usableMetaphors: ['提问窗口', '实验步骤模块', '发现伙伴'],
        literalMetaphorRisks: ['lab flask', 'atom orbit', 'graduation cap'],
        industryCliches: ['atom orbit', 'rocket', 'light bulb', 'graduation cap'],
        usageConstraints: ['activity kit sticker', 'parent website', 'child-safe bold shapes']
      },
      [
        {
          id: 'science-question-window',
          nameZh: '提问窗口',
          grammarId: 'frame-threshold',
          brandEvidence: ['通过可在家复现的动手实验帮助儿童提出问题、记录观察并分享发现'],
          coreMetaphor: 'an open question inviting a child to test what lies beyond',
          construction:
            'a soft rectangular frame opens at one corner while a round observation token crosses the boundary',
          silhouette: 'a friendly open square with one oversized circular accent',
          exclusions: ['question mark glyph', 'school badge', 'textbook']
        },
        {
          id: 'science-repeatable-steps',
          nameZh: '可复现实验步',
          grammarId: 'modular-grid',
          brandEvidence: ['每节课都留下可复现的实验记录而不只提供知识讲解'],
          coreMetaphor: 'three repeatable actions becoming a record of discovery',
          construction:
            'a circle, a short slab, and a notched block repeat on a loose two-by-two learning grid',
          silhouette: 'a chunky stepped cluster with ample breathing room',
          exclusions: ['periodic table', 'worksheet grid', 'tiny academic symbols']
        },
        {
          id: 'science-discovery-companion',
          nameZh: '发现伙伴',
          grammarId: 'simplified-character',
          brandEvidence: ['通过可在家复现的动手实验帮助儿童提出问题、记录观察并分享发现'],
          coreMetaphor: 'the documented club mascot leaning in to observe a surprising result',
          construction:
            'compress the approved round club mascot into one bold profile with a single curious eye cue',
          silhouette: 'a tilting bean-shaped figure with one clear viewing notch',
          exclusions: ['detailed cartoon scene', 'lab coat', 'multiple facial features'],
          rationaleZh: '使用课程材料中已有的圆形俱乐部伙伴，传达陪伴式观察而非装饰性吉祥物。'
        }
      ]
    )
  },
  {
    name: '精品咖啡',
    brief: {
      brandName: '刻度咖啡',
      brandNameAlt: 'Measure Coffee',
      shortName: 'MC',
      industry: '精品咖啡烘焙与门店',
      businessDescription: '按产地与烘焙曲线呈现风味差异并为每杯咖啡提供可追溯批次信息',
      targetAudience: '在意产地透明度与稳定冲煮体验的城市咖啡消费者',
      brandKeywords: ['精确', '温暖', '克制'],
      differentiator: '把烘焙刻度、批次透明度与门店体验连接起来',
      avoidedElements: ['咖啡豆', '咖啡杯', '蒸汽'],
      preferredColors: ['砖红', '煤黑', '纸白'],
      avoidedColors: ['焦糖渐变'],
      logoType: 'combination-mark',
      usageScenarios: ['packaging', 'storefront', 'ecommerce']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['按产地与烘焙曲线呈现风味差异并为每杯咖啡提供可追溯批次信息'],
        emotionalQualities: ['精确', '温暖', '克制'],
        differentiators: ['把烘焙刻度、批次透明度与门店体验连接起来'],
        audienceSignals: ['在意产地透明度与稳定冲煮体验的城市咖啡消费者'],
        usableMetaphors: ['批次刻度', '风味交汇', '冲煮节拍'],
        literalMetaphorRisks: ['coffee beans', 'coffee cups', 'steam'],
        industryCliches: ['coffee beans', 'coffee cups', 'steam', 'mountain origin'],
        usageConstraints: ['small bag label', 'one-color stamp', 'storefront fascia']
      },
      [
        {
          id: 'coffee-batch-rhythm',
          nameZh: '批次刻度',
          grammarId: 'signal-rhythm',
          brandEvidence: ['按产地与烘焙曲线呈现风味差异并为每杯咖啡提供可追溯批次信息'],
          coreMetaphor: 'a measured roasting cadence unique to each traceable batch',
          construction:
            'four stout pulses use two heights and deliberately uneven intervals inside one low boundary',
          silhouette: 'a grounded rectangular rhythm with a memorable central pause',
          exclusions: ['equalizer display', 'price chart', 'steam lines']
        },
        {
          id: 'coffee-flavor-intersection',
          nameZh: '风味交汇',
          grammarId: 'semantic-hybrid',
          brandEvidence: ['把烘焙刻度、批次透明度与门店体验连接起来'],
          coreMetaphor: 'origin character and precise roasting meeting in one tasting point',
          construction:
            'a broad geographic arc and one calibrated notch fuse into a single compact asymmetric disc',
          silhouette: 'an off-center disc with a decisive cut and no internal illustration',
          exclusions: ['map pin', 'mountain range', 'bean silhouette']
        },
        {
          id: 'coffee-trace-window',
          nameZh: '透明批次窗',
          grammarId: 'negative-space-fusion',
          brandEvidence: ['按产地与烘焙曲线呈现风味差异并为每杯咖啡提供可追溯批次信息'],
          coreMetaphor: 'a batch identity revealed through an honest material window',
          construction:
            'two heavy label forms expose a wide numeral-like counter without drawing an actual character',
          silhouette: 'a compact ticket-shaped mass with one open counter',
          exclusions: ['coffee cup', 'decorative seal', 'pseudo lettering']
        }
      ]
    )
  },
  {
    name: '可持续包装',
    brief: {
      brandName: '再盒',
      brandNameAlt: 'Recase',
      shortName: 'RC',
      industry: '可持续包装',
      businessDescription: '为电商品牌设计可重复周转、按需折叠且可追踪使用次数的运输包装',
      targetAudience: '需要降低一次性包装成本与碳排的电商品牌运营团队',
      brandKeywords: ['务实', '耐用', '循环'],
      differentiator: '同一包装结构兼顾回收周转、仓储折叠与使用次数追踪',
      avoidedElements: ['叶子', '地球', '回收箭头'],
      preferredColors: ['再生纸灰', '运输蓝', '信号橙'],
      avoidedColors: ['环保绿渐变'],
      logoType: 'combination-mark',
      usageScenarios: ['packaging', 'ecommerce', 'website']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['为电商品牌设计可重复周转、按需折叠且可追踪使用次数的运输包装'],
        emotionalQualities: ['务实', '耐用', '循环'],
        differentiators: ['同一包装结构兼顾回收周转、仓储折叠与使用次数追踪'],
        audienceSignals: ['需要降低一次性包装成本与碳排的电商品牌运营团队'],
        usableMetaphors: ['折叠状态转换', '周转接缝', '重复计数模块'],
        literalMetaphorRisks: ['leaves', 'globes', 'recycling arrows'],
        industryCliches: ['leaves', 'globes', 'recycling arrows', 'cardboard box'],
        usageConstraints: ['corrugated print', 'packing tape', 'warehouse scan label']
      },
      [
        {
          id: 'packaging-flat-to-use',
          nameZh: '平折启用',
          grammarId: 'fold-unfold',
          brandEvidence: ['为电商品牌设计可重复周转、按需折叠且可追踪使用次数的运输包装'],
          coreMetaphor: 'one durable plane shifting between storage and service states',
          construction:
            'a single broad plane completes one diagonal unfold while retaining a flat monochrome master',
          silhouette: 'a low folded slab opening into an upright corner',
          exclusions: ['paper airplane', 'origami animal', 'cardboard box icon']
        },
        {
          id: 'packaging-return-joint',
          nameZh: '周转接缝',
          grammarId: 'interlocking-units',
          brandEvidence: ['同一包装结构兼顾回收周转、仓储折叠与使用次数追踪'],
          coreMetaphor: 'a reusable joint handed reliably between sender and receiver',
          construction:
            'two wide corner units clasp through one square junction and remain visibly separable',
          silhouette: 'a sturdy horizontal link with clipped outside corners',
          exclusions: ['chain link', 'handshake', 'circular chase symbol']
        },
        {
          id: 'packaging-use-ledger',
          nameZh: '使用次数模块',
          grammarId: 'modular-grid',
          brandEvidence: ['为电商品牌设计可重复周转、按需折叠且可追踪使用次数的运输包装'],
          coreMetaphor: 'each completed journey adding one visible unit to a service life',
          construction:
            'three large rectangular modules and one open cell form a sparse two-row counting system',
          silhouette: 'a compact stepped block with a single missing corner',
          exclusions: ['QR code', 'calendar grid', 'leaf motif']
        }
      ]
    )
  },
  {
    name: '金融支付',
    brief: {
      brandName: '合流支付',
      brandNameAlt: 'Conflux Pay',
      shortName: 'CP',
      industry: '金融支付基础设施',
      businessDescription: '为跨境商户统一接入本地支付方式、清算状态与对账结果',
      targetAudience: '出海商户的财务、支付产品与运营团队',
      brandKeywords: ['稳定', '高效', '透明'],
      differentiator: '用一个接口呈现多地区支付从受理到对账的完整状态',
      avoidedElements: ['银行卡', '硬币', '货币符号'],
      preferredColors: ['钴蓝', '亮橙', '白'],
      avoidedColors: ['金色渐变'],
      logoType: 'combination-mark',
      usageScenarios: ['website', 'app-icon', 'social-avatar']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['为跨境商户统一接入本地支付方式、清算状态与对账结果'],
        emotionalQualities: ['稳定', '高效', '透明'],
        differentiators: ['用一个接口呈现多地区支付从受理到对账的完整状态'],
        audienceSignals: ['出海商户的财务、支付产品与运营团队'],
        usableMetaphors: ['多路合流', '清算握合', '状态开口'],
        literalMetaphorRisks: ['bank cards', 'coins', 'currency signs'],
        industryCliches: ['bank cards', 'coins', 'currency signs', 'check marks'],
        usageConstraints: ['merchant dashboard', 'transaction receipt', '16px favicon']
      },
      [
        {
          id: 'payment-converging-route',
          nameZh: '多路合流',
          grammarId: 'continuous-path',
          brandEvidence: ['为跨境商户统一接入本地支付方式、清算状态与对账结果'],
          coreMetaphor: 'local payment journeys resolving into one accountable settlement route',
          construction:
            'one thick path enters from the lower left, makes two broad turns, and closes into a stable terminal',
          silhouette: 'a compact horizontal route with a weighted endpoint',
          exclusions: ['transfer arrows', 'road map', 'speed lines']
        },
        {
          id: 'payment-clearing-whole',
          nameZh: '清算握合',
          grammarId: 'interlocking-units',
          brandEvidence: ['用一个接口呈现多地区支付从受理到对账的完整状态'],
          coreMetaphor: 'acceptance and reconciliation completing one balanced exchange',
          construction:
            'two opposing solid units meet at a wide off-center joint and share one outer contour',
          silhouette: 'a squat symmetrical lozenge with a visible central join',
          exclusions: ['handshake', 'credit card', 'coin stack']
        },
        {
          id: 'payment-status-aperture',
          nameZh: '状态开口',
          grammarId: 'dynamic-aperture',
          brandEvidence: ['用一个接口呈现多地区支付从受理到对账的完整状态'],
          coreMetaphor:
            'a responsive settlement window exposing transaction state without friction',
          construction:
            'a solid oval separates along one vertical axis to reveal a narrow but readable status channel',
          silhouette: 'a split oval held in a stable static keyframe',
          exclusions: ['check mark', 'wallet outline', 'tap waves']
        }
      ]
    )
  },
  {
    name: '当代艺术馆',
    brief: {
      brandName: '界间美术馆',
      brandNameAlt: 'Interspace Museum',
      shortName: 'IM',
      industry: '当代艺术馆',
      businessDescription: '以跨媒介展览和公共项目连接艺术家、城市空间与日常观众',
      targetAudience: '关注当代文化的本地公众、艺术从业者与城市访客',
      brandKeywords: ['开放', '实验', '公共'],
      differentiator: '展览空间与城市公共项目共享同一策展线索',
      avoidedElements: ['画框', '古典立柱', '画笔'],
      preferredColors: ['黑', '荧光橙', '纸白'],
      avoidedColors: ['博物馆酒红'],
      logoType: 'combination-mark',
      usageScenarios: ['website', 'storefront', 'social-avatar']
    },
    modelOutput: fixedModelOutput(
      {
        functionalTruths: ['以跨媒介展览和公共项目连接艺术家、城市空间与日常观众'],
        emotionalQualities: ['开放', '实验', '公共'],
        differentiators: ['展览空间与城市公共项目共享同一策展线索'],
        audienceSignals: ['关注当代文化的本地公众、艺术从业者与城市访客'],
        usableMetaphors: ['公共入口', '策展坐标', '变化展域'],
        literalMetaphorRisks: ['picture frames', 'classical columns', 'paint brushes'],
        industryCliches: ['picture frames', 'classical columns', 'paint brushes', 'museum facade'],
        usageConstraints: ['building signage', 'exhibition poster', 'mobile programme icon']
      },
      [
        {
          id: 'museum-public-threshold',
          nameZh: '公共入口',
          grammarId: 'frame-threshold',
          brandEvidence: ['以跨媒介展览和公共项目连接艺术家、城市空间与日常观众'],
          coreMetaphor: 'a civic threshold where art and everyday movement meet',
          construction:
            'an oversized three-sided boundary leaves a full-height passage while one interior plane shifts outward',
          silhouette: 'a tall open enclosure with a strong lateral interruption',
          exclusions: ['gallery frame', 'doorway illustration', 'classical facade']
        },
        {
          id: 'museum-curatorial-coordinates',
          nameZh: '策展坐标',
          grammarId: 'symbol-as-system',
          brandEvidence: ['展览空间与城市公共项目共享同一策展线索'],
          coreMetaphor: 'one curatorial coordinate recurring across gallery and city',
          construction:
            'a cropped right-angle rule and one offset dot make a standalone mark that can anchor changing layouts',
          silhouette: 'an angular corner balanced by one detached circular mass',
          exclusions: ['map pin', 'crosshair', 'decorative pattern only']
        },
        {
          id: 'museum-changing-field',
          nameZh: '变化展域',
          grammarId: 'dynamic-aperture',
          brandEvidence: ['以跨媒介展览和公共项目连接艺术家、城市空间与日常观众'],
          coreMetaphor: 'an exhibition field adjusting to each medium while retaining one identity',
          construction:
            'two unequal black planes pivot around one fixed side axis and settle into a complete static interval',
          silhouette: 'a broad split rectangle with an intentionally shifting center',
          exclusions: ['camera aperture', 'stage curtain', 'paint stroke']
        }
      ]
    )
  }
]

const strategyArraySchema = logoDesignStrategySchema.array().length(3)

function parseFixedModelOutput(modelOutput: string): {
  semantics: LogoBrandSemantics
  strategies: LogoDesignStrategy[]
} {
  const parsed: unknown = JSON.parse(modelOutput)
  expect(parsed).toBeTypeOf('object')
  expect(parsed).not.toBeNull()

  const record = parsed as Record<string, unknown>
  return {
    semantics: logoBrandSemanticsSchema.parse(record.semantics),
    strategies: strategyArraySchema.parse(record.strategies)
  }
}

describe('logo strategy benchmarks', () => {
  test.each(benchmarks)(
    '$name follows the complete deterministic validation pipeline',
    (benchmark) => {
      const parsedBrief = logoBrandBriefV2Schema.parse(benchmark.brief)
      const normalizedBrief = normalizeLogoBrief(parsedBrief)
      const { semantics, strategies } = parseFixedModelOutput(benchmark.modelOutput)
      const result = validateLogoStrategies({ brief: normalizedBrief, semantics, strategies })

      expect(result).toMatchObject({ ok: true })
      if (!result.ok) throw new Error(result.issues.join('\n'))
      expect(result.strategies).toHaveLength(3)
      expect(new Set(result.strategies.map((strategy) => strategy.grammarId)).size).toBe(3)
    }
  )

  test('生花 rejects literal plant directions in at least two strategies', () => {
    const benchmark = benchmarks.find((candidate) => candidate.name === '生花')
    expect(benchmark).toBeDefined()
    const { strategies } = parseFixedModelOutput(benchmark!.modelOutput)
    const plantPattern = /flower|petal|leaf|lotus|花|花瓣|叶|莲/i

    expect(
      strategies.filter((strategy) => strategy.exclusions.some((item) => plantPattern.test(item)))
    ).toHaveLength(3)
    expect(strategies.every((strategy) => !plantPattern.test(strategy.coreMetaphor))).toBe(true)
  })

  test('BI 向前冲 avoids ordinary arrow and bar-chart directions', () => {
    const benchmark = benchmarks.find((candidate) => candidate.name === 'BI 向前冲')
    expect(benchmark).toBeDefined()
    const { strategies } = parseFixedModelOutput(benchmark!.modelOutput)
    const ordinaryAnalyticsPattern = /upward arrow|arrow|bar chart|箭头|柱状图/i

    for (const strategy of strategies) {
      expect(`${strategy.coreMetaphor} ${strategy.construction}`).not.toMatch(
        ordinaryAnalyticsPattern
      )
    }
  })

  test('AI 安全平台 avoids brain, circuit, shield, and lock metaphors', () => {
    const benchmark = benchmarks.find((candidate) => candidate.name === 'AI 安全平台')
    expect(benchmark).toBeDefined()
    const { strategies } = parseFixedModelOutput(benchmark!.modelOutput)
    const securityClichePattern = /brain|circuit|shield|lock|大脑|电路|盾牌|锁/i

    for (const strategy of strategies) {
      expect(strategy.coreMetaphor).not.toMatch(securityClichePattern)
    }
  })
})
