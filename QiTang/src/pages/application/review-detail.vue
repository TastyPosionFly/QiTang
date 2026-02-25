<template>
    <view class="page" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd">
        <view class="nav-header">
            <view class="nav-content">
                <text class="nav-title">🚀 审核中心</text>
                <text class="nav-page" v-if="apps.length > 0">{{ currentIndex + 1 }} / {{ apps.length }}</text>
            </view>
        </view>

        <view v-if="loading" class="full-state">
            <view class="loading-spinner"></view>
            <text>内容加载中...</text>
        </view>

        <view v-else class="slider-container">
            <view class="slider" :style="[sliderStyle, { width: sliderTotalWidth + 'px' }]">
                <view class="slide" v-for="(app, idx) in apps" :key="app.applicationId || app.id"
                    :style="{ width: width + 'px' }">
                    <view class="card-stack"
                        :style="{ width: cardInnerWidth + 'px', marginLeft: cardInnerLeftGap + 'px', marginRight: cardInnerRightGap + 'px' }">

                        <!-- 核心信息卡 -->
                        <view class="main-card">
                            <view class="card-header">
                                <view class="type-badge">{{ getApplicationTitle(app) }}</view>
                                <view class="status-indicator" :class="getStatusClass(app.status)">
                                    {{ app.statusDesc || getStatusText(app.status) }}
                                </view>
                            </view>

                            <view class="info-group">
                                <view class="info-row highlight">
                                    <text class="label">申请人</text>
                                    <view class="user-cell">
                                        <text class="name-text">{{ app.applicantName || app.applicant?.nickname ||
                                            app.applicant?.realName || '未命名'
                                        }}</text>
                                        <text class="real-text" v-if="app.applicant?.realName && !app.applicantName">({{
                                            app.applicant.realName }})</text>
                                    </view>
                                </view>
                                <view class="divider"></view>
                                <view class="info-row">
                                    <text class="label">提交时间</text>
                                    <text class="value">{{ formatTime(app.applyTime) }}</text>
                                </view>
                            </view>

                            <!-- 不同类型特定展现 (PERFORMANCE_APPLY 等) -->
                            <view class="ext-content" v-if="parsedDataFor(app)">
                                <view class="section-divider">
                                    <text>详细内容</text>
                                </view>

                                <!-- 校园演出申请详情 -->
                                <template v-if="app.applicationType === 'PERFORMANCE_APPLY'">
                                    <view class="perf-brief">
                                        <image v-if="parsedDataFor(app).posterUrl" :src="parsedDataFor(app).posterUrl"
                                            mode="aspectFill" class="brief-poster" />
                                        <view class="brief-info">
                                            <text class="brief-title">{{ parsedDataFor(app).performanceTitle ||
                                                parsedDataFor(app).title || parsedDataFor(app).performanceName || '演出申请'
                                            }}</text>

                                            <view class="perf-info-row">
                                                <text class="perf-label">演出标题</text>
                                                <text class="perf-value">{{ parsedDataFor(app).performanceTitle ||
                                                    parsedDataFor(app).title || '-' }}</text>
                                            </view>

                                            <view class="perf-info-row">
                                                <text class="perf-label">首选场地</text>
                                                <text class="perf-value">{{ parsedDataFor(app).primaryVenueName || '-'
                                                    }}</text>
                                            </view>

                                            <view class="perf-info-row">
                                                <text class="perf-label">申请理由</text>
                                                <text class="perf-value multiline">{{ parsedDataFor(app).applyReason ||
                                                    '-' }}</text>
                                            </view>

                                            <view class="perf-info-row">
                                                <text class="perf-label">演出简介</text>
                                                <text class="perf-value multiline">{{ parsedDataFor(app).description ||
                                                    '-' }}</text>
                                            </view>
                                        </view>
                                    </view>

                                    <view class="session-list">
                                        <text class="session-header">场次</text>
                                        <view v-for="(s, sidx) in (parsedDataFor(app).sessions || [])" :key="sidx"
                                            class="session-item">
                                            <text class="s-venue">🏠 {{ s.venueName || s.location ||
                                                parsedDataFor(app).primaryVenueName || '-' }}</text>
                                            <text class="s-time">� {{ formatSessionTime(s.startTime, s.endTime)
                                            }}</text>
                                        </view>
                                        <view
                                            v-if="!(parsedDataFor(app).sessions && parsedDataFor(app).sessions.length)">
                                            <text class="s-empty">未指定场次</text>
                                        </view>
                                    </view>
                                    <!-- 自定义拒绝弹窗（已移动到全局位置） -->
                                </template>

                                <!-- 其他原有类型数据展现 -->
                                <template v-else>
                                    <view class="simple-info-list">
                                        <view class="s-row" v-if="parsedDataFor(app).orgName">
                                            <text class="s-label">组织名称</text>
                                            <text class="s-val">{{ parsedDataFor(app).orgName }}</text>
                                        </view>
                                        <view class="s-row block"
                                            v-if="parsedDataFor(app).orgDescription || parsedDataFor(app).reason">
                                            <text class="s-label">简介/理由</text>
                                            <text class="s-val multiline">{{ parsedDataFor(app).orgDescription ||
                                                parsedDataFor(app).reason }}</text>
                                        </view>
                                    </view>
                                </template>
                            </view>
                        </view>

                        <!-- 用户档案补充卡 (只读背景信息) -->
                        <view class="sub-card" v-if="app.applicant">
                            <view class="sub-header">🎓 学籍背景</view>
                            <view class="sub-body">
                                <view class="sub-tag" v-if="app.applicant.college">{{ app.applicant.college }}</view>
                                <view class="sub-tag" v-if="app.applicant.major">{{ app.applicant.major }}</view>
                            </view>
                        </view>

                        <!-- 已处理申请的审核反馈 -->
                        <view class="feedback-card" v-if="app.status !== 1">
                            <view class="fb-header">
                                <view class="fb-icon-bg">
                                    <text class="fb-icon">📝</text>
                                </view>
                                <text class="fb-title">审核反馈</text>
                            </view>
                            <view class="fb-body">
                                <text class="fb-reason">{{ (parsedDataFor(app) && (parsedDataFor(app)['拒绝理由'] ||
                                    parsedDataFor(app).rejectReason)) || app.reason || '管理员未提供具体备注' }}</text>
                                <view class="fb-footer" v-if="app.approveTime">
                                    <text class="fb-time">处理时间：{{ formatTime(app.approveTime) }}</text>
                                </view>
                            </view>
                        </view>

                        <!-- 操作区 (仅在待审核时显示) -->
                        <view class="footer-actions" v-if="app.status === 1">
                            <button class="btn btn-reject" @tap.stop="reviewApplication(3, app)">
                                <text>拒绝申请</text>
                            </button>
                            <button class="btn btn-approve" @tap.stop="reviewApplication(2, app)">
                                <text>通过审核</text>
                            </button>
                        </view>
                    </view>
                </view>
            </view>
            <!-- 全局自定义拒绝弹窗 -->
            <view v-if="showRejectModal" class="modal-overlay" @tap="cancelReject">
                <view class="modal" @tap.stop>
                    <text class="modal-title">拒绝申请</text>
                    <textarea class="modal-textarea" placeholder="请输入拒绝理由（可选)" v-model="rejectReasonInput"></textarea>
                    <view class="modal-actions">
                        <button class="btn btn-cancel" @tap.stop="cancelReject">取消</button>
                        <button class="btn btn-confirm" @tap.stop="confirmReject">确认拒绝</button>
                    </view>
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
            apps: [],
            application: null,
            loading: false,
            applicationId: null,
            userRole: '',
            isAdmin: false,
            isOrgAdmin: false,
            currentIndex: 0,
            width: 0,         // outer slide width (px) - used for translateX
            slideWidth: 0,    // visible card width (px), e.g. 90% of width
            sidePadding: 0,   // left/right padding to center card
            // 可调整的左右内留白（默认以 rpx 为单位，在 fetch 时换算为 px）
            cardLeftGapRpx: 128,
            cardRightGapRpx: 64,
            cardInnerLeftGap: 0,
            cardInnerRightGap: 0,
            cardInnerWidth: 0,
            offsetX: 0,
            startX: 0,
            dragging: false
            ,
            // 自定义拒绝弹窗相关状态
            showRejectModal: false,
            rejectReasonInput: '',
            pendingAction: null
        }
    },
    computed: {
        sliderStyle() {
            // 使用 this.width 作为每页位移基准
            const w = this.width || 0
            const x = -this.currentIndex * w + (this.offsetX || 0)
            return {
                transform: `translateX(${x}px)`,
                transition: this.dragging ? 'none' : 'transform 300ms ease',
                display: 'flex',
                flexDirection: 'row'
            }
        },
        // 总宽 = 每页宽度 * 页数（用于设置 slider 的真实宽度，保证 translateX 基准一致）
        sliderTotalWidth() {
            return (this.width || 0) * (this.apps?.length || 0)
        }
    },
    onLoad(options) {
        if (options.id) {
            this.applicationId = options.id
            this.fetchUserInfo()
        }
    },
    methods: {
        fetchUserInfo() {
            api.request({ url: '/api/users/me', method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError('获取用户信息失败')
                        return
                    }
                    const user = res.data || {}
                    this.userRole = user.role || ''
                    this.isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(this.userRole)
                    this.isOrgAdmin = user.orgAdmin || false

                    const canReview = this.isAdmin || this.isOrgAdmin
                    if (!canReview) {
                        showError('无权限查看')
                        setTimeout(() => uni.navigateBack(), 1000)
                        return
                    }

                    this.fetchApplicationsList()
                })
                .catch(() => showError('获取用户信息失败'))
        },
        fetchApplicationsList() {
            this.loading = true
            // 请求分页接口，取较大的 size 以便在详情页滑动查看多条记录
            const page = 0
            const size = 50
            const url = `/api/application/list?page=${page}&size=${size}`
            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取申请详情失败')
                        return
                    }

                    // 兼容后端返回的分页结构或直接数组
                    let list = []
                    const data = res.data
                    if (!data) list = []
                    else if (Array.isArray(data)) list = data
                    else if (Array.isArray(data.content)) list = data.content
                    else list = []

                    // 权限过滤：组织管理员只能看到 JOIN_ORG
                    if (!this.isAdmin && this.isOrgAdmin) {
                        list = list.filter(app => app.applicationType === 'JOIN_ORG')
                    }

                    this.apps = list || []

                    // 计算滑动宽度与内边距（基于系统窗口宽度与 rpx 换算）
                    try {
                        const sys = uni.getSystemInfoSync() || {}
                        const windowWidth = sys.windowWidth || 375
                        const pagePaddingRpx = 32
                        const pagePaddingPx = Math.round(pagePaddingRpx * windowWidth / 750)
                        this.width = windowWidth - pagePaddingPx * 2
                        this.slideWidth = this.width // 每个 slide 占满可视宽度
                        this.sidePadding = 0 // 去掉原始边距
                        // 计算内部卡片左右留白（rpx -> px），控制卡片内容与屏幕边缘的间距
                        // 将左右留白从 rpx 换算为 px，分别可独立调整
                        const leftRpx = this.cardLeftGapRpx || 0
                        const rightRpx = this.cardRightGapRpx || 0
                        this.cardInnerLeftGap = Math.round(leftRpx * windowWidth / 750)
                        this.cardInnerRightGap = Math.round(rightRpx * windowWidth / 750)
                        this.cardInnerWidth = Math.max(0, this.slideWidth - this.cardInnerLeftGap - this.cardInnerRightGap)
                    } catch (e) {
                        const fallbackWindow = 375
                        const pagePaddingPx = Math.round(32 * fallbackWindow / 750)
                        this.width = fallbackWindow - pagePaddingPx * 2
                        this.slideWidth = this.width
                        this.sidePadding = 0
                        const leftRpx = this.cardLeftGapRpx || 0
                        const rightRpx = this.cardRightGapRpx || 0
                        this.cardInnerLeftGap = Math.round(leftRpx * fallbackWindow / 750)
                        this.cardInnerRightGap = Math.round(rightRpx * fallbackWindow / 750)
                        this.cardInnerWidth = Math.max(0, this.slideWidth - this.cardInnerLeftGap - this.cardInnerRightGap)
                    }

                    const idx = this.apps.findIndex(app => String(app.applicationId || app.id) === String(this.applicationId))
                    if (idx === -1) {
                        showError('未找到该申请或无权查看')
                        setTimeout(() => uni.navigateBack(), 1000)
                        return
                    }
                    this.currentIndex = idx
                    this.application = this.apps[this.currentIndex]
                })
                .catch(() => showError('请求失败，请检查网络或登录状态'))
                .finally(() => { this.loading = false })
        },
        parsedDataFor(app) {
            if (!app?.extraData) return null
            try {
                const d = app.extraData
                return typeof d === 'string' ? JSON.parse(d) : d
            } catch (e) { return null }
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
        getStatusText(status) { const map = { 1: '待审核', 2: '已通过', 3: '已拒绝', 4: '已撤销' }; return map[status] || '未知' },
        getStatusClass(status) { const map = { 1: 'status-pending', 2: 'status-approved', 3: 'status-rejected', 4: 'status-revoked' }; return map[status] || '' },
        formatTime(time) {
            if (!time) return '-'
            try { const date = new Date(time); return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch (e) { return time }
        },
        formatSessionTime(start, end) {
            if (!start || !end) return '-'
            try {
                const s = new Date(start)
                const e = new Date(end)
                const datePart = `${s.getMonth() + 1}月${s.getDate()}日`
                const timePart = `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')} - ${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`
                return `${datePart} ${timePart}`
            } catch (e) { return '-' }
        },
        onTouchStart(e) {
            if (this.showRejectModal) return
            if (!this.apps.length) return
            this.startX = e.touches?.[0]?.clientX || 0
            this.offsetX = 0
            this.dragging = true
        },
        onTouchMove(e) {
            if (this.showRejectModal) return
            if (!this.dragging) return
            const x = e.touches?.[0]?.clientX || 0
            let dx = x - this.startX
            // 阻尼：到头时减小移动
            if ((this.currentIndex === 0 && dx > 0) || (this.currentIndex === this.apps.length - 1 && dx < 0)) {
                dx = dx * 0.35
            }
            this.offsetX = dx
        },
        onTouchEnd() {
            if (this.showRejectModal) return
            if (!this.dragging) return
            const dx = this.offsetX
            // 使用 slideWidth 或 width 作为阈值，按可见卡片宽度判断更合理
            const threshold = Math.min(120, (this.slideWidth || this.width || 375) * 0.18)
            if (dx > threshold && this.currentIndex > 0) {
                this.currentIndex--
            } else if (dx < -threshold && this.currentIndex < this.apps.length - 1) {
                this.currentIndex++
            }
            // reset
            this.offsetX = 0
            this.dragging = false
            this.application = this.apps[this.currentIndex]
        },
        reviewApplication(newStatus, app) {
            // 拒绝使用自定义弹窗收集理由
            if (newStatus === 3) {
                this.pendingAction = { newStatus, app }
                // 预填入已有拒绝理由（来自 extraData 或 app.reason）
                const parsed = this.parsedDataFor(app) || {}
                this.rejectReasonInput = parsed['拒绝理由'] || parsed.rejectReason || app.reason || ''
                this.showRejectModal = true
                return
            }

            // 通过直接询问确认（保留系统确认）
            const statusText = '通过'
            uni.showModal({
                title: `确认${statusText}`,
                content: `确定要${statusText}此申请吗？`,
                success: (res) => {
                    if (!res.confirm) return
                    const reason = '审核通过'
                    this.performReview(newStatus, app, reason)
                }
            })
        },

        performReview(newStatus, app, reason) {
            const aid = app.applicationId || app.id
            api.request({ url: '/api/application/batch-review', method: 'POST', data: [{ applicationId: aid, newStatus: newStatus, reason: reason }] })
                .then((response) => {
                    if (!response?.success) { showError(response?.message || '审核失败'); return }
                    const msg = response?.message || `已${newStatus === 2 ? '通过' : '拒绝'}`
                    // 通知结果并移除已处理项
                    uni.showModal({
                        title: '审核结果', content: msg, showCancel: false, success: () => {
                            const idx = this.apps.findIndex(x => String(x.applicationId || x.id) === String(aid))
                            if (idx !== -1) this.apps.splice(idx, 1)
                            if (this.apps.length === 0) { uni.navigateBack(); return }
                            if (this.currentIndex >= this.apps.length) this.currentIndex = this.apps.length - 1
                            this.application = this.apps[this.currentIndex]
                        }
                    })
                })
                .catch(() => showError('请求失败，请检查网络或登录状态'))
        }
        ,
        cancelReject() {
            this.showRejectModal = false
            this.rejectReasonInput = ''
            this.pendingAction = null
        },
        confirmReject() {
            if (!this.pendingAction) { this.showRejectModal = false; return }
            const { newStatus, app } = this.pendingAction
            this.showRejectModal = false
            this.performReview(newStatus, app, this.rejectReasonInput || '')
            this.pendingAction = null
            this.rejectReasonInput = ''
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
}

/* 装饰背景，增加厚实感 */
.page::before {
    content: '';
    position: absolute;
    top: 400rpx;
    right: -100rpx;
    width: 600rpx;
    height: 600rpx;
    background: radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%);
    z-index: 0;
}

.nav-header {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: calc(60rpx + env(safe-area-inset-top, 0px)) 40rpx 40rpx;
    color: #ffffff;
}

.nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-title {
    font-size: 38rpx;
    font-weight: 800;
}

.nav-page {
    font-size: 24rpx;
    background: rgba(255, 255, 255, 0.2);
    padding: 4rpx 20rpx;
    border-radius: 999rpx;
}

.full-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 24rpx;
}

.slider-container {
    flex: 1;
    overflow: hidden;
    padding: 32rpx 0;
}

.slider {
    display: flex;
    height: 100%;
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide {
    height: 100%;
    display: flex;
    align-items: center;
}

.card-stack {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.main-card {
    background: #ffffff;
    border-radius: 32rpx;
    padding: 40rpx;
    box-shadow: 0 10rpx 40rpx rgba(15, 23, 42, 0.08);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40rpx;
}

.type-badge {
    font-size: 32rpx;
    font-weight: 800;
    color: #1e293b;
}

.status-indicator {
    font-size: 24rpx;
    font-weight: 700;
    padding: 6rpx 20rpx;
    border-radius: 999rpx;
}

.info-group {
    background: #f8fafc;
    border-radius: 20rpx;
    padding: 24rpx;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 0;
}

.label {
    font-size: 24rpx;
    color: #64748b;
}

.value {
    font-size: 24rpx;
    color: #475569;
    font-weight: 600;
}

.highlight .label {
    font-weight: 700;
    color: #334155;
}

.name-text {
    font-size: 32rpx;
    font-weight: 800;
    color: #7c3aed;
}

.real-text {
    font-size: 24rpx;
    color: #94a3b8;
    margin-left: 8rpx;
}

.divider {
    height: 1rpx;
    background: #e2e8f0;
    margin: 12rpx 0;
}

.section-divider {
    display: flex;
    align-items: center;
    margin: 40rpx 0 24rpx;
    font-size: 22rpx;
    color: #cbd5e1;
}

.section-divider::before,
.section-divider::after {
    content: '';
    flex: 1;
    height: 1rpx;
    background: #e2e8f0;
    margin: 0 20rpx;
}

/* 演出申请详情 */
.perf-brief {
    display: flex;
    gap: 24rpx;
    background: #f5f3ff;
    padding: 20rpx;
    border-radius: 16rpx;
    margin-bottom: 24rpx;
}

.brief-poster {
    width: 120rpx;
    height: 160rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
}

.brief-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.brief-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #5b21b6;
    margin-bottom: 8rpx;
}

.brief-reason {
    font-size: 22rpx;
    color: #7c3aed;
    opacity: 0.8;
}

.perf-info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 6rpx 0;
}

.perf-label {
    font-size: 20rpx;
    color: #94a3b8;
}

.perf-value {
    font-size: 22rpx;
    color: #1f2937;
    font-weight: 600;
    max-width: 60%;
    text-align: right;
}

.session-header {
    font-size: 20rpx;
    color: #94a3b8;
    margin-bottom: 12rpx;
}

.s-empty {
    font-size: 22rpx;
    color: #9ca3af;
}

.session-item {
    background: #f0fdf4;
    padding: 16rpx 24rpx;
    border-radius: 12rpx;
    margin-bottom: 12rpx;
    display: flex;
    flex-direction: column;
}

.s-venue {
    font-size: 24rpx;
    font-weight: 700;
    color: #166534;
    margin-bottom: 4rpx;
}

.s-time {
    font-size: 22rpx;
    color: #15803d;
}

/* 其他申请 */
.simple-info-list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.s-row {
    display: flex;
    justify-content: space-between;
}

.s-row.block {
    flex-direction: column;
    gap: 8rpx;
}

.s-label {
    font-size: 24rpx;
    color: #94a3b8;
}

.s-val {
    font-size: 26rpx;
    color: #1e293b;
    font-weight: 600;
}

.multiline {
    line-height: 1.6;
    color: #475569;
}

/* 补充背景卡 */
.sub-card {
    background: #f1f5f9;
    border-radius: 20rpx;
    padding: 24rpx;
    margin-bottom: 24rpx;
}

.sub-header {
    font-size: 22rpx;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 16rpx;
}

.sub-body {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
}

.sub-tag {
    font-size: 20rpx;
    background: #ffffff;
    color: #475569;
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
}

/* 反馈卡片 */
.feedback-card {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 24rpx;
    box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.04);
}

.fb-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
}

.fb-icon-bg {
    width: 48rpx;
    height: 48rpx;
    background: rgba(124, 58, 237, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12rpx;
}

.fb-icon {
    font-size: 24rpx;
}

.fb-title {
    font-size: 24rpx;
    font-weight: 700;
    color: #4b5563;
}

.fb-body {
    padding-left: 60rpx;
}

.fb-reason {
    font-size: 26rpx;
    color: #1f2937;
    line-height: 1.6;
    display: block;
}

.fb-footer {
    border-top: 1rpx solid #f3f4f6;
    margin-top: 16rpx;
    padding-top: 12rpx;
}

.fb-time {
    font-size: 20rpx;
    color: #9ca3af;
}

/* 自定义拒绝弹窗样式 */
.modal-overlay {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.modal {
    width: 640rpx;
    background: #ffffff;
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 12rpx 40rpx rgba(2, 6, 23, 0.12);
}

.modal-title {
    font-size: 30rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
}

.modal-textarea {
    width: 100%;
    min-height: 220rpx;
    border-radius: 12rpx;
    border: 1rpx solid #eef2ff;
    padding: 12rpx;
    font-size: 24rpx;
    color: #111827;
    margin-bottom: 16rpx;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;
}

.btn-cancel {
    background: #f3f4f6;
    color: #374151;
    padding: 12rpx 28rpx;
    border-radius: 12rpx;
}

.btn-confirm {
    background: linear-gradient(135deg, #7c3aed 0%, #be185d 100%);
    color: #ffffff;
    padding: 12rpx 28rpx;
    border-radius: 12rpx;
}

/* 按钮区 */
.footer-actions {
    display: flex;
    gap: 20rpx;
    margin-top: 20rpx;
}

.btn {
    flex: 1;
    height: 96rpx;
    border-radius: 24rpx;
    font-size: 30rpx;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.btn-reject {
    background: #fee2e2;
    color: #ef4444;
    border: 2rpx solid #fca5a5;
}

.btn-approve {
    background: #7c3aed;
    color: #ffffff;
    box-shadow: 0 10rpx 20rpx rgba(124, 58, 237, 0.3);
}

.status-pending {
    background: #fef3c7;
    color: #d97706;
}

.status-approved {
    background: #dcfce7;
    color: #16a34a;
}

.status-rejected {
    background: #fee2e2;
    color: #dc2626;
}

.status-revoked {
    background: #f1f5f9;
    color: #64748b;
}
</style>