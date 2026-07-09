import type { ThemeConfig } from 'antd'

export const bloomTheme: ThemeConfig = {
  token: {
    borderRadius: 6,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  },
  components: {
    Button: {
      borderRadius: 6
    },
    Card: {
      borderRadiusLG: 8
    }
  }
}
