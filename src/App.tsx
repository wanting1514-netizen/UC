import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, 
  ClipboardList, 
  Activity, 
  FileText, 
  Users, 
  Plus, 
  Download, 
  Save, 
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  Calendar,
  History,
  BookOpen,
  MessageSquare,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { extractSymptoms, analyzeTCM } from './services/geminiService';
import { calculateRiskScore } from './services/mlModel';
import { TCM_KNOWLEDGE_BASE } from './constants/knowledgeBase';
import { generatePDFReport } from './services/reportService';
import { ReportTemplate } from './components/ReportTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Types ---
interface Symptom {
  name: string;
  present: boolean;
  frequency_per_day?: number;
  severity: number;
  timing?: string;
  trigger?: string;
  relief?: string;
}

interface PatientData {
  name: string;
  age: number;
  gender: 'male' | 'female';
  meta: {
    diseaseDuration: number;
  };
  lab: {
    crp: number;
    esr: number;
    hgb: number;
    alb: number;
  };
  mayo: {
    stool_score?: number;
    blood_score?: number;
    endoscopy_score?: number;
    physician_score?: number;
  };
  sccai: {
    daytime_stool?: number;
    urgency?: number;
    blood?: number;
    pain?: number;
    wellbeing?: number;
  };
  tcm: {
    tongue: { color: string; coating: string };
    pulse: string[];
  };
  symptoms: Symptom[];
}

// --- Components ---

const Header = ({ user, onLogin, onLogout, onOpenKB, onOpenPatients, onOpenImport }: { 
  user: any, 
  onLogin: () => void, 
  onLogout: () => void,
  onOpenKB: () => void,
  onOpenPatients: () => void,
  onOpenImport: () => void
}) => (
  <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
        <Activity size={24} />
      </div>
      <div>
        <h1 className="font-bold text-slate-900 leading-tight">UC Recurrence Risk</h1>
        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Warning System • TCM AI</p>
      </div>
    </div>
    
    <div className="flex items-center gap-4 overflow-x-auto">
      <nav className="flex items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-slate-600 whitespace-nowrap">
        <button onClick={onOpenKB} className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer py-2">
          <BookOpen size={16} /> 知识库
        </button>
        <button onClick={onOpenPatients} className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer py-2">
          <Users size={16} /> 患者管理
        </button>
        <button onClick={onOpenImport} className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer py-2">
          <Download size={16} className="rotate-180" /> 导入数据
        </button>
      </nav>
      
      <div className="h-8 w-px bg-slate-200" />
      
      {user ? (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
          </button>
        </div>
      ) : (
        <button 
          onClick={onLogin}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          医生登录
        </button>
      )}
    </div>
  </header>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [patientData, setPatientData] = useState<PatientData>({
    name: '',
    age: 35,
    gender: 'male',
    meta: { diseaseDuration: 5 },
    lab: { crp: 0, esr: 0, hgb: 130, alb: 40 },
    mayo: {},
    sccai: {},
    tcm: { tongue: { color: '', coating: '' }, pulse: [] },
    symptoms: []
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');
  const [showKB, setShowKB] = useState(false);
  const [showPatients, setShowPatients] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ type: 'bug', content: '', contact: '' });
  const [isAddingSymptom, setIsAddingSymptom] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [extractionStep, setExtractionStep] = useState<1 | 2>(1);
  const [pendingExtraction, setPendingExtraction] = useState<any>(null);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGeneratePDF = async () => {
    if (!reportRef.current || !analysis) return;
    
    try {
      setIsGeneratingPDF(true);
      
      // Wait a moment for fonts/styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`UC_Report_${patientData.name || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('生成 PDF 报告失败，请重试');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setExtracting(true);
    try {
      const result = await extractSymptoms(rawText);
      setPendingExtraction(result);
      setExtractionStep(2);
    } catch (error: any) {
      console.error("Extraction failed", error);
      alert(error.message || "智能提取失败，请检查网络或稍后再试。");
    } finally {
      setExtracting(false);
    }
  };

  const confirmExtraction = () => {
    if (!pendingExtraction) return;
    setPatientData(prev => ({
      ...prev,
      symptoms: pendingExtraction.symptoms,
      tcm: {
        tongue: pendingExtraction.tongue,
        pulse: pendingExtraction.pulse
      },
      mayo: {
        ...prev.mayo,
        ...pendingExtraction.mayo_components
      },
      sccai: {
        ...prev.sccai,
        ...pendingExtraction.sccai_components
      },
      lab: {
        crp: pendingExtraction.lab_results?.crp ?? prev.lab.crp,
        esr: pendingExtraction.lab_results?.esr ?? prev.lab.esr,
        hgb: pendingExtraction.lab_results?.hgb ?? prev.lab.hgb,
        alb: pendingExtraction.lab_results?.alb ?? prev.lab.alb
      }
    }));
    setExtractionStep(1);
    setPendingExtraction(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const risk = calculateRiskScore(patientData);
      // 传入所有知识库证型作为候选
      const candidates = TCM_KNOWLEDGE_BASE;
      const tcm = await analyzeTCM(patientData, candidates);
      
      setAnalysis({
        ...risk,
        tcmAnalysis: tcm
      });
      setActiveTab('result');
    } catch (error: any) {
      console.error("Analysis failed", error);
      alert(error.message || "评估失败，AI 服务繁忙，请稍后再试。");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !analysis) return;
    try {
      await addDoc(collection(db, 'assessments'), {
        userId: user.uid,
        patientName: patientData.name,
        patientData,
        analysis,
        createdAt: serverTimestamp()
      });
      alert("记录已保存");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'assessments');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackData.content.trim()) return;
    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        ...feedbackData,
        createdAt: serverTimestamp()
      });
      alert("感谢您的反馈！我们会尽快处理。");
      setShowFeedback(false);
      setFeedbackData({ type: 'bug', content: '', contact: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const addManualSymptom = () => {
    if (!newSymptomName.trim()) return;
    const newSymptom: Symptom = {
      name: newSymptomName,
      present: true,
      severity: 1
    };
    setPatientData(prev => ({
      ...prev,
      symptoms: [...prev.symptoms, newSymptom]
    }));
    setNewSymptomName('');
    setIsAddingSymptom(false);
  };

  const removeSymptom = (index: number) => {
    setPatientData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index)
    }));
  };

  const updateSymptomSeverity = (index: number, severity: number) => {
    setPatientData(prev => ({
      ...prev,
      symptoms: prev.symptoms.map((s, i) => i === index ? { ...s, severity } : s)
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'date' | 'score'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredRecords = savedRecords
    .filter(record => {
      const query = searchQuery.toLowerCase();
      const dateStr = record.createdAt?.toDate().toLocaleString().toLowerCase() || '';
      return record.patientName?.toLowerCase().includes(query) || 
             record.analysis?.tcmAnalysis?.pattern?.toLowerCase().includes(query) ||
             dateStr.includes(query);
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a.patientName || '').localeCompare(b.patientName || '');
      } else if (sortField === 'score') {
        comparison = (a.analysis?.riskScore || 0) - (b.analysis?.riskScore || 0);
      } else if (sortField === 'date') {
        const dateA = a.createdAt?.toDate().getTime() || 0;
        const dateB = b.createdAt?.toDate().getTime() || 0;
        comparison = dateA - dateB;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onOpenKB={() => setShowKB(true)}
        onOpenPatients={() => setShowPatients(true)}
        onOpenImport={() => setShowImport(true)}
      />
      
      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- Left Panel: Input --- */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {extractionStep === 1 ? (
                <motion.section 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2 text-slate-800">
                      <ClipboardList size={20} className="text-indigo-600" />
                      Step 1: 输入刻下症 (自然语言)
                    </h2>
                  </div>
                  <div className="p-6">
                    <textarea 
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="请输入患者刻下症描述..."
                      className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
                    />
                    <button 
                      onClick={handleExtract}
                      disabled={extracting || !rawText}
                      className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {extracting ? '提取中...' : <><Activity size={18} /> 智能提取</>}
                    </button>
                  </div>
                </motion.section>
              ) : (
                <motion.section 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2 text-slate-800">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      Step 2: 核对提取结果 (可内联编辑)
                    </h2>
                    <button onClick={() => setExtractionStep(1)} className="text-xs text-slate-400 hover:text-slate-600">返回修改原文</button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="text-left pb-2 font-bold uppercase">症状</th>
                            <th className="text-left pb-2 font-bold uppercase">频率</th>
                            <th className="text-left pb-2 font-bold uppercase">程度</th>
                            <th className="text-right pb-2 font-bold uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pendingExtraction?.symptoms?.map((s: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-3 font-medium text-slate-700">
                                <span className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-500" /> {s.name}
                                </span>
                              </td>
                              <td className="py-3 text-slate-500">{s.frequency_per_day ? `${s.frequency_per_day}次/日` : '未提及'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.severity === 3 ? 'bg-red-50 text-red-600' : 
                                  s.severity === 2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {s.severity === 3 ? '重度' : s.severity === 2 ? '中度' : '轻度'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button className="text-indigo-600 font-bold hover:underline">编辑</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">舌象</p>
                        <p className="text-sm font-medium text-slate-700">{pendingExtraction?.tongue.color} / {pendingExtraction?.tongue.coating}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">脉象</p>
                        <p className="text-sm font-medium text-slate-700">{pendingExtraction?.pulse.join('、')}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                      <AlertCircle size={16} className="text-amber-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-amber-800 leading-tight">
                          Mayo内镜评分未录入，评分为近似值
                        </p>
                        <p className="text-[10px] text-amber-700">
                          Mayo ≈ {pendingExtraction?.mayo_components.stool_frequency_score + pendingExtraction?.mayo_components.rectal_bleeding_score + 2}分 
                          &nbsp; SCCAI ≈ 11分
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={confirmExtraction}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      确认并写入状态
                    </button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <h2 className="font-bold flex items-center gap-2 text-slate-800">
                <Stethoscope size={20} className="text-indigo-600" />
                基本信息与指标
              </h2>

              {/* --- Confirmed Symptoms Summary --- */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">症状清单</h3>
                  <button 
                    onClick={() => setIsAddingSymptom(!isAddingSymptom)}
                    className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> 手动添加
                  </button>
                </div>

                {isAddingSymptom && (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input 
                      type="text"
                      value={newSymptomName}
                      onChange={(e) => setNewSymptomName(e.target.value)}
                      placeholder="输入症状名称..."
                      className="flex-1 text-xs p-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => e.key === 'Enter' && addManualSymptom()}
                    />
                    <button 
                      onClick={addManualSymptom}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold"
                    >
                      确定
                    </button>
                  </div>
                )}

                {patientData.symptoms && patientData.symptoms.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patientData.symptoms?.map((s: any, idx: number) => (
                      <div key={idx} className="group relative flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100 shadow-sm hover:border-indigo-300 transition-colors">
                        <span className="text-sm font-medium text-slate-700">{s.name}</span>
                        <select 
                          value={s.severity}
                          onChange={(e) => updateSymptomSeverity(idx, parseInt(e.target.value))}
                          className={`text-[10px] font-bold bg-transparent outline-none cursor-pointer ${
                            s.severity === 3 ? 'text-red-500' : s.severity === 2 ? 'text-amber-500' : 'text-emerald-500'
                          }`}
                        >
                          <option value={1}>轻</option>
                          <option value={2}>中</option>
                          <option value={3}>重</option>
                        </select>
                        <button 
                          onClick={() => removeSymptom(idx)}
                          className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Plus size={12} className="rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-2">暂无症状，请通过 Step 1 提取或手动添加</p>
                )}
                
                {patientData.symptoms && patientData.symptoms.length > 0 && (
                  <p className="text-[10px] text-slate-400 italic">提示：以上症状已从刻下症中提取，若有遗漏请返回 Step 1 重新提取，或在上方手动调整。</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">患者姓名</label>
                  <input 
                    type="text" 
                    value={patientData.name}
                    onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">年龄</label>
                  <input 
                    type="number" 
                    value={patientData.age}
                    onChange={(e) => setPatientData({...patientData, age: parseInt(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">实验室指标</h3>
                <div className="grid grid-cols-4 gap-3">
                  {['crp', 'esr', 'hgb', 'alb'].map((key) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{key}</label>
                      <input 
                        type="number" 
                        value={(patientData.lab as any)[key]}
                        onChange={(e) => setPatientData({
                          ...patientData, 
                          lab: {...patientData.lab, [key]: parseFloat(e.target.value)}
                        })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={analyzing || !patientData.name}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {analyzing ? '分析中...' : <><Activity size={20} /> 开始风险评估</>}
              </button>
            </section>
          </div>

          {/* --- Right Panel: Results --- */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {analysis ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* TCM Analysis Card (Primary Focus) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">AI 辅助中医辨证与推荐</p>
                          <h3 className="text-3xl font-black">{analysis.tcmAnalysis.pattern}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-emerald-100 uppercase">置信度</span>
                          <div className="w-24 h-1.5 bg-emerald-700 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width: `${analysis.tcmAnalysis.confidence * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-emerald-50 leading-relaxed max-w-2xl">{analysis.tcmAnalysis.explanation}</p>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">治法原则</h4>
                            <p className="text-base font-bold text-emerald-900">{analysis.tcmAnalysis.treatment_principle}</p>
                          </div>
                          <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                            <h4 className="text-xs font-bold text-teal-600 uppercase mb-2">推荐方剂</h4>
                            <p className="text-base font-bold text-teal-900">{analysis.tcmAnalysis.suggested_formula}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">核心药物组成</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.tcmAnalysis?.key_herbs?.map((herb: string) => (
                              <span key={herb} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                                {herb}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4 border-l border-slate-100 pl-6">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">生活调摄建议</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">{analysis.tcmAnalysis.lifestyle_advice}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Score Card (Secondary Focus) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <h2 className="font-bold flex items-center gap-2 text-slate-800">
                        <Activity size={20} className="text-indigo-600" />
                        复发风险预测 (辅助参考)
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-black text-indigo-600 leading-none">{analysis.riskScore}<span className="text-sm font-normal text-slate-400">/100</span></p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          analysis.riskLevel === 'high' ? 'bg-red-100 text-red-600' : 
                          analysis.riskLevel === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {analysis.riskLevel === 'high' ? '高风险' : 
                           analysis.riskLevel === 'medium' ? '中风险' : '低风险'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase">关键风险因素 (SHAP 可解释性)</h4>
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" /> 增加风险</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> 降低风险</div>
                          </div>
                        </div>
                        <div className="h-64 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={analysis.shapFactors} 
                              layout="vertical" 
                              margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                              <XAxis type="number" hide domain={['dataMin - 2', 'dataMax + 2']} />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false} 
                                fontSize={10} 
                                width={80}
                                tick={{ fill: '#64748b', fontWeight: 600 }}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-xs">
                                        <p className="font-bold text-slate-900 mb-1">{data.name}</p>
                                        <p className="text-slate-500">贡献值: <span className={data.shap > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                                          {data.shap > 0 ? '+' : ''}{data.shap.toFixed(2)}
                                        </span></p>
                                        <p className="text-[10px] text-slate-400 mt-1 italic">
                                          {data.shap > 0 ? '该因素显著提高了复发风险' : '该因素在当前状态下有助于降低风险'}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="shap" radius={[0, 4, 4, 0]} barSize={20}>
                                {analysis.shapFactors?.map((entry: any, index: number) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.shap > 0 ? '#ef4444' : '#10b981'} 
                                    fillOpacity={0.8}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">临床干预建议</h4>
                        <ul className="space-y-3">
                          <li className="flex gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                            <AlertCircle size={18} className="text-red-500 shrink-0" />
                            <p className="text-xs text-red-800 leading-relaxed">
                              <span className="font-bold">高优先级：</span> 建议复查肠镜，Mayo内镜评分缺失可能掩盖深层炎症。
                            </p>
                          </li>
                          <li className="flex gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                            <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                            <p className="text-xs text-indigo-800 leading-relaxed">
                              <span className="font-bold">中优先级：</span> 调整美沙拉嗪剂量，监测CRP变化。
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-4">

                    <button 
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingPDF}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                      <Download size={18} /> {isGeneratingPDF ? '生成中...' : '导出 PDF 报告'}
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      <Save size={18} /> 保存记录
                    </button>
                    <button 
                      onClick={() => setShowFollowUp(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      <Calendar size={18} /> 加入随访
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200"
                >
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                    <Activity size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">等待评估数据</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">请在左侧面板输入刻下症并完善患者指标，点击“开始风险评估”查看分析结果。</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Hidden Report Template for PDF Generation */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}>
        <ReportTemplate ref={reportRef} patientData={patientData} analysis={analysis} />
      </div>

      {/* --- Data Import Modal --- */}
      <AnimatePresence>
        {showImport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Download className="text-indigo-600 rotate-180" /> 数据批量导入
                </h2>
                <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={32} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">点击或拖拽文件上传</p>
                  <p className="text-xs text-slate-400 mt-1">支持 JSON 或 CSV 格式</p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">导入说明</h4>
                  <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                    <li>JSON 格式：支持单患者完整数据导入</li>
                    <li>CSV 格式：支持批量患者基础指标导入</li>
                    <li>缺失字段将高亮提示，不会自动填充为 0</li>
                  </ul>
                </div>

                <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  确认导入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Follow-up Plan Modal --- */}
      <AnimatePresence>
        {showFollowUp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Calendar className="text-emerald-600" /> 随访计划管理
                </h2>
                <button onClick={() => setShowFollowUp(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">建议下次随访时间</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {(() => {
                        const days = analysis?.riskLevel === 'high' ? 7 : analysis?.riskLevel === 'medium' ? 14 : 28;
                        const date = new Date();
                        date.setDate(date.getDate() + days);
                        return `${date.toISOString().split('T')[0]} (${days / 7}周后)`;
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">风险等级</p>
                    <p className={`text-sm font-bold uppercase ${
                      analysis?.riskLevel === 'high' ? 'text-red-600' : 
                      analysis?.riskLevel === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {analysis?.riskLevel === 'high' ? '高风险' : 
                       analysis?.riskLevel === 'medium' ? '中风险' : 
                       analysis?.riskLevel === 'low' ? '低风险' : '未知'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">干预措施</h4>
                  <div className="space-y-2">
                    {(analysis?.riskLevel === 'high' ? [
                      { item: '复查肠镜', priority: 'high' },
                      { item: '调整治疗方案 (如升级生物制剂)', priority: 'high' },
                      { item: '密切监测 CRP/ESR (每周)', priority: 'medium' }
                    ] : analysis?.riskLevel === 'medium' ? [
                      { item: '监测 CRP/ESR (每两周)', priority: 'medium' },
                      { item: '调整美沙拉嗪剂量', priority: 'medium' },
                      { item: '中医辨证调理', priority: 'low' }
                    ] : [
                      { item: '维持当前治疗方案', priority: 'low' },
                      { item: '常规随访 (每月)', priority: 'low' },
                      { item: '生活方式干预', priority: 'low' }
                    ]).map((task, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-slate-700">{task.item}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                          task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
                    修改日期
                  </button>
                  <button 
                    onClick={async () => {
                      if (!user || !analysis) {
                        alert("请先登录并完成评估");
                        return;
                      }
                      try {
                        const days = analysis.riskLevel === 'high' ? 7 : analysis.riskLevel === 'medium' ? 14 : 28;
                        const nextVisitDate = new Date();
                        nextVisitDate.setDate(nextVisitDate.getDate() + days);
                        
                        await addDoc(collection(db, 'followUps'), {
                          userId: user.uid,
                          patientName: patientData.name,
                          riskLevel: analysis.riskLevel,
                          nextVisitDate: nextVisitDate.toISOString(),
                          createdAt: serverTimestamp()
                        });
                        alert("随访计划已成功保存！");
                        setShowFollowUp(false);
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'followUps');
                      }
                    }}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    确认计划
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showKB && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <BookOpen className="text-indigo-600" /> UC 中医知识库
                </h2>
                <button onClick={() => setShowKB(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8">
                {TCM_KNOWLEDGE_BASE.map(syndrome => (
                  <div key={syndrome.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4">{syndrome.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">主症判据</h4>
                          <ul className="space-y-1">
                            {syndrome.diagnostic_criteria.primary_symptoms.map(s => (
                              <li key={s.id} className="text-sm text-slate-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" /> {s.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">舌脉标准</h4>
                          <p className="text-sm text-slate-700">舌：{syndrome.diagnostic_criteria.tongue.color.join('/')}，{syndrome.diagnostic_criteria.tongue.coating.join('/')}</p>
                          <p className="text-sm text-slate-700">脉：{syndrome.diagnostic_criteria.pulse.join('/')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold text-indigo-600 uppercase mb-1">治法</h4>
                          <p className="text-sm font-bold">{syndrome.treatment.principle}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold text-indigo-600 uppercase mb-1">参考方剂</h4>
                          <p className="text-sm font-bold">{syndrome.treatment.formula}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Patient Management Modal --- */}
      <AnimatePresence>
        {showPatients && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Users className="text-indigo-600" /> 患者管理与历史记录
                </h2>
                <button onClick={() => setShowPatients(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto">
                {!user ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">请先登录以查看历史记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500 font-medium">共发现 {filteredRecords.length} 条评估记录</p>
                        <div className="relative">
                          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="搜索姓名、证候或日期..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-48"
                          />
                        </div>
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
                          <select 
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as any)}
                            className="text-xs bg-transparent outline-none text-slate-600 cursor-pointer px-1"
                          >
                            <option value="date">按日期排序</option>
                            <option value="name">按姓名排序</option>
                            <option value="score">按风险评分排序</option>
                          </select>
                          <div className="w-px h-4 bg-slate-200 mx-1"></div>
                          <button 
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                            title={sortDirection === 'asc' ? '升序' : '降序'}
                          >
                            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const q = query(collection(db, 'assessments'), where('userId', '==', user.uid));
                          const snap = await getDocs(q);
                          setSavedRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        }}
                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        <History size={14} /> 刷新列表
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {filteredRecords && filteredRecords.length > 0 ? filteredRecords.map((record: any) => (
                        <div key={record.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-colors">
                          <div>
                            <p className="font-bold text-slate-900">{record.patientName}</p>
                            <p className="text-xs text-slate-500">{record.createdAt?.toDate().toLocaleString()} • {record.analysis?.tcmAnalysis?.pattern || '暂无证候'}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-bold text-indigo-600">{record.analysis.riskScore} 分</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400">{record.analysis.riskLevel}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setPatientData(record.patientData);
                                setAnalysis(record.analysis);
                                setActiveTab('result');
                                setShowPatients(false);
                              }}
                              className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          未找到匹配的患者记录
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Feedback Modal --- */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <MessageSquare className="text-indigo-600" /> 意见反馈
                </h2>
                <button onClick={() => setShowFeedback(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleFeedbackSubmit} className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">反馈类型</label>
                  <select 
                    value={feedbackData.type}
                    onChange={(e) => setFeedbackData({ ...feedbackData, type: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="bug">问题反馈 (Bug)</option>
                    <option value="suggestion">功能建议 (Suggestion)</option>
                    <option value="other">其他 (Other)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">反馈内容</label>
                  <textarea 
                    required
                    value={feedbackData.content}
                    onChange={(e) => setFeedbackData({ ...feedbackData, content: e.target.value })}
                    placeholder="请详细描述您遇到的问题或建议..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">联系方式 (可选)</label>
                  <input 
                    type="text"
                    value={feedbackData.contact}
                    onChange={(e) => setFeedbackData({ ...feedbackData, contact: e.target.value })}
                    placeholder="邮箱或手机号"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {submittingFeedback ? '提交中...' : '提交反馈'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Floating Feedback Button --- */}
      <button 
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
        title="意见反馈"
      >
        <MessageSquare size={24} />
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          意见反馈
        </span>
      </button>
    </div>
  );
}
