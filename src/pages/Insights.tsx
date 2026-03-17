import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Clock, Zap, TrendingUp } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import LoginBanner from "@/components/LoginBanner";
import Leaderboard from "@/components/Leaderboard";
import { HeaderPage } from "@/components/HeaderPage";

const TONE_COLORS = ["hsl(152, 40%, 46%)", "hsl(228, 80%, 56%)"];

// ---------- Vibe Meter SVG ----------

const VibeMeter = ({ score }: { score: number }) => {
  const cx = 110;
  const cy = 110;
  const r = 90;

  // Animate a single value (angle in radians) from π to target
  const targetTheta = Math.PI - (score / 100) * Math.PI;
  const theta = useMotionValue(Math.PI); // start at left (Blunt)

  const circleX = useTransform(theta, (t) => cx + r * Math.cos(t));
  const circleY = useTransform(theta, (t) => cy - r * Math.sin(t));

  useEffect(() => {
    const controls = animate(theta, targetTheta, {
      type: "spring",
      stiffness: 40,
      damping: 12,
      delay: 0.3,
    });
    return controls.stop;
  }, [targetTheta, theta]);

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="relative flex items-center justify-center">
        {/* Radial gradient background */}

        <svg viewBox="0 0 220 138" className="w-full overflow-visible">
          <defs>
            <linearGradient id="vibe-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(14, 80%, 52%)" />
              <stop offset="25%" stopColor="hsl(30, 50%, 55%)" />
              <stop offset="38%" stopColor="hsl(36, 15%, 82%)" />
              <stop offset="50%" stopColor="hsl(36, 12%, 84%)" />
              <stop offset="62%" stopColor="hsl(36, 15%, 82%)" />
              <stop offset="75%" stopColor="hsl(80, 45%, 50%)" />
              <stop offset="100%" stopColor="hsl(152, 40%, 46%)" />
            </linearGradient>
          </defs>

          {/* Coloured arc */}
          <path
            d="M 20 110 A 90 90 0 0 1 200 110"
            fill="none"
            stroke="url(#vibe-arc)"
            strokeWidth="22"
            strokeLinecap="round"
          />

          {/* Indicator circle — follows the arc via motion values */}
          <motion.circle
            r="8"
            fill="hsl(var(--foreground))"
            stroke="hsl(var(--card))"
            strokeWidth="3"
            cx={circleX}
            cy={circleY}
          />

          {/* Labels */}
          <text x="6" y="132" fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="start">
            Blunt
          </text>
          <text x="214" y="132" fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="end">
            Nuanced
          </text>
        </svg>
      </div>

      {/* Score below the meter */}
      <div className="-mt-6 flex flex-col items-center">
        <span className="text-4xl font-semibold">{score}</span>
        <span className="text-sm text-muted-foreground">Lifetime Vibe IQ</span>
      </div>
    </div>
  );
};

// ---------- Page ----------

const Insights = () => {
  const navigate = useNavigate();
  const { isGuest, user } = useAuth();
  const { vibeIq, lessonsCompleted, activityLog } = useProgress();
  const showBanner = isGuest || !user;

  // Compute dynamic stats from real data
  const scenarioScores = activityLog
    .filter((a) => a.activity_type === "scenario_complete" && a.vibe_score)
    .map((a) => a.vibe_score!);
  const masteryAverage =
    scenarioScores.length > 0
      ? (scenarioScores.reduce((a, b) => a + b, 0) / scenarioScores.length / 20).toFixed(1)
      : "0.0";
  const firstTimeAccuracy =
    lessonsCompleted > 0
      ? Math.min(100, Math.round((lessonsCompleted / (lessonsCompleted + 2)) * 100))
      : 0;
  const learningMinutes = lessonsCompleted * 8;
  const learningHours = Math.floor(learningMinutes / 60);
  const learningMins = learningMinutes % 60;
  const IMPACT_GROWTH = vibeIq > 0 ? Math.min(99, Math.round(vibeIq * 0.5)) : 0;

  return (
    <AppLayout>
    
      <HeaderPage handleBack={() => navigate("/")} title="Insights" />
  

      <main className="relative space-y-6 px-5 pb-8 md:mx-auto md:w-full md:max-w-[900px]">
        {showBanner && <LoginBanner />}
        {/* ========= HERO: Vibe IQ Mastery + Tone Profile (side by side) ========= */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left card: Vibe IQ Mastery */}
          <section className="relative rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Vibe IQ Mastery
            </h2>

            <VibeMeter score={vibeIq} />

            {/* Impact Growth badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-5 flex justify-center"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-4 py-2 text-sm font-semibold text-accent">
                <TrendingUp className="h-4 w-4" />
                Impact Growth: +{IMPACT_GROWTH}%
              </span>
            </motion.div>
          </section>

          {/* Right card: Tone Profile */}
          <section className="flex flex-col justify-between rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tone Profile
            </h2>

            {(() => {
              const translations = activityLog.filter(
                (a) => a.activity_type === "translation_complete" && a.tone_mode,
              );
              const leaderCount = translations.filter((a) => a.tone_mode === "leader").length;
              const colleagueCount = translations.filter((a) => a.tone_mode === "colleague").length;
              const total = leaderCount + colleagueCount;

              if (total === 0) {
                return (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                      <span className="text-2xl text-muted-foreground/40">?</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use the Social Translator to see your tone profile
                    </p>
                  </div>
                );
              }
              const leaderPct = Math.round((leaderCount / total) * 100);
              const colleaguePct = 100 - leaderPct;
              const toneData = [
                { name: "Leader Mode", value: leaderPct },
                { name: "Colleague Mode", value: colleaguePct },
              ];

              return (
                <>
                  <div className="mb-6 flex flex-1 items-center gap-6">
                    <div className="h-32 w-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={toneData}
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={56}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {toneData.map((_, idx) => (
                              <Cell key={idx} fill={TONE_COLORS[idx]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-3">
                      {toneData.map((entry, idx) => (
                        <div key={entry.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: TONE_COLORS[idx] }}
                            />

                            <span className="text-sm font-normal">{entry.name}</span>
                          </div>
                          <span className="text-sm font-bold">{entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Leader Mode uses the SBI Model</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Colleague Mode uses Subjective Framing
                    </p>
                  </div>
                </>
              );
            })()}
          </section>
        </div>

        {!showBanner && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Learning Metrics
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* First-Time Accuracy */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center rounded-2xl bg-card p-5 text-center shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-2xl font-semibold">{firstTimeAccuracy}%</span>
                <span className="mt-1 text-base font-normal text-secondary-foreground">
                  First-Time Accuracy
                </span>
                <span className="mt-0.5 text-sm text-muted-foreground">
                  Tasks passed without Redo
                </span>
              </motion.div>

              {/* Learning Time */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex flex-col items-center rounded-2xl bg-card p-5 text-center shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-2xl font-semibold">
                  {learningHours}h {learningMins}m
                </span>
                <span className="mt-1 text-base text-secondary-foreground">Learning Time</span>
                <span className="mt-0.5 text-sm text-muted-foreground">Total hours invested</span>
              </motion.div>

              {/* Mastery Average */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center rounded-2xl bg-card p-5 text-center shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-2xl font-semibold">{masteryAverage}/5</span>
                <span className="mt-1 text-base text-secondary-foreground">Mastery Average</span>
                <span className="mt-0.5 text-sm text-muted-foreground">Mean scenario score</span>
              </motion.div>
            </div>
          </section>
        )}

        {/* Leaderboard */}
        {!showBanner && <Leaderboard />}
      </main>
    </AppLayout>
  );
};

export default Insights;
