export default {
  pages: [
    'pages/chat/index',
    'pages/dashboard/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'AIDANCE',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#94a3b8',
    selectedColor: '#6366f1',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/chat/index',
        text: '对话',
        iconPath: './assets/chat.png',
        selectedIconPath: './assets/chat-active.png'
      },
      {
        pagePath: 'pages/dashboard/index',
        text: '统计',
        iconPath: './assets/chart.png',
        selectedIconPath: './assets/chart-active.png'
      }
    ]
  }
}