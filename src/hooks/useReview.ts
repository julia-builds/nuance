import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { modules } from "@/data/modules";

export interface IReviewCard {
  id: string;
  module_id: string;
  lesson_id: string;
  card_type: string;
  card_front: string;
  card_back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

function computeNextReview(
  card: IReviewCard,
  rating: ReviewRating,
): { ease_factor: number; interval_days: number; repetitions: number; next_review_at: string } {
  const qualityMap: Record<ReviewRating, number> = { again: 0, hard: 2, good: 4, easy: 5 };
  const q = qualityMap[rating];

  let ef = card.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ef = Math.max(1.3, ef);

  let interval: number;
  let reps: number;

  if (q < 3) {
    // Reset
    reps = 0;
    interval = 1;
  } else {
    reps = card.repetitions + 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(card.interval_days * ef);
  }

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    ease_factor: ef,
    interval_days: interval,
    repetitions: reps,
    next_review_at: next.toISOString(),
  };
}

export function useReview() {
  const { user } = useAuth();
  const { completedLessons, completedModules, loading: progressLoading } = useProgress();
  const [dueCards, setDueCards] = useState<IReviewCard[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const fetchDueCards = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();
    const [dueRes, totalRes] = await Promise.all([
      supabase
        .from("review_cards")
        .select("*")
        .eq("user_id", user.id)
        .lte("next_review_at", now)
        .order("next_review_at", { ascending: true })
        .limit(50),
      supabase
        .from("review_cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    setDueCards((dueRes.data as IReviewCard[]) || []);
    setTotalCards(totalRes.count || 0);
    setLoading(false);
  }, [user]);

  // Auto-seed cards from all already-completed lessons on first load
  useEffect(() => {
    if (!user || progressLoading || seeded) return;
    const seedAll = async () => {
      const allCards: {
        user_id: string;
        module_id: string;
        lesson_id: string;
        card_type: string;
        card_front: string;
        card_back: string;
      }[] = [];
      for (const mod of modules) {
        for (const lesson of mod.lessons) {
          if (!lesson.flashcards?.length) continue;
          // Seed if the lesson is completed OR the whole module is completed
          if (completedLessons.has(lesson.id) || completedModules.has(mod.id)) {
            for (const fc of lesson.flashcards) {
              allCards.push({
                user_id: user.id,
                module_id: mod.id,
                lesson_id: lesson.id,
                card_type: "flashcard",
                card_front: fc.front,
                card_back: fc.back,
              });
            }
          }
        }
      }
      if (allCards.length > 0) {
        // Batch upsert in chunks of 50
        for (let i = 0; i < allCards.length; i += 50) {
          await supabase.from("review_cards").upsert(allCards.slice(i, i + 50), {
            onConflict: "user_id,lesson_id,card_front",
            ignoreDuplicates: true,
          });
        }
        await fetchDueCards();
      }
      setSeeded(true);
    };
    seedAll();
  }, [user, progressLoading, completedLessons, completedModules, seeded, fetchDueCards]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  const reviewCard = useCallback(
    async (cardId: string, rating: ReviewRating) => {
      const card = dueCards.find((c) => c.id === cardId);
      if (!card || !user) return;

      const updates = computeNextReview(card, rating);

      await supabase
        .from("review_cards")
        .update({ ...updates, last_reviewed_at: new Date().toISOString() })
        .eq("id", cardId);

      setDueCards((prev) => prev.filter((c) => c.id !== cardId));
    },
    [dueCards, user],
  );

  const seedCardsForLesson = useCallback(
    async (moduleId: string, lessonId: string) => {
      if (!user) return;

      const mod = modules.find((m) => m.id === moduleId);
      const lesson = mod?.lessons.find((l) => l.id === lessonId);
      if (!lesson?.flashcards?.length) return;

      const cards = lesson.flashcards.map((fc) => ({
        user_id: user.id,
        module_id: moduleId,
        lesson_id: lessonId,
        card_type: "flashcard",
        card_front: fc.front,
        card_back: fc.back,
      }));

      // Upsert — ignore duplicates via unique index
      await supabase.from("review_cards").upsert(cards, {
        onConflict: "user_id,lesson_id,card_front",
        ignoreDuplicates: true,
      });
    },
    [user],
  );

  return { dueCards, totalCards, loading, reviewCard, seedCardsForLesson, refetch: fetchDueCards };
}
