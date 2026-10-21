# Delivery stock setup

Apply migrations/20261020193539_delivery_stock_batches.sql to the CRM project
jhxtbudejgalkbncklep after the existing setup scripts. It adds a SECURITY INVOKER
RPC using existing app_state RLS and active Admin/Office Staff authorization.

The CRM reserves the combined BOM when creating a batch. Loading requires every
SKU to be checked, then deducts stock and releases the reservation. Delivery
confirmation does not deduct again. Cancelling a planned batch only releases its
reservation. The first version supports one full BOM shipment per customer;
partial shipments, returns and changing an already reserved batch are excluded.
Existing sample challan completion statuses do not cause stock deductions.

Inventory and batch arrays commit in one database transaction. It locks inventory
then batches and compares expected snapshots, rejecting stale edits from another
desk. Generic autosave excludes inventory to prevent stale autosave overwrites.
Cloud writes fail if the RPC has not been installed; there is no local fallback for
cloud stock changes. Browser-only demo mode uses the same tested state transitions.

Verification: build passed and delivery.test.mjs covers reserve/load/deliver,
repeated loading, cancellation, shortages, negative quantities, duplicate customer
assignment, aggregated BOM and no partial mutation on failure. Installation tests
also pass. The cloud RPC has NOT been applied or tested against a live database:
neither the connected Supabase account nor the local CLI account lists this CRM
project. No real stock or customer dates were changed during implementation.
