export const logoTypeOptions = [
  {
    description: '图形符号和品牌名称一起出现，例如一个简洁图标 + “生花 / BloomCanvas”。',
    label: '图标 + 品牌名',
    value: 'combination-mark'
  },
  {
    description: '只设计一个能代表品牌的简洁图形，不以文字为主体。',
    label: '纯图形图标',
    value: 'symbol-mark'
  },
  {
    description: '主要设计完整品牌名的字体和字形，例如“生花”或“BloomCanvas”。',
    label: '品牌全名文字',
    value: 'wordmark'
  },
  {
    description: '主要设计品牌首字母或缩写，例如“BC”。',
    label: '首字母 / 缩写',
    value: 'lettermark'
  },
  {
    description: '把文字或图形放进非常简洁的徽章轮廓里，不能复杂和碎。',
    label: '徽章 / 印章式',
    value: 'emblem'
  }
] as const

export const logoStyleDirectionOptions = [
  { label: '现代极简', value: 'modern-minimal' },
  { label: '图形符号', value: 'symbolic-mark' },
  { label: '文字方向：品牌全名', value: 'wordmark' },
  { label: '字母方向：首字母/缩写', value: 'lettermark' },
  { label: '徽章式', value: 'emblem' },
  { label: '科技感', value: 'tech' },
  { label: '亲和圆润', value: 'friendly-rounded' },
  { label: '东方现代', value: 'eastern-modern' },
  { label: '高端克制', value: 'premium-restraint' }
] as const

export const defaultLogoStyleDirections = ['modern-minimal', 'symbolic-mark'] as const

export const logoUsageScenarioOptions = [
  { label: 'App 图标', value: 'app-icon' },
  { label: '网站', value: 'website' },
  { label: '电商', value: 'ecommerce' },
  { label: '包装', value: 'packaging' },
  { label: '门店招牌', value: 'storefront' },
  { label: '社媒头像', value: 'social-avatar' }
] as const
