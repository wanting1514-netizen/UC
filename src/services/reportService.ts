import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDFReport = (patientData: any, analysis: any) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.text("UC Recurrence Risk Assessment Report", 105, 20, { align: "center" });
  
  // Patient Info
  doc.setFontSize(12);
  doc.text(`Patient: ${patientData.name}`, 20, 40);
  doc.text(`Age: ${patientData.age}`, 80, 40);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 40);
  
  doc.line(20, 45, 190, 45);
  
  // Risk Score
  doc.setFontSize(16);
  doc.text("1. Risk Assessment", 20, 55);
  doc.setFontSize(12);
  doc.text(`Overall Risk Score: ${analysis.riskScore}/100`, 30, 65);
  doc.text(`Risk Level: ${analysis.riskLevel.toUpperCase()}`, 30, 72);
  
  // TCM Analysis
  doc.setFontSize(16);
  doc.text("2. TCM Differentiation", 20, 85);
  doc.setFontSize(12);
  doc.text(`Pattern: ${analysis.tcmAnalysis.pattern}`, 30, 95);
  doc.text(`Principle: ${analysis.tcmAnalysis.treatment_principle}`, 30, 102);
  doc.text(`Suggested Formula: ${analysis.tcmAnalysis.suggested_formula}`, 30, 109);
  
  // Clinical Recommendations
  doc.setFontSize(16);
  doc.text("3. Clinical Recommendations", 20, 125);
  doc.setFontSize(12);
  const recommendations = [
    ["Priority", "Action"],
    ["High", "Review endoscopy if Mayo score > 6"],
    ["Medium", "Monitor CRP/ESR weekly"],
    ["Low", "Maintain current medication"]
  ];
  
  autoTable(doc, {
    startY: 130,
    head: [recommendations[0]],
    body: recommendations.slice(1),
    margin: { left: 30 }
  });
  
  // Disclaimer
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text("Disclaimer: This report is AI-assisted and for clinical reference only.", 105, 280, { align: "center" });
  
  doc.save(`UC_Report_${patientData.name}_${Date.now()}.pdf`);
};
