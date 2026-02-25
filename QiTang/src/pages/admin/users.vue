<template>
    <view class="page">
        <view class="top-fixed">
            <view class="header">
                <text class="title">用户管理</text>
                <text class="subtitle">管理员接口·管理所有用户</text>
            </view>

            <view class="card filter-card" v-if="isAdmin">
                <view class="search-row">
                    <input class="search-input" placeholder="输入昵称搜索" v-model="searchKeyword" @input="onSearchInput" />
                    <button class="primary-btn search-btn" @tap="performSearch">搜索</button>
                    <button class="ghost-btn" @tap="clearSearch">清除</button>
                </view>
                <!-- 操作已移除，使用下拉刷新替代 -->
            </view>
        </view>

        <view class="state" v-if="!isAdmin">无权限访问</view>
        <text class="error" v-if="errorMsg">{{ errorMsg }}</text>

        <view class="content-wrapper" v-if="isAdmin">
            <view class="card" v-if="loading">
                <text class="state">加载中...</text>
            </view>

            <view class="card" v-else-if="users.length">
                <view class="user-item" v-for="user in users" :key="user.userId">
                    <image v-if="user.avatar" class="avatar" :src="resolveAvatar(user.avatar)" mode="aspectFill"
                        @tap="openDetail(user)"></image>
                    <view v-else class="avatar empty-avatar" @tap="openDetail(user)"></view>
                    <view class="user-main">
                        <text class="user-name">{{ user.nickname || '未命名' }}</text>
                        <text class="user-meta" @tap="goDetail(user)">角色: {{ user.role }}</text>
                        <text class="user-meta">身份: {{ identityMap[user.userIdentity] || '未知' }}</text>
                        <text class="user-meta">状态: {{ user.status === 1 ? '正常' : '封禁' }}</text>
                    </view>
                    <view class="user-actions">
                        <button class="mini-btn" @tap="toggleBan(user)">{{ user.status === 1 ? '封禁' : '解封' }}</button>
                        <picker :range="roleOptions" @change="(e) => changeRole(user, roleOptions[e.detail.value])">
                            <view class="mini-btn outline">修改用户权限</view>
                        </picker>
                    </view>
                </view>

                <!-- 加载更多状态提示 -->
                <view v-if="!loading && users && users.length > 0" class="load-more-state">
                    <text v-if="loadingMore" class="load-more-text">正在加载...</text>
                    <text v-else-if="page >= totalPages" class="load-more-text load-more-end">
                        已加载全部 {{ totalElements }} 条数据
                    </text>
                </view>
            </view>

            <TabBar current="admin" />

            <view class="mask" v-if="showDetail" @tap="closeDetail">
                <view class="detail-card" @tap.stop>
                    <text class="detail-title">用户详情</text>
                    <view class="detail-row">
                        <text class="detail-label">昵称</text>
                        <text class="detail-value">{{ displayText(selectedUser.nickname, '未命名') }}</text>
                    </view>
                    <view class="detail-row">
                        <text class="detail-label">身份</text>
                        <text class="detail-value">{{ displayText(identityMap[selectedUser.userIdentity], '未知')
                            }}</text>
                    </view>
                    <view class="detail-row">
                        <text class="detail-label">学院</text>
                        <text class="detail-value">{{ displayText(selectedUser.college, '-') }}</text>
                    </view>
                    <view class="detail-row">
                        <text class="detail-label">专业</text>
                        <text class="detail-value">{{ displayText(selectedUser.major, '-') }}</text>
                    </view>
                    <view class="detail-row">
                        <text class="detail-label">角色</text>
                        <text class="detail-value">{{ displayText(selectedUser.role, '-') }}</text>
                    </view>
                    <view class="detail-row">
                        <text class="detail-label">状态</text>
                        <text class="detail-value">{{ selectedUser.status === 1 ? '正常' : (selectedUser.status === 0 ?
                            '待审核' : '封禁') }}</text>
                    </view>
                    <view style="display:flex; justify-content:center; margin-top:12rpx;">
                        <button class="primary-btn" @tap="closeDetail">关闭</button>
                    </view>
                </view>
            </view>
        </view>
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
            assets,
            users: [],
            loading: false,
            errorMsg: '',
            // pagination
            page: 0,
            size: 20,
            totalPages: 0,
            totalElements: 0,
            loadingMore: false,
            roleOptions: ['USER', 'VENUE_ADMIN', 'ADMIN'],
            identityMap: {
                1: '学生',
                2: '学校职工',
                3: '校外人员'
            },
            showDetail: false,
            selectedUser: {},
            // 搜索相关
            searchKeyword: '',
            searchTimer: null
            ,
            // search mode
            isSearching: false
        }
    },
    computed: {
        isLoggedIn() {
            return !!uni.getStorageSync('token')
        },
        isAdmin() {
            const role = uni.getStorageSync('role')
            return role === 'ADMIN' || role === 'SUPER_ADMIN'
        }
    },
    onShow() {
        if (this.isAdmin) {
            this.fetchUsers(true)
        }
    },
    onPullDownRefresh() {
        if (this.isAdmin) {
            this.fetchUsers(true)
            uni.stopPullDownRefresh()
        }
    },
    onReachBottom() {
        if (this.isAdmin) {
            this.loadMore()
        }
    },
    methods: {
        resolveAvatar,
        onSearchInput(e) {
            if (this.searchTimer) clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => this.performSearch(), 300)
        },
        clearSearch() {
            this.searchKeyword = ''
            this.isSearching = false
            this.fetchUsers(true)
        },
        performSearch() {
            const kw = (this.searchKeyword || '').trim()
            if (!kw) {
                this.isSearching = false
                this.fetchUsers(true)
                return
            }
            this.isSearching = true
            this.fetchUsers(true, kw)
        },
        // fetchUsers(reset=true, keyword) - 支持分页与可选关键字搜索
        fetchUsers(reset = true, keyword) {
            if (reset) {
                this.page = 0
                this.users = []
                this.totalPages = 0
                this.totalElements = 0
            } else {
                if (this.loadingMore) return
            }

            const isLoadMore = !reset
            if (isLoadMore) this.loadingMore = true
            else this.loading = true

            this.errorMsg = ''
            const kw = (typeof keyword !== 'undefined' && keyword !== null) ? keyword : (this.isSearching ? this.searchKeyword : '')
            let url = `/api/admin/users/list?page=${this.page}&size=${this.size}`
            if (kw && kw.trim()) url += `&keyword=${encodeURIComponent(kw.trim())}`

            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        this.errorMsg = res?.message || '获取用户失败'
                        showError(this.errorMsg)
                        return
                    }
                    const pageData = res.data || {}
                    const content = Array.isArray(pageData.content) ? pageData.content : []
                    if (reset) this.users = content
                    else this.users = [...this.users, ...content]

                    this.totalPages = pageData.totalPages || 0
                    this.totalElements = pageData.totalElements || 0

                    if (!isLoadMore) this.page = (pageData.number || 0) + 1
                    else this.page = (pageData.number || this.page) + 1
                })
                .catch(() => {
                    this.errorMsg = '请求失败，请检查网络或登录状态'
                    showError(this.errorMsg)
                })
                .finally(() => {
                    this.loading = false
                    this.loadingMore = false
                })
        },
        toggleBan(user) {
            const ban = user.status === 1
            api.request({
                url: `/api/admin/users/ban?openId=${encodeURIComponent(user.openid)}&ban=${ban}`,
                method: 'PUT'
            })
                .then((res) => {
                    if (!res?.success) {
                        this.errorMsg = res?.message || '操作失败'
                        showError(this.errorMsg)
                        return
                    }
                    showSuccess('操作成功')
                    this.fetchUsers(true)
                })
                .catch(() => {
                    this.errorMsg = '请求失败，请检查网络或登录状态'
                    showError(this.errorMsg)
                })
        },
        changeRole(user, newRole) {
            api.request({ url: `/api/admin/users/role?openId=${encodeURIComponent(user.openid)}&newRole=${newRole}`, method: 'PUT' })
                .then((res) => {
                    if (!res?.success) {
                        this.errorMsg = res?.message || '修改失败'
                        showError(this.errorMsg)
                        return
                    }
                    showSuccess('修改成功')
                    this.fetchUsers(true)
                })
                .catch(() => {
                    this.errorMsg = '请求失败，请检查网络或登录状态'
                    showError(this.errorMsg)
                })
        },
        openDetail(user) {
            this.selectedUser = user || {}
            this.showDetail = true
        },
        closeDetail() {
            this.showDetail = false
            this.selectedUser = {}
        },
        displayText(val, fallback) {
            if (val === undefined || val === null) return fallback
            if (typeof val === 'string') {
                if (val.trim() === '') return fallback
                return val
            }
            try { return String(val) } catch (e) { return fallback }
        },
        goHome() {
            uni.reLaunch({ url: '/pages/index/index' })
        },
        goProfile() {
            uni.reLaunch({ url: '/pages/user/profile' })
        },
        goAdminHome() {
            uni.reLaunch({ url: '/pages/admin/index' })
        },
        goVenue() {
            uni.reLaunch({ url: '/pages/venue/list' })
        },
        goDetail(user) {
            if (!user?.userId) return
            uni.navigateTo({ url: `/pages/admin/user-detail?userId=${user.userId}` })
        },
        loadMore() {
            if (this.page >= this.totalPages) return
            if (this.loadingMore) return
            this.fetchUsers(false)
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    padding: 40rpx 32rpx 140rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
    display: flex;
    flex-direction: column;
    gap: 32rpx;
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
}

.action-row {
    display: flex;
    gap: 12rpx;
    margin-top: 12rpx;
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

.state {
    font-size: 24rpx;
    color: #94a3b8;
    text-align: center;
    padding: 32rpx 0;
}

.load-more {
    margin-top: 24rpx;
    display: flex;
    justify-content: center;
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

.ghost-btn {
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 999rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 24rpx;
    padding: 0 24rpx;
}

.error {
    display: block;
    margin-top: 16rpx;
    font-size: 22rpx;
    color: #ef4444;
}

.user-item {
    margin-top: 20rpx;
    padding: 20rpx;
    border-radius: 16rpx;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    flex-wrap: wrap;
}

.avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: #e2e8f0;
}

.avatar.empty-avatar {
    background: transparent;
}

.user-main {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    flex: 1;
}

.user-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
}

.user-meta {
    font-size: 22rpx;
    color: #64748b;
}

.user-actions {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.mini-btn {
    background: #0ea5e9;
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    height: 60rpx;
    line-height: 60rpx;
    padding: 0 24rpx;
    text-align: center;
    width: 180rpx;
    display: flex;
    justify-content: center;
    align-items: center;
}

.mini-btn.outline {
    background: #ffffff;
    color: #0ea5e9;
    border: 1rpx solid #0ea5e9;
}

.state {
    font-size: 24rpx;
    color: #94a3b8;
    margin-top: 16rpx;
}

.mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32rpx;
    box-sizing: border-box;
}

.detail-card {
    width: 100%;
    max-width: 600rpx;
    background: #ffffff;
    border-radius: 24rpx;
    padding: 28rpx 24rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.detail-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    gap: 20rpx;
}

.detail-label {
    font-size: 24rpx;
    color: #64748b;
}

.detail-value {
    font-size: 24rpx;
    color: #0f172a;
    text-align: right;
    flex: 1;
}

.primary-btn {
    margin-top: 8rpx;
    background: #2563eb;
    color: #fff;
    border-radius: 999rpx;
    height: 72rpx;
    line-height: 72rpx;
    font-size: 26rpx;
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
