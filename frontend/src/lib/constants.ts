export const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", color: "#6366f1" },
  { value: "qualified", label: "Qualified", color: "#8b5cf6" },
  { value: "contact_found", label: "Contact Found", color: "#a855f7" },
  { value: "verified", label: "Verified", color: "#06b6d4" },
  { value: "research_complete", label: "Research Complete", color: "#10b981" },
  { value: "outreach_ready", label: "Outreach Ready", color: "#22c55e" },
  { value: "email_sent", label: "Email Sent", color: "#eab308" },
  { value: "follow_up", label: "Follow-up", color: "#f97316" },
  { value: "meeting", label: "Meeting", color: "#ef4444" },
  { value: "proposal", label: "Proposal", color: "#ec4899" },
  { value: "negotiation", label: "Negotiation", color: "#f43f5e" },
  { value: "won", label: "Won", color: "#22c55e" },
  { value: "lost", label: "Lost", color: "#6b7280" },
] as const

export const DASHBOARD_CARDS = [
  { key: "today_leads", label: "Today's Leads", icon: "Users" },
  { key: "hot_leads", label: "Hot Leads", icon: "Flame" },
  { key: "new_replies", label: "New Replies", icon: "MessageSquare" },
  { key: "meetings_today", label: "Meetings Today", icon: "Calendar" },
  { key: "revenue_pipeline", label: "Revenue Pipeline", icon: "DollarSign" },
  { key: "forecast", label: "Forecast", icon: "TrendingUp" },
  { key: "won_deals", label: "Won Deals", icon: "Trophy" },
  { key: "lost_deals", label: "Lost Deals", icon: "XCircle" },
]

export const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  contact_found: "Contact Found",
  verified: "Verified",
  research_complete: "Research Complete",
  outreach_ready: "Outreach Ready",
  email_sent: "Email Sent",
  follow_up: "Follow-up",
  meeting: "Meeting",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/+$/, "")
export const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001/ws/pipeline").replace(/\/+$/, "")

export const CONTACT_CHANNELS = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
] as const

export const CONTACT_OUTCOMES: { value: string; label: string; color: string }[] = [
  { value: "no_answer", label: "No Answer", color: "bg-gray-500/10 text-gray-400" },
  { value: "not_reached", label: "Not Reached", color: "bg-gray-500/10 text-gray-400" },
  { value: "left_message", label: "Left Message", color: "bg-amber-500/10 text-amber-400" },
  { value: "callback_requested", label: "Callback Requested", color: "bg-amber-500/10 text-amber-400" },
  { value: "follow_up_required", label: "Follow-up Required", color: "bg-orange-500/10 text-orange-400" },
  { value: "interested", label: "Interested", color: "bg-green-500/10 text-green-400" },
  { value: "meeting_scheduled", label: "Meeting Scheduled", color: "bg-blue-500/10 text-blue-400" },
  { value: "not_interested", label: "Not Interested", color: "bg-red-500/10 text-red-400" },
]

export function outcomeStyle(outcome: string) {
  return CONTACT_OUTCOMES.find((o) => o.value === outcome) || CONTACT_OUTCOMES[0]
}

export const OUTCOME_TO_STAGE: Record<string, string> = {
  interested: "qualified",
  callback_requested: "follow_up",
  follow_up_required: "follow_up",
  meeting_scheduled: "meeting",
  not_interested: "lost",
}

export const CALL_ATTEMPT_OUTCOMES = ["no_answer", "not_reached", "left_message"]

export function outcomeTargetStage(outcome: string) {
  const stage = OUTCOME_TO_STAGE[outcome]
  return stage ? STAGE_LABELS[stage] || stage : null
}
