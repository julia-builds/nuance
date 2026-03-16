import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { modules } from "@/data/modules";
import type { Module, Lesson } from "@/data/modules";

export type NextLesson = { module: Module; lessonIdx: number; lesson: Lesson } | null;

export interface ActivityEntry {
  id: string;
  activity_type: string;
  module_id: string;
  lesson_id: string | null;
  vibe_score: number | null;
  tone_mode: string | null;
  created_at: string;
}

export interface ProgressData {
  vibeIq: number;
  xp: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  streakDays: number;
  learningLevel: number;
  activeDays: Set<string>; // "YYYY-MM-DD"
  activityLog: ActivityEntry[];
  completedLessons: Set<string>; // lesson ids
  completedModules: Set<string>; // module ids
  loading: boolean;
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 1;
  const unique = [...new Set(dates)].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (unique[0] !== todayStr && unique[0] !== yesterdayStr) return 1;

  let streak = 0;
  const check = unique[0] === todayStr ? new Date(today) : new Date(yesterday);

  for (const dateStr of unique) {
    const checkStr = check.toISOString().slice(0, 10);
    if (dateStr === checkStr) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else if (dateStr < checkStr) {
      break;
    }
  }
  return Math.max(1, streak);
}

export function useProgress() {
  const { user, isGuest } = useAuth();
  const [data, setData] = useState<ProgressData>({
    vibeIq: 0,
    xp: 0,
    lessonsCompleted: 0,
    modulesCompleted: 0,
    streakDays: 0,
    learningLevel: 1,
    activeDays: new Set(),
    activityLog: [],
    completedLessons: new Set(),
    completedModules: new Set(),
    loading: true,
  });

  const fetchAll = useCallback(async () => {
    if (!user) {
      setData((d) => ({ ...d, loading: false }));
      return;
    }

    const [profileRes, activityRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const profile = profileRes.data;
    const activities = (activityRes.data || []) as ActivityEntry[];

    const activeDays = new Set<string>();
    const completedLessons = new Set<string>();
    const completedModules = new Set<string>();

    for (const a of activities) {
      activeDays.add(a.created_at.slice(0, 10));
      if (a.activity_type === "lesson_complete" && a.lesson_id) {
        completedLessons.add(a.lesson_id);
      }
      if (a.activity_type === "module_complete") {
        completedModules.add(a.module_id);
      }
    }

    const streak = computeStreak([...activeDays]);

    // Update streak in DB if changed
    if (profile && streak !== profile.streak_days) {
      await supabase
        .from("profiles")
        .update({
          streak_days: streak,
          last_active_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", user.id);
    }

    // Compute vibe_iq as average of user-input scores from translator & scenarios
    const userVibeScores = activities
      .filter(
        (a) =>
          (a.activity_type === "translation_complete" || a.activity_type === "scenario_complete") &&
          a.vibe_score !== null &&
          a.vibe_score !== undefined,
      )
      .map((a) => a.vibe_score!);
    const averageVibeIq =
      userVibeScores.length > 0
        ? Math.round(userVibeScores.reduce((sum, s) => sum + s, 0) / userVibeScores.length)
        : 0;

    // Update vibe_iq in DB if changed
    if (profile && averageVibeIq !== profile.vibe_iq) {
      await supabase
        .from("profiles")
        .update({
          vibe_iq: averageVibeIq,
        })
        .eq("id", user.id);
    }

    setData({
      vibeIq: averageVibeIq,
      xp: profile?.xp ?? 0,
      lessonsCompleted: profile?.lessons_completed ?? 0,
      modulesCompleted: profile?.modules_completed ?? 0,
      streakDays: streak,
      learningLevel: profile?.learning_level ?? 1,
      activeDays,
      activityLog: activities,
      completedLessons,
      completedModules,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    let active = true;
    const channel = supabase
      .channel("activity-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (active) fetchAll();
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, fetchAll]);
  // useEffect(() => {
  //   if (!user) return;
  //   const channel = supabase
  //     .channel("activity-changes")
  //     .on(
  //       "postgres_changes",
  //       { event: "INSERT", schema: "public", table: "activity_log", filter: `user_id=eq.${user.id}` },
  //       () => fetchAll()
  //     )
  //     .subscribe();
  //   return () => { supabase.removeChannel(channel); };
  // }, [user.id, fetchAll, user]);

  const logActivity = useCallback(
    async (activityType: string, moduleId: string, lessonId?: string, vibeScore?: number) => {
      if (!user) return;

      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type: activityType,
        module_id: moduleId,
        lesson_id: lessonId ?? null,
        vibe_score: vibeScore ?? null,
      });

      // Update profile counters
      const updates: {
        last_active_date: string;
        lessons_completed?: number;
        modules_completed?: number;
        learning_level?: number;
        xp?: number;
      } = {
        last_active_date: new Date().toISOString().slice(0, 10),
      };

      if (activityType === "lesson_complete") {
        updates.lessons_completed = (data.lessonsCompleted || 0) + 1;
        updates.xp = (data.xp || 0) + 25;
      }
      if (activityType === "module_complete") {
        updates.modules_completed = (data.modulesCompleted || 0) + 1;
        updates.xp = (data.xp || 0) + 100;
        // Level up logic: each 2 modules = next level (max 4)
        const newModules = (data.modulesCompleted || 0) + 1;
        updates.learning_level = Math.min(4, Math.floor(newModules / 2) + 1);
      }
      if (
        (activityType === "scenario_complete" || activityType === "translation_complete") &&
        vibeScore
      ) {
        // vibe_iq will be recalculated on next fetchAll via realtime
        updates.xp = (data.xp || 0) + 50;
      }

      await supabase.from("profiles").update(updates).eq("id", user.id);
      // Realtime will trigger fetchAll
    },
    [user, data],
  );

  const nextLesson = useMemo((): NextLesson => {
    if (isGuest || !user) return null;
    for (const mod of modules) {
      for (let i = 0; i < mod.lessons.length; i++) {
        if (!data.completedLessons.has(mod.lessons[i].id)) {
          return { module: mod, lessonIdx: i, lesson: mod.lessons[i] };
        }
      }
    }
    const lastMod = modules[modules.length - 1];
    return { module: lastMod, lessonIdx: lastMod.lessons.length - 1, lesson: lastMod.lessons[lastMod.lessons.length - 1] };
  }, [isGuest, user, data.completedLessons]);

  return { ...data, logActivity, refetch: fetchAll, nextLesson };
}
