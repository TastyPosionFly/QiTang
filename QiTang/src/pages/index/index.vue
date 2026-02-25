<template>
    <view class="page">
        <!-- 美化后的头部 -->
        <view class="header">
            <view class="header-bg"></view>
            <view class="header-content">
                <image class="logo" :src="assets.logo" mode="aspectFill"></image>
                <view class="header-text">
                    <text class="title">栖堂</text>
                    <text class="subtitle">校园文艺生活空间 · 让每次灵感落地</text>
                </view>
            </view>
        </view>

        <!-- 美化后的用户卡片 -->
        <view class="card user-card" @tap.stop="openProfileEdit">
            <view v-if="isLoggedIn" class="user-card-bg"
                :style="{ backgroundImage: 'url(' + assets.homeCardBg + ')', backgroundPosition: 'center 15%' }">
            </view>
            <view v-else class="user-card-bg default-bg"></view>
            <view class="user-card-overlay"></view>
            <view class="card-content">
                <view v-if="isLoggedIn" class="user-summary">
                    <view class="avatar-wrapper">
                        <image class="avatar" :src="resolveAvatar(currentUser.avatar) || assets.logo" mode="aspectFill">
                        </image>
                        <view class="avatar-status"></view>
                    </view>
                    <view class="user-info">
                        <text class="user-name">{{ currentUser.nickname || '未命名' }}</text>
                        <text class="user-greeting">欢迎回来 👋</text>
                    </view>
                </view>
                <view v-else class="intro">
                    <view class="intro-header">
                        <text class="intro-icon">🎭</text>
                        <text class="intro-title">欢迎使用校园演出订票系统</text>
                    </view>
                    <text class="intro-desc">演出信息、在线订票、入场提醒，一站式完成</text>
                </view>
            </view>
            <view v-if="isLoggedIn" class="edit-indicator" @tap.stop="openProfileEdit">
                <text class="edit-icon">✏️</text>
            </view>
            <button v-if="!isLoggedIn" class="login-btn" @tap="goLogin">
                <text class="login-btn-text">立即登录</text>
                <text class="login-btn-arrow">→</text>
            </button>
        </view>

        <!-- 新增：我的票夹小卡片 (仅登录且有即将到来的场次时可见) -->
        <view v-if="isLoggedIn && upcomingTicket" class="card ticket-mini-card" @tap="goMyTickets">
            <view class="tmc-left">
                <view class="tmc-icon-bg">
                    <text class="tmc-icon">🎫</text>
                </view>
                <view class="tmc-info">
                    <text class="tmc-label">即将开始的演出</text>
                    <text class="tmc-title">{{ upcomingTicket.performanceName || upcomingTicket.performanceTitle ||
                        '未知演出' }}</text>
                    <text class="tmc-desc">{{ upcomingTicket.venueName }} · {{
                        formatSessionTime(upcomingTicket.startTime) }}</text>
                </view>
            </view>
            <view class="tmc-right">
                <text class="tmc-arrow">›</text>
            </view>
        </view>

        <!-- 新增：待处理任务通知卡片 (仅管理员/首领可见并有待处理项时) -->
        <view v-if="pendingReviewCount > 0" class="card task-notify-card" @tap="goReviewCenter">
            <view class="tnc-left">
                <view class="tnc-icon-bg">
                    <text class="tnc-icon">📬</text>
                </view>
                <view class="tnc-info">
                    <text class="tnc-title">待处理审核任务</text>
                    <text class="tnc-desc">您有 {{ pendingReviewCount }} 项新申请正在等待审核处理</text>
                </view>
            </view>
            <view class="tnc-btn">去审核</view>
        </view>

        <!-- 美化后的推荐演出模块 -->
        <view class="card recommended-card">
            <view class="card-header-row">
                <view class="card-header-left">
                    <view class="card-icon-wrapper">
                        <text class="card-icon">🎭</text>
                    </view>
                    <view class="card-header-text">
                        <text class="card-title">热门演出</text>
                        <text class="card-subtitle">精选推荐 · 不容错过</text>
                    </view>
                </view>
                <view class="view-all-btn" @tap="goPerformanceList">
                    <text class="view-all-text">查看全部</text>
                    <text class="view-all-arrow">›</text>
                </view>
            </view>

            <view v-if="loadingRecommended" class="loading-state">
                <view class="loading-spinner"></view>
                <text class="loading-text">加载中...</text>
            </view>

            <view v-else-if="recommendedPerformances.length === 0" class="empty-state">
                <text class="empty-icon">🎪</text>
                <text class="empty-title">暂无推荐演出</text>
                <text class="empty-desc">敬请期待更多精彩内容</text>
            </view>

            <view v-else class="ranking-list">
                <view v-for="(perf, index) in recommendedPerformances" :key="perf.id" class="ranking-item"
                    @tap="goPerformanceDetail(perf.id)">
                    <!-- 排名标识 -->
                    <view class="rank-badge" :class="getRankClass(index)">
                        <text class="rank-number">{{ index + 1 }}</text>
                    </view>

                    <!-- 封面图 -->
                    <view class="ranking-cover-wrapper">
                        <image class="ranking-cover" :src="perf.coverUrl || assets.logo" mode="aspectFill"></image>
                    </view>

                    <!-- 演出信息 -->
                    <view class="ranking-info">
                        <text class="ranking-name">{{ perf.name }}</text>
                        <text class="ranking-desc">{{ perf.description || '暂无简介' }}</text>
                        <view class="ranking-meta">
                            <view class="meta-item">
                                <text class="meta-icon">🔥</text>
                                <text class="meta-label">热度</text>
                                <text class="meta-value">{{ perf.hotScore ? perf.hotScore.toFixed(1) : '0.0' }}</text>
                            </view>
                            <view class="meta-item">
                                <text class="meta-icon">👁</text>
                                <text class="meta-value">{{ formatCount(perf.viewCount) }}</text>
                            </view>
                            <view class="meta-item">
                                <text class="meta-icon">💬</text>
                                <text class="meta-value">{{ formatCount(perf.commentCount) }}</text>
                            </view>
                            <view v-if="perf.recommendationTag" class="tag-item">
                                <text class="tag-text">{{ perf.recommendationTag }}</text>
                            </view>
                        </view>
                    </view>

                    <!-- 箭头指示器 -->
                    <view class="ranking-arrow">
                        <text class="arrow-icon">›</text>
                    </view>
                </view>
            </view>
        </view>

        <TabBar current="home" />

    </view>
</template>

<script>
import assets from '@/config/assets'
import api from '@/utils/api'
import { resolveAvatar } from '@/utils/avatar'
import { showError } from '@/utils/notify'
import TabBar from '@/components/TabBar.vue'

export default {
    components: {
        TabBar
    },
    data() {
        return {
            assets,
            currentUser: {},
            identityMap: {
                1: '学生',
                2: '学校职工',
                3: '校外人员'
            },
            recommendedPerformances: [],
            loadingRecommended: false,
            pendingReviewCount: 0, // 新增：待处理审核数量
            upcomingTicket: null // 新增：即将开始的票夹信息
        }
    },
    computed: {
        cardStyle() {
            return {
                backgroundImage: `url(${this.assets.homeCardBg})`,
                backgroundPosition: 'center top'
            }
        },
        loginBtnStyle() {
            return this.assets.loginBtnBg
                ? { backgroundImage: `url(${this.assets.loginBtnBg})` }
                : { backgroundColor: '#ffffff', color: '#1e293b' }
        },
        isLoggedIn() {
            return !!uni.getStorageSync('token')
        },
        isAdmin() {
            const role = uni.getStorageSync('role')
            return role === 'ADMIN' || role === 'SUPER_ADMIN'
        },
        isOrgAdmin() {
            const fromStore = uni.getStorageSync('orgAdmin')
            // uni.getStorageSync 返回字符串，需要正确解析
            if (fromStore !== undefined && fromStore !== null && fromStore !== '') {
                return fromStore === true || fromStore === 'true'
            }
            return !!(this.currentUser && this.currentUser.orgAdmin)
        }
    },
    onShow() {
        this.fetchCurrentUser()
        this.fetchRecommended()
        this.fetchPendingReviewCount()
        this.fetchUpcomingTicket()
    },
    methods: {
        resolveAvatar,
        fetchPendingReviewCount() {
            if (!this.isLoggedIn) return

            // 只有管理员或组织首领才需要拉取待审核数量
            const role = uni.getStorageSync('role')
            const isOrgAdmin = uni.getStorageSync('orgAdmin') === true || uni.getStorageSync('orgAdmin') === 'true'
            const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

            if (!isAdmin && !isOrgAdmin) return

            let url = '/api/application/list?page=0&size=1&status=1'
            // 权限过滤：组织首领只能看 JOIN_ORG 类型，且该接口通常会对非管理员进行内部过滤，
            // 但为了请求准确，我们可以按需添加 type 参数
            if (!isAdmin && isOrgAdmin) {
                url += '&applicationType=JOIN_ORG'
            }

            api.request({ url, method: 'GET' })
                .then(res => {
                    if (res?.success && res.data) {
                        this.pendingReviewCount = res.data.totalElements || 0
                    }
                })
                .catch(() => { })
        },
        fetchUpcomingTicket() {
            if (!this.isLoggedIn) return
            // 使用 upcomingFirst=true 优先返回即将开始的票（后端会按时间优先排序）
            api.request({ url: '/api/ticket/my?page=0&size=1&upcomingFirst=true', method: 'GET' })
                .then(res => {
                    if (res?.success && res.data) {
                        const list = res.data.content || res.data || []
                        if (list.length > 0) {
                            this.upcomingTicket = list[0]
                        } else {
                            this.upcomingTicket = null
                        }
                    } else {
                        this.upcomingTicket = null
                    }
                })
                .catch(() => { this.upcomingTicket = null })
        },
        formatSessionTime(timeStr) {
            if (!timeStr) return '-'
            const date = new Date(timeStr)
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            const h = String(date.getHours()).padStart(2, '0')
            const min = String(date.getMinutes()).padStart(2, '0')
            return `${y}-${m}-${d} ${h}:${min}`
        },
        goMyTickets() {
            uni.reLaunch({ url: '/pages/user/profile' })
        },
        fetchCurrentUser() {
            api.request({
                url: '/api/users/me',
                method: 'GET'
            })
                .then((res) => {
                    if (!res?.success) {
                        this.currentUser = {}
                        return
                    }
                    this.currentUser = res.data || {}
                    // 同步更新 orgAdmin 缓存
                    if (res.data && res.data.orgAdmin !== undefined) {
                        uni.setStorageSync('orgAdmin', res.data.orgAdmin)
                    }
                })
                .catch(() => {
                    this.currentUser = {}
                })
        },
        goLogin() {
            // 使用 redirectTo 替换当前页面，避免栈增长
            uni.redirectTo({ url: '/pages/login/login' })
        },
        goProfile() {
            uni.reLaunch({ url: '/pages/user/profile' })
        },
        goAdmin() {
            uni.reLaunch({ url: '/pages/admin/index' })
        }
        ,
        goVenue() {
            uni.reLaunch({ url: '/pages/venue/list' })
        }
        ,
        openProfileEdit() {
            if (!this.isLoggedIn) {
                this.goLogin()
                return
            }
            uni.navigateTo({ url: '/pages/user/edit' })
        },
        fetchRecommended() {
            this.loadingRecommended = true
            // 新接口：获取首页轮播推荐列表 (type=1)
            const type = 1
            const limit = 5
            const url = `/api/recommendation/list?type=${type}&limit=${limit}`
            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (res?.success && res.data) {
                        // 后端返回 PerformanceCardDto[]，映射并基于本机时间推断 "演出中"
                        this.recommendedPerformances = (res.data || []).map(d => {
                            const sessions = d.sessions || []
                            // 判断是否有正在进行的场次
                            let isOngoing = false
                            try {
                                const now = Date.now()
                                for (let i = 0; i < sessions.length; i++) {
                                    const s = sessions[i]
                                    if (!s) continue
                                    const st = s.startTime ? new Date(s.startTime).getTime() : NaN
                                    const et = s.endTime ? new Date(s.endTime).getTime() : NaN
                                    if (!isNaN(st) && !isNaN(et) && st <= now && now < et) {
                                        isOngoing = true
                                        break
                                    }
                                }
                            } catch (e) {
                                // ignore parse errors
                            }

                            // 计算显示的状态描述，优先后端提供的 statusDesc
                            let statusDesc = d.statusDesc || ''
                            const publishStatus = d.publishStatus
                            if (publishStatus === 2) {
                                statusDesc = '已下架'
                            } else if (isOngoing && (d.statusDesc === '未开演' || publishStatus === 1)) {
                                statusDesc = '演出中'
                            }

                            return {
                                id: d.id,
                                name: d.title,
                                description: d.description,
                                coverUrl: d.posterUrl,
                                publishStatus: publishStatus,
                                statusDesc: statusDesc,
                                hotScore: d.hotScore,
                                viewCount: d.viewCount || 0,
                                commentCount: d.commentCount || 0,
                                recommendationTag: d.recommendationTag,
                                sessions: sessions
                            }
                        }).slice(0, limit)
                    } else {
                        this.recommendedPerformances = []
                    }
                })
                .catch((err) => {
                    console.error('获取推荐演出失败:', err)
                    this.recommendedPerformances = []
                })
                .finally(() => {
                    this.loadingRecommended = false
                })
        },
        goPerformanceList() {
            uni.navigateTo({ url: '/pages/performance/list' })
        },
        goPerformanceDetail(id) {
            if (!id) return
            uni.navigateTo({ url: `/pages/performance/detail?id=${id}` })
        },
        goReviewCenter() {
            uni.navigateTo({ url: '/pages/application/review' })
        },
        formatCount(n) {
            if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
            return n || 0
        },
        formatDate(dateStr) {
            if (!dateStr) return '-'
            const date = new Date(dateStr)
            const m = date.getMonth() + 1
            const d = date.getDate()
            return `${m}月${d}日`
        },
        getStatusText(status) {
            const map = {
                0: '待审核',
                1: '售票中',
                2: '已结束',
                3: '已取消'
            }
            return map[status] || '未知'
        },
        getStatusClass(status) {
            const map = {
                0: 'status-pending',
                1: 'status-active',
                2: 'status-ended',
                3: 'status-cancelled'
            }
            return map[status] || ''
        },
        // 根据 perf 的显示状态和 publishStatus 返回徽章样式，优先处理演出中
        getBadgeClass(perf) {
            if (perf && perf.statusDesc === '演出中') return 'status-ongoing'
            return this.getStatusClass(perf ? perf.publishStatus : null)
        },
        getRankClass(index) {
            // 前三名使用特殊样式
            if (index === 0) return 'rank-gold'
            if (index === 1) return 'rank-silver'
            if (index === 2) return 'rank-bronze'
            return 'rank-normal'
        }
    }
}
</script>

<style>
/* 页面整体样式 */
.page {
    min-height: 100vh;
    padding: 0 0 140rpx;
    box-sizing: border-box;
    background: linear-gradient(180deg, #f9fafb 0%, #f6f2ee 100%);
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

/* 美化后的头部 */
.header {
    position: relative;
    padding: 48rpx 32rpx 32rpx;
    overflow: hidden;
}

.header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #7c3aed 100%);
    opacity: 0.05;
}

.header-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.logo {
    width: 96rpx;
    height: 96rpx;
    border-radius: 24rpx;
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.2);
    border: 3rpx solid #ffffff;
}

.header-text {
    flex: 1;
}

.title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: 2rpx;
    margin-bottom: 8rpx;
}

.subtitle {
    display: block;
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.5;
}

/* 通用卡片样式 */
.card {
    margin: 0 32rpx;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 24rpx;
    box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.08);
    overflow: hidden;
    backdrop-filter: blur(10rpx);
}

/* 美化后的用户卡片 */
.user-card {
    position: relative;
    min-height: 200rpx;
    padding: 32rpx;
    overflow: hidden;
}

.user-card-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-size: cover;
    background-position: center;
    filter: blur(5rpx) brightness(0.95);
    transform: scale(1.05);
    z-index: 0;
}

.user-card-bg.default-bg {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    filter: blur(0) brightness(1);
    opacity: 0.08;
}

.user-card-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
    backdrop-filter: blur(8rpx);
    z-index: 1;
}

.card-content {
    position: relative;
    z-index: 2;
}

.user-summary {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.avatar-wrapper {
    position: relative;
}

.avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
    border: 4rpx solid #ffffff;
    box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.3), 0 0 0 2rpx rgba(139, 92, 246, 0.1);
}

.avatar-status {
    position: absolute;
    bottom: 4rpx;
    right: 4rpx;
    width: 20rpx;
    height: 20rpx;
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    border-radius: 50%;
    border: 3rpx solid #ffffff;
}

.user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.user-name {
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
    text-shadow: 0 2rpx 8rpx rgba(255, 255, 255, 0.8);
}

.user-greeting {
    font-size: 24rpx;
    color: #ffffff;
}

.intro {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.intro-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.intro-icon {
    font-size: 32rpx;
}

.intro-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #0f172a;
}

.intro-desc {
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.6;
    padding-left: 44rpx;
}

.edit-indicator {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border-radius: 50%;
    box-shadow: 0 6rpx 20rpx rgba(139, 92, 246, 0.4);
    z-index: 3;
}

.edit-icon {
    font-size: 24rpx;
    filter: brightness(0) invert(1);
}

.login-btn {
    position: absolute;
    right: 32rpx;
    bottom: 32rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;
    height: 64rpx;
    padding: 0 28rpx;
    border-radius: 999rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    box-shadow: 0 6rpx 20rpx rgba(139, 92, 246, 0.4);
    border: none;
    z-index: 3;
}

.login-btn-text {
    color: #ffffff;
    font-size: 26rpx;
    font-weight: 600;
}

.login-btn-arrow {
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
}

/* 推荐演出卡片 */
.recommended-card {
    padding: 32rpx 28rpx;
}

.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28rpx;
}

.card-header-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.card-icon-wrapper {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%);
    border-radius: 16rpx;
    box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.15);
}

.card-icon {
    font-size: 28rpx;
}

.card-header-text {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.card-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.card-subtitle {
    font-size: 20rpx;
    color: #94a3b8;
}

.view-all-btn {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 10rpx 18rpx;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 999rpx;
    border: 1rpx solid #bae6fd;
    transition: all 0.3s ease;
}

.view-all-btn:active {
    transform: scale(0.95);
}

.view-all-text {
    font-size: 22rpx;
    color: #0369a1;
    font-weight: 600;
}

.view-all-arrow {
    font-size: 26rpx;
    color: #0369a1;
    font-weight: 700;
}

/* 加载与空状态 */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 0;
    gap: 16rpx;
}

.loading-spinner {
    width: 48rpx;
    height: 48rpx;
    border: 4rpx solid #e0e7ff;
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    font-size: 24rpx;
    color: #94a3b8;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 0;
    gap: 12rpx;
}

.empty-icon {
    font-size: 72rpx;
    opacity: 0.5;
}

.empty-title {
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;
}

.empty-desc {
    font-size: 22rpx;
    color: #94a3b8;
}

/* 代办任务卡片 */
.task-notify-card {
    background: linear-gradient(135deg, #7c3aed 0%, #be185d 100%);
    padding: 24rpx;
    margin-bottom: 24rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 20rpx;
    box-shadow: 0 8rpx 20rpx rgba(124, 58, 237, 0.2);
}

.tnc-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.tnc-icon-bg {
    font-size: 40rpx;
    background: rgba(255, 255, 255, 0.2);
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.tnc-icon {
    line-height: 1;
}

.tnc-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.tnc-title {
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
    line-height: 1.4;
}

.tnc-desc {
    color: rgba(255, 255, 255, 0.8);
    font-size: 20rpx;
}

.tnc-btn {
    background: #ffffff;
    color: #7c3aed;
    font-size: 22rpx;
    font-weight: 600;
    padding: 8rpx 24rpx;
    border-radius: 30rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

/* 我的票夹小卡片 */
.ticket-mini-card {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    padding: 24rpx;
    margin: 0 32rpx;
    /* 与 user-card 保持边距一致 */
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 20rpx;
    box-shadow: 0 8rpx 20rpx rgba(139, 92, 246, 0.15);
}

.tmc-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
    min-width: 0;
}

.tmc-icon-bg {
    font-size: 36rpx;
    background: rgba(255, 255, 255, 0.2);
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16rpx;
    flex-shrink: 0;
}

.tmc-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;
}

.tmc-label {
    color: rgba(255, 255, 255, 0.85);
    font-size: 20rpx;
    font-weight: 600;
}

.tmc-title {
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tmc-desc {
    color: rgba(255, 255, 255, 0.8);
    font-size: 22rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tmc-right {
    margin-left: 12rpx;
}

.tmc-arrow {
    font-size: 32rpx;
    color: #ffffff;
    opacity: 0.8;
}

/* 演出列表滚动 */
.ranking-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.ranking-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 16rpx;
    background: #ffffff;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.06);
    transition: all 0.3s ease;
    position: relative;
}

.ranking-item:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.1);
}

/* 排名标识 */
.rank-badge {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.rank-number {
    font-size: 28rpx;
    font-weight: 800;
    color: #ffffff;
    line-height: 1;
}

.rank-gold {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.rank-silver {
    background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
}

.rank-bronze {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.rank-normal {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

/* 封面图 */
.ranking-cover-wrapper {
    position: relative;
    width: 160rpx;
    height: 120rpx;
    border-radius: 12rpx;
    overflow: hidden;
    flex-shrink: 0;
}

.ranking-cover {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
}

.ranking-status-badge {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    padding: 4rpx 10rpx;
    border-radius: 999rpx;
    font-size: 18rpx;
    font-weight: 600;
    backdrop-filter: blur(8rpx);
}

/* 演出信息 */
.ranking-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
}

.ranking-name {
    font-size: 28rpx;
    font-weight: 700;
    color: #1f2937;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ranking-desc {
    font-size: 22rpx;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ranking-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-top: 8rpx;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 12rpx;
    background: #f8fafc;
    border-radius: 999rpx;
}

.meta-icon {
    font-size: 18rpx;
}

.meta-label {
    font-size: 18rpx;
    color: #64748b;
    font-weight: 600;
}

.meta-value {
    font-size: 20rpx;
    color: #1e293b;
    font-weight: 700;
}

/* 热度特有颜色 */
.ranking-meta .meta-item:first-child {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.ranking-meta .meta-item:first-child .meta-label {
    color: #92400e;
}

.ranking-meta .meta-item:first-child .meta-value {
    color: #b45309;
}

.tag-item {
    display: flex;
    align-items: center;
    padding: 4rpx 14rpx;
    background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
    border-radius: 999rpx;
}

.tag-text {
    font-size: 20rpx;
    color: #0369a1;
    font-weight: 700;
}

/* 箭头指示器 */
.ranking-arrow {
    width: 40rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 50%;
    flex-shrink: 0;
}

.arrow-icon {
    font-size: 32rpx;
    color: #0369a1;
    font-weight: 700;
}

/* 保留旧样式以防其他地方使用 */
.performance-scroll {
    width: 100%;
    white-space: nowrap;
}

.performance-list {
    display: flex;
    gap: 20rpx;
    padding: 0 4rpx 12rpx;
}

.performance-item {
    display: inline-flex;
    flex-direction: column;
    width: 300rpx;
    background: #ffffff;
    border-radius: 20rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.08);
    transition: all 0.3s ease;
}

.performance-item:active {
    transform: translateY(-4rpx);
    box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.12);
}

.performance-cover-wrapper {
    position: relative;
    width: 100%;
    height: 200rpx;
}

.performance-cover {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
}

.performance-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 100%);
    display: flex;
    align-items: flex-end;
    padding: 16rpx;
}

.performance-status {
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
    backdrop-filter: blur(8rpx);
}

.status-text {
    line-height: 1;
}

.status-pending {
    background: rgba(254, 243, 199, 0.95);
    color: #92400e;
}

.status-active {
    background: rgba(209, 250, 229, 0.95);
    color: #065f46;
}

.status-ended {
    background: rgba(241, 245, 249, 0.95);
    color: #64748b;
}

.status-cancelled {
    background: rgba(254, 226, 226, 0.95);
    color: #991b1b;
}

/* 演出信息 */
.performance-info {
    padding: 20rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.performance-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.performance-meta {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.meta-icon {
    font-size: 18rpx;
}

.meta-text {
    font-size: 22rpx;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}

.performance-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #f1f5f9;
}

.price-tag {
    display: flex;
    align-items: baseline;
    gap: 2rpx;
}

.price-symbol {
    font-size: 20rpx;
    font-weight: 700;
    color: #dc2626;
}

.price-value {
    font-size: 32rpx;
    font-weight: 700;
    color: #dc2626;
}

.book-indicator {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 12rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border-radius: 999rpx;
}

.book-text {
    font-size: 20rpx;
    font-weight: 600;
    color: #ffffff;
}

.book-arrow {
    font-size: 22rpx;
    font-weight: 700;
    color: #ffffff;
}
</style>
