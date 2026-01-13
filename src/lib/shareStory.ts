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

  console.log('[shareStory] Fetching image with params:', params);

  const res = await fetch(`/api/share/story?${qs.toString()}`, { cache: 'no-store' });

  console.log('[shareStory] Response status:', res.status, 'Content-Type:', res.headers.get('content-type'));

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[shareStory] HTTP error:', res.status, errorText);
    throw new Error(`Failed to generate image: HTTP ${res.status}`);
  }

  const blob = await res.blob();
  console.log('[shareStory] Blob received - size:', blob.size, 'type:', blob.type);

  if (blob.size === 0) {
    console.error('[shareStory] Empty blob received from server');
    throw new Error('Empty image file received. Please try again.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aurora-story-${Date.now()}.png`;
  document.body.appendChild(link); // Ensure link is in DOM for some browsers
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('[shareStory] Download triggered successfully');
}

