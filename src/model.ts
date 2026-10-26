export type ModelSettings = {
  baseUrl: string
  model: string
  apiKey: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function complete(
  settings: ModelSettings,
  messages: ChatMessage[],
  systemPrompt?: string,
  temperature = 0.4,
): Promise<string> {
  const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '')
  if (!baseUrl || !settings.model.trim()) {
    throw new Error('Add a model endpoint and model name in connection settings.')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages,
      ],
      temperature,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Model server returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`)
  }

  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((part: { text?: string }) => part.text ?? '').join('')
  }
  throw new Error('The model response did not contain message text.')
}

export async function checkConnection(settings: ModelSettings): Promise<void> {
  const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '')
  if (!baseUrl) throw new Error('Enter a model server URL first.')
  const response = await fetch(`${baseUrl}/models`, {
    headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {},
  })
  if (!response.ok) throw new Error(`Model server returned ${response.status}.`)
}