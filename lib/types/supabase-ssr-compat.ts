// Compatibility shim: @supabase/ssr v0.5.2 imports from
// "@supabase/supabase-js/dist/module/lib/types" which no longer exists in v2.108+.
// tsconfig paths redirects that import here.
// GenericSchema is an internal type (not exported) so we inline its shape.
// TypeScript structural typing means the shape-match is sufficient.

export type { SupabaseClientOptions } from '@supabase/supabase-js'

type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type GenericTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: GenericRelationship[]
}

type GenericView = {
  Row: Record<string, unknown>
  Relationships: GenericRelationship[]
}

type GenericFunction = {
  Args: Record<string, unknown> | never
  Returns: unknown
}

export type GenericSchema = {
  Tables: Record<string, GenericTable>
  Views: Record<string, GenericView>
  Functions: Record<string, GenericFunction>
}
