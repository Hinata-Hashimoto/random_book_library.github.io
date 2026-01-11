// api/proxy.js (デバッグ版)
export default async function handler(req, res) {
  const APP_KEY = process.env.CALIL_APPKEY;
  const { endpoint, ...queryParams } = req.query;

  // デバッグ用: キーが読み込めているかチェック（キーの中身は表示しません）
  const isKeyLoaded = !!APP_KEY;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const params = new URLSearchParams(queryParams);
  if (APP_KEY) {
    params.append('appkey', APP_KEY);
  }
  params.append('format', 'json');

  const targetUrl = `https://api.calil.jp/${endpoint}?${params.toString()}`;

  try {
    // Node.jsのバージョンによってはfetchが使えないことがあるためチェック
    if (typeof fetch === 'undefined') {
      throw new Error('fetch is not defined (Node.js version might be too old)');
    }

    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Calil API responded with status: ${response.status}`);
    }

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);

  } catch (error) {
    // ★ここで本当のエラー原因を表示させます
    res.status(500).json({ 
      error: 'API Execution Failed', 
      details: error.message,
      debug_info: {
        isKeyLoaded: isKeyLoaded, // APIキーが設定されているか (true/false)
        targetEndpoint: endpoint,
        nodeVersion: process.version
      }
    });
  }
}
