<template>
    <view class="page">
        <view class="header">
            <text class="title">相册</text>
        </view>
        <!-- 上传编辑弹窗 -->
        <view class="upload-modal" v-if="uploadDialogVisible">
            <view class="upload-card">
                <text class="upload-title">上传相册图片</text>
                <view class="upload-body">
                    <image v-if="uploadPreview" class="upload-preview" :src="uploadPreview" mode="aspectFill"></image>
                    <view v-else class="upload-placeholder" @tap="selectImage">
                        <text>点击选择图片</text>
                    </view>
                    <textarea class="upload-desc" placeholder="在此输入图片描述（可选）" v-model="uploadDescription"></textarea>
                </view>
                <view class="upload-actions">
                    <button class="ghost-btn" @tap="cancelUpload">取消</button>
                    <button class="primary-btn" :loading="uploading" @tap="confirmUpload">上传</button>
                </view>
            </view>
        </view>
        <view class="content">
            <view v-if="loading" class="state">加载中...</view>
            <view v-else-if="photos.length" class="photo-grid">
                <view class="photo-item" v-for="(photo, index) in photos" :key="photo.id || index"
                    @tap="viewPhoto(index)">
                    <image class="photo" :src="resolveAvatar(photo.photoUrl || photo.url)" mode="aspectFit"></image>
                    <button v-if="canModifyAlbum" class="delete-btn" @tap.stop="deletePhoto(photo)">X</button>
                </view>
            </view>
            <view v-else class="state">暂无照片</view>
        </view>
        <button v-if="canModifyAlbum" class="upload-bottom-btn" @tap="chooseAndUpload">上传图片</button>
    </view>
</template>

<script>
import api from '@/utils/api'
import { resolveAvatar } from '@/utils/avatar'
import { showError } from '@/utils/notify'

export default {
    data() {
        return {
            orgId: '',
            orgName: '',
            photos: [],
            loading: false,
            // upload dialog state
            uploadDialogVisible: false,
            uploadDescription: '',
            uploadFilePath: '',
            uploadPreview: '',
            uploading: false,
            // permission / user
            currentRole: uni.getStorageSync('role') || '',
            currentOpenId: uni.getStorageSync('openid') || '',
            currentUserId: uni.getStorageSync('userId') || '',
            isOrgLeader: false,
            isOrgManager: false,
            membersLoading: false
        }
    },
    onLoad(options) {
        this.orgId = options.orgId || ''
        this.orgName = options.orgName || '组织'
        if (!this.orgId) {
            showError('缺少组织编号')
            return
        }
        this.fetchPhotos()
        this.fetchMembers()
    },
    computed: {
        canModifyAlbum() {
            const role = (this.currentRole || '').toUpperCase()
            const isPlatformAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
            return isPlatformAdmin || this.isOrgLeader || this.isOrgManager
        }
    },
    methods: {
        resolveAvatar,
        // 兼容性解析上传返回的数据（处理可能的编码问题）
        parseUploadResponse(raw) {
            if (!raw) return {}
            const text = String(raw || '{}')

            // 方法1: 直接解析
            try {
                return JSON.parse(text)
            } catch (e1) {
                console.log('Direct parse failed:', text.slice(0, 100))
            }

            // 方法2: escape-unescape 技巧
            try {
                return JSON.parse(decodeURIComponent(escape(text)))
            } catch (e2) {
                console.log('Escape decode failed')
            }

            // 方法3: 强制UTF-8处理 (Array buffer 方式)
            try {
                const bytes = new Uint8Array(text.length)
                for (let i = 0; i < text.length; i++) {
                    bytes[i] = text.charCodeAt(i) & 0xFF
                }
                const decoder = new TextDecoder('utf-8')
                const decoded = decoder.decode(bytes)
                return JSON.parse(decoded)
            } catch (e3) {
                console.log('UTF-8 decode failed')
            }

            // 方法4: unescape 处理
            try {
                const unescaped = unescape(encodeURIComponent(text))
                return JSON.parse(unescaped)
            } catch (e4) {
                console.log('Unescape failed')
            }

            console.warn('All parse methods failed for:', text.slice(0, 200))
            return { success: false, message: '解析响应失败' }
        },
        fetchPhotos() {
            this.loading = true
            api.request({
                url: '/api/organization/album/list',
                method: 'POST',
                header: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                data: {
                    organizationId: this.orgId
                }
            })
                .then(res => {
                    if (res?.success) {
                        this.photos = Array.isArray(res.data) ? res.data : []
                    } else {
                        showError(res?.message || '获取照片失败')
                    }
                })
                .catch(() => {
                    showError('请求失败')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        fetchMembers() {
            this.membersLoading = true
            api.request({ url: `/api/organization/${this.orgId}/members`, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        this.isOrgLeader = false
                        this.isOrgManager = false
                        return
                    }
                    const members = Array.isArray(res.data) ? res.data : []
                    const openId = this.currentOpenId
                    const userId = this.currentUserId
                    const me = members.find((m) => {
                        const user = m.user || {}
                        const uOpen = user.openid || user.openId || m.openid || m.openId
                        const uId = user.userId || user.id || m.userId || m.id
                        if (openId && uOpen && openId === uOpen) return true
                        if (userId && uId && String(userId) === String(uId)) return true
                        return false
                    })
                    const role = (me?.memberRole || '').toUpperCase()
                    this.isOrgLeader = role === 'LEADER' || role === 'OWNER'
                    this.isOrgManager = role === 'MANAGER'
                })
                .catch(() => {
                    this.isOrgLeader = false
                    this.isOrgManager = false
                })
                .finally(() => {
                    this.membersLoading = false
                })
        },

        // 上传图片（选择图片 -> 在弹窗中预览并编辑描述 -> 上传）
        chooseAndUpload() {
            if (!this.canModifyAlbum) return
            // 选择图片并打开编辑弹窗
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed', 'original'],
                success: (res) => {
                    const tempFilePaths = res.tempFilePaths || []
                    if (!tempFilePaths.length) return
                    this.uploadFilePath = tempFilePaths[0]
                    this.uploadPreview = this.uploadFilePath
                    this.uploadDescription = ''
                    this.uploadDialogVisible = true
                }
            })
        },

        selectImage() {
            uni.chooseImage({
                count: 1, sizeType: ['compressed', 'original'], success: (res) => {
                    const temp = res.tempFilePaths || []
                    if (!temp.length) return
                    this.uploadFilePath = temp[0]
                    this.uploadPreview = this.uploadFilePath
                }
            })
        },

        cancelUpload() {
            this.uploadDialogVisible = false
            this.uploadFilePath = ''
            this.uploadPreview = ''
            this.uploadDescription = ''
        },

        confirmUpload() {
            if (!this.uploadFilePath) {
                showError('请先选择图片')
                return
            }
            const token = uni.getStorageSync('token')
            this.uploading = true
            uni.showLoading({ title: '上传中...' })
            uni.uploadFile({
                url: `${api.BASE_URL}/api/organization/album/upload`,
                filePath: this.uploadFilePath,
                name: 'photoFile',
                formData: {
                    organizationId: this.orgId,
                    description: this.uploadDescription || ''
                },
                header: token ? { Authorization: `Bearer ${token}` } : {},
                success: (uploadRes) => {
                    console.log('Raw upload response:', uploadRes.data)
                    const data = this.parseUploadResponse(uploadRes.data)
                    console.log('Parsed upload response:', data)
                    if (data?.success) {
                        uni.showToast({ title: data?.message || '上传成功', icon: 'success' })
                        this.fetchPhotos()
                        this.cancelUpload()
                    } else {
                        showError(data?.message || '上传失败')
                    }
                },
                fail: () => {
                    showError('上传失败')
                },
                complete: () => {
                    this.uploading = false
                    try { uni.hideLoading() } catch (e) { }
                }
            })
        },

        // 删除图片
        deletePhoto(photo) {
            if (!this.canModifyAlbum) return
            const id = photo?.id || photo.photoId || photo.photoId
            if (!id) {
                showError('缺少图片编号，无法删除')
                return
            }
            uni.showModal({
                title: '删除图片', content: '确定删除这张图片吗？', success: (res) => {
                    if (!res.confirm) return
                    api.request({
                        url: '/api/organization/album/delete',
                        method: 'POST',
                        header: {
                            'content-type': 'application/x-www-form-urlencoded'
                        },
                        data: {
                            photoId: id
                        }
                    }).then((resp) => {
                        if (!resp?.success) {
                            showError(resp?.message || '删除失败')
                            return
                        }
                        uni.showToast({ title: '已删除', icon: 'success' })
                        this.fetchPhotos()
                    })
                        .catch(() => {
                            showError('请求失败')
                        })
                }
            })
        },
        viewPhoto(index) {
            try {
                uni.setStorageSync(`album_photos_${this.orgId}`, JSON.stringify(this.photos || []))
            } catch (e) {
                // ignore storage errors
            }
            uni.navigateTo({
                url: `/pages/organization/photo-detail?orgId=${this.orgId}&photoIndex=${index}`
            })
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    padding: 40rpx 32rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
    display: flex;
    flex-direction: column;
}

.header {
    margin-bottom: 32rpx;
}

.title {
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
}

.subtitle {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #64748b;
}

.content {
    flex: 1;
}

.photo-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12rpx 0;
    /* vertical gap only, horizontal spacing via width */
}

.photo-item {
    width: 45%;
    padding-top: 45%;
    /* keep square aspect ratio */
    position: relative;
    border-radius: 12rpx;
    overflow: hidden;
    background: #f1f5f9;
    margin-bottom: 12rpx;
}

.photo {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    display: block;
}


.upload-bottom-btn {
    position: fixed;
    left: 32rpx;
    right: 32rpx;
    bottom: 40rpx;
    height: 84rpx;
    line-height: 84rpx;
    background: #2563eb;
    color: #fff;
    border-radius: 999rpx;
    font-size: 28rpx;
    text-align: center;
    z-index: 1000;
}

.delete-btn {
    position: absolute;
    right: 8rpx;
    top: 8rpx;
    background: rgba(220, 38, 38, 0.95);
    color: #fff;
    border-radius: 50%;
    width: 40rpx;
    height: 40rpx;
    line-height: 40rpx;
    text-align: center;
    font-size: 26rpx;
    z-index: 10;
    padding: 0;
}

/* upload modal */
.upload-modal {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
    padding: 24rpx;
    box-sizing: border-box;
}

.upload-card {
    width: 100%;
    max-width: 680rpx;
    background: #ffffff;
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 18rpx 36rpx rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.upload-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #0f172a;
}

.upload-body {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.upload-preview {
    width: 100%;
    height: 320rpx;
    border-radius: 12rpx;
    background: #f1f5f9;
    object-fit: cover;
}

.upload-placeholder {
    width: 100%;
    height: 320rpx;
    border-radius: 12rpx;
    background: #f1f5f9;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #64748b;
    font-size: 24rpx;
}

.upload-desc {
    height: 140rpx;
    border-radius: 12rpx;
    padding: 12rpx;
    border: 1rpx solid #e2e8f0;
    font-size: 24rpx;
    resize: none;
}

.upload-actions {
    display: flex;
    gap: 12rpx;
    justify-content: flex-end;
}

.state {
    padding: 60rpx;
    text-align: center;
    font-size: 26rpx;
    color: #94a3b8;
}
</style>