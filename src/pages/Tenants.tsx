import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'
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
import { CheckCircle, Loader2, PlusCircle, Pencil, Trash2, X } from "lucide-react"

type Tenant = Tables<'tenants'>

// Form component for adding/editing tenants
const TenantForm = ({ 
	tenant, 
	onSubmit, 
	isLoading 
}: { 
	tenant?: Tenant, 
	onSubmit: (data: Partial<Tenant>) => void,
	isLoading: boolean
}) => {
	const isEditing = !!tenant;
	const [formData, setFormData] = useState<Partial<Tenant>>(
		tenant || {
		name: '',
		phone: '',
		email: '',
		house_unit_number: '',
		meter_connection_number: '',
		status: 'active'
		}
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid gap-4">
				<div className="space-y-2">
					<Label htmlFor="name">Full Name</Label>
					<Input
						id="name"
						name="name"
						value={formData.name || ''}
						onChange={handleChange}
						placeholder="John Doe"
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="phone">Phone Number</Label>
					<Input
						id="phone"
						name="phone"
						value={formData.phone || ''}
						onChange={handleChange}
						placeholder="+254 700 000000"
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="email">Email Address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						value={formData.email || ''}
						onChange={handleChange}
						placeholder="john.doe@example.com"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="house_unit_number">House/Unit Number</Label>
					<Input
						id="house_unit_number"
						name="house_unit_number"
						value={formData.house_unit_number || ''}
						onChange={handleChange}
						placeholder="A1"
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="meter_connection_number">Meter Connection Number</Label>
					<Input
						id="meter_connection_number"
						name="meter_connection_number"
						value={formData.meter_connection_number || ''}
						onChange={handleChange}
						placeholder="MCN12345"
						required
						disabled={isEditing} // Cannot change meter number once assigned
					/>
				</div>

				{isEditing && (
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<select 
							id="status"
							name="status"
							value={formData.status || 'active'}
							onChange={handleChange}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="active">Active</option>
							<option value="vacated">Vacated</option>
						</select>
					</div>
				)}
			</div>

			<DialogFooter>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{isEditing ? 'Updating...' : 'Creating...'}
						</>
					) : (
						<>{isEditing ? 'Update Tenant' : 'Add Tenant'}</>
					)}
				</Button>
			</DialogFooter>
		</form>
	);
};

const Tenants = () => {
	const [tenants, setTenants] = useState<Tenant[]>([])
	const [search, setSearch] = useState('')
	const [loading, setLoading] = useState(true)
	const [isProcessing, setIsProcessing] = useState(false)
	const [showAddDialog, setShowAddDialog] = useState(false)
	const [editingTenant, setEditingTenant] = useState<Tenant | undefined>(undefined)

	useEffect(() => {
		fetchTenants()
	}, [])
	
	const fetchTenants = async () => {
		setLoading(true)
		try {
			const { data, error } = await supabase
				.from('tenants')
				.select('*')
				.order('name')
			
			if (error) {
				console.error('Error fetching tenants:', error)
				return
			}
			
			setTenants(data || [])
		} catch (err) {
			console.error('Error fetching tenants:', err)
		} finally {
			setLoading(false)
		}
	}

	// Function to handle creating a new tenant
	const handleAddTenant = async (tenantData: Partial<Tenant>) => {
		setIsProcessing(true)
		try {
			const { data, error } = await supabase
				.from('tenants')
				.insert([tenantData])
				.select()
				.single()
			
			if (error) {
				console.error('Error creating tenant:', error)
				return
			}
			
			// Add the new tenant to the existing array
			setTenants(prev => [...prev, data as Tenant])
			
			// Close the dialog
			setShowAddDialog(false)
		} catch (err) {
			console.error('Error creating tenant:', err)
		} finally {
			setIsProcessing(false)
		}
	}
	
	// Function to handle updating an existing tenant
	const handleUpdateTenant = async (tenantData: Partial<Tenant>) => {
		if (!editingTenant?.id) return
		
		setIsProcessing(true)
		try {
			const { data, error } = await supabase
				.from('tenants')
				.update(tenantData)
				.eq('id', editingTenant.id)
				.select()
				.single()
			
			if (error) {
				console.error('Error updating tenant:', error)
				return
			}
			
			// Update the tenant in the existing array
			setTenants(prev => prev.map(t => t.id === data.id ? data as Tenant : t))
			
			// Close the dialog and reset the editing state
			setEditingTenant(undefined)
		} catch (err) {
			console.error('Error updating tenant:', err)
		} finally {
			setIsProcessing(false)
		}
	}
	
	// Function to handle deleting a tenant
	const handleDeleteTenant = async (id: string) => {
		try {
			const { error } = await supabase
				.from('tenants')
				.delete()
				.eq('id', id)
			
			if (error) {
				console.error('Error deleting tenant:', error)
				return
			}
			
			// Remove the tenant from the array
			setTenants(prev => prev.filter(t => t.id !== id))
		} catch (err) {
			console.error('Error deleting tenant:', err)
		}
	}
	
	// Filter the tenants based on the search term
	const filtered = tenants.filter(t =>
		[t.name, t.phone, t.email || '', t.house_unit_number, t.meter_connection_number]
			.join(' ') // simple client filter
			.toLowerCase()
			.includes(search.toLowerCase())
	)

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<h1 className="text-3xl font-bold">Tenants</h1>
				<div className="flex gap-2">
					<Input
						placeholder="Search tenants..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full sm:w-72"
					/>
					<Button onClick={() => setShowAddDialog(true)}>
						<PlusCircle className="h-4 w-4 mr-2" />
						Add Tenant
					</Button>
				</div>
			</div>

			{/* Add Tenant Dialog */}
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add New Tenant</DialogTitle>
						<DialogDescription>
							Add a new tenant to the system. Fill out all required fields.
						</DialogDescription>
					</DialogHeader>
					<TenantForm onSubmit={handleAddTenant} isLoading={isProcessing} />
				</DialogContent>
			</Dialog>

			{/* Edit Tenant Dialog */}
			{editingTenant && (
				<Dialog 
					open={!!editingTenant} 
					onOpenChange={(open) => !open && setEditingTenant(undefined)}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Tenant</DialogTitle>
							<DialogDescription>
								Update tenant information. Some fields cannot be changed.
							</DialogDescription>
						</DialogHeader>
						<TenantForm 
							tenant={editingTenant}
							onSubmit={handleUpdateTenant}
							isLoading={isProcessing}
						/>
					</DialogContent>
				</Dialog>
			)}

			<Card>
				<CardHeader>
					<CardTitle>All Tenants</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="py-10 text-center text-muted-foreground">
							<Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
							<p>Loading tenants...</p>
						</div>
					) : filtered.length === 0 ? (
						<div className="py-10 text-center text-muted-foreground">No tenants found</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left border-b">
										<th className="py-2 pr-4">Name</th>
										<th className="py-2 pr-4">Unit</th>
										<th className="py-2 pr-4">Meter</th>
										<th className="py-2 pr-4">Phone</th>
										<th className="py-2 pr-4">Email</th>
										<th className="py-2 pr-4">Status</th>
										<th className="py-2 pr-0 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((t) => (
										<tr key={t.id} className="border-b last:border-0">
											<td className="py-3 pr-4 font-medium">{t.name}</td>
											<td className="py-3 pr-4">{t.house_unit_number}</td>
											<td className="py-3 pr-4">{t.meter_connection_number}</td>
											<td className="py-3 pr-4">{t.phone}</td>
											<td className="py-3 pr-4">{t.email || '—'}</td>
											<td className="py-3 pr-4">
												<div className="flex items-center">
													{t.status === 'active' ? (
														<>
															<CheckCircle className="h-4 w-4 mr-1 text-emerald-600" />
															<span className="text-emerald-600">Active</span>
														</>
													) : (
														<>
															<X className="h-4 w-4 mr-1 text-amber-600" />
															<span className="text-amber-600">Vacated</span>
														</>
													)}
												</div>
											</td>
											<td className="py-3 pr-0 text-right">
												<div className="flex justify-end gap-2">
													<Button 
														variant="ghost" 
														size="sm" 
														onClick={() => setEditingTenant(t)}
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
																<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
																<AlertDialogDescription>
																	This action will permanently delete the tenant "{t.name}" and all associated records including billing history and payments.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Cancel</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDeleteTenant(t.id)}
																	className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
																>
																	Delete Tenant
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

export default Tenants
