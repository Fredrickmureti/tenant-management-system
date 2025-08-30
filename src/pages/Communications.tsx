import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Mail, MessageSquare, Receipt, Clock, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Tables } from '@/integrations/supabase/types'
import { ExportButton } from '@/components/ExportButton'
import { formatCommunicationDataForExport } from '@/lib/export-utils'

type Log = Tables<'communication_logs'>
type Tenant = { id: string; name: string; email?: string | null; phone: string }

interface CommunicationForm {
	type: 'email' | 'sms'
	recipient: string
	subject?: string
	message: string
	scheduledFor?: string
}

interface ReceiptForm {
	tenantId: string
	billingCycleId: string
}

const Communications = () => {
	const [rows, setRows] = useState<(Log & { tenant: Tenant | null })[]>([])
	const [tenants, setTenants] = useState<Tenant[]>([])
	const [billingCycles, setBillingCycles] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [sending, setSending] = useState(false)
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')
	const [query, setQuery] = useState('')
	const { toast } = useToast()

	const [commForm, setCommForm] = useState<CommunicationForm>({
		type: 'email',
		recipient: '',
		subject: '',
		message: '',
		scheduledFor: ''
	})

	const [receiptForm, setReceiptForm] = useState<ReceiptForm>({
		tenantId: '',
		billingCycleId: ''
	})

	useEffect(() => {
		const load = async () => {
			// Load communication logs
			const { data: logs } = await supabase
				.from('communication_logs')
				.select('*')
				.order('sent_at', { ascending: false })
				.limit(100)

			// Load tenants with email and phone
			const { data: tenantsData } = await supabase
				.from('tenants')
				.select('id, name, email, phone')

			// Load billing cycles for receipt generation
			const { data: cyclesData } = await supabase
				.from('billing_cycles')
				.select('*, tenants!inner(name)')
				.order('created_at', { ascending: false })

			const tenantMap = new Map((tenantsData || []).map(t => [t.id, t]))
			setRows((logs || []).map(l => ({ ...l, tenant: tenantMap.get(l.tenant_id) || null })))
			setTenants(tenantsData || [])
			setBillingCycles(cyclesData || [])
			setLoading(false)
		}
		load()
	}, [])

	const statusColor = (s: string) =>
		s === 'sent' ? 'text-emerald-600' : s === 'failed' ? 'text-red-600' : 'text-amber-600'

	const handleSendCommunication = async () => {
		if (!commForm.recipient || !commForm.message) {
			toast({
				title: "Error",
				description: "Please fill in all required fields",
				variant: "destructive"
			})
			return
		}

		setSending(true)
		try {
			const { data, error } = await supabase.functions.invoke('send-communication', {
				body: {
					type: commForm.type,
					recipient: commForm.recipient,
					subject: commForm.subject,
					message: commForm.message,
					scheduledFor: commForm.scheduledFor || null
				}
			})

			if (error) throw error

			toast({
				title: "Success",
				description: commForm.scheduledFor 
					? "Message scheduled successfully" 
					: `${commForm.type.toUpperCase()} sent successfully`
			})

			setCommForm({
				type: 'email',
				recipient: '',
				subject: '',
				message: '',
				scheduledFor: ''
			})
			setIsDialogOpen(false)

			// Refresh logs
			const { data: logs } = await supabase
				.from('communication_logs')
				.select('*')
				.order('sent_at', { ascending: false })
				.limit(100)

			const tenantMap = new Map(tenants.map(t => [t.id, t]))
			setRows((logs || []).map(l => ({ ...l, tenant: tenantMap.get(l.tenant_id) || null })))

		} catch (error: any) {
			console.error('Error sending communication:', error)
			toast({
				title: "Error",
				description: error.message || "Failed to send communication",
				variant: "destructive"
			})
		}
		setSending(false)
	}

	const handleSendReceipt = async () => {
		if (!receiptForm.tenantId || !receiptForm.billingCycleId) {
			toast({
				title: "Error",
				description: "Please select both tenant and billing cycle",
				variant: "destructive"
			})
			return
		}

		setSending(true)
		try {
			const { data, error } = await supabase.functions.invoke('generate-receipt', {
				body: {
					tenantId: receiptForm.tenantId,
					billingCycleId: receiptForm.billingCycleId
				}
			})

			if (error) throw error

			toast({
				title: "Success",
				description: "Receipt generated and sent successfully"
			})

			setReceiptForm({ tenantId: '', billingCycleId: '' })

		} catch (error: any) {
			console.error('Error sending receipt:', error)
			toast({
				title: "Error",
				description: error.message || "Failed to generate receipt",
				variant: "destructive"
			})
		}
		setSending(false)
	}

	const selectedTenant = tenants.find(t => t.id === commForm.recipient)

	// Filter communications based on search and date range
	const filtered = rows.filter(r => {
		const matchesSearch = `${r.tenant?.name || ''} ${r.subject || ''} ${r.message}`
			.toLowerCase()
			.includes(query.toLowerCase());
		
		const sentDate = new Date(r.sent_at);
		const matchesDateRange = (!startDate || sentDate >= new Date(startDate)) &&
			(!endDate || sentDate <= new Date(endDate));
		
		return matchesSearch && matchesDateRange;
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<h1 className="text-3xl font-bold">Communications</h1>
				
				<div className="flex flex-wrap gap-2 items-center">
					<Input
						placeholder="Search messages..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="w-full sm:w-48"
					/>
					<div className="flex gap-2 items-center">
						<CalendarIcon className="h-4 w-4" />
						<Input
							type="date"
							placeholder="Start date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="w-36"
						/>
						<span className="text-muted-foreground">to</span>
						<Input
							type="date"
							placeholder="End date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="w-36"
						/>
					</div>
					<ExportButton 
						data={filtered}
						filename="communications"
						formatData={formatCommunicationDataForExport}
						disabled={loading}
					/>
				</div>
				
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Send className="h-4 w-4 mr-2" />
							New Message
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Send Communication</DialogTitle>
						</DialogHeader>

						<Tabs defaultValue="message" className="space-y-4">
							<TabsList>
								<TabsTrigger value="message">Send Message</TabsTrigger>
								<TabsTrigger value="receipt">Send Receipt</TabsTrigger>
							</TabsList>

							<TabsContent value="message" className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="type">Type</Label>
										<Select value={commForm.type} onValueChange={(value: 'email' | 'sms') => 
											setCommForm(prev => ({ ...prev, type: value }))}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="email">
													<div className="flex items-center">
														<Mail className="h-4 w-4 mr-2" />
														Email
													</div>
												</SelectItem>
												<SelectItem value="sms">
													<div className="flex items-center">
														<MessageSquare className="h-4 w-4 mr-2" />
														SMS
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="recipient">Recipient</Label>
										<Select value={commForm.recipient} onValueChange={(value) => 
											setCommForm(prev => ({ ...prev, recipient: value }))}>
											<SelectTrigger>
												<SelectValue placeholder="Select tenant" />
											</SelectTrigger>
											<SelectContent>
												{tenants.map(tenant => (
													<SelectItem key={tenant.id} value={tenant.id}>
														{tenant.name} - {commForm.type === 'email' ? tenant.email : tenant.phone}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{selectedTenant && (
											<p className="text-sm text-muted-foreground mt-1">
												{commForm.type === 'email' ? selectedTenant.email : selectedTenant.phone}
											</p>
										)}
									</div>
								</div>

								{commForm.type === 'email' && (
									<div>
										<Label htmlFor="subject">Subject</Label>
										<Input
											value={commForm.subject}
											onChange={(e) => setCommForm(prev => ({ ...prev, subject: e.target.value }))}
											placeholder="Enter email subject"
										/>
									</div>
								)}

								<div>
									<Label htmlFor="message">Message</Label>
									<Textarea
										value={commForm.message}
										onChange={(e) => setCommForm(prev => ({ ...prev, message: e.target.value }))}
										placeholder="Enter your message"
										rows={6}
									/>
								</div>

								<div>
									<Label htmlFor="scheduled">
										<Clock className="h-4 w-4 inline mr-1" />
										Schedule for later (optional)
									</Label>
									<Input
										type="datetime-local"
										value={commForm.scheduledFor}
										onChange={(e) => setCommForm(prev => ({ ...prev, scheduledFor: e.target.value }))}
									/>
								</div>

								<Button onClick={handleSendCommunication} disabled={sending} className="w-full">
									{sending ? 'Sending...' : commForm.scheduledFor ? 'Schedule Message' : 'Send Now'}
								</Button>
							</TabsContent>

							<TabsContent value="receipt" className="space-y-4">
								<div>
									<Label htmlFor="tenant">Tenant</Label>
									<Select value={receiptForm.tenantId} onValueChange={(value) => 
										setReceiptForm(prev => ({ ...prev, tenantId: value }))}>
										<SelectTrigger>
											<SelectValue placeholder="Select tenant" />
										</SelectTrigger>
										<SelectContent>
											{tenants.map(tenant => (
												<SelectItem key={tenant.id} value={tenant.id}>
													{tenant.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="billing-cycle">Billing Cycle</Label>
									<Select value={receiptForm.billingCycleId} onValueChange={(value) => 
										setReceiptForm(prev => ({ ...prev, billingCycleId: value }))}>
										<SelectTrigger>
											<SelectValue placeholder="Select billing cycle" />
										</SelectTrigger>
										<SelectContent>
											{billingCycles
												.filter(cycle => !receiptForm.tenantId || cycle.tenant_id === receiptForm.tenantId)
												.map(cycle => (
												<SelectItem key={cycle.id} value={cycle.id}>
													{cycle.tenants?.name} - {cycle.month}/{cycle.year}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<Button onClick={handleSendReceipt} disabled={sending} className="w-full">
									<Receipt className="h-4 w-4 mr-2" />
									{sending ? 'Generating...' : 'Generate & Send Receipt'}
								</Button>
							</TabsContent>
						</Tabs>
					</DialogContent>
				</Dialog>
			</div>

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
							{filtered.map((r) => (
								<div key={r.id} className="border rounded-md p-4">
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
										<div className="flex items-center gap-2">
											<div className="font-medium">{r.tenant?.name || '—'}</div>
											<Badge variant={r.type === 'email' ? 'default' : 'secondary'}>
												{r.type === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
												{r.type.toUpperCase()}
											</Badge>
										</div>
										<div className={`text-xs ${statusColor(r.status)}`}>{r.status}</div>
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										{new Date(r.sent_at).toLocaleString('en-KE')}
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
