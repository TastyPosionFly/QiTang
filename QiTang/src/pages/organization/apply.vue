<template>
    <view class="page">
        <view class="header">
            <text class="title">{{ isEdit ? '修改组织信息' : '创建组织申请' }}</text>
            <text class="subtitle">{{ isEdit ? '调整组织资料后提交审核' : '填写基本信息后提交审核' }}</text>
        </view>

        <view class="card">
            <view class="form-item">
                <text class="label">组织名称</text>
                <input class="input org-name-input" placeholder="请输入组织名称" v-model="form.orgName" />
            </view>
            <view class="form-item">
                <text class="label">组织简介</text>
                <textarea class="textarea" placeholder="介绍组织定位、活动内容" v-model="form.orgDescription" />
            </view>
            <view class="form-item">
                <text class="label">组织头像（可选）</text>
                <view class="upload-section">
                    <image v-if="form.avatarPreview" class="avatar-preview" :src="form.avatarPreview" mode="aspectFill">
                    </image>
                    <button class="ghost-btn" @tap="chooseAvatar">{{ form.avatarPreview ? '重新选择' : '选择图片' }}</button>
                </view>
            </view>
            <button class="primary-btn" :loading="submitting" @tap="submit">{{ isEdit ? '提交修改' : '提交申请' }}</button>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            form: {
                orgName: '',
                orgDescription: '',
                avatarFile: '',
                avatarPreview: ''
            },
            submitting: false,
            orgId: '',
            isEdit: false
        }
    },
    onLoad(options) {
        if (options?.orgId) {
            this.orgId = options.orgId
            this.isEdit = true
            this.loadDetail()
        }
    },
    methods: {
        loadDetail() {
            api.request({ url: `/api/organization/${this.orgId}`, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '加载组织信息失败')
                        return
                    }
                    const data = res.data || {}
                    this.form.orgName = data.name || data.orgName || ''
                    this.form.orgDescription = data.description || data.orgDescription || ''
                    const avatar = data.avatarUrl || data.avatar
                    this.form.avatarPreview = avatar || ''
                    this.form.avatarFile = ''
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
        },
        chooseAvatar() {
            uni.chooseImage({
                count: 1,
                success: (res) => {
                    const path = res.tempFilePaths?.[0]
                    if (!path) return
                    this.form.avatarFile = path
                    this.form.avatarPreview = path
                }
            })
        },
        submit() {
            if (!this.form.orgName.trim()) {
                showError('请填写组织名称')
                return
            }
            if (!this.form.orgDescription.trim()) {
                showError('请填写组织简介')
                return
            }
            this.submitting = true

            // 编辑模式：使用 PUT /api/organization/{orgId}
            if (this.isEdit && this.orgId) {
                this.updateOrganization()
                return
            }

            // 创建模式：使用原有逻辑
            const token = uni.getStorageSync('token')
            const headers = token ? { Authorization: `Bearer ${token}` } : {}

            const basePayload = {
                orgName: this.form.orgName.trim(),
                orgDescription: this.form.orgDescription.trim()
            }

            if (this.form.avatarFile) {
                uni.uploadFile({
                    url: `${api.BASE_URL}/api/organization/apply`,
                    filePath: this.form.avatarFile,
                    name: 'avatarFile',
                    header: headers,
                    formData: basePayload,
                    success: (res) => {
                        let data = {}
                        try {
                            data = JSON.parse(res.data)
                        } catch (err) {
                            showError('服务器返回格式异常')
                            return
                        }
                        if (!data?.success) {
                            showError(data?.message || '申请失败')
                            return
                        }
                        showSuccess('申请已提交，等待审核')
                        setTimeout(() => {
                            uni.navigateBack({ delta: 1 })
                        }, 600)
                    },
                    fail: () => {
                        showError('上传失败，请检查网络')
                    },
                    complete: () => {
                        this.submitting = false
                    }
                })
                return
            }

            // 没有文件时走表单提交
            const formString = Object.keys(basePayload).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(basePayload[k] || '')).join('&')
            const finalHeaders = Object.assign({}, headers, { 'Content-Type': 'application/x-www-form-urlencoded' })
            api.request({
                url: '/api/organization/apply',
                method: 'POST',
                data: formString,
                header: finalHeaders
            })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '申请失败')
                        return
                    }
                    showSuccess('申请已提交，等待审核')
                    setTimeout(() => {
                        uni.navigateBack({ delta: 1 })
                    }, 600)
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.submitting = false
                })
        },
        updateOrganization() {
            const token = uni.getStorageSync('token')
            const headers = token ? { Authorization: `Bearer ${token}` } : {}

            const formData = {
                name: this.form.orgName.trim(),
                description: this.form.orgDescription.trim()
            }

            // 后端接口要求 multipart/form-data 格式
            if (this.form.avatarFile) {
                // 有新头像：上传文件
                uni.uploadFile({
                    url: `${api.BASE_URL}/api/organization/${this.orgId}`,
                    filePath: this.form.avatarFile,
                    name: 'avatar',
                    header: headers,
                    formData: formData,
                    success: (res) => {
                        this.handleUpdateSuccess(res)
                    },
                    fail: (err) => {
                        console.error('uploadFile 失败:', err)
                        showError('上传失败，请检查网络或联系管理员')
                        this.submitting = false
                    }
                })
            } else {
                // 没有新头像：仍需使用 multipart/form-data 格式
                // 创建一个临时占位文件（后端 avatar 参数是可选的）
                this.createTempFile().then((tempPath) => {
                    uni.uploadFile({
                        url: `${api.BASE_URL}/api/organization/${this.orgId}`,
                        filePath: tempPath,
                        name: 'dummy', // 使用不同的字段名，后端不会解析
                        header: headers,
                        formData: formData,
                        success: (res) => {
                            this.handleUpdateSuccess(res)
                        },
                        fail: (err) => {
                            console.error('uploadFile 失败:', err)
                            showError('上传失败，请检查网络或联系管理员')
                            this.submitting = false
                        }
                    })
                }).catch(() => {
                    showError('创建临时文件失败')
                    this.submitting = false
                })
            }
        },
        createTempFile() {
            return new Promise((resolve, reject) => {
                // 创建一个最小的文本文件作为占位
                const fs = uni.getFileSystemManager()
                const tempPath = `${wx.env.USER_DATA_PATH}/temp_${Date.now()}.txt`

                fs.writeFile({
                    filePath: tempPath,
                    data: 'temp',
                    encoding: 'utf8',
                    success: () => {
                        resolve(tempPath)
                    },
                    fail: (err) => {
                        console.error('写入临时文件失败:', err)
                        reject(err)
                    }
                })
            })
        },
        handleUpdateSuccess(res) {
            let data = {}
            try {
                data = JSON.parse(res.data)
            } catch (err) {
                showError('服务器返回格式异常')
                this.submitting = false
                return
            }
            if (!data?.success) {
                showError(data?.message || '修改失败')
                this.submitting = false
                return
            }
            showSuccess('修改成功')
            this.submitting = false
            // 通知详情页刷新数据
            uni.$emit('organizationUpdated', { orgId: this.orgId })
            setTimeout(() => {
                uni.navigateBack({ delta: 1 })
            }, 600)
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
    padding: 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.form-item {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.label {
    font-size: 24rpx;
    color: #475569;
}

.input,
.textarea {
    width: 100%;
    border-radius: 12rpx;
    background: #f1f5f9;
    padding: 16rpx;
    font-size: 24rpx;
    box-sizing: border-box;
}

.org-name-input {
    padding: 0 16rpx;
    height: 76rpx;
    line-height: 76rpx;
}

.textarea {
    min-height: 160rpx;
    line-height: 1.5;
}

.upload-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
}

.avatar-preview {
    width: 200rpx;
    height: 200rpx;
    border-radius: 16rpx;
    background: #e2e8f0;
    border: 2rpx solid #cbd5e1;
}

.primary-btn,
.ghost-btn {
    border-radius: 999rpx;
    height: 76rpx;
    line-height: 76rpx;
    font-size: 26rpx;
}

.primary-btn {
    background: #2563eb;
    color: #fff;
}

.ghost-btn {
    background: #e2e8f0;
    color: #1e293b;
}
</style>
