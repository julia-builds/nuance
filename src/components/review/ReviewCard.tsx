import { IReviewCard, ReviewRating } from "@/hooks/useReview";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

const ratingConfig: { value: ReviewRating; label: string; color: string; desc: string }[] = [
  {
    value: "again",
    label: "Again",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    desc: "Forgot",
  },
  {
    value: "hard",
    label: "Hard",
    color:
      "bg-[hsl(var(--vibe-blunt))]/10 text-[hsl(var(--vibe-blunt))] border-[hsl(var(--vibe-blunt))]/20",
    desc: "Struggled",
  },
  { value: "good", label: "Good", color: "bg-cta/10 text-cta border-cta/20", desc: "Recalled" },
  {
    value: "easy",
    label: "Easy",
    color: "bg-accent/10 text-accent border-accent/20",
    desc: "Instant",
  },
];

interface ReviewCardProps {
  currentCard: IReviewCard;
  setFlipped: (flipped: boolean) => void;
  flipped: boolean;
  handleRate: (rating: ReviewRating) => void;
  animatingOut: boolean;
}
export const ReviewCard: React.FC<ReviewCardProps> = ({
  currentCard,
  setFlipped,
  flipped,
  handleRate,
  animatingOut,
}) => {
  return (
    <motion.div
      key={currentCard.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
    >
      {/* Card */}
      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full text-left"
        style={{ perspective: 1000 }}
      >
        <motion.div
          className="relative min-h-[220px] w-full rounded-2xl shadow-sm"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-border bg-card p-6"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {currentCard.module_id.replace(/-/g, " ")}
            </p>
            <p className="text-lg font-medium leading-relaxed">{currentCard.card_front}</p>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground/50">
              <RotateCcw className="h-3.5 w-3.5" /> Tap to reveal
            </p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-cta/20 bg-cta/5 p-6"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-lg leading-relaxed">{currentCard.card_back}</p>
          </div>
        </motion.div>
      </button>

      {/* Rating buttons — only show when flipped */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            <p className="mb-3 text-center text-sm text-muted-foreground">
              How well did you remember?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ratingConfig.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRate(r.value)}
                  disabled={animatingOut}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition-all active:scale-95 ${r.color}`}
                >
                  <span className="text-base">{r.label}</span>
                  <span className="text-xs opacity-70">{r.desc}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interval info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Reviewed {currentCard.repetitions} time{currentCard.repetitions !== 1 ? "s" : ""} · Next
          interval: {currentCard.interval_days}d
        </p>
      </div>
    </motion.div>
  );
};
