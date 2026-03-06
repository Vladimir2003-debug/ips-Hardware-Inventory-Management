export function formatApiError(error, fallback = 'Error') {
  const data = error?.response?.data

  if (!data) return fallback

  if (typeof data === 'string') return data

  if (typeof data.detail === 'string') return data.detail

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors[0]
  }

  if (typeof data === 'object') {
    const parts = []
    for (const [field, messages] of Object.entries(data)) {
      if (!Array.isArray(messages) || messages.length === 0) continue
      const label = field === 'non_field_errors'
        ? ''
        : field.charAt(0).toUpperCase() + field.slice(1)
      const text = messages.join(' ')
      parts.push(label ? `${label}: ${text}` : text)
    }
    if (parts.length > 0) return parts.join(' | ')
  }

  return fallback
}

