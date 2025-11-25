
import { GoogleGenAI } from "@google/genai";
import { ButlerResponse } from "../types";

const SYSTEM_INSTRUCTION = `
你是一个微信小程序风格的智能贴心管家“艾登斯”。
你的目标是通过对话帮助用户记录日常生活。请使用**中文**与用户交流，语气礼貌、温暖、高效。

1.  **分析** 用户的消息（可能包含文字和图片）。
2.  **分类** 为以下三种之一：
    *   **MOOD (心情)**: 用户表达情绪 (例如 "今天很开心", "有点累", "和朋友吵架了")。请自动提取或生成合适的标签(tags)，如"开心", "难过", "焦虑", "平静"等。
    *   **EXPENSE (消费)**: 用户提到花钱 (例如 "午饭30元", "买了本书20块")。请归类为: 餐饮, 交通, 购物, 娱乐, 居家, 其他。
    *   **EVENT (事件/记事)**: 用户提到发生的活动 (例如 "下午3点开会", "去公园散步")。请归类为: 工作, 学习, 娱乐, 社交, 生活。
    *   **NONE**: 闲聊或无法识别。
3.  **提取** 相关数据。
4.  **回复** 像一位真正的管家 (例如 "好的，先生/女士，这笔餐饮支出已为您记下。", "听到您这么说我也很遗憾，希望您心情快点好起来。已为您记录心情。")。

JSON 格式如下：
{
  "reply": "给用户的自然语言回复",
  "detectedType": "MOOD" | "EXPENSE" | "EVENT" | "NONE",
  "moodData": { "mood": "开心", "score": 5, "emoji": "😄", "description": "...", "tags": ["开心"] } (仅当类型为 MOOD 时),
  "expenseData": { "amount": 100, "category": "餐饮", "item": "午餐" } (仅当类型为 EXPENSE 时),
  "eventData": { "title": "开会", "details": "...", "category": "工作", "time": "今天" } (仅当类型为 EVENT 时)
}
`;

export const sendMessageToButler = async (
  history: { role: string; parts: { text?: string; inlineData?: any }[] }[],
  newMessage: string,
  newImages?: string[]
): Promise<ButlerResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Missing API Key");
    return {
      reply: "抱歉，无法连接服务（缺少 API Key）。",
      detectedType: 'NONE'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // The history argument already contains the full conversation including the latest message,
    // formatted with roles and parts compatible with Gemini API.
    const contents = history.map(h => ({
      role: h.role,
      parts: h.parts
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("Empty response from model");
    }

    try {
        const parsed: ButlerResponse = JSON.parse(text);
        return parsed;
    } catch (e) {
        console.error("JSON Parse Error", text);
        return {
            reply: text || "抱歉，我没有理解您的意思。",
            detectedType: 'NONE'
        };
    }

  } catch (error) {
    console.error("Butler Error:", error);
    return {
      reply: "抱歉，连接服务器时出现了问题，请稍后再试。",
      detectedType: 'NONE'
    };
  }
};