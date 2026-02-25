// 全局服务配置：切换 BASE_URL 请只修改这里
export default {
    // 本地测试地址
    BASE_URL: 'http://192.168.10.3:8080',
    // 如果后端历史数据中仍有指向旧主机的绝对 URL，可在这里列出，avatar 解析时会重写为 BASE_URL
    REWRITE_HOSTS: ['124.220.80.138:8080', '124.220.80.138']
}
