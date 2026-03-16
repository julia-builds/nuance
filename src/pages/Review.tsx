import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Check, PartyPopper } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useReview, IReviewCard, ReviewRating } from "@/hooks/useReview";
import { useAuth } from "@/hooks/useAuth";
import LoginBanner from "@/components/LoginBanner";
import { useProgress } from "@/hooks/useProgress";
import { modules } from "@/data/modules";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewProgressBar } from "@/components/review/ReviewProgressBar";

const GUEST_CARD: IReviewCard = {
  id: "guest-preview",
  module_id: "small-talk",
  lesson_id: "greetings",
  card_type: "vocab",
  card_front: "How do you say 'Nice to meet you'?",
  card_back: "Mucho gusto — used when meeting someone for the first time.",
  ease_factor: 2.5,
  interval_days: 1,
  repetitions: 0,
  next_review_at: "",
};

const Review = () => {
  const navigate = useNavigate();
  const { isGuest, user } = useAuth();

  const { dueCards, totalCards, loading, reviewCard } = useReview();
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [animatingOut, setAnimatingOut] = useState(false);
  const { nextLesson } = useProgress();

  const continueModule = isGuest || !nextLesson ? modules[0] : nextLesson.module;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cta border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const currentCard = dueCards[0];
  const totalDue = dueCards.length + reviewedCount;
  const hasCards = totalCards > 0;

  const handleRate = async (rating: ReviewRating) => {
    if (!currentCard || animatingOut) return;
    setAnimatingOut(true);
    await reviewCard(currentCard.id, rating);
    setReviewedCount((c) => c + 1);
    setFlipped(false);
    setAnimatingOut(false);
  };

  return (
    <AppLayout>
      <header className="flex items-center gap-3 px-5 pb-4 pt-6 md:mx-auto md:w-full md:max-w-[900px]">
        <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-medium">Review</h1>
          <p className="text-sm text-muted-foreground">
            {totalCards} cards total · {dueCards.length} due now
          </p>
        </div>
      </header>

      <main className="relative px-5 pb-24 md:mx-auto md:w-full md:max-w-[900px]">
        {!user && <LoginBanner className="-top-2" />}

        {/* Progress bar */}
        {totalDue > 0 || isGuest && (
          <ReviewProgressBar reviewedCount={reviewedCount} totalDue={totalDue} />
          // <div className="mb-6">
          //   <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          //     <span>{reviewedCount} reviewed</span>
          //     <span>{dueCards.length} remaining</span>
          //   </div>
          //   <div className="h-2 overflow-hidden rounded-full bg-secondary">
          //     <motion.div
          //       className="h-full rounded-full bg-cta"
          //       initial={{ width: 0 }}
          //       animate={{ width: totalDue > 0 ? `${(reviewedCount / totalDue) * 100}%` : "0%" }}
          //       transition={{ duration: 0.4 }}
          //     />
          //   </div>
          // </div>
        )}

        <AnimatePresence mode="wait">
          {isGuest ? (
            <ReviewCard
              key="guest-preview"
              currentCard={GUEST_CARD}
              setFlipped={() => {}}
              flipped={true}
              handleRate={() => {}}
              animatingOut={false}
            />
          ) : currentCard ? (
            <ReviewCard
              currentCard={currentCard}
              setFlipped={setFlipped}
              flipped={flipped}
              handleRate={handleRate}
              animatingOut={animatingOut}
            />
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              {reviewedCount > 0 ? (
                <>
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/20">
                    <PartyPopper className="h-10 w-10 text-accent" />
                  </div>
                  <h2 className="mb-2 text-2xl font-semibold">All caught up!</h2>
                  <p className="mb-2 max-w-xs text-base text-muted-foreground">
                    You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}. Come back
                    later for more.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-2 text-2xl font-semibold">No cards due</h2>
                  <p className="mb-2 max-w-xs text-base text-muted-foreground">
                    {hasCards
                      ? "All your cards are reviewed. Check back later!"
                      : "Complete lessons to build your review deck. Flashcards from each lesson will appear here automatically."}
                  </p>
                </>
              )}
              <button
                onClick={() => navigate(`/module/${continueModule.id}`)}
                className="mt-6 rounded-xl bg-cta px-8 py-3 text-sm font-semibold text-cta-foreground"
              >
                {hasCards ? "Continue Learning" : "Start Learning"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AppLayout>
  );
};

export default Review;
