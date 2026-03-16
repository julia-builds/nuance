import { useNavigate, Link } from "react-router-dom";
import { useRef } from "react";
import { CircleGauge, Route, Flame } from "lucide-react";
import Logo from "@/components/Logo";
import LetterAvatar from "@/components/LetterAvatar";
import heroShowcase from "@/assets/hero-showcase.png";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import AnimatedGrid from "@/components/AnimatedGrid";

const Landing = () => {
  const navigate = useNavigate();
  const { enterGuestMode, user, profile } = useAuth();
  const showcaseRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: showcaseRef,
    offset: ["start end", "end start"],
  });

  const rawTilt = useTransform(scrollYProgress, [0, 0.6], [20, 0]);
  const tilt = useSpring(rawTilt, { stiffness: 80, damping: 30 });

  const features = [
    {
      icon: CircleGauge,
      title: "Social Translator & Vibe Meter",
      description: "Turn your raw thoughts into polished professional business communication",
    },
    {
      icon: Route,
      title: "4-Level Learning Path",
      description:
        "Progress from Natural Flow to Influencer with structured career communication modules.",
    },
    {
      icon: Flame,
      title: "Daily Streaks",
      description: "Build consistency and momentum with daily learning goals and streaks.",
    },
  ];

  const handleGuest = () => {
    enterGuestMode();
    navigate("/dashboard");
  };
 
  return (
    <motion.div
      className="min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo className="h-8" />
        {user ? (
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-sm font-medium text-foreground transition-opacity hover:opacity-80"
          >
            <LetterAvatar
              name={profile?.display_name}
              email={user.email}
              avatarUrl={profile?.avatar_url}
              size="sm"
            />
          </button>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </button>
        )}
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-3xl overflow-hidden px-6 pb-16 pt-12 text-center">
        {/* Notebook grid texture - full width, faded at edges */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 -left-[50vw] -right-[50vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 50% 80% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 80% at 50% 50%, black 30%, transparent 100%)",
          }}
        >
          <AnimatedGrid />
        </motion.div>
        <motion.span
          className="relative mb-4 inline-block rounded-full border border-cta/20 bg-cta/10 px-4 py-1.5 text-xs font-medium text-cta"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The #1 Communication Tool for Business English Learners
        </motion.span>
        <motion.h1
          className="relative mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Speak with Impact. <span className="text-cta">Lead with Nuance.</span>
        </motion.h1>
        <motion.p
          className="relative mx-auto mb-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          You've mastered the basics. Now, master the nuance. Refactor your business communication
          to lead, influence, and impact.
        </motion.p>
        <motion.div
          className="relative flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <button
            onClick={() => navigate("/auth")}
            className="rounded-xl bg-cta px-8 py-3 text-base font-semibold text-cta-foreground shadow-md transition-opacity hover:opacity-90"
          >
            Join Nuance
          </button>
          <button
            onClick={handleGuest}
            className="rounded-xl border border-border bg-card px-8 py-3 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted/50"
          >
            {user ? "To my Dashboard" : "Try as Guest"}
          </button>
        </motion.div>
      </section>

      {/* Product Showcase */}
      <section ref={showcaseRef} className="mx-auto max-w-4xl px-6 pb-16">
        {/* Perspective on parent creates the 3D context for the child rotateX */}
        <div style={{ perspective: "1200px" }}>
          <motion.div
            className="overflow-hidden rounded-2xl border border-border/50"
            style={{
              rotateX: tilt,
              transformOrigin: "bottom center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <img
              src={heroShowcase}
              alt="Nuance app interface"
              className="h-auto w-full shadow-none"
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/30 bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cta/10">
                <f.icon className="h-5 w-5 text-cta" />
              </div>
              <h3 className="mb-2 text-base font-medium">{f.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section with notebook texture */}
      <section className="relative mx-auto mb-16 w-full max-w-5xl overflow-hidden px-6 pb-20 pt-16 text-center">
        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-[50vw] -right-[50vw]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 50% 80% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 80% at 50% 50%, black 30%, transparent 100%)",
          }}
        >
          <AnimatedGrid />
        </div>
        <h2 className="relative mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
          Ready to level up your communication?
        </h2>
        <Link
          to="/auth"
          className="relative inline-block rounded-2xl bg-cta px-12 py-4 text-base font-semibold text-cta-foreground shadow-md transition-opacity hover:opacity-90"
        >
          Join Nuance
        </Link>
      </section>

      <Footer />
    </motion.div>
  );
};

export default Landing;
