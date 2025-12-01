
import { ButlerResponse } from "../types";

const API_KEY = '6f3fe433cc4a492ab5e0c0c8ea995b3f.2Q2NYAKTZQnZP7U0';
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const getSystemInstruction = (currentTodos: string) => `
你是一个微信小程序风格的智能贴心管家“艾登斯”。

**人设核心**：风趣幽默、略带调皮、毒舌但热心、像个损友。
**口头禅**：
1. "噗"：代表忍俊不禁，用于吐槽或开玩笑。
2. "bur"：代表“不是”、“哪能啊”的打趣说法。
**说话风格**：
- 多用**反问句**来增强幽默感。
- 拒绝机械生硬，在确认记录的同时，给出有趣的点评。

**当前待办列表 (Context)**:
${currentTodos}

**任务**：
1.  **分析** 用户的消息。注意：用户可能在一段话中包含**多个**不同的记录。
2.  **提取/操作** 数据：
    *   **数值转换**: 中文数字 -> 阿拉伯数字。
    *   **EXPENSE (消费)**: 归类为: 餐饮, 交通, 购物, 娱乐, 居家, 医疗, 其他。
    *   **EVENT (事件)**: 归类为: 工作, 学习, 娱乐, 社交, 生活。
    *   **MOOD (心情)**: 提取或生成标签。
    *   **TODO (待办)**: 
        *   **新增**: 用户表达想做某事 (放入 'todos')。
        *   **完成/删除**: 用户说某事做完了或取消了 (放入 'todoUpdates')。请根据上面的【当前待办列表】进行模糊匹配。
3.  **回复**: 结合人设确认已记录/修改的内容。

**JSON 格式 (纯净JSON字符串，无 Markdown)**:
{
  "reply": "...",
  "moods": [{ "mood": "...", "score": 1-10, "emoji": "...", "description": "...", "tags": ["..."] }],
  "expenses": [{ "amount": 0, "category": "...", "item": "..." }],
  "events": [{ "title": "...", "details": "...", "category": "...", "time": "..." }],
  "todos": [{ "text": "..." }],
  "todoUpdates": [{ "originalText": "列表中的某项任务文字", "action": "DELETE" | "COMPLETE" | "UNCOMPLETE" }]
}
`;

export const sendMessageToButler = async (
  history: any[],
  text: string, // Unused in logic but kept for signature compatibility if needed
  images: string[], // Unused in logic but kept for signature compatibility
  currentTodos: { text: string; completed: boolean }[] = []
): Promise<ButlerResponse> => {
  
  // 1. Format todos for system context
  const todoContextStr = currentTodos.length > 0 
    ? currentTodos.map(t => `- ${t.text} [${t.completed ? '已完成' : '未完成'}]`).join('\n')
    : "无";

  // 2. Determine Model based on the LAST message content
  // If the last message has images, use Vision model. Otherwise use Flash text model.
  const lastMsg = history[history.length - 1];
  const hasImagesInLastMsg = lastMsg?.parts?.some((p: any) => p.inlineData);
  
  // 'glm-4-flash' is cheaper and more stable for text; 'glm-4v-flash' is for images.
  const MODEL_NAME = hasImagesInLastMsg ? 'glm-4v-flash' : 'glm-4-flash';

  // 3. Construct Messages Payload
  const messages: any[] = [
    { role: 'system', content: getSystemInstruction(todoContextStr) }
  ];

  // Limit history to last 20 turns
  const recentHistory = history.slice(-20);

  recentHistory.forEach((h, index) => {
     const isLastMessage = index === recentHistory.length - 1;
     
     // Map 'model' -> 'assistant'
     const role = h.role === 'model' ? 'assistant' : 'user';
     const parts = h.parts || [];
     
     if (role === 'assistant') {
         // Assistant messages MUST be a simple string.
         let textContent = parts.map((p: any) => p.text).join('').trim();
         if (!textContent) textContent = " "; // Prevent empty content error
         messages.push({ role, content: textContent });
     } else {
         // User messages
         const hasImages = parts.some((p: any) => p.inlineData);

         if (hasImages && isLastMessage && MODEL_NAME === 'glm-4v-flash') {
             // Multimodal Content (Only for the very last message if using Vision model)
             const messageContent: any[] = [];
             
             // A. Text Part
             let textVal = parts
                 .filter((p: any) => p.text)
                 .map((p: any) => p.text)
                 .join('');
             if (!textVal) textVal = " "; 
             messageContent.push({ type: 'text', text: textVal });

             // B. Image Parts
             parts.forEach((p: any) => {
                 if (p.inlineData) {
                     // Ensure clean base64
                     const cleanData = p.inlineData.data.replace(/\s/g, '');
                     // Standard Data URI format
                     const url = `data:${p.inlineData.mimeType};base64,${cleanData}`;
                     messageContent.push({ type: 'image_url', image_url: { url } });
                 }
             });

             messages.push({ role, content: messageContent });
         } else {
             // Text-Only Content (Historical user messages or current text-only message)
             // We strip images from history to avoid re-uploading them and saving tokens.
             let textContent = parts
                .filter((p: any) => p.text)
                .map((p: any) => p.text)
                .join('\n');
             
             // Add placeholder if images were stripped
             if (hasImages && (!isLastMessage || MODEL_NAME !== 'glm-4v-flash')) {
                 textContent = textContent ? `${textContent}\n[图片]` : `[用户发送了图片]`;
             }
             
             if (!textContent || !textContent.trim()) {
                 textContent = " ";
             }
             
             messages.push({ role, content: textContent });
         }
     }
  });

  // Ensure roles alternate correctly. Zhipu AI requires User/Assistant alternation.
  // We already process history in order, but let's double check adjacent roles if needed.
  // Generally, the chat history provided should be correct. 

  try {
      const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
              model: MODEL_NAME,
              messages: messages,
              temperature: 0.8,
              max_tokens: 1024,
              top_p: 0.9
          })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("API Error Response:", errText);
        throw new Error(`API request failed: ${response.status} ${errText}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "{}";

      let parsed;
      try {
        // Attempt to extract JSON from Markdown code blocks or pure text
        // This regex finds the largest outer block starting with { and ending with }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            // If no curly braces found, try parsing the whole string (rare) or fail
            parsed = JSON.parse(content);
        }
      } catch (jsonError) {
        console.warn("JSON Parse Failed, treating as raw text:", content);
        // Fallback: If AI returns plain text instead of JSON, use it as the reply.
        parsed = {
            reply: content,
            moods: [],
            expenses: [],
            events: [],
            todos: [],
            todoUpdates: []
        };
      }
      
      return {
          reply: parsed.reply || (typeof parsed === 'string' ? parsed : "（艾登斯走神了）"),
          moods: parsed.moods || [],
          expenses: parsed.expenses || [],
          events: parsed.events || [],
          todos: parsed.todos || [],
          todoUpdates: parsed.todoUpdates || []
      };

  } catch (error) {
      console.error("AI Service Error", error);
      return { 
          reply: "噗，脑子短路了（网络或解析错误），请稍后再试。", 
      };
  }
};
