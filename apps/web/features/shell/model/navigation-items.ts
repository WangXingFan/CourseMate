import { BookOpen } from "@/components/animate-ui/icons/book-open";
import { Blocks } from "@/components/animate-ui/icons/blocks";
import { MessageCircleMore } from "@/components/animate-ui/icons/message-circle-more";
import { Search } from "@/components/animate-ui/icons/search";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { PlusIcon } from "@/components/ui/plus";
import type { NavigationItem } from "@/features/shell/types/navigation";
import { House, BarChart3, ClipboardList, Download, FlaskConical, LibraryBig, Shuffle, Video } from "lucide-react";

export const NAVIGATION_ITEMS = [
  { id: "dashboard", kind: "link", href: "/dashboard", icon: House, group: "secondary" },
  {
    id: "newChat",
    kind: "command",
    icon: PlusIcon,
    variant: "primary",
    group: "primary",
    shortcut: ["command", "shift", "O"],
  },
  {
    id: "search",
    kind: "command",
    icon: Search,
    group: "primary",
    shortcut: ["command", "K"],
  },
  {
    id: "recent",
    kind: "link",
    href: "/recent",
    icon: MessageCircleMore,
    group: "secondary",
  },
  {
    id: "knowledgeBases",
    kind: "link",
    href: "/knowledge-bases",
    icon: BookOpen,
    group: "secondary",
  },
  {
    id: "coursePreview",
    kind: "link",
    href: "/learn/preview",
    icon: Video,
    group: "secondary",
  },
  {
    id: "courseKnowledge",
    kind: "link",
    href: "/learn/knowledge",
    icon: BookOpen,
    group: "secondary",
  },
  {
    id: "learning",
    kind: "link",
    href: "/learn",
    icon: Sparkles,
    group: "secondary",
  },
  {
    id: "experiments",
    kind: "link",
    href: "/learn/experiments",
    icon: FlaskConical,
    group: "secondary",
  },
  {
    id: "classrooms",
    kind: "link",
    href: "/classrooms",
    icon: Blocks,
    group: "secondary",
  },
  {
    id: "rollCall",
    kind: "link",
    href: "/roll-call",
    icon: Shuffle,
    group: "secondary",
  },
  {
    id: "activities",
    kind: "link",
    href: "/activities",
    icon: BarChart3,
    group: "secondary",
  },
  { id: "homeworks", kind: "link", href: "/homeworks", icon: ClipboardList, group: "secondary" },
  { id: "questionBank", kind: "link", href: "/question-bank", icon: LibraryBig, group: "secondary" },
  { id: "analytics", kind: "link", href: "/analytics", icon: BarChart3, group: "secondary" },
  { id: "exports", kind: "link", href: "/exports", icon: Download, group: "secondary" },
] as const satisfies readonly NavigationItem[];
