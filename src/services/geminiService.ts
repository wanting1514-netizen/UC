import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const callGeminiWithRetry = async (modelName: string, contents: any, config: any, retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
      return response;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota");
      
      if (isRateLimit && i < retries - 1) {
        console.warn(`Gemini API rate limit hit (${modelName}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("AI 服务目前访问受限（频率过高），请稍等 1 分钟后再试。");
};

export const extractSymptoms = async (text: string) => {
  const response = await callGeminiWithRetry(
    "gemini-3-flash-preview",
    text,
    {
      systemInstruction: `你是一名中医临床信息结构化提取专家，专注于溃疡性结肠炎（UC）的症状分析。
你的任务是从医生输入的刻下症描述中，提取结构化的临床信息。

提取规则：
1. 症状频率转换为数字：每日X次 → frequency_per_day: X；偶尔→1；经常→3；持续→5
2. 程度评分：轻微=1，中等=2，明显/严重=3
3. 时间规律、诱发因素、缓解因素保留原文片段
4. Mayo 评分分项（仅排便频率和便血，内镜和医生评估不从文字推断，输出 null）
5. SCCAI 分项中，肠外表现（关节、眼、皮肤）若未提及输出 null
6. 提取实验室检查结果（CRP, ESR, HGB, ALB）：
   - 支持中英文对照（如：C反应蛋白/CRP, 血沉/ESR, 血红蛋白/HGB, 白蛋白/ALB）
   - 忽略大小写（crp = CRP）
   - 若无单位，按临床常规单位提取数值（CRP: mg/L, ESR: mm/h, HGB: g/L, ALB: g/L）
7. 无法判断的字段一律输出 null，禁止猜测
8. 只输出 JSON，不输出任何解释`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symptoms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                present: { type: Type.BOOLEAN },
                frequency_per_day: { type: Type.NUMBER, nullable: true },
                severity: { type: Type.NUMBER, description: "1-3" },
                timing: { type: Type.STRING, nullable: true },
                trigger: { type: Type.STRING, nullable: true },
                relief: { type: Type.STRING, nullable: true }
              }
            }
          },
          tongue: {
            type: Type.OBJECT,
            properties: {
              color: { type: Type.STRING },
              coating: { type: Type.STRING }
            }
          },
          pulse: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          mayo_components: {
            type: Type.OBJECT,
            properties: {
              stool_frequency_score: { type: Type.NUMBER, nullable: true },
              rectal_bleeding_score: { type: Type.NUMBER, nullable: true }
            }
          },
          sccai_components: {
            type: Type.OBJECT,
            properties: {
              daytime_stool: { type: Type.NUMBER, nullable: true },
              night_stool: { type: Type.NUMBER, nullable: true },
              urgency: { type: Type.NUMBER, nullable: true },
              blood_in_stool: { type: Type.NUMBER, nullable: true },
              general_wellbeing: { type: Type.NUMBER, nullable: true },
              abdominal_pain: { type: Type.NUMBER, nullable: true }
            }
          },
          lab_results: {
            type: Type.OBJECT,
            properties: {
              crp: { type: Type.NUMBER, nullable: true, description: "C-reactive protein" },
              esr: { type: Type.NUMBER, nullable: true, description: "Erythrocyte sedimentation rate" },
              hgb: { type: Type.NUMBER, nullable: true, description: "Hemoglobin" },
              alb: { type: Type.NUMBER, nullable: true, description: "Albumin" }
            }
          },
          confidence: { type: Type.NUMBER }
        }
      }
    }
  );
  
  return JSON.parse(response.text);
};

export const analyzeTCM = async (patientData: any, candidateSyndromes: any[]) => {
  const kbContext = candidateSyndromes.map((s, i) => `
【候选证型 ${i + 1}】${s.name}
  主症判据：${s.diagnostic_criteria.primary_symptoms.map((ps: any) => ps.text).join('；')}
  次症：${s.diagnostic_criteria.secondary_symptoms.map((ss: any) => ss.text).join('；')}
  标准舌象：舌色：${s.diagnostic_criteria.tongue.color.join('、')}；苔：${s.diagnostic_criteria.tongue.coating.join('、')}
  标准脉象：${s.diagnostic_criteria.pulse.join('、')}
  鉴别要点：${s.differentiation_notes}
  治法：${s.treatment.principle}
  参考方剂：${s.treatment.formula}
`).join('\n');

  const prompt = `你是一名中医消化科专家，请根据患者信息对照以下知识库标准进行辨证分析。

【患者信息】
症状：${patientData.symptoms.map((s: any) => s.name).join(', ')}
舌象：${patientData.tcm.tongue.color}，${patientData.tcm.tongue.coating}
脉象：${patientData.tcm.pulse.join('、')}
病程：${patientData.meta.diseaseDuration}年
实验室：CRP ${patientData.lab.crp || "未知"} mg/L, ESR ${patientData.lab.esr || "未知"} mm/h

【知识库诊断标准】
${kbContext}

请按以下 JSON 格式输出：
{
  "pattern": "最匹配证型名称",
  "confidence": 0.0-1.0,
  "explanation": "辨证依据",
  "matched_criteria": [
    { "item": "标准项", "patient_symptom": "对应症状", "match_type": "primary|secondary|tongue|pulse" }
  ],
  "atypical_findings": [
    { "item": "缺失的典型表现", "significance": "临床意义" }
  ],
  "treatment_principle": "治法",
  "suggested_formula": "方剂",
  "key_herbs": ["药1", "药2"],
  "formula_rationale": "方解",
  "lifestyle_advice": "生活调摄",
  "source": "来源"
}`;

  const response = await callGeminiWithRetry(
    "gemini-3-flash-preview",
    prompt,
    {
      responseMimeType: "application/json"
    }
  );

  return JSON.parse(response.text);
};
