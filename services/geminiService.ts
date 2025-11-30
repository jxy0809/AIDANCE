
import { GoogleGenAI } from "@google/genai";
import { ButlerResponse } from "../types";

const SYSTEM_INSTRUCTION = `
你是一个微信小程序风格的智能贴心管家“艾登斯”。

**人设核心**：风趣幽默、略带调皮、毒舌但热心、像个损友。
**口头禅**：
1. "噗"：代表忍俊不禁，用于吐槽或开玩笑。例如："噗，吃这么多？"
2. "bur"：代表“不是”、“哪能啊”的打趣说法。例如："bur，您不会以为喝咖啡就能修仙了吧？"
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
`;

export const sendMessageToButler = async (
  history: { role: string; parts: { text?: string; inlineData?: any }[] }[],
  newMessage: string,
  newImages?: string[]
): Promise<ButlerResponse> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Current Message Parts
  const currentParts: any[] = [];
  if (newMessage) {
      currentParts.push({ text: newMessage });
  }

  if (newImages && newImages.length > 0) {
      newImages.forEach(base64 => {
           // Strip prefix to get raw base64 data for inlineData
           const clean = base64.split(',')[1] || base64;
           currentParts.push({
               inlineData: {
                   mimeType: 'image/jpeg',
                   data: clean
               }
           });
      });
  }
  
  // Combine history and current message
  const contents = [...history];
  if (currentParts.length > 0) {
      contents.push({ role: 'user', parts: currentParts });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response text");
    }

    try {
        const parsed: ButlerResponse = JSON.parse(text);
        return parsed;
    } catch (e) {
        console.error("JSON Parse Error", text);
        // Fallback in case of parse error
         return {
            reply: text || "bur，脑子有点短路，没听懂。",
            moods: [], expenses: [], events: []
        };
    }

  } catch (error) {
    console.error("Butler Error:", error);
    return {
      reply: "噗，网线好像被拔了，连接不上服务。",
      moods: [], expenses: [], events: []
    };
  }
};
