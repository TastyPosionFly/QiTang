<template>
    <view class="page">
        <!-- 顶部搜索与筛选 - 与演出列表风格一致 -->
        <view class="sticky-top">
            <view class="page-header">
                <view class="header-content">
                    <text class="page-title">🎪 场地列表</text>
                    <text class="page-subtitle">探索并预约校园演出场地</text>
                </view>
            </view>

            <view class="search-section">
                <view class="search-inner">
                    <view class="search-item">
                        <text class="si-icon">🔍</text>
                        <input class="si-input" v-model="searchKeyword" placeholder="搜索场地名称或地址"
                            @input="onSearchInput" />
                    </view>
                    <view v-if="searchKeyword" class="si-clear" @tap="clearSearch">✕</view>
                </view>
            </view>

            <view class="filter-wrapper">
                <scroll-view class="filter-scroll" scroll-x enable-flex show-scrollbar="false">
                    <view class="filter-inner">
                        <picker :range="statusOptions" @change="onStatusChange">
                            <view class="filter-pill" :class="{ 'filter-pill-active': selectedStatusIndex > 0 }">
                                <text>{{ selectedStatusIndex === 0 ? '🗓 状态' : statusLabel }}</text>
                                <text class="pill-arrow">▼</text>
                            </view>
                        </picker>
                        <picker :range="typeOptions" @change="onTypeChange">
                            <view class="filter-pill" :class="{ 'filter-pill-active': selectedTypeIndex > 0 }">
                                <text>{{ selectedTypeIndex === 0 ? '🏢 类型' : typeLabel }}</text>
                                <text class="pill-arrow">▼</text>
                            </view>
                        </picker>
                    </view>
                </scroll-view>
            </view>
        </view>

        <!-- 内容区域 -->
        <scroll-view class="main-scroll" scroll-y @scrolltolower="loadMore" refresher-enabled
            :refresher-triggered="refreshing" @refresherrefresh="onRefresh">

            <view class="content-area">
                <view v-if="loading && venues.length === 0" class="state-box">
                    <view class="loading-spinner"></view>
                    <text>载入场地中...</text>
                </view>

                <view v-else-if="venues.length === 0" class="state-box">
                    <text class="state-icon">empty</text>
                    <text class="state-text">暂无相关场地</text>
                </view>

                <view v-else class="venue-list">
                    <view class="venue-item" v-for="v in venues" :key="v.id" @tap="openVenueDetail(v)">
                        <image class="venue-cover" :src="v.coverImage || (v.photoList && v.photoList[0]?.url) || ''"
                            mode="aspectFill"></image>
                        <view class="venue-content">
                            <view class="venue-header">
                                <text class="venue-name">{{ v.name || '-' }}</text>
                                <view class="status-badge" :class="'status-' + v.status">
                                    <text class="status-text">{{ mapStatus(v.status) }}</text>
                                </view>
                            </view>
                            <text class="venue-desc">{{ v.description || '-' }}</text>
                            <view class="venue-meta-row">
                                <view class="meta-item">
                                    <text class="meta-label">开放时间</text>
                                    <text class="meta-value" :class="formatTodayClass(v)">{{ formatTodayOpening(v)
                                        }}</text>
                                </view>
                                <view class="meta-item">
                                    <text class="meta-label">类型</text>
                                    <text class="meta-value">{{ mapType(v.type) }}</text>
                                </view>
                                <view class="meta-item">
                                    <text class="meta-label">容量</text>
                                    <text class="meta-value">{{ v.capacity ?? '-' }}人</text>
                                </view>
                            </view>
                            <view class="venue-address-row">
                                <text class="address-icon">📍</text>
                                <text class="venue-address">{{ v.address || '-' }}</text>
                            </view>
                            <view class="venue-equipment" v-if="getEquipmentList(v.equipmentInfo).length > 0">
                                <text class="equipment-label">设备</text>
                                <view class="equipment-tags">
                                    <view class="equipment-tag" v-for="(item, idx) in getEquipmentList(v.equipmentInfo)"
                                        :key="idx">
                                        <text class="tag-key">{{ item.label }}</text>
                                        <text class="tag-value">{{ item.value }}</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- 加载更多状态提示 -->
                <view v-if="!loading && venues.length > 0" class="load-more-state">
                    <text v-if="loadingMore" class="load-more-text">正在挖掘更多场地...</text>
                    <text v-else-if="currentPage + 1 >= totalPages" class="load-more-text load-more-end">
                        🎉 已加载全部 {{ totalElements }} 条场地
                    </text>
                    <text v-else class="load-more-text">下滑加载更多 (已加载 {{ venues.length }})</text>
                </view>
            </view>
        </scroll-view>

        <TabBar current="venue" />
    </view>
</template>

<script>
import api from '@/utils/api'
import TabBar from '@/components/TabBar.vue'

export default {
    components: { TabBar },
    data() {
        return {
            venues: [],
            loading: false,
            refreshing: false,
            searchKeyword: '',
            searchTimer: null,
            selectedStatusIndex: 0,
            selectedTypeIndex: 0,
            statusOptions: ['全部', '正常', '维护', '停用'],
            typeOptions: ['全部', '剧场', '礼堂', '多功能', '其他'],
            currentPage: 0,
            pageSize: 20,
            totalPages: 1,
            totalElements: 0,
            loadingMore: false
        }
    },
    computed: {
        statusLabel() { return this.statusOptions[this.selectedStatusIndex] || '全部' },
        typeLabel() { return this.typeOptions[this.selectedTypeIndex] || '全部' }
    },
    methods: {
        openVenueDetail(v) {
            if (!v || !v.id) return
            uni.navigateTo({ url: `/pages/venue/detail?venueId=${v.id}` })
        },
        onRefresh() {
            this.refreshing = true
            this.fetchVenues(true).finally(() => { this.refreshing = false })
        },
        async fetchVenues(reset = true) {
            if (reset) {
                this.currentPage = 0
                this.loading = true
            } else {
                this.loadingMore = true
            }

            const params = {
                page: this.currentPage,
                size: this.pageSize
            }
            if (this.searchKeyword?.trim()) params.name = this.searchKeyword.trim()
            if (this.selectedStatusIndex > 0) {
                const map = [null, 1, 0, 2]
                params.status = map[this.selectedStatusIndex]
            }
            if (this.selectedTypeIndex > 0) params.type = this.selectedTypeIndex

            try {
                const res = await api.request({ url: '/api/venues', method: 'GET', data: params })
                if (res?.success) {
                    let list = []
                    let totalPages = 1
                    let totalElements = 0

                    if (Array.isArray(res.data)) {
                        list = res.data
                        totalElements = list.length
                    } else if (res.data?.content) {
                        list = res.data.content
                        totalPages = res.data.totalPages
                        totalElements = res.data.totalElements
                    }

                    this.venues = reset ? list : this.venues.concat(list)
                    this.totalPages = totalPages
                    this.totalElements = totalElements
                }
            } finally {
                this.loading = false
                this.loadingMore = false
            }
        },
        loadMore() {
            if (this.currentPage + 1 < this.totalPages && !this.loadingMore) {
                this.currentPage++
                this.fetchVenues(false)
            }
        },
        onSearchInput() {
            if (this.searchTimer) clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => this.fetchVenues(true), 300)
        },
        onStatusChange(e) {
            this.selectedStatusIndex = Number(e.detail.value || 0)
            this.fetchVenues(true)
        },
        onTypeChange(e) {
            this.selectedTypeIndex = Number(e.detail.value || 0)
            this.fetchVenues(true)
        },
        mapStatus(s) {
            if (s === 1 || String(s) === '1') return '正常'
            if (s === 0 || String(s) === '0') return '维护'
            if (s === 2 || String(s) === '2') return '停用'
            return s === undefined || s === null ? '未知' : String(s)
        },
        mapType(t) {
            const map = { 1: '剧场', 2: '礼堂', 3: '多功能', 4: '户外广场', 5: '其他' }
            return map[t] || (t ? String(t) : '-')
        },
        formatTodayOpening(v) {
            if (!v) return '-'
            const status = String(v.status)
            if (status === '0') return '维护'
            if (status === '2') return '停用'
            const hoy = v.todayOpeningHours
            if (v.todayBlocked || v.isClosed || (hoy && hoy.isClosed)) return '休息'
            const o = (hoy?.openTime || v.openTime)?.slice(0, 5)
            const c = (hoy?.closeTime || v.closeTime)?.slice(0, 5)
            if (o && c) {
                const now = new Date()
                const nowMin = now.getHours() * 60 + now.getMinutes()
                const [oh, om] = o.split(':').map(Number)
                const [ch, cm] = c.split(':').map(Number)
                const inRange = nowMin >= (oh * 60 + om) && nowMin < (ch * 60 + cm)
                return inRange ? `营业中 ${o}-${c}` : `未开放 ${o}-${c}`
            }
            return '-'
        },
        formatTodayClass(v) {
            const txt = this.formatTodayOpening(v)
            if (txt === '维护') return 'today-maintain'
            if (txt === '停用') return 'today-disabled'
            if (txt.startsWith('营业')) return 'today-open'
            if (txt === '休息' || txt.startsWith('未开放')) return 'today-closed'
            return ''
        },
        getEquipmentList(e) {
            if (!e) return []
            try {
                const obj = typeof e === 'string' ? JSON.parse(e) : e
                return Object.entries(obj).map(([k, v]) => ({
                    label: k,
                    value: typeof v === 'boolean' ? (v ? '是' : '否') : (Array.isArray(v) ? v.join(', ') : String(v))
                }))
            } catch { return [] }
        },
        clearSearch() { this.searchKeyword = ''; this.fetchVenues(true) }
    },
    onShow() { this.fetchVenues(true) }
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

.filter-inner {
    display: flex;
    flex-direction: row;
    gap: 16rpx;
}

.filter-pill {
    display: inline-flex;
    align-items: center;
    padding: 12rpx 28rpx;
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

.pill-arrow {
    font-size: 16rpx;
    margin-left: 8rpx;
    opacity: 0.7;
}

.main-scroll {
    flex: 1;
    overflow: hidden;
}

.content-area {
    padding: 24rpx 32rpx 120rpx;
}

.venue-list {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}

.venue-item {
    background: #ffffff;
    border-radius: 24rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}

.venue-cover {
    width: 100%;
    height: 300rpx;
}

.venue-content {
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.venue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.venue-name {
    font-size: 30rpx;
    font-weight: 800;
    color: #1e293b;
}

.status-badge {
    padding: 6rpx 16rpx;
    border-radius: 12rpx;
    font-size: 20rpx;
    font-weight: 700;
}

.status-1 {
    background: #dcfce7;
    color: #15803d;
}

.status-0 {
    background: #fee2e2;
    color: #dc2626;
}

/* 维护/维护中统一红色系 */
.status-2 {
    background: #f1f5f9;
    color: #64748b;
}

.venue-desc {
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.venue-meta-row {
    display: flex;
    gap: 32rpx;
    padding: 16rpx 0;
    border-top: 2rpx solid #f8fafc;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.meta-label {
    font-size: 18rpx;
    color: #94a3b8;
    text-transform: uppercase;
}

.meta-value {
    font-size: 22rpx;
    font-weight: 700;
    color: #1e293b;
}

.today-open {
    color: #10b981;
}

.today-closed {
    color: #94a3b8;
}

.today-maintain {
    color: #f59e0b;
}

.venue-address-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    background: #f8fafc;
    padding: 12rpx 16rpx;
    border-radius: 12rpx;
}

.address-icon {
    font-size: 24rpx;
}

.venue-address {
    font-size: 22rpx;
    color: #64748b;
}

.venue-equipment {
    margin-top: 8rpx;
}

.equipment-label {
    font-size: 20rpx;
    font-weight: 700;
    color: #94a3b8;
    margin-bottom: 12rpx;
    display: block;
}

.equipment-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
}

.equipment-tag {
    background: #f1f5f9;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    font-size: 20rpx;
}

.tag-key {
    color: #64748b;
    margin-right: 6rpx;
}

.tag-value {
    color: #1e293b;
    font-weight: 600;
}

.state-box {
    padding: 120rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #94a3b8;
}

.loading-spinner {
    width: 50rpx;
    height: 50rpx;
    border: 4rpx solid #e2e8f0;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16rpx;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.load-more-state {
    padding: 40rpx 0;
    text-align: center;
}

.load-more-text {
    font-size: 22rpx;
    color: #94a3b8;
}
</style>
