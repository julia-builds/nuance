import { Bell, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useRef, useEffect } from "react";
import Logo from "@/components/Logo";
import LetterAvatar from "@/components/LetterAvatar";
import { useAuth } from "@/hooks/useAuth";
import LearningPath from "@/components/LearningPath";
import ModuleCard from "@/components/ModuleCard";
import TrendingCard from "@/components/TrendingCard";
import AppLayout from "@/components/AppLayout";
import { modules } from "@/data/modules";
import { articles, videos } from "@/data/content";
import { useProgress } from "@/hooks/useProgress";
import { useNotifications } from "@/hooks/useNotifications";
import imageLesson from "@/assets/44f61677-4fd5-49b3-9fbb-eabbecbad3aa.png";

const Index = () => {
  const navigate = useNavigate();
  const { isGuest, user, profile } = useAuth();
  const { nextLesson } = useProgress();
  const { unreadCount } = useNotifications();
  // const showAvatar = user;
  const showAvatar = !isGuest && user;
  const modulesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = modulesScrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      el.classList.add("scrolling");
      clearTimeout(timeout);
      timeout = setTimeout(() => el.classList.remove("scrolling"), 1000);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      clearTimeout(timeout);
    };
  }, []);


  const continueModule = isGuest || !nextLesson ? modules[0] : nextLesson.module;
  const continueTitle = isGuest ? "Start Learning" : "Continue where you left";
  const continueSubtitle = isGuest ?
    continueModule.lessons[0]?.title ?? continueModule.subtitle :
    nextLesson?.lesson.title ?? continueModule.subtitle;
  const continueDescription = isGuest ?
    continueModule.description :
    `Module ${continueModule.number} · Lesson ${(nextLesson?.lessonIdx ?? 0) + 1}`;

  // Dynamic trending: newest article, second newest article, newest deep dive, newest video
  const trendingItems = useMemo(() => {
    const plainArticles = articles.filter((a) => !a.badge);
    const deepDives = articles.filter((a) => a.badge === "Deep Dive");
    const items: { image: string; badge: string; badgeColor: string; title: string; href: string }[] = [];

    if (plainArticles[0]) items.push({ image: plainArticles[0].image, badge: "Article", badgeColor: "bg-accent", title: plainArticles[0].title, href: plainArticles[0].href });
    if (plainArticles[1]) items.push({ image: plainArticles[1].image, badge: "Article", badgeColor: "bg-accent", title: plainArticles[1].title, href: plainArticles[1].href });
    if (videos[0]) items.push({ image: videos[0].image, badge: "Video", badgeColor: "bg-cta", title: videos[0].title, href: videos[0].href });
    if (deepDives[0]) items.push({ image: deepDives[0].image, badge: "Deep Dive", badgeColor: "bg-vibe-blunt", title: deepDives[0].title, href: deepDives[0].href });

    return items;
  }, []);

  return (
    <AppLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-4 pt-6 md:mx-auto md:w-full md:max-w-[900px]">
        <Logo className="h-8 md:hidden" />
        <div className="flex items-center gap-3 md:ml-auto">
          <button
            onClick={() => navigate("/notifications")}
            className="relative rounded-full bg-card p-2"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showAvatar ? (
            <div onClick={() => navigate("/profile")} className="cursor-pointer">
              <LetterAvatar
                name={profile?.display_name}
                email={user?.email}
                avatarUrl={profile?.avatar_url}
                size="sm"
              />
            </div>
          ) : (
            <div
              onClick={() => navigate("/auth")}
              className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-muted"
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </header>

      <main className="space-y-7 px-5 md:mx-auto md:w-full md:max-w-[900px]">
        <LearningPath />
        
        <section>
          <h2 className="mb-3 text-xl font-medium">{continueTitle}</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
            <img
              alt="Lesson"
              className="h-40 w-full object-cover"
              src={imageLesson}
            />
            <div className="p-4 text-sm">
              <h3 className="mb-1 text-base font-medium">{continueSubtitle}</h3>
              <p className="mb-3 text-base text-muted-foreground lg:text-base">
                {continueDescription}
              </p>
              <button
                onClick={() => navigate(`/module/${continueModule.id}`)}
                className="w-full rounded-xl bg-cta py-3 text-sm font-semibold text-accent-foreground lg:text-base"
              >
                {isGuest ? "Start Learning" : "Continue Learning"}
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-medium">All Modules</h2>
            <span className="text-sm text-muted-foreground lg:text-base">{modules.length}</span>
          </div>
          <div
            ref={modulesScrollRef}
            className="scrollbar-fade -mx-5 flex items-start justify-start gap-3 overflow-x-auto px-5 pb-2"
          >
            {modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-medium">Trending</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1 lg:grid-cols-2">
            {trendingItems.map((item) => (
              <TrendingCard key={item.title} {...item} onClick={() => navigate(item.href)} />
            ))}
          </div>
        </section>
      </main>
    </AppLayout>
  );
};

export default Index;
