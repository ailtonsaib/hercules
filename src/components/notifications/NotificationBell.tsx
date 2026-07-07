import * as React from "react";
import { BellIcon } from "lucide-react";

export function NotificationBell() {
  return (
    <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors">
      <BellIcon className="h-5 w-5" />
      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
    </button>
  );
}
export default NotificationBell;
