<template>
    <view class="page">
        <view class="card">
            <text class="title">资料修改</text>

            <view class="form-grid">
                <view class="form-item">
                    <text class="label">昵称</text>
                    <input class="input" v-model="form.nickname" placeholder="请输入昵称" />
                </view>
                <view class="form-item">
                    <text class="label">头像</text>
                    <view class="upload-box" @tap="chooseAvatar">
                        <image class="avatar-preview" :src="form.avatarPreview || assets.logo" mode="aspectFill">
                        </image>
                        <text class="upload-text">点击上传头像</text>
                    </view>
                </view>
                <view class="form-item">
                    <text class="label">身份类型</text>
                    <picker class="input" :range="identityOptions" range-key="label" @change="onIdentityChange">
                        <view class="picker-text">{{ identityLabel }}</view>
                    </picker>
                </view>
                <view class="form-item">
                    <text class="label">学号</text>
                    <input class="input" v-model="form.studentNo" placeholder="请输入学号" />
                </view>
                <view class="form-item">
                    <text class="label">学院</text>
                    <input class="input" v-model="form.college" placeholder="请输入学院" />
                </view>
                <view class="form-item">
                    <text class="label">专业</text>
                    <input class="input" v-model="form.major" placeholder="请输入专业" />
                </view>
                <view class="form-item">
                    <text class="label">手机号</text>
                    <input class="input" v-model="form.phone" placeholder="请输入手机号" />
                </view>
            </view>

            <button class="primary-btn" :loading="loading" @tap="submitProfile">保存修改</button>
            <button class="ghost-btn" @tap="goBack">取消</button>
            <text class="error" v-if="errorMsg">{{ errorMsg }}</text>
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
            hasLocalAvatar: false,
            form: {
                nickname: '',
                avatarFile: '',
                avatarPreview: '',
                avatarUrl: '',
                userIdentity: '',
                studentNo: '',
                major: '',
                college: '',
                phone: ''
            },
            loading: false,
            errorMsg: '',
            assets,
            identityOptions: [
                { label: '学生', value: 1 },
                { label: '学校职工', value: 2 },
                { label: '校外人员', value: 3 }
            ]
        }
    },
    computed: {
        identityLabel() {
            const current = this.identityOptions.find((item) => item.value === Number(this.form.userIdentity))
            return current ? current.label : '请选择身份类型'
        },
        cardStyle() {
            return {
                backgroundImage: `url(${this.assets.profileCardBg})`,
                backgroundPosition: 'center top'
            }
        }
    },
    onShow() {
        this.loadProfile()
    },
    methods: {
        resolveAvatar,
        // 强健解析上传返回数据（处理编码问题）
        parseUploadResponse(raw) {
            if (!raw) return {}
            const text = String(raw || '{}')

            // 方法1: 直接解析
            try {
                return JSON.parse(text)
            } catch (e1) { }

            // 方法2: escape-unescape 技巧
            try {
                return JSON.parse(decodeURIComponent(escape(text)))
            } catch (e2) { }

            // 方法3: 强制UTF-8处理
            try {
                const bytes = new Uint8Array(text.length)
                for (let i = 0; i < text.length; i++) {
                    bytes[i] = text.charCodeAt(i) & 0xFF
                }
                const decoder = new TextDecoder('utf-8')
                const decoded = decoder.decode(bytes)
                return JSON.parse(decoded)
            } catch (e3) { }

            // 方法4: unescape 处理
            try {
                const unescaped = unescape(encodeURIComponent(text))
                return JSON.parse(unescaped)
            } catch (e4) { }

            return { success: false, message: '解析响应失败' }
        },
        loadProfile() {
            api.request({
                url: '/api/users/me',
                method: 'GET'
            })
                .then((res) => {
                    if (!res?.success) return
                    const data = res.data || {}
                    this.form.nickname = data.nickname || ''
                    this.form.userIdentity = data.userIdentity || ''
                    this.form.studentNo = data.studentNo || ''
                    this.form.major = data.major || ''
                    this.form.college = data.college || ''
                    this.form.phone = data.phone || ''
                    this.form.avatarUrl = data.avatar || ''
                    if (!this.hasLocalAvatar) {
                        this.form.avatarPreview = resolveAvatar(data.avatar) || ''
                    }

                })
                .catch(() => {
                    showError('获取个人信息失败')
                })
        },
        onIdentityChange(e) {
            const index = Number(e.detail.value)
            const selected = this.identityOptions[index]
            this.form.userIdentity = selected ? selected.value : ''
        },
        chooseAvatar() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed', 'original'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    const filePath = res.tempFilePaths?.[0]
                    if (!filePath) {
                        showError('未能选择图片')
                        return
                    }

                    // ✅ 立即本地预览
                    this.form.avatarPreview = filePath
                    this.form.avatarFile = filePath
                    this.hasLocalAvatar = true
                },
                fail: () => {
                    showError('选择图片失败')
                }
            })
        },
        goBack() {
            uni.navigateBack()
        },
        submitProfile() {
            this.loading = true
            this.errorMsg = ''
            const formData = {
                nickname: this.form.nickname,
                userIdentity: this.form.userIdentity,
                studentNo: this.form.studentNo,
                major: this.form.major,
                college: this.form.college,
                phone: this.form.phone
            }

            if (this.form.avatarFile) {
                const token = uni.getStorageSync('token')
                uni.uploadFile({
                    url: `${api.BASE_URL}/api/users/profile`,
                    filePath: this.form.avatarFile,
                    name: 'avatarFile',
                    formData,
                    header: token ? { Authorization: `Bearer ${token}` } : {},
                    success: (uploadRes) => {
                        const res = this.parseUploadResponse(uploadRes?.data)
                        if (!res?.success) {
                            this.errorMsg = res?.message || '更新失败'
                            showError(this.errorMsg)
                        } else {
                            showSuccess('保存成功')
                            this.form.avatarFile = ''
                            this.goBack()
                        }
                    },
                    fail: () => {
                        this.errorMsg = '请求失败，请检查网络或登录状态'
                        showError(this.errorMsg)
                    },
                    complete: () => {
                        this.loading = false
                    }
                })
                return
            }

            api.request({
                url: '/api/users/profile',
                method: 'PUT',
                header: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: formData
            })
                .then((res) => {
                    if (!res?.success) {
                        this.errorMsg = res?.message || '更新失败'
                        showError(this.errorMsg)
                    } else {
                        showSuccess('保存成功')
                        this.goBack()
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
    padding: 40rpx 32rpx 40rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
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

.user-card {
    position: relative;
    min-height: 180rpx;
    background-size: cover;
    background-position: center;
    color: #0f172a;
    overflow: hidden;
}

.card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.user-summary {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.form-grid {
    margin-top: 20rpx;
    display: grid;
    grid-template-columns: 1fr;
    gap: 18rpx;
}

.form-item {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
}

.label {
    font-size: 24rpx;
    color: #334155;
}

.input {
    border: 1rpx solid #e2e8f0;
    border-radius: 16rpx;
    padding: 18rpx 20rpx;
    background: #ffffff;
    font-size: 24rpx;
}

.picker-text {
    font-size: 24rpx;
    color: #0f172a;
}

.upload-box {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 16rpx;
    border: 1rpx dashed #cbd5f5;
    border-radius: 16rpx;
    background: #ffffff;
    min-height: 140rpx;
}

.avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: #e2e8f0;
}

.avatar-preview {
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    object-fit: cover;
}

.upload-text {
    font-size: 24rpx;
    color: #64748b;
}

.name {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
}

.meta {
    font-size: 22rpx;
    color: #64748b;
}

.primary-btn {
    margin-top: 20rpx;
    background: #2563eb;
    color: #fff;
    border-radius: 999rpx;
    height: 84rpx;
    line-height: 84rpx;
    font-size: 28rpx;
}

.ghost-btn {
    margin-top: 12rpx;
    background: #e2e8f0;
    color: #1e293b;
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
</style>
