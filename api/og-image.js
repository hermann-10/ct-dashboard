export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HM-Events/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch URL: ${response.status}` });
    }

    const html = await response.text();

    // Try multiple og:image patterns
    const patterns = [
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
      /<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+name=["']og:image["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imageUrl = match[1];
        // Handle relative URLs
        if (imageUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imageUrl = `${urlObj.origin}${imageUrl}`;
        }
        return res.json({ image_url: imageUrl });
      }
    }

    return res.status(404).json({ error: 'No og:image found on this page' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
