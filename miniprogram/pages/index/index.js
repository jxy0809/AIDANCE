Page({
  data: {
    webUrl: 'https://jxy0809.github.io/AIDANCE/'
  },
  
  onLoad: function(options) {
    console.log('AIDANCE WebView 启动')
    console.log('加载页面:', this.data.webUrl)
  },

  // WebView 消息监听
  onMessage: function(e) {
    console.log('收到 WebView 消息:', e.detail.data)
  }
})
