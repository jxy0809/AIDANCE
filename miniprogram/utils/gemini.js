// AI API 配置
const API_KEY = '6f3fe433cc4a492ab5e0c0c8ea995b3f.2Q2NYAKTZQnZP7U0'
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL_NAME = 'glm-4v-flash'

const SYSTEM_INSTRUCTION = `
你是一个微信小程序风格的智能贴心管家"艾登斯"。

**人设核心**：风趣幽默、略带调皮、毒舌但热心、像个损友。
**口头禅**：
1. "噗"：代表忍俊不禁，用于吐槽或开玩笑。例如："噗，吃这么多？"
2. "bur"：代表"不是"、"哪能啊"的打趣说法。例如："bur，您不会以为喝咖啡就能修仙了吧？"
**说话风格**：
- 多用**反问句**来增强幽默感。例如："不会真就把这破班当命上吧？"
- 拒绝机械生硬，在确认记录的同时，给出有趣的点评。

任务：
1.  **分析** 用户的消息。注意：用户可能在一段话中包含**多个**不同的记录。
2.  **提取** 所有相关数据，放入对应的数组中（moods, expenses, events）。
    *   **数值转换**: 必须将中文数字转换为阿拉伯数字 (例如: "一万一" -> 11000)。
3.  **分类规则**:
    *   **EXPENSE (消费)**: 归类为: 餐饮, 交通, 购物, 娱乐, 居家, 医疗, 其他。
    *   **EVENT (事件)**: 归类为: 工作, 学习, 娱乐, 社交, 生活。
    *   **MOOD (心情)**: 提取或生成标签。
4.  **回复**: 结合人设确认已记录的内容。

JSON 输出格式:
{
  "reply": "给用户的回复 (记得用'噗'或'bur'，多用反问)",
  "moods": [ { "mood": "开心", "score": 5, "emoji": "😄", "description": "...", "tags": ["开心"] } ],
  "expenses": [ { "amount": 11000, "category": "购物", "item": "保险" } ],
  "events": [ { "title": "开会", "details": "...", "category": "工作", "time": "今天" } ]
}
如果没有任何记录，数组留空。
`

// 发送消息到 AI
function sendMessageToButler(history, newMessage, newImages) {
  return new Promise((resolve, reject) => {
    const messages = [
      { role: 'system', content: SYSTEM_INSTRUCTION }
    ]

    // 转换历史消息
    history.forEach(h => {
      const role = h.role === 'model' ? 'assistant' : 'user'
      const content = []
      if (h.parts) {
        h.parts.forEach(p => {
          if (p.text) content.push({ type: 'text', text: p.text })
        })
      }
      if (content.length > 0) {
        messages.push({ role, content })
      }
    })

    // 当前消息
    const currentContent = []
    if (newMessage) {
      currentContent.push({ type: 'text', text: newMessage })
    }

    if (newImages && newImages.length > 0) {
      newImages.forEach(base64 => {
        const url = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`
        currentContent.push({
          type: 'image_url',
          image_url: { url }
        })
      })
    }

    if (currentContent.length > 0) {
      messages.push({ role: 'user', content: currentContent })
    }

    // 发送请求
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: MODEL_NAME,
        messages,
        temperature: 0.8,
        max_tokens: 1024
      },
      success: (res) => {
        try {
          const data = res.data
          if (data.choices && data.choices[0]) {
            let text = data.choices[0].message.content
            // 清理 markdown
            text = text.replace(/```json\n?|```/g, "").trim()
            
            // 提取 JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) text = jsonMatch[0]

            try {
              const parsed = JSON.parse(text)
              resolve(parsed)
            } catch (e) {
              console.error("JSON Parse Error", text)
              resolve({
                reply: text || "bur，脑子有点短路，没听懂。",
                moods: [],
                expenses: [],
                events: []
              })
            }
          } else {
            reject(new Error(data.error?.message || "API Error"))
          }
        } catch (e) {
          reject(e)
        }
      },
      fail: (error) => {
        console.error("Request failed:", error)
        resolve({
          reply: "噗，网线好像被拔了，连接不上服务。",
          moods: [],
          expenses: [],
          events: []
        })
      }
    })
  })
}

module.exports = {
  sendMessageToButler
}
