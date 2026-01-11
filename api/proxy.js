// api/proxy.js

// 簡易的な連打防止用メモリ（サーバーが起きている間だけ有効）
const rateLimitMap = new Map();

export default async function handler(req, res) {
  // 1. アクセス元のIPアドレスを取得
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  
  // 2. 現在時刻を取得
  const now = Date.now();
  const limitWindow = 1000; // 制限時間（ミリ秒）: ここでは1秒に設定
  
  // 3. 直近のアクセス記録をチェック
  const lastRequestTime = rateLimitMap.get(ip);
  if (lastRequestTime && (now - lastRequestTime < limitWindow)) {
    // 1秒未満の連打ならエラーを返して終了
    return res.status(429).json({ error: 'Too Many Requests. Please wait a moment.' });
  }
  
  // アクセス時刻を更新
  rateLimitMap.set(ip, now);
  
  // 定期的にメモリをお掃除（メモリあふれ防止）
  if (rateLimitMap.size > 1000) rateLimitMap.clear();

  // --- ここから下は今までと同じ処理 ---
  
  const APP_KEY = process.env.CALIL_APPKEY;
  const { endpoint, callback, _, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const params = new URLSearchParams(queryParams);
  if (APP_KEY) {
    params.append('appkey', APP_KEY);
  }
  params.append('format', 'json');
  params.append('callback', 'no'); 

  const targetUrl = `https://api.calil.jp/${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Calil API responded with status: ${response.status}`);
    }

    const textData = await response.text();
    let jsonString = textData;
    if (textData.trim().startsWith('callback(') || textData.trim().startsWith('no(')) {
       const match = textData.match(/^[a-zA-Z0-9_]+\((.*)\);?$/s);
       if (match && match[1]) {
           jsonString = match[1];
       }
    }

    const data = JSON.parse(jsonString);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ 
      error: 'API Execution Failed', 
      details: error.message,
      debug_info: {
        targetEndpoint: endpoint,
        isKeyLoaded: !!APP_KEY 
      }
    });
  }
}
