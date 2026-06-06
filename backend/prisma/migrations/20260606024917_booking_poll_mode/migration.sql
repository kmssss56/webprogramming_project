-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "proposedTimes" JSONB;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "confirmMode" TEXT NOT NULL DEFAULT 'instant';
