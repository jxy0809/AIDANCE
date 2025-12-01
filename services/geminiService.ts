import { GoogleGenAI, Type } from "@google/genai";
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
2.  **提取** 所有相关数据，放入对应的数组中（moods, expenses, events, todos）。
    *   **数值转换**: 必须将中文数字转换为阿拉伯数字 (例如: "一万一" -> 11000)。
3.  **分类规则**:
    *   **EXPENSE (消费)**: 归类为: 餐饮, 交通, 购物, 娱乐, 居家, 医疗, 其他。
    *   **EVENT (事件)**: 归类为: 工作, 学习, 娱乐, 社交, 生活。
    *   **MOOD (心情)**: 提取或生成标签。
    *   **TODO (待办)**: 用户表达需要去做某事，或者提醒某事。提取任务内容。
4.  **回复**: 结合人设确认已记录的内容。
`;

export const sendMessageToButler = async (
  history: any[],
  text: string,
  images: string[]
): Promise<ButlerResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Separate the history from the current message
  const previousHistory = history.slice(0, -1);
  const currentMessage = history[history.length - 1];

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: previousHistory,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          moods: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mood: { type: Type.STRING },
                score: { type: Type.NUMBER },
                emoji: { type: Type.STRING },
                description: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              }
            }
          },
          expenses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                category: { type: Type.STRING },
                item: { type: Type.STRING },
              }
            }
          },
          events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                details: { type: Type.STRING },
                category: { type: Type.STRING },
                time: { type: Type.STRING },
              }
            }
          },
          todos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
              }
            }
          }
        },
        required: ['reply']
      }
    }
  });

  const response = await chat.sendMessage({
    message: currentMessage.parts
  });

  if (response.text) {
    try {
      return JSON.parse(response.text) as ButlerResponse;
    } catch (e) {
      console.error("Failed to parse JSON response", e);
      return { reply: response.text };
    }
  }

  throw new Error("No response from AI");
};