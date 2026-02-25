<template>
    <view class="page">
        <view class="header">
            <text class="title">编辑场地</text>
            <text class="subtitle">修改场地基本信息</text>
        </view>

        <scroll-view class="form-container" scroll-y>
            <view class="form-card">
                <view class="form-item required">
                    <text class="form-label">场地名称</text>
                    <input class="form-input" v-model="formData.name" placeholder="请输入场地名称" />
                </view>

                <view class="form-item required">
                    <text class="form-label">场地描述</text>
                    <textarea class="form-textarea" v-model="formData.description" placeholder="请输入场地描述"
                        maxlength="500"></textarea>
                </view>

                <view class="form-item required">
                    <text class="form-label">场地类型</text>
                    <picker :range="typeOptions" range-key="label" @change="onTypeChange">
                        <view class="picker-view">
                            <text>{{ selectedType.label || '请选择类型' }}</text>
                            <text class="picker-arrow">▼</text>
                        </view>
                    </picker>
                </view>

                <view class="form-item required">
                    <text class="form-label">场地地址</text>
                    <input class="form-input" v-model="formData.address" placeholder="请输入场地地址" />
                </view>

                <view class="form-item required">
                    <text class="form-label">场地容量（人）</text>
                    <input class="form-input" v-model="formData.capacity" type="number" placeholder="请输入场地容量" />
                </view>

                <!-- 管理员：显示当前管理员，只有超级管理员可修改/搜索替换 -->
                <view class="form-item" :class="{ 'required': isSuperAdmin }">
                    <text class="form-label">管理员</text>
                    <view v-if="currentManager" class="manager-selected readonly">
                        <image v-if="currentManager.avatarUrl || currentManager.avatar"
                            :src="currentManager.avatarUrl || currentManager.avatar" class="manager-avatar"
                            mode="aspectFill"></image>
                        <view class="manager-info">
                            <text class="manager-name">{{ currentManager.nickname }}</text>
                            <text class="manager-id">ID: {{ currentManager.id }}</text>
                        </view>
                    </view>
                    <view v-else class="manager-none"><text>未设置</text></view>

                    <view v-if="isSuperAdmin" class="manager-edit">
                        <input class="form-input" v-model="managerQuery" placeholder="搜索管理员用户名"
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
                            <view v-for="u in managerSuggestions" :key="u.id" class="suggestion-item"
                                @tap="selectManager(u)">
                                <image v-if="u.avatarUrl || u.avatar" :src="u.avatarUrl || u.avatar"
                                    class="suggestion-avatar" mode="aspectFill"></image>
                                <view class="suggestion-body"><text class="suggestion-text">{{ u.nickname }}</text><text
                                        class="suggestion-sub">ID: {{ u.id }}</text></view>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- 封面替换 -->
                <view class="form-item">
                    <text class="form-label">封面图片</text>
                    <text class="form-hint">留空则保持原封面不变</text>
                    <view class="image-upload-section">
                        <view v-if="coverImage" class="image-preview">
                            <image :src="coverImage.url || coverImage" mode="aspectFill" class="preview-image"></image>
                            <view class="image-remove" @tap="removeCoverImage">✕</view>
                        </view>
                        <view v-else class="upload-btn" @tap="selectCoverImage">
                            <text class="upload-icon">📷</text>
                            <text class="upload-text">选择封面图片</text>
                        </view>
                    </view>
                </view>

                <!-- 相册：展示已有并可标记删除 -->
                <view class="form-item">
                    <text class="form-label">相册（标记要删除的图片）</text>
                    <view class="image-gallery">
                        <view v-for="(p, idx) in existingPhotos" :key="p.id || idx" class="image-preview">
                            <image :src="p.url" class="preview-image"></image>
                            <view class="image-remove" @tap="toggleDeletePhoto(p.id)">{{ deletePhotoIds.includes(p.id) ?
                                '恢复' : '删除' }}</view>
                        </view>
                    </view>
                </view>

                <!-- 相册新增 -->
                <view class="form-item">
                    <text class="form-label">新增相册图片（可选）</text>
                    <view class="image-gallery">
                        <view v-for="(photo, idx) in newPhotos" :key="idx" class="image-preview">
                            <image :src="photo.url" class="preview-image"></image>
                            <view class="image-remove" @tap="removeNewPhoto(idx)">✕</view>
                        </view>
                        <view v-if="newPhotos.length < 5" class="upload-btn small" @tap="selectNewPhotos">
                            <text class="upload-icon">+</text>
                            <text class="upload-text">添加图片</text>
                        </view>
                    </view>
                    <text class="form-hint">最多上传5张图片</text>
                </view>

                <!-- 设备信息 -->
                <view class="form-item">
                    <text class="form-label">设备信息</text>
                    <text class="form-hint">可添加任意设备信息，例如设备名和设备描述。提交时保存为对象格式。</text>
                    <view class="equipment-list">
                        <view v-for="(eq, idx) in equipmentList" :key="idx" class="equipment-item">
                            <input class="equipment-input" v-model="eq.key" placeholder="设备名" />
                            <input class="equipment-input" v-model="eq.value" placeholder="设备描述" />
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
                <button class="submit-btn" @tap="submitForm" :disabled="submitting">{{ submitting ? '保存中...' : '保存修改'
                }}</button>
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
            venueId: null,
            formData: { name: '', description: '', address: '', capacity: '', type: '', managerId: '' },
            typeOptions: [{ label: '剧场', value: 1 }, { label: '礼堂', value: 2 }, { label: '多功能厅', value: 3 }, { label: '户外广场', value: 4 }, { label: '其他', value: 5 }],
            selectedType: {},
            coverImage: null, // local file object or existing url
            existingPhotos: [], // {id,url}
            deletePhotoIds: [],
            newPhotos: [],
            equipmentList: [],
            managerQuery: '', managerSuggestions: [], showSuggestions: false, selectedManager: null, _mgrTimer: null,
            submitting: false,
            isSuperAdmin: false,
            currentManager: null
        }
    },
    onLoad(options) {
        if (options && options.venueId) {
            this.venueId = options.venueId
            this.fetchVenue()
        }
        // 兼容不同平台的路由 query 传参方式
        if (!this.venueId) {
            try {
                if (this.$mp && this.$mp.query && this.$mp.query.venueId) this.venueId = this.$mp.query.venueId
            } catch (e) { }
        }
        if (!this.venueId) {
            try {
                const pages = getCurrentPages && getCurrentPages()
                if (pages && pages.length) {
                    const cur = pages[pages.length - 1]
                    if (cur && cur.options && cur.options.venueId) this.venueId = cur.options.venueId
                }
            } catch (e) { }
        }
        if (this.venueId) this.fetchVenue()
        this.checkUserRole()
    },
    methods: {
        fetchVenue() {
            if (!this.venueId) return
            api.request({ url: `/api/venues/${this.venueId}`, method: 'GET' })
                .then(res => {
                    if (res?.success && res.data) {
                        const v = res.data
                        this.formData.name = v.name || ''
                        this.formData.description = v.description || ''
                        this.formData.address = v.address || ''
                        this.formData.capacity = v.capacity || ''
                        this.formData.type = v.type || ''
                        this.selectedType = this.typeOptions.find(t => t.value === v.type) || {}
                        this.formData.managerId = v.manager ? v.manager.id : ''
                        this.currentManager = v.manager || null
                        this.existingPhotos = Array.isArray(v.photoList) ? v.photoList : (v.photoList ? JSON.parse(v.photoList) : [])
                        // equipment: 支持后端返回为 JSON 字符串或对象
                        try {
                            let eq = []
                            if (v.equipmentInfo) {
                                if (typeof v.equipmentInfo === 'string') {
                                    const parsed = JSON.parse(v.equipmentInfo || '{}')
                                    if (parsed && typeof parsed === 'object') eq = Object.entries(parsed).map(([k, val]) => ({ key: k, value: String(val) }))
                                } else if (typeof v.equipmentInfo === 'object') {
                                    eq = Object.entries(v.equipmentInfo).map(([k, val]) => ({ key: k, value: String(val) }))
                                }
                            }
                            // 如果没有任何设备，给一行空白以便编辑
                            if (!Array.isArray(eq) || eq.length === 0) {
                                this.equipmentList = [{ key: '', value: '' }]
                            } else {
                                this.equipmentList = eq
                            }
                        } catch (e) { this.equipmentList = [{ key: '', value: '' }] }
                    }
                })
        },
        async checkUserRole() {
            try {
                const res = await api.request({ url: '/api/users/me', method: 'GET' })
                const d = res && res.data
                if (d) {
                    const role = d.userRole || d.role
                    this.isSuperAdmin = role === 'SUPER_ADMIN' || (Array.isArray(d.roles) && d.roles.includes('SUPER_ADMIN'))
                }
            } catch (e) { /* ignore */ }
        },
        onTypeChange(e) { const idx = e.detail.value; this.selectedType = this.typeOptions[idx]; this.formData.type = this.selectedType.value },
        selectCoverImage() { uni.chooseImage({ count: 1, success: (res) => { this.coverImage = { path: res.tempFilePaths[0], url: res.tempFilePaths[0] } } }) },
        removeCoverImage() { this.coverImage = null },
        selectNewPhotos() { const remain = 5 - this.newPhotos.length; uni.chooseImage({ count: Math.max(1, remain), success: (res) => { this.newPhotos = [...this.newPhotos, ...res.tempFilePaths.map(p => ({ path: p, url: p }))] } }) },
        removeNewPhoto(i) { this.newPhotos.splice(i, 1) },
        toggleDeletePhoto(id) { const i = this.deletePhotoIds.indexOf(id); if (i >= 0) this.deletePhotoIds.splice(i, 1); else this.deletePhotoIds.push(id) },
        addEquipment() { this.equipmentList.push({ key: '', value: '' }) }, removeEquipment(i) { this.equipmentList.splice(i, 1) },
        // 管理员搜索（分页）
        onManagerInput(e) {
            let val = '';
            if (e && typeof e === 'object' && 'detail' in e) val = String(e.detail.value || '')
            else val = String(e || '')
            this.managerQuery = val; this.selectedManager = null; this.formData.managerId = ''
            if (this._mgrTimer) clearTimeout(this._mgrTimer)
            if (!this.managerQuery.trim()) { this.managerSuggestions = []; this.showSuggestions = false; return }
            this._mgrTimer = setTimeout(() => this.searchManagers(), 300)
        },
        searchManagers() { const kw = String(this.managerQuery || '').trim(); if (!kw) return; api.request({ url: '/api/admin/users/list', method: 'GET', data: { page: 0, size: 20, keyword: kw, userRole: 'VENUE_ADMIN' } }).then(res => { if (res && res.success && res.data) { this.managerSuggestions = Array.isArray(res.data.content) ? res.data.content : (Array.isArray(res.data) ? res.data : []) } else this.managerSuggestions = []; this.showSuggestions = true }).catch(() => { this.managerSuggestions = []; this.showSuggestions = false }) },
        selectManager(u) { this.selectedManager = u; this.formData.managerId = Number(u.id); this.managerQuery = u.nickname || ''; this.showSuggestions = false; this.managerSuggestions = [] },
        clearSelectedManager() { this.selectedManager = null; this.formData.managerId = ''; this.managerQuery = ''; this.showSuggestions = false; this.managerSuggestions = [] },
        async submitForm() {
            if (this.submitting) return
            if (!this.venueId) {
                uni.showToast({ title: '场地ID缺失，无法提交', icon: 'none' })
                console.warn('submitForm aborted: missing venueId')
                return
            }
            if (!this.formData.name || !String(this.formData.name).trim()) { uni.showToast({ title: '请输入场地名称', icon: 'none' }); return }
            this.submitting = true
            // equipment -> object
            const kv = this.equipmentList.filter(e => e && String(e.key || '').trim() && String(e.value || '').trim())
            const eqObj = {}
            kv.forEach(e => { eqObj[String(e.key).trim()] = String(e.value).trim() })

            const payload = { id: this.venueId, name: String(this.formData.name).trim(), description: String(this.formData.description || '').trim(), address: String(this.formData.address || '').trim(), capacity: Number(this.formData.capacity) || 0, type: this.formData.type, equipmentInfo: JSON.stringify(eqObj) }
            if (this.deletePhotoIds && this.deletePhotoIds.length > 0) payload.deletePhotoIds = this.deletePhotoIds
            if (this.isSuperAdmin && this.formData.managerId) payload.managerId = this.formData.managerId

            try {
                const token = uni.getStorageSync('token')
                if (!token) {
                    uni.showToast({ title: '未登录，无法提交', icon: 'none' })
                    this.submitting = false
                    return
                }

                // Helper to stringify form for x-www-form-urlencoded
                const toFormString = (obj) => {
                    const parts = []
                    Object.keys(obj).forEach(k => {
                        const v = obj[k]
                        if (v === undefined || v === null) return
                        if (Array.isArray(v)) {
                            v.forEach(item => parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(item)))
                        } else {
                            parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
                        }
                    })
                    return parts.join('&')
                }

                // If user selected a new cover image, send multipart request including file and form fields
                if (this.coverImage && this.coverImage.path) {
                    await new Promise((resolve, reject) => {
                        uni.uploadFile({
                            url: api.BASE_URL + '/api/venues/update',
                            filePath: this.coverImage.path,
                            name: 'coverImageFile',
                            formData: payload,
                            header: { Authorization: 'Bearer ' + token },
                            success: (r) => {
                                // try to parse response, but accept HTTP 2xx as success
                                try { const body = parseUploadResponse(r.data); if (!body || !body.success) console.warn('update returned', body) } catch (e) { /* ignore */ }
                                resolve(r)
                            },
                            fail: (e) => reject(e)
                        })
                    })
                } else {
                    // No cover file — send as form-urlencoded so @ModelAttribute can bind
                    const formStr = toFormString(payload)
                    const res = await new Promise((resolve, reject) => {
                        uni.request({
                            url: api.BASE_URL + '/api/venues/update',
                            method: 'POST',
                            header: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Bearer ' + token },
                            data: formStr,
                            success: (r) => resolve(r),
                            fail: (e) => reject(e)
                        })
                    })
                    if (!res || (res.statusCode < 200 || res.statusCode >= 300)) {
                        uni.showToast({ title: (res && res.data && res.data.message) || '更新失败', icon: 'none' })
                        this.submitting = false
                        return
                    }
                }

                // upload new photos one by one
                for (const f of this.newPhotos) {
                    await new Promise((resolve, reject) => {
                        uni.uploadFile({ url: `${api.BASE_URL}/api/venues/${this.venueId}/photos`, filePath: f.path, name: 'photoFiles', header: { Authorization: 'Bearer ' + token }, success: (r) => resolve(r), fail: (e) => reject(e) })
                    })
                }

                uni.showToast({ title: '更新成功', icon: 'success' })
                setTimeout(() => uni.navigateBack(), 900)
            } catch (err) { console.error('编辑提交失败', err); uni.showToast({ title: '网络或上传错误', icon: 'none' }) }
            finally { this.submitting = false }
        },
        goBack() { uni.navigateBack() }
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

.form-container {
    width: 100%;
    flex: 0;
    padding: 0 calc(32rpx + env(safe-area-inset-left, 0px)) 40rpx calc(32rpx + env(safe-area-inset-right, 0px));
    display: flex;
    justify-content: center;
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
    max-width: 720rpx;
    box-sizing: border-box;
}

.form-item {
    margin-bottom: 32rpx;
}

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

.manager-search {
    position: relative;
}

.manager-selected {
    margin-top: 12rpx;
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.manager-selected.readonly {
    background: #f8fafc;
    padding: 12rpx;
    border-radius: 12rpx;
    border: 2rpx solid #e2e8f0;
}

.manager-none {
    padding: 12rpx;
    background: #f8fafc;
    border-radius: 12rpx;
    color: #94a3b8;
    font-size: 26rpx;
}

.manager-edit {
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 2rpx dashed #e2e8f0;
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

.suggestion-text {
    font-size: 26rpx;
    color: #0f172a;
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
