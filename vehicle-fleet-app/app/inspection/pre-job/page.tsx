import InspectionForm from '../form';
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  return <InspectionForm kind="pre-job" fromField={(await searchParams).from === 'field'} />;
}
