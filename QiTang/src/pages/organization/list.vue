<template>
    <view class="page">
        <!-- 固定顶部搜索容器 -->
        <view class="search-container">
            <view class="page-header">
                <view class="header-content">
                    <text class="page-title">🏢 组织列表</text>
                    <text class="page-subtitle">查看可加入的校园组织</text>
                </view>
                <view class="action-btn" @tap="goAddOrganization">
                    <text class="action-icon">➕</text>
                </view>
            </view>
            <view class="search-bar">
                <input class="search-input" placeholder="输入组织名称搜索" v-model="searchKeyword" @input="onSearchInput" />
                <button class="ghost-btn" @tap="clearSearch">清除</button>
            </view>
        </view>

        <!-- 内容区域 -->
        <view class="content-area">
            <view v-if="loading" class="loading-state">
                <text>加载中...</text>
            </view>

            <view v-else-if="displayedOrganizations.length === 0 && !searchLoading" class="empty-state">
                <text class="empty-icon">🏢</text>
                <text class="empty-title">暂无组织</text>
                <text class="empty-desc">暂时没有找到符合条件的组织</text>
            </view>

            <view v-else class="org-list">
                <view class="org-card" v-for="org in displayedOrganizations"
                    :key="org.id || org.organizationId || org.orgId" @tap="openDetail(org)">
                    <view class="card-left">
                        <view class="card-cover-wrapper">
                            <image class="card-cover" :src="resolveAvatar(org.avatar || org.avatarUrl)"
                                mode="aspectFill">
                            </image>
                            <view class="card-overlay">
                                <view class="join-badge" :class="{ 'joined': isJoined(org) }">
                                    <text>{{ isJoined(org) ? '✓ 已加入' : '未加入' }}</text>
                                </view>
                            </view>
                        </view>
                    </view>
                    <view class="card-right">
                        <view class="card-body">
                            <text class="card-title">{{ org.name || org.orgName || '未命名组织' }}</text>
                            <text class="card-desc">{{ org.description || org.orgDescription || '暂无介绍' }}</text>
                            <view class="card-footer">
                                <view class="leader-section">
                                    <text class="leader-icon">👤</text>
                                    <text class="leader-text">{{ leaderName(org) }}</text>
                                </view>
                            </view>
                            <button class="card-join action-btn-small" :class="{ disabled: isJoined(org) }"
                                :disabled="isJoined(org)" @tap.stop="applyJoin(org)">{{ getButtonText(org) }}</button>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 加载更多状态提示 -->
            <view v-if="!loading && displayedOrganizations.length > 0" class="load-more-state">
                <text v-if="loadingMore" class="load-more-text">正在加载...</text>
                <text v-else-if="currentPage + 1 >= totalPages" class="load-more-text load-more-end">
                    已加载全部 {{ totalElements }} 条数据
                </text>
                <text v-else class="load-more-text">已加载 {{ displayedOrganizations.length }} 条数据</text>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { resolveAvatar } from '@/utils/avatar'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            organizations: [],
            loading: false,
            joinedOrgMap: {},
            // 分页状态
            currentPage: 0,
            pageSize: 20,
            totalPages: 1,
            totalElements: 0,
            loadingMore: false,
            // 搜索相关
            searchKeyword: '',
            searchTimer: null,
            // 实时搜索控制
            searchSeq: 0,
            searchCache: {}, // { keyword: { data: [], ts: number } }
            searchLoading: false,
            displayedOrganizations: []
        }
    },
    onShow() {
        this.fetchOrganizations()
    },
    methods: {
        resolveAvatar,
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
        fetchOrganizations(reset = true) {
            // reset: 是否重置分页并覆盖当前列表；false 表示追加下一页
            if (reset) {
                this.currentPage = 0
                this.totalPages = 1
                this.totalElements = 0
                this.organizations = []
                this.displayedOrganizations = []
            }

            // 如果正在加载更多，则不重复请求
            if (this.loadingMore && !reset) return

            // 分页参数
            const page = this.currentPage
            const size = this.pageSize

            if (reset) this.loading = true
            else this.loadingMore = true

            // 请求列表（后端可能支持分页参数 page,size）
            const url = `/api/organization/all?page=${page}&size=${size}`
            const fetchAll = api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取组织列表失败')
                        return
                    }

                    // 解析列表与分页信息
                    let list = []
                    let totalPages = 1
                    let totalElements = 0

                    if (Array.isArray(res.data)) {
                        list = res.data
                        totalPages = 1
                        totalElements = list.length
                    } else if (res.data && Array.isArray(res.data.content)) {
                        list = res.data.content
                        // totalPages/totalElements 可能在不同字段
                        totalPages = Number(res.data.totalPages ?? (res.data.pageable && res.data.pageable.totalPages) ?? 1)
                        totalElements = Number(res.data.totalElements ?? 0)
                    } else if (res.data && Array.isArray(res.data.data)) {
                        list = res.data.data
                        totalPages = 1
                        totalElements = list.length
                    }

                    // 如果是重置（第一页），覆盖，否则追加
                    if (reset || this.currentPage === 0) {
                        this.organizations = list
                        this.displayedOrganizations = list
                    } else {
                        this.organizations = this.organizations.concat(list)
                        this.displayedOrganizations = this.displayedOrganizations.concat(list)
                    }

                    this.totalPages = isNaN(totalPages) ? 1 : totalPages
                    this.totalElements = isNaN(totalElements) ? this.organizations.length : totalElements
                })
                .catch(() => {
                    showError('获取组织列表请求失败')
                    this.organizations = []
                })

            const fetchMy = api.request({ url: '/api/organization/my-organizations', method: 'GET' })
                .then((res) => {
                    const map = {}
                    if (res?.success && Array.isArray(res.data)) {
                        res.data.forEach((item) => {
                            const org = item?.organization || item?.org || item
                            const orgId = this.normalizeOrgId(org)
                            if (orgId) {
                                map[orgId] = true
                            }
                        })
                    }
                    this.joinedOrgMap = map
                })
                .catch(() => {
                    // 未登录或请求失败时不显示错误，仅保持空 Map
                    this.joinedOrgMap = {}
                })
            Promise.all([fetchAll, fetchMy]).finally(() => {
                this.loading = false
                this.loadingMore = false
                uni.stopPullDownRefresh()
            })
        },

        // 上拉加载下一页（直到全部读取完）
        loadMore() {
            // 如果当前已是最后一页，直接返回
            if (this.currentPage + 1 >= this.totalPages) return
            // 防止重复加载
            if (this.loadingMore) return

            this.currentPage += 1
            const kw = (this.searchKeyword || '').trim()
            if (kw) {
                this.performSearch(false)
            } else {
                this.fetchOrganizations(false)
            }
        },
        openDetail(org) {
            const orgId = org?.id || org?.orgId || org?.organizationId
            if (!orgId) {
                showError('缺少组织编号')
                return
            }
            uni.navigateTo({ url: `/pages/organization/detail?id=${orgId}` })
        },
        applyJoin(org) {
            const orgId = org?.id || org?.orgId || org?.organizationId
            if (!orgId) {
                showError('缺少组织编号')
                return
            }
            const normalizedId = this.normalizeOrgId(org)
            if (normalizedId && this.joinedOrgMap[normalizedId]) {
                showError('您已加入该组织')
                return
            }
            const orgName = org.name || org.orgName || '该组织'
            uni.showModal({
                title: `申请加入 ${orgName}`,
                content: '请在下方输入框中说明您的申请理由（选填）',
                editable: true,
                placeholderText: '例如：我对该组织的活动很感兴趣...',
                success: (res) => {
                    if (!res.confirm) return
                    const reason = res.content || ''
                    api.request({
                        url: '/api/organization/member/apply',
                        method: 'POST',
                        data: {
                            orgId,
                            reason
                        }
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '申请失败')
                                return
                            }
                            showSuccess('申请已提交')
                            // 重新加载组织列表以更新加入状态
                            this.fetchOrganizations()
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                }
            })
        },
        onSearchInput(e) {
            if (this.searchTimer) clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => {
                this.performSearch()
            }, 300)
        },
        clearSearch() {
            this.searchKeyword = ''
            this.fetchOrganizations()
        },
        // 简单搜索（不影响已加载的 org 列表）
        // performSearch(reset=true) 支持分页搜索，reset=false 表示加载下一页
        performSearch(reset = true) {
            const kw = (this.searchKeyword || '').trim()
            if (!kw) {
                // 退出搜索模式，恢复全部列表
                this.fetchOrganizations()
                return
            }

            if (reset) {
                this.currentPage = 0
                this.displayedOrganizations = []
                this.totalPages = 1
                this.totalElements = 0
            } else {
                if (this.loadingMore) return
            }

            if (reset) this.searchLoading = true
            else this.loadingMore = true

            const page = this.currentPage
            const size = this.pageSize
            const url = `/api/organization/search?keyword=${encodeURIComponent(kw)}&page=${page}&size=${size}`

            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '搜索失败')
                        if (reset) {
                            this.displayedOrganizations = []
                        }
                        return
                    }

                    const pageData = res.data || {}
                    const content = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData.data) ? pageData.data : (Array.isArray(res.data) ? res.data : []))

                    if (reset || page === 0) {
                        this.displayedOrganizations = content
                    } else {
                        this.displayedOrganizations = [...this.displayedOrganizations, ...content]
                    }

                    this.totalPages = Number(pageData.totalPages ?? (pageData.pageable && pageData.pageable.totalPages) ?? 1)
                    this.totalElements = Number(pageData.totalElements ?? pageData.totalElements ?? this.displayedOrganizations.length)

                    // 设置下一页索引（与 fetchOrganizations 保持一致）
                    if (reset) this.currentPage = (pageData.number || 0) + 1
                    else this.currentPage = (pageData.number || this.currentPage) + 1
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                    if (reset) this.displayedOrganizations = []
                })
                .finally(() => {
                    this.searchLoading = false
                    this.loadingMore = false
                })
        },
        isJoined(org) {
            const orgId = this.normalizeOrgId(org)
            if (!orgId) return false
            return !!this.joinedOrgMap[orgId]
        },
        getButtonText(org) {
            if (this.isJoined(org)) return '已加入'
            return '申请加入'
        },
        normalizeOrgId(org) {
            if (!org) return ''
            // 优先检查 organizationId，然后是常用 ID 字段
            const raw = org.organizationId || org.orgId || org.id || org.orgID || org.ID
            return raw ? String(raw) : ''
        },
        goAddOrganization() {
            uni.navigateTo({ url: '/pages/organization/apply' })
        }
        ,

    },
    onPullDownRefresh() {
        this.fetchOrganizations()
    }

    , onReachBottom() {
        // 页面上拉到底部时加载更多，直到所有分页数据读取完
        this.loadMore()
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    background: linear-gradient(180deg, #f6f2ee 0%, #faf8f5 100%);
    display: flex;
    flex-direction: column;
}

/* 固定顶部搜索容器 */
.search-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
    padding-top: calc(env(safe-area-inset-top) + 8rpx);
    padding-bottom: 8rpx;
    box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.12);
}

/* 页面头部 */
.page-header {
    padding: 24rpx 32rpx 12rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-content {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.page-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #0f172a;
}

.page-subtitle {
    font-size: 22rpx;
    color: #64748b;
}

.action-btn {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%);
    border-radius: 50%;
    box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.2);
}

.action-icon {
    font-size: 24rpx;
}

/* 内容区域 */
.content-area {
    margin-top: calc(env(safe-area-inset-top) + 250rpx);
    padding: 0 32rpx 140rpx;
    flex: 1;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 120rpx 0;
    color: #94a3b8;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
}

.empty-icon {
    font-size: 96rpx;
    opacity: 0.5;
}

.empty-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #64748b;
}

.empty-desc {
    font-size: 24rpx;
    color: #94a3b8;
}

/* 组织列表 - 单列布局 */
.org-list {
    display: flex;
    flex-direction: column;
    gap: 18rpx;
}

.org-card {
    display: flex;
    flex-direction: row;
    background: #ffffff;
    border-radius: 20rpx;
    overflow: hidden;
    box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.09), 0 2rpx 6rpx rgba(15, 23, 42, 0.04);
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.org-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.org-card:active {
    transform: translateY(-4rpx);
    box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.15), 0 4rpx 12rpx rgba(15, 23, 42, 0.08);
}

.org-card:active::before {
    opacity: 1;
}

/* 左侧图片区域 */
.card-left {
    flex-shrink: 0;
    width: 180rpx;
}

.card-cover-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 140rpx;
}

.card-cover {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.5) 100%);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 16rpx;
}

.join-badge {
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
    backdrop-filter: blur(12rpx);
    background: rgba(209, 250, 229, 0.98);
    color: #065f46;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
    border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.join-badge.joined {
    background: rgba(241, 245, 249, 0.98);
    color: #64748b;
}

/* 右侧内容区域 */
.card-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
}

.card-body {
    padding: 16rpx;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
    flex: 1;
}

.card-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.4rpx;
    margin-bottom: 2rpx;
}

.card-desc {
    font-size: 22rpx;
    color: #64748b;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    min-height: 56rpx;
    flex: 1;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 16rpx;
    border-top: 2rpx solid #f1f5f9;
}

.leader-icon {
    font-size: 20rpx;
    flex-shrink: 0;
}

.leader-text {
    font-size: 20rpx;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
}

.leader-text {
    font-size: 24rpx;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
}

.action-btn-small {
    padding: 10rpx 20rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    box-shadow: 0 3rpx 10rpx rgba(139, 92, 246, 0.28);
    border: none;
    flex-shrink: 0;
    transition: all 0.18s ease;
}

/* 绝对定位的加入按钮，定位在卡片右下角 */
.card-join {
    position: absolute;
    right: 18rpx;
    bottom: 14rpx;
    z-index: 5;
}

.action-btn-small:active {
    transform: scale(0.95);
    box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.3);
}

.action-btn-small.disabled {
    background: #e2e8f0;
    color: #94a3b8;
    box-shadow: none;
}

/* 搜索栏 */
.search-bar {
    margin: 0 32rpx 12rpx;
    padding: 0;
    display: flex;
    gap: 12rpx;
    align-items: center;
}

.search-input {
    flex: 1;
    height: 64rpx;
    padding: 0 18rpx;
    background: #f1f5f9;
    border-radius: 12rpx;
    font-size: 24rpx;
    color: #0f172a;
}

.ghost-btn {
    height: 64rpx;
    line-height: 64rpx;
    padding: 0 24rpx;
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 12rpx;
    font-size: 24rpx;
}

.empty-list {
    margin-top: 16rpx;
    font-size: 24rpx;
    color: #94a3b8;
}

/* 加载更多状态 */
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
