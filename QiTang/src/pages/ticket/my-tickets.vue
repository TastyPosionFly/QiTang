<template>
    <view class="page">
        <!-- 页面说明性页头 -->
        <view class="page-header">
            <view class="header-left">
                <text class="page-title">我的票夹</text>
                <text class="page-subtitle">查看并管理您的所有演出门票</text>
            </view>
            <view class="header-right">
                <text class="ticket-count-badge">{{ tickets.length || 0 }}</text>
                <view class="scan-btn" @tap="openContinuousScan">
                    <text class="scan-icon">📷</text>
                </view>
            </view>
        </view>

        <!-- 将筛选控件放在页面页头下方 -->
        <view class="content-filter">
            <view class="filter-box">
                <view class="filter-row">
                    <picker class="filter-item" :range="statusOptions" :value="selectedStatusIndex"
                        @change="onStatusChange">
                        <view class="filter-btn">
                            <view class="filter-label-group">
                                <text class="filter-icon">🔍</text>
                                <text class="filter-text">{{ statusOptions[selectedStatusIndex] }}</text>
                            </view>
                            <text class="i-arrow">▼</text>
                        </view>
                    </picker>
                </view>
            </view>
        </view>

        <view class="content-wrapper">
            <view v-if="loading && currentPage === 0" class="state-card">
                <text class="state-text">加载中...</text>
            </view>

            <view v-else-if="tickets && tickets.length">
                <view class="ticket-card" v-for="(t, idx) in tickets" :key="idx" @tap="goDetail(t)">
                    <view class="ticket-header">
                        <view class="title-section">
                            <text class="performance-name">{{ t.performanceName }}</text>
                            <text class="session-name" v-if="t.sessionName">{{ t.sessionName }}</text>
                        </view>
                        <view class="status-badge" :class="getTicketStatusClass(t.status)">
                            {{ getTicketStatusText(t.status) }}
                        </view>
                    </view>

                    <view class="ticket-body">
                        <view class="info-item">
                            <text class="label">演出时间</text>
                            <text class="value">{{ formatTime(t.startTime) }}</text>
                        </view>
                        <view class="info-item">
                            <text class="label">场馆地点</text>
                            <text class="value">{{ t.venueName || '暂无地点信息' }}</text>
                        </view>
                    </view>

                    <view class="ticket-footer">
                        <text class="ticket-id">票号: {{ t.id }}</text>
                        <view class="action-section" v-if="t.status === 0" @tap.stop="goQRCode(t)">
                            <text class="btn-text">查看电子票</text>
                            <text class="arrow">›</text>
                        </view>
                    </view>
                </view>

                <view class="load-more" v-if="totalPages > 1">
                    <text class="load-more-text">{{ currentPage + 1 < totalPages ? '上拉加载更多' : '没有更多了' }}</text>
                </view>
            </view>

            <view v-else class="state-card">
                <image src="/static/empty-ticket.png" mode="aspectFit" class="empty-img" v-if="false"></image>
                <text class="state-text">暂无购票记录</text>
                <button class="go-home-btn" @tap="goHome">去看看演出</button>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { showError } from '@/utils/notify'

export default {
    data() {
        return {
            tickets: [],
            loading: false,
            // 不包含已取消状态，前端选项映射到后端数值
            statusOptions: ['全部票务', '待使用', '已使用', '已失效'],
            selectedStatusIndex: 0,
            // 对应后端 status 数值： null 表示不传该参数
            statusValues: [null, 0, 1, 3],
            currentPage: 0,
            pageSize: 10,
            totalPages: 0
        }
    },
    onShow() {
        this.fetchTickets(true)
    },
    onReachBottom() {
        if (this.currentPage + 1 < this.totalPages) {
            this.currentPage++
            this.fetchTickets(false)
        }
    },
    onPullDownRefresh() {
        this.fetchTickets(true).then(() => {
            uni.stopPullDownRefresh()
        })
    },
    methods: {
        async fetchTickets(reset = true) {
            if (reset) {
                this.currentPage = 0
            }
            this.loading = true
            const status = this.statusValues[this.selectedStatusIndex]

            try {
                // 构造参数时只在 status 为数字时附加，避免发送字符串 'undefined'
                const params = {
                    page: this.currentPage,
                    size: this.pageSize
                }
                if (typeof status === 'number') {
                    params.status = status
                }

                const res = await api.request({
                    url: '/api/ticket/my',
                    method: 'GET',
                    data: params
                })
                if (res?.success) {
                    const data = res.data?.content || []
                    this.tickets = reset ? data : [...this.tickets, ...data]
                    this.totalPages = res.data?.totalPages || 0
                }
            } catch (e) {
                showError('获取票务信息失败')
            } finally {
                this.loading = false
            }
        },
        onStatusChange(e) {
            this.selectedStatusIndex = e.detail.value
            this.fetchTickets(true)
        },
        getTicketStatusText(status) {
            const map = { 0: '待使用', 1: '已使用', 2: '已过期', 3: '已退票' }
            return map[status] || '未知'
        },
        getTicketStatusClass(status) {
            const map = { 0: 'status-valid', 1: 'status-used', 2: 'status-expired', 3: 'status-cancelled' }
            return map[status] || ''
        },
        openContinuousScan() {
            uni.navigateTo({ url: '/pages/ticket/scan' })
        },
        async startScan() {
            try {
                // 强制使用摄像头
                const res = await new Promise((resolve, reject) => {
                    uni.scanCode({
                        onlyFromCamera: true,
                        scanType: ['qrCode', 'barCode'],
                        success: resolve,
                        fail: reject
                    })
                })

                let raw = ''
                if (res) raw = (res.result || res.path || '').toString()

                if (!raw) {
                    uni.showToast({ title: '未识别到二维码', icon: 'none' })
                    return
                }

                // 解析常见格式：完整 URL (?code=xxx 或 ?ticketCode=xxx)，或纯码
                const extractParam = (str) => {
                    try {
                        // 如果是 URL，尝试构造 URL 对象（兼容相对路径）
                        if (str.indexOf('=') > -1) {
                            const idx = str.indexOf('?')
                            const query = idx > -1 ? str.substring(idx + 1) : str
                            const pairs = query.split('&')
                            for (const p of pairs) {
                                const [k, v] = p.split('=')
                                if (!k) continue
                                const key = decodeURIComponent(k)
                                const val = v ? decodeURIComponent(v) : ''
                                if (key === 'ticketCode' || key === 'code') return val
                            }
                        }
                    } catch (e) { }
                    // 回退：整个字符串视为 code
                    return str
                }

                const ticketCode = extractParam(raw).trim()
                if (!ticketCode) {
                    uni.showToast({ title: '二维码内容无效', icon: 'none' })
                    return
                }

                uni.showLoading({ title: '核销中' })
                const url = `/api/ticket/check-in?ticketCode=${encodeURIComponent(ticketCode)}`
                const resp = await api.request({ url, method: 'POST' })
                uni.hideLoading()
                if (resp?.success) {
                    uni.showToast({ title: '核销成功', icon: 'success' })
                    this.fetchTickets(true)
                } else {
                    uni.showModal({
                        title: '核销失败',
                        content: resp?.message || '核销失败，请检查二维码或网络',
                        showCancel: false
                    })
                }
            } catch (e) {
                uni.showToast({ title: '扫码取消或失败', icon: 'none' })
            }
        },
        formatTime(time) {
            if (!time) return '-'
            const d = new Date(time)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const hour = String(d.getHours()).padStart(2, '0')
            const min = String(d.getMinutes()).padStart(2, '0')
            return `${year}-${month}-${day} ${hour}:${min}`
        },
        goDetail(t) {
            if (t.performanceId) {
                uni.navigateTo({ url: `/pages/performance/detail?id=${t.performanceId}` })
            }
        },
        async goQRCode(t) {
            // 优先使用 performancePosterUrl 作为背景，如果没有则回退并尝试使用 ticketBgUrl
            const code = encodeURIComponent(t.ticketCode || t.code || t.id || '')
            const poster = t.performancePosterUrl || t.ticketBgUrl || ''
            const bg = poster ? encodeURIComponent(poster) : ''
            const title = (t.performanceTitle || t.performanceName) ? encodeURIComponent(t.performanceTitle || t.performanceName) : ''
            const pid = t.performanceId ? encodeURIComponent(t.performanceId) : ''
            let url = `/pages/ticket/qrcode?code=${code}`
            if (bg) url += `&bg=${bg}`
            if (title) url += `&title=${title}`
            if (pid) url += `&performanceId=${pid}`

            // 在跳转二维码页前，检查用户信息完整性（学号）
            try {
                const me = await api.request({ url: '/api/users/me', method: 'GET' })
                if (!me || !me.success || !me.data) {
                    uni.showToast({ title: '无法获取用户信息', icon: 'none' })
                    return
                }
                const user = me.data
                // 若用户为学生（1）且学号缺失，则强制完善学号信息
                const needsStudentNo = (user.userIdentity === 1 && !user.studentNo)
                if (needsStudentNo) {
                    uni.showModal({
                        title: '完善学号信息',
                        content: '检测到您的学号信息不完整。为使用学生票或出示凭证，请先完善学号信息。',
                        confirmText: '去完善',
                        cancelText: '取消',
                        success: (res) => {
                            if (res.confirm) {
                                const ret = encodeURIComponent(url)
                                uni.navigateTo({ url: `/pages/user/edit?returnUrl=${ret}` })
                            }
                        }
                    })
                    return
                }
            } catch (e) {
                uni.showToast({ title: '检查用户信息失败', icon: 'none' })
                return
            }

            uni.navigateTo({ url })
        },
        goHome() {
            // 跳转到演出列表页；优先使用 navigateTo（非 tab 页面），失败时使用 reLaunch
            try {
                uni.navigateTo({
                    url: '/pages/performance/list',
                    fail: () => {
                        uni.reLaunch({ url: '/pages/performance/list' })
                    }
                })
            } catch (e) {
                uni.reLaunch({ url: '/pages/performance/list' })
            }
        }
    }
}
</script>

<style scoped>
.page {
    min-height: 100vh;
    background-color: #f6f8fc;
    padding-bottom: 40rpx;
}

/* 页面页头样式 */
.page-header {
    background: #ffffff;
    padding: 60rpx 44rpx 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}

.header-left {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.page-title {
    font-size: 48rpx;
    font-weight: 900;
    color: #1e293b;
    letter-spacing: -1rpx;
}

.page-subtitle {
    font-size: 24rpx;
    color: #94a3b8;
    font-weight: 500;
}

.header-right {
    margin-bottom: 8rpx;
}

.ticket-count-badge {
    background: #ede9fe;
    color: #7c3aed;
    font-size: 22rpx;
    font-weight: 800;
    padding: 4rpx 20rpx;
    border-radius: 99rpx;
    line-height: normal;
}

.scan-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72rpx;
    height: 72rpx;
    margin-left: 18rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border-radius: 999rpx;
    box-shadow: 0 8rpx 20rpx rgba(124, 58, 237, 0.18);
}

.scan-icon {
    font-size: 30rpx;
    color: #fff;
}

/* 筛选控件美化 */
.content-filter {
    padding: 2rpx 44rpx 20rpx;
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: #ffffff;
    box-shadow: 0 10rpx 20rpx rgba(15, 23, 42, 0.02);
}

.filter-box {
    margin-top: 10rpx;
}

.filter-btn {
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 20rpx;
    padding: 20rpx 32rpx;
    color: #1e293b;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 320rpx;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-btn:active {
    background: #f1f5f9;
    transform: translateY(2rpx);
}

.filter-label-group {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.filter-icon {
    font-size: 24rpx;
    opacity: 0.6;
}

.filter-text {
    flex: 1;
}

.i-arrow {
    font-size: 20rpx;
    margin-left: 10rpx;
    color: #cbd5e1;
    font-weight: 800;
}

.content-wrapper {
    padding: 24rpx 36rpx;
}

.ticket-card {
    background: #ffffff;
    border-radius: 40rpx;
    padding: 44rpx;
    margin-bottom: 34rpx;
    box-shadow: 0 20rpx 48rpx rgba(15, 23, 42, 0.04);
    border: 1px solid rgba(139, 92, 246, 0.05);
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ticket-card:active {
    transform: scale(0.985);
}

.ticket-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 12rpx;
    background: linear-gradient(to bottom, #8b5cf6, #d946ef);
}

.ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 34rpx;
}

.title-section {
    flex: 1;
    margin-right: 20rpx;
}

.performance-name {
    font-size: 34rpx;
    font-weight: 800;
    color: #1e293b;
    display: block;
    line-height: 1.3;
    letter-spacing: -0.5rpx;
}

.session-name {
    font-size: 22rpx;
    color: #7c3aed;
    background: #f5f3ff;
    padding: 6rpx 20rpx;
    border-radius: 999rpx;
    margin-top: 14rpx;
    display: inline-block;
    font-weight: 600;
}

.status-badge {
    padding: 10rpx 24rpx;
    border-radius: 100rpx;
    font-size: 22rpx;
    font-weight: 700;
    letter-spacing: 1rpx;
}

.status-valid {
    background: #ede9fe;
    color: #7c3aed;
    box-shadow: 0 4rpx 12rpx rgba(124, 58, 237, 0.1);
}

.status-used {
    background: #f1f5f9;
    color: #94a3b8;
}

.status-expired {
    background: #fee2e2;
    color: #ef4444;
}

.status-cancelled {
    background: #f1f5f9;
    color: #cbd5e1;
}

.ticket-body {
    background: #f8fafc;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 34rpx;
}

.info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20rpx;
    align-items: center;
}

.info-item:last-child {
    margin-bottom: 0;
}

.label {
    font-size: 24rpx;
    color: #94a3b8;
    font-weight: 500;
}

.value {
    font-size: 26rpx;
    color: #334155;
    font-weight: 700;
}

.ticket-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 30rpx;
    border-top: 1px dashed #e2e8f0;
}

.ticket-id {
    font-size: 22rpx;
    color: #94a3b8;
    font-family: 'Courier New', Courier, monospace;
    opacity: 0.8;
}

.action-section {
    display: flex;
    align-items: center;
    color: #8b5cf6;
    background: #f5f3ff;
    padding: 10rpx 28rpx;
    border-radius: 100rpx;
    transition: all 0.2s;
}

.action-section:active {
    background: #ede9fe;
}

.btn-text {
    font-size: 24rpx;
    font-weight: 700;
}

.arrow {
    font-size: 28rpx;
    margin-left: 6rpx;
    font-weight: 800;
}

.state-card {
    background: #ffffff;
    border-radius: 40rpx;
    padding: 140rpx 40rpx;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.02);
}

.state-text {
    font-size: 30rpx;
    color: #94a3b8;
    margin-bottom: 50rpx;
    font-weight: 500;
}

.go-home-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    border-radius: 100rpx;
    font-size: 30rpx;
    font-weight: 700;
    padding: 0 70rpx;
    height: 90rpx;
    line-height: 90rpx;
    box-shadow: 0 16rpx 32rpx rgba(124, 58, 237, 0.2);
}

.load-more {
    text-align: center;
    padding: 40rpx 0;
}

.load-more-text {
    font-size: 24rpx;
    color: #94a3b8;
    font-weight: 500;
}
</style>
