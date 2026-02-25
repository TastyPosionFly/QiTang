<template>
    <view class="page">
        <!-- 页面头部固定的筛选区 -->
        <view class="top-fixed">
            <view class="header-content">
                <view class="title-row">
                    <text class="title">📋 审核中心</text>
                    <view v-if="totalElements > 0" class="badge">{{ totalElements }} 条记录</view>
                </view>
                <text class="subtitle">让申请流转更高效 · 认真审阅每份期待</text>
            </view>

            <view class="filter-card">
                <view class="filter-row">
                    <picker class="filter-item" v-if="isAdmin" :range="typeOptions" :value="selectedTypeIndex"
                        @change="onTypeChange">
                        <view class="filter-btn">
                            <text>{{ typeOptions[selectedTypeIndex] }}</text>
                            <text class="arrow">▼</text>
                        </view>
                    </picker>
                    <picker class="filter-item" :range="statusOptions" :value="selectedStatusIndex"
                        @change="onStatusChange">
                        <view class="filter-btn">
                            <text>{{ statusOptions[selectedStatusIndex] }}</text>
                            <text class="arrow">▼</text>
                        </view>
                    </picker>
                </view>
            </view>
        </view>

        <!-- 内容区域 -->
        <view class="content-scroll">
            <view v-if="loading" class="state-container">
                <view class="loading-spinner"></view>
                <text class="state-text">正在加载审核列表...</text>
            </view>

            <view v-else class="list-container">
                <view v-if="applications && applications.length > 0">
                    <view class="app-card" v-for="(app, idx) in applications" :key="idx" @tap="goDetail(app)">
                        <view class="app-card-header">
                            <view class="type-tag" :class="'type-' + app.applicationType">
                                {{ getApplicationTitle(app) }}
                            </view>
                            <view class="status-chip" :class="getStatusClass(app.status)">
                                {{ app.statusDesc || getStatusText(app.status) }}
                            </view>
                        </view>

                        <view class="app-card-body">
                            <view class="info-item">
                                <view class="info-icon">👤</view>
                                <view class="info-content">
                                    <text class="info-val">{{ app.applicantName || app.applicant?.nickname ||
                                        app.applicant?.realName ||
                                        '未知用户' }}</text>
                                    <text class="info-sub">申请人</text>
                                </view>
                            </view>

                            <view class="info-item" v-if="getApplicationTarget(app)">
                                <view class="info-icon">📍</view>
                                <view class="info-content">
                                    <text class="info-val">{{ getApplicationTarget(app) }}</text>
                                    <text class="info-sub">申请对象</text>
                                </view>
                            </view>
                        </view>

                        <view class="app-card-footer">
                            <text class="time-text">{{ formatTime(app.applyTime) }} 发起申请</text>
                            <view class="action-hint">
                                <text>查看详情</text>
                                <text class="arrow-right">›</text>
                            </view>
                        </view>
                    </view>

                    <!-- 加载更多提示 -->
                    <view class="load-more-box">
                        <text v-if="loadingMore" class="loading-more-text">努力加载中...</text>
                        <text v-else-if="page >= totalPages - 1 && applications.length > 0" class="no-more-text">已经到底啦
                            🎉</text>
                    </view>
                </view>

                <!-- 空状态 -->
                <view v-else class="empty-box">
                    <view class="empty-icon">🏖️</view>
                    <text class="empty-title">当前没有需要处理的申请</text>
                    <text class="empty-desc">换个筛选条件试试看吧</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            applications: [],
            loading: false,
            // pagination
            page: 0,
            size: 20,
            totalPages: 0,
            totalElements: 0,
            loadingMore: false,
            userRole: '',
            isAdmin: false,
            isOrgAdmin: false,
            typeOptions: ['全部类型', '创建组织', '加入组织', '解散组织', '演出申请'],
            statusOptions: ['全部状态', '待审核', '已通过', '已拒绝', '已撤销'],
            selectedTypeIndex: 0,
            selectedStatusIndex: 0,
            typeMap: {
                1: 'CREATE_ORG',
                2: 'JOIN_ORG',
                3: 'DISBAND_ORG',
                4: 'PERFORMANCE_APPLY'
            },
            statusMap: {
                1: 1,  // 待审核
                2: 2,  // 已通过
                3: 3,  // 已拒绝
                4: 4   // 已撤销
            }
        }
    },
    onShow() {
        this.checkPermissionAndLoad()
    },
    methods: {
        checkPermissionAndLoad() {
            // 获取用户信息判断权限
            api.request({ url: '/api/users/me', method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError('获取用户信息失败')
                        return
                    }
                    const user = res.data || {}
                    this.userRole = user.role || ''

                    // 分别检查管理员和组织首领身份
                    this.isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(this.userRole)
                    // 使用后端返回的 orgAdmin 字段判断是否为组织管理员
                    this.isOrgAdmin = user.orgAdmin || false

                    // 根据身份设置默认筛选
                    if (this.isAdmin) {
                        // 管理员/超管：默认显示全部类型（类型筛选可见）
                        this.selectedTypeIndex = 0
                    }
                    // 仅为组织首领（非管理员）时，隐藏类型筛选，状态默认保持全部
                    if (!this.isAdmin && this.isOrgAdmin) {
                        this.selectedStatusIndex = 0 // 全部
                    }

                    this.fetchApplications()
                })
                .catch(() => {
                    showError('获取权限失败')
                })
        },
        // fetchApplications(reset=true) - 支持分页
        fetchApplications(reset = true) {
            if (reset) {
                this.page = 0
                this.applications = []
                this.totalPages = 0
                this.totalElements = 0
            }

            // 如果正在加载更多，则不重复请求
            if (this.loadingMore && !reset) return

            if (reset) this.loading = true
            else this.loadingMore = true

            let url = `/api/application/list?page=${this.page}&size=${this.size}`
            const params = []

            // 根据用户身份决定可以查看的申请类型
            if (this.isAdmin) {
                if (this.selectedTypeIndex > 0) {
                    params.push(`applicationType=${this.typeMap[this.selectedTypeIndex]}`)
                }
            } else if (this.isOrgAdmin) {
                params.push('applicationType=JOIN_ORG')
            }

            if (this.selectedStatusIndex > 0) {
                params.push(`status=${this.statusMap[this.selectedStatusIndex]}`)
            }

            if (params.length > 0) url += `&${params.join('&')}`

            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取申请列表失败')
                        return
                    }

                    const pageData = res.data || {}
                    const content = Array.isArray(pageData.content) ? pageData.content : []

                    // 如果是重置（第一页），覆盖，否则追加
                    if (reset || this.page === 0) {
                        this.applications = content
                    } else {
                        this.applications = [...this.applications, ...content]
                    }

                    this.totalPages = pageData.totalPages || 0
                    this.totalElements = pageData.totalElements || 0
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

        // 上拉加载下一页
        loadMore() {
            if (this.page + 1 >= this.totalPages) return
            if (this.loadingMore) return
            this.page += 1
            this.fetchApplications(false)
        },
        onTypeChange(e) {
            this.selectedTypeIndex = e.detail.value
            this.fetchApplications()
        },
        onStatusChange(e) {
            this.selectedStatusIndex = e.detail.value
            this.fetchApplications()
        },
        getApplicationTitle(app) {
            const typeMap = {
                'CREATE_ORG': '创建组织申请',
                'JOIN_ORG': '加入组织申请',
                'DISBAND_ORG': '解散组织申请',
                'PERFORMANCE_APPLY': '校园演出申请'
            }
            return typeMap[app.applicationType] || '申请'
        },
        getStatusText(status) {
            const map = { 1: '待审核', 2: '已通过', 3: '已拒绝', 4: '已撤销' }
            return map[status] || '未知'
        },
        getStatusClass(status) {
            const map = { 1: 'status-pending', 2: 'status-approved', 3: 'status-rejected', 4: 'status-revoked' }
            return map[status] || ''
        },
        formatTime(time) {
            if (!time) return '-'
            try {
                const date = new Date(time)
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            } catch (e) {
                return time
            }
        },
        getApplicationTarget(app) {
            const extra = app?.extraData
            if (!extra) return ''
            try {
                const obj = typeof extra === 'string' ? JSON.parse(extra) : extra
                return obj.orgName || obj.organizationName || obj.name || ''
            } catch (e) {
                return ''
            }
        },
        goDetail(app) {
            if (!app?.applicationId) return
            uni.navigateTo({ url: `/pages/application/review-detail?id=${app.applicationId}` })
        }
    },
    onPullDownRefresh() {
        this.fetchApplications()
    },
    onReachBottom() {
        this.loadMore()
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    background-color: #f1f5f9;
}

.top-fixed {
    position: sticky;
    top: 0;
    z-index: 100;
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: calc(60rpx + env(safe-area-inset-top, 0px)) 32rpx 40rpx;
    border-bottom-left-radius: 40rpx;
    border-bottom-right-radius: 40rpx;
    box-shadow: 0 10rpx 40rpx rgba(124, 58, 237, 0.2);
}

.title-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 8rpx;
}

.title {
    font-size: 40rpx;
    font-weight: 800;
    color: #ffffff;
}

.badge {
    font-size: 20rpx;
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
    font-weight: 700;
}

.subtitle {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.85);
    display: block;
}

.filter-card {
    margin-top: 32rpx;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(14px);
    border: 1rpx solid rgba(255, 255, 255, 0.25);
    border-radius: 20rpx;
    padding: 12rpx;
}

.filter-row {
    display: flex;
    gap: 12rpx;
}

.filter-item {
    flex: 1;
}

.filter-btn {
    background: #ffffff;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24rpx;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #7c3aed;
    font-weight: 700;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.arrow {
    font-size: 20rpx;
    opacity: 0.5;
}

.content-scroll {
    padding: 32rpx;
}

.app-card {
    background: #ffffff;
    border-radius: 28rpx;
    padding: 32rpx;
    margin-bottom: 32rpx;
    box-shadow: 0 4rpx 24rpx rgba(15, 23, 42, 0.04);
}

.app-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
}

.type-tag {
    font-size: 24rpx;
    font-weight: 800;
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
    background: #f1f5f9;
    color: #475569;
}

.status-chip {
    font-size: 22rpx;
    font-weight: 700;
    padding: 6rpx 18rpx;
    border-radius: 999rpx;
}

.status-pending {
    background: #fef3c7;
    color: #d97706;
    border: 1rpx solid #fbbf24;
}

.status-approved {
    background: #dcfce7;
    color: #16a34a;
    border: 1rpx solid #4ade80;
}

.status-rejected {
    background: #fee2e2;
    color: #dc2626;
    border: 1rpx solid #fca5a5;
}

.status-revoked {
    background: #f1f5f9;
    color: #64748b;
    border: 1rpx solid #cbd5e1;
}

.app-card-body {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    margin-bottom: 24rpx;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.info-icon {
    font-size: 32rpx;
}

.info-content {
    display: flex;
    flex-direction: column;
}

.info-val {
    font-size: 28rpx;
    color: #1e293b;
    font-weight: 700;
}

.info-sub {
    font-size: 22rpx;
    color: #94a3b8;
}

.app-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 24rpx;
    border-top: 1rpx solid #f1f5f9;
}

.time-text {
    font-size: 22rpx;
    color: #94a3b8;
}

.action-hint {
    font-size: 24rpx;
    color: #7c3aed;
    display: flex;
    align-items: center;
    font-weight: 700;
    gap: 4rpx;
}

.state-container,
.empty-box {
    padding: 120rpx 40rpx;
    text-align: center;
}

.empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
}

.empty-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #475569;
    display: block;
    margin-bottom: 8rpx;
}

.empty-desc {
    font-size: 24rpx;
    color: #94a3b8;
}

.load-more-box {
    text-align: center;
    padding: 20rpx 0 60rpx;
    font-size: 24rpx;
    color: #94a3b8;
}
</style>
