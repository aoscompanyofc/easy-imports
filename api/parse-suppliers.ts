// Serverless function (Vercel) para analisar mensagens de fornecedores.
// Chama Claude ou OpenAI para extrair produtos estruturados (modelo, capacidade, preço, etc.)
// Filtra apenas: iPhone, iPad, Mac, Apple Watch, Garmin.

async function callAnthropic(apiKey: string, model: string, system: string, user: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: any = await res.json();
  return (data?.content?.[0]?.text || '').trim();
}

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string) {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: any = await res.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
}

const SYSTEM_PROMPT = `Você é um especialista em análise de preços de eletrônicos no Brasil.

Analise as mensagens dos fornecedores e extraia SOMENTE produtos das seguintes categorias:
- iPhone (qualquer modelo)
- iPad (qualquer modelo)
- Mac (MacBook Air, MacBook Pro, Mac Mini, Mac Neo — qualquer variante)
- Apple Watch (qualquer série/modelo)
- Garmin (qualquer produto)

IGNORE completamente: AirPods, AirTag, Apple Pencil, cabos, fontes, capas, películas, drones, câmeras, jogos, robôs aspiradores, microfones, Vision Pro, PlayStation, Xbox, e qualquer outro produto fora das 5 categorias acima.

Para cada produto encontrado, crie um objeto com:
- supplier: nome exato do fornecedor (como fornecido no cabeçalho)
- category: "iPhone" | "iPad" | "Mac" | "Apple Watch" | "Garmin"
- model: nome do modelo normalizado e completo em português
  Exemplos: "iPhone 17 Pro Max", "iPhone 17 Air", "iPad Air M3 11\"", "MacBook Air M5 13\"", "Mac Neo 13\"", "Apple Watch Ultra 3 49mm", "Apple Watch Series 11 46mm", "Apple Watch SE 3ª 40mm"
- capacity: armazenamento ou tamanho (ex: "128GB", "256GB", "1TB", "42mm", "46mm") — "" se não se aplica
- color: cor em português, normalizada e capitalizada — "" se não especificada
  Exemplos: "Laranja", "Azul", "Preto", "Branco", "Silver", "Space Black", "Natural", "Starlight", "Gold"
- price: número inteiro sem pontuação (ex: R$7.100,00 → 7100, R$ 5.400 → 5400)
- condition: "novo" (lacrado, de fábrica, NF) | "seminovo" (grade A, CPO, usado, recondicionado)

Regras importantes:
1. Se um modelo aparece com múltiplas cores ao mesmo preço, crie UMA entrada por cor
2. Se aparecer preços diferentes para mesma cor, crie entradas separadas
3. Normalize nomes: "IPHONE 17 PRO MAX" → "iPhone 17 Pro Max", "IPAD AIR 11 M3" → "iPad Air M3 11\"", "MAC NEO" → "Mac Neo 13\""
4. Para MacBook, inclua o tamanho da tela no modelo quando disponível
5. Para Apple Watch, inclua série e tamanho: "Apple Watch Series 11 42mm"
6. Preços em formato brasileiro: R$7.100,00 = 7100, R$ 5.400 = 5400, (R$5.189,99) = 5189

Retorne SOMENTE um JSON válido, sem markdown, sem explicações:
{"products": [{"supplier":"...","category":"...","model":"...","capacity":"...","color":"...","price":0,"condition":"novo"}]}`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const suppliers: Array<{ name: string; message: string }> = body.suppliers || [];

    const provider: string = body.provider || (process.env.ANTHROPIC_API_KEY ? 'claude' : '');
    const apiKey: string = body.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const baseUrl: string = body.baseUrl || '';
    const model: string =
      body.model ||
      process.env.ANTHROPIC_MODEL ||
      (provider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-4-5-20251001');

    if (!apiKey || !provider) {
      res.status(200).json({ configured: false, products: [] });
      return;
    }

    if (suppliers.length === 0) {
      res.status(200).json({ configured: true, products: [] });
      return;
    }

    // Build combined message with clearly labeled supplier sections
    const userMsg = suppliers
      .map(s => `=== FORNECEDOR: ${s.name} ===\n${s.message}`)
      .join('\n\n');

    let rawText = '';
    if (provider === 'claude') {
      rawText = await callAnthropic(apiKey, model, SYSTEM_PROMPT, userMsg);
    } else if (provider === 'openai') {
      rawText = await callOpenAICompatible('https://api.openai.com/v1', apiKey, model, SYSTEM_PROMPT, userMsg);
    } else if (provider === 'custom') {
      if (!baseUrl) {
        res.status(200).json({ configured: false, products: [], error: 'baseUrl ausente para provedor custom' });
        return;
      }
      rawText = await callOpenAICompatible(baseUrl, apiKey, model, SYSTEM_PROMPT, userMsg);
    }

    // Extract JSON from the response (handles cases where AI adds extra text)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(200).json({ configured: true, products: [], error: 'IA não retornou JSON válido. Tente novamente.' });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const products = (parsed.products || []).filter(
      (p: any) => p.price > 0 && p.model && p.category,
    );

    res.status(200).json({ configured: true, products });
  } catch (e: any) {
    res.status(200).json({ configured: true, products: [], error: String(e?.message || e) });
  }
}
