// api/proxy.js
// このファイルはVercelのサーバー上で動きます（ユーザーからは見えません）

export default async function handler(req, res) {
  // Vercelの環境変数からAPIキーを取り出す
  const APP_KEY = process.env.CALIL_APPKEY;

  // フロントエンドから送られてきたパラメータを受け取る
  // endpointには 'library' や 'check' や 'polling' が入る
  const { endpoint, callback, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  // カーリルに投げるためのクエリを作成
  const params = new URLSearchParams(queryParams);
  params.append('appkey', APP_KEY);
  params.append('format', 'json'); // JSONPではなくJSONで受け取る

  // カーリルAPIに問い合わせ
  const targetUrl = `https://api.calil.jp/${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();

    // 結果をフロントエンドに返す
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'API Error' });
  }
}
