<template>
    <view class="page">
        <!-- 头部导航/状态 -->
        <view class="header-banner">
            <text class="banner-title">{{ isUpdate ? '更新电子票模板' : '上传电子票模板' }}</text>
            <text class="banner-sub">为特定场次预约成功后的观众分配专属票面背景</text>
        </view>

        <view class="section-card main-form">
            <!-- 基础资料只读展示 -->
            <view class="info-group">
                <view class="info-item">
                    <text class="info-label">演出 ID</text>
                    <text class="info-value">#{{ performanceId || '-' }}</text>
                </view>
                <view class="info-item">
                    <text class="info-label">关联场次</text>
                    <text class="info-value highlighted">{{ selectedSessionDisplay || '-' }}</text>
                </view>
            </view>

            <view class="divider"></view>

            <!-- 图片上传区域 -->
            <view class="form-section">
                <view class="section-title-row">
                    <text class="section-dot"></text>
                    <text class="section-label">模板背景图</text>
                </view>

                <view class="upload-container" @tap="chooseImage">
                    <block v-if="preview">
                        <image :src="preview" class="preview-img-full" mode="aspectFill"></image>
                        <view class="upload-overlay">
                            <text class="overlay-text">点击更换图片</text>
                        </view>
                    </block>
                    <view v-else class="upload-placeholder">
                        <text class="upload-icon">📸</text>
                        <text class="upload-text">点击选择或拍照</text>
                        <text class="upload-hint">建议 500x800, jpg/png</text>
                    </view>
                </view>
                <text class="hint-text">该图片将作为电子票的背景底图展示给观众。</text>
            </view>

            <!-- 状态设置 -->
            <view class="form-section">
                <view class="section-title-row">
                    <text class="section-dot"></text>
                    <text class="section-label">发布状态</text>
                </view>
                <picker mode="selector" :range="['隐藏 (下架)', '可见 (上架)']" :value="statusIndex" @change="onStatusChange">
                    <view class="picker-box">
                        <text class="picker-value">{{ statusIndex === 1 ? '✅ 已上架' : '🚫 已下架' }}</text>
                        <text class="picker-arrow">▾</text>
                    </view>
                </picker>
            </view>

            <!-- 底部按钮组 -->
            <view class="action-footer">
                <button class="btn-cancel" @tap="goBack">返回</button>
                <button class="btn-submit" :class="{ 'btn-submitting': submitting }" :disabled="submitting"
                    @tap="submit">
                    <text v-if="submitting" class="loading-spin">↻</text>
                    <text>{{ submitting ? '提交中' : (isUpdate ? '保存更新' : '立即上传') }}</text>
                </button>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'

export default {
    data() {
        return {
            performanceId: null,
            availableSessions: [],
            selectedSessionIds: [],
            selectedSessionDisplay: null,
            imageTempPath: null,
            preview: null,
            statusIndex: 1,
            submitting: false,
            isUpdate: false,
            templateId: null
        }
    },
    onLoad(options) {
        this.performanceId = options.performanceId || options.id || null
        const sid = options.sessionId || options.sessionIdList
        if (sid) {
            try { this.selectedSessionIds = Array.isArray(sid) ? sid.map(Number) : [Number(sid)] } catch (e) { }
        }
        if (options.templateId) { this.isUpdate = true; this.templateId = options.templateId }
        // 如果传入 templateUrl，则当作更新并显示预览
        if (options.templateUrl) {
            try { this.preview = decodeURIComponent(options.templateUrl); this.isUpdate = true } catch (e) { this.preview = options.templateUrl; this.isUpdate = true }
        }
        this.fetchPerformanceSessions()
        if (this.isUpdate) this.fetchExistingTemplate()
    },
    methods: {
        formatSessionTime(timeStr) {
            if (!timeStr) return '-'
            const date = new Date(timeStr)
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            const h = String(date.getHours()).padStart(2, '0')
            const min = String(date.getMinutes()).padStart(2, '0')
            return `${y}-${m}-${d} ${h}:${min}`
        },
        goBack() { uni.navigateBack() },
        sId(s) { return s.sessionId || s.id || s.sid || null },
        onToggleSession(s) {
            // 兼容旧调用（保留但不用于单选）
            const id = this.sId(s)
            if (!id) return
            const idx = this.selectedSessionIds.indexOf(Number(id))
            if (idx >= 0) this.selectedSessionIds.splice(idx, 1)
            else this.selectedSessionIds.push(Number(id))
        },
        onSelectSession(s) {
            const id = this.sId(s)
            if (!id) return
            this.selectedSessionIds = [Number(id)]
            this.updateSelectedSessionDisplay()
        },
        onStatusChange(e) { this.statusIndex = Number(e.detail.value) },
        chooseImage() {
            uni.chooseImage({
                count: 1, success: (res) => {
                    const tmp = res.tempFilePaths && res.tempFilePaths[0]
                    if (tmp) { this.imageTempPath = tmp; this.preview = tmp }
                }
            })
        },
        fetchPerformanceSessions() {
            if (!this.performanceId) return
            api.request({ url: `/api/performance/${this.performanceId}`, method: 'GET' })
                .then(res => { if (!res?.success) return; this.availableSessions = res.data.sessions || []; this.updateSelectedSessionDisplay() }).catch(() => { })
        },
        fetchExistingTemplate() {
            if (!this.templateId) return
            api.request({ url: `/api/ticket/template/${this.templateId}`, method: 'GET' })
                .then(res => {
                    if (!res?.success) return
                    const d = res.data || {}
                    this.selectedSessionIds = d.sessionIds || []
                    this.statusIndex = d.status === 1 ? 1 : 0
                    this.preview = d.templateUrl || null
                    this.updateSelectedSessionDisplay()
                }).catch(() => { })
        },
        updateSelectedSessionDisplay() {
            if (!this.availableSessions || !this.selectedSessionIds || this.selectedSessionIds.length === 0) return
            const sid = Number(this.selectedSessionIds[0])
            const s = this.availableSessions.find(x => Number(this.sId(x)) === sid)
            if (s) this.selectedSessionDisplay = `${s.venueName || ''} · ${this.formatSessionTime(s.startTime)}`
        },
        submit() {
            if (!this.selectedSessionIds || this.selectedSessionIds.length === 0) { uni.showToast({ title: '场次未指定', icon: 'none' }); return }
            if (!this.imageTempPath && !this.isUpdate) { uni.showToast({ title: '请选择图片', icon: 'none' }); return }
            this.submitting = true
            const url = this.isUpdate ? '/api/ticket/template/update' : '/api/ticket/template/upload'
            const statusVal = this.statusIndex === 1 ? 1 : 0
            // 后端现在期望 multipart 中直接包含 sessionIds 和 status
            // 使用逗号分隔的 sessionIds 字符串以兼容多平台上传实现
            const sessionIdsJoined = (this.selectedSessionIds || []).map(Number).join(',')
            const formData = { sessionIds: sessionIdsJoined, status: String(statusVal) }
            // 兼容旧后端：同时加入 data 字段（JSON 字符串）避免 MissingServletRequestPartException
            const legacyData = JSON.stringify({ sessionIds: (this.selectedSessionIds || []).map(Number), status: statusVal })
            if (this.imageTempPath) {
                // uni.uploadFile 在小程序/原生环境通常需要绝对 URL，因此使用 api.BASE_URL
                const fullUrl = (api && api.BASE_URL ? api.BASE_URL : '') + url
                const token = uni.getStorageSync('token')
                const headers = token ? { Authorization: `Bearer ${token}` } : {}

                // 在 H5（含微信开发者工具）优先使用 fetch+FormData 上传，避免 uni.uploadFile 在 H5 下发送 application/octet-stream
                const isH5 = typeof window !== 'undefined' && navigator && /HTML|Mozilla|wechatdevtools/i.test(navigator.userAgent)
                const uploadFormData = Object.assign({}, formData, { data: legacyData })
                if (isH5) {
                    fetch(this.imageTempPath)
                        .then(r => r.blob())
                        .then(blob => {
                            const fd = new FormData()
                            fd.append('sessionIds', formData.sessionIds)
                            fd.append('status', formData.status)
                            fd.append('data', legacyData)
                            fd.append('imageFile', blob, 'template.jpg')
                            return fetch(fullUrl, { method: 'POST', headers: headers, body: fd })
                        })
                        .then(resp => resp.json())
                        .then(ret => {
                            if (ret && ret.success) {
                                uni.showToast({ title: '提交成功', icon: 'none' })
                                setTimeout(() => uni.navigateBack(), 600)
                            } else {
                                uni.showToast({ title: ret?.message || '提交失败', icon: 'none' })
                            }
                        })
                        .catch(err => {
                            uni.showToast({ title: '上传失败', icon: 'none' })
                        })
                        .finally(() => { this.submitting = false })
                    return
                }

                // 非 H5 平台使用 uni.uploadFile
                uni.uploadFile({
                    url: fullUrl,
                    filePath: this.imageTempPath,
                    name: 'imageFile',
                    formData: uploadFormData,
                    header: headers,
                    success: (uploadRes) => {
                        try {
                            const ret = JSON.parse(uploadRes.data)
                            if (ret && ret.success) {
                                uni.showToast({ title: '提交成功', icon: 'none' })
                                setTimeout(() => uni.navigateBack(), 600)
                            } else {
                                uni.showToast({ title: ret?.message || '提交失败', icon: 'none' })
                            }
                        } catch (e) {
                            uni.showToast({ title: '提交失败', icon: 'none' })
                        }
                    },
                    fail: (err) => {
                        uni.showToast({ title: '上传失败', icon: 'none' })
                    },
                    complete: () => { this.submitting = false }
                })
            } else {
                // 后端期望通过 request parameters 获取 sessionIds/status，当没有文件上传时，
                // 将参数放到查询字符串以兼容 @RequestParam(List<Long> sessionIds)
                const statusVal2 = this.statusIndex === 1 ? 1 : 0
                const sids = (this.selectedSessionIds || []).map(Number)
                const qs = sids.map(id => `sessionIds=${encodeURIComponent(id)}`).join('&') + `&status=${encodeURIComponent(statusVal2)}` + (this.templateId ? `&templateId=${encodeURIComponent(this.templateId)}` : '')
                const targetUrl = url + (qs ? `?${qs}` : '')
                api.request({ url: targetUrl, method: 'POST', data: {} })
                    .then(res => {
                        if (res?.success) {
                            uni.showToast({ title: '提交成功', icon: 'none' })
                            setTimeout(() => uni.navigateBack(), 600)
                        } else uni.showToast({ title: res?.message || '提交失败', icon: 'none' })
                    }).catch(() => { uni.showToast({ title: '提交失败', icon: 'none' }) }).finally(() => { this.submitting = false })
            }
        }
    }
}
</script>

<style scoped>
.page {
    background: #f8fafc;
    min-height: 100vh;
    padding-bottom: 60rpx;
}

.header-banner {
    padding: 60rpx 40rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.banner-title {
    font-size: 36rpx;
    font-weight: 800;
}

.banner-sub {
    font-size: 24rpx;
    opacity: 0.8;
}

.main-form {
    margin: -30rpx 24rpx 0;
    padding: 36rpx;
    border-radius: 24rpx;
    background: #ffffff;
    box-shadow: 0 10rpx 30rpx rgba(124, 58, 237, 0.08);
}

/* Info Panel Styles */
.info-group {
    background: #f1f5f9;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.info-label {
    font-size: 24rpx;
    color: #64748b;
    font-weight: 600;
}

.info-value {
    font-size: 26rpx;
    color: #1e293b;
    font-weight: 700;
}

.info-value.highlighted {
    color: #7c3aed;
}

.divider {
    height: 1rpx;
    background: #e2e8f0;
    margin: 36rpx 0;
}

/* Form Styles */
.form-section {
    margin-bottom: 40rpx;
}

.section-title-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
}

.section-dot {
    width: 10rpx;
    height: 10rpx;
    background: #8b5cf6;
    border-radius: 50%;
}

.section-label {
    font-size: 28rpx;
    font-weight: 800;
    color: #1e293b;
}

/* Upload Style */
.upload-container {
    width: 320rpx;
    height: 480rpx;
    border: 2rpx dashed #cbd5e1;
    border-radius: 20rpx;
    background: #f8fafc;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12rpx;
    transition: all 0.2s;
}

.upload-container:active {
    transform: scale(0.98);
    border-color: #8b5cf6;
}

.preview-img-full {
    width: 100%;
    height: 100%;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
}

.upload-icon {
    font-size: 64rpx;
    margin-bottom: 12rpx;
}

.upload-text {
    font-size: 26rpx;
    color: #64748b;
    font-weight: 700;
}

.upload-hint {
    font-size: 20rpx;
    color: #94a3b8;
}

.upload-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60rpx;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4rpx);
    display: flex;
    align-items: center;
    justify-content: center;
}

.overlay-text {
    font-size: 22rpx;
    color: #fff;
    font-weight: 600;
}

.hint-text {
    font-size: 22rpx;
    color: #94a3b8;
    text-align: center;
    display: block;
    margin-top: 10rpx;
}

/* Picker styles */
.picker-box {
    background: #f1f5f9;
    padding: 24rpx;
    border-radius: 16rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.picker-value {
    font-size: 26rpx;
    color: #1e293b;
    font-weight: 700;
}

.picker-arrow {
    color: #94a3b8;
    font-size: 24rpx;
}

/* Action buttons */
.action-footer {
    display: flex;
    gap: 24rpx;
    margin-top: 60rpx;
}

.btn-cancel {
    flex: 1;
    height: 100rpx;
    line-height: 100rpx;
    background: #f1f5f9;
    color: #64748b;
    font-size: 28rpx;
    font-weight: 700;
    border-radius: 50rpx;
    border: none;
}

.btn-submit {
    flex: 2;
    height: 100rpx;
    line-height: 100rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    font-size: 30rpx;
    font-weight: 800;
    border-radius: 50rpx;
    box-shadow: 0 16rpx 32rpx rgba(124, 58, 237, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    border: none;
    transition: all 0.2s;
}

.btn-submitting {
    opacity: 0.8;
}

.btn-submit:active {
    transform: translateY(4rpx);
    box-shadow: 0 8rpx 16rpx rgba(124, 58, 237, 0.2);
}

.loading-spin {
    display: inline-block;
    animation: rotate 1s linear infinite;
    font-size: 32rpx;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>
