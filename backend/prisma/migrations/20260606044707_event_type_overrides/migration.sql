-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "blockedTimes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "openedTimes" TEXT[] DEFAULT ARRAY[]::TEXT[];
