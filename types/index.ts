export type Role = 'member' | 'viewer' | 'manager'
export type Product = 'So-net光' | 'WiMAX'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  created_at: string
}

export interface Record {
  id: number
  user_id: number
  year: number
  month: number
  product: Product
  cancel_count: number
  activation_count: number
}

export interface HKRSummary {
  product: Product | 'all'
  cancel_count: number
  activation_count: number
  hkr: number | null
}
