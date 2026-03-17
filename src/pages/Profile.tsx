import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import {
  ChevronRight,
  Moon,
  Shield,
  HelpCircle,
  LogOut,
  Award,
  BookOpen,
  Flame,
  Pencil,
  Camera,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/AppLayout";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import LetterAvatar from "@/components/LetterAvatar";
import { modules } from "@/data/modules";
import LoginBanner from "@/components/LoginBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { HeaderPage } from "@/components/HeaderPage";

const LEVEL_NAMES = ["Natural Flow", "The Specialist", "The Collaborator", "The Influencer"];

const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { streakDays, modulesCompleted, vibeIq } = useProgress();
  const showBanner = !user;

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = showBanner
    ? "New User"
    : profile?.display_name || user?.email?.split("@")[0] || "User";
  const displayEmail = showBanner ? "user@example.com" : user?.email;
  const levelName = showBanner
    ? LEVEL_NAMES[0]
    : LEVEL_NAMES[Math.min((profile?.learning_level ?? 1) - 1, 3)];

  const quickStats = [
    {
      icon: Flame,
      label: "Day Streak",
      value: showBanner ? "0" : String(streakDays),
      color: "text-vibe-blunt",
    },
    {
      icon: BookOpen,
      label: "Modules",
      value: showBanner ? `0/${modules.length}` : `${modulesCompleted}/${modules.length}`,
      color: "text-cta",
    },
    {
      icon: Award,
      label: "Vibe IQ",
      value: showBanner ? "0" : String(vibeIq),
      color: "text-accent",
    },
  ];

  const handleEditName = () => {
    setNameValue(profile?.display_name || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed.length > 50) {
      toast.error("Name must be 1-50 characters");
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error("Failed to update name");
    } else {
      toast.success("Name updated");
      setEditingName(false);
      await refreshProfile();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploadingAvatar(true);
    const path = `${user.id}/avatar`;

    // Remove existing avatar first
    await supabase.storage.from("avatars").remove([path]);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Failed to upload image");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    setUploadingAvatar(false);
    if (updateError) {
      toast.error("Failed to save avatar");
    } else {
      toast.success("Profile photo updated");
      await refreshProfile();
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword,
      });

      if (authError) {
        setPasswordError("Incorrect password. Please try again.");
        setDeleting(false);
        return;
      }

      const res = await supabase.functions.invoke("delete-account");

      console.log("DELETE_ACCOUNT_RESPONSE:", res);

      if (res.error) throw res.error;
      await signOut();

      toast.success("Account deleted");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeletePassword("");
      setPasswordError("");
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    // setShowAvatarMenu(false);
  };

  return (
    <AppLayout>
      <HeaderPage handleBack={() => navigate("/")} title="Profile" />

      <main className="space-y-6 overflow-hidden px-5 pb-8 md:mx-auto md:w-full md:max-w-[900px]">
        <div className="relative flex-1">
          {showBanner && <LoginBanner className="-top-2" />}

          <section className="flex flex-col items-center pb-6 pt-2 text-center">
            <div className="group relative mb-3 pb-[16px]">
              <div
                className="cursor-pointer rounded-full md:cursor-default"
                onClick={() => {
                  if (window.innerWidth < 768 && !showBanner) {
                    setShowAvatarMenu((v) => !v);
                  }
                }}
              >
                <LetterAvatar
                  name={showBanner ? "U" : profile?.display_name}
                  email={showBanner ? undefined : user?.email}
                  avatarUrl={showBanner ? undefined : profile?.avatar_url}
                  size="lg"
                />
              </div>
              {!showBanner && (
                <>
                  {/* Desktop: centered edit overlay on hover */}
                  <button
                    onClick={() => setShowAvatarMenu((v) => !v)}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 m-auto hidden h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-md transition-opacity disabled:opacity-50 group-hover:opacity-100 md:flex"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {showAvatarMenu && (
                    <div className="absolute -bottom-20 left-1/2 z-10 min-w-[160px] -translate-x-1/2 rounded-xl border border-border bg-card py-1 shadow-lg">
                      <button
                        onClick={() => {
                          setShowAvatarMenu(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        Upload photo
                      </button>
                      {profile?.avatar_url && (
                        <button
                          onClick={async () => {
                            setShowAvatarMenu(false);
                            if (!user) return;
                            setUploadingAvatar(true);
                            await supabase.storage.from("avatars").remove([`${user.id}/avatar`]);
                            const { error } = await supabase
                              .from("profiles")
                              .update({ avatar_url: null })
                              .eq("id", user.id);
                            setUploadingAvatar(false);
                            if (error) {
                              toast.error("Failed to remove photo");
                            } else {
                              toast.success("Photo removed");
                              await refreshProfile();
                            }
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-muted"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove photo
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {editingName ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={50}
                  autoFocus
                  placeholder="Enter your name"
                  className="w-48 rounded-lg border border-border bg-muted px-3 py-1.5 text-center text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />

                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="rounded-lg bg-cta px-3 py-1.5 text-sm font-medium text-cta-foreground disabled:opacity-50"
                >
                  {savingName ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-semibold">{displayName}</h2>
                  {!showBanner && (
                    <button
                      onClick={handleEditName}
                      className="rounded-full p-1 transition-colors hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {!showBanner && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    This name appears on the leaderboard and in your activity
                  </p>
                )}
              </div>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">{displayEmail}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
              <Award className="h-[16px] w-[16px]" />
              {levelName}
            </span>
          </section>

          <section className="grid grid-cols-3 gap-3">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-2xl bg-card p-4 text-center shadow-sm"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-xl font-semibold">{stat.value}</span>
                <span className="mt-0.5 text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Preferences
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
            {/* <div className="w-full flex items-center gap-3 px-4 py-3.5">
              <Bell className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium">Notifications</span>
              <Switch />
            </div> */}
            <div className="flex w-full items-center gap-3 px-4 py-3.5">
              <Moon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Dark Mode</span>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
            {/* <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors">
              <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium">Language</span>
              <span className="text-xs text-muted-foreground mr-1">English</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button> */}
          </div>
        </section>
        {/* <<==================== Privacy & Security Help & Support ======================>> */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
            <button
              onClick={() => handleNavigate("/privacy")}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
            >
              <Shield className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Privacy & Security</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleNavigate("/help")}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
            >
              <HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Help & Support</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {!showBanner && (
          <section className="space-y-3">
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </section>
        )}

        <p className="pb-2 text-center text-xs text-muted-foreground">
          Nuance v1.0 · Career Playbook
        </p>
      </main>

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePassword("");
            setPasswordError("");
          }
          setShowDeleteDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your progress, streaks, and data will be permanently
              deleted. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <PasswordInput
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setPasswordError("");
              }}
              placeholder="Enter your password"
              disabled={deleting}
            />
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword}
            >
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Profile;
