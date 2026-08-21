"use client"

import { useEffect, useState } from "react"
import { Building2, Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { api } from "@/lib/api"

type Department = {
  id: string
  name: string
  lead_count: number
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [newDept, setNewDept] = useState("")
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editingDeptName, setEditingDeptName] = useState("")
  const [savingDept, setSavingDept] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function reloadDepartments() {
    const d = await api.listDepartments()
    setDepartments(d || [])
  }

  useEffect(() => {
    reloadDepartments()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function addDepartment() {
    const name = newDept.trim()
    if (!name) {
      setMsg({ ok: false, text: "Enter a department name" })
      return
    }
    setSavingDept(true)
    setMsg(null)
    try {
      await api.createDepartment(name)
      setNewDept("")
      await reloadDepartments()
      setMsg({ ok: true, text: `Department "${name}" added` })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to add department" })
    } finally {
      setSavingDept(false)
    }
  }

  async function saveDepartmentRename(d: Department) {
    const name = editingDeptName.trim()
    if (!name) {
      setMsg({ ok: false, text: "Enter a department name" })
      return
    }
    setSavingDept(true)
    setMsg(null)
    try {
      await api.updateDepartment(d.id, name)
      setEditingDeptId(null)
      await reloadDepartments()
      setMsg({ ok: true, text: "Department renamed" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to rename department" })
    } finally {
      setSavingDept(false)
    }
  }

  async function deleteDepartment(d: Department) {
    if (!confirm(`Delete department "${d.name}"? Its leads keep their data but will no longer be filtered by it.`)) return
    setSavingDept(true)
    setMsg(null)
    try {
      await api.deleteDepartment(d.id)
      await reloadDepartments()
      setMsg({ ok: true, text: "Department deleted" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to delete department" })
    } finally {
      setSavingDept(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
            {msg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {msg.text}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-[#F46036]" />
                <h2 className="font-semibold text-lg text-slate-900">Departments</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                A department is required to generate leads. Search results are tagged with the department you pick.
              </p>

              <div className="flex items-center gap-3 mb-5">
                <input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDepartment()
                  }}
                  placeholder="New department name, e.g. Plumbers"
                  className="flex-1 max-w-sm px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <button
                  onClick={addDepartment}
                  disabled={savingDept}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:bg-[#F46036]/40 text-sm font-medium text-white rounded-lg transition-colors"
                >
                  {savingDept ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : departments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-300 rounded-lg">
                  No departments yet. Add your first one to start generating leads.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-4 py-3">
                      {editingDeptId === d.id ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <input
                            value={editingDeptName}
                            onChange={(e) => setEditingDeptName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDepartmentRename(d)
                              if (e.key === "Escape") setEditingDeptId(null)
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
                          />
                          <button
                            onClick={() => saveDepartmentRename(d)}
                            disabled={savingDept}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#F46036] hover:bg-[#D94A22] rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDeptId(null)}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-sm font-medium text-slate-900">{d.name}</p>
                            <span className="text-xs text-slate-500">{d.lead_count} leads</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingDeptId(d.id); setEditingDeptName(d.name); setMsg(null) }}
                              className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                              title="Rename"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDepartment(d)}
                              className="p-2 text-red-500 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
  )
}