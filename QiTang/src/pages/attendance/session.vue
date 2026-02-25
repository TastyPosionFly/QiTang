<template>
    <view class="page">
        <!-- 头部统计卡片 -->
        <view class="attendance-header-card">
            <view class="header-main">
                <view class="title-group">
                    <text class="page-title">出席名单预览</text>
                    <text class="page-subtitle">场次 ID: {{ sessionId }}</text>
                </view>
                <view class="stat-badge">
                    <text class="stat-label">已到场</text>
                    <text class="stat-count">{{ totalElements }}</text>
                </view>
            </view>

            <view class="header-actions">
                <button class="action-btn primary" @tap.stop="exportExcel">
                    <text class="btn-icon">📊</text>
                    <text>导出 Excel</text>
                </button>
                <button class="action-btn ghost" @tap.stop="onRefresh">
                    <text class="btn-icon">🔄</text>
                    <text>刷新</text>
                </button>
            </view>
        </view>

        <view v-if="loading && list.length === 0" class="loading-state">
            <text class="state-text">正在获取数据...</text>
        </view>

        <view v-else-if="error && list.length === 0" class="error-state">
            <text class="error-icon">⚠️</text>
            <text class="error-text">{{ error }}</text>
            <button class="retry-btn" @tap="onRefresh">重试</button>
        </view>

        <scroll-view class="attendance-list" v-else scroll-y @scrolltolower="loadMore" lower-threshold="100">
            <view v-for="(r, idx) in list" :key="r.ticketId || idx" class="attendance-card">
                <view class="card-left">
                    <view class="user-info">
                        <text class="user-name">{{ r.nickname || r.name || '未知用户' }}</text>
                        <view class="identity-badge" :class="'identity-' + (r.userIdentity || 0)">
                            {{ r.userIdentityDesc || getIdentityText(r.userIdentity) }}
                        </view>
                    </view>
                    <view class="detail-info">
                        <view class="info-row" v-if="r.studentNo">
                            <text class="info-label">学号:</text>
                            <text class="info-value">{{ r.studentNo }}</text>
                        </view>
                        <view class="info-row">
                            <text class="info-label">票号:</text>
                            <text class="info-value">{{ r.ticketId || '-' }}</text>
                        </view>
                    </view>
                </view>
                <view class="card-right">
                    <text class="checkin-label">到场时间</text>
                    <text class="checkin-time">{{ formatTime(r.checkInTime) }}</text>
                </view>
            </view>

            <view v-if="!list || list.length === 0" class="empty-state">
                <text class="empty-icon">🍃</text>
                <text class="empty-text">暂无到场人员记录</text>
            </view>

            <view class="list-footer" v-if="list.length > 0">
                <view v-if="loadingMore" class="footer-loading">
                    <text class="loading-dot">...</text>
                    <text>加载更多中</text>
                </view>
                <view v-else-if="page + 1 < totalPages" class="load-more-btn" @tap="loadMore">
                    点击加载更多
                </view>
                <view v-else class="footer-end">
                    <text>已显示全部 (共 {{ totalElements }} 条记录)</text>
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import api from '@/utils/api'
export default {
    data() {
        return {
            sessionId: null,
            list: [],
            loading: false,
            error: '',
            page: 0,
            size: 20,
            totalPages: 0,
            totalElements: 0,
            loadingMore: false
        }
    },
    onLoad(options) {
        if (options && options.sessionId) this.sessionId = options.sessionId
        this.fetchList(0)
    },
    methods: {
        getIdentityText(type) {
            const map = { 1: '学生', 2: '教师', 3: '外方' }
            return map[type] || '其他'
        },
        formatTime(t) {
            if (!t) return '-'
            try {
                const d = new Date(t)
                const h = String(d.getHours()).padStart(2, '0')
                const m = String(d.getMinutes()).padStart(2, '0')
                const s = String(d.getSeconds()).padStart(2, '0')
                return `${h}:${m}:${s}`
            } catch (e) { return t }
        },
        async fetchList(requestPage = 0) {
            if (requestPage && typeof requestPage === 'object') requestPage = 0
            if (!this.sessionId) { this.error = '无效的场次 ID'; return }

            if (requestPage === 0) {
                this.page = 0
                this.totalPages = 0
                this.totalElements = 0
                // 为了保留旧数据在刷新时的显示，这里不立即清空 list
            }

            if (this.loading || this.loadingMore) return
            const isLoadMore = requestPage > 0
            if (isLoadMore) this.loadingMore = true
            else this.loading = true
            this.error = ''

            try {
                const res = await api.request({
                    url: `/api/ticket/attendance/${this.sessionId}`,
                    method: 'GET',
                    data: { page: requestPage, size: this.size }
                })
                if (!res || !res.success) {
                    this.error = res?.message || '获取出席名单失败'
                    if (requestPage === 0) this.list = []
                    return
                }

                const payload = res.data || {}
                const content = payload.content || []
                if (requestPage === 0) this.list = content
                else this.list = [...this.list, ...content]

                this.totalPages = payload.totalPages || 0
                this.totalElements = payload.totalElements || 0
                this.page = requestPage
            } catch (e) {
                this.error = '网络连接出错，请重试'
            } finally {
                this.loading = false
                this.loadingMore = false
            }
        },
        onRefresh() {
            if (this.loading || this.loadingMore) {
                uni.showToast({ title: '正在加载中', icon: 'none' })
                return
            }
            this.$nextTick(() => this.fetchList(0))
        },
        loadMore() {
            if (this.page + 1 >= this.totalPages) return
            this.fetchList(this.page + 1)
        },
        exportExcel() {
            if (!this.sessionId) { uni.showToast({ title: '无效场次', icon: 'none' }); return }
            uni.showLoading({ title: '正在准备导出' })
            const rel = `/api/ticket/attendance/${encodeURIComponent(this.sessionId)}/export`
            const url = (api && api.BASE_URL ? api.BASE_URL.replace(/\/$/, '') : '') + rel
            const token = uni.getStorageSync && uni.getStorageSync('token')
            const headers = token ? { Authorization: `Bearer ${token}` } : {}

            uni.downloadFile({
                url,
                header: headers,
                success: (d) => {
                    uni.hideLoading()
                    if (d.statusCode === 200 && d.tempFilePath) {
                        uni.openDocument({
                            filePath: d.tempFilePath,
                            fileType: 'xlsx',
                            success: () => { uni.showToast({ title: '文件已打开', icon: 'success' }) },
                            fail: (err) => {
                                console.error('openDocument fail', err)
                                uni.showToast({ title: '打开失败，请在文件管理查看', icon: 'none' })
                            }
                        })
                    } else if (d.statusCode === 401) {
                        uni.showToast({ title: '登录已过期', icon: 'none' })
                    } else {
                        uni.showToast({ title: '导出失败(HTTP ' + d.statusCode + ')', icon: 'none' })
                    }
                },
                fail: (err) => {
                    uni.hideLoading()
                    uni.showToast({ title: '网络下载失败', icon: 'none' })
                }
            })
        }
    }
}
</script>

<style scoped>
.page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: #f8fafc;
    padding: 30rpx;
    box-sizing: border-box;
}

/* 头部统计卡片 */
.attendance-header-card {
    background: #ffffff;
    border-radius: 32rpx;
    padding: 40rpx;
    box-shadow: 0 10rpx 30rpx rgba(124, 58, 237, 0.08);
    margin-bottom: 30rpx;
    border: 1rpx solid rgba(124, 58, 237, 0.05);
}

.header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40rpx;
}

.title-group {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.page-title {
    font-size: 40rpx;
    font-weight: 900;
    color: #1e293b;
}

.page-subtitle {
    font-size: 24rpx;
    color: #94a3b8;
    font-weight: 500;
}

.stat-badge {
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    padding: 16rpx 24rpx;
    border-radius: 24rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120rpx;
}

.stat-label {
    font-size: 20rpx;
    color: #7c3aed;
    font-weight: 700;
    margin-bottom: 4rpx;
}

.stat-count {
    font-size: 36rpx;
    font-weight: 900;
    color: #7c3aed;
}

.header-actions {
    display: flex;
    gap: 20rpx;
}

.action-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    font-size: 28rpx;
    font-weight: 700;
    transition: all 0.2s ease;
}

.action-btn.primary {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    box-shadow: 0 8rpx 16rpx rgba(124, 58, 237, 0.2);
}

.action-btn.ghost {
    background: #ffffff;
    color: #64748b;
    border: 1rpx solid #e2e8f0;
}

.action-btn:active {
    transform: scale(0.97);
}

/* 列表区域 */
.attendance-list {
    /* 使用 flex 布局让滚动区域填满剩余空间，避免固定高度导致底部留白 */
    flex: 1;
}

.attendance-card {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1rpx solid rgba(139, 92, 246, 0.03);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}

.card-left {
    flex: 1;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 12rpx;
}

.user-name {
    font-size: 32rpx;
    font-weight: 800;
    color: #1e293b;
}

.identity-badge {
    font-size: 20rpx;
    padding: 2rpx 16rpx;
    border-radius: 8rpx;
    font-weight: 700;
}

.identity-1 {
    background: rgba(139, 92, 246, 0.1);
    color: #7c3aed;
}

.identity-2 {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.identity-0 {
    background: #f1f5f9;
    color: #64748b;
}

.detail-info {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.info-label {
    font-size: 22rpx;
    color: #94a3b8;
}

.info-value {
    font-size: 22rpx;
    color: #475569;
    font-weight: 600;
}

.card-right {
    text-align: right;
    padding-left: 20rpx;
    border-left: 1rpx dashed #e2e8f0;
}

.checkin-label {
    font-size: 20rpx;
    color: #94a3b8;
    display: block;
    margin-bottom: 4rpx;
}

.checkin-time {
    font-size: 30rpx;
    font-weight: 700;
    color: #8b5cf6;
}

/* 状态展示 */
.loading-state,
.error-state,
.empty-state {
    padding: 100rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
}

.empty-icon {
    font-size: 80rpx;
    opacity: 0.2;
}

.empty-text {
    font-size: 26rpx;
    color: #94a3b8;
}

.state-text {
    font-size: 26rpx;
    color: #64748b;
}

/* 页脚 */
.list-footer {
    padding: 40rpx 0;
    text-align: center;
    font-size: 24rpx;
    color: #94a3b8;
}

.load-more-btn {
    color: #7c3aed;
    font-weight: 700;
}

.footer-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
}
</style>
