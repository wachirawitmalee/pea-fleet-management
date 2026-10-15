-- Only needed for PostgreSQL deployments. Google Sheets stores the status as text.
ALTER TYPE "ReserveStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
