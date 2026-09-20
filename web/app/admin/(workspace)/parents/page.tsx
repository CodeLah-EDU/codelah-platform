import { AdultDirectory } from '@/components/admin/adult-directory';
export default async function Parents({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return <AdultDirectory accountRole="parent" message={message} />;
}
