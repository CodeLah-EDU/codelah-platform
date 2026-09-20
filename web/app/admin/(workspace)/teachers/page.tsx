import { AdultDirectory } from '@/components/admin/adult-directory';
export default async function Teachers({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return <AdultDirectory accountRole="teacher" message={message} />;
}
