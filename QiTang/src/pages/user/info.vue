<template>
    <view class="page">
        <view class="card">
            <text class="title">用户信息查询</text>

            <view class="form-item">
                <text class="label">用户 ID</text>
                <input class="input" v-model="userId" placeholder="请输入用户 ID" />
            </view>

            <button class="primary-btn" :loading="loading" @tap="fetchInfo">查询</button>
            <text class="error" v-if="errorMsg">{{ errorMsg }}</text>
        </view>

        <view class="card" v-if="result">
            <text class="title">返回结果</text>
            <text class="json" selectable>{{ formattedResult }}</text>
        </view>
    </view>
</template>

<script>
    import api from '@/utils/api'
    import { showError } from '@/utils/notify'

    export default {
        data() {
            return {
                userId: '',
                result: null,
                loading: false,
                errorMsg: '',
                identityMap: {
                    1: '学生',
                    2: '学校职工',
                    3: '校外人员'
                }
            }
        },
        computed: {
            formattedResult() {
                if (!this.result) return ''
                const cloned = JSON.parse(JSON.stringify(this.result))
                if (cloned?.data?.userIdentity) {
                    cloned.data.userIdentity = this.identityMap[cloned.data.userIdentity] || '未知'
                }
                return JSON.stringify(cloned, null, 2)
            }
        },
        methods: {
            fetchInfo() {
                if (!this.userId) {
                    this.errorMsg = '请先输入用户 ID'
                    showError(this.errorMsg)
                    return
                }

                this.loading = true
                this.errorMsg = ''
                api.request({
                    url: `/api/users/member?id=${encodeURIComponent(this.userId)}`,
                    method: 'GET'
                })
                    .then((res) => {
                        this.result = res
                        if (!res?.success) {
                            this.errorMsg = res?.message || '查询失败'
                            showError(this.errorMsg)
                        }
                    })
                    .catch(() => {
                        this.errorMsg = '请求失败，请检查网络或登录状态'
                        showError(this.errorMsg)
                    })
                    .finally(() => {
                        this.loading = false
                    })
            }
        }
    }
</script>

<style>
    .page {
        min-height: 100vh;
        padding: 40rpx 32rpx 32rpx;
        box-sizing: border-box;
        background-size: cover;
        background-position: center;
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

    .subtitle {
        display: block;
        margin-top: 6rpx;
        font-size: 22rpx;
        color: #64748b;
    }

    .form-item {
        margin-top: 24rpx;
    }

    .label {
        font-size: 24rpx;
        color: #334155;
        margin-bottom: 12rpx;
        display: block;
    }

    .input {
        border: 1rpx solid #e2e8f0;
        border-radius: 16rpx;
        padding: 18rpx 20rpx;
        background: #ffffff;
        font-size: 24rpx;
    }

    .primary-btn {
        margin-top: 24rpx;
        background: #2563eb;
        color: #fff;
        border-radius: 999rpx;
        height: 84rpx;
        line-height: 84rpx;
        font-size: 28rpx;
    }

    .error {
        display: block;
        margin-top: 16rpx;
        font-size: 22rpx;
        color: #ef4444;
        text-align: center;
    }

    .json {
        display: block;
        margin-top: 16rpx;
        white-space: pre-wrap;
        font-size: 22rpx;
        color: #0f172a;
    }
</style>
