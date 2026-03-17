import { useState, useCallback, useRef } from "react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
import { X, Mic, Check, HelpCircle, Copy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/SidebarContext";
import { useRequestLimit } from "@/hooks/useRequestLimit";
import { useNavigate } from "react-router-dom";

type Tone = "neutral" | "colleague" | "leader";

interface TranslationResult {
  sections: {label: string;content: string;}[];
  rawVibeScore: number;
  translatedVibeScore: number;
  coachTip: string;
  conversational?: string;
}

interface SocialTranslatorProps {
  open: boolean;
  onClose: () => void;
}

const SocialTranslator = ({ open, onClose }: SocialTranslatorProps) => {
  const { user, isGuest } = useAuth();
  const isMobile = useIsMobile();
  const { collapsed } = useSidebar();
  const { isLimitReached, requestsLeft, requestsLimit, consume, syncFromServer } = useRequestLimit();
  const [input, setInput] = useState("");
  const [tone, setTone] = useState<Tone>("colleague");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [structuredHeight, setStructuredHeight] = useState<number | null>(null);
  const [needlePosition, setNeedlePosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCoachTip, setShowCoachTip] = useState(false);
  const [viewMode, setViewMode] = useState<"structured" | "conversational">("structured");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRestartRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const navigation = useNavigate()

  const MAX_RECORDING_SECONDS = 60;
  const MAX_CHARS = parseInt(import.meta.env.VITE_MAX_INPUT_CHARS ?? "350", 10);
  const charToastShown = useRef(false);

  const stopRecording = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
    if (micTimerRef.current) {
      clearTimeout(micTimerRef.current);
      micTimerRef.current = null;
    }
  }, []);

  const startRecognitionSession = useCallback(() => {
    const SpeechRecognition = (
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    );
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) {
            finalTranscriptRef.current = finalTranscriptRef.current
              ? finalTranscriptRef.current + " " + text
              : text;
          }
        } else {
          interim = event.results[i][0].transcript;
        }
      }
      setInput(finalTranscriptRef.current + (interim ? " " + interim : ""));
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech") return;
      stopRecording();
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          startRecognitionSession();
        } catch {
          stopRecording();
        }
      } else {
        setIsRecording(false);
      }
    };

    recognition.start();
  }, [stopRecording]);

  const handleMic = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognition = (
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    );
    if (!SpeechRecognition) {
      toast({
        title: "Voice input unavailable",
        description: "Your browser doesn't support voice input. Try Chrome or Edge instead.",
        variant: "destructive"
      });
      return;
    }

    finalTranscriptRef.current = input;
    shouldRestartRef.current = true;
    setIsRecording(true);
    startRecognitionSession();

    micTimerRef.current = setTimeout(() => {
      stopRecording();
      toast({ title: "Recording stopped", description: "60-second limit reached." });
    }, MAX_RECORDING_SECONDS * 1000);
  }, [isRecording, input, stopRecording, startRecognitionSession]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const PROFANITY_PATTERN = /\b(fuck|shit|damn|ass|bitch|bastard|crap|dick|cock|pussy|slut|whore|cunt|nigger|faggot|retard)\b/i;

  const handleTranslate = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    if (isRecording) {
      stopRecording();
    }

    if (PROFANITY_PATTERN.test(input)) {
      toast({
        title: "Strong language detected",
        description: "Please rephrase your message without offensive words to continue.",
        variant: "destructive"
      });
      return;
    }

    const allowed = await consume();
    if (!allowed) return;

    setIsLoading(true);
    setResult(null);
    setStructuredHeight(null);
    setShowCoachTip(false);

    try {
      const { data, error } = await supabase.functions.invoke("social-translate", {
        body: { rawText: input, tone }
      });

      if (error) throw error;
      if (data?.error === "daily_limit_reached") {
        syncFromServer?.();
        toast({
          title: "Daily limit reached",
          description: `You've used all ${requestsLimit} AI requests for today. Come back tomorrow!`,
          variant: "destructive",
        });
        return;
      }
      if (data?.error) throw new Error(data.error);

      const res = data as TranslationResult;
      setResult(res);

      if (user) {
        supabase.
        from("activity_log").
        insert({
          user_id: user.id,
          activity_type: "translation_complete",
          module_id: "social-translator",
          tone_mode: tone,
          vibe_score: res.rawVibeScore
        }).
        then(() => {});
      }

      setNeedlePosition(res.rawVibeScore);

      setTimeout(() => {
        setNeedlePosition(res.translatedVibeScore);
      }, 600);
    } catch (e) {
      console.error("Translation error:", e);
      toast({
        title: "Couldn't translate right now",
        description: "Something went wrong on our end. Please try again in a moment.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isRecording, PROFANITY_PATTERN, stopRecording, tone, user, consume, syncFromServer, requestsLimit]);

  const handleClear = () => {
    setInput("");
    setResult(null);
    setStructuredHeight(null);
    setNeedlePosition(null);
    setShowCoachTip(false);
    setViewMode("structured");
  };

  const handleCopy = () => {
    if (!result) return;
    const text = viewMode === "conversational" && result.conversational
      ? result.conversational
      : result.sections.map((s) => s.content).join(" ");
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const tones: {value: Tone;label: string;}[] = [
    { value: "neutral", label: "Neutral" },
    { value: "colleague", label: "Colleague" },
    { value: "leader", label: "Leader" },
  ];

  const sidebarWidth = collapsed ? 68 : 220;

  const content = (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-medium">Social Translator</h2>
      </div>
      <p className="text-muted-foreground mb-5 text-base">Turn raw thoughts into leadership communication</p>

      {/* Input */}
      <label className="font-semibold tracking-wider text-muted-foreground uppercase mb-2 block text-sm">
        Your Raw Thoughts
      </label>
      <div className="relative rounded-xl p-4 mb-5 bg-card border border-border">
        <textarea
          value={input}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue.length > MAX_CHARS) {
              if (!charToastShown.current) {
                toast({ title: "Character limit reached", description: `Max ${MAX_CHARS} characters allowed.`, variant: "destructive" });
                charToastShown.current = true;
              }
              setInput(newValue.slice(0, MAX_CHARS));
            } else {
              charToastShown.current = false;
              setInput(newValue);
            }
          }}
          placeholder="Type something"
          className={`w-full bg-transparent resize-none outline-none text-foreground min-h-[100px] text-base${input.length >= MAX_CHARS ? " opacity-50 cursor-not-allowed" : ""}`}
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${input.length >= MAX_CHARS ? "text-destructive" : "text-muted-foreground"}`}>
            {input.length}/{MAX_CHARS}
          </span>
          <div className="flex gap-2">

          {input && (
            <button onClick={handleClear} className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleMic}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isRecording ? "bg-accent text-destructive-foreground animate-pulse" : "bg-muted/60 text-muted-foreground"}`}
          >
            {isRecording ? <Check className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
            </div>
        </div>
      </div>

      {/* Vibe Meter */}
      <div className="flex items-baseline justify-between mb-2">
        <label className="font-semibold tracking-wider text-muted-foreground uppercase text-sm">
          The Vibe Meter
        </label>
        {result && (
          <span className="text-sm font-semibold text-muted-foreground">
            {result.rawVibeScore}<span className="mx-0.5">→</span>{result.translatedVibeScore}
          </span>
        )}
      </div>
      <div className="relative mb-1" style={{ height: 24 }}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-vibe-blunt via-muted to-vibe-nuanced" />
        {needlePosition !== null && (
          <motion.div
            className="absolute rounded-full bg-foreground border-2 border-card shadow-md"
            style={{ width: 24, height: 24, top: 0 }}
            initial={{ opacity: 0, left: `calc(${needlePosition}% - 12px)` }}
            animate={{ opacity: 1, left: `calc(${needlePosition}% - 12px)` }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs font-semibold mb-5">
        <span className="text-vibe-blunt text-sm">Blunt</span>
        <span className="text-vibe-nuanced text-sm">Nuanced</span>
      </div>

      {/* Tone Toggles */}
      <div className="flex rounded-xl p-1 mb-5 bg-secondary border border-border">
        {tones.map((t) => (
          <button
            key={t.value}
            onClick={() => setTone(t.value)}
            className={`flex-1 py-2.5 text-base font-semibold rounded-lg transition-all ${
              tone === t.value ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!isLimitReached && requestsLeft <= 2 && (
        <p className="text-base text-muted-foreground text-right mb-2">
          {requestsLeft} {requestsLeft === 1 ? "request" : "requests"} remaining today
        </p>
      )}

      {/* Translate Button */}
      {isLimitReached ? (
        <div className="w-full py-4 rounded-xl bg-muted border border-border text-center">
          <p className="font-semibold text-muted-foreground text-lg">
            Daily limit reached ({requestsLimit} requests/day)
          </p>
          <p className="text-base text-muted-foreground mt-0.5">
            {isGuest ? "Sign up for more daily requests" : "Resets at midnight"}
          </p>
          {isGuest && (
            <button
              onClick={() => navigation("/auth")}
              className="mt-2 text-sm font-semibold text-accent underline"
            >
              Create a free account
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleTranslate}
          disabled={!input.trim() || isLoading}
          className="w-full py-4 rounded-xl bg-cta text-cta-foreground font-semibold text-lg disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Translating…
            </>
          ) : (
            "Translate"
          )}
        </button>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => {
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="mt-5 glass-dark rounded-2xl p-5 text-glass-foreground"
          >
            {/* Conversational toggle */}
            {result.conversational && (
              <div className="flex items-center gap-2.5 mb-4">
                <button
                  onClick={() => setViewMode((v) => v === "structured" ? "conversational" : "structured")}
                  className={`relative w-11 h-7 rounded-full transition-colors ${viewMode === "conversational" ? "bg-cta" : "bg-glass-foreground/15"}`}
                >
                  <span className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full shadow-sm transition-transform ${viewMode === "conversational" ? "bg-cta-foreground translate-x-[16px]" : "bg-glass-foreground/50 translate-x-0"}`} />
                </button>
                <span className="text-sm text-glass-foreground/70 font-medium">Conversational</span>
              </div>
            )}

            <div style={{ minHeight: structuredHeight ?? undefined }}>
              <AnimatePresence mode="wait" initial={false}>
                {viewMode === "structured" ? (
                  <motion.div
                    key="structured"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    ref={(el) => {
                      if (el && !structuredHeight) {
                        setStructuredHeight(el.getBoundingClientRect().height);
                      }
                    }}
                  >
                    {result.sections.map((s) => (
                      <div key={s.label} className="mb-4 last:mb-0">
                        <p className="font-bold tracking-wider text-accent mb-1 text-sm">{s.label}</p>
                        <p className="leading-relaxed opacity-90 text-base">{s.content}</p>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.p
                    key="conversational"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="leading-relaxed opacity-90 text-base"
                  >
                    {result.conversational}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Coach's Tip */}
            <AnimatePresence>
              {showCoachTip && result.coachTip && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 rounded-xl bg-accent/20 border border-accent/30"
                >
                  <p className="font-bold tracking-wider text-accent mb-1 text-sm">COACH'S TIP</p>
                  <p className="leading-relaxed opacity-90 text-base">{result.coachTip}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCoachTip((p) => !p)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showCoachTip ? "bg-glass-foreground/20" : "bg-glass-foreground/10"}`}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button onClick={handleCopy} className="w-10 h-10 flex items-center justify-center rounded-full bg-glass-foreground/10">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Desktop: resizable side panel
  const [panelWidth, setPanelWidth] = useState(400);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(400);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - ev.clientX;
      const newWidth = Math.min(800, Math.max(360, dragStartWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [panelWidth]);

  if (!isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 z-40"
              onClick={onClose}
            />
            {/* Side panel - right side, resizable */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ width: panelWidth }}
              className="fixed top-0 bottom-0 right-0 z-50 bg-background border-l border-border/50 overflow-y-auto"
            >
              {/* Resize handle */}
              <div
                onMouseDown={handleDragStart}
                className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center group hover:bg-primary/10 transition-colors"
              >
                <div className="w-1 h-12 rounded-full bg-border group-hover:bg-primary transition-colors" />
              </div>
              <div className="pt-6">
                {content}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Mobile: bottom sheet (unchanged)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background border-t border-border/50"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SocialTranslator;
