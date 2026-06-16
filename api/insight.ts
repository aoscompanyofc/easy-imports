// Serverless function (Vercel) que gera um insight de negócio em PT-BR.
// As credenciais de IA vêm do corpo da requisição (configuradas pelo usuário
// em Configurações → IA) ou, como fallback, da env ANTHROPIC_API_KEY.
// Suporta Claude (Anthropic), OpenAI (ChatGPT) e endpoints compatíveis (custom).
// Sem credencial → { configured: false } e o front usa heurística local.

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
      max_tokens: 300,
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
      max_tokens: 300,
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const summary: string = body.summary || '';
    const mode: string = body.mode || 'insight';

    // Credenciais do usuário (preferidas) ou fallback para env Anthropic.
    const provider: string = body.provider || (process.env.ANTHROPIC_API_KEY ? 'claude' : '');
    const apiKey: string = body.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const baseUrl: string = body.baseUrl || '';
    const model: string =
      body.model ||
      process.env.ANTHROPIC_MODEL ||
      (provider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-4-5-20251001');

    if (!apiKey || !provider) {
      res.status(200).json({ configured: false, insight: null });
      return;
    }

    const systemPrompt = mode === 'create'
      ? 'Você ajuda a configurar um dashboard. Responda SOMENTE com o id de um widget da lista fornecida que melhor atende ao pedido do usuário, sem explicação.'
      : 'Você é um analista de negócios de uma loja de celulares/importados no Brasil. ' +
        'Com base nos números fornecidos, escreva UM insight curto, prático e específico em português do Brasil ' +
        '(máximo 2 frases). Seja direto, aponte oportunidades ou alertas concretos. Não use markdown nem emojis.';

    let insight = '';
    if (provider === 'claude') {
      insight = await callAnthropic(apiKey, model, systemPrompt, summary);
    } else if (provider === 'openai') {
      insight = await callOpenAICompatible('https://api.openai.com/v1', apiKey, model, systemPrompt, summary);
    } else if (provider === 'custom') {
      if (!baseUrl) {
        res.status(200).json({ configured: false, insight: null, error: 'baseUrl ausente' });
        return;
      }
      insight = await callOpenAICompatible(baseUrl, apiKey, model, systemPrompt, summary);
    }

    res.status(200).json({ configured: true, insight });
  } catch (e: any) {
    res.status(200).json({ configured: true, insight: null, error: String(e?.message || e) });
  }
}
