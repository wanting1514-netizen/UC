export const FEATURE_NAMES = [
  "CRP", "ESR", "HGB", "ALB", 
  "Mayo Stool Score", "Mayo Blood Score", 
  "SCCAI Daytime Stool", "SCCAI Urgency", 
  "SCCAI Blood", "SCCAI Pain", 
  "SCCAI Wellbeing", 
  "Tongue Color", "Tongue Coating", "Pulse",
  "Disease Duration", "Age"
];

export const calculateRiskScore = (data: any) => {
  // 模拟集成学习模型逻辑 (LightGBM + XGBoost + RandomForest)
  // 实际生产中这部分逻辑应在后端 Python 环境运行，此处为前端模拟实现
  
  let score = 30; // 基础分
  
  // 实验室指标影响
  if (data.lab.crp > 10) score += 15;
  if (data.lab.esr > 20) score += 10;
  if (data.lab.alb < 35) score += 12;
  if (data.lab.hgb < 110) score += 8;
  
  // 临床评分影响
  score += (data.mayo.stool_score || 0) * 5;
  score += (data.mayo.blood_score || 0) * 7;
  score += (data.sccai.urgency || 0) * 4;
  
  // 病程与年龄
  if (data.meta.diseaseDuration > 10) score += 5;
  if (data.meta.age > 60) score += 3;

  // 限制在 0-100
  score = Math.min(100, Math.max(0, score));
  
  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'medium';
  
  // 模拟 SHAP 因素
  const shapFactors = [
    { name: "CRP", value: data.lab.crp, shap: data.lab.crp > 10 ? 8.3 : -2.1 },
    { name: "Mayo Blood", value: data.mayo.blood_score, shap: (data.mayo.blood_score || 0) * 3.2 },
    { name: "ALB", value: data.lab.alb, shap: data.lab.alb < 35 ? 6.5 : -3.2 },
    { name: "ESR", value: data.lab.esr, shap: data.lab.esr > 20 ? 4.1 : -1.5 },
    { name: "Duration", value: data.meta.diseaseDuration, shap: data.meta.diseaseDuration > 10 ? 2.8 : -0.5 },
    { name: "Age", value: data.meta.age, shap: data.meta.age > 60 ? 1.5 : -0.8 },
    { name: "Urgency", value: data.sccai.urgency, shap: (data.sccai.urgency || 0) * 2.1 }
  ].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));

  return {
    riskScore: score,
    riskLevel: level,
    shapFactors
  };
};
