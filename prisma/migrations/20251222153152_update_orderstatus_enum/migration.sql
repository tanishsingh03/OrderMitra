/*
  Warnings:

  - The values [PENDING,PREPARING,READY,OUT_FOR_DELIVERY] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- First, migrate existing data to use TEXT temporarily and update values
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE TEXT;

-- Update old enum values to new ones
UPDATE "Order" SET "status" = 'PLACED' WHERE "status" = 'PENDING';
UPDATE "Order" SET "status" = 'ACCEPTED' WHERE "status" = 'PREPARING';
UPDATE "Order" SET "status" = 'READY_FOR_PICKUP' WHERE "status" = 'READY';
UPDATE "Order" SET "status" = 'DELIVERED' WHERE "status" = 'OUT_FOR_DELIVERY';

-- Now create the new enum
CREATE TYPE "OrderStatus_new" AS ENUM ('PLACED', 'ACCEPTED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- Convert the column to the new enum type
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");

-- Drop the old enum and rename the new one
DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

-- Set the default
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PLACED';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PLACED';

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "deliveryPartnerId" INTEGER,
ADD COLUMN     "menuItemId" INTEGER,
ADD COLUMN     "ratingType" TEXT;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "DeliveryPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
