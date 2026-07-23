import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let ts = null;

if (process.env.JALVORO_ICON_PARSER !== "fallback") {
  try {
    const typescriptModule = await import("typescript");
    ts = typescriptModule.default ?? typescriptModule;
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    console.warn(
      "TypeScript parser unavailable; using the dependency-free icon import parser.",
    );
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(
  root,
  "components/icons/jalvoro/lucide-runtime.generated.tsx",
);

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "build",
  "coverage",
  "design of  UI",
  "node_modules",
  "out",
  "qa-screenshots",
]);

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

const exact = Object.freeze({
  Activity: "JalvoroAnalyticsIcon",
  AlertCircle: "JalvoroErrorIcon",
  AlertTriangle: "JalvoroWarningIcon",
  ArrowDown: "JalvoroTrendDownIcon",
  ArrowDownLeft: "JalvoroTrendDownIcon",
  ArrowDownRight: "JalvoroTrendDownIcon",
  ArrowLeft: "JalvoroArrowLeftIcon",
  ArrowRight: "JalvoroArrowRightIcon",
  ArrowUp: "JalvoroTrendUpIcon",
  ArrowUpLeft: "JalvoroTrendUpIcon",
  ArrowUpRight: "JalvoroTrendUpIcon",
  BadgeDollarSign: "JalvoroIncomeIcon",
  Banknote: "JalvoroCashIcon",
  BarChart: "JalvoroAnalyticsIcon",
  BarChart2: "JalvoroAnalyticsIcon",
  BarChart3: "JalvoroAnalyticsIcon",
  Bell: "JalvoroBellIcon",
  BellRing: "JalvoroBellIcon",
  BookOpen: "JalvoroFileIcon",
  Brain: "JalvoroAiInsightsIcon",
  BrainCircuit: "JalvoroAiInsightsIcon",
  Briefcase: "JalvoroInvestmentsIcon",
  BriefcaseBusiness: "JalvoroInvestmentsIcon",
  Building: "JalvoroBankIcon",
  Building2: "JalvoroBankIcon",
  Calendar: "JalvoroCalendarIcon",
  CalendarClock: "JalvoroCalendarIcon",
  CalendarDays: "JalvoroCalendarIcon",
  Camera: "JalvoroCameraIcon",
  ChartArea: "JalvoroAnalyticsIcon",
  ChartBar: "JalvoroAnalyticsIcon",
  ChartColumn: "JalvoroAnalyticsIcon",
  ChartLine: "JalvoroTrendUpIcon",
  Check: "JalvoroCheckIcon",
  CheckCircle: "JalvoroSuccessIcon",
  CheckCircle2: "JalvoroSuccessIcon",
  ChevronDown: "JalvoroChevronDownIcon",
  ChevronLeft: "JalvoroArrowLeftIcon",
  ChevronRight: "JalvoroChevronRightIcon",
  ChevronUp: "JalvoroChevronDownIcon",
  CircleCheck: "JalvoroSuccessIcon",
  CircleDollarSign: "JalvoroCoinIcon",
  CircleHelp: "JalvoroInfoIcon",
  CircleUser: "JalvoroUserIcon",
  Clipboard: "JalvoroFileIcon",
  ClipboardCheck: "JalvoroSuccessIcon",
  Clock: "JalvoroClockIcon",
  Clock3: "JalvoroClockIcon",
  Cloud: "JalvoroUploadIcon",
  CloudDownload: "JalvoroDownloadIcon",
  CloudUpload: "JalvoroUploadIcon",
  Coins: "JalvoroCoinIcon",
  Copy: "JalvoroCopyIcon",
  CreditCard: "JalvoroCardIcon",
  Database: "JalvoroAccountsIcon",
  DollarSign: "JalvoroCoinIcon",
  Download: "JalvoroDownloadIcon",
  Edit: "JalvoroEditIcon",
  Edit2: "JalvoroEditIcon",
  Ellipsis: "JalvoroMoreIcon",
  EllipsisVertical: "JalvoroMoreIcon",
  Eye: "JalvoroEyeIcon",
  EyeOff: "JalvoroEyeOffIcon",
  File: "JalvoroFileIcon",
  FileBarChart: "JalvoroReportsIcon",
  FileChartColumn: "JalvoroReportsIcon",
  FileText: "JalvoroFileIcon",
  Filter: "JalvoroFilterIcon",
  Folder: "JalvoroFolderIcon",
  FolderKanban: "JalvoroFolderIcon",
  Gauge: "JalvoroDashboardIcon",
  Gift: "JalvoroSavingsIcon",
  Globe: "JalvoroGlobeIcon",
  Goal: "JalvoroGoalsIcon",
  HandCoins: "JalvoroPayablesIcon",
  HelpCircle: "JalvoroInfoIcon",
  Home: "JalvoroDashboardIcon",
  Image: "JalvoroImageIcon",
  Import: "JalvoroImportIcon",
  Info: "JalvoroInfoIcon",
  Key: "JalvoroKeyIcon",
  Landmark: "JalvoroBankIcon",
  LayoutDashboard: "JalvoroDashboardIcon",
  Link: "JalvoroLinkIcon",
  List: "JalvoroListIcon",
  Loader: "JalvoroPendingIcon",
  Loader2: "JalvoroPendingIcon",
  Lock: "JalvoroLockIcon",
  LogOut: "JalvoroArrowRightIcon",
  Mail: "JalvoroMailIcon",
  Menu: "JalvoroMenuIcon",
  MessageCircle: "JalvoroChatIcon",
  MessageSquare: "JalvoroChatIcon",
  MoreHorizontal: "JalvoroMoreIcon",
  MoreVertical: "JalvoroMoreIcon",
  Package: "JalvoroFolderIcon",
  PanelLeft: "JalvoroSidebarIcon",
  Paperclip: "JalvoroLinkIcon",
  Pencil: "JalvoroPencilIcon",
  Percent: "JalvoroTaxIcon",
  Phone: "JalvoroPhoneIcon",
  PieChart: "JalvoroBudgetIcon",
  Plus: "JalvoroAddIcon",
  PlusCircle: "JalvoroAddIcon",
  Printer: "JalvoroReportsIcon",
  Receipt: "JalvoroReceiptIcon",
  ReceiptText: "JalvoroTransactionsIcon",
  Redo: "JalvoroRedoIcon",
  RefreshCcw: "JalvoroRefreshIcon",
  RefreshCw: "JalvoroRefreshIcon",
  RotateCcw: "JalvoroUndoIcon",
  Save: "JalvoroDownloadIcon",
  Search: "JalvoroSearchIcon",
  Send: "JalvoroSendIcon",
  Settings: "JalvoroSettingsIcon",
  Settings2: "JalvoroSettingsIcon",
  Share: "JalvoroShareIcon",
  Share2: "JalvoroShareIcon",
  Shield: "JalvoroShieldMoneyIcon",
  ShieldCheck: "JalvoroShieldMoneyIcon",
  SlidersHorizontal: "JalvoroFilterIcon",
  Sparkles: "JalvoroSparkIcon",
  SquarePen: "JalvoroEditIcon",
  Store: "JalvoroBankIcon",
  Sun: "JalvoroSparkIcon",
  Tag: "JalvoroTagIcon",
  Target: "JalvoroGoalsIcon",
  Trash: "JalvoroDeleteIcon",
  Trash2: "JalvoroDeleteIcon",
  TrendingDown: "JalvoroTrendDownIcon",
  TrendingUp: "JalvoroTrendUpIcon",
  Undo: "JalvoroUndoIcon",
  Upload: "JalvoroUploadIcon",
  User: "JalvoroUserIcon",
  UserPlus: "JalvoroUserPlusIcon",
  Users: "JalvoroUsersIcon",
  Wallet: "JalvoroWalletIcon",
  Wifi: "JalvoroGlobeIcon",
  WifiOff: "JalvoroErrorIcon",
  X: "JalvoroCloseIcon",
  XCircle: "JalvoroErrorIcon",
  Zap: "JalvoroSparkIcon",
});

const rules = [
  [/(alert|warning|triangle)/i, "JalvoroWarningIcon"],
  [/(error|danger|ban|octagon)/i, "JalvoroErrorIcon"],
  [/(check|success|verified)/i, "JalvoroSuccessIcon"],
  [/(info|help|question)/i, "JalvoroInfoIcon"],
  [/(loader|loading|pending|hourglass)/i, "JalvoroPendingIcon"],
  [/(search|scan|zoom)/i, "JalvoroSearchIcon"],
  [/(trash|delete|remove)/i, "JalvoroDeleteIcon"],
  [/(edit|pencil|pen|write)/i, "JalvoroEditIcon"],
  [/(copy|duplicate|clone)/i, "JalvoroCopyIcon"],
  [/(plus|add|new|create)/i, "JalvoroAddIcon"],
  [/(filter|funnel|sliders)/i, "JalvoroFilterIcon"],
  [/(sort|arrowupdown)/i, "JalvoroSortIcon"],
  [/(download|save)/i, "JalvoroDownloadIcon"],
  [/(upload|cloud)/i, "JalvoroUploadIcon"],
  [/(import)/i, "JalvoroImportIcon"],
  [/(export)/i, "JalvoroExportIcon"],
  [/(refresh|rotate|repeat|sync)/i, "JalvoroRefreshIcon"],
  [/(share|network)/i, "JalvoroShareIcon"],
  [/(send|plane)/i, "JalvoroSendIcon"],
  [/(menu|hamburger)/i, "JalvoroMenuIcon"],
  [/(ellipsis|more|dots)/i, "JalvoroMoreIcon"],
  [/(chevron|caret)/i, "JalvoroChevronRightIcon"],
  [/(left|back|previous)/i, "JalvoroArrowLeftIcon"],
  [/(right|forward|next)/i, "JalvoroArrowRightIcon"],
  [/(up|rise|growth|increase)/i, "JalvoroTrendUpIcon"],
  [/(down|decline|decrease)/i, "JalvoroTrendDownIcon"],
  [/(dashboard|gauge|home|overview)/i, "JalvoroDashboardIcon"],
  [/(chart|analytics|activity|pulse|graph)/i, "JalvoroAnalyticsIcon"],
  [/(report|statement)/i, "JalvoroReportsIcon"],
  [/(brain|ai|spark|magic|wand|zap)/i, "JalvoroAiInsightsIcon"],
  [/(setting|cog|gear|preference)/i, "JalvoroSettingsIcon"],
  [/(transaction|receipt)/i, "JalvoroTransactionsIcon"],
  [/(wallet|purse)/i, "JalvoroWalletIcon"],
  [/(bank|landmark|building|institution|store)/i, "JalvoroBankIcon"],
  [/(card|payment)/i, "JalvoroCardIcon"],
  [/(cash|banknote|money)/i, "JalvoroCashIcon"],
  [/(coin|dollar|currency)/i, "JalvoroCoinIcon"],
  [/(invoice|bill)/i, "JalvoroInvoiceIcon"],
  [/(budget|pie)/i, "JalvoroBudgetIcon"],
  [/(saving|piggy|gift)/i, "JalvoroSavingsIcon"],
  [/(target|goal|milestone)/i, "JalvoroGoalsIcon"],
  [/(investment|portfolio|briefcase|stock)/i, "JalvoroInvestmentsIcon"],
  [/(tax|percent)/i, "JalvoroTaxIcon"],
  [/(exchange|convert|swap)/i, "JalvoroExchangeIcon"],
  [/(transfer)/i, "JalvoroTransferIcon"],
  [/(shield|secure|protect)/i, "JalvoroShieldMoneyIcon"],
  [/(calendar|date)/i, "JalvoroCalendarIcon"],
  [/(clock|time|history)/i, "JalvoroClockIcon"],
  [/(bell|notification)/i, "JalvoroBellIcon"],
  [/(folder|archive|package|box)/i, "JalvoroFolderIcon"],
  [/(file|document|clipboard|book|printer)/i, "JalvoroFileIcon"],
  [/(image|photo|picture)/i, "JalvoroImageIcon"],
  [/(camera)/i, "JalvoroCameraIcon"],
  [/(lock|privacy)/i, "JalvoroLockIcon"],
  [/(key|access)/i, "JalvoroKeyIcon"],
  [/(tag|label)/i, "JalvoroTagIcon"],
  [/(link|paperclip|attachment)/i, "JalvoroLinkIcon"],
  [/(users|team|group|contact)/i, "JalvoroUsersIcon"],
  [/(userplus|invite|personadd)/i, "JalvoroUserPlusIcon"],
  [/(user|person|profile|account)/i, "JalvoroUserIcon"],
  [/(mail|email|inbox)/i, "JalvoroMailIcon"],
  [/(message|chat|comment)/i, "JalvoroChatIcon"],
  [/(phone|call)/i, "JalvoroPhoneIcon"],
  [/(globe|world|language|wifi)/i, "JalvoroGlobeIcon"],
  [/(grid|layout|apps)/i, "JalvoroGridIcon"],
  [/(list|rows)/i, "JalvoroListIcon"],
  [/(sidebar|panel)/i, "JalvoroSidebarIcon"],
  [/(eyeoff|hidden)/i, "JalvoroEyeOffIcon"],
  [/(eye|view|visible)/i, "JalvoroEyeIcon"],
  [/(close|cancel|x)/i, "JalvoroCloseIcon"],
];

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return [];
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    if (absolute === output || absolute === fileURLToPath(import.meta.url)) return [];
    return sourceExtensions.has(path.extname(entry)) ? [absolute] : [];
  });
}

function addNamedBindings(bindings, names) {
  for (const rawBinding of bindings.split(",")) {
    const binding = rawBinding.trim();
    if (!binding || /^type\b/.test(binding)) continue;

    const sourceName = binding.split(/\s+as\s+/i)[0]?.trim();
    if (sourceName && /^[A-Za-z_$][\w$]*$/.test(sourceName)) {
      names.add(sourceName);
    }
  }
}

function collectWithFallbackParser(sourceText, names) {
  const namespaceBindings = new Set();
  const importPattern = /^[\t ]*import[\t ]+(?!type\b)(\{[^}]*\}|\*[\t ]+as[\t ]+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*(?:[\t ]*,[\t ]*(?:\{[^}]*\}|\*[\t ]+as[\t ]+[A-Za-z_$][\w$]*))?)[\t \r\n]+from[\t ]+["']lucide-react["'][\t ]*;?/gm;
  // The current TypeScript parser intentionally includes declaration-level
  // `export type { Name }` bindings because ExportSpecifier.isTypeOnly is false
  // in that syntax. Preserve that established generated output for parity.
  const exportPattern = /^[\t ]*export[\t ]+(?:type[\t ]+)?\{([^}]*)\}[\t \r\n]*from[\t ]*["']lucide-react["'][\t ]*;?/gm;

  for (const match of sourceText.matchAll(importPattern)) {
    const clause = match[1].trim();
    const namedBindings = clause.match(/\{([^}]*)\}/)?.[1];
    if (namedBindings) addNamedBindings(namedBindings, names);

    const namespaceBinding = clause.match(
      /\*[\t ]+as[\t ]+([A-Za-z_$][\w$]*)/,
    )?.[1];
    if (namespaceBinding) namespaceBindings.add(namespaceBinding);

    const defaultBinding = clause.match(/^([A-Za-z_$][\w$]*)[\t ]*(?:,|$)/)?.[1];
    if (defaultBinding) namespaceBindings.add(defaultBinding);
  }

  for (const match of sourceText.matchAll(exportPattern)) {
    addNamedBindings(match[1], names);
  }

  for (const namespaceBinding of namespaceBindings) {
    const escapedBinding = namespaceBinding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const accessPattern = new RegExp(
      `\\b${escapedBinding}(?:\\.([A-Za-z_$][\\w$]*)|\\[\\s*["']([A-Za-z_$][\\w$]*)["']\\s*\\])`,
      "g",
    );

    for (const match of sourceText.matchAll(accessPattern)) {
      names.add(match[1] ?? match[2]);
    }
  }
}

function collectWithTypeScript(file, sourceText, names) {
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const namespaceBindings = new Set();

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "lucide-react" &&
      node.importClause &&
      !node.importClause.isTypeOnly
    ) {
      const bindings = node.importClause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (!element.isTypeOnly) {
            names.add((element.propertyName ?? element.name).text);
          }
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        namespaceBindings.add(bindings.name.text);
      }
      if (node.importClause.name) namespaceBindings.add(node.importClause.name.text);
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "lucide-react" &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const element of node.exportClause.elements) {
        if (!element.isTypeOnly) names.add((element.propertyName ?? element.name).text);
      }
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      namespaceBindings.has(node.expression.text)
    ) {
      names.add(node.name.text);
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      namespaceBindings.has(node.expression.text) &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      names.add(node.argumentExpression.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

function importedNames() {
  const names = new Set();
  for (const file of sourceFiles(root)) {
    const sourceText = readFileSync(file, "utf8");
    if (!sourceText.includes("lucide-react")) continue;

    if (ts) collectWithTypeScript(file, sourceText, names);
    else collectWithFallbackParser(sourceText, names);
  }
  return [...names].filter((name) => /^[A-Za-z_$][\w$]*$/.test(name)).sort();
}

function componentFor(name) {
  if (exact[name]) return exact[name];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? "JalvoroSparkIcon";
}

function generate() {
  const names = importedNames();
  const assignments = names.map((name) => [name, componentFor(name)]);
  const components = [...new Set(assignments.map(([, component]) => component))].sort();
  const exports = assignments
    .map(
      ([name, component]) =>
        `export const ${name} = createCompatibleIcon(${JSON.stringify(name)}, ${component});`,
    )
    .join("\n");
  const iconEntries = names.map((name) => `  ${name},`).join("\n");

  const generated = `/* eslint-disable */\n/* This file is generated by scripts/generate-jalvoro-lucide-runtime.mjs. */\nimport { forwardRef } from "react";\n\nimport {\n  ${components.join(",\n  ")},\n} from "./components";\nimport type { JalvoroIconComponent, JalvoroIconProps } from "./types";\n\ntype CompatibleIconProps = JalvoroIconProps & {\n  absoluteStrokeWidth?: boolean;\n};\n\nfunction createCompatibleIcon(\n  sourceName: string,\n  Base: JalvoroIconComponent,\n): JalvoroIconComponent {\n  const Component = forwardRef<SVGSVGElement, CompatibleIconProps>(\n    function JalvoroCompatibilityIcon(\n      { absoluteStrokeWidth: _absoluteStrokeWidth, ...props },\n      ref,\n    ) {\n      return (\n        <Base\n          ref={ref}\n          {...props}\n          data-jalvoro-source-name={sourceName}\n        />\n      );\n    },\n  );\n  Component.displayName = \`Jalvoro\${sourceName}CompatibilityIcon\`;\n  return Component;\n}\n\n${exports}\n\nexport const icons = {\n${iconEntries}\n} as const;\n\nexport function createLucideIcon(name: string) {\n  return createCompatibleIcon(name, JalvoroSparkIcon);\n}\n\nexport default icons;\n`;

  mkdirSync(path.dirname(output), { recursive: true });
  const current = existsSync(output) ? readFileSync(output, "utf8") : "";
  if (current !== generated) writeFileSync(output, generated, "utf8");
  console.log(
    `Generated ${names.length} JALVORO compatibility exports with ${ts ? "TypeScript" : "fallback"} parser.`,
  );
}

generate();
