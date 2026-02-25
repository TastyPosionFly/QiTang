<template>
    <view class="page">
        <!-- 顶部固定容器：包含标题与过滤栏 -->
        <view class="top-fixed">
            <view class="header">
                <text class="title">我的申请</text>
                <text class="subtitle">查看您提交的所有申请记录</text>
            </view>
            <view class="card fixed-filter">
                <view class="filter-row">
                    <picker class="filter-item" :range="typeOptions" :value="selectedTypeIndex" @change="onTypeChange">
                        <view class="filter-btn">{{ typeOptions[selectedTypeIndex] }}</view>
                    </picker>
                    <picker class="filter-item" :range="statusOptions" :value="selectedStatusIndex"
                        @change="onStatusChange">
                        <view class="filter-btn">{{ statusOptions[selectedStatusIndex] }}</view>
                    </picker>
                </view>
            </view>
        </view>

        <!-- 顶部固定占位，避免遮挡后续内容（基于 header + filter 高度） -->
        <view class="top-spacer"></view>

        <view class="card" v-if="loading">
            <text class="state">加载中...</text>
        </view>

        <view class="content-wrapper" v-else>
            <view class="card" v-if="applications && applications.length">
                <view class="app-item" v-for="(app, idx) in applications" :key="idx" @tap="goDetail(app)">
                    <view class="app-header">
                        <text class="app-title">{{ getApplicationTitle(app) }}</text>
                        <view class="app-status" :class="getStatusClass(app.status)">
                            <text>{{ app.statusDesc || getStatusText(app.status) }}</text>
                        </view>
                    </view>
                    <text class="app-target" v-if="getApplicationTarget(app)">申请对象：{{ getApplicationTarget(app)
                        }}</text>
                    <text class="app-time">申请时间：{{ formatTime(app.applyTime) }}</text>
                    <text class="app-time" v-if="app.approveTime">审批时间：{{ formatTime(app.approveTime) }}</text>
                </view>
            </view>

            <!-- 加载更多状态提示 -->
            <view v-if="!loading && applications && applications.length > 0" class="load-more-state">
                <text v-if="loadingMore" class="load-more-text">正在加载...</text>
                <text v-else-if="currentPage + 1 >= totalPages" class="load-more-text load-more-end">
                    已加载全部 {{ totalElements }} 条数据
                </text>
            </view>

            <view class="card" v-else>
                <text class="state">暂无申请记录</text>
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
            },
            // 分页状态
            currentPage: 0,
            pageSize: 20,
            totalPages: 1,
            totalElements: 0,
            loadingMore: false
        }
    },
    onShow() {
        this.fetchApplications()
    },
    methods: {
        fetchApplications(reset = true) {
            // reset: 是否重置分页并覆盖当前列表；false 表示追加下一页
            if (reset) {
                this.currentPage = 0
                this.totalPages = 1
                this.totalElements = 0
                this.applications = []
            }

            // 如果正在加载更多，则不重复请求
            if (this.loadingMore && !reset) return

            if (reset) this.loading = true
            else this.loadingMore = true

            let url = `/api/application/my-applications?page=${this.currentPage}&size=${this.pageSize}`
            const params = []

            if (this.selectedTypeIndex > 0) {
                params.push(`applicationType=${this.typeMap[this.selectedTypeIndex]}`)
            }
            if (this.selectedStatusIndex > 0) {
                params.push(`status=${this.statusMap[this.selectedStatusIndex]}`)
            }
            if (params.length > 0) {
                url += '&' + params.join('&')
            }

            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取申请列表失败')
                        if (reset) this.applications = []
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
                        totalPages = Number(res.data.totalPages ?? 1)
                        totalElements = Number(res.data.totalElements ?? 0)
                    }

                    // 如果是重置（第一页），覆盖，否则追加
                    if (reset || this.currentPage === 0) {
                        this.applications = list
                    } else {
                        this.applications = this.applications.concat(list)
                    }

                    this.totalPages = isNaN(totalPages) ? 1 : totalPages
                    this.totalElements = isNaN(totalElements) ? this.applications.length : totalElements
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                    if (reset) this.applications = []
                })
                .finally(() => {
                    this.loading = false
                    this.loadingMore = false
                    uni.stopPullDownRefresh()
                })
        },

        // 上拉加载下一页
        loadMore() {
            if (this.currentPage + 1 >= this.totalPages) return
            if (this.loadingMore) return
            this.currentPage += 1
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
                'PERFORMANCE_APPLY': '演出申请'
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
        goDetail(app) {
            console.log('点击查看详情:', app)
            const appId = app?.id || app?.applicationId
            if (!appId) {
                showError('无法获取申请ID')
                return
            }
            uni.navigateTo({
                url: `/pages/application/detail?id=${appId}`
            })
        },
        getApplicationTarget(app) {
            const extra = app?.extraData
            if (!extra) return ''
            try {
                const obj = typeof extra === 'string' ? JSON.parse(extra) : extra
                if (app.applicationType === 'PERFORMANCE_APPLY') {
                    return obj.performanceTitle || obj.title || obj.performanceName || ''
                }
                return obj.orgName || obj.organizationName || obj.name || ''
            } catch (e) {
                return ''
            }
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
    padding: 40rpx 32rpx 40rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}

/* 不要使用 display:contents 会让 wrapper 本身“消失”，有时会导致样式或间距不生效 */
.content-wrapper {
    display: block;
    /* 改为 block 以便 wrapper 保持布局语义 */
}

/* 统一控制卡片间距 */
:root {
    --card-gap: 24rpx;
    /* 可调整的间距变量 */
}

/* 顶部固定样式变量 */
:root {
    --filter-height: 88rpx;
    /* 过滤栏高度估算 */
    --header-height: 88rpx;
    /* 标题高度估算 */
}

/* 顶部固定容器，包含 header + filter */
.top-fixed {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 0rpx);
    left: 0;
    right: 0;
    z-index: 120;
    padding: 8rpx 0 0 0;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(6px);
}

.top-fixed .header {
    padding: 12rpx 32rpx 6rpx;
    background: transparent;
}

.fixed-filter {
    padding: 0 32rpx;
    background: transparent;
}

.fixed-filter .card {
    margin: 0;
    border-radius: 0 0 12rpx 12rpx;
}

.top-spacer {
    /* 增大占位以避免遮挡列表第一项（含 safe-area） */
    height: calc(env(safe-area-inset-top) + 180rpx);
    width: 100%;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);

    /* 垂直间距：给每个 card 底部留空 */
    margin-bottom: var(--card-gap);
}

/* 去掉最后一个卡片的多余间距（如果你希望最后一个也有间距可以删掉下面规则） */
.card:last-child {
    margin-bottom: 0;
}

.header {
    padding: 8rpx 8rpx 4rpx;
    margin-bottom: 8rpx;
}

.content-wrapper {
    display: contents;
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
}

/* 把 flex 放到 picker（.filter-item） */
.filter-row {
    display: flex;
    gap: 10%;
    /* 可考虑改为具体单位，如 24rpx */
}

.filter-row picker.filter-item {
    flex: 0 0 45%;
    /* 确保内部视图占满 picker */
    box-sizing: border-box;
}

/* 内部的 .filter-btn 填满父元素并居中 */
.filter-btn {
    width: 100%;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border-radius: 12rpx;
    font-size: 24rpx;
    color: #1e293b;
    /* 去掉原来的 line-height （用 flex 居中更稳） */
}

.state {
    font-size: 24rpx;
    color: #94a3b8;
    text-align: center;
    padding: 32rpx 0;
}

.app-item {
    padding: 20rpx;
    border-radius: 16rpx;
    background: #f8fafc;
    margin-bottom: 16rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.app-item:last-child {
    margin-bottom: 0;
}

.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.app-title {
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
}

.app-time {
    font-size: 22rpx;
    color: #94a3b8;
}

.app-target {
    font-size: 24rpx;
    color: #475569;
    font-weight: 500;
}

.app-status {
    padding: 6rpx 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
}

.status-pending {
    background: #fef3c7;
    color: #92400e;
}

.status-approved {
    background: #d1fae5;
    color: #065f46;
}

.status-rejected {
    background: #fee2e2;
    color: #991b1b;
}

.status-revoked {
    background: #e5e7eb;
    color: #374151;
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
