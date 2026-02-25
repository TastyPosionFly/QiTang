import settings from '@/config/settings'

export const resolveAvatar = (url) => {
    if (!url) return ''

    // 绝对 URL：如果指向旧服务器则重写为当前 BASE_URL，否则直接返回
    if (/^https?:\/\//i.test(url)) {
        try {
            const u = new URL(url)
            const host = u.host // 包含端口
            const hostname = u.hostname
            const rewriteHosts = settings.REWRITE_HOSTS || []
            if (rewriteHosts.includes(host) || rewriteHosts.includes(hostname)) {
                const base = settings.BASE_URL.replace(/\/$/, '')
                const rewritten = `${base}${u.pathname}${u.search || ''}${u.hash || ''}`
                // 调试日志：记录重写操作（发布前可移除）
                try { console.debug && console.debug('[resolveAvatar] rewrite', url, '->', rewritten) } catch (e) {}
                return rewritten
            }
        } catch (e) {
            return url
        }
        return url
    }

    // 相对路径：统一拼接到 BASE_URL
    const path = url.startsWith('/') ? url : `/${url}`
    return `${settings.BASE_URL.replace(/\/$/, '')}${path}`
}
