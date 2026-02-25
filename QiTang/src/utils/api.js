// 本地测试使用 192 地址
import settings from '@/config/settings'

const BASE_URL = settings.BASE_URL
// 远程服务器备份列表在 src/config/settings.js 的 REWRITE_HOSTS 字段中维护

const buildHeaders = (extra = {}) => {
    const token = uni.getStorageSync('token')
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
    return {
        'Content-Type': 'application/json',
        ...authHeader,
        ...extra
    }
}

const request = ({ url, method = 'GET', data = {}, header = {} }) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: `${BASE_URL}${url}`,
            method,
            data,
            header: buildHeaders(header),
            success: (res) => {
                // 处理 401 未授权错误
                if (res.statusCode === 401) {
                    // 获取当前页面路径
                    const pages = getCurrentPages()
                    const currentPage = pages[pages.length - 1]
                    const currentRoute = currentPage ? currentPage.route : ''

                    // 如果不在首页和登录页，则跳转到登录页
                    if (currentRoute !== 'pages/index/index' && currentRoute !== 'pages/login/login') {
                        // 清除本地存储的认证信息
                        uni.removeStorageSync('token')
                        uni.removeStorageSync('role')
                        uni.removeStorageSync('orgAdmin')

                        // 提示用户
                        uni.showToast({
                            title: '登录已过期，请重新登录',
                            icon: 'none',
                            duration: 2000
                        })

                        // 使用 redirectTo 替换当前页面，避免栈增长
                        uni.redirectTo({
                            url: '/pages/login/login'
                        })
                    }

                    // 返回401结果，不将其作为网络错误抛出，避免触发全局网络错误提示
                    // 这样调用方仍能根据返回值处理登录重定向或提示逻辑
                    resolve({ success: false, code: 401, message: '未授权' })
                    return
                }

                resolve(res.data)
            },
            fail: (err) => reject(err)
        })
    })
}

export default {
    request,
    BASE_URL
}
