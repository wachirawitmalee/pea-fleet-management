-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'FLEET_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ReserveStatus" AS ENUM ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Employee" (
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "สถานที่ปฏิบัติงาน" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("employeeId")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "vehicleId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "vehicleStatus" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "สถานที่ปฏิบัติงาน" TEXT NOT NULL,
    "remark" TEXT,
    "qrCodeData" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("vehicleId")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "reservationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endDate" DATE NOT NULL,
    "endTime" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "reservationStatus" "ReserveStatus" NOT NULL DEFAULT 'BOOKED',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("reservationId")
);

-- CreateTable
CREATE TABLE "CheckInOutLog" (
    "logId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "mileageOut" INTEGER,
    "photoOutUrl" TEXT,
    "checkOutTime" TIMESTAMP(3),
    "mileageIn" INTEGER,
    "distance" INTEGER,
    "photoInUrl" TEXT,

    CONSTRAINT "CheckInOutLog_pkey" PRIMARY KEY ("logId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_qrCodeData_key" ON "Vehicle"("qrCodeData");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInOutLog_reservationId_key" ON "CheckInOutLog"("reservationId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("vehicleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInOutLog" ADD CONSTRAINT "CheckInOutLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("reservationId") ON DELETE RESTRICT ON UPDATE CASCADE;
