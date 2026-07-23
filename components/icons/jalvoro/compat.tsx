/* eslint-disable */
/* First-party JALVORO compatibility names retained for source stability. */
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from "react";

import {
  JalvoroAccountsIcon,
  JalvoroAddIcon,
  JalvoroAiInsightsIcon,
  JalvoroAnalyticsIcon,
  JalvoroArrowLeftIcon,
  JalvoroArrowRightIcon,
  JalvoroBankIcon,
  JalvoroBellIcon,
  JalvoroBudgetIcon,
  JalvoroCalendarIcon,
  JalvoroCameraIcon,
  JalvoroCardIcon,
  JalvoroCashIcon,
  JalvoroChatIcon,
  JalvoroCheckIcon,
  JalvoroChevronDownIcon,
  JalvoroChevronRightIcon,
  JalvoroClockIcon,
  JalvoroCloseIcon,
  JalvoroCoinIcon,
  JalvoroCopyIcon,
  JalvoroDashboardIcon,
  JalvoroDeleteIcon,
  JalvoroDownloadIcon,
  JalvoroErrorIcon,
  JalvoroEyeIcon,
  JalvoroEyeOffIcon,
  JalvoroFileIcon,
  JalvoroFilterIcon,
  JalvoroFolderIcon,
  JalvoroGlobeIcon,
  JalvoroGoalsIcon,
  JalvoroGridIcon,
  JalvoroIncomeIcon,
  JalvoroInfoIcon,
  JalvoroInvestmentsIcon,
  JalvoroKeyIcon,
  JalvoroLinkIcon,
  JalvoroListIcon,
  JalvoroLockIcon,
  JalvoroMailIcon,
  JalvoroMoreIcon,
  JalvoroPayablesIcon,
  JalvoroPencilIcon,
  JalvoroPendingIcon,
  JalvoroPhoneIcon,
  JalvoroRefreshIcon,
  JalvoroReportsIcon,
  JalvoroSavingsIcon,
  JalvoroSearchIcon,
  JalvoroSendIcon,
  JalvoroSettingsIcon,
  JalvoroShieldMoneyIcon,
  JalvoroSortIcon,
  JalvoroSparkIcon,
  JalvoroSuccessIcon,
  JalvoroTagIcon,
  JalvoroTaxIcon,
  JalvoroTransactionsIcon,
  JalvoroTrendDownIcon,
  JalvoroTrendUpIcon,
  JalvoroUndoIcon,
  JalvoroUploadIcon,
  JalvoroUserIcon,
  JalvoroUserPlusIcon,
  JalvoroUsersIcon,
  JalvoroWalletIcon,
  JalvoroWarningIcon,
} from "./components";
import type { JalvoroIconComponent, JalvoroIconNode, JalvoroIconProps } from "./types";

type CompatibleIconProps = JalvoroIconProps & {
  absoluteStrokeWidth?: boolean;
};

type CompatibleIconComponent = ForwardRefExoticComponent<
  CompatibleIconProps & RefAttributes<SVGSVGElement>
>;

function createCompatibleIcon(
  sourceName: string,
  Base: JalvoroIconComponent,
): CompatibleIconComponent {
  const Component = forwardRef<SVGSVGElement, CompatibleIconProps>(
    function JalvoroCompatibilityIcon(
      { absoluteStrokeWidth: _absoluteStrokeWidth, ...props },
      ref,
    ) {
      return (
        <Base
          ref={ref}
          {...props}
          data-jalvoro-source-name={sourceName}
        />
      );
    },
  );
  Component.displayName = `Jalvoro${sourceName}CompatibilityIcon`;
  return Component;
}

export const Activity = createCompatibleIcon("Activity", JalvoroAnalyticsIcon);
export const AlertCircle = createCompatibleIcon("AlertCircle", JalvoroErrorIcon);
export const AlertTriangle = createCompatibleIcon("AlertTriangle", JalvoroWarningIcon);
export const Archive = createCompatibleIcon("Archive", JalvoroFolderIcon);
export const ArchiveRestore = createCompatibleIcon("ArchiveRestore", JalvoroBankIcon);
export const ArrowDown = createCompatibleIcon("ArrowDown", JalvoroTrendDownIcon);
export const ArrowDownLeft = createCompatibleIcon("ArrowDownLeft", JalvoroTrendDownIcon);
export const ArrowDownRight = createCompatibleIcon("ArrowDownRight", JalvoroTrendDownIcon);
export const ArrowDownToLine = createCompatibleIcon("ArrowDownToLine", JalvoroTrendDownIcon);
export const ArrowDownUp = createCompatibleIcon("ArrowDownUp", JalvoroTrendUpIcon);
export const ArrowLeft = createCompatibleIcon("ArrowLeft", JalvoroArrowLeftIcon);
export const ArrowLeftRight = createCompatibleIcon("ArrowLeftRight", JalvoroArrowLeftIcon);
export const ArrowRight = createCompatibleIcon("ArrowRight", JalvoroArrowRightIcon);
export const ArrowUp = createCompatibleIcon("ArrowUp", JalvoroTrendUpIcon);
export const ArrowUpDown = createCompatibleIcon("ArrowUpDown", JalvoroSortIcon);
export const ArrowUpFromLine = createCompatibleIcon("ArrowUpFromLine", JalvoroTrendUpIcon);
export const ArrowUpRight = createCompatibleIcon("ArrowUpRight", JalvoroTrendUpIcon);
export const Baby = createCompatibleIcon("Baby", JalvoroSparkIcon);
export const BadgeCheck = createCompatibleIcon("BadgeCheck", JalvoroSuccessIcon);
export const BadgeDollarSign = createCompatibleIcon("BadgeDollarSign", JalvoroIncomeIcon);
export const BadgePercent = createCompatibleIcon("BadgePercent", JalvoroTaxIcon);
export const Ban = createCompatibleIcon("Ban", JalvoroErrorIcon);
export const Banknote = createCompatibleIcon("Banknote", JalvoroCashIcon);
export const BarChart2 = createCompatibleIcon("BarChart2", JalvoroAnalyticsIcon);
export const BarChart3 = createCompatibleIcon("BarChart3", JalvoroAnalyticsIcon);
export const Bell = createCompatibleIcon("Bell", JalvoroBellIcon);
export const BellOff = createCompatibleIcon("BellOff", JalvoroBellIcon);
export const BellRing = createCompatibleIcon("BellRing", JalvoroBellIcon);
export const Bike = createCompatibleIcon("Bike", JalvoroSparkIcon);
export const BookCheck = createCompatibleIcon("BookCheck", JalvoroSuccessIcon);
export const BookOpen = createCompatibleIcon("BookOpen", JalvoroFileIcon);
export const BookOpenCheck = createCompatibleIcon("BookOpenCheck", JalvoroSuccessIcon);
export const Boxes = createCompatibleIcon("Boxes", JalvoroFolderIcon);
export const Brain = createCompatibleIcon("Brain", JalvoroAiInsightsIcon);
export const BrainCircuit = createCompatibleIcon("BrainCircuit", JalvoroAiInsightsIcon);
export const Briefcase = createCompatibleIcon("Briefcase", JalvoroInvestmentsIcon);
export const BriefcaseBusiness = createCompatibleIcon("BriefcaseBusiness", JalvoroInvestmentsIcon);
export const Building2 = createCompatibleIcon("Building2", JalvoroBankIcon);
export const Bus = createCompatibleIcon("Bus", JalvoroSparkIcon);
export const Calculator = createCompatibleIcon("Calculator", JalvoroSparkIcon);
export const CalendarCheck = createCompatibleIcon("CalendarCheck", JalvoroSuccessIcon);
export const CalendarCheck2 = createCompatibleIcon("CalendarCheck2", JalvoroSuccessIcon);
export const CalendarClock = createCompatibleIcon("CalendarClock", JalvoroCalendarIcon);
export const CalendarDays = createCompatibleIcon("CalendarDays", JalvoroCalendarIcon);
export const CalendarRange = createCompatibleIcon("CalendarRange", JalvoroCalendarIcon);
export const Camera = createCompatibleIcon("Camera", JalvoroCameraIcon);
export const Car = createCompatibleIcon("Car", JalvoroSparkIcon);
export const ChartCandlestick = createCompatibleIcon("ChartCandlestick", JalvoroAnalyticsIcon);
export const ChartNoAxesCombined = createCompatibleIcon("ChartNoAxesCombined", JalvoroAnalyticsIcon);
export const Check = createCompatibleIcon("Check", JalvoroCheckIcon);
export const CheckCheck = createCompatibleIcon("CheckCheck", JalvoroSuccessIcon);
export const CheckCircle2 = createCompatibleIcon("CheckCircle2", JalvoroSuccessIcon);
export const CheckIcon = createCompatibleIcon("CheckIcon", JalvoroSuccessIcon);
export const ChevronDown = createCompatibleIcon("ChevronDown", JalvoroChevronDownIcon);
export const ChevronDownIcon = createCompatibleIcon("ChevronDownIcon", JalvoroChevronRightIcon);
export const ChevronLeft = createCompatibleIcon("ChevronLeft", JalvoroArrowLeftIcon);
export const ChevronRight = createCompatibleIcon("ChevronRight", JalvoroChevronRightIcon);
export const ChevronRightIcon = createCompatibleIcon("ChevronRightIcon", JalvoroChevronRightIcon);
export const ChevronUp = createCompatibleIcon("ChevronUp", JalvoroChevronDownIcon);
export const ChevronUpIcon = createCompatibleIcon("ChevronUpIcon", JalvoroChevronRightIcon);
export const Circle = createCompatibleIcon("Circle", JalvoroSparkIcon);
export const CircleAlert = createCompatibleIcon("CircleAlert", JalvoroWarningIcon);
export const CircleDollarSign = createCompatibleIcon("CircleDollarSign", JalvoroCoinIcon);
export const CircleHelp = createCompatibleIcon("CircleHelp", JalvoroInfoIcon);
export const Clapperboard = createCompatibleIcon("Clapperboard", JalvoroSparkIcon);
export const Clipboard = createCompatibleIcon("Clipboard", JalvoroFileIcon);
export const ClipboardCheck = createCompatibleIcon("ClipboardCheck", JalvoroSuccessIcon);
export const ClipboardX = createCompatibleIcon("ClipboardX", JalvoroFileIcon);
export const Clock3 = createCompatibleIcon("Clock3", JalvoroClockIcon);
export const Cloud = createCompatibleIcon("Cloud", JalvoroUploadIcon);
export const Coffee = createCompatibleIcon("Coffee", JalvoroSparkIcon);
export const Coins = createCompatibleIcon("Coins", JalvoroCoinIcon);
export const ContactRound = createCompatibleIcon("ContactRound", JalvoroUsersIcon);
export const Copy = createCompatibleIcon("Copy", JalvoroCopyIcon);
export const Cpu = createCompatibleIcon("Cpu", JalvoroSparkIcon);
export const CreditCard = createCompatibleIcon("CreditCard", JalvoroCardIcon);
export const Crown = createCompatibleIcon("Crown", JalvoroSparkIcon);
export const Database = createCompatibleIcon("Database", JalvoroAccountsIcon);
export const DollarSign = createCompatibleIcon("DollarSign", JalvoroCoinIcon);
export const Download = createCompatibleIcon("Download", JalvoroDownloadIcon);
export const Droplets = createCompatibleIcon("Droplets", JalvoroSparkIcon);
export const Dumbbell = createCompatibleIcon("Dumbbell", JalvoroBellIcon);
export const Eye = createCompatibleIcon("Eye", JalvoroEyeIcon);
export const EyeOff = createCompatibleIcon("EyeOff", JalvoroEyeOffIcon);
export const Factory = createCompatibleIcon("Factory", JalvoroSparkIcon);
export const FastForward = createCompatibleIcon("FastForward", JalvoroArrowRightIcon);
export const FileArchive = createCompatibleIcon("FileArchive", JalvoroFolderIcon);
export const FileBarChart = createCompatibleIcon("FileBarChart", JalvoroReportsIcon);
export const FileCheck2 = createCompatibleIcon("FileCheck2", JalvoroSuccessIcon);
export const FileClock = createCompatibleIcon("FileClock", JalvoroClockIcon);
export const FilePlus2 = createCompatibleIcon("FilePlus2", JalvoroAddIcon);
export const FileSpreadsheet = createCompatibleIcon("FileSpreadsheet", JalvoroFileIcon);
export const FileText = createCompatibleIcon("FileText", JalvoroFileIcon);
export const FileWarning = createCompatibleIcon("FileWarning", JalvoroWarningIcon);
export const Filter = createCompatibleIcon("Filter", JalvoroFilterIcon);
export const Flag = createCompatibleIcon("Flag", JalvoroSparkIcon);
export const Flame = createCompatibleIcon("Flame", JalvoroSparkIcon);
export const Folder = createCompatibleIcon("Folder", JalvoroFolderIcon);
export const FolderPlus = createCompatibleIcon("FolderPlus", JalvoroAddIcon);
export const Fuel = createCompatibleIcon("Fuel", JalvoroSparkIcon);
export const Gamepad2 = createCompatibleIcon("Gamepad2", JalvoroSparkIcon);
export const Gauge = createCompatibleIcon("Gauge", JalvoroDashboardIcon);
export const Gem = createCompatibleIcon("Gem", JalvoroSparkIcon);
export const Gift = createCompatibleIcon("Gift", JalvoroSavingsIcon);
export const Glasses = createCompatibleIcon("Glasses", JalvoroSparkIcon);
export const Globe2 = createCompatibleIcon("Globe2", JalvoroGlobeIcon);
export const Goal = createCompatibleIcon("Goal", JalvoroGoalsIcon);
export const GraduationCap = createCompatibleIcon("GraduationCap", JalvoroSparkIcon);
export const Hammer = createCompatibleIcon("Hammer", JalvoroSparkIcon);
export const HandCoins = createCompatibleIcon("HandCoins", JalvoroPayablesIcon);
export const Handshake = createCompatibleIcon("Handshake", JalvoroSparkIcon);
export const Hash = createCompatibleIcon("Hash", JalvoroSparkIcon);
export const Headphones = createCompatibleIcon("Headphones", JalvoroPhoneIcon);
export const HeartHandshake = createCompatibleIcon("HeartHandshake", JalvoroSparkIcon);
export const HeartPulse = createCompatibleIcon("HeartPulse", JalvoroAnalyticsIcon);
export const History = createCompatibleIcon("History", JalvoroClockIcon);
export const Home = createCompatibleIcon("Home", JalvoroDashboardIcon);
export const ImageUp = createCompatibleIcon("ImageUp", JalvoroTrendUpIcon);
export const Info = createCompatibleIcon("Info", JalvoroInfoIcon);
export const KeyRound = createCompatibleIcon("KeyRound", JalvoroKeyIcon);
export const Landmark = createCompatibleIcon("Landmark", JalvoroBankIcon);
export const Languages = createCompatibleIcon("Languages", JalvoroGlobeIcon);
export const Laptop = createCompatibleIcon("Laptop", JalvoroSparkIcon);
export const Layers3 = createCompatibleIcon("Layers3", JalvoroSparkIcon);
export const LayoutGrid = createCompatibleIcon("LayoutGrid", JalvoroGridIcon);
export const Lightbulb = createCompatibleIcon("Lightbulb", JalvoroSparkIcon);
export const LineChart = createCompatibleIcon("LineChart", JalvoroAnalyticsIcon);
export const Link2 = createCompatibleIcon("Link2", JalvoroLinkIcon);
export const ListTodo = createCompatibleIcon("ListTodo", JalvoroListIcon);
export const Loader2 = createCompatibleIcon("Loader2", JalvoroPendingIcon);
export const LoaderCircle = createCompatibleIcon("LoaderCircle", JalvoroPendingIcon);
export const LockKeyhole = createCompatibleIcon("LockKeyhole", JalvoroLockIcon);
export const LogOut = createCompatibleIcon("LogOut", JalvoroArrowRightIcon);
export const LucideIcon = createCompatibleIcon("LucideIcon", JalvoroSparkIcon);
export const Mail = createCompatibleIcon("Mail", JalvoroMailIcon);
export const MailCheck = createCompatibleIcon("MailCheck", JalvoroSuccessIcon);
export const MailPlus = createCompatibleIcon("MailPlus", JalvoroAddIcon);
export const MapPin = createCompatibleIcon("MapPin", JalvoroSparkIcon);
export const MapPinOff = createCompatibleIcon("MapPinOff", JalvoroSparkIcon);
export const MapPinned = createCompatibleIcon("MapPinned", JalvoroSparkIcon);
export const MessageSquareText = createCompatibleIcon("MessageSquareText", JalvoroChatIcon);
export const Minus = createCompatibleIcon("Minus", JalvoroSparkIcon);
export const Monitor = createCompatibleIcon("Monitor", JalvoroSparkIcon);
export const MonitorDown = createCompatibleIcon("MonitorDown", JalvoroTrendDownIcon);
export const Moon = createCompatibleIcon("Moon", JalvoroSparkIcon);
export const MoreHorizontal = createCompatibleIcon("MoreHorizontal", JalvoroMoreIcon);
export const Music2 = createCompatibleIcon("Music2", JalvoroSparkIcon);
export const NotebookText = createCompatibleIcon("NotebookText", JalvoroFileIcon);
export const Package = createCompatibleIcon("Package", JalvoroFolderIcon);
export const PackageCheck = createCompatibleIcon("PackageCheck", JalvoroSuccessIcon);
export const PackagePlus = createCompatibleIcon("PackagePlus", JalvoroAddIcon);
export const PackageSearch = createCompatibleIcon("PackageSearch", JalvoroSearchIcon);
export const Paintbrush = createCompatibleIcon("Paintbrush", JalvoroAiInsightsIcon);
export const Palette = createCompatibleIcon("Palette", JalvoroSparkIcon);
export const PawPrint = createCompatibleIcon("PawPrint", JalvoroSparkIcon);
export const Pencil = createCompatibleIcon("Pencil", JalvoroPencilIcon);
export const Phone = createCompatibleIcon("Phone", JalvoroPhoneIcon);
export const PieChart = createCompatibleIcon("PieChart", JalvoroBudgetIcon);
export const PiggyBank = createCompatibleIcon("PiggyBank", JalvoroErrorIcon);
export const Plane = createCompatibleIcon("Plane", JalvoroSendIcon);
export const Play = createCompatibleIcon("Play", JalvoroSparkIcon);
export const Plus = createCompatibleIcon("Plus", JalvoroAddIcon);
export const Printer = createCompatibleIcon("Printer", JalvoroReportsIcon);
export const ReceiptText = createCompatibleIcon("ReceiptText", JalvoroTransactionsIcon);
export const RefreshCcw = createCompatibleIcon("RefreshCcw", JalvoroRefreshIcon);
export const RefreshCw = createCompatibleIcon("RefreshCw", JalvoroRefreshIcon);
export const Repeat2 = createCompatibleIcon("Repeat2", JalvoroRefreshIcon);
export const RotateCcw = createCompatibleIcon("RotateCcw", JalvoroUndoIcon);
export const Route = createCompatibleIcon("Route", JalvoroSparkIcon);
export const Save = createCompatibleIcon("Save", JalvoroDownloadIcon);
export const Scale = createCompatibleIcon("Scale", JalvoroSparkIcon);
export const Scissors = createCompatibleIcon("Scissors", JalvoroSparkIcon);
export const Search = createCompatibleIcon("Search", JalvoroSearchIcon);
export const SearchX = createCompatibleIcon("SearchX", JalvoroSearchIcon);
export const Send = createCompatibleIcon("Send", JalvoroSendIcon);
export const Settings2 = createCompatibleIcon("Settings2", JalvoroSettingsIcon);
export const Shield = createCompatibleIcon("Shield", JalvoroShieldMoneyIcon);
export const ShieldAlert = createCompatibleIcon("ShieldAlert", JalvoroWarningIcon);
export const ShieldCheck = createCompatibleIcon("ShieldCheck", JalvoroShieldMoneyIcon);
export const Shirt = createCompatibleIcon("Shirt", JalvoroSparkIcon);
export const ShoppingBag = createCompatibleIcon("ShoppingBag", JalvoroSparkIcon);
export const ShoppingBasket = createCompatibleIcon("ShoppingBasket", JalvoroSparkIcon);
export const ShoppingCart = createCompatibleIcon("ShoppingCart", JalvoroSparkIcon);
export const SlidersHorizontal = createCompatibleIcon("SlidersHorizontal", JalvoroFilterIcon);
export const Smartphone = createCompatibleIcon("Smartphone", JalvoroPhoneIcon);
export const Sparkles = createCompatibleIcon("Sparkles", JalvoroSparkIcon);
export const Square = createCompatibleIcon("Square", JalvoroSparkIcon);
export const Stethoscope = createCompatibleIcon("Stethoscope", JalvoroSparkIcon);
export const Store = createCompatibleIcon("Store", JalvoroBankIcon);
export const Sun = createCompatibleIcon("Sun", JalvoroSparkIcon);
export const Tablet = createCompatibleIcon("Tablet", JalvoroSparkIcon);
export const Tag = createCompatibleIcon("Tag", JalvoroTagIcon);
export const Tags = createCompatibleIcon("Tags", JalvoroTagIcon);
export const Target = createCompatibleIcon("Target", JalvoroGoalsIcon);
export const Ticket = createCompatibleIcon("Ticket", JalvoroSparkIcon);
export const TrainFront = createCompatibleIcon("TrainFront", JalvoroAiInsightsIcon);
export const Trash2 = createCompatibleIcon("Trash2", JalvoroDeleteIcon);
export const TrendingDown = createCompatibleIcon("TrendingDown", JalvoroTrendDownIcon);
export const TrendingUp = createCompatibleIcon("TrendingUp", JalvoroTrendUpIcon);
export const TriangleAlert = createCompatibleIcon("TriangleAlert", JalvoroWarningIcon);
export const Tv = createCompatibleIcon("Tv", JalvoroSparkIcon);
export const Undo2 = createCompatibleIcon("Undo2", JalvoroSparkIcon);
export const Unlink = createCompatibleIcon("Unlink", JalvoroLinkIcon);
export const Upload = createCompatibleIcon("Upload", JalvoroUploadIcon);
export const UploadCloud = createCompatibleIcon("UploadCloud", JalvoroUploadIcon);
export const UserCog = createCompatibleIcon("UserCog", JalvoroSettingsIcon);
export const UserPlus = createCompatibleIcon("UserPlus", JalvoroUserPlusIcon);
export const UserRound = createCompatibleIcon("UserRound", JalvoroUserIcon);
export const UserRoundCheck = createCompatibleIcon("UserRoundCheck", JalvoroSuccessIcon);
export const UserRoundCog = createCompatibleIcon("UserRoundCog", JalvoroSettingsIcon);
export const UserRoundX = createCompatibleIcon("UserRoundX", JalvoroUserIcon);
export const UsersRound = createCompatibleIcon("UsersRound", JalvoroUsersIcon);
export const Utensils = createCompatibleIcon("Utensils", JalvoroSparkIcon);
export const Wallet = createCompatibleIcon("Wallet", JalvoroWalletIcon);
export const WalletCards = createCompatibleIcon("WalletCards", JalvoroWalletIcon);
export const Warehouse = createCompatibleIcon("Warehouse", JalvoroSparkIcon);
export const Wifi = createCompatibleIcon("Wifi", JalvoroGlobeIcon);
export const WifiOff = createCompatibleIcon("WifiOff", JalvoroErrorIcon);
export const Wrench = createCompatibleIcon("Wrench", JalvoroSparkIcon);
export const X = createCompatibleIcon("X", JalvoroCloseIcon);
export const XCircle = createCompatibleIcon("XCircle", JalvoroErrorIcon);
export const XIcon = createCompatibleIcon("XIcon", JalvoroCloseIcon);
export const Zap = createCompatibleIcon("Zap", JalvoroSparkIcon);

export const icons = {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowDownToLine,
  ArrowDownUp,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpFromLine,
  ArrowUpRight,
  Baby,
  BadgeCheck,
  BadgeDollarSign,
  BadgePercent,
  Ban,
  Banknote,
  BarChart2,
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  Bike,
  BookCheck,
  BookOpen,
  BookOpenCheck,
  Boxes,
  Brain,
  BrainCircuit,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  Bus,
  Calculator,
  CalendarCheck,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Camera,
  Car,
  ChartCandlestick,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckIcon,
  ChevronDown,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  ChevronUp,
  ChevronUpIcon,
  Circle,
  CircleAlert,
  CircleDollarSign,
  CircleHelp,
  Clapperboard,
  Clipboard,
  ClipboardCheck,
  ClipboardX,
  Clock3,
  Cloud,
  Coffee,
  Coins,
  ContactRound,
  Copy,
  Cpu,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Download,
  Droplets,
  Dumbbell,
  Eye,
  EyeOff,
  Factory,
  FastForward,
  FileArchive,
  FileBarChart,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Filter,
  Flag,
  Flame,
  Folder,
  FolderPlus,
  Fuel,
  Gamepad2,
  Gauge,
  Gem,
  Gift,
  Glasses,
  Globe2,
  Goal,
  GraduationCap,
  Hammer,
  HandCoins,
  Handshake,
  Hash,
  Headphones,
  HeartHandshake,
  HeartPulse,
  History,
  Home,
  ImageUp,
  Info,
  KeyRound,
  Landmark,
  Languages,
  Laptop,
  Layers3,
  LayoutGrid,
  Lightbulb,
  LineChart,
  Link2,
  ListTodo,
  Loader2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  LucideIcon,
  Mail,
  MailCheck,
  MailPlus,
  MapPin,
  MapPinOff,
  MapPinned,
  MessageSquareText,
  Minus,
  Monitor,
  MonitorDown,
  Moon,
  MoreHorizontal,
  Music2,
  NotebookText,
  Package,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Paintbrush,
  Palette,
  PawPrint,
  Pencil,
  Phone,
  PieChart,
  PiggyBank,
  Plane,
  Play,
  Plus,
  Printer,
  ReceiptText,
  RefreshCcw,
  RefreshCw,
  Repeat2,
  RotateCcw,
  Route,
  Save,
  Scale,
  Scissors,
  Search,
  SearchX,
  Send,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Stethoscope,
  Store,
  Sun,
  Tablet,
  Tag,
  Tags,
  Target,
  Ticket,
  TrainFront,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Tv,
  Undo2,
  Unlink,
  Upload,
  UploadCloud,
  UserCog,
  UserPlus,
  UserRound,
  UserRoundCheck,
  UserRoundCog,
  UserRoundX,
  UsersRound,
  Utensils,
  Wallet,
  WalletCards,
  Warehouse,
  Wifi,
  WifiOff,
  Wrench,
  X,
  XCircle,
  XIcon,
  Zap,
} as const;

export function createLucideIcon(name: string) {
  return createCompatibleIcon(name, JalvoroSparkIcon);
}

export type LucideIcon = CompatibleIconComponent;

export default icons;
