import React, { forwardRef } from 'react';

interface ReportTemplateProps {
  patientData: any;
  analysis: any;
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(({ patientData, analysis }, ref) => {
  if (!analysis) return null;

  const score = analysis.riskScore || 0;
  const angleRad = (180 + (score / 100) * 180) * Math.PI / 180;
  const lineLength = 70;
  const x2 = 100 + lineLength * Math.cos(angleRad);
  const y2 = 110 + lineLength * Math.sin(angleRad);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);

  const riskLevelText = analysis.riskLevel === 'high' ? '高风险' : analysis.riskLevel === 'medium' ? '中风险' : '低风险';
  const riskLevelClass = analysis.riskLevel === 'high' ? 'risk-high' : analysis.riskLevel === 'medium' ? 'risk-medium' : 'risk-low';

  return (
    <div ref={ref} className="pdf-page" style={{
      width: '794px',
      minHeight: '1100px',
      background: '#fff',
      padding: '0',
      position: 'relative',
      fontFamily: '"SimSun", "SimHei", "Times New Roman", Georgia, serif',
      color: '#222',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .pdf-page * { box-sizing: border-box; }
        .pdf-header {
          background: #f5f6f8;
          border-bottom: 2px solid #4a6fa5;
          padding: 16px 28px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pdf-header-left, .pdf-header-right { font-size: 13px; color: #444; line-height: 1.9; }
        .pdf-header-right { text-align: right; }
        .pdf-report-title {
          text-align: center;
          padding: 14px 0 10px;
          font-size: 20px;
          font-weight: bold;
          color: #2c3e6b;
          letter-spacing: 4px;
          border-bottom: 1px solid #e0e4ea;
          margin: 0 28px;
        }
        .pdf-section-title {
          font-size: 14px;
          font-weight: bold;
          color: #2c3e6b;
          padding: 10px 28px 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pdf-section-title::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 16px;
          background: #4a6fa5;
          border-radius: 2px;
        }
        .pdf-row1 {
          display: flex;
          gap: 0;
          padding: 4px 28px 8px;
          align-items: stretch;
        }
        .pdf-gauge-panel {
          width: 33%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #e0e4ea;
          border-radius: 6px;
          padding: 12px 8px;
          background: #fafbfc;
        }
        .pdf-shap-panel {
          width: 67%;
          margin-left: 12px;
          border: 1px solid #e0e4ea;
          border-radius: 6px;
          padding: 12px 16px;
          background: #fafbfc;
        }
        .pdf-risk-badge {
          display: inline-block;
          padding: 4px 18px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: bold;
          margin-top: 6px;
          letter-spacing: 1px;
        }
        .risk-high { background: #fde8e8; color: #c0392b; border: 1px solid #e8a0a0; }
        .risk-medium { background: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
        .risk-low { background: #d1fae5; color: #059669; border: 1px solid #6ee7b7; }
        .pdf-risk-suggestion {
          font-size: 12px;
          color: #c0392b;
          margin-top: 4px;
          text-align: center;
        }
        .pdf-feature-table-wrap {
          padding: 4px 28px 8px;
        }
        .pdf-feature-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .pdf-feature-table th {
          background: #4a6fa5;
          color: #fff;
          font-weight: bold;
          padding: 7px 10px;
          text-align: center;
          font-size: 13px;
        }
        .pdf-feature-table td {
          padding: 6px 10px;
          text-align: center;
          border-bottom: 1px solid #e8eaee;
        }
        .pdf-feature-table tr:nth-child(even) td { background: #f8f9fb; }
        .pdf-feature-table tr:hover td { background: #eef2f8; }
        .status-abnormal { color: #c0392b; font-weight: bold; }
        .status-normal { color: #27ae60; font-weight: bold; }
        .pdf-rec-box {
          margin: 4px 28px 8px;
          background: #fffbef;
          border: 1px solid #f0e0a0;
          border-radius: 6px;
          padding: 14px 18px;
        }
        .pdf-rec-box ol {
          padding-left: 20px;
          font-size: 13px;
          line-height: 2;
          color: #333;
        }
        .pdf-rec-disclaimer {
          font-size: 11px;
          color: #999;
          margin-top: 8px;
          text-align: right;
        }
        .pdf-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          border-top: 1px solid #d0d4da;
          padding: 10px 28px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #999;
          background: #fafbfc;
        }
        .pdf-shap-row {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
          font-size: 12px;
          height: 24px;
        }
        .pdf-shap-label {
          width: 130px;
          text-align: right;
          padding-right: 10px;
          color: #444;
          font-size: 12.5px;
          flex-shrink: 0;
        }
        .pdf-shap-bar-area {
          flex: 1;
          position: relative;
          height: 18px;
          display: flex;
          align-items: center;
        }
        .pdf-shap-bar {
          height: 16px;
          border-radius: 2px;
          position: absolute;
        }
        .pdf-shap-val {
          font-size: 11px;
          color: #555;
          position: absolute;
          white-space: nowrap;
        }
        .pdf-shap-baseline {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #888;
        }
        .pdf-shap-axis {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #aaa;
          padding-left: 130px;
          margin-top: 2px;
        }
      `}</style>

      {/* Header */}
      <div className="pdf-header">
        <div className="pdf-header-left">
          患者姓名：<b>{patientData.name || '未命名'}</b><br/>
          性　　别：{patientData.gender === 'male' ? '男' : '女'}　　年龄：<b>{patientData.age}岁</b><br/>
          就诊日期：{dateStr}
        </div>
        <div className="pdf-header-right">
          报告生成时间：{dateStr} {timeStr}<br/>
          模型版本：<b>v2.1-Stack-Enhanced</b><br/>
          报告编号：RPT-{dateStr.replace(/-/g, '')}-{(Math.random() * 1000).toFixed(0).padStart(4, '0')}
        </div>
      </div>

      {/* Title */}
      <div className="pdf-report-title">溃疡性结肠炎（UC）复发风险个性化评估报告</div>

      {/* Row 1 */}
      <div className="pdf-section-title">风险评估结果与模型解释</div>
      <div className="pdf-row1">
        <div className="pdf-gauge-panel">
          <svg width="200" height="130" viewBox="0 0 200 130">
            <path d="M 24.2 110 A 80 80 0 0 1 55.1 36.1" fill="none" stroke="#27ae60" strokeWidth="12" strokeLinecap="round" opacity="0.8"/>
            <path d="M 55.1 36.1 A 80 80 0 0 1 152.8 49.5" fill="none" stroke="#f39c12" strokeWidth="12" strokeLinecap="round" opacity="0.8"/>
            <path d="M 152.8 49.5 A 80 80 0 0 1 175.8 110" fill="none" stroke="#c0392b" strokeWidth="12" strokeLinecap="round" opacity="0.8"/>

            <text x="14" y="124" fontSize="10" fill="#888" textAnchor="middle">0</text>
            <text x="47" y="30" fontSize="10" fill="#888" textAnchor="middle">40</text>
            <text x="158" y="42" fontSize="10" fill="#888" textAnchor="middle">70</text>
            <text x="188" y="124" fontSize="10" fill="#888" textAnchor="middle">100</text>

            <line x1="100" y1="110" x2={x2} y2={y2} stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="100" cy="110" r="5" fill="#c0392b"/>
            <circle cx="100" cy="110" r="2.5" fill="#fff"/>

            <text x="100" y="100" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#c0392b" fontFamily="'Times New Roman',Georgia,serif">
              {score}
            </text>
          </svg>
          <div className={`pdf-risk-badge ${riskLevelClass}`}>
            {analysis.riskLevel === 'high' ? '⚠ 高风险' : analysis.riskLevel === 'medium' ? '⚠ 中风险' : '✓ 低风险'}
          </div>
          <div className="pdf-risk-suggestion" style={{ color: analysis.riskLevel === 'high' ? '#c0392b' : analysis.riskLevel === 'medium' ? '#d97706' : '#059669' }}>
            {analysis.riskLevel === 'high' ? '建议1–2个月内安排肠镜复查' : analysis.riskLevel === 'medium' ? '建议3个月内随访复查' : '建议维持当前方案，定期随访'}
          </div>
        </div>

        <div className="pdf-shap-panel">
          <div style={{fontSize: '13px', color: '#2c3e6b', fontWeight: 'bold', marginBottom: '8px'}}>SHAP特征贡献度（瀑布图简版）</div>
          <div style={{position: 'relative'}}>
            <div className="pdf-shap-baseline" style={{left: 'calc(130px + 50%)', width: '1px', top: 0, bottom: 0, position: 'absolute', background: '#bbb', height: '100%'}}></div>
            
            {(() => {
              const maxShap = Math.max(...(analysis.shapFactors || []).map((f: any) => Math.abs(f.shap)), 1);
              return analysis.shapFactors?.slice(0, 6).map((factor: any, idx: number) => {
                const isPositive = factor.shap > 0;
                const width = (Math.abs(factor.shap) / maxShap) * 45; // Max width is 45%
                
                return (
                  <div key={idx} className="pdf-shap-row">
                    <div className="pdf-shap-label">{factor.name}</div>
                    <div className="pdf-shap-bar-area">
                      {isPositive ? (
                        <>
                          <div className="pdf-shap-bar" style={{left: '50%', width: `${width}%`, background: 'rgba(220,50,50,0.7)'}}></div>
                          <span className="pdf-shap-val" style={{left: `${50 + width + 2}%`, color: '#c0392b'}}>+{factor.shap.toFixed(2)}</span>
                        </>
                      ) : (
                        <>
                          <div className="pdf-shap-bar" style={{right: '50%', width: `${width}%`, background: 'rgba(37,99,235,0.55)'}}></div>
                          <span className="pdf-shap-val" style={{right: `${50 + width + 2}%`, color: '#2563eb'}}>{factor.shap.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="pdf-shap-axis">
            <span>← 降低风险</span>
            <span>基线</span>
            <span>增加风险 →</span>
          </div>
          <div style={{fontSize: '10.5px', color: '#aaa', marginTop: '6px'}}>红色条表示推高风险的特征，蓝色条表示降低风险的特征</div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="pdf-section-title">中西医特征对照表</div>
      <div className="pdf-feature-table-wrap">
        <table className="pdf-feature-table">
          <thead>
            <tr>
              <th style={{width: '30%'}}>特征名称</th>
              <th style={{width: '22%'}}>患者当前值</th>
              <th style={{width: '22%'}}>参考范围</th>
              <th style={{width: '13%'}}>状态</th>
              <th style={{width: '13%'}}>类别</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>CRP（mg/L）</td>
              <td><b>{patientData.lab?.crp || 0}</b></td>
              <td>0–8</td>
              <td className={(patientData.lab?.crp || 0) > 8 ? 'status-abnormal' : 'status-normal'}>
                {(patientData.lab?.crp || 0) > 8 ? '↑ 异常' : '✓ 正常'}
              </td>
              <td>西医</td>
            </tr>
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>ESR（mm/h）</td>
              <td><b>{patientData.lab?.esr || 0}</b></td>
              <td>0–15</td>
              <td className={(patientData.lab?.esr || 0) > 15 ? 'status-abnormal' : 'status-normal'}>
                {(patientData.lab?.esr || 0) > 15 ? '↑ 异常' : '✓ 正常'}
              </td>
              <td>西医</td>
            </tr>
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>血红蛋白（g/L）</td>
              <td><b>{patientData.lab?.hgb || 0}</b></td>
              <td>120–160</td>
              <td className={(patientData.lab?.hgb || 0) < 120 ? 'status-abnormal' : 'status-normal'}>
                {(patientData.lab?.hgb || 0) < 120 ? '↓ 偏低' : '✓ 正常'}
              </td>
              <td>西医</td>
            </tr>
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>白蛋白（g/L）</td>
              <td><b>{patientData.lab?.alb || 0}</b></td>
              <td>40–55</td>
              <td className={(patientData.lab?.alb || 0) < 40 ? 'status-abnormal' : 'status-normal'}>
                {(patientData.lab?.alb || 0) < 40 ? '↓ 偏低' : '✓ 正常'}
              </td>
              <td>西医</td>
            </tr>
            {patientData.mayo?.blood_score !== undefined && (
              <tr>
                <td style={{textAlign: 'left', paddingLeft: '16px'}}>Mayo便血评分</td>
                <td><b>{patientData.mayo.blood_score}</b></td>
                <td>0</td>
                <td className={patientData.mayo.blood_score > 0 ? 'status-abnormal' : 'status-normal'}>
                  {patientData.mayo.blood_score > 0 ? '↑ 异常' : '✓ 正常'}
                </td>
                <td>西医</td>
              </tr>
            )}
            {patientData.sccai?.urgency !== undefined && (
              <tr>
                <td style={{textAlign: 'left', paddingLeft: '16px'}}>SCCAI排便急迫感</td>
                <td><b>{patientData.sccai.urgency}</b></td>
                <td>0</td>
                <td className={patientData.sccai.urgency > 0 ? 'status-abnormal' : 'status-normal'}>
                  {patientData.sccai.urgency > 0 ? '↑ 异常' : '✓ 正常'}
                </td>
                <td>西医</td>
              </tr>
            )}
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>中医证候</td>
              <td><b>{analysis.tcmAnalysis?.pattern || '未评估'}</b></td>
              <td>—</td>
              <td className="status-abnormal">↑ 异常</td>
              <td>中医</td>
            </tr>
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>舌象</td>
              <td>{patientData.tcm?.tongue?.color || '未评估'} {patientData.tcm?.tongue?.coating || ''}</td>
              <td>淡红舌薄白苔</td>
              <td className="status-abnormal">↑ 异常</td>
              <td>中医</td>
            </tr>
            <tr>
              <td style={{textAlign: 'left', paddingLeft: '16px'}}>脉象</td>
              <td>{patientData.tcm?.pulse?.join('、') || '未评估'}</td>
              <td>平脉</td>
              <td className="status-abnormal">↑ 异常</td>
              <td>中医</td>
            </tr>
            {patientData.symptoms?.slice(0, 3).map((s: any, i: number) => (
              <tr key={i}>
                <td style={{textAlign: 'left', paddingLeft: '16px'}}>{s.name}</td>
                <td><b>{s.severity === 3 ? '重度' : s.severity === 2 ? '中度' : '轻度'}</b></td>
                <td>无</td>
                <td className="status-abnormal">↑ 异常</td>
                <td>中医/西医</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row 3 */}
      <div className="pdf-section-title">临床建议</div>
      <div className="pdf-rec-box">
        <ol>
          <li>该患者复发风险概率为 <b style={{color: analysis.riskLevel === 'high' ? '#c0392b' : analysis.riskLevel === 'medium' ? '#d97706' : '#059669'}}>{score}（{riskLevelText}）</b>，{analysis.riskLevel === 'high' ? '建议 1–2个月内 安排肠镜复查，并结合粪钙卫蛋白动态监测评估黏膜愈合情况。' : analysis.riskLevel === 'medium' ? '建议 3个月内 随访复查。' : '建议维持当前方案，定期随访。'}</li>
          <li>{analysis.tcmAnalysis?.explanation || '当前指标提示活动性炎症可能，建议评估是否需要调整治疗方案。'}</li>
          <li>中医辨证提示 <b>{analysis.tcmAnalysis?.pattern}</b>，可考虑在西医标准治疗基础上联合 <b>{analysis.tcmAnalysis?.treatment_principle}</b> 类中药方剂（如{analysis.tcmAnalysis?.suggested_formula}），并指导患者调节情志、规律饮食。</li>
        </ol>
        <div className="pdf-rec-disclaimer">※ 以上建议由AI模型辅助生成，仅供临床参考，最终诊疗决策权在主治医生。</div>
      </div>

      {/* Footer */}
      <div className="pdf-footer">
        <div>██████医院 · 消化内科 · 临床决策支持系统（CDSS）</div>
        <div>打印时间：{dateStr} {timeStr} &nbsp;|&nbsp; 第 1 页 / 共 1 页</div>
      </div>

    </div>
  );
});
