<template>
    <view class="page">
        <!-- 顶部搜索与筛选 -->
        <view class="sticky-top">
            <view class="page-header">
                <view class="header-content">
                    <text class="page-title">🎭 演出全览</text>
                    <text class="page-subtitle">探索校园精彩剧目与演出</text>
                </view>
            </view>

            <view class="search-section">
                <view class="search-inner">
                    <view class="search-item">
                        <text class="si-icon">🔍</text>
                        <input class="si-input" v-model="searchKeyword" placeholder="关键词" @input="onSearchInput" />
                    </view>
                    <view class="search-divider"></view>
                    <view class="search-item">
                        <text class="si-icon">📍</text>
                        <input class="si-input" v-model="venueName" placeholder="场地名" @input="onSearchInput" />
                    </view>
                    <view v-if="searchKeyword || venueName" class="si-clear" @tap="clearSearch">✕</view>
                </view>
            </view>

            <view class="filter-wrapper">
                <scroll-view class="filter-scroll" scroll-x enable-flex show-scrollbar="false">
                    <view v-for="f in filters" :key="f.value" class="filter-pill"
                        :class="{ 'filter-pill-active': currentFilter === f.value }" @tap="selectFilter(f.value)">
                        <text>{{ f.label }}</text>
                    </view>
                </scroll-view>
            </view>
        </view>

        <!-- 纵向滚动内容 -->
        <scroll-view class="main-scroll" scroll-y @scrolltolower="onReachBottom" refresher-enabled
            :refresher-triggered="refreshing" @refresherrefresh="onRefresh">

            <!-- 置顶推荐模块 -->
            <view v-if="recommendedPerformances.length > 0 && currentFilter !== 'recommended'" class="top-promo">
                <view class="promo-header">
                    <text class="promo-title">✨ 精选置顶</text>
                </view>
                <scroll-view class="promo-scroll" scroll-x show-scrollbar="false">
                    <view v-for="perf in recommendedPerformances" :key="perf.id" class="promo-card"
                        @tap="goDetail(perf.id)">
                        <image class="promo-img" :src="perf.coverUrl || defaultCover" mode="aspectFill"></image>
                        <view class="promo-overlay">
                            <text v-if="perf.recommendationTag" class="promo-tag">{{ perf.recommendationTag }}</text>
                            <text class="promo-name">{{ perf.name }}</text>
                        </view>
                    </view>
                </scroll-view>
            </view>

            <view class="list-container">
                <view v-if="loading && performances.length === 0" class="state-box">
                    <view class="loading-spinner"></view>
                    <text>载入演出中...</text>
                </view>

                <view v-else-if="performances.length === 0" class="state-box">
                    <text class="state-icon">empty</text>
                    <text class="state-text">暂无相关演出</text>
                </view>

                <view v-else class="card-grid">
                    <view v-for="perf in performances" :key="perf.id" class="perf-card"
                        :class="{ 'perf-card-hot': currentFilter === 'recommended' }" @tap="goDetail(perf.id)">

                        <view class="perf-cover-box">
                            <image class="perf-cover" :src="perf.coverUrl || defaultCover" mode="aspectFill"></image>
                            <view v-if="perf.recommendationTag" class="perf-float-tag">{{ perf.recommendationTag }}
                            </view>
                            <view v-if="currentFilter !== 'recommended'" class="perf-status-tag"
                                :class="getStatusClass(perf.statusDesc)">
                                {{ perf.statusDesc || '待定' }}
                            </view>
                        </view>

                        <view class="perf-info">
                            <text class="perf-title">{{ perf.name }}</text>

                            <!-- 推荐模式下的热度条 -->
                            <view v-if="currentFilter === 'recommended'" class="perf-hot-row">
                                <view class="hot-bar-bg">
                                    <view class="hot-bar-fill" :style="{ width: getHotWidth(perf.hotScore) }"></view>
                                </view>
                                <text class="hot-val">🔥 {{ (perf.hotScore || 0).toFixed(1) }}</text>
                            </view>

                            <!-- 普通模式下的详情 -->
                            <view v-else class="perf-meta-col">
                                <view v-if="perf.displaySessions && perf.displaySessions.length" class="meta-line">
                                    <text class="meta-icon">📍</text>
                                    <text class="meta-text line-clamp">{{ perf.displaySessions[0].venueName }}</text>
                                </view>
                                <view v-if="perf.displaySessions && perf.displaySessions.length" class="meta-line">
                                    <text class="meta-icon">🕒</text>
                                    <text class="meta-text">{{ formatSessionBrief(perf.displaySessions[0]) }}</text>
                                </view>
                            </view>

                            <view class="perf-footer">
                                <view class="perf-stats">
                                    <view class="stat-i">
                                        <text class="stat-v">{{ formatCount(perf.viewCount) }}</text>
                                        <text class="stat-l">浏览</text>
                                    </view>
                                    <view class="stat-i">
                                        <text class="stat-v">{{ formatCount(perf.commentCount) }}</text>
                                        <text class="stat-l">评论</text>
                                    </view>
                                </view>
                                <view v-if="perf.ticketTotal > 0 && perf.publishStatus === 1" class="perf-price">
                                    <text class="ticket-count">余票 {{ perf.ticketSurplus }} / {{ perf.ticketTotal
                                    }}</text>
                                    <text class="ticket-status">{{ perf.ticketSurplus > 0 ? '余票充足' : '已售罄' }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- 加载更多 -->
                    <view v-if="performances.length > 0" class="bottom-hint">
                        <text v-if="loadingMore">正在挖掘更多演出...</text>
                        <text v-else-if="currentPage + 1 >= totalPages">🎉 已经看完啦，共 {{ totalElements }} 场演出</text>
                        <text v-else>下滑查看更多</text>
                    </view>
                </view>
            </view>
        </scroll-view>

        <!-- 悬浮型申请按钮 -->
        <view class="fab-btn" @tap="goApply">
            <text class="fab-plus">＋</text>
            <text class="fab-label">申请演出</text>
        </view>

        <TabBar current="performance" />
    </view>
</template>

<script>
import api from '@/utils/api'
import TabBar from '@/components/TabBar.vue'

export default {
    components: {
        TabBar
    },
    data() {
        return {
            performances: [],
            recommendedPerformances: [],
            loading: false,
            refreshing: false,
            searchKeyword: '',
            venueName: '',
            searchTimer: null,
            currentFilter: 'recommended',
            filters: [
                { label: '🔥 推荐', value: 'recommended' },
                { label: '全部', value: 'all' },
                { label: '进行中', value: 'not_started' },
                { label: '已结束', value: 'ended' },
                { label: '已下架', value: 'removed' },
                { label: '被征用', value: 'reclaimed' }
            ],
            defaultCover: '/static/default-performance.png',
            currentPage: 0,
            pageSize: 10,
            totalPages: 1,
            totalElements: 0,
            loadingMore: false
        }
    },
    onShow() {
        this.fetchData(true)
        this.fetchRecommendedSpotlight()
    },
    methods: {
        goApply() { uni.navigateTo({ url: '/pages/performance/apply' }) },
        goDetail(id) { uni.navigateTo({ url: `/pages/performance/detail?id=${id}` }) },
        onRefresh() { this.refreshing = true; this.fetchData(true).finally(() => { this.refreshing = false }) },
        onReachBottom() {
            if (this.currentPage + 1 < this.totalPages && !this.loadingMore) {
                this.currentPage++;
                this.fetchData(false)
            }
        },

        fetchRecommendedSpotlight() {
            api.request({ url: '/api/recommendation/list?type=2&limit=5', method: 'GET' })
                .then(res => {
                    if (res?.success) {
                        this.recommendedPerformances = (res.data || []).map(d => ({
                            id: d.id, name: d.title, coverUrl: d.posterUrl, recommendationTag: d.recommendationTag
                        }))
                    }
                })
        },

        async fetchData(reset = true) {
            if (reset) {
                this.currentPage = 0
                this.loading = true
            } else {
                this.loadingMore = true
            }

            try {
                if (this.currentFilter === 'recommended') {
                    const res = await api.request({ url: '/api/recommendation/list?type=2&limit=20', method: 'GET' })
                    if (res?.success) {
                        const list = (res.data || []).map(d => this.mapPerformance(d))
                        this.performances = reset ? list : [...this.performances, ...list]
                        this.totalPages = 1
                        this.totalElements = list.length
                    }
                } else {
                    const params = {
                        page: this.currentPage, size: this.pageSize,
                        keyword: this.searchKeyword, venueName: this.venueName
                    }
                    if (this.currentFilter !== 'all') params.status = this.getFilterStatus(this.currentFilter)

                    const res = await api.request({ url: '/api/performance/list', method: 'GET', data: params })
                    if (res?.success) {
                        let list = []
                        let totalP = 1
                        let totalE = 0

                        if (res.data?.content) {
                            list = res.data.content
                            totalP = res.data.totalPages
                            totalE = res.data.totalElements
                        } else if (Array.isArray(res.data)) {
                            list = res.data
                        }

                        const mapped = list.map(d => this.mapPerformance(d))
                        this.performances = reset ? mapped : [...this.performances, ...mapped]
                        this.totalPages = totalP
                        this.totalElements = totalE
                    }
                }
            } catch (e) {
                console.error(e)
            } finally {
                this.loading = false
                this.loadingMore = false
                uni.stopPullDownRefresh()
            }
        },

        mapPerformance(dto) {
            const sessions = dto.sessions || []

            return {
                id: dto.performanceId || dto.id,
                name: dto.title || dto.name,
                coverUrl: dto.posterUrl || dto.coverUrl,
                statusDesc: dto.statusDesc || '待定',
                recommendationTag: dto.recommendationTag,
                hotScore: dto.hotScore || 0,
                viewCount: dto.viewCount || 0,
                commentCount: dto.commentCount || 0,
                displaySessions: sessions,
                // 优先从 sessions 中汇总票数（后端将票务信息放在每个场次里）
                ticketSurplus: (sessions && sessions.length) ? sessions.reduce((acc, s) => acc + (s.ticketSurplus || 0), 0) : (dto.ticketSurplus || 0),
                ticketTotal: (sessions && sessions.length) ? sessions.reduce((acc, s) => acc + (s.ticketTotal || 0), 0) : (dto.ticketTotal || 0)
                ,
                publishStatus: dto.publishStatus
            }
        },

        selectFilter(val) {
            this.currentFilter = val
            this.fetchData(true)
        },

        onSearchInput() {
            if (this.searchTimer) clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => this.fetchData(true), 500)
        },

        clearSearch() {
            this.searchKeyword = ''
            this.venueName = ''
            this.fetchData(true)
        },

        getFilterStatus(f) {
            const map = { 'not_started': 1, 'ended': 3, 'reclaimed': 6, 'removed': 2 }
            return map[f] || null
        },

        getStatusClass(desc) {
            if (!desc) return ''
            if (desc.includes('售票')) return 'status-primary'
            if (desc.includes('结束') || desc.includes('散场')) return 'status-grey'
            if (desc.includes('进行') || desc.includes('表演')) return 'status-success'
            return ''
        },

        getHotWidth(score) {
            const s = Number(score) || 0
            // 进度条最大值对应热度 1000 -> 100%
            const pct = Math.min(100, (s / 1000) * 100)
            return pct + '%'
        },

        formatSessionBrief(s) {
            if (!s || !s.startTime) return '时间待定'
            const dt = new Date(s.startTime)
            return `${dt.getMonth() + 1}月${dt.getDate()}日 ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`
        },

        formatCount(n) {
            if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
            return n || 0
        }
    }
}
</script>

<style>
.page {
    background: #f1f5f9;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.sticky-top {
    background: #ffffff;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
    z-index: 100;
}

.page-header {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: 32rpx 40rpx 20rpx;
    color: #ffffff;
}

.page-title {
    font-size: 34rpx;
    font-weight: 800;
}

.page-subtitle {
    font-size: 20rpx;
    opacity: 0.8;
}

.search-section {
    padding: 16rpx 32rpx 12rpx;
}

.search-inner {
    background: #f8fafc;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    height: 72rpx;
    border: 1rpx solid #e2e8f0;
}

.search-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.si-icon {
    font-size: 24rpx;
}

.si-input {
    font-size: 24rpx;
    width: 100%;
}

.search-divider {
    width: 2rpx;
    height: 24rpx;
    background: #cbd5e1;
    margin: 0 20rpx;
}

.si-clear {
    padding: 10rpx;
    color: #94a3b8;
    font-size: 24rpx;
}

.filter-wrapper {
    padding: 12rpx 0 16rpx;
}

.filter-scroll {
    white-space: nowrap;
    padding: 0 32rpx;
}

/* 允许在小屏幕上滑动查看更多过滤项 */
.filter-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}

.filter-pill {
    display: inline-flex;
    padding: 12rpx 32rpx;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 999rpx;
    margin-right: 16rpx;
    font-size: 24rpx;
    font-weight: 600;
    transition: all 0.3s;
}

.filter-pill-active {
    background: #7c3aed;
    color: #ffffff;
    box-shadow: 0 8rpx 16rpx rgba(124, 58, 237, 0.3);
}

.main-scroll {
    flex: 1;
    overflow: hidden;
}

/* 置顶区块 */
.top-promo {
    padding: 32rpx 0;
}

.promo-header {
    padding: 0 32rpx 16rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #1e293b;
}

.promo-scroll {
    padding: 0 32rpx;
    white-space: nowrap;
}

.promo-card {
    display: inline-block;
    width: 480rpx;
    height: 280rpx;
    border-radius: 24rpx;
    overflow: hidden;
    margin-right: 24rpx;
    position: relative;
    box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.1);
}

.promo-img {
    width: 100%;
    height: 100%;
}

.promo-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 60rpx 24rpx 24rpx;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    color: #ffffff;
}

.promo-tag {
    font-size: 18rpx;
    background: rgba(124, 58, 237, 0.9);
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    position: absolute;
    top: -140rpx;
    left: 24rpx;
}

.promo-name {
    font-size: 30rpx;
    font-weight: 700;
    white-space: normal;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
}

/* 卡片列表 */
.list-container {
    padding: 0 32rpx 160rpx;
}

.card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32rpx;
}

.perf-card {
    background: #ffffff;
    border-radius: 28rpx;
    box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.perf-cover-box {
    position: relative;
    width: 100%;
    height: 380rpx;
}

.perf-cover {
    width: 100%;
    height: 100%;
}

.perf-float-tag {
    position: absolute;
    top: 24rpx;
    left: 24rpx;
    background: rgba(255, 255, 255, 0.9);
    color: #7c3aed;
    font-size: 20rpx;
    font-weight: 800;
    padding: 6rpx 16rpx;
    border-radius: 12rpx;
    backdrop-filter: blur(4rpx);
}

.perf-status-tag {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    font-size: 20rpx;
    padding: 6rpx 16rpx;
    border-radius: 12rpx;
    background: rgba(0, 0, 0, 0.6);
    color: #ffffff;
    font-weight: 600;
}

.status-primary {
    background: #7c3aed;
}

.status-success {
    background: #10b981;
}

.status-grey {
    background: #94a3b8;
}

.perf-info {
    padding: 24rpx 24rpx 20rpx;
}

.perf-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 16rpx;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
}

.perf-hot-row {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin: 10rpx 0;
}

.hot-bar-bg {
    flex: 1;
    height: 12rpx;
    background: #f1f5f9;
    border-radius: 6rpx;
    overflow: hidden;
}

.hot-bar-fill {
    height: 100%;
    background: linear-gradient(to right, #f59e0b, #ef4444);
    border-radius: 6rpx;
}

.hot-val {
    font-size: 24rpx;
    font-weight: 700;
    color: #ef4444;
}

.perf-meta-col {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    margin-bottom: 20rpx;
}

.meta-line {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.meta-icon {
    font-size: 24rpx;
}

.meta-text {
    font-size: 24rpx;
    color: #64748b;
}

.perf-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 2rpx solid #f8fafc;
    padding-top: 16rpx;
}

.perf-stats {
    display: flex;
    gap: 24rpx;
}

.stat-i {
    font-size: 22rpx;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 4rpx;
}

.stat-v {
    font-weight: 700;
    color: #475569;
}

.stat-l {
    font-size: 20rpx;
    color: #94a3b8;
}

.ticket-status {
    font-size: 22rpx;
    color: #7c3aed;
    font-weight: 700;
}

/* 悬浮按钮 */
.fab-btn {
    position: fixed;
    right: 40rpx;
    bottom: 180rpx;
    /* 避开 TabBar */
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: 0 40rpx;
    height: 96rpx;
    border-radius: 48rpx;
    display: flex;
    align-items: center;
    gap: 12rpx;
    color: #ffffff;
    box-shadow: 0 12rpx 30rpx rgba(124, 58, 237, 0.4);
    z-index: 1000;
}

.ticket-count {
    font-size: 22rpx;
    font-weight: 700;
    color: #6d28d9;
    margin-right: 12rpx;
}

.ticket-status {
    font-size: 20rpx;
    color: #6b7280;
}

.fab-plus {
    font-size: 40rpx;
    font-weight: 300;
}

.fab-label {
    font-size: 28rpx;
    font-weight: 700;
}

.state-box {
    padding: 100rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #94a3b8;
    font-size: 26rpx;
}

.loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid #e2e8f0;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20rpx;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.bottom-hint {
    text-align: center;
    padding: 32rpx;
    color: #94a3b8;
    font-size: 22rpx;
}

.line-clamp {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
}
</style>
