import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export default async function ModelPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const supabase = await createClient();

  const {data: model} = await supabase.from('models').select('*').eq('slug', slug).single();

  if (!model) {
    notFound();
  }

  return <div>{model.name}</div>;
}
