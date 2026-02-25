<template>
    <view class="page" :style="pageStyle">
        <view class="header">
            <image class="logo" :src="assets.logo" mode="aspectFill"></image>
            <text class="title">微信登录</text>
            <text class="subtitle">使用微信一键登录，快速进入系统</text>
        </view>

        <view class="card">
            <view class="tip">我们将使用微信账号完成快捷登录</view>
            <button class="wx-btn" type="primary" :loading="loading" @tap="handleWxLogin">
                微信一键登录
            </button>
            <text class="error" v-if="errorMsg">{{ errorMsg }}</text>
        </view>

        <view class="footer">
            <text class="hint">登录即代表你同意《用户协议》和《隐私政策》</text>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import assets from '@/config/assets'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            assets,
            loading: false,
            errorMsg: '',
            bgUrl: assets.logo
        }
    },
    computed: {
        pageStyle() {
            return this.bgUrl
                ? { backgroundImage: `url(${this.bgUrl})` }
                : {}
        }
    },
    methods: {
        handleWxLogin() {
            if (this.loading) return
            this.errorMsg = ''
            this.loading = true

            this.getUserProfile()
                .then((userInfo) => this.loginWithWeChat(userInfo))
                .catch((err) => {
                    this.errorMsg = err?.message || '登录失败，请重试'
                    showError(this.errorMsg)
                })
                .finally(() => {
                    this.loading = false
                })
        },
        getUserProfile() {
            return new Promise((resolve, reject) => {
                uni.getUserProfile({
                    desc: '用于完善会员资料',
                    success: (res) => resolve(res.userInfo),
                    fail: () => reject(new Error('未授权获取微信资料'))
                })
            })
        },
        loginWithWeChat(userInfo) {
            return new Promise((resolve, reject) => {
                uni.login({
                    provider: 'weixin',
                    success: (loginRes) => {
                        if (!loginRes.code) {
                            reject(new Error('微信登录失败'))
                            return
                        }

                        api.request({
                            url: '/api/auth/login',
                            method: 'POST',
                            data: {
                                code: loginRes.code,
                                nickname: userInfo.nickName,
                                avatar: userInfo.avatarUrl
                            }
                        })
                            .then((body) => {
                                if (!body?.success) {
                                    reject(new Error(body?.message || '服务器拒绝登录'))
                                    return
                                }

                                const data = body.data || {}
                                if (data.token) {
                                    uni.setStorageSync('token', data.token)
                                }
                                if (data.userId) {
                                    uni.setStorageSync('userId', data.userId)
                                }
                                if (data.role) {
                                    uni.setStorageSync('role', data.role)
                                }
                                if (data.openid) {
                                    uni.setStorageSync('openid', data.openid)
                                }
                                // 缓存后端返回的是否为组织管理者标识
                                if (data.orgAdmin !== undefined && data.orgAdmin !== null) {
                                    uni.setStorageSync('orgAdmin', data.orgAdmin)
                                }

                                showSuccess('登录成功')
                                setTimeout(() => {
                                    uni.reLaunch({ url: '/pages/index/index' })
                                }, 500)
                                resolve(data)
                            })
                            .catch(() => reject(new Error('无法连接服务器')))
                    },
                    fail: () => reject(new Error('微信授权失败'))
                })
            })
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    background: #f7f8fa;
    padding: 80rpx 48rpx 40rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-size: cover;
    background-position: center;
    background-color: #f6f2ee;
}

.header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    margin-top: 40rpx;
}

.logo {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    object-fit: cover;
}

.title {
    font-size: 40rpx;
    font-weight: 600;
    color: #111827;
}

.subtitle {
    font-size: 26rpx;
    color: #374151;
    text-align: center;
}

.card {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 48rpx 36rpx;
    box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.06);
}

.tip {
    font-size: 26rpx;
    color: #111827;
    margin-bottom: 32rpx;
    text-align: center;
}

.wx-btn {
    background: #07c160;
    border-radius: 999rpx;
    font-size: 30rpx;
    height: 96rpx;
    line-height: 96rpx;
}

.error {
    display: block;
    margin-top: 20rpx;
    font-size: 24rpx;
    color: #ef4444;
    text-align: center;
}

.footer {
    text-align: center;
    color: #4b5563;
    font-size: 22rpx;
    margin-bottom: 12rpx;
}

.hint {
    line-height: 1.6;
}
</style>
