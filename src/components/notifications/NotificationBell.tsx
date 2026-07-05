import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "convex/react";
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";

type Notification = Doc<"notifications">;

function NotificationItem({ notif, onRead, onDelete }: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const Icon = notif.type === "success" ? CheckCircle2 : notif.type === "warning" ? AlertTriangle : Info;
  const iconColor = notif.type === "success"
    ? "text-emerald-500"
    : notif.type === "warning"
    ? "text-orange-500"
    : "text-blue-500";
  const bgColor = notif.type === "success"
    ? "bg-emerald-50 dark:bg-emerald-950/20"
    : notif.type === "warning"
    ? "bg-orange-50 dark:bg-orange-950/20"
    : "bg-blue-50 dark:bg-blue-950/20";

  const handleClick = () => {
    onRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        "flex gap-3 p-3 rounded-xl cursor-pointer transition-colors group",
        notif.read ? "bg-muted/30 hover:bg-muted/60" : `${bgColor} hover:opacity-90`
      )}
      onClick={handleClick}
    >
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", notif.read ? "bg-muted" : "bg-white/80 dark:bg-black/20")}>
        <Icon className={cn("w-4 h-4", notif.read ? "text-muted-foreground" : iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", notif.read && "text-muted-foreground")}>{notif.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.message}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
        title="Remover"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </motion.div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = useQuery(api.notifications.list, {});
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const remove = useMutation(api.notifications.remove);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const handleRead = (id: string) => {
    void markRead({ notificationId: id as Parameters<typeof markRead>[0]["notificationId"] });
  };
  const handleDelete = (id: string) => {
    void remove({ notificationId: id as Parameters<typeof remove>[0]["notificationId"] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" as const }}
      className="fixed right-2 top-16 w-[320px] max-w-[calc(100vw-1rem)] bg-popover border rounded-2xl shadow-2xl z-[9999] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="font-bold text-sm">Notificações</span>
          {unreadCount > 0 && (
            <Badge className="text-xs px-1.5 py-0 h-5 bg-blue-500 text-white">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => void markAllRead({})}
            >
              <CheckCheck className="w-3 h-3" />
              Marcar todas
            </Button>
          )}
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto p-2 space-y-1">
        {notifications === undefined ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif) => (
              <NotificationItem
                key={notif._id}
                notif={notif}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {notifications && notifications.length > 0 && (
        <div className="px-4 py-2 border-t">
          <button
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            onClick={() => {
              notifications.forEach((n) => handleDelete(n._id));
            }}
          >
            <Trash2 className="w-3 h-3" />
            Limpar todas
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useQuery(api.notifications.countUnread, {});

  return (
    <Authenticated>
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          className="relative w-8 h-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={() => setOpen((v) => !v)}
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        <AnimatePresence>
          {open && <NotificationPanel onClose={() => setOpen(false)} />}
        </AnimatePresence>
        {/* Backdrop */}
        {open && (
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
        )}
      </div>
    </Authenticated>
  );
}
