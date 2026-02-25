function parseUploadResponse(data) {
  if (!data) return null

  // uploadFile 返回的 data 一定是 string
  if (typeof data !== 'string') return data

  try {
    // 🔑 关键：修复 UTF-8 被错误解析的问题
    const fixedStr = decodeURIComponent(escape(data))
    return JSON.parse(fixedStr)
  } catch (e) {
    try {
      // 兜底：防止已经是正常 JSON
      return JSON.parse(data)
    } catch (err) {
      console.error('uploadFile response parse failed:', err)
      return null
    }
  }
}

export default parseUploadResponse
