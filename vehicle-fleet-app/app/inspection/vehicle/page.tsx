import InspectionForm from '../form';
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  return <InspectionForm kind="vehicle" fromField={(await searchParams).from === 'field'} />;
}
