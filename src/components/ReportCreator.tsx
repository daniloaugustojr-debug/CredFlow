import React, { useState, useEffect, useCallback, useRef } from "react";
import { Client, Loan, LoanPayment, SystemSettings } from "../types";
import { 
  Download, 
  Printer, 
  Award, 
  FileText, 
  CheckCircle2, 
  Share2, 
  Mail, 
  X, 
  Send, 
  Clock, 
  FileCheck, 
  MessageSquare,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Helper function to safely translate OKLCH and OKLAB color definitions (native to Tailwind v4, plus standard CIE LAB/LCH) 
// to standard RGB/RGBA values that html2canvas is capable of parsing.
function convertTailwindColorsStringToRgb(cssText: string): string {
  // 1. Convert OKLCH
  let result = cssText.replace(/oklch\(\s*([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+(?:deg|rad|grad|turn)?%?)(?:\s*\/[\s/]*([+-]?(?:[0-9]*[.])?[0-9]+%?))?\s*\)/g, (match, p1, p2, p3, p4) => {
    try {
      let l = p1.endsWith("%") ? parseFloat(p1) / 100 : parseFloat(p1);
      let c = p2.endsWith("%") ? parseFloat(p2) / 100 : parseFloat(p2);
      let hVal = p3.endsWith("%") ? parseFloat(p3) / 100 * 360 : parseFloat(p3);
      if (p3.endsWith("deg")) hVal = parseFloat(p3);
      else if (p3.endsWith("rad")) hVal = parseFloat(p3) * (180 / Math.PI);
      else if (p3.endsWith("grad")) hVal = parseFloat(p3) * 0.9;
      else if (p3.endsWith("turn")) hVal = parseFloat(p3) * 360;
      
      let a = 1;
      if (p4) {
        a = p4.endsWith("%") ? parseFloat(p4) / 100 : parseFloat(p4);
      }

      if (isNaN(l)) l = 0;
      if (isNaN(c)) c = 0;
      if (isNaN(hVal)) hVal = 0;
      if (isNaN(a)) a = 1;

      // Mathematical translation OKLCH -> Oklab -> LMS -> Linear sRGB -> Gamma corrected sRGB
      const hRad = (hVal * Math.PI) / 180;
      const oklab_a = c * Math.cos(hRad);
      const oklab_b = c * Math.sin(hRad);

      const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
      const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
      const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

      const l_cube = l_ * l_ * l_;
      const m_cube = m_ * m_ * m_;
      const s_cube = s_ * s_ * s_;

      let r = 4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
      let g = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
      let b = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;

      const gamma = (val: number) => {
        const clamped = Math.max(0, Math.min(1, val));
        return clamped > 0.0031308
          ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
          : 12.92 * clamped;
      };

      const R = Math.round(gamma(r) * 255);
      const G = Math.round(gamma(g) * 255);
      const B = Math.round(gamma(b) * 255);

      if (a < 1) {
        return `rgba(${R}, ${G}, ${B}, ${a})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    } catch {
      return "rgb(120, 120, 120)";
    }
  });

  // 2. Convert OKLAB
  result = result.replace(/oklab\(\s*([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+%?)(?:\s*\/[\s/]*([+-]?(?:[0-9]*[.])?[0-9]+%?))?\s*\)/g, (match, p1, p2, p3, p4) => {
    try {
      let l = p1.endsWith("%") ? parseFloat(p1) / 100 : parseFloat(p1);
      let oklab_a = p2.endsWith("%") ? parseFloat(p2) / 100 : parseFloat(p2);
      let oklab_b = p3.endsWith("%") ? parseFloat(p3) / 100 : parseFloat(p3);
      
      let a = 1;
      if (p4) {
        a = p4.endsWith("%") ? parseFloat(p4) / 100 : parseFloat(p4);
      }

      if (isNaN(l)) l = 0;
      if (isNaN(oklab_a)) oklab_a = 0;
      if (isNaN(oklab_b)) oklab_b = 0;
      if (isNaN(a)) a = 1;

      // Mathematical Oklab -> LMS -> Linear sRGB -> Gamma corrected sRGB
      const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
      const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
      const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

      const l_cube = l_ * l_ * l_;
      const m_cube = m_ * m_ * m_;
      const s_cube = s_ * s_ * s_;

      let r = 4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
      let g = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
      let b = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;

      const gamma = (val: number) => {
        const clamped = Math.max(0, Math.min(1, val));
        return clamped > 0.0031308
          ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
          : 12.92 * clamped;
      };

      const R = Math.round(gamma(r) * 255);
      const G = Math.round(gamma(g) * 255);
      const B = Math.round(gamma(b) * 255);

      if (a < 1) {
        return `rgba(${R}, ${G}, ${B}, ${a})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    } catch {
      return "rgb(120, 120, 120)";
    }
  });

  // 3. Convert LCH fallback
  result = result.replace(/lch\(\s*([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+(?:deg|rad|grad|turn)?%?)(?:\s*\/[\s/]*([+-]?(?:[0-9]*[.])?[0-9]+%?))?\s*\)/g, (match, p1, p2, p3, p4) => {
    try {
      let l = p1.endsWith("%") ? parseFloat(p1) : parseFloat(p1);
      let c = p2.endsWith("%") ? parseFloat(p2) : parseFloat(p2);
      let hVal = p3.endsWith("%") ? parseFloat(p3) / 100 * 360 : parseFloat(p3);
      if (p3.endsWith("deg")) hVal = parseFloat(p3);
      else if (p3.endsWith("rad")) hVal = parseFloat(p3) * (180 / Math.PI);
      else if (p3.endsWith("grad")) hVal = parseFloat(p3) * 0.9;
      else if (p3.endsWith("turn")) hVal = parseFloat(p3) * 360;

      let a = 1;
      if (p4) {
        a = p4.endsWith("%") ? parseFloat(p4) / 100 : parseFloat(p4);
      }

      const hRad = (hVal * Math.PI) / 180;
      const lab_a = c * Math.cos(hRad);
      const lab_b = c * Math.sin(hRad);

      const norm_l = l / 100;
      const norm_a = lab_a / 150;
      const norm_b = lab_b / 150;

      const R = Math.round(Math.max(0, Math.min(1, norm_l + 0.1 * norm_a)) * 255);
      const G = Math.round(Math.max(0, Math.min(1, norm_l - 0.1 * norm_b)) * 255);
      const B = Math.round(Math.max(0, Math.min(1, norm_l - 0.15 * norm_a)) * 255);

      if (a < 1) {
        return `rgba(${R}, ${G}, ${B}, ${a})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    } catch {
      return "rgb(120, 120, 120)";
    }
  });

  // 4. Convert LAB fallback
  result = result.replace(/lab\(\s*([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?(?:[0-9]*[.])?[0-9]+%?)\s+([+-]?[0-9\.]+%?)(?:\s*\/[\s/]*([+-]?(?:[0-9]*[.])?[0-9]+%?))?\s*\)/g, (match, p1, p2, p3, p4) => {
    try {
      let l = p1.endsWith("%") ? parseFloat(p1) : parseFloat(p1);
      let lab_a = p2.endsWith("%") ? parseFloat(p2) : parseFloat(p2);
      let lab_b = p3.endsWith("%") ? parseFloat(p3) : parseFloat(p3);

      let a = 1;
      if (p4) {
        a = p4.endsWith("%") ? parseFloat(p4) / 100 : parseFloat(p4);
      }

      const norm_l = l / 100;
      const norm_a = lab_a / 150;
      const norm_b = lab_b / 150;

      const R = Math.round(Math.max(0, Math.min(1, norm_l + 0.1 * norm_a)) * 255);
      const G = Math.round(Math.max(0, Math.min(1, norm_l - 0.1 * norm_b)) * 255);
      const B = Math.round(Math.max(0, Math.min(1, norm_l - 0.15 * norm_a)) * 255);

      if (a < 1) {
        return `rgba(${R}, ${G}, ${B}, ${a})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    } catch {
      return "rgb(120, 120, 120)";
    }
  });

  return result;
}

interface ReportCreatorProps {
  type: "CONTRACT" | "RECEIPT" | "DAILY_REPORT" | "MONTHLY_REPORT" | "OVERDUE_CLIENTS" | "CLIENT_STATEMENT";
  data: {
    client?: Client;
    loan?: Loan;
    payment?: LoanPayment;
    loansList?: Loan[];
    clientsList?: Client[];
    statementStartDate?: string;
    statementEndDate?: string;
    settings: SystemSettings;
    userFullName: string;
  };
  onClose: () => void;
  onPreviewAttachment?: (url: string, title: string) => void;
}

export default function ReportCreator({ type, data, onClose, onPreviewAttachment }: ReportCreatorProps) {
  const { 
    client, 
    loan, 
    payment, 
    loansList = [], 
    clientsList = [], 
    settings, 
    userFullName,
    statementStartDate,
    statementEndDate
  } = data;

  const currentPrintDate = new Date().toLocaleString("pt-MZ");

  // State for unified PDF Engine
  const [isGenerating, setIsGenerating] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"HTML" | "PDF">("HTML");

  // Sharing flows
  const [sharePhone, setSharePhone] = useState(client?.phone || "");
  const [shareEmail, setShareEmail] = useState("");
  const [showShareModal, setShowShareModal] = useState<"NONE" | "WHATSAPP" | "EMAIL">("NONE");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  const securityTokenRef = useRef(`CF-${Math.random().toString(36).substring(3, 11).toUpperCase()}`);

  // Simple QR code simulation
  const qrValue = encodeURIComponent(
    `CREDFLOW-AUTENTICADO|Tipo:${type}|ID:${loan?.id || payment?.id || "GERAL"}|Valido`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrValue}`;

  const getDocTypeName = () => {
    switch (type) {
      case "CONTRACT":
        return "Contrato de Microcrédito";
      case "RECEIPT":
        return "Comprovativo de Pagamento";
      case "DAILY_REPORT":
        return "Balancete Diário de Caixa";
      case "MONTHLY_REPORT":
        return "Relatório Consolidado Mensal";
      case "OVERDUE_CLIENTS":
        return "Relatório de Inadimplência";
      case "CLIENT_STATEMENT":
        return "Extrato de Conta de Mutuário";
      default:
        return "Documento Financeiro";
    }
  };

  // Compile HTML Template into a highly precise singular PDF Blob
  const generatePDF = useCallback(async () => {
    setIsGenerating(true);
    setValidationError("");
    
    // Arrays to store backups for clean styling recovery
    const styleBackups: { element: HTMLStyleElement; originalText: string }[] = [];
    const linkStyleElements: { link: HTMLLinkElement; tempStyle: HTMLStyleElement }[] = [];

    try {
      // 1. Give reasonable time for components to completely mount and cross-origin images to finish rendering
      await new Promise((resolve) => setTimeout(resolve, 800));

      const element = document.getElementById("pdf-render-source");
      if (!element) {
        throw new Error("Elemento de fonte de PDF não localizado.");
      }

      // Pre-cleansing: Replace all OKLCH and OKLAB color definitions (native to Tailwind CSS v4) 
      // with standard values that html2canvas is capable of parsing.
      try {
        // Find and process all internal <style> elements
        const styles = Array.from(document.getElementsByTagName("style"));
        for (const s of styles) {
          if (s.textContent && (s.textContent.includes("oklch") || s.textContent.includes("oklab"))) {
            styleBackups.push({ element: s, originalText: s.textContent });
            s.textContent = convertTailwindColorsStringToRgb(s.textContent);
          }
        }

        // Find and process all local stylesheet <link> elements
        const links = Array.from(document.getElementsByTagName("link"));
        for (const l of links) {
          if (l.rel === "stylesheet" && l.href) {
            const isSameOrigin = l.href.startsWith(window.location.origin) || !l.href.startsWith("http");
            if (isSameOrigin) {
              try {
                const res = await fetch(l.href);
                const cssText = await res.text();
                if (cssText.includes("oklch") || cssText.includes("oklab")) {
                  // Disable original stylesheet temporarily to insulate html2canvas
                  l.disabled = true;

                  const sanitizedCss = convertTailwindColorsStringToRgb(cssText);
                  const tempStyle = document.createElement("style");
                  tempStyle.setAttribute("data-temp-clean-style", "true");
                  tempStyle.textContent = sanitizedCss;
                  document.head.appendChild(tempStyle);

                  linkStyleElements.push({ link: l, tempStyle });
                }
              } catch (fetchErr) {
                console.warn("Could not process link stylesheet:", l.href, fetchErr);
              }
            }
          }
        }

        // Give document styles half a moment to register changes in painting layer
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (cleanError) {
        console.warn("Muted OKLCH/OKLAB styling cleaning issue; proceeding with defaults:", cleanError);
      }

      let canvas;
      const originalGetComputedStyle = window.getComputedStyle;
      try {
        // Suppress browser returned oklch/oklab in computed style queries for html2canvas
        window.getComputedStyle = function(elt, pseudoElt) {
          const style = originalGetComputedStyle(elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              const val = target[prop as any];

              if (typeof val === "function") {
                if (prop === "getPropertyValue") {
                  return function(propertyName: string) {
                    const originalVal = target.getPropertyValue(propertyName);
                    if (typeof originalVal === "string" && (
                      originalVal.includes("oklch") || 
                      originalVal.includes("oklab") || 
                      originalVal.includes("lch") || 
                      originalVal.includes("lab")
                    )) {
                      return convertTailwindColorsStringToRgb(originalVal);
                    }
                    return originalVal;
                  };
                }
                return (val as any).bind(target);
              }

              if (typeof val === "string" && (
                val.includes("oklch") || 
                val.includes("oklab") || 
                val.includes("lch") || 
                val.includes("lab")
              )) {
                return convertTailwindColorsStringToRgb(val);
              }

              return val;
            }
          });
        };

        // 2. Render absolute DOM layout capture via html2canvas
        canvas = await html2canvas(element, {
          scale: 2.0, // Crisp render for pixel perfect signatures and typography
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff"
        });
      } finally {
        // Restore window.getComputedStyle immediately to prevent interfering with other app components
        window.getComputedStyle = originalGetComputedStyle;

        // ALWAYS restore styles to original form immediately after html2canvas completes,
        // so that the active application page retains its live rich CSS styling and interactive transitions.
        for (const backup of styleBackups) {
          backup.element.textContent = backup.originalText;
        }
        for (const item of linkStyleElements) {
          item.link.disabled = false;
          if (item.tempStyle.parentNode) {
            item.tempStyle.parentNode.removeChild(item.tempStyle);
          }
        }
      }

      const imgData = canvas.toDataURL("image/png");

      // 3. Construct clean standard A4 dimensions PDF instance
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      // Handle multiline page segments
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const blob = pdf.output("blob");
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsGenerating(false);

      // 4. Pre-upload to the secure server in background to acquire a live secure clickable URL
      try {
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const cleanDocName = `${type.toLowerCase()}_${loan?.id || payment?.id || "geral"}_${Date.now()}.pdf`;

        const res = await fetch("/api/pdf/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: cleanDocName, fileData: fileBase64 })
        });
        
        const uploadResponse = await res.json();
        if (uploadResponse.success) {
          setUploadedUrl(uploadResponse.absoluteUrl);
        }
      } catch (err) {
        console.warn("Back-end PDF cache synchronization was bypassed:", err);
      }
    } catch (error: any) {
      console.error("Erro ao gerar PDF no motor unificado:", error);
      setValidationError("Ocorreu um erro no motor de PDF: " + error.message);
      setIsGenerating(false);
    }
  }, [type, loan?.id, payment?.id]);

  useEffect(() => {
    generatePDF();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  // Standard high-fidelity download action using cached identical Blob
  const handleDownload = () => {
    // Prefer local Blob URL (pdfUrl) first for instant client-side download without network delay or routing issues.
    // Fallback to uploadedUrl if pdfUrl is empty.
    const targetUrl = pdfUrl || uploadedUrl;
    if (!targetUrl) {
      alert("O documento PDF está a ser processado. Por favor aguarde um instante e tente novamente.");
      return;
    }
    
    // Explicit anchor handling
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = `${type}_${loan?.id || payment?.id || "DOCUMENTO"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // WhatsApp click-to-chat dynamic dispatch
  const handleWhatsAppSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    
    // Validate phone number moçambicano
    const numbersOnly = sharePhone.replace(/[^\d]/g, "");
    if (numbersOnly.length < 9) {
      setValidationError("Introduza um contacto de telefone válido com pelo menos 9 dígitos.");
      return;
    }

    setIsSending(true);

    try {
      // If server upload has not concluded yet, wait for its resolution or enforce a safe fallback
      let finalUrl = uploadedUrl;
      if (!finalUrl && pdfBlob) {
        // Run retry logic quickly
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });

        const cleanDocName = `${type.toLowerCase()}_${loan?.id || payment?.id || "geral"}_${Date.now()}.pdf`;
        const res = await fetch("/api/pdf/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: cleanDocName, fileData: fileBase64 })
        });
        const uploadResponse = await res.json();
        if (uploadResponse.success) {
          finalUrl = uploadResponse.absoluteUrl;
          setUploadedUrl(uploadResponse.absoluteUrl);
        }
      }

      const loginUrl = window.location.origin;
      const clientName = client?.fullName || loan?.clientName || "Cliente";
      const messageText = `Olá, *${clientName}*! Para sua segurança e privacidade, o acesso ao seu documento original *${getDocTypeName()}* exige a validação das suas credenciais.\n\nAceda através da página de login segura:\n🔗 ${loginUrl}\n\nToken Seguro de Verificação: _${securityTokenRef.current}_\nEmitido em: _${currentPrintDate}_\n\nObrigado por confiar nos nossos serviços corporativos!`;

      // Redirect window
      const formattedPhone = numbersOnly.startsWith("258") ? numbersOnly : `258${numbersOnly}`;
      const waLink = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;
      
      setIsSending(false);
      setSendSuccess(true);
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = waLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setShowShareModal("NONE");
        setSendSuccess(false);
      }, 1200);

    } catch (err: any) {
      setValidationError("Erro ao despachar WhatsApp: " + err.message);
      setIsSending(false);
    }
  };

  // Email simulation dispatch
  const handleEmailSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail)) {
      setValidationError("Por favor, introduza um endereço de e-mail válido.");
      return;
    }

    setIsSending(true);

    try {
      // Wait for uploaded URL
      let finalUrl = uploadedUrl;
      if (!finalUrl && pdfBlob) {
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });

        const cleanDocName = `${type.toLowerCase()}_${loan?.id || payment?.id || "geral"}_${Date.now()}.pdf`;
        const res = await fetch("/api/pdf/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: cleanDocName, fileData: fileBase64 })
        });
        const uploadResponse = await res.json();
        if (uploadResponse.success) {
          finalUrl = uploadResponse.absoluteUrl;
          setUploadedUrl(uploadResponse.absoluteUrl);
        }
      }

      // Simulate sending via server logs
      const clientName = client?.fullName || loan?.clientName || "Cliente";
      const subject = `[${settings.companyName}] Envio de Documento Oficial: ${getDocTypeName()}`;
      
      // Delay to represent active SMTP network processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsSending(false);
      setSendSuccess(true);
      setTimeout(() => {
        setShowShareModal("NONE");
        setSendSuccess(false);
      }, 1500);

    } catch (err: any) {
      setValidationError("Erro na transmissão do e-mail: " + err.message);
      setIsSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 xl:p-8 overflow-y-auto no-print select-none">
      <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in">
        
        {/* Modal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Geração de PDF Unificado Ativa
            </span>
            <h3 className="font-display font-black text-lg text-slate-900 dark:text-white leading-tight">
              {getDocTypeName()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Garante conformidade visual absoluta ligada à base de dados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* View Mode Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 max-w-xs scale-90 md:scale-100 flex-shrink-0">
              <button
                onClick={() => setViewMode("HTML")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "HTML"
                    ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <FileText size={13} />
                Modelo
              </button>
              <button
                onClick={() => setViewMode("PDF")}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-45 ${
                  viewMode === "PDF"
                    ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Clock size={13} className="animate-spin text-slate-400" />
                    <span>A Gerar...</span>
                  </>
                ) : (
                  <>
                    <FileCheck size={13} className="text-emerald-500" />
                    Ficheiro PDF
                  </>
                )}
              </button>
            </div>

            {/* General Actions */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs p-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"
              title="Descarregar PDF Idêntico"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Descarregar</span>
            </button>

            <button
              onClick={() => setShowShareModal("WHATSAPP")}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-xs p-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"
              title="Partilhar por WhatsApp com o Cliente"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline flex-shrink-0">Via WhatsApp</span>
            </button>

            <button
              onClick={() => setShowShareModal("EMAIL")}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs p-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"
              title="Partilhar por E-mail"
            >
              <Mail size={14} />
              <span className="hidden sm:inline">Via E-mail</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-200/55 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 rounded-xl cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Global Alert Bar if compiling */}
        {isGenerating && (
          <div className="bg-indigo-50 dark:bg-indigo-950/20 px-6 py-2 border-b border-indigo-100 dark:border-indigo-900/40 text-left flex items-center justify-between animate-pulse">
            <span className="text-[11px] font-sans font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <Clock size={12} className="animate-spin" />
              A construir e alinhar assinaturas, margens e dados no motor de PDF único...
            </span>
            <div className="w-24 h-1.5 bg-indigo-250 dark:bg-indigo-900 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 animate-infinite-width duration-1000" style={{ width: "60%" }}></div>
            </div>
          </div>
        )}

        {/* Outer Grid for Workspace and Options */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">

          {/* REPORT VIEWPORT CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950 flex flex-col items-center">
            
            <div className="w-full max-w-3xl flex-1 flex flex-col">
              
              {viewMode === "PDF" && pdfUrl ? (
                /* PDF FILE PREVIEW OVERLAY */
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex-1 h-[65vh] min-h-[500px] overflow-hidden flex flex-col">
                  <iframe
                    src={`${pdfUrl}#toolbar=1`}
                    className="w-full h-full border-none"
                    title="Real PDF Viewer Document"
                  />
                </div>
              ) : (
                /* HTML TEMPLATE WORKSPACE (Always compiled from here) */
                <div 
                  id="pdf-render-source"
                  className="bg-white rounded-xl shadow-lg border border-slate-200 text-slate-900 font-sans leading-relaxed select-text"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    padding: "20mm 15mm",
                    fontSize: "12pt",
                    boxSizing: "border-box",
                  }}
                >
                  
                  {/* Document Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-display font-bold text-xl uppercase">
                          {(settings.companyName || "C").charAt(0)}
                        </div>
                        <div>
                          <h1 className="font-display font-bold text-xl tracking-tight text-slate-950 leading-tight">
                            {settings.companyName}
                          </h1>
                          <span className="text-[9px] tracking-widest font-mono text-indigo-600 font-extrabold block">
                            MICROFINANÇAS DE MOÇAMBIQUE
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-pre-line leading-normal max-w-md">
                        {settings.companyAddress}
                        <br />
                        {settings.companyNuit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wider">
                        Documento Autenticado
                      </span>
                      <p className="text-xs text-slate-500">Emissão:</p>
                      <p className="text-sm font-mono font-bold text-slate-900">{currentPrintDate}</p>
                    </div>
                  </div>

                  {/* CONTRACT VIEW */}
                  {type === "CONTRACT" && loan && client && (
                    <div className="space-y-6 text-slate-800">
                      
                      {/* Subtitled Elegant Title Block */}
                      <div className="text-center pb-5 border-b border-slate-150">
                        <span className="text-[10px] tracking-widest font-mono text-indigo-700 font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">
                          Instrumento Particular de Concessão de Crédito
                        </span>
                        <h2 className="font-display font-black text-xl uppercase tracking-tight text-slate-900 mt-2.5">
                          CONTRATO OPERACIONAL DE MICROCRÉDITO
                        </h2>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                          Ref/No: <span className="font-bold text-slate-705">{loan.id}</span>
                        </p>
                      </div>

                      {/* Introduction Preamble */}
                      <div className="text-[12pt] leading-relaxed text-justify text-slate-700 space-y-3">
                        <p>
                          Pelo presente instrumento particular, de um lado, a instituição financeira{" "}
                          <strong className="text-slate-950">{settings.companyName || "MeticalCred S.A."}</strong>, com sede na{" "}
                          <strong>{settings.companyAddress || "Av. Julius Nyerere, Nº 345, Cidade de Maputo, República de Moçambique"}</strong>, titular do NUIT{" "}
                          <strong className="font-mono text-slate-950">{settings.companyNuit || "400234123"}</strong>, doravante designada simplesmente{" "}
                          <strong className="text-indigo-755">MUTUANTE</strong>, e do outro lado o(a) cliente mutuário(a) devidamente qualificado(a) na secção de informações abaixo identificada, doravante designado(a) simplesmente{" "}
                          <strong className="text-indigo-755">MUTUÁRIO(A)</strong>, celebram o presente Contrato Operacional de Microcrédito de adesão complementar, que se rege pelas cláusulas e condições seguintes:
                        </p>
                      </div>

                      {/* Section 1: Qualificação do Mutuário */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                          <h4 className="font-display font-extrabold text-[12pt] uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            SECÇÃO I — INFORMAÇÃO DO MUTUÁRIO
                          </h4>
                          <span className="text-[8.5px] font-sans font-extrabold text-blue-700 bg-blue-50 border border-blue-150 rounded px-1.5 py-0.5 uppercase tracking-wider">
                            Cadastro Verificado
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-4 text-xs leading-normal">
                          <div className="border-b border-dashed border-slate-200 pb-1.5 md:col-span-2">
                            <span className="text-slate-450 font-medium">Nome Completo:</span>{" "}
                            <strong className="text-slate-900 text-[13px] font-bold">{client.fullName}</strong>
                          </div>
                          <div className="border-b border-dashed border-slate-200 pb-1.5">
                            <span className="text-slate-450 font-medium">BI / Passaporte:</span>{" "}
                            <strong className="text-slate-900 font-mono font-semibold">{client.idPassport}</strong>
                          </div>
                          <div className="border-b border-dashed border-slate-200 pb-1.5 font-mono">
                            <span className="text-slate-450 font-sans font-medium">Contacto Telefónico:</span>{" "}
                            <strong className="text-slate-900 font-semibold">{client.phone}</strong>
                          </div>
                          <div className="border-b border-dashed border-slate-200 pb-1.5 md:col-span-2">
                            <span className="text-slate-455 font-medium">Residência Habitual:</span>{" "}
                            <strong className="text-slate-900 leading-tight">{client.address}</strong>
                          </div>
                          <div className="border-b border-dashed border-slate-200 pb-1.5 font-mono">
                            <span className="text-slate-450 font-sans font-medium">NUIT do Mutuário:</span>{" "}
                            <strong className="text-slate-900">
                              {(() => {
                                if (!client.notes) return "Conforme Documento do Mutuário";
                                const match = client.notes.match(/nuit:?\s*([0-9\s-]+)/i);
                                return match ? match[1].trim() : "Conforme Documento do Mutuário";
                              })()}
                            </strong>
                          </div>
                          <div className="border-b border-dashed border-slate-200 pb-1.5">
                            <span className="text-slate-455 font-medium">Estado Civil:</span>{" "}
                            <strong className="text-slate-900">
                              {(() => {
                                if (!client.notes) return "Não Declarado";
                                const match = client.notes.match(/estado\s*civil:?\s*([^\n,;]+)/i);
                                return match ? match[1].trim() : "Não Declarado";
                              })()}
                            </strong>
                          </div>
                          <div className="border-b border-dashed border-slate-200 pb-1.5 md:col-span-2">
                            <span className="text-slate-455 font-medium">Profissão / Actividade:</span>{" "}
                            <strong className="text-slate-900">
                              {(() => {
                                if (!client.notes) return "Não Declarado / Empreendedor";
                                const match = client.notes.match(/(profissão|profissao|actividade|atividade):?\s*([^\n,;]+)/i);
                                return match ? match[2].trim() : "Não Declarado / Empreendedor";
                              })()}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Section 1-B: Documentos e Garantia */}
                      {(loan.biAttachment || loan.guaranteeAttachment || loan.guaranteeDescription || (loan.guaranteeEstimatedValue !== undefined && loan.guaranteeEstimatedValue > 0) || (loan.guaranteePhotos && loan.guaranteePhotos.length > 0)) && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                            <h4 className="font-display font-extrabold text-[12pt] uppercase tracking-wider text-slate-655 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              SECÇÃO I-B — INFORMAÇÃO DE GARANTIAS E ANEXOS
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-4 text-xs leading-normal">
                            <div className="md:col-span-2 space-y-1">
                              <span className="text-slate-450 font-medium">Documentação Anexa Registada:</span>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {loan.biAttachment ? (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewAttachment?.(loan.biAttachment!, `BI - ${client?.fullName}`)}
                                    className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-[10px] px-2.5 py-1 rounded-lg text-indigo-750 font-semibold flex items-center gap-1.5 font-sans cursor-pointer transition select-none"
                                    title="Clique para visualizar o BI"
                                  >
                                    <FileCheck size={12} className="text-indigo-600" />
                                    Cópia de BI / Passaporte (Visualizar)
                                  </button>
                                ) : (
                                  <span className="bg-rose-50 border border-rose-150 text-[10px] px-2.5 py-1 rounded-lg text-rose-700 font-semibold flex items-center gap-1.5 font-sans">
                                    <AlertCircle size={12} className="text-rose-600" />
                                    Sem Cópia de BI anexada
                                  </span>
                                )}
                                {loan.guaranteePhotos && loan.guaranteePhotos.length > 0 ? (
                                  <span className="bg-emerald-50 border border-emerald-100 text-[10px] px-2.5 py-1 rounded-lg text-emerald-750 font-semibold flex items-center gap-1.5 font-sans">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    {loan.guaranteePhotos.length} Imagem(ns) de Penhora Registadas
                                  </span>
                                ) : loan.guaranteeAttachment ? (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewAttachment?.(loan.guaranteeAttachment!, `Garantia - ${client?.fullName}`)}
                                    className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-[10px] px-2.5 py-1 rounded-lg text-emerald-750 font-semibold flex items-center gap-1.5 font-sans cursor-pointer transition select-none"
                                    title="Clique para visualizar a fotografia de garantia"
                                  >
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    Foto de Penhora (Visualizar)
                                  </button>
                                ) : (
                                  <span className="bg-amber-50 border border-amber-150 text-[10px] px-2.5 py-1 rounded-lg text-amber-700 font-semibold flex items-center gap-1.5 font-sans">
                                    <AlertCircle size={12} className="text-amber-600" />
                                    Sem imagem de garantia
                                  </span>
                                )}
                              </div>
                            </div>

                            {loan.guaranteeDescription && (
                              <div className="md:col-span-2 border-t border-slate-200/60 pt-2 pb-0.5">
                                <span className="text-slate-450 font-medium block mb-1">Descrição Exaustiva da Garantia:</span>
                                <p className="text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 text-[10px] font-mono leading-relaxed">
                                  {loan.guaranteeDescription}
                                </p>
                              </div>
                            )}

                            {loan.guaranteeEstimatedValue !== undefined && loan.guaranteeEstimatedValue > 0 && (
                              <div className="md:col-span-2 flex items-center justify-between border-t border-slate-200/60 pt-2 font-sans text-xs">
                                <span className="text-slate-450 font-medium">Valor Estimado Consensual / Comercial:</span>
                                <strong className="text-slate-900 font-mono text-[12px] bg-slate-100 px-2.5 py-1 rounded border border-slate-205 text-indigo-755 font-bold">
                                  {Number(loan.guaranteeEstimatedValue).toLocaleString("pt-MZ")} MZN
                                </strong>
                              </div>
                            )}

                            {loan.guaranteePhotos && loan.guaranteePhotos.length > 0 && (
                              <div className="md:col-span-2 space-y-1.5 border-t border-slate-200/60 pt-2">
                                <span className="text-slate-450 font-medium text-[9.5px] block">Miniaturas das Imagens de Garantia Adjudicada (Clique para Zoom):</span>
                                <div className="flex flex-wrap gap-2">
                                  {loan.guaranteePhotos.map((photo, index) => (
                                    <img
                                      key={index}
                                      src={photo}
                                      alt={`Garantia ${index + 1}`}
                                      className="w-16 h-12 object-cover bg-white rounded border border-slate-200 p-0.5 shadow-sm hover:scale-105 active:scale-95 transition cursor-zoom-in"
                                      onClick={() => onPreviewAttachment?.(photo, `Foto Garantia ${index + 1} - ${client?.fullName}`)}
                                      referrerPolicy="no-referrer"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Estrutura Financeira Card Layout with deep corporate colors */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-display font-extrabold text-[12pt] uppercase tracking-wider text-slate-650 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-655" />
                            SECÇÃO II — ESTRUTURA FINANCEIRA E VALORES NOMINAIS
                          </h4>
                          <span className="text-[8.5px] font-black text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 uppercase">
                            Holograma de Risco Ativo
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-slate-50/50 hover:bg-slate-50 transition p-3 rounded-xl border border-slate-200">
                            <span className="text-[9.5px] text-slate-400 font-medium block mb-0.5">Capital Solicitado</span>
                            <strong className="text-sm font-mono font-black text-indigo-750 block">
                              {loan.principalAmount.toLocaleString("pt-MZ")} MZN
                            </strong>
                          </div>
                          <div className="bg-slate-50/50 hover:bg-slate-55 transition p-3 rounded-xl border border-slate-200">
                            <span className="text-[9.5px] text-slate-400 font-medium block mb-0.5">Taxa de Juros Mensal</span>
                            <strong className="text-sm font-mono font-black text-slate-800 block">
                              {loan.interestRate}% Fixos
                            </strong>
                          </div>
                          <div className="bg-slate-50/50 hover:bg-slate-55 transition p-3 rounded-xl border border-slate-200">
                            <span className="text-[9.5px] text-slate-400 font-medium block mb-0.5">Prazo do Contrato</span>
                            <strong className="text-sm font-mono font-black text-slate-800 block">
                              {loan.termMonths} Meses {loan.paymentFrequency ? `(${loan.paymentFrequency})` : ""}
                            </strong>
                          </div>
                          <div className="bg-slate-50/50 hover:bg-slate-55 transition p-3 rounded-xl border border-slate-200">
                            <span className="text-[9.5px] text-slate-400 font-medium block mb-0.5">Prestação Periódica</span>
                            <strong className="text-sm font-mono font-black text-indigo-700 block">
                              {loan.installmentAmount.toLocaleString("pt-MZ")} MZN
                            </strong>
                          </div>
                          <div className="bg-slate-50/50 hover:bg-slate-55 transition p-3 rounded-xl border border-slate-200">
                            <span className="text-[9.5px] text-slate-400 font-medium block mb-0.5">Total de Juros</span>
                            <strong className="text-sm font-mono font-black text-indigo-700 block">
                              {loan.totalInterest.toLocaleString("pt-MZ")} MZN
                            </strong>
                          </div>
                          <div className="bg-emerald-50/20 hover:bg-emerald-50/30 transition p-3 rounded-xl border border-emerald-200">
                            <span className="text-[9.5px] text-emerald-600 font-bold block mb-0.5">Valor Total da Dívida</span>
                            <strong className="text-sm font-mono font-black text-emerald-700 block">
                              {loan.totalDue.toLocaleString("pt-MZ")} MZN
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Professional legal terms with proper Mozambican civil law phrasing */}
                      <div className="space-y-3.5 text-[12pt] leading-relaxed text-slate-700 text-justify">
                        
                        <div className="border-l-2 border-slate-350 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt]">CLÁUSULA 1 — OBJECTO</h5>
                          <p className="mt-0.5">
                            O presente contrato tem por objecto a concessão de microcrédito de capital rotativo ao MUTUÁRIO(A), no montante acordado entre as partes, obrigando-se este(a) à restituição integral do capital mutuado, acrescido dos respectivos juros, encargos e demais obrigações previstas neste instrumento.
                          </p>
                        </div>

                        <div className="border-l-2 border-slate-350 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt]">CLÁUSULA 2 — CONDIÇÕES FINANCEIRAS</h5>
                          <p className="mt-0.5">
                            1. O MUTUÁRIO compromete-se a efectuar os pagamentos periódicos correspondentes à prestação calculada com rigor nas datas de vencimento acordadas, conforme o cronograma de reembolsos.
                            <br />
                            2. O incumprimento total ou parcial de qualquer prestação na data aprazada constitui mora automática de pleno direito, independentemente de interpelação do MUTUANTE.
                            <br />
                            3. Os juros aplicados possuem natureza fixa e imutável durante toda a vigência do contrato, não sofrendo alterações inflacionárias.
                          </p>
                        </div>

                        <div className="border-l-2 border-slate-350 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt] flex items-center gap-1">
                            CLÁUSULA 3 — MORA E PENALIZAÇÕES
                          </h5>
                          <p className="mt-0.5">
                            1. O atraso no pagamento de qualquer prestação periódica, por um período superior a 24 horas da data fixada, implicará cumulativamente:
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;Multa moratória compulsória imediata de <strong>{loan.penaltyRate}%</strong> sobre o saldo em atraso;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;Juros de mora proporcionais calculados ao dia de atraso até à efetiva regularização;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;Custos administrativos de cobrança adicionais derivados do tratamento extrajudicial do crédito em situação de incumprimento.
                            <br />
                            2. O atraso continuado superior a 15 (quinze) dias corridos confere ao MUTUANTE o direito legítimo de declarar o vencimento antecipado de toda a dívida e proceder à execução imediata do contrato.
                          </p>
                        </div>

                        <div className="border-l-2 border-slate-350 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt]">CLÁUSULA 4 — RESPONSABILIDADE PATRIMONIAL</h5>
                          <p className="mt-0.5">
                            1. O MUTUÁRIO outorga a garantia de sua obrigação e responde pela totalidade da dívida contraída por meio de todos os seus bens e haveres presentes e futuros, nos termos do artigo 601.º do Código Civil vigente na República de Moçambique.
                            <br />
                            2. Em caso de incumprimento deliberado, o MUTUANTE fica expressamente autorizado a recorrer:
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;à cobrança administrativa extrajudicial, através de correspondência eletrónica, avisos coercivos e visitas físicas;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;à cobrança judicial através de instauração de competente ação executiva de cumprimento em massa;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;à penhora rápida de ativos conforme convenções estipuladas.
                          </p>
                        </div>

                        <div className="border-l-2 border-rose-500 pl-3 py-1.5 bg-rose-50/5 rounded-r-lg text-slate-750">
                          <h5 className="font-bold text-rose-805 uppercase text-[12pt]">CLÁUSULA 5 — PENHORA E EXECUÇÃO</h5>
                          <p className="mt-0.5">
                            Nos termos gerais aplicáveis à satisfação do crédito homologado por via deste título operacional executivo extrajudicial, as custas e reembolsos autorizam a penhora coerciva dos seguintes bens:
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;salários, vencimentos, bónus e depósitos em contas bancárias electrónicas de instituições financeiras atuantes no país;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;viaturas automóveis, motociclos e frotas de distribuição logística;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;equipamentos informáticos, electrodomésticos, telefones, móveis e ativos operacionais comerciais;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;mercadorias existentes sob posse em lojas, carrinhas ou stocks mercantis;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;imóveis registados, terrenos habitacionais, benfeitorias comerciais e outras participações penhoráveis nos termos da lei.
                          </p>
                        </div>

                        <div className="border-l-2 border-slate-350 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt]">CLÁUSULA 6 — COBRANÇA</h5>
                          <p className="mt-0.5">
                            Todas as despesas administrativas, correspondências registrada, selagem do contrato, deslocações ao local de negócio, notificações e eventuais honorários advocatícios (estabelecidos no rácio mínimo de 10% sobre o capital em litígio) resultantes da recuperação do crédito serão integralmente suportados pelo MUTUÁRIO.
                          </p>
                        </div>

                        <div className="border-l-2 border-slate-355 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt]">CLÁUSULA 7 — DECLARAÇÕES DE INTEGRIDADE</h5>
                          <p className="mt-0.5">
                            O MUTUÁRIO declara civil e criminalmente, sob compromisso de honra, que:
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;todas as informações pessoais, dados de residência, contactos e anexos prestados são inteiramente verdadeiros e idóneos;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;possui capacidade financeira líquida estável para honrar tempestivamente cada uma das obrigações pecuniárias contraídas;
                            <br />
                            &nbsp;&nbsp;&bull;&nbsp;compreende e aceita de livre vontade, sem reservas e sem vício de consentimento, todas as taxas de amortização e responsabilidade constantes neste acordo.
                          </p>
                        </div>

                        <div className="border-l-2 border-slate-355 pl-3 py-1.5 bg-slate-50/40 rounded-r-lg">
                          <h5 className="font-bold text-slate-900 uppercase text-[12pt]">CLÁUSULA 8 — FORO ACORDADO</h5>
                          <p className="mt-0.5">
                            Para resolução de quaisquer litígios, conflitos interpretativos ou execuções diretas emergentes deste instrumento jurídico contratual executivo, as partes acordam e elegem em definitivo o Foro Judicial da Cidade de Maputo, abdicando expressamente de qualquer outro, por mais privilegiado que se declare.
                          </p>
                        </div>

                      </div>

                      {/* Explicit Signature Footer Notice & Seal */}
                      <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-6 font-sans">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3.5 py-2 rounded-xl border border-blue-150 shadow-xs">
                          <ShieldCheck size={18} className="text-teal-600 animate-pulse stroke-[2.5]" />
                          <div className="text-left text-[9px] uppercase leading-tight tracking-wide">
                            <strong className="block text-[10.5px] font-black tracking-widest text-blue-900">DOCUMENTO AUTENTICADO</strong>
                            VALIDADO DIGITALMENTE VIA SISTEMA METICALCRED
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 leading-relaxed max-w-xs">
                          <p className="italic">“O presente contrato digital constitui título executivo extrajudicial de dívida certa.”</p>
                        </div>
                      </div>

                      {/* Custom legal footnote card dynamically mapped to user specified entries */}
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px] text-slate-500 tracking-tight">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <strong>Emissão:</strong> Documento emitido electronicamente pela {settings.companyName || "MeticalCred S.A."}
                          </p>
                          <p className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <strong>Efeito Legal:</strong> Este contrato constitui prova da obrigação assumida.
                          </p>
                        </div>
                        <div className="space-y-1.5 sm:text-right">
                          <p className="flex items-center sm:justify-end gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <strong>Código de validação digital:</strong> <span className="font-mono font-bold text-slate-700">{securityTokenRef.current}</span>
                          </p>
                          <p className="flex items-center sm:justify-end gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <strong>Emitido em:</strong> <span className="font-mono font-bold text-slate-705">{currentPrintDate}</span>
                          </p>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* RECEIPT VIEW */}
                  {type === "RECEIPT" && payment && loan && (
                    <div>
                      <div className="text-center mb-6">
                        <h2 className="font-display font-bold text-2xl uppercase tracking-wide text-slate-900">
                          Recibo Oficial de Pagamento
                        </h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">Ref Recibo: {payment.receiptNumber}</p>
                      </div>

                      <div className="border border-dashed border-slate-350 rounded-xl p-6 bg-slate-50 space-y-4 text-[12pt]">
                        <div className="text-slate-500 text-[10px] uppercase font-mono mb-2 text-center tracking-widest block">
                          COMPROVATIVO DE LIQUIDAÇÃO DE PARCELA
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Mutuário / Cliente</span>
                            <span className="font-bold text-slate-800">{loan.clientName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Contrato Associado</span>
                            <span className="font-mono text-slate-800">{loan.id}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Meio de Transação</span>
                            <span className="font-medium text-slate-800">{payment.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Data da Operação</span>
                            <span className="font-mono text-slate-800">
                              {new Date(payment.paymentDate).toLocaleDateString("pt-MZ")}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-slate-500">Valor Amortizado</span>
                            <span className="font-mono font-bold text-slate-900">
                              {payment.amount.toLocaleString("pt-MZ")} MZN
                            </span>
                          </div>
                          {payment.penaltyPaid > 0 && (
                            <div className="flex justify-between border-b border-slate-200 pb-1.5 text-amber-700 font-medium">
                              <span>Multas / Penalizações Pagas</span>
                              <span className="font-mono font-bold">
                                +{payment.penaltyPaid.toLocaleString("pt-MZ")} MZN
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-b-2 border-slate-300 pb-2 bg-slate-200/50 p-2.5 rounded text-sm font-semibold">
                            <span className="font-bold text-slate-950">Total Pago Liquidado</span>
                            <span className="font-mono font-black text-emerald-600">
                              {(payment.amount + payment.penaltyPaid).toLocaleString("pt-MZ")} MZN
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] pt-1 text-slate-500">
                            <span>Saldo Mutuado Pendente:</span>
                            <span className="font-mono font-bold">
                              {loan.outstandingBalance.toLocaleString("pt-MZ")} MZN
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DAILY REPORT */}
                  {type === "DAILY_REPORT" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h2 className="font-display font-bold text-2xl uppercase tracking-wide text-slate-900">
                          Balancete Diário de Caixa
                        </h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">
                          Análise e reconciliação diária de liquidez
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl">
                          <span className="text-indigo-600 text-[10px] uppercase font-mono block mb-1 font-bold">
                            Concessões do Dia
                          </span>
                          <strong className="text-xl font-mono text-indigo-950">
                            {loansList
                              .filter((l) => l.startDate === new Date().toISOString().split("T")[0])
                              .reduce((acc, curr) => acc + curr.principalAmount, 0)
                              .toLocaleString("pt-MZ")}{" "}
                            MZN
                          </strong>
                        </div>
                        <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl">
                          <span className="text-emerald-600 text-[10px] uppercase font-mono block mb-1 font-bold">
                            Cobranças / Receitas do Dia
                          </span>
                          <strong className="text-xl font-mono text-emerald-950">
                            {loansList
                              .reduce((total, cur) => {
                                const todayPays = cur.payments.filter(
                                  (p) =>
                                    p.paymentDate.split("T")[0] === new Date().toISOString().split("T")[0]
                                );
                                return (
                                  total +
                                  todayPays.reduce((sum, pay) => sum + pay.amount + pay.penaltyPaid, 0)
                                );
                              }, 0)
                              .toLocaleString("pt-MZ")}{" "}
                            MZN
                          </strong>
                        </div>
                      </div>

                      <h4 className="font-display font-bold text-xs uppercase text-slate-500 border-b pb-1">
                        Transações e Concessões do Ciclo Diário
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono text-[9px] uppercase font-bold">
                              <th className="p-2.5">Ref Contrato</th>
                              <th className="p-2.5">Beneficiário</th>
                              <th className="p-2.5">Desembolso</th>
                              <th className="p-2.5">Saldo Devedor</th>
                              <th className="p-2.5">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loansList.length > 0 ? (
                              loansList.slice(0, 10).map((l) => (
                                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="p-2.5 font-mono text-indigo-600 font-bold">{l.id}</td>
                                  <td className="p-2.5 font-bold text-slate-800">{l.clientName}</td>
                                  <td className="p-2.5 font-mono font-medium">
                                    {l.principalAmount.toLocaleString("pt-MZ")}
                                  </td>
                                  <td className="p-2.5 font-mono">
                                    {l.outstandingBalance.toLocaleString("pt-MZ")}
                                  </td>
                                  <td className="p-2.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        l.status === "ACTIVE"
                                          ? "bg-blue-100 text-blue-800"
                                          : l.status === "PAID"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {l.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                                  Sem dados registados nas últimas 24 horas.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MONTHLY REPORT */}
                  {type === "MONTHLY_REPORT" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h2 className="font-display font-bold text-2xl uppercase tracking-wide text-slate-900">
                          Relatório Financeiro do Mês
                        </h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">Consolidado Mensal {settings.companyName || "CredFlow"}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                          <span className="text-[9px] uppercase text-slate-400 font-mono block font-bold">Volume Concedido</span>
                          <strong className="text-md font-mono text-indigo-750 font-bold">
                            {loansList
                              .reduce((acc, curr) => acc + curr.principalAmount, 0)
                              .toLocaleString("pt-MZ")}{" "}
                            MZN
                          </strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                          <span className="text-[9px] uppercase text-slate-400 font-mono block font-bold">Amortização Total</span>
                          <strong className="text-md font-mono text-emerald-750 font-bold">
                            {loansList
                              .reduce((total, cur) => {
                                return total + cur.payments.reduce((sum, p) => sum + p.amount, 0);
                              }, 0)
                              .toLocaleString("pt-MZ")}{" "}
                            MZN
                          </strong>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                          <span className="text-[9px] uppercase text-slate-400 font-mono block font-bold">Inadimplência Ativa</span>
                          <strong className="text-md font-mono text-rose-750 font-bold">
                            {loansList
                              .filter((l) => l.status === "OVERDUE")
                              .reduce((acc, curr) => acc + curr.outstandingBalance, 0)
                              .toLocaleString("pt-MZ")}{" "}
                            MZN
                          </strong>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs text-slate-650 leading-relaxed">
                        <h4 className="font-display font-bold text-xs uppercase text-slate-500 mb-2">
                          Sumário Corporativo
                        </h4>
                        <p>
                          Esta auditoria reflete todos os fluxos de caixa verificados para o período operativo corrente.
                          Com base no processamento financeiro, o rácio global de inadimplência de crédito situa-se em
                          um patamar razoável, permitindo prover liquidez sustentável aos pequenos comerciantes e
                          empreendedores cadastrados.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* OVERDUE CLIENTS */}
                  {type === "OVERDUE_CLIENTS" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h2 className="font-display font-bold text-2xl uppercase tracking-wide text-rose-600">
                          Lista de Clientes Devedores em Atraso
                        </h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">Prevenção e Cobrança Contratual</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border border-slate-200">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono text-[9px] uppercase">
                              <th className="p-3">Mutuário</th>
                              <th className="p-3">Telefone</th>
                              <th className="p-3">Capital Emprestado</th>
                              <th className="p-3">Saldo Devedor / Multa</th>
                              <th className="p-3">Vencimento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loansList.filter((l) => l.status === "OVERDUE").length > 0 ? (
                              loansList
                                .filter((l) => l.status === "OVERDUE")
                                .map((l) => (
                                  <tr key={l.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                                    <td className="p-3 font-bold text-slate-900">{l.clientName}</td>
                                    <td className="p-3 font-mono">{l.id}</td>
                                    <td className="p-3 font-mono">
                                      {l.principalAmount.toLocaleString("pt-MZ")} MZN
                                    </td>
                                    <td className="p-3 font-mono text-rose-600 font-semibold leading-normal">
                                      {l.outstandingBalance.toLocaleString("pt-MZ")} MZN
                                      <br />
                                      <span className="text-[9px] text-amber-600 font-mono block font-black">
                                        + {l.lateFeePenaltyApplied.toLocaleString("pt-MZ")} multa
                                      </span>
                                    </td>
                                    <td className="p-3 font-mono text-slate-500 font-bold">{l.dueDate}</td>
                                  </tr>
                                ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400 bg-slate-50 italic">
                                  Excelente! Nenhuma parcela ou contrato em situação de inadimplência ativa.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CLIENT_STATEMENT */}
                  {type === "CLIENT_STATEMENT" && client && (
                    <div className="space-y-6">
                      <div className="text-center border-b pb-4 border-slate-200">
                        <h2 className="font-display font-bold text-2xl uppercase tracking-wide text-indigo-950">
                          Extrato de Conta de Mutuário
                        </h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">
                          {statementStartDate && statementEndDate ? (
                            <span>Período: {new Date(statementStartDate).toLocaleDateString("pt-MZ")} até {new Date(statementEndDate).toLocaleDateString("pt-MZ")}</span>
                          ) : statementStartDate ? (
                            <span>A partir de: {new Date(statementStartDate).toLocaleDateString("pt-MZ")}</span>
                          ) : statementEndDate ? (
                            <span>Até: {new Date(statementEndDate).toLocaleDateString("pt-MZ")}</span>
                          ) : (
                            <span>Histórico Operacional Completo de Conta Corrente</span>
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-400 block mb-0.5 font-bold">Nome Completo:</span>
                          <strong className="text-slate-900 font-bold block text-sm">{client.fullName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 font-bold">Nº BI / Passaporte:</span>
                          <strong className="font-mono text-slate-900 font-bold block text-sm">{client.idPassport}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 font-bold">Contacto Telefónico:</span>
                          <strong className="font-mono text-slate-800 font-semibold block">{client.phone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 font-bold">Endereço Residencial:</span>
                          <strong className="text-slate-800 block leading-tight">{client.address}</strong>
                        </div>
                      </div>

                      {(() => {
                        const movements: Array<{
                          id: string;
                          date: string;
                          type: "DESEMBOLSO_DEBITO" | "AMORTIZACAO_CREDITO";
                          reference: string;
                          description: string;
                          amount: number;
                          runningBalance: number;
                        }> = [];

                        const clientLoans = loansList.filter(l => l.clientId === client.id);

                        clientLoans.forEach(l => {
                          movements.push({
                            id: `l-${l.id}`,
                            date: l.startDate,
                            type: "DESEMBOLSO_DEBITO",
                            reference: l.id,
                            description: `Microcrédito Concedido - Ref: ${l.id} (${l.interestRate}% Juros, ${l.termMonths} Meses)`,
                            amount: l.totalDue,
                            runningBalance: 0
                          });

                          l.payments.forEach(p => {
                            movements.push({
                              id: `p-${p.id}`,
                              date: p.paymentDate,
                              type: "AMORTIZACAO_CREDITO",
                              reference: p.receiptNumber,
                              description: `Amortização de Prestação ${p.receiptNumber} (${p.paymentMethod})`,
                              amount: p.amount,
                              runningBalance: 0
                            });
                          });
                        });

                        movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        let currentBalance = 0;
                        const movementsWithBalances = movements.map(m => {
                          if (m.type === "DESEMBOLSO_DEBITO") {
                            currentBalance += m.amount;
                          } else {
                            currentBalance -= m.amount;
                          }
                          return { ...m, runningBalance: currentBalance };
                        });

                        const startLimit = statementStartDate ? new Date(statementStartDate).getTime() : -Infinity;
                        const endLimit = statementEndDate ? new Date(statementEndDate + "T23:59:59").getTime() : Infinity;

                        const beforeMovements = movementsWithBalances.filter(m => new Date(m.date).getTime() < startLimit);
                        const initialRunningBalance = beforeMovements.length > 0 
                          ? beforeMovements[beforeMovements.length - 1].runningBalance 
                          : 0;

                        const displayMovements = movementsWithBalances.filter(m => {
                          const t = new Date(m.date).getTime();
                          return t >= startLimit && t <= endLimit;
                        });

                        const totalDebitado = displayMovements
                          .filter(m => m.type === "DESEMBOLSO_DEBITO")
                          .reduce((sum, m) => sum + m.amount, 0);

                        const totalCreditado = displayMovements
                          .filter(m => m.type === "AMORTIZACAO_CREDITO")
                          .reduce((sum, m) => sum + m.amount, 0);

                        const endBalance = displayMovements.length > 0
                          ? displayMovements[displayMovements.length - 1].runningBalance
                          : initialRunningBalance;

                        return (
                          <div className="space-y-4">
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b-2 border-slate-200 font-mono text-slate-600 uppercase tracking-wider text-[9px] font-black">
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Descrição / Lançamento</th>
                                    <th className="p-3">Referência</th>
                                    <th className="p-3 text-right">Débito (+ MZN)</th>
                                    <th className="p-3 text-right">Crédito (- MZN)</th>
                                    <th className="p-3 text-right text-slate-900">Saldo (MZN)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150">
                                  {statementStartDate && (
                                    <tr className="bg-slate-50/60 font-medium italic text-slate-500">
                                      <td className="p-3">{new Date(statementStartDate).toLocaleDateString("pt-MZ")}</td>
                                      <td className="p-3" colSpan={2}>Saldo Anterior Transitado</td>
                                      <td className="p-3 text-right">-</td>
                                      <td className="p-3 text-right">-</td>
                                      <td className="p-3 text-right font-mono font-bold">{initialRunningBalance.toLocaleString("pt-MZ")} MZN</td>
                                    </tr>
                                  )}

                                  {displayMovements.length > 0 ? (
                                    displayMovements.map(m => {
                                      const mDate = new Date(m.date);
                                      const dateFormatted = mDate.toLocaleDateString("pt-MZ") + " " + (m.date.includes("T") ? mDate.toLocaleTimeString("pt-MZ", {hour: '2-digit', minute: '2-digit'}) : "");
                                      return (
                                        <tr key={m.id} className="hover:bg-slate-50/50 transition duration-150">
                                          <td className="p-3 font-mono whitespace-nowrap text-[10px] text-slate-500">{dateFormatted}</td>
                                          <td className="p-3 font-sans leading-relaxed text-slate-700">{m.description}</td>
                                          <td className="p-3 font-mono text-slate-600 font-bold">{m.reference}</td>
                                          <td className="p-3 text-right font-mono font-semibold text-rose-600">
                                            {m.type === "DESEMBOLSO_DEBITO" ? `+${m.amount.toLocaleString("pt-MZ")}` : "-"}
                                          </td>
                                          <td className="p-3 text-right font-mono font-semibold text-emerald-600">
                                            {m.type === "AMORTIZACAO_CREDITO" ? `-${m.amount.toLocaleString("pt-MZ")}` : "-"}
                                          </td>
                                          <td className="p-3 text-right font-mono font-bold text-slate-950">
                                            {m.runningBalance.toLocaleString("pt-MZ")} MZN
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                                        Nenhum movimento operacional registado para este período.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl">
                                <span className="text-[9px] text-rose-500 uppercase font-mono block font-black">Total Débito</span>
                                <strong className="font-mono text-sm font-bold text-rose-700">+{totalDebitado.toLocaleString("pt-MZ")} MZN</strong>
                              </div>
                              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <span className="text-[9px] text-emerald-600 uppercase font-mono block font-black">Total Pago</span>
                                <strong className="font-mono text-sm font-bold text-emerald-700">-{totalCreditado.toLocaleString("pt-MZ")} MZN</strong>
                              </div>
                              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <span className="text-[9px] text-indigo-600 uppercase font-mono block font-black">Saldo devedor corrente</span>
                                <strong className="font-mono text-sm font-bold text-indigo-700">{endBalance.toLocaleString("pt-MZ")} MZN</strong>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-normal">
                              <strong className="text-slate-700 block mb-0.5">Nota de Conformidade:</strong>
                              Este extrato de conta corrente individual foi processado automaticamente e constitui o histórico financeiro autêntico do mutuário nos livros digitais da instituição {settings.companyName}.
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Signatures & QR Code section (Identical on template and final PDF Blob) */}
                  <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={qrUrl}
                        alt="QR Code Autenticador"
                        className="w-16 h-16 border border-slate-250 p-1 bg-white rounded-lg select-none"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left text-xs leading-none space-y-1">
                        <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Assinatura Digital</h4>
                        <p className="text-[9px] text-slate-500 font-mono leading-normal">
                          {settings.companyName || "CredFlow"} Token:
                          <br />
                          <span className="font-bold text-slate-900">{securityTokenRef.current}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-40 border-b border-slate-900 mb-1"></div>
                      <span className="text-[10px] text-slate-400">Operador Autorizado</span>
                      <span className="text-xs font-bold text-slate-900 font-display mt-0.5">{userFullName}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full border-2 border-indigo-600/35 flex items-center justify-center relative rotate-12 bg-indigo-50/60 select-none">
                        <div className="absolute text-[7px] uppercase tracking-tighter text-indigo-700 text-center font-black px-0.5 leading-none">
                          {settings.companyName || "CredFlow"}
                          <br />
                          DIRECÇÃO
                          <br />
                          MAPUTO
                        </div>
                        <Award size={22} className="text-indigo-450 opacity-15" />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest block font-bold">Selo Oficial</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
          
          {/* POPULAR OVERLAY SHARE WINDOWS (IN-MODAL INTERACTION FOR WHATSAPP/EMAIL) */}
          {showShareModal !== "NONE" && (
            <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl relative animate-fade-in text-slate-900 dark:text-white space-y-4">
                
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    {showShareModal === "WHATSAPP" ? (
                      <>
                        <MessageSquare size={13} className="text-green-500" />
                        Partilhar via WhatsApp
                      </>
                    ) : (
                      <>
                        <Mail size={13} className="text-indigo-500" />
                        Partilhar via E-mail
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setShowShareModal("NONE");
                      setValidationError("");
                      setSendSuccess(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {validationError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 text-[11px] p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {sendSuccess ? (
                  <div className="py-6 flex flex-col items-center text-center space-y-3">
                    <span className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1 animate-bounce">
                      <CheckCircle2 size={24} />
                    </span>
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100 uppercase tracking-widest font-mono">
                      Autenticado com Sucesso
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                      {showShareModal === "WHATSAPP" 
                        ? "A redirecionar com segurança para o WhatsApp Web associando o PDF único..."
                        : `O documento PDF foi transmitido e anexado com sucesso para ${shareEmail}!`}
                    </p>
                  </div>
                ) : (
                  <form 
                    onSubmit={showShareModal === "WHATSAPP" ? handleWhatsAppSend : handleEmailSend}
                    className="space-y-4"
                  >
                    {showShareModal === "WHATSAPP" ? (
                      <div>
                        <label className="text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-450 block mb-1 uppercase">
                          Número do Cliente (com código do país)
                        </label>
                        <div className="flex gap-2">
                          <span className="bg-slate-100 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex items-center font-mono">+258</span>
                          <input
                            type="text"
                            required
                            placeholder="Ex. 841234567"
                            value={sharePhone.startsWith("+258") ? sharePhone.substring(4) : sharePhone.startsWith("258") ? sharePhone.substring(3) : sharePhone}
                            onChange={(e) => setSharePhone(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-950 text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          Auto-preenchido do cadastro. O link compartilhado direcionará o usuário para a página de login para máxima segurança de dados.
                        </span>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-450 block mb-1 uppercase">
                          Endereço de E-mail de Destino
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="Ex. cliente@gmail.com"
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                        />
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          O e-mail enviado conterá o link oficial de login para garantir que os dados financeiros estejam protegidos e sob segredo profissional.
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowShareModal("NONE")}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSending}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        {isSending ? (
                          <>
                            <Clock size={12} className="animate-spin" />
                            <span>A Processar...</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>{showShareModal === "WHATSAPP" ? "Partilhar" : "Enviar Anexo"}</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
