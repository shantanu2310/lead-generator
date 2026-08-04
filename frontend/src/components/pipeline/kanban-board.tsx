"use client"

import { useEffect, useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { PIPELINE_STAGES } from "@/lib/constants"
import { api } from "@/lib/api"
import { KanbanColumn } from "./kanban-column"
import { LeadCard } from "./lead-card"
import type { LeadListItem } from "@/hooks/use-leads"

type StageLeads = Record<string, LeadListItem[]>

export function KanbanBoard({ leads }: { leads: LeadListItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [stageLeads, setStageLeads] = useState<StageLeads>(() => groupLeads(leads))

  useEffect(() => {
    setStageLeads(groupLeads(leads))
  }, [leads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const activeLead = activeId ? findLeadById(stageLeads, activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    let targetColumn = over.id as string

    if (!PIPELINE_STAGES.some((s) => s.value === targetColumn)) {
      targetColumn = findLeadColumn(stageLeads, over.id as string) ?? targetColumn
    }
    if (!PIPELINE_STAGES.some((s) => s.value === targetColumn)) return

    const sourceColumn = findLeadColumn(stageLeads, leadId)
    if (!sourceColumn || sourceColumn === targetColumn) return

    setStageLeads((prev) => {
      const updated = { ...prev }
      const lead = updated[sourceColumn]?.find((l) => l.id === leadId)
      if (!lead) return prev

      updated[sourceColumn] = updated[sourceColumn].filter((l) => l.id !== leadId)
      updated[targetColumn] = [...(updated[targetColumn] || []), { ...lead, pipeline_stage: targetColumn }]
      return updated
    })

    try {
      await api.moveLeadStage(leadId, targetColumn, "Drag & drop")
      window.dispatchEvent(new Event("pipeline:changed"))
    } catch (err) {
      console.error("Failed to move lead", err)
      setStageLeads((prev) => {
        const updated = { ...prev }
        const lead = updated[targetColumn]?.find((l) => l.id === leadId)
        if (!lead) return prev
        updated[targetColumn] = updated[targetColumn].filter((l) => l.id !== leadId)
        updated[sourceColumn] = [...(updated[sourceColumn] || []), { ...lead, pipeline_stage: sourceColumn }]
        return updated
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn key={stage.value} stage={stage} leads={stageLeads[stage.value] || []} />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function groupLeads(leads: LeadListItem[]): StageLeads {
  const grouped: StageLeads = {}
  for (const stage of PIPELINE_STAGES) {
    grouped[stage.value] = []
  }
  for (const lead of leads) {
    if (grouped[lead.pipeline_stage]) {
      grouped[lead.pipeline_stage].push(lead)
    } else {
      grouped["new_lead"].push(lead)
    }
  }
  return grouped
}

function findLeadColumn(stageLeads: StageLeads, leadId: string): string | null {
  for (const [stage, leads] of Object.entries(stageLeads)) {
    if (leads.some((l) => l.id === leadId)) return stage
  }
  return null
}

function findLeadById(stageLeads: StageLeads, leadId: string): LeadListItem | null {
  for (const leads of Object.values(stageLeads)) {
    const found = leads.find((l) => l.id === leadId)
    if (found) return found
  }
  return null
}
