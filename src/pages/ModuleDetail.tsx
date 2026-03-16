import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, PartyPopper, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { modules } from "@/data/modules";
import AppLayout from "@/components/AppLayout";
import FillGapExercise from "@/components/FillGapExercise";
import FlashcardExercise from "@/components/FlashcardExercise";
import WordOrderExercise from "@/components/WordOrderExercise";
import ScenarioExercise from "@/components/ScenarioExercise";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { useReview } from "@/hooks/useReview";
import { storageGet, storageSet, storageRemove } from "@/lib/storage";

type View =
  | "overview"
  | "lesson"
  | "flashcards"
  | "exercise"
  | "word-order"
  | "scenario"
  | "complete";

type ProgressState = { view: View; lessonIdx: number };

const ModuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logActivity, completedLessons } = useProgress();
  const { seedCardsForLesson } = useReview();

  const storageKey = `nuance-progress-${id}`;
  const saved = storageGet<ProgressState>(storageKey);

  const [view, setViewState] = useState<View>(saved?.view ?? "overview");
  const [activeLessonIdx, setActiveLessonIdxState] = useState(saved?.lessonIdx ?? 0);

  const persistProgress = (v: View, idx: number) => {
    storageSet<ProgressState>(storageKey, { view: v, lessonIdx: idx });
  };

  const setView = (v: View) => {
    setViewState(v);
    persistProgress(v, activeLessonIdx);
  };

  const setActiveLessonIdx = (idx: number) => {
    setActiveLessonIdxState(idx);
    persistProgress(view, idx);
  };

  const module = modules.find((m) => m.id === id);
  if (!module) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Module not found</p>
      </div>
    );
  }

  const lesson = module.lessons[activeLessonIdx];
  const exercise = lesson?.exercises?.[0];
  const currentModuleIdx = modules.findIndex((m) => m.id === id);
  const nextModule = modules[currentModuleIdx + 1];

  // Determine next view after current step
  const getNextAfterLesson = () => {
    if (lesson?.flashcards?.length) return "flashcards";
    if (exercise) return "exercise";
    if (lesson?.wordOrderExercise) return "word-order";
    return "scenario";
  };

  const getNextAfterFlashcards = () => {
    if (exercise) return "exercise";
    if (lesson?.wordOrderExercise) return "word-order";
    return "scenario";
  };

  const getNextAfterExercise = () => {
    if (lesson?.wordOrderExercise) return "word-order";
    return "scenario";
  };

  const handleBack = () => {
    if (view === "overview") navigate("/dashboard");
    else if (view === "flashcards") setView("lesson");
    else if (view === "exercise") {
      setView(lesson?.flashcards?.length ? "flashcards" : "lesson");
    } else if (view === "word-order") {
      setView(exercise ? "exercise" : lesson?.flashcards?.length ? "flashcards" : "lesson");
    } else if (view === "scenario") setView("lesson");
    else setView("overview");
  };

  const handleFlashcardsComplete = () => {
    setView(getNextAfterFlashcards() as View);
  };

  const handleExerciseComplete = async () => {
    if (user) {
      await logActivity("exercise_complete", module.id, lesson?.id);
    }
    setView(getNextAfterExercise() as View);
  };

  const handleWordOrderComplete = async () => {
    if (user) {
      await logActivity("exercise_complete", module.id, lesson?.id);
    }
    setView("scenario");
  };

  const handleScenarioComplete = async (vibeScore: number) => {
    if (user) {
      await logActivity("scenario_complete", module.id, undefined, vibeScore);

      if (vibeScore >= 50 && lesson) {
        await logActivity("lesson_complete", module.id, lesson.id);
        // Seed flashcards into spaced repetition deck
        await seedCardsForLesson(module.id, lesson.id);
      }

      const allDone = module.lessons.every(
        (l) => completedLessons.has(l.id) || l.id === lesson?.id,
      );
      if (allDone && vibeScore >= 50) {
        await logActivity("module_complete", module.id);
      }
    }
    storageRemove(storageKey);
    setViewState("complete");
  };

  return (
    <AppLayout>
      <header className="flex items-center gap-3 px-5 pb-4 pt-6 md:mx-auto md:w-full md:max-w-[900px]">
        <button onClick={handleBack} className="-ml-2 rounded-full p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Module {module.number}</p>
          <h1 className="text-lg font-medium text-muted-foreground">{module.title}</h1>
        </div>
      </header>

      <main className="px-5 md:mx-auto md:w-full md:max-w-[900px]">
        <AnimatePresence mode="wait">
          {view === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="mb-2 text-2xl font-medium">{module.subtitle}</h2>
              <p className="mb-6 text-base text-muted-foreground">{module.description}</p>

              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Lessons
              </h3>
              <div className="space-y-2">
                {module.lessons.map((l, i) => {
                  const isDone = completedLessons.has(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        setActiveLessonIdx(i);
                        setView("lesson");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl bg-card p-4 shadow-sm ${isDone ? "opacity-75" : ""}`}
                    >
                      <div className="flex-1 text-left">
                        <p className="text-base font-medium">
                          {module.number}.{i + 1} — {l.title}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {l.flashcards?.length ? `${l.flashcards.length} flashcards · ` : ""}
                          {l.phrases.length} phrases · {l.coachingNotes.length} coaching notes
                        </p>
                      </div>
                      {isDone ? (
                        <Check
                          className="ml-2 h-4 w-4 shrink-0 text-foreground/70"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>

              <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Final Challenge
              </h3>
              <button
                onClick={() => setView("scenario")}
                className="flex w-full items-center justify-between rounded-xl border border-accent/20 bg-accent/10 p-4"
              >
                <div className="text-left">
                  <p className="text-base font-medium">{module.scenarioExercise.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Situational exercise with Vibe Meter
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-accent" />
              </button>
            </motion.div>
          )}

          {view === "lesson" && lesson && (
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="mb-2 text-2xl font-medium">{lesson.title}</h2>

              <p className="mb-6 text-base leading-relaxed text-muted-foreground">{lesson.intro}</p>

              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Useful Phrases
              </h3>
              <div className="mb-6 space-y-3">
                {lesson.phrases.map((p, i) => (
                  <div key={i} className="rounded-xl bg-card p-4 shadow-sm">
                    <p className="mb-1 text-base font-medium">{p.phrase}</p>
                    <p className="text-base text-muted-foreground">{p.usage}</p>
                  </div>
                ))}
              </div>

              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Coaching Notes
              </h3>
              <div className="mb-6 space-y-3">
                {lesson.coachingNotes.map((note, i) => (
                  <div key={i} className="rounded-xl border border-accent/20 bg-accent/10 p-4">
                    <p className="text-base leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>

              {lesson.situation && (
                <div className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Scenario
                  </h3>
                  <div className="glass-dark rounded-2xl p-5 text-glass-foreground">
                    <p className="mb-2 text-base font-bold tracking-wider text-accent">
                      {lesson.situation.title}
                    </p>
                    <p className="mb-4 text-base leading-relaxed opacity-90">
                      {lesson.situation.prompt}
                    </p>
                    <details className="group">
                      <summary className="text-s cursor-pointer font-semibold text-accent">
                        Show coaching response
                      </summary>
                      <p className="mt-3 border-t border-glass-foreground/10 pt-3 text-base leading-relaxed opacity-80">
                        {lesson.situation.coachingResponse}
                      </p>
                    </details>
                  </div>
                </div>
              )}

              <button
                onClick={() => setView(getNextAfterLesson() as View)}
                className="w-full rounded-xl bg-cta py-3.5 text-sm font-semibold text-cta-foreground"
              >
                {lesson.flashcards?.length
                  ? "Start Flashcards"
                  : exercise
                    ? "Practice Exercises"
                    : "Go to Final Challenge"}
              </button>
            </motion.div>
          )}

          {view === "flashcards" && lesson?.flashcards && (
            <FlashcardExercise cards={lesson.flashcards} onComplete={handleFlashcardsComplete} />
          )}

          {view === "exercise" && exercise && (
            <FillGapExercise exercise={exercise} onComplete={handleExerciseComplete} />
          )}

          {view === "word-order" && lesson?.wordOrderExercise && (
            <WordOrderExercise
              instruction={lesson.wordOrderExercise.instruction}
              items={lesson.wordOrderExercise.items}
              onComplete={handleWordOrderComplete}
            />
          )}

          {view === "scenario" && (
            <ScenarioExercise
              moduleTitle={module.title}
              moduleNumber={module.number}
              scenario={module.scenarioExercise}
              onComplete={(vibeScore) => handleScenarioComplete(vibeScore)}
            />
          )}

          {view === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/20">
                <PartyPopper className="h-10 w-10 text-accent" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">Module Complete!</h2>
              <p className="mb-8 max-w-xs text-base text-muted-foreground">
                Great work on {module.title}. You're building real communication skills.
              </p>
              {nextModule ? (
                <button
                  onClick={() => {
                    navigate(`/module/${nextModule.id}`);
                    setView("overview");
                    setActiveLessonIdx(0);
                  }}
                  className="w-full rounded-xl bg-cta py-3.5 text-base font-semibold text-cta-foreground"
                >
                  Next Module: {nextModule.title}
                </button>
              ) : (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground"
                >
                  Back to Home
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AppLayout>
  );
};

export default ModuleDetail;
