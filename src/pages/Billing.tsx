import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { formatKES } from '@/lib/utils'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react'

// Define type for billing cycle records
type Billing = {
	id: string
	tenant_id: string
	month: number
	year: number
	previous_reading: number
	current_reading: number
	units_used: number
	rate_per_unit: number
	bill_amount: number
	paid_amount: number
	previous_balance: number
	current_balance: number
	bill_date: string
	due_date: string
}

type Tenant = { id: string; name: string; house_unit_number: string }

const months = [
	'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
]

// Billing form component
const BillingForm = ({ 
	billing, 
	tenants, 
	onSubmit, 
	isLoading,
	currentMonth,
	currentYear
}: { 
	billing?: Billing & { tenant: Tenant | null }, 
	tenants: Tenant[],
	onSubmit: (data: Partial<Billing>) => void,
	isLoading: boolean,
	currentMonth: number,
	currentYear: number
}) => {
	const isEditing = !!billing;
	const [formData, setFormData] = useState<Partial<Billing>>(
		billing || {
			tenant_id: '',
			month: currentMonth,
			year: currentYear,
			previous_reading: 0,
			current_reading: 0,
			rate_per_unit: 50.00,
			paid_amount: 0,
			previous_balance: 0,
			bill_date: new Date().toISOString().split('T')[0],
			due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		}
	);

	// Find last billing for selected tenant to auto-populate previous reading
	const [lastBilling, setLastBilling] = useState<Billing | null>(null);
	const [fetchingLastBilling, setFetchingLastBilling] = useState(false);

	const fetchLastBilling = async (tenant_id: string) => {
		if (!tenant_id) return;
		
		setFetchingLastBilling(true);
		try {
			// Get last billing cycle for this tenant
			const { data } = await supabase
				.from('billing_cycles')
				.select('*')
				.eq('tenant_id', tenant_id)
				.order('year', { ascending: false })
				.order('month', { ascending: false })
				.limit(1);
				
			if (data && data.length > 0) {
				setLastBilling(data[0] as Billing);
				// Auto-populate previous reading from last current reading
				setFormData(prev => ({
					...prev,
					previous_reading: data[0].current_reading || 0,
					previous_balance: data[0].current_balance || 0
				}));
			}
		} catch (error) {
			console.error('Error fetching last billing:', error);
		} finally {
			setFetchingLastBilling(false);
		}
	};

	// When tenant changes, fetch their last billing cycle
	useEffect(() => {
		if (formData.tenant_id) {
			fetchLastBilling(formData.tenant_id);
		}
	}, [formData.tenant_id]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: name.includes('reading') || name.includes('rate') ? parseFloat(value) : value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid gap-4">
				{!isEditing && (
					<div className="space-y-2">
						<Label htmlFor="tenant_id">Select Tenant</Label>
						<select
							id="tenant_id"
							name="tenant_id"
							value={formData.tenant_id || ''}
							onChange={handleChange}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							required
						>
							<option value="">Select a tenant</option>
							{tenants.map(tenant => (
								<option key={tenant.id} value={tenant.id}>
									{tenant.name} - Unit {tenant.house_unit_number}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="previous_reading">Previous Meter Reading</Label>
						<Input
							id="previous_reading"
							name="previous_reading"
							type="number"
							step="0.01"
							value={formData.previous_reading || 0}
							onChange={handleChange}
							disabled={fetchingLastBilling}
							required
						/>
						{fetchingLastBilling && <p className="text-xs text-muted-foreground">Loading previous reading...</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="current_reading">Current Meter Reading</Label>
						<Input
							id="current_reading"
							name="current_reading"
							type="number"
							step="0.01"
							value={formData.current_reading || 0}
							onChange={handleChange}
							required
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="rate_per_unit">Rate Per Unit (KES)</Label>
						<Input
							id="rate_per_unit"
							name="rate_per_unit"
							type="number"
							step="0.01"
							value={formData.rate_per_unit || 50}
							onChange={handleChange}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="previous_balance">Previous Balance (KES)</Label>
						<Input
							id="previous_balance"
							name="previous_balance"
							type="number"
							step="0.01"
							value={formData.previous_balance || 0}
							onChange={handleChange}
							disabled={fetchingLastBilling}
							required
						/>
					</div>
				</div>

				{/* paid_amount is computed from payments; do not edit manually */}
			</div>

			<DialogFooter>
				<Button type="submit" disabled={isLoading || fetchingLastBilling}>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{isEditing ? 'Updating...' : 'Creating...'}
						</>
					) : (
						<>{isEditing ? 'Update Bill' : 'Create Bill'}</>
					)}
				</Button>
			</DialogFooter>
		</form>
	);
};

const Billing = () => {
	const now = new Date()
	const [year, setYear] = useState(now.getFullYear())
	const [month, setMonth] = useState(now.getMonth() + 1)
	const [query, setQuery] = useState('')
	const [rows, setRows] = useState<(Billing & { tenant: Tenant | null })[]>([])
	const [loading, setLoading] = useState(true)
	const [isProcessing, setIsProcessing] = useState(false)
	const [showAddDialog, setShowAddDialog] = useState(false)
	const [editingBill, setEditingBill] = useState<(Billing & { tenant: Tenant | null }) | undefined>(undefined)
	const [allTenants, setAllTenants] = useState<Tenant[]>([])

	// Function to fetch data
	const fetchData = async () => {
		setLoading(true)
		try {
			const { data: bills } = await supabase
				.from('billing_cycles')
				.select('*')
				.eq('year', year)
				.eq('month', month)
				.order('created_at', { ascending: false })

			const { data: tenants } = await supabase
				.from('tenants')
				.select('id, name, house_unit_number')

			setAllTenants(tenants as Tenant[] || []);
			
			const byId = new Map((tenants || []).map(t => [t.id, t]))
			const withTenant = (bills || []).map(b => ({ ...b, tenant: byId.get(b.tenant_id) || null }))
			setRows(withTenant)
		} catch (error) {
			console.error('Error fetching data:', error)
		} finally {
			setLoading(false)
		}
	}
	
	useEffect(() => {
		fetchData()
	}, [year, month])

	// CRUD operations for billing cycles
	const handleAddBill = async (billData: Partial<Billing>) => {
		if (!billData.tenant_id || !billData.current_reading) {
			console.error('Missing required billing fields');
			return;
		}

		setIsProcessing(true);
		try {
			const newBill = {
				tenant_id: billData.tenant_id,
				month: billData.month,
				year: billData.year,
				previous_reading: billData.previous_reading || 0,
				current_reading: billData.current_reading,
				rate_per_unit: billData.rate_per_unit || 50.00,
				paid_amount: billData.paid_amount || 0,
				previous_balance: billData.previous_balance || 0,
				bill_date: billData.bill_date,
				due_date: billData.due_date,
			};
			
			const { error } = await supabase
				.from('billing_cycles')
				.insert(newBill);
			
			if (error) {
				console.error('Error creating bill:', error);
				// Check if it's a unique constraint violation (already have a bill for this tenant/month/year)
				if (error.code === '23505') {
					alert('A bill already exists for this tenant in this month/year.');
				}
				return;
			}
			
			// Refresh data
			await fetchData();
			
			// Close the dialog
			setShowAddDialog(false);
		} catch (err) {
			console.error('Error creating bill:', err);
		} finally {
			setIsProcessing(false);
		}
	};
	
	const handleUpdateBill = async (billData: Partial<Billing>) => {
		if (!editingBill?.id) return;
		
		setIsProcessing(true);
		try {
			// Do not allow manual updates to paid_amount; it's derived from payments
			// Also remove tenant object and other non-database fields
			const { paid_amount, tenant, ...rest } = billData as any;
			const { error } = await supabase
				.from('billing_cycles')
				.update(rest)
				.eq('id', editingBill.id);
			
			if (error) {
				console.error('Error updating bill:', error);
				return;
			}
			
			// Refresh data
			await fetchData();
			
			// Close the dialog and reset the editing state
			setEditingBill(undefined);
		} catch (err) {
			console.error('Error updating bill:', err);
		} finally {
			setIsProcessing(false);
		}
	};
	
	const handleDeleteBill = async (id: string) => {
		try {
			const { error } = await supabase
				.from('billing_cycles')
				.delete()
				.eq('id', id);
			
			if (error) {
				console.error('Error deleting bill:', error);
				return;
			}
			
			// Refresh data
			await fetchData();
		} catch (err) {
			console.error('Error deleting bill:', err);
		}
	};

	const filtered = rows.filter(r =>
		`${r.tenant?.name || ''}`.toLowerCase().includes(query.toLowerCase())
	)

	const years = Array.from({ length: 6 }).map((_, i) => 2020 + i)

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<h1 className="text-3xl font-bold">Billing</h1>
				<div className="flex flex-wrap gap-2 items-center">
					<Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
						<SelectTrigger className="w-[120px]"><SelectValue placeholder="Month" /></SelectTrigger>
						<SelectContent>
							{months.map((m, idx) => (
								<SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
						<SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
						<SelectContent>
							{years.map(y => (
								<SelectItem key={y} value={String(y)}>{y}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input placeholder="Search by tenant" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:w-64" />
					<Button onClick={() => setShowAddDialog(true)}>
						<PlusCircle className="h-4 w-4 mr-2" />
						New Bill
					</Button>
				</div>
			</div>

			{/* Create New Bill Dialog */}
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Create New Bill</DialogTitle>
						<DialogDescription>
							Create a new water bill for a tenant.
						</DialogDescription>
					</DialogHeader>
					<BillingForm 
						tenants={allTenants}
						onSubmit={handleAddBill}
						isLoading={isProcessing}
						currentMonth={month}
						currentYear={year}
					/>
				</DialogContent>
			</Dialog>
			
			{/* Edit Bill Dialog */}
			{editingBill && (
				<Dialog 
					open={!!editingBill} 
					onOpenChange={(open) => !open && setEditingBill(undefined)}
				>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Edit Bill</DialogTitle>
							<DialogDescription>
								Update billing information for {editingBill.tenant?.name || 'tenant'}.
							</DialogDescription>
						</DialogHeader>
						<BillingForm 
							billing={editingBill}
							tenants={allTenants}
							onSubmit={handleUpdateBill}
							isLoading={isProcessing}
							currentMonth={month}
							currentYear={year}
						/>
					</DialogContent>
				</Dialog>
			)}
			
			<Card>
				<CardHeader>
					<CardTitle>Billing for {months[month - 1]} {year}</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="py-10 text-center text-muted-foreground">
							<Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
							<p>Loading billing data...</p>
						</div>
					) : filtered.length === 0 ? (
						<div className="py-10 text-center text-muted-foreground">
							<p>No bills found for {months[month - 1]} {year}</p>
							<Button 
								variant="outline" 
								className="mt-4"
								onClick={() => setShowAddDialog(true)}
							>
								<PlusCircle className="h-4 w-4 mr-2" />
								Create New Bill
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left border-b">
										<th className="py-2 pr-4">Tenant</th>
										<th className="py-2 pr-4">Unit</th>
										<th className="py-2 pr-4">Units Used</th>
										<th className="py-2 pr-4">Billed</th>
										<th className="py-2 pr-4">Paid</th>
										<th className="py-2 pr-4">Balance</th>
										<th className="py-2 pr-4">Due Date</th>
										<th className="py-2 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((r) => (
										<tr key={r.id} className="border-b last:border-0">
											<td className="py-3 pr-4 font-medium">{r.tenant?.name || '—'}</td>
											<td className="py-3 pr-4">{r.tenant?.house_unit_number || '—'}</td>
											<td className="py-3 pr-4">{r.units_used} m³</td>
											<td className="py-3 pr-4">{formatKES(r.bill_amount)}</td>
											<td className="py-3 pr-4">{formatKES(r.paid_amount)}</td>
											<td className={`py-3 pr-4 ${r.current_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
												{formatKES(r.current_balance)}
											</td>
											<td className="py-3 pr-4">{new Date(r.due_date).toLocaleDateString()}</td>
											<td className="py-3 text-right">
												<div className="flex justify-end gap-2">
													<Button 
														variant="ghost" 
														size="sm" 
														onClick={() => setEditingBill(r)}
													>
														<Pencil className="h-4 w-4 mr-1" />
														Edit
													</Button>
													
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button variant="ghost" size="sm" className="text-destructive">
																<Trash2 className="h-4 w-4 mr-1" />
																Delete
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>Are you sure?</AlertDialogTitle>
																<AlertDialogDescription>
																	This will permanently delete this billing record. Any associated payments will remain but will not be linked to a bill.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancel</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDeleteBill(r.id)}
																	className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
																>
																	Delete Bill
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export default Billing
