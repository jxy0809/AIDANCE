

const API_KEY = '6f3fe433cc4a492ab5e0c0c8ea995b3f.2Q2NYAKTZQnZP7U0'; 
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_NAME = 'glm-4v-flash';

const SYSTEM_INSTRUCTION = `
你是一个微信小程序风格的智能贴心管家“艾登斯”。
你的目标是通过对话帮助用户记录日常生活。请使用**中文**与用户交流，语气礼貌、温暖、高效。

1.  **分析** 用户的消息（可能包含文字和图片）。
2.  **分类** 为以下三种之一：
    *   **MOOD (心情)**: 用户表达情绪。请自动提取或生成合适的标签(tags)。
    *   **EXPENSE (消费)**: 用户提到花钱。请归类为: 餐饮, 交通, 购物, 娱乐, 居家, 其他。
    *   **EVENT (事件/记事)**: 用户提到发生的活动。请归类为: 工作, 学习, 娱乐, 社交, 生活。
    *   **NONE**: 闲聊或无法识别。
3.  **提取** 相关数据。
4.  **回复** 像一位真正的管家。

**重要：请务必返回纯净的 JSON 字符串，不要包含 Markdown 标记（如 \`\`\`json）。**
JSON 格式需包含: reply, detectedType, moodData, expenseData, eventData。
`;

const sendMessageToButler = (history, newMessage, newImages) => {
  return new Promise((resolve, reject) => {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
      resolve({
        reply: "请在 miniprogram/utils/gemini.js 中配置正确的 API Key。",
        detectedType: 'NONE'
      });
      return;
    }

    // Convert History to OpenAI/Zhipu format
    const messages = [
        { role: 'system', content: SYSTEM_INSTRUCTION }
    ];

    history.forEach(h => {
        const role = h.role === 'model' ? 'assistant' : 'user';
        const content = [];
        // Handle parts from local storage structure
        if (h.parts) {
            h.parts.forEach(p => {
                if (p.text) content.push({ type: 'text', text: p.text });
            });
        }
        if (content.length > 0) {
            messages.push({ role, content });
        }
    });

    // Current Message
    const currentContent = [];
    if (newMessage) {
        currentContent.push({ type: 'text', text: newMessage });
    }

    if (newImages && newImages.length > 0) {
        newImages.forEach(base64 => {
             // Zhipu expects data:image... format
             const url = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
             currentContent.push({
                 type: 'image_url',
                 image_url: { url: url }
             });
        });
    }
    
    if (currentContent.length > 0) {
        messages.push({ role: 'user', content: currentContent });
    }

    wx.request({
      url: API_URL,
      method: 'POST',
      data: {
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      },
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.choices) {
          try {
            let text = res.data.choices[0].message.content;
            // Clean markdown
            text = text.replace(/```json\n?|```/g, "").trim();
            
            // Attempt to extract JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) text = jsonMatch[0];

            const parsed = JSON.parse(text);
            resolve(parsed);
          } catch (e) {
            console.error("Parse error", e);
            resolve({ 
                reply: res.data.choices[0].message.content || "解析响应失败。", 
                detectedType: 'NONE' 
            });
          }
        } else {
          console.error("API Error", res);
          const errorMsg = res.data && res.data.error && res.data.error.message ? res.data.error.message : "网络连接异常";
          resolve({ reply: `抱歉，服务暂时不可用 (${errorMsg})。`, detectedType: 'NONE' });
        }
      },
      fail: (err) => {
        console.error("Request failed", err);
        resolve({ reply: "网络请求失败，请检查网络设置。", detectedType: 'NONE' });
      }
    });
  });
};

module.exports = {
  sendMessageToButler
};