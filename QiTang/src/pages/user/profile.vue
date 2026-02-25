<template>
    <view class="page">
        <view class="card user-card" @tap.stop="openProfileDetail">
            <view class="user-card-bg"
                :style="{ backgroundImage: 'url(' + assets.homeCardBg + ')', backgroundPosition: 'center 15%' }">
            </view>
            <view class="user-card-overlay"></view>
            <view class="card-content">
                <view v-if="isLoggedIn" class="user-summary">
                    <view class="avatar-wrapper">
                        <image class="avatar" :src="resolveAvatar(userInfo.avatar) || assets.logo" mode="aspectFill">
                        </image>
                        <view class="avatar-status"></view>
                    </view>
                    <view class="user-info">
                        <text class="user-name">{{ userInfo.nickname || '未命名' }}</text>
                        <text class="user-greeting">个人中心 👤</text>
                    </view>
                </view>
                <view v-else class="intro">
                    <view class="intro-header">
                        <text class="intro-icon">👤</text>
                        <text class="intro-title">登录后可查看个人信息</text>
                    </view>
                    <text class="intro-desc">登录后才可以编辑与管理资料</text>
                </view>
            </view>
            <view v-if="isLoggedIn" class="edit-indicator" @tap.stop="openProfileDetail">
                <text class="edit-icon">✏️</text>
            </view>
            <button v-if="!isLoggedIn" class="login-btn" @tap="goLogin">
                <text class="login-btn-text">立即登录</text>
                <text class="login-btn-arrow">→</text>
            </button>
        </view>

        <!-- 个人信息模块已移除；用户可通过顶部名片进入个人详情页并在详情页中进入编辑 -->
        <view class="content">
            <view class="card">
                <text class="title">我的组织</text>
                <view v-if="!isLoggedIn" class="state">请先登录后查看组织信息</view>
                <view v-else>
                    <view v-if="orgsLoading" class="state">加载中...</view>
                    <view v-else-if="organizations && organizations.length">
                        <view class="org-item" v-for="(item, idx) in organizations" :key="idx"
                            @tap="goOrganizationDetail(item.org)">
                            <image class="avatar" :src="resolveAvatar(item.org.avatar || item.org.avatarUrl)"
                                mode="aspectFill"></image>
                            <view class="org-main">
                                <text class="org-name">{{ item.org.name || item.org.orgName || '未命名组织' }}</text>
                                <text class="org-meta">成员角色：{{ roleLabel(item.memberRole) }}</text>
                            </view>
                        </view>
                    </view>
                    <view v-else class="state">您还未加入任何组织，快去申请吧</view>
                    <button class="ghost-btn small" @tap="goOrganizationList">{{ organizationButtonLabel }}</button>
                </view>
            </view>

            <view class="card" v-if="isLoggedIn">
                <view class="card-header-row">
                    <text class="title">我的票夹</text>
                    <text class="more-link" @tap="goMyTickets"> 查看全部 </text>
                </view>
                <view v-if="ticketsLoading" class="state">加载中...</view>
                <view v-else-if="tickets && tickets.length">
                    <view class="ticket-item" v-for="(t, idx) in tickets.slice(0, 2)" :key="idx"
                        @tap="goTicketDetail(t)">
                        <view class="ticket-main">
                            <text class="ticket-title">{{ t.performanceName || t.performanceTitle || '未知演出' }}</text>
                            <view class="ticket-meta-row">
                                <text class="meta-label">开始时间</text>
                                <text class="ticket-time">{{ formatStartTime(t.startTime) }}</text>
                            </view>
                            <text class="ticket-venue">{{ t.venueName || '未知场地' }}</text>
                        </view>
                        <view class="ticket-status" :class="getTicketStatusClass(t.status)">
                            <text>{{ t.statusDesc || getTicketStatusText(t.status) }}</text>
                        </view>
                    </view>
                </view>
                <view v-else class="state">暂无购票记录</view>
            </view>

            <view class="card" v-if="isLoggedIn">
                <view class="card-header-row">
                    <text class="title">我的申请夹</text>
                    <text class="more-link" @tap="goMyApplications"> 更多 </text>
                </view>
                <view v-if="appsLoading" class="state">加载中...</view>
                <view v-else-if="applications && applications.length">
                    <view class="app-item" v-for="(app, idx) in applications" :key="idx"
                        @tap="maybeOpenApplication(app)">
                        <view class="app-main">
                            <text class="app-title">{{ getApplicationTitle(app) }}</text>
                            <text class="app-target" v-if="getApplicationTarget(app)">{{ getApplicationTarget(app)
                                }}</text>
                            <text class="app-time">{{ formatTime(app.applyTime) }}</text>
                        </view>
                        <view class="app-status" :class="getStatusClass(app.status)">
                            <text>{{ app.statusDesc || getStatusText(app.status) }}</text>
                        </view>
                    </view>
                </view>
                <view v-else class="state">暂无申请记录</view>
            </view>

            <view style="flex:1"></view>
            <view class="logout-link" v-if="isLoggedIn" @tap="logout">退出登录</view>
        </view>

        <TabBar current="profile" />
    </view>
</template>

<script>
import api from '@/utils/api'
import assets from '@/config/assets'
import { resolveAvatar } from '@/utils/avatar'
import { showError, showSuccess } from '@/utils/notify'
import TabBar from '@/components/TabBar.vue'

export default {
    components: {
        TabBar
    },
    data() {
        return {
            userInfo: {},
            errorMsg: '',
            assets,
            identityOptions: [
                { label: '学生', value: 1 },
                { label: '学校职工', value: 2 },
                { label: '校外人员', value: 3 }
            ],
            organizations: [],
            orgsLoading: false,
            applications: [],
            appsLoading: false,
            tickets: [],
            ticketsLoading: false
        }
    },
    computed: {
        identityLabel() {
            const current = this.identityOptions.find((item) => item.value === Number(this.userInfo.userIdentity))
            return current ? current.label : '-'
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
            const storedRole = uni.getStorageSync('role')
            const role = storedRole || this.userInfo.role
            return role === 'ADMIN' || role === 'SUPER_ADMIN'
        },
        isOrgAdmin() {
            const fromStore = uni.getStorageSync('orgAdmin')
            // uni.getStorageSync 返回字符串，需要正确解析
            if (fromStore !== undefined && fromStore !== null && fromStore !== '') {
                return fromStore === true || fromStore === 'true'
            }
            return !!(this.userInfo && this.userInfo.orgAdmin)
        },
        organizationButtonLabel() {
            if (!this.isLoggedIn) return '加入组织'
            if (this.organizations && this.organizations.length) return '浏览组织'
            return '加入组织'
        }
    },
    onShow() {
        this.loadProfile()
    },
    methods: {
        resolveAvatar,

        loadProfile() {
            api.request({ url: '/api/users/me', method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        this.userInfo = {}
                        this.organizations = []
                        this.orgsLoading = false
                        this.tickets = []
                        return
                    }
                    this.userInfo = res.data || {}
                    // 同步更新 orgAdmin 缓存
                    if (res.data && res.data.orgAdmin !== undefined) {
                        uni.setStorageSync('orgAdmin', res.data.orgAdmin)
                    }
                    if (this.isLoggedIn) {
                        this.loadOrganizations()
                        this.loadApplications()
                        this.loadTickets()
                    } else {
                        this.organizations = []
                        this.orgsLoading = false
                        this.tickets = []
                    }
                })
                .catch(() => {
                    this.userInfo = {}
                    this.organizations = []
                    this.orgsLoading = false
                    this.tickets = []
                    showError('获取个人信息失败')
                })
        },

        loadTickets() {
            if (!this.isLoggedIn) return
            this.ticketsLoading = true
            // 仅获取“待使用”(status=0)的票，并限制最多 2 条用于预览
            api.request({
                url: '/api/ticket/my',
                method: 'GET',
                data: { page: 0, size: 2, status: 0 }
            })
                .then((res) => {
                    if (res?.success) {
                        this.tickets = res.data?.content || []
                    }
                })
                .catch(() => {
                    this.tickets = []
                })
                .finally(() => {
                    this.ticketsLoading = false
                })
        },

        loadOrganizations() {
            if (!this.isLoggedIn) {
                this.orgsLoading = false
                this.organizations = []
                return
            }
            this.orgsLoading = true
            api.request({ url: '/api/organization/my-organizations', method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        this.organizations = []
                        return
                    }
                    // 后端可能返回一个数组，数组元素可能为 { organization, memberRole } 或直接为 organization
                    const data = res.data || []
                    this.organizations = data.map(item => {
                        if (item && item.organization) {
                            return {
                                org: item.organization,
                                memberRole: (item.memberRole || item.status || '').toUpperCase()
                            }
                        }
                        // 如果直接是组织对象
                        return { org: item, memberRole: '' }
                    })
                })
                .catch(() => {
                    this.organizations = []
                })
                .finally(() => {
                    this.orgsLoading = false
                })
        },
        goLogin() {
            // 使用 redirectTo 替换当前页面，避免栈增长
            uni.redirectTo({ url: '/pages/login/login' })
        },
        goEdit() {
            uni.navigateTo({ url: '/pages/user/edit' })
        },
        goHome() {
            uni.reLaunch({ url: '/pages/index/index' })
        },
        goVenue() {
            uni.reLaunch({ url: '/pages/venue/list' })
        },
        goAdmin() {
            uni.reLaunch({ url: '/pages/admin/index' })
        },
        goOrganizationList() {
            if (!this.isLoggedIn) {
                showError('请先登录后再申请加入组织')
                return
            }
            uni.navigateTo({ url: '/pages/organization/list' })
        },
        goOrganizationDetail(org) {
            if (!this.isLoggedIn) {
                showError('请先登录后查看组织详情')
                return
            }
            if (!org) {
                showError('缺少组织信息')
                return
            }
            const orgId = org.id || org.orgId || org.organizationId
            if (!orgId) {
                showError('缺少组织编号')
                return
            }
            uni.navigateTo({ url: `/pages/organization/detail?id=${orgId}` })
        },
        roleLabel(role) {
            if (!role) return '-'
            const map = {
                LEADER: '首领',
                MANAGER: '管理员',
                MEMBER: '成员',
                OWNER: '负责人'
            }
            const upper = String(role).toUpperCase()
            return map[upper] || role
        },
        logout() {
            uni.showModal({
                title: '退出登录',
                content: '确定要退出当前账号吗？',
                success: (res) => {
                    if (!res.confirm) return
                    uni.removeStorageSync('token')
                    uni.removeStorageSync('userId')
                    uni.removeStorageSync('role')
                    uni.removeStorageSync('openid')
                    this.userInfo = {}
                    showSuccess('已退出')
                    setTimeout(() => {
                        uni.reLaunch({ url: '/pages/index/index' })
                    }, 500)
                }
            })
        }
        ,
        openProfileDetail() {
            if (!this.isLoggedIn) {
                this.goLogin()
                return
            }
            // 直接导航到编辑页
            uni.navigateTo({ url: '/pages/user/edit' })
        },
        loadApplications() {
            if (!this.isLoggedIn) {
                this.applications = []
                this.appsLoading = false
                return
            }
            this.appsLoading = true
            api.request({ url: '/api/application/my-applications', method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        this.applications = []
                        return
                    }
                    const data = res.data || []
                    this.applications = data.slice(0, 3)
                })
                .catch(() => {
                    this.applications = []
                })
                .finally(() => {
                    this.appsLoading = false
                })
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
            const date = new Date(time)
            const now = new Date()
            const diff = now - date
            const minutes = Math.floor(diff / 60000)
            const hours = Math.floor(diff / 3600000)
            const days = Math.floor(diff / 86400000)
            if (minutes < 60) return `${minutes}分钟前`
            if (hours < 24) return `${hours}小时前`
            if (days < 7) return `${days}天前`
            return date.toLocaleDateString('zh-CN')
        },
        formatStartTime(time) {
            if (!time) return '-'
            const d = new Date(time)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const hour = String(d.getHours()).padStart(2, '0')
            const min = String(d.getMinutes()).padStart(2, '0')
            return `${year}-${month}-${day} ${hour}:${min}`
        },
        goMyApplications() {
            uni.navigateTo({ url: '/pages/application/my-applications' })
        },

        getTicketStatusText(status) {
            const map = { 0: '待使用', 1: '已入场', 2: '已过期', 3: '已退票' }
            return map[status] || '未知'
        },
        getTicketStatusClass(status) {
            const map = { 0: 'status-valid', 1: 'status-used', 2: 'status-expired', 3: 'status-cancelled' }
            return map[status] || ''
        },
        goMyTickets() {
            uni.navigateTo({ url: '/pages/ticket/my-tickets' })
        },
        goTicketDetail(t) {
            // 点击我的票夹预览项，直接进入电子票二维码页
            const code = encodeURIComponent(t.ticketCode || t.code || t.id || '')
            const poster = t.performancePosterUrl || t.ticketBgUrl || ''
            const bg = poster ? encodeURIComponent(poster) : ''
            const title = (t.performanceTitle || t.performanceName) ? encodeURIComponent(t.performanceTitle || t.performanceName) : ''
            const pid = t.performanceId ? encodeURIComponent(t.performanceId) : ''

            let url = `/pages/ticket/qrcode?code=${code}`
            if (bg) url += `&bg=${bg}`
            if (title) url += `&title=${title}`
            if (pid) url += `&performanceId=${pid}`

            uni.navigateTo({ url })
        },
        goApplicationDetail(app) {
            if (!app?.id) return
            uni.navigateTo({ url: `/pages/application/detail?id=${app.id}` })
        },
        maybeOpenApplication(app) {
            // 所有用户都可以进入申请详情页面
            this.goApplicationDetail(app)
        }
        ,
        getApplicationTarget(app) {
            // 优先使用 targetId 在已加载组织中查找
            try {
                const targetId = app?.targetId || app?.target || app?.organizationId
                if (targetId) {
                    const idStr = String(targetId)
                    const found = (this.organizations || []).find(item => {
                        const org = item.org || item.organization || item
                        const raw = org?.organizationId || org?.orgId || org?.id || org?.orgID || org?.ID
                        return raw && String(raw) === idStr
                    })
                    if (found) {
                        const org = found.org || found.organization || found
                        return org?.name || org?.orgName || ''
                    }
                }
            } catch (e) { }
            // 对演出申请，优先显示演出标题
            try {
                const extra = app?.extraData
                if (!extra) return ''
                const obj = typeof extra === 'string' ? JSON.parse(extra) : extra
                if (app.applicationType === 'PERFORMANCE_APPLY') {
                    return obj.performanceTitle || obj.title || obj.performanceName || ''
                }
                return obj.orgName || obj.organizationName || obj.name || ''
            } catch (e) {
                return ''
            }
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    width: 100%;
    padding: 40rpx 32rpx 140rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
    background-size: cover;
    background-position: center;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 28rpx 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
}

.content {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    flex: 1;
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
    /* 铺满卡片并居中显示 */
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(15rpx) brightness(0.95);
    z-index: 0;
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
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.user-summary {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.avatar-wrapper {
    position: relative;
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

.title {
    font-size: 30rpx;
    font-weight: 800;
    color: #1e293b;
    position: relative;
    padding-left: 20rpx;
}

.title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(to bottom, #8b5cf6, #d946ef);
    border-radius: 4rpx;
}

.info-list {
    margin-top: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10rpx 0;
}

.label {
    font-size: 26rpx;
    color: #94a3b8;
    min-width: 100rpx;
}

.value {
    font-size: 26rpx;
    color: #334155;
    flex: 1;
    text-align: right;
    font-weight: 600;
}

.avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: #f1f5f9;
    border: 4rpx solid #ffffff;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.05);
}

.org-item {
    margin-top: 20rpx;
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 24rpx;
    border-radius: 24rpx;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    transition: all 0.2s;
}

.org-item:active {
    transform: scale(0.98);
    background: #f1f5f9;
}

.org-main {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    flex: 1;
}

.org-name {
    font-size: 28rpx;
    font-weight: 700;
    color: #1e293b;
}

.org-meta {
    font-size: 22rpx;
    color: #64748b;
    font-weight: 500;
}

.primary-btn {
    margin-top: 30rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #fff;
    border-radius: 999rpx;
    height: 90rpx;
    line-height: 90rpx;
    font-size: 30rpx;
    font-weight: 700;
    box-shadow: 0 10rpx 20rpx rgba(124, 58, 237, 0.2);
}

.ghost-btn.small {
    margin-top: 30rpx;
    background: #ffffff;
    color: #6366f1;
    border: 1px solid #e0e7ff;
    border-radius: 999rpx;
    height: 72rpx;
    line-height: 72rpx;
    font-size: 24rpx;
    font-weight: 600;
}

.action-row {
    margin-top: 24rpx;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20rpx;
}

.error {
    display: block;
    margin-top: 20rpx;
    font-size: 24rpx;
    color: #ef4444;
    text-align: center;
}

.state {
    font-size: 26rpx;
    color: #94a3b8;
    margin-top: 30rpx;
    text-align: center;
    padding: 20rpx 0;
}

.logout-link {
    margin: 40rpx 0;
    text-align: center;
    color: #94a3b8;
    font-size: 24rpx;
    font-weight: 500;
}

.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10rpx;
}

.more-link {
    font-size: 24rpx;
    color: #8b5cf6;
    font-weight: 600;
    background: #f5f3ff;
    padding: 6rpx 20rpx;
    border-radius: 999rpx;
}

.app-item {
    margin-top: 20rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 24rpx;
    border-radius: 24rpx;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
}

.app-main {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    flex: 1;
}

.app-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #1e293b;
}

.app-time {
    font-size: 22rpx;
    color: #94a3b8;
}

.app-target {
    font-size: 22rpx;
    color: #64748b;
    margin-top: 4rpx;
    font-weight: 500;
}

.app-status {
    padding: 8rpx 22rpx;
    border-radius: 100rpx;
    font-size: 22rpx;
    font-weight: 700;
}

.status-pending {
    background: #fffbeb;
    color: #d97706;
}

.status-approved {
    background: #f0fdf4;
    color: #16a34a;
}

.status-rejected {
    background: #fef2f2;
    color: #dc2626;
}

.status-revoked {
    background: #f8fafc;
    color: #94a3b8;
}

.ticket-item {
    margin-top: 20rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 30rpx;
    border-radius: 28rpx;
    background: #f8fafc;
    border: 1px solid rgba(139, 92, 246, 0.05);
    position: relative;
    overflow: hidden;
}

.ticket-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 15%;
    bottom: 15%;
    width: 6rpx;
    background: #8b5cf6;
    border-radius: 0 4rpx 4rpx 0;
}

.ticket-main {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
    flex: 1;
}

.ticket-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.4;
}

.ticket-meta-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.meta-label {
    font-size: 22rpx;
    color: #94a3b8;
    background: #ffffff;
    padding: 2rpx 12rpx;
    border-radius: 4rpx;
    border: 1px solid #f1f5f9;
}

.ticket-time {
    font-size: 24rpx;
    color: #64748b;
    font-weight: 600;
}

.ticket-venue {
    font-size: 22rpx;
    color: #94a3b8;
    margin-top: 4rpx;
}

.ticket-status {
    padding: 10rpx 24rpx;
    border-radius: 100rpx;
    font-size: 22rpx;
    font-weight: 700;
}

.status-valid {
    background: #ede9fe;
    color: #7c3aed;
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
</style>
