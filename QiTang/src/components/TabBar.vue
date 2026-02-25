<template>
    <view class="tabbar">
        <view v-for="(tab, index) in visibleTabs" :key="index" class="tab-item"
            :class="{ 'active': currentTab === tab.name }" @tap="handleTabClick(tab)">
            <view class="tab-icon-wrapper">
                <text class="tab-icon">{{ tab.icon }}</text>
                <view v-if="tab.badge" class="tab-badge">
                    <text class="badge-text">{{ tab.badge }}</text>
                </view>
            </view>
            <text class="tab-text">{{ tab.label }}</text>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
export default {
    name: 'TabBar',
    props: {
        current: {
            type: String,
            default: 'home'
        }
    },
    data() {
        return {
            currentTab: this.current,
            localRole: '',
            serverRole: null,
            serverRoleLoaded: false,
            allTabs: [
                { name: 'home', label: '首页', icon: '🏠', path: '/pages/index/index', showForRole: ['all'] },
                { name: 'performance', label: '演出', icon: '🎭', path: '/pages/performance/list', showForRole: ['all'] },
                { name: 'venue', label: '场地', icon: '🏛', path: '/pages/venue/list', showForRole: ['all'] },
                { name: 'profile', label: '我的', icon: '👤', path: '/pages/user/profile', showForRole: ['all'] },
                { name: 'admin', label: '管理', icon: '⚙️', path: '/pages/admin/index', showForRole: ['admin'] }
            ]
        }
    },
    created() {
        try { this.localRole = uni.getStorageSync('role') || '' } catch (e) { this.localRole = '' }
    },
    mounted() {
        this.fetchUser()
    },
    computed: {
        visibleTabs() {
            const isLoggedIn = !!uni.getStorageSync('token')
            const role = (this.serverRoleLoaded ? (this.serverRole || '') : (this.localRole || uni.getStorageSync('role') || ''))
            const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

            return this.allTabs.filter(tab => {
                if (tab.showForRole.includes('all')) return true
                if (tab.showForRole.includes('user')) return isLoggedIn
                if (tab.showForRole.includes('admin')) return isLoggedIn && isAdmin
                return false
            })
        }
    },
    watch: {
        current(newVal) { this.currentTab = newVal }
    },
    methods: {
        async fetchUser() {
            const token = uni.getStorageSync && uni.getStorageSync('token')
            if (!token) {
                this.serverRole = null
                this.serverRoleLoaded = true
                return
            }
            try {
                const res = await api.request({ url: '/api/users/me', method: 'GET' })
                if (res && res.success && res.data) {
                    const d = res.data
                    const userObj = d.role ? d : (d.data ? d.data : d)
                    this.serverRole = userObj.role || userObj.userRole || ''
                    this.serverRoleLoaded = true
                    try { uni.setStorageSync('role', this.serverRole) } catch (e) { }
                } else {
                    this.serverRole = null
                    this.serverRoleLoaded = true
                }
            } catch (e) {
                this.serverRole = null
                this.serverRoleLoaded = true
            }
        },
        handleTabClick(tab) {
            if (this.currentTab === tab.name) return

            const token = uni.getStorageSync('token')

            if (tab.name === 'profile' && !token) {
                uni.redirectTo({ url: '/pages/login/login' })
                return
            }

            if (tab.showForRole.includes('admin')) {
                if (!token) {
                    uni.showToast({ title: '请先登录', icon: 'none' })
                    setTimeout(() => { uni.redirectTo({ url: '/pages/login/login' }) }, 500)
                    return
                }
                if (!this.serverRoleLoaded) {
                    uni.showToast({ title: '正在校验权限，请稍候', icon: 'none' })
                    this.fetchUser()
                    return
                }
                const isAdminNow = (this.serverRole === 'ADMIN' || this.serverRole === 'SUPER_ADMIN')
                if (!isAdminNow) {
                    uni.showToast({ title: '权限不足', icon: 'none' })
                    return
                }
            }

            uni.reLaunch({ url: tab.path })
        }
    }
}
</script>

<style scoped>
.tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12rpx 24rpx 24rpx;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
    box-shadow: 0 -8rpx 32rpx rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(20rpx);
    display: flex;
    justify-content: space-around;
    gap: 8rpx;
    z-index: 1000;
}

.tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    flex: 1;
    padding: 12rpx 8rpx;
    border-radius: 16rpx;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.tab-item:active {
    transform: scale(0.95);
}

.tab-icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56rpx;
    height: 56rpx;
    border-radius: 16rpx;
    background: transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-item.active .tab-icon-wrapper {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    box-shadow: 0 4rpx 16rpx rgba(139, 92, 246, 0.4);
    transform: translateY(-4rpx);
}

.tab-icon {
    font-size: 32rpx;
    transition: all 0.3s ease;
}

.tab-item.active .tab-icon {
    filter: brightness(0) invert(1);
}

.tab-badge {
    position: absolute;
    top: -4rpx;
    right: -4rpx;
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border-radius: 999rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(239, 68, 68, 0.4);
}

.badge-text {
    font-size: 18rpx;
    color: #ffffff;
    font-weight: 700;
    line-height: 1;
}

.tab-text {
    font-size: 20rpx;
    font-weight: 600;
    color: #64748b;
    transition: all 0.3s ease;
    line-height: 1.2;
}

.tab-item.active .tab-text {
    color: #8b5cf6;
    font-weight: 700;
}
</style>