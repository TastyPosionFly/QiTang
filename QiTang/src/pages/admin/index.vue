<template>
    <view class="page">
        <view class="header">
            <text class="title">管理中心</text>
            <text class="subtitle">请选择要管理的功能</text>
        </view>

        <view class="card">
            <view class="menu-item" v-if="isPlatformAdmin" @tap="goHotManage">
                <text class="menu-title">热门管理</text>
                <text class="menu-desc">管理首页轮播与列表置顶推荐</text>
            </view>
            <view class="menu-item" v-if="isPlatformAdmin" @tap="goUsers">
                <text class="menu-title">用户管理</text>
                <text class="menu-desc">查看用户、封禁与角色调整</text>
            </view>
            <view class="menu-item" v-if="isPlatformAdmin" @tap="goOrganizations">
                <text class="menu-title">组织管理</text>
                <text class="menu-desc">查看组织、进入详情与处理审核</text>
            </view>
            <view class="menu-item" v-if="isSuperAdmin" @tap="goVenueManagement">
                <text class="menu-title">创建新的场地</text>
                <text class="menu-desc">仅超级管理员可见，用于创建新的场地</text>
            </view>
            <view class="menu-item" @tap="goApplicationReview">
                <text class="menu-title">申请审核</text>
                <text class="menu-desc">{{ reviewMenuDesc }}</text>
            </view>
        </view>

        <TabBar current="admin" />
    </view>
</template>

<script>
import api from '@/utils/api'
import TabBar from '@/components/TabBar.vue'

export default {
    components: {
        TabBar
    },
    data() {
        return {
            userRole: '',
            isOrgAdmin: false
        }
    },
    computed: {
        isPlatformAdmin() {
            const role = this.userRole || uni.getStorageSync('role') || ''
            return role === 'ADMIN' || role === 'SUPER_ADMIN'
        },
        isSuperAdmin() {
            const role = this.userRole || uni.getStorageSync('role') || ''
            return role === 'SUPER_ADMIN'
        },
        reviewMenuDesc() {
            if (this.isPlatformAdmin) {
                return '审核创建、加入、解散组织申请'
            }
            return '审核加入组织申请'
        }
    },
    onShow() {
        this.checkUserRole()
    },
    methods: {
        checkUserRole() {
            const cachedRole = uni.getStorageSync('role')
            const cachedOrgAdmin = uni.getStorageSync('orgAdmin')
            this.userRole = cachedRole || ''
            this.isOrgAdmin = !!cachedOrgAdmin

            // 从后端刷新用户信息
            api.request({ url: '/api/users/me', method: 'GET' })
                .then((res) => {
                    if (res?.success && res.data) {
                        this.userRole = res.data.role || ''
                        this.isOrgAdmin = !!res.data.orgAdmin
                        // 同步更新缓存
                        if (res.data.role) {
                            uni.setStorageSync('role', res.data.role)
                        }
                        if (res.data.orgAdmin !== undefined) {
                            uni.setStorageSync('orgAdmin', res.data.orgAdmin)
                        }
                    }
                })
                .catch(() => {
                    // 使用缓存值
                })
        },
        goUsers() {
            uni.navigateTo({ url: '/pages/admin/users' })
        },
        goOrganizations() {
            uni.navigateTo({ url: '/pages/admin/organizations' })
        },
        goApplicationReview() {
            uni.navigateTo({ url: '/pages/application/review' })
        },
        goVenueManagement() {
            uni.navigateTo({ url: '/pages/venue/create' })
        },
        goHotManage() { uni.navigateTo({ url: '/pages/admin/hot-manage' }) },
        goHome() {
            uni.reLaunch({ url: '/pages/index/index' })
        },
        goProfile() {
            uni.reLaunch({ url: '/pages/user/profile' })
        }
        ,
        goVenue() {
            uni.reLaunch({ url: '/pages/venue/list' })
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

.header {
    padding: 8rpx 8rpx 4rpx;
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
    padding: 28rpx 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
}

.menu-item {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    padding: 12rpx 8rpx;
}

.menu-title {
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
}

.menu-desc {
    font-size: 22rpx;
    color: #64748b;
}
</style>
