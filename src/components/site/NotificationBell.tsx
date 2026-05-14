import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const unread = items.filter((n: any) => !n.read_at).length;

  const markAll = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}>
              <Check className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="p-6 text-center text-xs text-muted-foreground">No notifications yet</p>
          )}
          {items.map((n: any) => (
            <Link
              key={n.id}
              to={n.link ?? "/dashboard"}
              onClick={() => setOpen(false)}
              className={`block border-b border-border p-3 text-sm last:border-0 hover:bg-muted/50 ${!n.read_at ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{n.title}</span>
                {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
              {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("en-AU")}
              </p>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
