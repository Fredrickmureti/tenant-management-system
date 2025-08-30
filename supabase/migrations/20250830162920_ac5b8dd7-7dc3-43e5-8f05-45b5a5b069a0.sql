-- Add foreign key constraints for data integrity
ALTER TABLE billing_cycles 
ADD CONSTRAINT fk_billing_cycles_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_billing_cycle 
FOREIGN KEY (billing_cycle_id) REFERENCES billing_cycles(id) ON DELETE CASCADE;

ALTER TABLE communication_logs 
ADD CONSTRAINT fk_communication_logs_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE communication_logs 
ADD CONSTRAINT fk_communication_logs_sent_by 
FOREIGN KEY (sent_by) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Add unique constraint for meter connection number to prevent duplicates
ALTER TABLE tenants 
ADD CONSTRAINT unique_meter_connection_number 
UNIQUE (meter_connection_number);

-- Add unique constraint for house unit number to prevent duplicates in same property
ALTER TABLE tenants 
ADD CONSTRAINT unique_house_unit_number 
UNIQUE (house_unit_number);