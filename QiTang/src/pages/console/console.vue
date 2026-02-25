<template>
    <view class="page">
        <view class="header">
            <text class="title">功能控制台</text>
            <text class="subtitle">快速进入各个接口页面</text>
        </view>

        <view class="card">
            <text class="card-title">账号信息</text>
            <view class="info-row">
                <text class="label">Token</text>
                <text class="value" selectable>{{ token || '未登录' }}</text>
            </view>
            <view class="info-row">
                <text class="label">用户 ID</text>
                <text class="value">{{ userId || '-' }}</text>
            </view>
            <view class="info-row">
                <text class="label">角色</text>
                <text class="value">{{ role || '-' }}</text>
            </view>
        </view>

        <view class="grid">
            <view class="grid-item" @tap="go('/pages/login/login')">
                <text class="grid-title">微信登录</text>
                <text class="grid-desc">获取 token 与用户信息</text>
            </view>
            <view class="grid-item" @tap="go('/pages/user/info')">
                <text class="grid-title">用户信息查询</text>
                <text class="grid-desc">GET /api/users/member?id=...</text>
            </view>
            <view class="grid-item" @tap="go('/pages/user/profile')">
                <text class="grid-title">资料更新</text>
                <text class="grid-desc">PUT /api/users/profile</text>
            </view>
            <view class="grid-item" @tap="go('/pages/admin/users')">
                <text class="grid-title">用户管理</text>
                <text class="grid-desc">管理员接口</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    computed: {
        token() {
            return uni.getStorageSync('token')
        },
        userId() {
            return uni.getStorageSync('userId')
        },
        role() {
            return uni.getStorageSync('role')
        }
    },
    methods: {
        go(url) {
            const reLaunchPages = ['/pages/index/index', '/pages/user/profile', '/pages/admin/index', '/pages/venue/list']
            if (reLaunchPages.includes(url)) {
                uni.reLaunch({ url })
            } else {
                uni.navigateTo({ url })
            }
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    padding: 48rpx 32rpx 40rpx;
    box-sizing: border-box;
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}

.header {
    background: rgba(255, 255, 255, 0.88);
    border-radius: 20rpx;
    padding: 28rpx 24rpx;
    box-shadow: 0 16rpx 32rpx rgba(15, 23, 42, 0.08);
}

.title {
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
}

.subtitle {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #64748b;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
}

.card-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1e293b;
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-top: 16rpx;
    gap: 20rpx;
}

.label {
    font-size: 24rpx;
    color: #64748b;
    min-width: 90rpx;
}

.value {
    font-size: 24rpx;
    color: #0f172a;
    flex: 1;
    text-align: right;
    word-break: break-all;
}

.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20rpx;
}

.grid-item {
    background: rgba(255, 255, 255, 0.94);
    border-radius: 20rpx;
    padding: 24rpx;
    min-height: 160rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.06);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12rpx;
}

.grid-title {
    font-size: 26rpx;
    font-weight: 600;
    color: #1e293b;
}

.grid-desc {
    font-size: 22rpx;
    color: #64748b;
}
</style>
