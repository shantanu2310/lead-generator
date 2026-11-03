"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"

export type Product = { id: string; name: string; lead_count: number }

type ProductsContextValue = {
  products: Product[]
  selectedProductId: string
  setSelectedProductId: (id: string) => void
  reloadProducts: () => Promise<void>
  productsError: string | null
  productsLoading: boolean
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productsLoading, setProductsLoading] = useState(true)

  const reloadProducts = useCallback(async () => {
    try {
      setProductsLoading(true)
      const result: Product[] = await api.listDepartments()
      setProducts(result)
      setSelectedProductId((current) => result.some((product) => product.id === current) ? current : "")
      setProductsError(null)
    } catch (error) {
      setProductsError("Could not load products. Please try again.")
      throw error
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!getUser()?.is_admin) return
    let active = true
    api.listDepartments().then((result: Product[]) => {
      if (active) { setProducts(result); setProductsError(null) }
    }).catch(() => {
      if (active) setProductsError("Could not load products. Please try again.")
    }).finally(() => { if (active) setProductsLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <ProductsContext.Provider value={{ products, selectedProductId, setSelectedProductId, reloadProducts, productsError, productsLoading }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (!context) throw new Error("useProducts must be used within ProductsProvider")
  return context
}
