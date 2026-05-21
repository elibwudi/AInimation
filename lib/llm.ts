export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const qwenKey = process.env.DASHSCOPE_API_KEY;

  // 1. Try DeepSeek (Primary Priority) - Model: deepseek-v4-pro (128k)
  if (deepseekKey) {
    try {
      const baseUrl = 'https://api.deepseek.com/v1/chat/completions';
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-pro', 
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: temperature,
          max_tokens: 32000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errorText = await response.text();
        console.error(`DeepSeek API Error: ${errorText}`);
      }
    } catch (e) {
      console.warn('DeepSeek call failed, falling back to Qwen:', e);
    }
  }

  // 2. Try Alibaba Qwen (Secondary Priority) - High Context (256k)
  if (qwenKey) {
    try {
      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${qwenKey}`
        },
        body: JSON.stringify({
          model: 'qwen3-max', 
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: temperature,
          max_tokens: 32000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errorText = await response.text();
        console.error(`Qwen API Error: ${errorText}`);
      }
    } catch (e) {
      console.warn('Qwen call failed, falling back to Gemini:', e);
    }
  }

  // 3. Try Gemini (Tertiary Priority) - Massive Context (1M+)
  if (geminiKey) {
    try {
      const model = 'gemini-3-flash-preview'; 
      const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          system_instruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 32000
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errorText = await response.text();
        console.error(`Gemini API Error: ${errorText}`);
      }
    } catch (e) {
      console.warn('Gemini call failed, falling back to vLLM:', e);
    }
  }

  // 4. Try vLLM (Fallback) - Local Context (32k)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    const response = await fetch('http://10.255.1.118:8000/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma-4-moe',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: 32000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    }
  } catch (e) {
    console.error('vLLM (10.255.1.118) failed or timed out:', e);
  }

  throw new Error('No valid LLM API keys provided or all engines failed.');
}

export type AICallFn = typeof callLLM;
