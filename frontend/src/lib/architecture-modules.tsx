import {
  BarChart3,
  BadgeCheck,
  Bot,
  Brain,
  Building2,
  Database,
  Globe,
  KeyRound,
  LayoutGrid,
  LineChart,
  MessageSquareText,
  PenLine,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react"

export type ModuleSection = {
  title: string
  items: string[]
}

export type ArchitectureModule = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  color: string
  features: string[]
  tech: string[]
  flow?: string[]
  sections?: ModuleSection[]
}

export const ARCHITECTURE_MODULES: ArchitectureModule[] = [
  {
    id: "auth",
    icon: Shield,
    title: "Authentication & User Management",
    description: "Secure multi-tenant authentication layer for every workspace.",
    color: "#38bdf8",
    features: [
      "JWT Authentication",
      "Company Workspace",
      "Role Based Access",
      "User Management",
      "Tenant Isolation",
      "Secure Sessions",
    ],
    tech: ["FastAPI", "JWT", "SQLAlchemy", "bcrypt"],
  },
  {
    id: "ai-query",
    icon: Brain,
    title: "AI Query Understanding",
    description: "Transforms natural language into an optimized search plan.",
    color: "#a855f7",
    flow: [
      "User Query",
      "Intent Parsing",
      "Category Detection",
      "Location Detection",
      "Search Planning",
    ],
    features: [
      "OpenAI LLM",
      "Prompt Engineering",
      "Intent Classification",
      "Category Detection",
      "Location Detection",
      "Search Strategy",
    ],
    tech: ["OpenAI", "FastAPI", "Pydantic"],
  },
  {
    id: "discovery",
    icon: Globe,
    title: "Multi-Source Discovery",
    description: "Collect business candidates from multiple discovery providers.",
    color: "#22d3ee",
    features: [
      "Google Places Discovery",
      "Brave Search Discovery",
      "Candidate Output",
      "Provider Result Trace",
      "Location Aware Targeting",
    ],
    tech: ["Google Places API", "Brave Search API"],
  },
  {
    id: "processing",
    icon: Database,
    title: "Data Processing Engine",
    description: "Clean, normalize and merge every collected candidate record.",
    color: "#f59e0b",
    features: [
      "Normalize Names",
      "Normalize Domains",
      "Normalize Phones",
      "Address Standardization",
      "Duplicate Detection",
      "Merge Records",
    ],
    tech: ["Python", "SQLAlchemy", "Fuzzy Matching"],
  },
  {
    id: "company-intelligence",
    icon: Building2,
    title: "Company Intelligence",
    description: "Deep-dive research on every candidate before verification.",
    color: "#8b5cf6",
    sections: [
      {
        title: "Website Intelligence",
        items: ["Website Crawl", "AI Summary", "Emails", "Phones", "Social Links"],
      },
      {
        title: "Contact Intelligence",
        items: ["Hunter Email Discovery", "Email Verification", "Phone Verification"],
      },
      {
        title: "Company Intelligence",
        items: ["Business Status", "Category", "Location"],
      },
    ],
    features: [
      "Website Crawl",
      "AI Summary",
      "Email Discovery",
      "Email Verification",
      "Phone Verification",
      "Social Links",
    ],
    tech: ["Crawl4AI", "Playwright", "Hunter.io"],
  },
  {
    id: "verification",
    icon: BadgeCheck,
    title: "Verification Engine",
    description: "Cross-validates every signal before a lead is accepted.",
    color: "#22c55e",
    features: [
      "Business Active",
      "Website Verified",
      "Email Verified",
      "Phone Verified",
      "Location Match",
      "Evidence Collection",
    ],
    tech: ["Cross-Validation", "Evidence Engine", "Confidence Score"],
  },
  {
    id: "scoring",
    icon: Target,
    title: "AI Lead Scoring",
    description: "Evidence-weighted 0–100 score decides qualification.",
    color: "#7c3aed",
    features: [
      "Business Status",
      "Website Quality",
      "Verification Score",
      "Category Match",
      "Evidence Weight",
      "AI Confidence",
    ],
    tech: ["Scoring Service", "≥30 Threshold", "Signals"],
  },
  {
    id: "selection",
    icon: Server,
    title: "Lead Selection & Storage",
    description: "Picks the best leads and persists everything per tenant.",
    color: "#60a5fa",
    features: [
      "Top Leads",
      "Best Email",
      "Best Phone",
      "Best Address",
      "Timeline Events",
      "Notifications",
      "Search History",
    ],
    tech: ["Neon PostgreSQL", "Async SQLAlchemy", "UUID"],
  },
  {
    id: "crm",
    icon: LayoutGrid,
    title: "CRM & Pipeline",
    description: "Sales workflow with drag-and-drop stages and activity tracking.",
    color: "#ec4899",
    features: [
      "Assign Owner",
      "Timeline",
      "Contact Activities",
      "Follow-up Scheduling",
      "Stage Moves",
      "Won / Lost Tracking",
    ],
    tech: ["FastAPI", "Next.js", "dnd-kit"],
  },
  {
    id: "automation",
    icon: Bot,
    title: "Automation & AI Insights",
    description: "Rules-based pipeline automation with AI-generated alerts.",
    color: "#f97316",
    features: [
      "Auto Stage Transitions",
      "Score-based Qualifying",
      "Verification Gates",
      "AI Insight Notifications",
      "Stuck-Lead Alerts",
      "Inactive-Lead Alerts",
    ],
    tech: ["Automation Service", "Notifications"],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time funnel, pipeline and revenue intelligence.",
    color: "#06b6d4",
    features: [
      "Conversion Funnel",
      "Qualified Leads",
      "Conversion Rate",
      "Pipeline Value",
      "Revenue & Forecast",
      "AI Insights",
    ],
    tech: ["Recharts", "REST API", "WebSocket"],
  },
]

export const INFRA_PILLS = [
  "AI Powered",
  "Multi-Tenant",
  "FastAPI",
  "Next.js",
  "PostgreSQL",
  "Real-time",
  "Scalable",
]

export const ROADMAP_ITEMS = [
  { icon: Search, label: "Bing Search provider" },
  { icon: KeyRound, label: "OAuth sign-in — Google & Microsoft" },
  { icon: MessageSquareText, label: "WhatsApp automation & AI email writer" },
  { icon: PenLine, label: "LinkedIn messages & cold-call scripts" },
  { icon: Users, label: "Decision-maker enrichment" },
  { icon: LineChart, label: "Provider performance & team analytics" },
  { icon: ShieldCheck, label: "API rate limiting" },
]