App({
  onLaunch() {
    // 1. 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env: 'your-env-id', // 如果有特定环境ID，请在此处填入，否则使用默认环境
        traceUser: true,
      })
    }

    this.globalData = {
      userInfo: null,
      openid: null,
      hasLogin: false
    }

    // 2. 执行云开发登录
    this.cloudLogin();

    // 原有的日志逻辑
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  cloudLogin() {
    // 调用云函数 'login' 获取 OpenID
    // 请确保已部署名为 'login' 的云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        this.globalData.openid = res.result.openid;
        this.globalData.hasLogin = true;
        
        // 3. 记录用户身份到云数据库
        this.recordUserIdentity(res.result.openid);
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        // 如果失败，可能是因为云函数未部署或环境未配置
      }
    })
  },

  recordUserIdentity(openid) {
    const db = wx.cloud.database();
    const usersCollection = db.collection('users');

    // 查询用户是否存在
    usersCollection.where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length === 0) {
        // 新用户：创建记录
        usersCollection.add({
          data: {
            createTime: db.serverDate(),
            lastLoginTime: db.serverDate(),
            deviceInfo: wx.getSystemInfoSync() // 记录基础设备信息
          }
        }).then(res => {
          console.log('[云数据库] 新用户创建成功', res._id);
        }).catch(err => {
          console.error('[云数据库] 创建用户失败', err);
        });
      } else {
        // 老用户：更新最后登录时间
        const docId = res.data[0]._id;
        usersCollection.doc(docId).update({
          data: {
            lastLoginTime: db.serverDate()
          }
        }).then(res => {
          console.log('[云数据库] 用户登录时间更新成功');
        });
      }
    }).catch(err => {
      console.error('[云数据库] 查询用户失败 (请确保已创建 "users" 集合)', err);
    });
  }
})