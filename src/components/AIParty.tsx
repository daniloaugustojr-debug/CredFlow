import React, { useState, useRef, useEffect } from "react";
import { Client } from "../types";
import {
  BrainCircuit,
  Send,
  Sparkles,
  Bot,
  User,
  Activity,
  Award,
  ShieldCheck,
  Phone,
  HelpCircle,
  TrendingDown
} from "lucide-react";

interface AIPartyProps {
  creditAnalysisResult: string | null;
  selectedClientForRisk: Client | null;
  isGeneratingAnalysis: boolean;
  onClearAnalysis: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIParty({
  creditAnalysisResult,
  selectedClientForRisk,
  isGeneratingAnalysis,
  onClearAnalysis,
}: AIPartyProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "m-init",
      role: "assistant",
      content:
        "Olá! Sou o **MeticalMind AI Analyst**, o assistente digital de microfinanças da MeticalCred S.A. \n\nPosso ajudar as equipas de gestão com:\n- Sugestão de taxas ajustadas de juros em Moçambique\n- Avaliações de risco e mitigação de perdas por incumprimento\n- Relatórios macro e previsões líquidas de Meticais",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSendingMessage) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: inputText,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsSendingMessage(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setChatMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          role: "assistant",
          content: data.response || "Não consegui processar essa pergunta agora. Por favor, repita.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Oops! Houve uma falha de conexão à rede ou o modelo está indisponível.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Intro Header */}
      <div>
        <h2 className="font-display font-bold text-3xl tracking-tight text-slate-900 dark:text-white">
          Assistência Financeira Inteligente
        </h2>
        <p className="text-sm text-slate-500">
          Auditoria inteligente de risco de crédito de clientes e motor de conversação para pequenos comerciantes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Deep risk analytics results (Displays when triggered from clients profile) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[550px] overflow-hidden">
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 border-b border-indigo-55 dark:border-slate-800 pb-3 mb-4">
              <Award className="text-indigo-500" size={17} />
              <h4 className="font-display font-semibold text-slate-950 dark:text-white text-sm">
                Auditoria de Risco Integrada (BIs)
              </h4>
            </div>

            {isGeneratingAnalysis ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <h5 className="font-semibold text-xs tracking-wide text-slate-800 dark:text-slate-200">
                  A processar Auditoria Fiscal...
                </h5>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                  A nossa IA está a indexar o BI do cliente e a simular probabilidade de inadimplência da carteira de crédito em tempo real.
                </p>
              </div>
            ) : creditAnalysisResult ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-indigo-500 block mb-1">
                    CLIENTE AUDITADO
                  </span>
                  <strong className="text-sm font-bold block text-slate-950 dark:text-white">
                    {selectedClientForRisk?.fullName}
                  </strong>
                  <span className="font-mono text-slate-500 text-[10px]">
                    BI: {selectedClientForRisk?.idPassport} | {selectedClientForRisk?.financialStatus}
                  </span>
                </div>

                <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-sans mt-2 bg-indigo-50/20 dark:bg-slate-950/20 p-4 rounded-xl border border-indigo-500/10">
                  {creditAnalysisResult}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800">
                <Bot className="text-slate-350 dark:text-slate-600 mb-2" size={32} />
                <h5 className="font-sans font-semibold text-xs text-slate-600 dark:text-slate-400 block mb-1">
                  Sem Historial Selecionado
                </h5>
                <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-[200px]">
                  Vá para a <strong>Gestão de Clientes</strong>, veja o histórico de um cliente e clique em
                  <strong>"Auditar Crédito"</strong> para carregar o parecer do analista.
                </p>
              </div>
            )}
          </div>

          {creditAnalysisResult && (
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-850 flex justify-end">
              <button
                onClick={onClearAnalysis}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 hover:dark:bg-slate-800 text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition font-mono font-bold"
              >
                Limpar Auditoria
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Conversational advisor Chatbot */}
        <div className="lg:col-span-3 bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl flex flex-col h-[550px] shadow-2xl relative overflow-hidden border border-slate-800">
          {/* Cosmic Ambient accents in background */}
          <div className="absolute top-[-50px] right-[-30px] w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Conversational Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <BrainCircuit size={16} />
              </div>
              <div>
                <span className="font-display font-bold text-sm text-white block">
                  MeticalMind Bot
                </span>
                <span className="text-[9px] tracking-widest font-mono text-indigo-400 font-bold block uppercase">
                  IA de Microfinanças MZN
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Modelo Ativo
            </div>
          </div>

          {/* Chat scrolling viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scrollbar-thin">
            {chatMessages.map((msg) => {
              const isBot = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isBot ? "justify-start" : "justify-end"} gap-2 w-full animate-fade-in`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 self-start">
                      M
                    </div>
                  )}

                  <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs inline-block text-left ${
                    isBot
                      ? "bg-slate-800/80 text-slate-100 rounded-tl-none border border-slate-800"
                      : "bg-indigo-600 text-white rounded-tr-none"
                  }`}>
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    <span className="text-[8.5px] font-mono text-slate-500 block text-right mt-1.5">
                      {new Date(msg.timestamp).toLocaleTimeString("pt-MZ")}
                    </span>
                  </div>
                </div>
              );
            })}
            {isSendingMessage && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  M
                </div>
                <div className="bg-slate-800/60 text-slate-400 rounded-2xl p-3 px-4 text-xs font-semibold rounded-tl-none flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={scrollRef}></div>
          </div>

          {/* Quick options suggested shortcuts */}
          <div className="p-2 border-t border-slate-850 flex gap-1.5 overflow-x-auto text-[10px] z-10 scrollbar-none bg-slate-950/20">
            <button
              onClick={() => setInputText("Quais as melhores formas de gerir pagamentos atrasados de crédito?")}
              className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-full cursor-pointer whitespace-nowrap"
            >
              Controlar Atrasos
            </button>
            <button
              onClick={() => setInputText("Explique-me a norma fiscal para juros de microfinanças em Moçambique.")}
              className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-full cursor-pointer whitespace-nowrap"
            >
              Regra Fiscal Juros
            </button>
            <button
              onClick={() => setInputText("Como calcular amortização declinante em oposição à amortização francesa simples?")}
              className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-full cursor-pointer whitespace-nowrap"
            >
              Cálculo Declinante
            </button>
          </div>

          {/* Text entry form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-800 flex items-center gap-2 bg-slate-950/40 z-10"
          >
            <input
              type="text"
              placeholder="Pergunte ao MeticalMind AI Analyst..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 py-3 px-4 text-xs text-white rounded-xl placeholder-slate-500 outline-none focus:border-indigo-600 transition"
            />
            <button
              type="submit"
              disabled={isSendingMessage || !inputText.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer flex items-center justify-center disabled:opacity-50 shadow"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
