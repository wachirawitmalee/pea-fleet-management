import VehicleCheckout from '@/app/components/vehicle-checkout';

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleCheckout initialVehicleId={id} />;
}
