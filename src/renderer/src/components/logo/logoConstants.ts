export const logoTypeOptions = [
  { label: '组合标', value: 'combination-mark' },
  { label: '图形标', value: 'symbol-mark' },
  { label: '字体标', value: 'wordmark' },
  { label: '字母标', value: 'lettermark' },
  { label: '徽章标', value: 'emblem' }
] as const

export const logoStyleDirectionOptions = [
  { label: '现代极简', value: 'modern-minimal' },
  { label: '图形符号', value: 'symbolic-mark' },
  { label: '字体标', value: 'wordmark' },
  { label: '字母标', value: 'lettermark' },
  { label: '徽章式', value: 'emblem' },
  { label: '科技感', value: 'tech' },
  { label: '亲和圆润', value: 'friendly-rounded' },
  { label: '东方现代', value: 'eastern-modern' },
  { label: '高端克制', value: 'premium-restraint' }
] as const

export const defaultLogoStyleDirections = ['modern-minimal', 'symbolic-mark', 'wordmark'] as const

export const logoUsageScenarioOptions = [
  { label: 'App 图标', value: 'app-icon' },
  { label: '网站', value: 'website' },
  { label: '电商', value: 'ecommerce' },
  { label: '包装', value: 'packaging' },
  { label: '门店招牌', value: 'storefront' },
  { label: '社媒头像', value: 'social-avatar' }
] as const
