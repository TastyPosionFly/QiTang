<template>
    <view class="page" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd">
        <view v-if="loading" class="card">
            <text class="state">加载中...</text>
        </view>

        <view v-else>
            <view class="slider-wrapper">
                <view class="slider" :style="[sliderStyle, { width: sliderTotalWidth + 'px' }]">
                    <view class="slide" v-for="(app, idx) in apps" :key="app.applicationId || app.id"
                        :style="{ width: width + 'px', boxSizing: 'border-box' }">
                        <view class="content-wrapper"
                            :style="{ width: slideWidth + 'px', margin: '0 ' + sidePadding + 'px', boxSizing: 'border-box' }">
                            <view class="card">
                                <text class="title">申请详情</text>
                                <view class="info-list">
                                    <view class="info-row">
                                        <text class="label">申请类型</text>
                                        <text class="value">{{ getApplicationTitle(app) }}</text>
                                    </view>
                                    <view class="info-row">
                                        <text class="label">申请状态</text>
                                        <view class="app-status" :class="getStatusClass(app.status)">
                                            <text>{{ app.statusDesc || getStatusText(app.status) }}</text>
                                        </view>
                                    </view>
                                    <view class="info-row">
                                        <text class="label">申请时间</text>
                                        <text class="value">{{ formatTime(app.applyTime) }}</text>
                                    </view>
                                    <view class="info-row" v-if="app.approveTime">
                                        <text class="label">审批时间</text>
                                        <text class="value">{{ formatTime(app.approveTime) }}</text>
                                    </view>

                                    <template v-if="parsedDataFor(app)">
                                        <view class="info-row" v-if="parsedDataFor(app).orgName">
                                            <text class="label">组织名称</text>
                                            <text class="value">{{ parsedDataFor(app).orgName }}</text>
                                        </view>
                                        <view class="info-row"
                                            v-if="app.applicationType === 'CREATE_ORG' && parsedDataFor(app).orgDescription">
                                            <text class="label">组织简介</text>
                                            <text class="value desc">{{ parsedDataFor(app).orgDescription }}</text>
                                        </view>
                                        <view class="info-row"
                                            v-if="app.applicationType === 'JOIN_ORG' && parsedDataFor(app).reason !== undefined">
                                            <text class="label">申请理由</text>
                                            <text class="value desc" v-if="parsedDataFor(app).reason">{{
                                                parsedDataFor(app).reason }}</text>
                                            <text class="value" v-else style="color: #94a3b8;">未填写</text>
                                        </view>
                                        <view class="info-row"
                                            v-if="app.applicationType === 'DISBAND_ORG' && parsedDataFor(app).reason">
                                            <text class="label">解散理由</text>
                                            <text class="value desc">{{ parsedDataFor(app).reason }}</text>
                                        </view>
                                        <view class="info-row" v-if="app.applicationType === 'PERFORMANCE_APPLY'">
                                            <text class="label">演出标题</text>
                                            <text class="value">{{ parsedDataFor(app).performanceTitle ||
                                                parsedDataFor(app).title }}</text>
                                        </view>
                                    </template>
                                </view>
                            </view>

                            <view class="card" v-if="app.applicant || app.applicantName">
                                <text class="title">申请人信息</text>
                                <view class="info-list">
                                    <view class="info-row">
                                        <text class="label">用户名</text>
                                        <text class="value">{{ app.applicantName || app.applicant?.nickname || '-'
                                            }}</text>
                                    </view>
                                    <view class="info-row" v-if="app.applicant?.realName || app.applicantRealName">
                                        <text class="label">姓名</text>
                                        <text class="value">{{ app.applicant?.realName || app.applicantRealName
                                            }}</text>
                                    </view>
                                    <view class="info-row" v-if="app.applicant?.college || app.applicantCollege">
                                        <text class="label">学院</text>
                                        <text class="value">{{ app.applicant?.college || app.applicantCollege }}</text>
                                    </view>
                                    <view class="info-row" v-if="app.applicant?.major || app.applicantMajor">
                                        <text class="label">专业</text>
                                        <text class="value">{{ app.applicant?.major || app.applicantMajor }}</text>
                                    </view>
                                </view>
                            </view>

                            <view class="actions-group">
                                <view class="actions" v-if="app.status === 1">
                                    <button class="revoke-btn" @tap.stop="revokeApplication(app)">撤销申请</button>
                                </view>
                                <view class="actions"
                                    v-if="app.applicationType === 'PERFORMANCE_APPLY' && (app.status === 2 || app.status === 1)">
                                    <button class="primary-btn" @tap.stop="goPerformanceEdit(app)">编辑演出信息</button>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <view v-if="apps.length === 0" class="card"><text class="state">暂无申请记录</text></view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            apps: [],
            application: null,
            loading: false,
            applicationId: null,
            currentIndex: 0,
            width: 0,
            slideWidth: 0,
            sidePadding: 0,
            offsetX: 0,
            startX: 0,
            dragging: false
        }
    },
    computed: {
        sliderStyle() {
            const w = this.width || 0
            const x = -this.currentIndex * w + (this.offsetX || 0)
            return {
                transform: `translateX(${x}px)`,
                transition: this.dragging ? 'none' : 'transform 300ms ease',
                display: 'flex',
                flexDirection: 'row'
            }
        },
        sliderTotalWidth() {
            return (this.width || 0) * (this.apps?.length || 0)
        }
    },
    onLoad(options) {
        if (options.id) {
            this.applicationId = options.id
            this.fetchApplication()
        }
    },
    methods: {
        fetchApplication() {
            if (!this.applicationId) return
            this.loading = true

            api.request({ url: '/api/application/my-applications', method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取申请详情失败')
                        return
                    }
                    this.apps = res.data || []

                    try {
                        const sys = uni.getSystemInfoSync() || {}
                        const windowWidth = sys.windowWidth || 375
                        const pagePaddingRpx = 32
                        const pagePaddingPx = Math.round(pagePaddingRpx * windowWidth / 750)
                        this.width = windowWidth - pagePaddingPx * 2
                        this.slideWidth = Math.round(this.width * 0.9)
                        this.sidePadding = Math.round((this.width - this.slideWidth) / 2)
                    } catch (e) {
                        const fallbackWindow = 375
                        const pagePaddingPx = Math.round(32 * fallbackWindow / 750)
                        this.width = fallbackWindow - pagePaddingPx * 2
                        this.slideWidth = Math.round(this.width * 0.9)
                        this.sidePadding = Math.round((this.width - this.slideWidth) / 2)
                    }

                    const idx = this.apps.findIndex(app =>
                        String(app.id) === String(this.applicationId) ||
                        String(app.applicationId) === String(this.applicationId)
                    )
                    if (idx === -1) {
                        showError('未找到该申请')
                        setTimeout(() => uni.navigateBack(), 1000)
                        return
                    }
                    this.currentIndex = idx
                    this.application = this.apps[this.currentIndex]
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        parsedDataFor(app) {
            if (!app?.extraData) return null
            try {
                const d = app.extraData
                return typeof d === 'string' ? JSON.parse(d) : d
            } catch (e) {
                return null
            }
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
        onTouchStart(e) {
            if (!this.apps.length) return
            this.startX = e.touches?.[0]?.clientX || 0
            this.offsetX = 0
            this.dragging = true
        },
        onTouchMove(e) {
            if (!this.dragging) return
            const x = e.touches?.[0]?.clientX || 0
            let dx = x - this.startX
            if ((this.currentIndex === 0 && dx > 0) || (this.currentIndex === this.apps.length - 1 && dx < 0)) {
                dx = dx * 0.35
            }
            this.offsetX = dx
        },
        onTouchEnd() {
            if (!this.dragging) return
            const dx = this.offsetX
            const threshold = Math.min(120, (this.slideWidth || this.width || 375) * 0.18)
            if (dx > threshold && this.currentIndex > 0) {
                this.currentIndex--
            } else if (dx < -threshold && this.currentIndex < this.apps.length - 1) {
                this.currentIndex++
            }
            this.offsetX = 0
            this.dragging = false
            this.application = this.apps[this.currentIndex]
        },
        revokeApplication(app) {
            const aid = app.applicationId || app.id
            uni.showModal({
                title: '确认撤销',
                content: '确定要撤销此申请吗？',
                success: (res) => {
                    if (!res.confirm) return
                    api.request({
                        url: `/api/application/revoke?applicationId=${aid}`,
                        method: 'POST'
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '撤销失败')
                                return
                            }
                            showSuccess(response?.message || '已撤销申请')
                            setTimeout(() => {
                                const idx = this.apps.findIndex(x => String(x.applicationId || x.id) === String(aid))
                                if (idx !== -1) this.apps.splice(idx, 1)
                                if (this.apps.length === 0) { uni.navigateBack(); return }
                                if (this.currentIndex >= this.apps.length) this.currentIndex = this.apps.length - 1
                                this.application = this.apps[this.currentIndex]
                            }, 500)
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                }
            })
        },
        goPerformanceEdit(app) {
            const perfId = app?.targetId || app?.target
            if (!perfId) {
                showError('未找到相关演出ID')
                return
            }
            uni.navigateTo({ url: `/pages/performance/edit?id=${perfId}` })
        }
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

.content-wrapper {
    display: contents;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 28rpx 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 20rpx;
}

.state {
    font-size: 24rpx;
    color: #94a3b8;
    text-align: center;
    padding: 32rpx 0;
}

.info-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20rpx;
}

.label {
    font-size: 24rpx;
    color: #64748b;
    min-width: 120rpx;
}

.value {
    font-size: 24rpx;
    color: #0f172a;
    flex: 1;
    text-align: right;
}

.value.desc {
    text-align: right;
    line-height: 1.6;
    color: #475569;
    word-wrap: break-word;
    white-space: pre-wrap;
}

.app-status {
    padding: 6rpx 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
}

/* slider styles */
.slider-wrapper {
    width: 100%;
    overflow: hidden;
}

.slider {
    display: flex;
    flex-direction: row;
    will-change: transform;
}

.slide {
    box-sizing: border-box;
    padding: 20rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 80rpx);
}

.slide .content-wrapper {
    width: 100%;
    max-width: 760rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24rpx;
    box-sizing: border-box;
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

.actions-group {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    padding: 0 24rpx;
}

.actions {
    width: 100%;
}

.revoke-btn {
    background: #ef4444;
    color: #fff;
    border-radius: 999rpx;
    height: 72rpx;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    width: 100%;
    box-sizing: border-box;
}

.primary-btn {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    color: #fff;
    border-radius: 999rpx;
    height: 72rpx;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    width: 100%;
    box-sizing: border-box;
    font-weight: 600;
}
</style>
