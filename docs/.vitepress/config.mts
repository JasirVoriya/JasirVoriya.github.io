import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 继承博客主题(@sugarat/theme)
  extends: blogTheme,
  lang: 'zh-cn',
  title: 'JasirVoriya\'s Zone',
  description: 'JasirVoriya的博客',
  lastUpdated: true,
  // 详见：https://vitepress.dev/reference/site-config#head
  head: [
    // 配置网站的图标（显示在浏览器的 tab 上）
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    lastUpdatedText: '上次更新于',
    logo: '/logo.png',
    editLink: {
      pattern:
        'https://github.com/JasirVoriya/JasirVoriya.github.io/tree/master/docs/:path',
      text: '去 GitHub 上编辑内容'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '关于作者', link: 'https://github.com/jasirvoriya' }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/jasirvoriya'
      },
      {
        icon: 'x',
        link: 'https://twitter.com/jasirvoriya'
      }
    ],
    outline:{
      level: [1,4],
      label: '目录'
    },
  }
})
