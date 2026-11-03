"use client"

import { useState } from "react"
import { Building2, Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import { useProducts } from "@/hooks/use-products"

type Department = {
  id: string
  name: string
  lead_count: number
}

export function ProductsManager() {
  const { products: departments, reloadProducts, productsError, productsLoading: loading } = useProducts()
  const [newDept, setNewDept] = useState("")
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editingDeptName, setEditingDeptName] = useState("")
  const [savingDept, setSavingDept] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function reloadDepartments() {
    await reloadProducts()
  }

  async function addDepartment() {
    const name = newDept.trim()
    if (!name) {
      setMsg({ ok: false, text: "Enter a product name" })
      return
    }
    setSavingDept(true)
    setMsg(null)
    try {
      await api.createDepartment(name)
      setNewDept("")
      await reloadDepartments()
      setMsg({ ok: true, text: `Product "${name}" added` })
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to add product" })
    } finally {
      setSavingDept(false)
    }
  }

  async function saveDepartmentRename(d: Department) {
    const name = editingDeptName.trim()
    if (!name) {
      setMsg({ ok: false, text: "Enter a product name" })
      return
    }
    setSavingDept(true)
    setMsg(null)
    try {
      await api.updateDepartment(d.id, name)
      setEditingDeptId(null)
      await reloadDepartments()
      setMsg({ ok: true, text: "Product renamed" })
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to rename product" })
    } finally {
      setSavingDept(false)
    }
  }

  async function deleteDepartment(d: Department) {
    if (!confirm(`Delete product "${d.name}"? Products linked to leads or search history cannot be deleted.`)) return
    setSavingDept(true)
    setMsg(null)
    try {
      await api.deleteDepartment(d.id)
      await reloadDepartments()
      setMsg({ ok: true, text: "Product deleted" })
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to delete product" })
    } finally {
      setSavingDept(false)
    }
  }

  return (
    <div id="products" className="min-w-0 lg:h-full lg:min-h-0 lg:overflow-y-auto scroll-mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            {msg && (
              <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {msg.text}
              </div>
            )}

              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-[#F46036]" />
                <h2 className="font-semibold text-lg text-slate-900">Products</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                A product is required to generate leads. Search results are tagged with the product you pick.
              </p>

              <div className="flex items-center gap-3 mb-5">
                <input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDepartment()
                  }}
                  placeholder="New product name, e.g. Recruitment"
                  className="min-w-0 flex-1 max-w-sm px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
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
              ) : productsError ? (
                <p role="alert" className="text-sm text-red-700 py-6">{productsError} <button onClick={() => void reloadDepartments().catch(() => {})} className="underline">Retry</button></p>
              ) : departments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-300 rounded-lg">
                  No products yet. Add your first one to start generating leads.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-4 py-3">
                      {editingDeptId === d.id ? (
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 max-w-sm">
                          <input
                            value={editingDeptName}
                            onChange={(e) => setEditingDeptName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDepartmentRename(d)
                              if (e.key === "Escape") setEditingDeptId(null)
                            }}
                            autoFocus
                            className="min-w-0 flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
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
                            <span className="text-xs font-medium text-slate-600">{d.lead_count} leads</span>
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
  )
}
