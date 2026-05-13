import { notFound } from "next/navigation";
import { getDeckData } from "@/lib/data";
import { getServiceClient, SUPABASE_ENABLED } from "@/lib/supabase";
import DeckSettings, {
  type AccessSettings,
} from "@/components/deck/DeckSettings";

export const dynamic = 'force-dynamic';

async function loadAccessSettings(searchId: string): Promise<AccessSettings> {
  if (!SUPABASE_ENABLED) {
    return { access_password: null, is_complete: false, completed_at: null };
  }
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('searches')
    .select('access_password, is_complete, completed_at')
    .eq('search_key', searchId)
    .maybeSingle();
  return {
    access_password: data?.access_password ?? null,
    is_complete: Boolean(data?.is_complete),
    completed_at: data?.completed_at ?? null,
  };
}

export default async function SettingsPage({
  params,
}: {
  params: { searchId: string };
}) {
  const data = await getDeckData(params.searchId);
  if (!data) notFound();
  const initialAccess = await loadAccessSettings(params.searchId);

  return (
    <DeckSettings
      data={data}
      searchId={params.searchId}
      initialAccess={initialAccess}
    />
  );
}
