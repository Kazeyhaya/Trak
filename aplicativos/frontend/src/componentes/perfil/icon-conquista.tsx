import {
  BookOpen,
  CheckCircle2,
  Clock,
  Film,
  Gamepad2,
  Layers,
  LucideIcon,
  Pencil,
  Star,
  Tv
} from "lucide-react";

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  "check-circle": CheckCircle2,
  film: Film,
  tv: Tv,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  layers: Layers,
  clock: Clock,
  star: Star,
  "edit-3": Pencil
};

export function AchievementIcon({ icon }: { icon: string }) {
  const IconComponent = ACHIEVEMENT_ICONS[icon] || Star;
  return <IconComponent size={20} className="achievement-svg-icon" aria-hidden="true" />;
}
