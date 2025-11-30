Page({
  data: {
    messages: [],
    input: '',
    isTyping: false,
    scrollToView: ''
  },
  
  onLoad: function() {
    // 加载历史消息
    const history = wx.getStorageSync('messages') || []
    if (history.length === 0) {
      // 欢迎消息
      this.setData({
        messages: [{
          id: 'welcome',
          role: 'model',
          content: '您好！我是您的智能管家艾登斯。今天过得怎么样？',
          timestamp: Date.now()
        }]
      })
      this.saveMessages()
    } else {
      this.setData({ messages: history })
    }
    this.scrollToBottom()
  },

  onInput: function(e) {
    this.setData({
      input: e.detail.value
    })
  },

  sendMessage: function() {
    const { input, messages } = this.data
    
    if (!input.trim()) {
      return
    }

    // 添加用户消息
    const userMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    this.setData({
      messages: [...messages, userMessage],
      input: '',
      isTyping: true
    })
    
    this.scrollToBottom()
    this.saveMessages()

    // 模拟AI回复（暂时）
    // TODO: 接入 Gemini API
    setTimeout(() => {
      const aiMessage = {
        id: 'msg-' + Date.now(),
        role: 'model',
        content: '收到您的消息了！目前这是演示版本，完整功能开发中...',
        timestamp: Date.now()
      }
      
      this.setData({
        messages: [...this.data.messages, aiMessage],
        isTyping: false
      })
      
      this.scrollToBottom()
      this.saveMessages()
    }, 1000)
  },

  saveMessages: function() {
    wx.setStorageSync('messages', this.data.messages)
  },

  scrollToBottom: function() {
    const query = wx.createSelectorQuery()
    query.selectAll('.message').boundingClientRect()
    query.exec((res) => {
      if (res[0] && res[0].length > 0) {
        this.setData({
          scrollToView: 'msg-' + (res[0].length - 1)
        })
      }
    })
  }
})
