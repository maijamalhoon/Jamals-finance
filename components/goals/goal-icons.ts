import {
  Briefcase,
  Car,
  GraduationCap,
  Heart,
  Home,
  Plane,
  Shield,
  ShoppingBag,
  Smartphone,
  Target,
  type LucideIcon,
} from "lucide-react";

export const GOAL_ICONS: { value: string; label: string; icon: LucideIcon }[] =
  [
    { value: "home", label: "House", icon: Home },
    { value: "shield", label: "Emergency", icon: Shield },
    { value: "car", label: "Car", icon: Car },
    { value: "plane", label: "Travel", icon: Plane },
    { value: "graduation", label: "Education", icon: GraduationCap },
    { value: "heart", label: "Health", icon: Heart },
    { value: "briefcase", label: "Business", icon: Briefcase },
    { value: "smartphone", label: "Electronics", icon: Smartphone },
    { value: "shopping", label: "Shopping", icon: ShoppingBag },
    { value: "target", label: "Other", icon: Target },
  ];
