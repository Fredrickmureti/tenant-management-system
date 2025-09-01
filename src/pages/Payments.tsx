import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
import { useToast } from "@/hooks/use-toast"
import { Loader2, PlusCircle, Pencil, Trash2, CalendarIcon } from 'lucide-react'
import { ExportButton } from '@/components/ExportButton'
import { formatPaymentDataForExport } from '@/lib/export-utils'

type Payment = {
	id: string
	tenant_id: string
	billing_cycle_id: string
	amount: number
	payment_date: string
	payment_method: string | null
	notes: string | null
	created_by: string
}

type Tenant = { id: string; name: string; house_unit_number: string }
type BillingCycle = { id: string; month: number; year: number; current_balance: number }

const PaymentForm = ({ 
	payment, 
	tenants,
	onSubmit, 
	isLoading 
}: { 
	payment?: Payment & { tenant: Tenant | null }, 
	tenants: Tenant[],
	onSubmit: (data: Partial<Payment>) => void,
	isLoading: boolean
}) => {
	const isEditing = !!payment;
	const [formData, setFormData] = useState<Partial<Payment>>(
		payment || {
			tenant_id: '',
			billing_cycle_id: '',
			amount: 0,
			payment_date: new Date().toISOString().split('T')[0],
			payment_method: 'cash',
			notes: '',
		}
	);
	
	const [currentBillInfo, setCurrentBillInfo] = useState<{
		bill_amount: number;
		paid_amount: number;
		current_balance: number;
		previous_balance: number;
	} | null>(null);
	
	const [availableBillingCycles, setAvailableBillingCycles] = useState<BillingCycle[]>([]);
	const [loadingBillingCycles, setLoadingBillingCycles] = useState(false);

	// Fetch billing cycles when tenant is selected
	const fetchBillingCycles = async (tenant_id: string) => {
		if (!tenant_id) return;
		
		setLoadingBillingCycles(true);
		try {
			// First, check if any billing cycles exist for this tenant
			const { data: allCycles, error: checkError } = await supabase
				.from('billing_cycles')
				.select('id, month, year, current_balance, bill_amount, paid_amount, previous_balance')
				.eq('tenant_id', tenant_id);
				
			if (checkError) {
				console.error('Error checking billing cycles:', checkError);
				return;
			}
			
			console.log(`Found ${allCycles?.length || 0} total billing cycles for tenant`);
			
			// Now fetch only those with outstanding balance
			const { data, error } = await supabase
				.from('billing_cycles')
				.select('id, month, year, current_balance, bill_amount, paid_amount, previous_balance')
				.eq('tenant_id', tenant_id)
				.gt('current_balance', 0) // Only show bills with outstanding balance
				.order('year', { ascending: false })
				.order('month', { ascending: false });
				
			if (error) {
				console.error('Error fetching billing cycles:', error);
				return;
			}
			
			console.log(`Found ${data?.length || 0} billing cycles with outstanding balance`);
			
			setAvailableBillingCycles(data as BillingCycle[] || []);
		} catch (error) {
			console.error('Error fetching billing cycles:', error);
		} finally {
			setLoadingBillingCycles(false);
		}
	};

	// Fetch current bill info when billing cycle is selected
	const fetchBillInfo = async (billing_cycle_id: string) => {
		if (!billing_cycle_id) {
			setCurrentBillInfo(null);
			return;
		}
		
		try {
			const { data, error } = await supabase
				.from('billing_cycles')
				.select('bill_amount, paid_amount, current_balance, previous_balance')
				.eq('id', billing_cycle_id)
				.single();
				
			if (error) {
				console.error('Error fetching bill info:', error);
				return;
			}
			
			setCurrentBillInfo(data);
		} catch (error) {
			console.error('Error fetching bill info:', error);
		}
	};

	useEffect(() => {
		if (formData.tenant_id) {
			fetchBillingCycles(formData.tenant_id);
		}
	}, [formData.tenant_id]);

	useEffect(() => {
		if (formData.billing_cycle_id) {
			fetchBillInfo(formData.billing_cycle_id);
		}
	}, [formData.billing_cycle_id]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid gap-4">
				<div className="space-y-2">
					<Label htmlFor="tenant_id">Select Tenant</Label>
					{isEditing ? (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{payment?.tenant?.name || 'Unknown Tenant'} - Unit {payment?.tenant?.house_unit_number || 'N/A'}
						</div>
					) : (
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
					)}
				</div>

				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<Label htmlFor="billing_cycle_id">Select Bill</Label>
						{!isEditing && (
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="show_all_bills"
									onChange={(e) => {
										if (e.target.checked) {
											// Show all bills regardless of balance
											if (formData.tenant_id) {
												(async () => {
													setLoadingBillingCycles(true);
													try {
														const { data } = await supabase
															.from('billing_cycles')
															.select('id, month, year, current_balance, bill_amount, paid_amount, previous_balance')
															.eq('tenant_id', formData.tenant_id)
															.order('year', { ascending: false })
															.order('month', { ascending: false });
															
														setAvailableBillingCycles(data as BillingCycle[] || []);
													} catch (error) {
														console.error('Error fetching all billing cycles:', error);
													} finally {
														setLoadingBillingCycles(false);
													}
												})();
											}
										} else {
											// Revert to only showing outstanding bills
											if (formData.tenant_id) {
												fetchBillingCycles(formData.tenant_id);
											}
										}
									}}
								/>
								<label htmlFor="show_all_bills" className="text-xs">Show all bills</label>
							</div>
						)}
					</div>
					{isEditing ? (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{/* Show billing cycle info for editing */}
							Billing period from payment record
						</div>
					) : (
						<select
							id="billing_cycle_id"
							name="billing_cycle_id"
							value={formData.billing_cycle_id || ''}
							onChange={handleChange}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							required
							disabled={!formData.tenant_id || loadingBillingCycles}
						>
							<option value="">
								{loadingBillingCycles ? 'Loading bills...' : 'Select a bill'}
							</option>
							{availableBillingCycles.map(bill => (
								<option key={bill.id} value={bill.id}>
									{new Date(bill.year, bill.month - 1).toLocaleDateString('default', { month: 'short', year: 'numeric' })} - 
									Balance: {formatKES(bill.current_balance)}
								</option>
							))}
						</select>
					)}
					{!isEditing && formData.tenant_id && availableBillingCycles.length === 0 && !loadingBillingCycles && (
						<div className="mt-2 p-3 rounded bg-muted/50">
							<p className="text-sm font-medium">No bills found for this tenant</p>
							<p className="text-xs text-muted-foreground">
								You need to create a billing cycle for this tenant before recording payments.
								Go to the Billing page to create a new billing cycle.
							</p>
						</div>
					)}
				</div>

				{/* Show current bill details when editing or when bill is selected */}
				{(isEditing || currentBillInfo) && (
					<div className="p-4 bg-muted/50 rounded-lg space-y-2">
						<h4 className="font-medium">Current Bill Information</h4>
						{currentBillInfo && (
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Bill Amount:</span>
									<div className="font-medium">{formatKES(currentBillInfo.bill_amount || 0)}</div>
								</div>
								<div>
									<span className="text-muted-foreground">Previous Balance:</span>
									<div className="font-medium">{formatKES(currentBillInfo.previous_balance || 0)}</div>
								</div>
								<div>
									<span className="text-muted-foreground">Total Due:</span>
									<div className="font-medium">{formatKES(currentBillInfo.bill_amount || 0)}</div>
								</div>
								<div>
									<span className="text-muted-foreground">Paid So Far:</span>
									<div className="font-medium">{formatKES(currentBillInfo.paid_amount || 0)}</div>
								</div>
								<div className="col-span-2">
									<span className="text-muted-foreground">Outstanding Balance:</span>
									<div className={`font-medium ${(currentBillInfo.current_balance || 0) < 0 ? 'text-green-600' : 'text-red-600'}`}>
										{formatKES(currentBillInfo.current_balance || 0)}
										{(currentBillInfo.current_balance || 0) < 0 && ' (Credit)'}
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="amount">Payment Amount (KES)</Label>
					<Input
						id="amount"
						name="amount"
						type="number"
						step="0.01"
						min="0.01"
						value={formData.amount || ''}
						onChange={handleChange}
						required
						placeholder="Enter payment amount"
					/>
					{currentBillInfo && formData.amount && (
						<div className="text-xs text-muted-foreground">
							{formData.amount > currentBillInfo.current_balance 
								? `Overpayment of ${formatKES(formData.amount - currentBillInfo.current_balance)} will be credited to account`
								: `Remaining balance after payment: ${formatKES(currentBillInfo.current_balance - formData.amount)}`
							}
						</div>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="payment_date">Payment Date</Label>
					<Input
						id="payment_date"
						name="payment_date"
						type="date"
						value={formData.payment_date || ''}
						onChange={handleChange}
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="payment_method">Payment Method</Label>
					<select
						id="payment_method"
						name="payment_method"
						value={formData.payment_method || 'cash'}
						onChange={handleChange}
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						required
					>
						<option value="cash">Cash</option>
						<option value="mpesa">M-Pesa</option>
						<option value="bank">Bank Transfer</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="notes">Notes</Label>
					<textarea
						id="notes"
						name="notes"
						value={formData.notes || ''}
						onChange={handleChange}
						className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						placeholder="Transaction ID, reference number, etc."
					/>
				</div>
			</div>

			<DialogFooter>
				<Button type="submit" disabled={isLoading || loadingBillingCycles}>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{isEditing ? 'Updating...' : 'Recording...'}
						</>
					) : (
						<>{isEditing ? 'Update Payment' : 'Record Payment'}</>
					)}
				</Button>
			</DialogFooter>
		</form>
	);
};

const Payments = () => {
	const [rows, setRows] = useState<(Payment & { tenant: Tenant | null })[]>([])
	const [loading, setLoading] = useState(true)
	const [isProcessing, setIsProcessing] = useState(false)
	const [showAddDialog, setShowAddDialog] = useState(false)
	const [editingPayment, setEditingPayment] = useState<(Payment & { tenant: Tenant | null }) | undefined>(undefined)
	const [allTenants, setAllTenants] = useState<Tenant[]>([])
	const [query, setQuery] = useState('')
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')
	const { toast } = useToast()
	
	// Filter payments based on search query and date range
	const filtered = rows.filter(r => {
		const matchesSearch = `${r.tenant?.name || ''} ${r.payment_method || ''} ${r.notes || ''}`
			.toLowerCase()
			.includes(query.toLowerCase());
		
		const paymentDate = new Date(r.payment_date);
		const matchesDateRange = (!startDate || paymentDate >= new Date(startDate)) &&
			(!endDate || paymentDate <= new Date(endDate));
		
		return matchesSearch && matchesDateRange;
	});
	
	// Function to create a new payment record
	const handleAddPayment = async (paymentData: Partial<Payment>) => {
		if (!paymentData.tenant_id || !paymentData.billing_cycle_id || !paymentData.amount || !paymentData.payment_date) {
			toast({
				title: "Validation Error",
				description: "Please fill in all required fields",
				variant: "destructive"
			});
			return;
		}
		
		if (paymentData.amount <= 0) {
			toast({
				title: "Invalid Amount",
				description: "Payment amount must be greater than 0",
				variant: "destructive"
			});
			return;
		}
		
		setIsProcessing(true);
		try {
			// Add the created_by field - in a real app, this would be the current user's ID
			const userData = await supabase.auth.getUser();
			const created_by = userData.data.user?.id || '';
			if (!created_by) {
				toast({
					title: "Authentication Error",
					description: "You must be logged in to record a payment",
					variant: "destructive"
				});
				setIsProcessing(false);
				return;
			}
			
			const newPayment = {
				tenant_id: paymentData.tenant_id,
				billing_cycle_id: paymentData.billing_cycle_id,
				amount: paymentData.amount,
				payment_date: paymentData.payment_date,
				payment_method: paymentData.payment_method || 'cash',
				notes: paymentData.notes || null,
				created_by
			};
			
			const { data, error } = await supabase
				.from('payments')
				.insert(newPayment)
				.select()
				.single();
			
			if (error) {
				console.error('Error creating payment:', error);
				toast({
					title: "Error",
					description: "Failed to record payment. Please try again.",
					variant: "destructive"
				});
				return;
			}
			
			toast({
				title: "Success",
				description: `Payment of ${formatKES(paymentData.amount)} recorded successfully`
			});
			
			// Refresh data to show the new payment
			await fetchData();
			
			// Close the dialog
			setShowAddDialog(false);
		} catch (err) {
			console.error('Error creating payment:', err);
			toast({
				title: "Error",
				description: "An unexpected error occurred",
				variant: "destructive"
			});
		} finally {
			setIsProcessing(false);
		}
	};
	
	// Function to update an existing payment
	const handleUpdatePayment = async (paymentData: Partial<Payment>) => {
		if (!editingPayment?.id) return;
		
		if (!paymentData.amount || paymentData.amount <= 0) {
			toast({
				title: "Invalid Amount",
				description: "Payment amount must be greater than 0",
				variant: "destructive"
			});
			return;
		}
		
		setIsProcessing(true);
		try {
			const { error } = await supabase
				.from('payments')
				.update({
					amount: paymentData.amount,
					payment_date: paymentData.payment_date,
					payment_method: paymentData.payment_method,
					notes: paymentData.notes
				})
				.eq('id', editingPayment.id);
			
			if (error) {
				console.error('Error updating payment:', error);
				toast({
					title: "Error",
					description: "Failed to update payment. Please try again.",
					variant: "destructive"
				});
				return;
			}
			
			toast({
				title: "Success",
				description: "Payment updated successfully"
			});
			
			// Refresh data
			await fetchData();
			
			// Close the dialog and reset the editing state
			setEditingPayment(undefined);
		} catch (err) {
			console.error('Error updating payment:', err);
			toast({
				title: "Error",
				description: "An unexpected error occurred",
				variant: "destructive"
			});
		} finally {
			setIsProcessing(false);
		}
	};
	
	// Function to delete a payment
	const handleDeletePayment = async (id: string) => {
		try {
			const { error } = await supabase
				.from('payments')
				.delete()
				.eq('id', id);
			
			if (error) {
				console.error('Error deleting payment:', error);
				toast({
					title: "Error",
					description: "Failed to delete payment. Please try again.",
					variant: "destructive"
				});
				return;
			}
			
			toast({
				title: "Success",
				description: "Payment deleted successfully"
			});
			
			// Refresh data
			await fetchData();
		} catch (err) {
			console.error('Error deleting payment:', err);
			toast({
				title: "Error",
				description: "An unexpected error occurred",
				variant: "destructive"
			});
		}
	};
	
	// Function to fetch payments data
	const fetchData = async () => {
		setLoading(true)
		try {
			// Fetch payments with tenant information
			const { data: payments } = await supabase
				.from('payments')
				.select('*')
				.order('payment_date', { ascending: false })
				.order('created_at', { ascending: false })

			// Fetch all tenants for the dropdown and data mapping
			const { data: tenants } = await supabase
				.from('tenants')
				.select('id, name, house_unit_number')

			setAllTenants(tenants as Tenant[] || [])
			
			// Map tenant data to payments
			const byId = new Map((tenants || []).map(t => [t.id, t]))
			const withTenant = (payments || []).map(p => ({ ...p, tenant: byId.get(p.tenant_id) || null }))
			
			setRows(withTenant)
		} catch (error) {
			console.error('Error fetching payments:', error)
		} finally {
			setLoading(false)
		}
	}
	
	useEffect(() => {
		fetchData();
	}, [])

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4">
				<h1 className="text-2xl sm:text-3xl font-bold">Payments</h1>
				
				{/* Search Input */}
				<Input
					placeholder="Search payments..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full"
				/>
				
				{/* Date Range Filters */}
				<div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
					<CalendarIcon className="h-4 w-4 mt-3 sm:mt-0" />
					<Input
						type="date"
						placeholder="Start date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="w-full sm:w-auto"
					/>
					<span className="text-muted-foreground hidden sm:inline">to</span>
					<Input
						type="date"
						placeholder="End date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="w-full sm:w-auto"
					/>
				</div>
				
				{/* Action Buttons */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<ExportButton 
						data={filtered}
						filename="payments"
						formatData={formatPaymentDataForExport}
						disabled={loading}
					/>
					<Button onClick={() => setShowAddDialog(true)} className="w-full">
						<PlusCircle className="h-4 w-4 mr-2" />
						<span className="hidden xs:inline">Record Payment</span>
						<span className="xs:hidden">Record</span>
					</Button>
				</div>
			</div>
			
			{/* Add Payment Dialog */}
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent className="mx-4 sm:mx-auto">
					<DialogHeader>
						<DialogTitle>Record New Payment</DialogTitle>
						<DialogDescription>
							Record a new payment from a tenant. You'll need to select the tenant and which bill this payment is for.
						</DialogDescription>
					</DialogHeader>
					<PaymentForm 
						tenants={allTenants} 
						onSubmit={handleAddPayment} 
						isLoading={isProcessing}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Payment Dialog */}
			{editingPayment && (
				<Dialog 
					open={!!editingPayment} 
					onOpenChange={(open) => !open && setEditingPayment(undefined)}
				>
					<DialogContent className="mx-4 sm:mx-auto">
						<DialogHeader>
							<DialogTitle>Edit Payment</DialogTitle>
							<DialogDescription>
								Update payment information for {editingPayment.tenant?.name || 'tenant'}.
							</DialogDescription>
						</DialogHeader>
						<PaymentForm 
							payment={editingPayment}
							tenants={allTenants}
							onSubmit={handleUpdatePayment}
							isLoading={isProcessing}
						/>
					</DialogContent>
				</Dialog>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Payment History</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="py-10 text-center text-muted-foreground">
							<Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
							<p>Loading payment history...</p>
						</div>
					) : filtered.length === 0 ? (
						<div className="py-10 text-center text-muted-foreground">No payment records found</div>
					) : (
						<div className="overflow-x-auto -mx-2 sm:mx-0">
							<table className="w-full text-sm min-w-full">
								<thead>
									<tr className="text-left border-b">
										<th className="py-2 px-2 sm:pr-4">Date</th>
										<th className="py-2 px-2 sm:pr-4">Tenant</th>
										<th className="py-2 px-2 sm:pr-4 hidden sm:table-cell">Amount</th>
										<th className="py-2 px-2 sm:pr-4 hidden md:table-cell">Method</th>
										<th className="py-2 px-2 sm:pr-4 hidden lg:table-cell">Notes</th>
										<th className="py-2 px-2 sm:pr-0 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((row) => (
										<tr key={row.id} className="border-b last:border-0">
											<td className="py-3 px-2 sm:pr-4 text-xs sm:text-sm">
												{new Date(row.payment_date).toLocaleDateString()}
											</td>
											<td className="py-3 px-2 sm:pr-4 font-medium">
												<div className="min-w-0">
													<div className="font-medium truncate">{row.tenant?.name || 'Unknown'}</div>
													<div className="text-xs text-muted-foreground sm:hidden">
														{formatKES(row.amount)} • {row.payment_method || 'N/A'}
													</div>
												</div>
											</td>
											<td className="py-3 px-2 sm:pr-4 hidden sm:table-cell font-medium">
												{formatKES(row.amount)}
											</td>
											<td className="py-3 px-2 sm:pr-4 hidden md:table-cell">
												{row.payment_method || 'N/A'}
											</td>
											<td className="py-3 px-2 sm:pr-4 hidden lg:table-cell">
												<div className="max-w-32 truncate">
													{row.notes || '—'}
												</div>
											</td>
											<td className="py-3 px-2 sm:pr-0 text-right">
												<div className="flex justify-end gap-1 sm:gap-2">
													<Button 
														variant="ghost" 
														size="sm" 
														onClick={() => setEditingPayment(row)}
														className="h-8 w-8 sm:h-auto sm:w-auto p-1 sm:px-3"
													>
														<Pencil className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
														<span className="hidden sm:inline">Edit</span>
													</Button>
													
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button 
																variant="ghost" 
																size="sm" 
																className="text-destructive h-8 w-8 sm:h-auto sm:w-auto p-1 sm:px-3"
															>
																<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
																<span className="hidden sm:inline">Delete</span>
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent className="mx-4 sm:mx-auto">
															<AlertDialogHeader>
																<AlertDialogTitle>Are you sure?</AlertDialogTitle>
																<AlertDialogDescription>
																	This will permanently delete this payment record. The associated billing record's balance will also be affected.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancel</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDeletePayment(row.id)}
																	className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
																>
																	Delete Payment
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

export default Payments
