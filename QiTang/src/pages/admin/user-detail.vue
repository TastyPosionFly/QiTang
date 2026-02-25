<template>
    <view class="page">
        <view class="card">
            <text class="title">用户详情</text>
            <view v-if="loading" class="state">加载中...</view>
            <view v-else>
                <view class="info-row">
                    <text class="label">昵称</text>
                    <text class="value">{{ user.nickname || '-' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">头像</text>
                    <image class="avatar" :src="resolveAvatar(user.avatar) || assets.logo" mode="aspectFill"></image>
                </view>
                <view class="info-row">
                    <text class="label">身份</text>
                    <text class="value">{{ identityMap[user.userIdentity] || '未知' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">学院</text>
                    <text class="value">{{ user.college || '-' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">专业</text>
                    <text class="value">{{ user.major || '-' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">学号</text>
                    <text class="value">{{ user.studentNo || '-' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">手机号</text>
                    <text class="value">{{ user.phone || '-' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">角色</text>
                    <text class="value">{{ user.role || '-' }}</text>
                </view>
                <view class="info-row">
                    <text class="label">状态</text>
                    <text class="value">{{ user.status === 1 ? '正常' : '封禁' }}</text>
                </view>
            </view>
        </view>

        <view class="card">
            <text class="title">管理操作</text>
            <view class="action-row">
                <button class="primary-btn" @tap="toggleBan">{{ user.status === 1 ? '封禁' : '解封' }}</button>
                <picker :range="roleOptions" @change="(e) => changeRole(roleOptions[e.detail.value])">
                    <view class="ghost-btn">更改角色</view>
                </picker>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import assets from '@/config/assets'
import { resolveAvatar } from '@/utils/avatar'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            assets,
            userId: null,
            user: {},
            loading: false,
            identityMap: {
                1: '学生',
                2: '学校职工',
                3: '校外人员'
            },
            roleOptions: ['USER', 'VENUE_ADMIN', 'ADMIN']
        }
    },
    onLoad(query) {
        this.userId = query?.userId ? Number(query.userId) : null
        this.fetchUser()
    },
    methods: {
        resolveAvatar,
        fetchUser() {
            if (!this.userId) return
            this.loading = true
            // 使用分页接口拉取第一页数据并在 content 中查找对应用户
            const url = `/api/admin/users/list?page=0&size=100`
            api.request({ url, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取用户失败')
                        return
                    }
                    const pageData = res.data || {}
                    const list = Array.isArray(pageData.content) ? pageData.content : []
                    this.user = list.find((item) => item.userId === this.userId) || {}
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        toggleBan() {
            if (!this.user?.openid) return
            const ban = this.user.status === 1
            api.request({
                url: `/api/admin/users/ban?openId=${encodeURIComponent(this.user.openid)}&ban=${ban}`,
                method: 'PUT'
            })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '操作失败')
                        return
                    }
                    showSuccess('操作成功')
                    this.fetchUser()
                })
                .catch(() => showError('请求失败，请检查网络或登录状态'))
        },
        changeRole(newRole) {
            if (!this.user?.openid) return
            api.request({
                url: `/api/admin/users/role?openId=${encodeURIComponent(this.user.openid)}&newRole=${newRole}`,
                method: 'PUT'
            })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '修改失败')
                        return
                    }
                    showSuccess('修改成功')
                    this.fetchUser()
                })
                .catch(() => showError('请求失败，请检查网络或登录状态'))
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
    gap: 24rpx;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 28rpx 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
}

.title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.info-row {
    margin-top: 16rpx;
    display: flex;
    justify-content: space-between;
    gap: 20rpx;
    align-items: center;
}

.label {
    font-size: 24rpx;
    color: #64748b;
    min-width: 96rpx;
}

.value {
    font-size: 24rpx;
    color: #0f172a;
    flex: 1;
    text-align: right;
}

.avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: #e2e8f0;
}

.state {
    font-size: 24rpx;
    color: #94a3b8;
    margin-top: 16rpx;
}

.action-row {
    margin-top: 20rpx;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16rpx;
}

.primary-btn {
    background: #2563eb;
    color: #fff;
    border-radius: 999rpx;
    height: 84rpx;
    line-height: 84rpx;
    font-size: 28rpx;
}

.ghost-btn {
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 999rpx;
    height: 84rpx;
    line-height: 84rpx;
    font-size: 28rpx;
    text-align: center;
}
</style>
