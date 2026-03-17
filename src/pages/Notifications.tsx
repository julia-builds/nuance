import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Trash2,
  Bell,
  Trophy,
  Flame,
  BookOpen,
  Sparkles,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/AppLayout";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import LoginBanner from "@/components/LoginBanner";

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  flame: Flame,
  book: BookOpen,
  sparkles: Sparkles,
  info: Info,
};

const typeColorMap: Record<string, string> = {
  welcome: "bg-accent/15 text-accent",
  progress: "bg-cta/15 text-cta",
  streak: "bg-vibe-blunt/15 text-vibe-blunt",
  lesson: "bg-primary/15 text-primary",
  level_up: "bg-accent/15 text-accent",
  info: "bg-muted text-muted-foreground",
};

const NotificationItem = ({
  notification,
  onRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (link: string) => void;
}) => {
  const Icon = iconMap[notification.icon] || Info;
  const colorClass = typeColorMap[notification.type] || typeColorMap.info;

  return (
    <div
      className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50 ${
        !notification.is_read ? "bg-accent/5" : ""
      }`}
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
        if (notification.link) onNavigate(notification.link);
      }}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-base font-medium ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}
          >
            {notification.title}
          </p>
          {!notification.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-sm text-muted-foreground/60">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  return (
    <AppLayout>
      <header className="flex items-center gap-3 px-5 pb-4 pt-6 md:mx-auto md:w-full md:max-w-[900px]">
        <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent/80"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </header>

      <main className="relative px-5 pb-8 md:mx-auto md:w-full md:max-w-[900px]">
        {!user && <LoginBanner className="-top-2 mb-4" />}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">No notifications yet</h2>
            <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
              Complete lessons and hit milestones to receive updates here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={(link) => navigate(link)}
              />
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default Notifications;
