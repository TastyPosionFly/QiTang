<template>
    <view class="page">
        <view class="top-fixed">
            <view class="header">
                <text class="title">组织管理</text>
                <text class="subtitle">查看全部组织并进入详情</text>
            </view>

            <view class="card filter-card">
                <view class="search-row">
                    <input class="search-input" placeholder="输入组织名称搜索" v-model="searchKeyword" @input="onSearchInput" />
                    <button class="primary-btn search-btn" @tap="performSearch">搜索</button>
                    <button class="ghost-btn" @tap="clearSearch">清除</button>
                </view>
                <!-- 操作已移除，使用下拉刷新替代 -->
            </view>
        </view>

        <view class="content-wrapper">
            <view class="card" v-if="loading">
                <text class="state">加载中...</text>
            </view>

            <text class="state" v-if="searchLoading">搜索中...</text>

            <view class="card" v-if="displayedOrganizations.length">
                <view class="org-list">
                    <view class="org-item" v-for="org in displayedOrganizations"
                        :key="org.id || org.orgId || org.organizationId">
                        <image class="avatar" :src="resolveAvatar(org.avatar || org.avatarUrl)" mode="aspectFill">
                        </image>
                        <view class="org-main" @tap="openDetail(org)">
                            <text class="org-name">{{ org.name || org.orgName || '未命名组织' }}</text>
                            <text class="org-desc">{{ org.description || org.orgDescription || '暂无介绍' }}</text>
                            <text class="org-meta">负责人：{{ leaderName(org) }}</text>
                            <text class="org-meta">状态：{{ formatStatus(org.status) }}</text>
                        </view>
                        <button class="mini-btn" @tap.stop="openDetail(org)">查看详情</button>
                    </view>
                </view>
            </view>

            <!-- 加载更多状态提示 -->
            <view v-if="!loading && displayedOrganizations && displayedOrganizations.length > 0"
                class="load-more-state">
                <text v-if="loadingMore" class="load-more-text">正在加载...</text>
                <text v-else-if="page >= totalPages" class="load-more-text load-more-end">
                    已加载全部 {{ totalElements }} 条数据
                </text>
            </view>

            <view class="card" v-else-if="!loading && !searchLoading && displayedOrganizations.length === 0">
                <text class="state">暂无组织信息</text>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { resolveAvatar } from '@/utils/avatar'
import { showError } from '@/utils/notify'

export default {
    data() {
        return {
            organizations: [],
            loading: false,
            // pagination
            page: 0,
            size: 20,
            totalPages: 0,
            totalElements: 0,
            loadingMore: false,
            isSearching: false,
            // 搜索相关
            searchKeyword: '',
            searchTimer: null,
            searchSeq: 0,
            searchCache: {},
            searchLoading: false,
            displayedOrganizations: []
        }
    },
    onShow() {
        this.fetchOrganizations()
    },
    methods: {
        resolveAvatar,
        // fetchOrganizations(reset=true, keyword) 支持分页与搜索
        fetchOrganizations(reset = true, keyword) {
            if (reset) {
                this.page = 0
                this.organizations = []
                this.displayedOrganizations = []
                this.totalPages = 0
                this.totalElements = 0
            } else {
                if (this.loadingMore) return
            }

            const isLoadMore = !reset
            if (isLoadMore) this.loadingMore = true
            else this.loading = true

            const kw = (typeof keyword !== 'undefined' && keyword !== null) ? keyword : (this.isSearching ? this.searchKeyword : '')
            let url = `/api/organization/all?page=${this.page}&size=${this.size}`
            if (kw && kw.trim()) url = `/api/organization/search?keyword=${encodeURIComponent(kw.trim())}&page=${this.page}&size=${this.size}`

            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取组织列表失败')
                        return
                    }

                    const pageData = res.data || {}
                    const content = Array.isArray(pageData.content) ? pageData.content : []
                    if (reset) this.displayedOrganizations = content
                    else this.displayedOrganizations = [...this.displayedOrganizations, ...content]

                    this.totalPages = pageData.totalPages || 0
                    this.totalElements = pageData.totalElements || 0

                    if (!isLoadMore) this.page = (pageData.number || 0) + 1
                    else this.page = (pageData.number || this.page) + 1
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.loading = false
                    this.loadingMore = false
                    uni.stopPullDownRefresh()
                })
        },
        leaderName(org) {
            if (!org) return '未知'
            const leader = org.Leader || org.leader
            if (leader) return leader.nickname || leader.name || leader.realName || '未知'
            const members = Array.isArray(org.members) ? org.members : []
            const leaderMember = members.find((item) => {
                const role = (item?.memberRole || '').toUpperCase()
                return role === 'LEADER' || role === 'OWNER'
            })
            if (leaderMember) {
                const user = leaderMember.user || {}
                return user.nickname || user.name || leaderMember.nickname || leaderMember.name || '未知'
            }
            return '未知'
        },
        formatStatus(status) {
            if (status === undefined || status === null) return '未知'
            if (typeof status === 'string') {
                const parsed = Number(status)
                if (!Number.isNaN(parsed)) return this.formatStatus(parsed)
                const upper = status.toUpperCase()
                if (upper === 'BANNED' || upper === 'DISABLED') return '已封禁'
                if (upper === 'PENDING') return '待审核'
                return status
            }
            if (status === 1) return '正常'
            if (status === 0) return '待审核'
            if (status === -1) return '已解散'
            if (status === -2) return '已封禁'
            return '未知'
        },
        openDetail(org) {
            const orgId = org?.id || org?.orgId || org?.organizationId
            if (!orgId) {
                showError('缺少组织编号')
                return
            }
            uni.navigateTo({ url: `/pages/organization/detail?id=${orgId}` })
        }
        ,
        // 搜索增强：本地即时过滤 + 防抖网络请求 + 版本号 + 缓存
        onSearchInput() {
            const kw = (this.searchKeyword || '').trim().toLowerCase()
            if (!kw) {
                this.displayedOrganizations = this.organizations
            } else {
                const local = (this.organizations || []).filter((org) => {
                    const name = (org.name || org.orgName || '').toString().toLowerCase()
                    return name.indexOf(kw) !== -1
                })
                this.displayedOrganizations = local
            }

            if (this.searchTimer) clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => {
                this.performSearch()
            }, 300)
        },
        clearSearch() {
            this.searchKeyword = ''
            this.displayedOrganizations = this.organizations
        },
        performSearch() {
            const kw = (this.searchKeyword || '').trim()
            if (!kw) {
                this.isSearching = false
                this.fetchOrganizations(true)
                return
            }

            const now = Date.now()
            const cached = this.searchCache[kw]
            if (cached && (now - cached.ts) < 30_000) {
                this.displayedOrganizations = cached.data
                return
            }

            // paginated search
            this.isSearching = true
            this.searchLoading = true
            this.searchSeq++
            const seq = this.searchSeq
            // delegate to fetchOrganizations with keyword
            this.fetchOrganizations(true, kw)
                // ensure searchLoading is cleared after fetch
                ; (async () => {
                    // wait a tick to allow fetchOrganizations to run and update
                    await new Promise(r => setTimeout(r, 10))
                    if (seq === this.searchSeq) this.searchLoading = false
                })()
        },
        loadMore() {
            if (this.page >= this.totalPages) return
            if (this.loadingMore) return
            this.fetchOrganizations(false)
        }
    },
    onPullDownRefresh() {
        this.fetchOrganizations()
    },
    onReachBottom() {
        this.loadMore()
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    padding: 40rpx 32rpx 40rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.top-fixed {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    z-index: 60;
    padding: calc(8rpx + env(safe-area-inset-top, 0px)) 32rpx 16rpx;
    background-color: #f6f2ee;
    box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.06);
}

.filter-card {
    margin-top: 12rpx;
}

.content-wrapper {
    display: block;
    box-sizing: border-box;
    padding-top: calc(240rpx + env(safe-area-inset-top, 0px));
}

.header {
    padding: 8rpx 8rpx 4rpx;
    margin-bottom: 8rpx;
}

.title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.subtitle {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #64748b;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
    margin-bottom: 16rpx;
}

.state {
    font-size: 24rpx;
    color: #94a3b8;
    text-align: center;
    padding: 32rpx 0;
}

.action-row {
    display: flex;
    gap: 12rpx;
    margin-top: 12rpx;
}

.ghost-btn {
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 999rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 24rpx;
    padding: 0 24rpx;
}

.primary-btn {
    background: #2563eb;
    color: #fff;
    border-radius: 999rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 24rpx;
    padding: 0 24rpx;
}

.org-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.org-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    background: #f8fafc;
    border-radius: 16rpx;
    padding: 16rpx;
}

.avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 16rpx;
    background: #e2e8f0;
}

.org-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.org-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
}

.org-desc {
    font-size: 22rpx;
    color: #475569;
    line-height: 1.4;
}

.org-meta {
    font-size: 22rpx;
    color: #94a3b8;
}

.mini-btn {
    background: #2563eb;
    color: #fff;
    border-radius: 999rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 24rpx;
    padding: 0 24rpx;
}

.search-row {
    display: flex;
    gap: 12rpx;
    align-items: center;
}

.search-input {
    flex: 1;
    height: 64rpx;
    border-radius: 12rpx;
    padding: 0 18rpx;
    background: #f1f5f9;
    font-size: 24rpx;
}

.search-btn {
    height: 64rpx;
    line-height: 64rpx;
    padding: 0 24rpx;
    font-size: 24rpx;
}

.load-more-state {
    padding: 32rpx 0;
    text-align: center;
}

.load-more-text {
    font-size: 24rpx;
    color: #94a3b8;
}

.load-more-end {
    color: #64748b;
    font-weight: 500;
}
</style>
