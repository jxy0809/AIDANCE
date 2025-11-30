import { PropsWithChildren, useEffect } from 'react'
import Taro, { useDidShow, useDidHide } from '@tarojs/taro'
import './app.css'

const App = (props: PropsWithChildren<{}>) => {

  useEffect(() => {
    if (process.env.TARO_ENV === 'weapp') {
      if (!Taro.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      } else {
        Taro.cloud.init({
          traceUser: true,
        })
      }
    }
  }, [])

  useDidShow(() => {})
  useDidHide(() => {})

  // children 是将要会渲染的页面
  return props.children
}

export default App