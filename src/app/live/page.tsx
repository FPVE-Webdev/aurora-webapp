import { LivePageClient } from './client';

// Dynamic page - disable static generation since /live fetches real-time data
export const revalidate = 0;

export default function LivePage() {
  return <LivePageClient />;
}
