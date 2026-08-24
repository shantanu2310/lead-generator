"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { LeadCard, LeadCardSkeleton } from "./lead-card"
import { formatNumber } from "@/lib/utils"
import type { LeadListItem } from "@/hooks/use-leads"

type StageConfig = {
  value: string
  label: string
  color: string
}

export function KanbanColumn({
  stage,
  leads,
  loading,
}: {
  stage: StageConfig
  leads: LeadListItem[]
  loading?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-72 bg-white rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-300px)]"
      style={{
        borderColor: isOver ? stage.color + "99" : undefined,
        background: isOver ? "#f8fafc" : undefined,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
        style={{ borderBottomColor: stage.color + "33" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold text-slate-900">{stage.label}</h3>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
          {formatNumber(leads.length)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <>
            <LeadCardSkeleton />
            <LeadCardSkeleton />
            <LeadCardSkeleton />
          </>
        ) : leads.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">Drop leads here</p>
        ) : (
          <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  )
}
