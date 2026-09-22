import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export default async function PartPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const supabase = await createClient();

  const {data: part} = await supabase.from('parts').select('*').eq('slug', slug).single();

  if (!part) {
    notFound();
  }

  return <div>{part.name}</div>;
}
