import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

type Log = Tables<'communication_logs'>

type Tenant = { id: string; name: string }

const Communications = () => {
	const [rows, setRows] = useState<(Log & { tenant: Tenant | null })[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const load = async () => {
			const { data: logs } = await supabase
				.from('communication_logs')
				.select('*')
				.order('sent_at', { ascending: false })
				.limit(100)

			const { data: tenants } = await supabase
				.from('tenants')
				.select('id, name')

			const byId = new Map((tenants || []).map(t => [t.id, t]))
			setRows((logs || []).map(l => ({ ...l, tenant: byId.get(l.tenant_id) || null })))
			setLoading(false)
		}
		load()
	}, [])

		const statusColor = (s: string) =>
		s === 'sent' ? 'text-emerald-600' : s === 'failed' ? 'text-red-600' : 'text-amber-600'

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold">Communications</h1>
			<Card>
				<CardHeader>
					<CardTitle>Recent Messages</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="py-10 text-center text-muted-foreground">Loading...</div>
					) : rows.length === 0 ? (
						<div className="py-10 text-center text-muted-foreground">No messages</div>
					) : (
						<div className="space-y-4">
							{rows.map((r) => (
								<div key={r.id} className="border rounded-md p-4">
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
										<div className="font-medium">{r.tenant?.name || '—'}</div>
										<div className={`text-xs ${statusColor(r.status)}`}>{r.status}</div>
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										{r.type.toUpperCase()} • {new Date(r.sent_at).toLocaleString('en-KE')}
									</div>
									{r.subject && <div className="mt-2 font-medium">{r.subject}</div>}
									<div className="text-sm mt-1 whitespace-pre-wrap">{r.message}</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export default Communications
