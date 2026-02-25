<template>
    <view class="page">
        <view class="header">
            <text class="title">创建场地</text>
            <text class="subtitle">填写场地基本信息</text>
        </view>

        <scroll-view class="form-container" scroll-y>
            <view class="form-card">
                <!-- 场地名称 -->
                <view class="form-item required">
                    <text class="form-label">场地名称</text>
                    <input class="form-input" v-model="formData.name" placeholder="请输入场地名称" />
                </view>

                <!-- 场地描述 -->
                <view class="form-item required">
                    <text class="form-label">场地描述</text>
                    <textarea class="form-textarea" v-model="formData.description" placeholder="请输入场地描述"
                        maxlength="500"></textarea>
                </view>

                <!-- 场地类型 -->
                <view class="form-item required">
                    <text class="form-label">场地类型</text>
                    <picker :range="typeOptions" range-key="label" @change="onTypeChange">
                        <view class="picker-view">
                            <text>{{ selectedType.label || '请选择类型' }}</text>
                            <text class="picker-arrow">▼</text>
                        </view>
                    </picker>
                </view>

                <!-- 场地地址 -->
                <view class="form-item required">
                    <text class="form-label">场地地址</text>
                    <input class="form-input" v-model="formData.address" placeholder="请输入场地地址" />
                </view>

                <!-- 场地容量 -->
                <view class="form-item required">
                    <text class="form-label">场地容量（人）</text>
                    <input class="form-input" v-model="formData.capacity" type="number" placeholder="请输入场地容量" />
                </view>

                <!-- 管理员搜索 -->
                <view class="form-item required">
                    <text class="form-label">管理员</text>
                    <view class="manager-search">
                        <input class="form-input" :value="managerQuery" placeholder="搜索管理员用户名"
                            @input="onManagerInput" />

                        <view v-if="selectedManager" class="manager-selected">
                            <image v-if="selectedManager.avatarUrl || selectedManager.avatar"
                                :src="selectedManager.avatarUrl || selectedManager.avatar" class="manager-avatar"
                                mode="aspectFill"></image>
                            <view class="manager-info">
                                <text class="manager-name">{{ selectedManager.nickname }}</text>
                                <text class="manager-id">ID: {{ selectedManager.id }}</text>
                            </view>
                            <view class="remove-selected" @tap="clearSelectedManager">✕</view>
                        </view>

                        <view v-if="showSuggestions" class="suggestions">
                            <view v-for="(u, idx) in managerSuggestions" :key="u.id" class="suggestion-item"
                                @tap="selectManager(u)">
                                <image v-if="u.avatarUrl || u.avatar" :src="u.avatarUrl || u.avatar"
                                    class="suggestion-avatar" mode="aspectFill"></image>
                                <view class="suggestion-body">
                                    <text class="suggestion-text">{{ u.nickname }}</text>
                                    <text class="suggestion-sub">ID: {{ u.id }}</text>
                                </view>
                            </view>
                            <view v-if="managerSuggestions.length === 0" class="no-suggestion">
                                <text>未找到匹配管理员</text>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- 封面图片 -->
                <view class="form-item required">
                    <text class="form-label">封面图片</text>
                    <view class="image-upload-section">
                        <view v-if="coverImage" class="image-preview">
                            <image :src="coverImage.url" mode="aspectFill" class="preview-image"></image>
                            <view class="image-remove" @tap="removeCoverImage">✕</view>
                        </view>
                        <view v-else class="upload-btn" @tap="selectCoverImage">
                            <text class="upload-icon">📷</text>
                            <text class="upload-text">选择封面图片</text>
                        </view>
                    </view>
                </view>

                <!-- 相册图片 -->
                <view class="form-item">
                    <text class="form-label">相册图片（可选）</text>
                    <view class="image-gallery">
                        <view v-for="(photo, idx) in photoList" :key="idx" class="image-preview">
                            <image :src="photo.url" mode="aspectFill" class="preview-image"></image>
                            <view class="image-remove" @tap="removePhoto(idx)">✕</view>
                        </view>
                        <view v-if="photoList.length < 5" class="upload-btn small" @tap="selectPhotos">
                            <text class="upload-icon">+</text>
                            <text class="upload-text">添加图片</text>
                        </view>
                    </view>
                    <text class="form-hint">最多上传5张图片</text>
                </view>

                <!-- 设备信息（任意键值对） -->
                <view class="form-item">
                    <text class="form-label">设备信息</text>
                    <text class="form-hint">可添加任意设备信息，例如设备名和设备描述。提交时保存为对象格式。</text>
                    <view class="equipment-list">
                        <view v-for="(eq, idx) in equipmentList" :key="idx" class="equipment-item">
                            <input class="equipment-input" v-model="eq.key" placeholder="设备名" />
                            <input class="equipment-input" v-model="eq.value" placeholder="设备描述）" />
                            <view class="equipment-remove" @tap="removeEquipment(idx)">✕</view>
                        </view>
                    </view>
                    <view class="add-equipment-btn" @tap="addEquipment">
                        <text>+ 添加设备</text>
                    </view>
                </view>
            </view>

            <!-- 提交按钮 -->
            <view class="action-buttons">
                <button class="cancel-btn" @tap="goBack">取消</button>
                <button class="submit-btn" @tap="submitForm" :disabled="submitting">
                    {{ submitting ? '提交中...' : '创建场地' }}
                </button>
            </view>
        </scroll-view>
    </view>
</template>

<script>
import api from '@/utils/api'
import parseUploadResponse from '@/utils/uploadfileDecode'

export default {
    data() {
        return {
            formData: {
                name: '',
                description: '',
                address: '',
                capacity: '',
                type: '',
                managerId: ''
            },
            coverImage: null,
            photoList: [],
            equipmentList: [],
            typeOptions: [
                { label: '剧场', value: 1 },
                { label: '礼堂', value: 2 },
                { label: '多功能厅', value: 3 },
                { label: '户外广场', value: 4 },
                { label: '其他', value: 5 }
            ],
            selectedType: {},
            submitting: false
            ,
            // 管理员搜索相关
            managerQuery: '',
            managerSuggestions: [],
            showSuggestions: false,
            selectedManager: null,
            _managerSearchTimer: null
        }
    },
    methods: {
        // 管理员搜索输入处理（防抖）
        onManagerInput(e) {
            // uni 的 input 事件在不同平台可能传入事件对象或直接传入字符串
            // 统一处理，确保 managerQuery 是字符串，避免后续调用 trim() 报错
            let val = ''
            if (e && typeof e === 'object' && 'detail' in e) {
                // 事件对象，取 detail.value（可能为空字符串）
                val = typeof e.detail.value !== 'undefined' && e.detail.value !== null ? String(e.detail.value) : ''
            } else if (typeof e === 'string' || typeof e === 'number') {
                val = String(e)
            } else {
                val = ''
            }
            this.managerQuery = val
            this.selectedManager = null
            this.formData.managerId = ''

            if (this._managerSearchTimer) clearTimeout(this._managerSearchTimer)
            if (!this.managerQuery || String(this.managerQuery).trim().length === 0) {
                this.managerSuggestions = []
                this.showSuggestions = false
                return
            }

            this._managerSearchTimer = setTimeout(() => {
                this.searchManagers()
            }, 300)
        },

        // 调用后端分页接口获取管理员（限定 userRole=VENUE_ADMIN）
        searchManagers() {
            const keyword = String(this.managerQuery || '').trim()
            if (!keyword) {
                this.managerSuggestions = []
                this.showSuggestions = false
                return
            }

            const page = 0
            const size = 20

            api.request({
                url: '/api/admin/users/list',
                method: 'GET',
                data: {
                    page: page,
                    size: size,
                    keyword: keyword,
                    userRole: 'VENUE_ADMIN'
                }
            })
                .then(res => {
                    // 后端返回 Page 对象：content 是用户数组
                    if (res && res.success && res.data) {
                        if (Array.isArray(res.data.content)) {
                            this.managerSuggestions = res.data.content
                        } else if (Array.isArray(res.data)) {
                            // 兼容老接口
                            this.managerSuggestions = res.data
                        } else {
                            this.managerSuggestions = []
                        }
                    } else {
                        this.managerSuggestions = []
                    }
                    this.showSuggestions = true
                })
                .catch(err => {
                    console.error('管理员搜索失败', err)
                    this.managerSuggestions = []
                    this.showSuggestions = false
                })
        },

        selectManager(u) {
            this.selectedManager = u
            this.formData.managerId = Number(u.id)
            this.managerQuery = u.nickname || ''
            this.showSuggestions = false
            this.managerSuggestions = []
        },

        clearSelectedManager() {
            this.selectedManager = null
            this.formData.managerId = ''
            this.managerQuery = ''
            this.managerSuggestions = []
            this.showSuggestions = false
            if (this._managerSearchTimer) {
                clearTimeout(this._managerSearchTimer)
                this._managerSearchTimer = null
            }
        },
        onTypeChange(e) {
            const index = e.detail.value
            this.selectedType = this.typeOptions[index]
            this.formData.type = this.selectedType.value
        },
        selectCoverImage() {
            uni.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    this.coverImage = {
                        url: res.tempFilePaths[0],
                        path: res.tempFilePaths[0]
                    }
                }
            })
        },
        removeCoverImage() {
            this.coverImage = null
        },
        selectPhotos() {
            const remaining = 5 - this.photoList.length
            uni.chooseImage({
                count: remaining,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera'],
                success: (res) => {
                    const newPhotos = res.tempFilePaths.map(path => ({
                        url: path,
                        path: path
                    }))
                    this.photoList = [...this.photoList, ...newPhotos]
                }
            })
        },
        removePhoto(index) {
            this.photoList.splice(index, 1)
        },
        addEquipment() {
            this.equipmentList.push({ key: '', value: '' })
        },
        removeEquipment(index) {
            this.equipmentList.splice(index, 1)
        },
        validateForm() {
            if (!this.formData.name || !this.formData.name.trim()) {
                uni.showToast({ title: '请输入场地名称', icon: 'none' })
                return false
            }
            if (!this.formData.description || !this.formData.description.trim()) {
                uni.showToast({ title: '请输入场地描述', icon: 'none' })
                return false
            }
            if (!this.formData.type) {
                uni.showToast({ title: '请选择场地类型', icon: 'none' })
                return false
            }
            if (!this.formData.address || !this.formData.address.trim()) {
                uni.showToast({ title: '请输入场地地址', icon: 'none' })
                return false
            }
            if (!this.formData.capacity || isNaN(this.formData.capacity) || Number(this.formData.capacity) <= 0) {
                uni.showToast({ title: '请输入有效的场地容量', icon: 'none' })
                return false
            }
            if (!this.formData.managerId || isNaN(this.formData.managerId)) {
                uni.showToast({ title: '请输入有效的管理员ID', icon: 'none' })
                return false
            }
            if (!this.coverImage) {
                uni.showToast({ title: '请上传封面图片', icon: 'none' })
                return false
            }
            return true
        },
        async submitForm() {
            if (!this.validateForm()) return
            if (this.submitting) return

            this.submitting = true

            try {
                // 准备设备信息：将任意键值对列表转换为对象并序列化为 JSON 字符串
                // 只保留键和值都不为空的行再提交
                const kvPairs = this.equipmentList.filter(eq => eq && String(eq.key || '').trim().length > 0 && String(eq.value || '').trim().length > 0)
                let equipmentInfo = '{}'
                if (kvPairs.length > 0) {
                    const obj = {}
                    kvPairs.forEach(eq => {
                        const k = String(eq.key).trim()
                        const v = String(eq.value).trim()
                        obj[k] = v
                    })
                    equipmentInfo = JSON.stringify(obj)
                } else {
                    equipmentInfo = JSON.stringify({})
                }

                // 上传文件
                const formData = {
                    name: this.formData.name.trim(),
                    description: this.formData.description.trim(),
                    address: this.formData.address.trim(),
                    capacity: Number(this.formData.capacity),
                    type: this.formData.type,
                    managerId: Number(this.formData.managerId),
                    equipmentInfo: equipmentInfo
                }

                // 使用 uni.uploadFile 上传
                const token = uni.getStorageSync('token')
                if (!token) {
                    uni.showToast({ title: '未登录，请先登录', icon: 'none' })
                    this.submitting = false
                    return
                }

                uni.uploadFile({
                    url: api.BASE_URL + '/api/venues',
                    filePath: this.coverImage.path,
                    name: 'coverImageFile',
                    formData: formData,
                    header: {
                        'Authorization': 'Bearer ' + token
                    },
                    success: async (uploadRes) => {
                        // 解析 uploadFile 返回（可能因为编码问题导致字符串乱码）
                        let data = null
                        try {
                            data = parseUploadResponse(uploadRes.data)
                        } catch (err) {
                            console.error('解析创建响应失败', err, uploadRes)
                            data = null
                        }

                        if (!data) {
                            uni.showToast({ title: '创建失败：响应解析异常', icon: 'none' })
                            this.submitting = false
                            return
                        }

                        console.log('[venue create] response:', data)
                        if (data.success) {
                            // 兼容多种后端返回字段，尽量取到 venueId

                            // 兼容多种后端返回字段，尽量取到 venueId
                            let venueId = null
                            if (data && typeof data.data !== 'undefined' && data.data !== null) {
                                // data.data 可能是对象、数字或字符串
                                if (typeof data.data === 'number') {
                                    venueId = data.data
                                } else if (typeof data.data === 'string' && /^\d+$/.test(data.data)) {
                                    venueId = Number(data.data)
                                } else if (typeof data.data === 'object' && (data.data.id || data.data.venueId)) {
                                    venueId = data.data.id || data.data.venueId
                                }
                            }
                            if (!venueId && (data.id || (typeof data.id === 'number'))) {
                                venueId = data.id
                            }
                            if (!venueId && data.message && typeof data.message === 'string') {
                                const m = data.message.match(/(\d+)$/)
                                if (m) {
                                    venueId = Number(m[1])
                                    console.log('[venue create] 从 message 中解析到 venueId=', venueId)
                                }
                            }

                            if (!venueId) {
                                uni.showToast({ title: '创建成功（未返回ID），请刷新列表', icon: 'success' })
                                this.submitting = false
                                setTimeout(() => uni.navigateBack(), 1200)
                                return
                            }

                            // 如果有相册图片，依次上传并等待结果
                            if (this.photoList.length > 0) {
                                console.log(`[venue create] 开始上传相册图片，共 ${this.photoList.length} 张`)
                                await this.uploadPhotos(venueId)
                            } else {
                                uni.showToast({ title: '创建成功', icon: 'success' })
                                this.submitting = false
                                setTimeout(() => {
                                    uni.navigateBack()
                                }, 1500)
                            }
                        } else {
                            uni.showToast({ title: data.message || '创建失败', icon: 'none' })
                            this.submitting = false
                        }
                    },
                    fail: (err) => {
                        console.error('上传失败:', err)
                        uni.showToast({ title: '网络错误，请重试', icon: 'none' })
                        this.submitting = false
                    }
                })
            } catch (err) {
                console.error('提交失败:', err)
                uni.showToast({ title: '提交失败，请重试', icon: 'none' })
                this.submitting = false
            }
        },
        async uploadPhotos(venueId) {
            // 依次上传相册图片到后端：POST /api/venues/{venueId}/photos
            if (!venueId) {
                uni.showToast({ title: '无法上传相册：缺少 venueId', icon: 'none' })
                this.submitting = false
                return
            }

            const token = uni.getStorageSync('token')
            if (!token) {
                uni.showToast({ title: '未登录，无法上传相册', icon: 'none' })
                this.submitting = false
                return
            }

            const files = this.photoList || []
            if (files.length === 0) {
                uni.showToast({ title: '创建成功', icon: 'success' })
                this.submitting = false
                setTimeout(() => uni.navigateBack(), 1200)
                return
            }

            this.submitting = true
            let uploaded = 0
            let failed = 0

            for (let i = 0; i < files.length; i++) {
                const f = files[i]
                const filePath = f.path || f.url || f
                console.log(`[venue upload] start (${i + 1}/${files.length}):`, filePath)
                uni.showLoading({ title: `上传图片 ${i + 1}/${files.length}...`, mask: true })
                try {
                    const res = await new Promise((resolve, reject) => {
                        uni.uploadFile({
                            url: `${api.BASE_URL}/api/venues/${venueId}/photos`,
                            filePath: filePath,
                            name: 'photoFiles',
                            header: { Authorization: 'Bearer ' + token },
                            success: (r) => resolve(r),
                            fail: (err) => reject(err)
                        })
                    })

                    let body = null
                    try { body = parseUploadResponse(res.data) } catch (e) { /* ignore */ }
                    console.log(`[venue upload] result (${i + 1}/${files.length}):`, { statusCode: res.statusCode, body })
                    if ((body && body.success) || (res.statusCode && res.statusCode >= 200 && res.statusCode < 300)) {
                        uploaded += 1
                    } else {
                        failed += 1
                        console.warn('[venue upload] 单张上传返回失败', body || res)
                    }
                } catch (err) {
                    console.error('[venue upload] 上传相册图片失败', err)
                    failed += 1
                } finally {
                    uni.hideLoading()
                }
            }

            this.submitting = false
            if (failed === 0) {
                uni.showToast({ title: '创建并上传相册成功', icon: 'success' })
            } else if (uploaded > 0) {
                uni.showToast({ title: `创建成功，但部分图片上传失败 (${failed})`, icon: 'none' })
            } else {
                uni.showToast({ title: '图片全部上传失败', icon: 'none' })
            }
            setTimeout(() => uni.navigateBack(), 1200)
        },
        goBack() {
            uni.navigateBack()
        }
    }
}
</script>

<style scoped>
.page {
    min-height: 100vh;
    background-color: #f6f2ee;
    display: flex;
    flex-direction: column;
}

.header {
    padding: 40rpx 32rpx 24rpx;
}

.title {
    font-size: 36rpx;
    font-weight: 700;
    color: #0f172a;
}

.subtitle {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #64748b;
}

/* 替换 .form-container 和 .form-card 的样式，保证真正居中并兼容安全区 */
.form-container {
    width: 100%;
    /* 占满可用宽度，避免容器本身不满屏导致居中失败 */
    flex: 0;
    /* 如果希望不填充剩余高度可以保持 0；如需垂直居中改为 flex:1 并 align-items:center */
    padding: 0 calc(32rpx + env(safe-area-inset-left, 0px)) 40rpx calc(32rpx + env(safe-area-inset-right, 0px));
    display: flex;
    justify-content: center;
    /* 水平居中卡片 */
    align-items: flex-start;
    overflow-x: hidden;
    box-sizing: border-box;
}

.form-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20rpx;
    padding: 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
    margin: 0 auto;
    width: 100%;
    /* 在父容器的内容区内最大填充 */
    max-width: 720rpx;
    /* 限制最大宽度，保证大屏居中 */
    box-sizing: border-box;
    /* 包括 padding 在内 */
}

.form-item {
    margin-bottom: 32rpx;
}

/* 防止标签或输入内容超出父容器 */
.form-label {
    max-width: 100%;
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: normal;
}

.form-input,
.form-textarea,
.equipment-input {
    box-sizing: border-box;
    max-width: 100%;
    overflow: hidden;
}

.form-textarea {
    white-space: pre-wrap;
    overflow-wrap: break-word;
}

/* picker 内的文本单行显示并以省略号结尾，防止撑开布局 */
.picker-view text:first-child {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.form-item.required .form-label::before {
    content: '*';
    color: #ef4444;
    margin-right: 4rpx;
}

.form-label {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 12rpx;
}

.form-input {
    width: 100%;
    height: 80rpx;
    padding: 0 20rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
}

.form-textarea {
    width: 100%;
    min-height: 160rpx;
    padding: 20rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
}

.picker-view {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 80rpx;
    padding: 0 20rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #0f172a;
}

.picker-arrow {
    color: #94a3b8;
    font-size: 24rpx;
}

/* 管理员搜索样式 */
.manager-search {
    position: relative;
}

.manager-selected {
    margin-top: 12rpx;
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.manager-name {
    font-size: 26rpx;
    color: #0f172a;
}

.manager-avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 8rpx;
    background: #f1f5f9;
}

.manager-info {
    display: flex;
    flex-direction: column;
}

.manager-id {
    font-size: 22rpx;
    color: #94a3b8;
    margin-top: 6rpx;
}

.remove-selected {
    background: #fee2e2;
    color: #dc2626;
    width: 56rpx;
    height: 56rpx;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.suggestions {
    margin-top: 12rpx;
    background: #ffffff;
    border: 1rpx solid #e6edf3;
    border-radius: 12rpx;
    max-height: 360rpx;
    overflow-y: auto;
    box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.06);
}

.suggestion-item {
    padding: 18rpx 16rpx;
    border-bottom: 1rpx solid #f1f5f9;
}

.suggestion-text {
    font-size: 26rpx;
    color: #0f172a;
}

.suggestion-item {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 14rpx 12rpx;
    border-bottom: 1rpx solid #f1f5f9;
}

.suggestion-avatar {
    width: 56rpx;
    height: 56rpx;
    border-radius: 8rpx;
    background: #f1f5f9;
}

.suggestion-body {
    display: flex;
    flex-direction: column;
}

.suggestion-sub {
    font-size: 22rpx;
    color: #94a3b8;
    margin-top: 6rpx;
}

.no-suggestion {
    padding: 18rpx 16rpx;
    color: #94a3b8;
    font-size: 24rpx;
}

.form-hint {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #94a3b8;
}

.image-upload-section {
    display: flex;
    gap: 20rpx;
    flex-wrap: wrap;
}

.image-preview {
    position: relative;
    width: 200rpx;
    height: 200rpx;
    border-radius: 12rpx;
    overflow: hidden;
    background: #f1f5f9;
}

.preview-image {
    width: 100%;
    height: 100%;
}

.image-remove {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 48rpx;
    height: 48rpx;
    background: rgba(0, 0, 0, 0.6);
    color: #ffffff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
}

.upload-btn {
    width: 200rpx;
    height: 200rpx;
    border: 2rpx dashed #cbd5e1;
    border-radius: 12rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    background: #f8fafc;
}

.upload-btn.small {
    width: 160rpx;
    height: 160rpx;
}

.upload-icon {
    font-size: 48rpx;
    color: #94a3b8;
}

.upload-text {
    font-size: 22rpx;
    color: #64748b;
}

.image-gallery {
    display: flex;
    gap: 20rpx;
    flex-wrap: wrap;
}

.image-gallery .image-preview {
    width: 160rpx;
    height: 160rpx;
}

.equipment-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.equipment-item {
    display: flex;
    gap: 12rpx;
    align-items: center;
}

.equipment-input {
    flex: 1;
    height: 70rpx;
    padding: 0 16rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 8rpx;
    font-size: 26rpx;
    color: #0f172a;
}

.equipment-remove {
    width: 60rpx;
    height: 60rpx;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
}

.add-equipment-btn {
    margin-top: 12rpx;
    padding: 16rpx;
    border: 2rpx dashed #cbd5e1;
    border-radius: 8rpx;
    text-align: center;
    font-size: 26rpx;
    color: #2563eb;
    background: rgba(37, 99, 235, 0.05);
}

.action-buttons {
    display: flex;
    gap: 20rpx;
    margin-top: 32rpx;
}

.cancel-btn {
    flex: 1;
    height: 88rpx;
    background: #f1f5f9;
    color: #475569;
    border-radius: 12rpx;
    font-size: 28rpx;
    font-weight: 600;
    border: none;
}

.submit-btn {
    flex: 2;
    height: 88rpx;
    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
    color: #ffffff;
    border-radius: 12rpx;
    font-size: 28rpx;
    font-weight: 600;
    border: none;
}

.submit-btn[disabled] {
    opacity: 0.6;
}
</style>
