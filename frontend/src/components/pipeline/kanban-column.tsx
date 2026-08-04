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
      className="flex-shrink-0 w-72 bg-white/3 rounded-xl border border-white/5 flex flex-col max-h-[calc(100vh-300px)]"
      style={{
        borderColor: isOver ? stage.color + "66" : undefined,
        background: isOver ? stage.color + "08" : undefined,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/5"
        style={{ borderBottomColor: stage.color + "22" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-medium text-white">{stage.label}</h3>
        </div>
        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
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
          <p className="text-xs text-gray-500 text-center py-8">Drop leads here</p>
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
