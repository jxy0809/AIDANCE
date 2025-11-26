import { Component, PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import './app.css'

class App extends Component<PropsWithChildren> {

  componentDidMount () {
    if (process.env.TARO_ENV === 'weapp') {
      if (!Taro.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      } else {
        Taro.cloud.init({
          traceUser: true,
        })
      }
    }
  }

  componentDidShow () {}

  componentDidHide () {}

  render () {
    // this.props.children 是将要会渲染的页面
    return this.props.children
  }
}

export default App
