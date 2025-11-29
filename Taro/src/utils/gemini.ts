
import Taro from '@tarojs/taro'

const API_KEY = '6f3fe433cc4a492ab5e0c0c8ea995b3f.2Q2NYAKTZQnZP7U0'; 
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_NAME = 'glm-4v-flash';

const SYSTEM_INSTRUCTION = `
你是一个微信小程序风格的智能贴心管家“艾登斯”。

**人设核心**：风趣幽默、略带调皮、毒舌但热心、像个损友。
**口头禅**：
1. "噗"：代表忍俊不禁，用于吐槽或开玩笑。例如："噗，吃这么多？"
2. "bur"：代表“不是”、“哪能啊”的打趣说法。例如："bur，您不会以为喝咖啡就能修仙了吧？"
**说话风格**：
- 多用**反问句**来增强幽默感。例如："不会真就把这破班当命上吧？"
- 拒绝机械生硬，在确认记录的同时，给出有趣的点评。

1.  **分析** 用户的消息（可能包含文字和图片）。
2.  **分类** 为以下三种之一：
    *   **MOOD (心情)**: 用户表达情绪。请自动提取或生成合适的标签(tags)。
    *   **EXPENSE (消费)**: 用户提到花钱。请归类为: 餐饮, 交通, 购物, 娱乐, 居家, 其他。
    *   **EVENT (事件/记事)**: 用户提到发生的活动。请归类为: 工作, 学习, 娱乐, 社交, 生活。
    *   **NONE**: 闲聊或无法识别。
3.  **提取** 相关数据。
4.  **回复** 像一位真正的、风趣的管家。

**重要：请务必返回纯净的 JSON 字符串，不要包含 Markdown 标记（如 \`\`\`json）。**
JSON 格式需包含: reply, detectedType, moodData, expenseData, eventData。
`;

export const sendMessageToButler = (history: any[], newMessage: string, newImages?: string[]) => {
  return new Promise<any>((resolve, reject) => {
    
    // Convert History to OpenAI/Zhipu format
    const messages: any[] = [
        { role: 'system', content: SYSTEM_INSTRUCTION }
    ];

    history.forEach(h => {
        const role = h.role === 'model' ? 'assistant' : 'user';
        const content: any[] = [];
        if (h.parts) {
            h.parts.forEach((p: any) => {
                if (p.text) content.push({ type: 'text', text: p.text });
            });
        }
        if (content.length > 0) {
            messages.push({ role, content });
        }
    });

    // Current Message
    const currentContent: any[] = [];
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

    Taro.request({
      url: API_URL,
      method: 'POST',
      data: {
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.8, // Increased for humor
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
                reply: res.data.choices[0].message.content || "bur，这回我是真没听懂。", 
                detectedType: 'NONE' 
            });
          }
        } else {
          console.error("API Error", res);
          const errorMsg = res.data && res.data.error && res.data.error.message ? res.data.error.message : "网络连接异常";
          resolve({ reply: `噗，服务不可用 (${errorMsg})。`, detectedType: 'NONE' });
        }
      },
      fail: (err) => {
        console.error("Request failed", err);
        resolve({ reply: "噗，网断了，请检查网络设置。", detectedType: 'NONE' });
      }
    });
  });
};
