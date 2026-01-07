type ShareParams = {
  status?: string;
  location?: string;
  spot?: string;
};

export async function shareStoryImage(params: ShareParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.location) qs.set('location', params.location);
  if (params.spot) qs.set('spot', params.spot);

  const res = await fetch(`/api/share/story?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aurora-story-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

