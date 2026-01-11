export default async function handler(req, res) {
  const APP_KEY = process.env.CALIL_APPKEY;

  // ★修正ポイント: queryから 'callback' と '_' (jQueryがつけるタイムスタンプ) を除外して取り出す
  const { endpoint, callback, _, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const params = new URLSearchParams(queryParams);
  if (APP_KEY) {
    params.append('appkey', APP_KEY);
  }
  // ★念のため callback=no を明示的に追加してJSONPを防ぐ
  params.append('format', 'json');
  params.append('callback', 'no'); 

  const targetUrl = `https://api.calil.jp/${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Calil API responded with status: ${response.status}`);
    }

    // テキストとして一度受け取る
    const textData = await response.text();

    // もし万が一、まだJSONP形式（callback(...)）で返ってきていたら、カッコの中身だけ無理やり取り出す
    // (通常は上の callback=no で防げますが、念には念を入れた安全策です)
    let jsonString = textData;
    if (textData.trim().startsWith('callback(') || textData.trim().startsWith('no(')) {
       // "callback( ... );" の形から ... の部分だけ抽出
       const match = textData.match(/^[a-zA-Z0-9_]+\((.*)\);?$/s);
       if (match && match[1]) {
           jsonString = match[1];
       }
    }

    // JSONにパースする
    const data = JSON.parse(jsonString);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // キャッシュ有効化
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ 
      error: 'API Execution Failed', 
      details: error.message,
      debug_info: {
        targetEndpoint: endpoint,
        isKeyLoaded: !!APP_KEY // キーがあるかだけ確認
      }
    });
  }
}
