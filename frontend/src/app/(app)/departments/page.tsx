import { redirect } from "next/navigation"

export default function DepartmentsRedirect() {
  redirect("/settings#products")
}
