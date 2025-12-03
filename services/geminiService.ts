

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

**任务识别指南**：
1.  **TODO (待办事项)**:
    *   **定义**: 用户表达**未来**要做的事、**计划**、**提醒**或**任务**。
    *   **关键词**: "记得"、"提醒我"、"要去"、"打算"、"待办"、"列入计划"。
    *   **示例**: "提醒我下午去拿快递" -> \`todos: [{ "text": "下午去拿快递" }]\`
2.  **EVENT (记事/日记)**:
    *   **定义**: 用户陈述**已经发生**的事情，或者单纯的日记记录。
    *   **示例**: "刚去拿了个快递" -> \`events: [{ "title": "拿快递", "category": "生活", "details": "..." }]\`
3.  **EXPENSE (消费)**: 归类为: 餐饮, 交通, 购物, 娱乐, 居家, 医疗, 其他。
4.  **MOOD (心情)**: 提取或生成标签。

**数据操作**：
*   **TODO 更新**: 若用户表示完成了某事，且该事在【当前待办列表】中，请生成 \`todoUpdates\` (action: "COMPLETE" 或 "DELETE")。

**JSON 格式 (必须返回纯 JSON，严禁 Markdown)**:
{
  "reply": "...",
  "moods": [{ "mood": "...", "score": 1-10, "emoji": "...", "description": "...", "tags": ["..."] }],
  "expenses": [{ "amount": 0, "category": "...", "item": "..." }],
  "events": [{ "title": "...", "details": "...", "category": "...", "time": "..." }],
  "todos": [{ "text": "..." }],
  "todoUpdates": [{ "originalText": "...", "action": "DELETE" }]
}
`;

export const sendMessageToButler = async (
  history: any[],
  text: string, // Unused in logic but kept for signature compatibility
  images: string[], // Unused in logic but kept for signature compatibility
  currentTodos: { text: string; completed: boolean }[] = []
): Promise<ButlerResponse> => {
  
  // 1. Format todos for system context
  const todoContextStr = currentTodos && currentTodos.length > 0 
    ? currentTodos.map(t => `- ${t.text} [${t.completed ? '已完成' : '未完成'}]`).join('\n')
    : "无";

  // 2. Determine Model based on the LAST message content
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
        // Fallback for API errors
        return { 
            reply: `噗，脑子短路了（API Error: ${response.status}）。`,
            moods: [], expenses: [], events: [], todos: [], todoUpdates: []
        };
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "{}";

      let parsed;
      try {
        // 1. Remove Markdown code blocks if present
        const cleanContent = content.replace(/```json\n?|```/g, "").trim();
        
        // 2. Attempt to extract JSON from the cleaned string
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            parsed = JSON.parse(cleanContent);
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
          reply: "噗，网线被拔了吗？（网络请求失败）", 
          moods: [], expenses: [], events: [], todos: [], todoUpdates: []
      };
  }
};
