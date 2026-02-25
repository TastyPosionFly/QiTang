<template>
    <view class="page">
        <!-- 全屏摄像头预览，进入页面即开始扫描 -->
        <camera ref="camera" device-position="back" class="camera-preview" autoplay></camera>

        <!-- 引导方框覆盖在预览顶部 -->
        <view class="scan-overlay">
            <view class="scan-frame">
                <view class="corner top-left"></view>
                <view class="corner top-right"></view>
                <view class="corner bottom-left"></view>
                <view class="corner bottom-right"></view>
            </view>
            <text class="status">{{ statusText }}</text>
        </view>

        <!-- 扫描结果（小列表，位于底部覆盖） -->
        <view class="results bottom-results">
            <view class="result-item" v-for="(r, i) in results" :key="r._id" :class="{ fading: r._fade }">
                <text class="code">{{ r.code }}</text>
                <text class="msg">{{ r.message }}</text>
                <text class="time">{{ r.time }}</text>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
export default {
    data() {
        return {
            scanning: true,
            scanLoopRunning: false,
            results: [],
            statusText: '正在启动摄像头并持续扫码...',
            recentCodes: new Set()
        }
    },
    onShow() {
        // 页面显示时自动启动扫描（只启动一次循环）
        if (!this.scanLoopRunning) {
            this.scanning = true
            this.$nextTick(() => setTimeout(() => { if (!this.scanLoopRunning) this.loopScan() }, 320))
        }
    },
    onUnload() {
        this.scanning = false
    },
    methods: {
        goBack() {
            uni.navigateBack()
        },
        toggleScanning() {
            // 保留方法以备后用，但页面会自动开始扫描
            if (this.scanning) {
                this.scanning = false
                this.statusText = '已停止扫描'
            } else {
                this.scanning = true
                this.statusText = '正在等待扫码...'
                this.loopScan()
            }
        },
        async loopScan() {
            if (this.scanLoopRunning) return
            this.scanLoopRunning = true
            try {
                while (this.scanning) {
                    try {
                        // 使用 camera.takePhoto 拍照并上传到 qrserver 解码
                        const code = await this.takePhotoAndDecode()
                        if (!code) {
                            this.statusText = '未识别到二维码，请确保对准方框'
                            await this.sleep(800)
                            continue
                        }

                        const ticketCode = this.extractCode(code)
                        if (!ticketCode) {
                            this.statusText = '二维码内容无效'
                            this.addResult(code, '二维码无效')
                            await this.sleep(800)
                            continue
                        }

                        if (this.recentCodes.has(ticketCode)) {
                            this.statusText = `重复扫码：${ticketCode}`
                            this.addResult(ticketCode, '重复扫码（短期内）')
                            await this.sleep(600)
                            continue
                        }

                        this.recentCodes.add(ticketCode)
                        setTimeout(() => this.recentCodes.delete(ticketCode), 10000)

                        this.statusText = `提交核销：${ticketCode}`
                        const resp = await api.request({ url: `/api/ticket/check-in?ticketCode=${encodeURIComponent(ticketCode)}`, method: 'POST' })

                        if (resp?.success) {
                            this.statusText = `核销成功：${ticketCode}`
                            this.addResult(ticketCode, resp?.message || '核销成功')
                            try { uni.$emit && uni.$emit('tickets:refresh') } catch (e) { }
                        } else {
                            this.statusText = `核销失败：${resp?.message || '失败'}`
                            this.addResult(ticketCode, resp?.message || '核销失败')
                        }
                    } catch (e) {
                        if (!this.scanning) break
                        this.statusText = '拍照或解码出错，继续等待...'
                    }
                    await this.sleep(800)
                }
            } finally {
                this.scanLoopRunning = false
            }
        },

        takePhotoAndDecode() {
            return new Promise((resolve, reject) => {
                const cam = this.$refs.camera
                if (!cam || !cam.takePhoto) {
                    // 回退到扫码 API
                    uni.scanCode({ onlyFromCamera: true, success: (r) => resolve(r.result || r.path || ''), fail: () => resolve('') })
                    return
                }
                cam.takePhoto({
                    quality: 'high', success: (p) => {
                        const tempPath = p.tempImagePath || p.tempFilePath || ''
                        if (!tempPath) return resolve('')
                        // 上传到 qrserver 解码
                        uni.uploadFile({
                            url: 'https://api.qrserver.com/v1/read-qr-code/',
                            filePath: tempPath,
                            name: 'file',
                            success: (uploadRes) => {
                                try {
                                    const body = JSON.parse(uploadRes.data || '[]')
                                    const decoded = (body && body[0] && body[0].symbol && body[0].symbol[0] && body[0].symbol[0].data) || ''
                                    resolve(decoded || '')
                                } catch (e) { resolve('') }
                            },
                            fail: () => resolve('')
                        })
                    }, fail: () => resolve('')
                })
            })
        },
        extractCode(str) {
            try {
                if (str.indexOf('=') > -1) {
                    const idx = str.indexOf('?')
                    const query = idx > -1 ? str.substring(idx + 1) : str
                    const pairs = query.split('&')
                    for (const p of pairs) {
                        const [k, v] = p.split('=')
                        if (!k) continue
                        const key = decodeURIComponent(k)
                        const val = v ? decodeURIComponent(v) : ''
                        if (key === 'ticketCode' || key === 'code') return val
                    }
                }
            } catch (e) { }
            return str
        },
        sleep(ms) { return new Promise(r => setTimeout(r, ms)) },
        now() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}` }
        ,
        addResult(code, message) {
            const item = { _id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, code, message, time: this.now(), _fade: false }
            this.results.unshift(item)
            // 保证最多显示两条
            while (this.results.length > 2) this.results.pop()
            // 3 秒后开始渐隐，额外 600ms 后移除
            setTimeout(() => {
                item._fade = true
            }, 3000)
            setTimeout(() => {
                const idx = this.results.findIndex(r => r._id === item._id)
                if (idx > -1) this.results.splice(idx, 1)
            }, 3600)
        },
    }
}
</script>

<style scoped>
.page {
    padding: 0;
    background: #000;
    min-height: 100vh;
    position: relative;
    overflow: hidden;
}

.scan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx
}

.scan-title {
    font-size: 34rpx;
    font-weight: 800;
    color: #1e293b
}

.controls {
    display: flex;
    gap: 12rpx
}

.ctrl-btn {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: #fff;
    padding: 12rpx 28rpx;
    border-radius: 12rpx;
    font-size: 26rpx
}

.ctrl-btn.ghost {
    background: #fff;
    color: #7c3aed;
    border: 1px solid #eae6ff
}

.preview-area {
    background: #fff;
    border-radius: 16rpx;
    padding: 28rpx;
    text-align: center;
    box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.04);
    margin-bottom: 18rpx
}

.status {
    font-size: 26rpx;
    color: #334155
}

.camera-preview {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100vh;
    z-index: 1;
    background: #000;
}

.scan-overlay {
    position: absolute;
    left: 0;
    right: 0;
    top: 12vh;
    bottom: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    pointer-events: none;
}

.scan-frame {
    width: 480rpx;
    height: 480rpx;
    border: 0rpx solid rgba(255, 255, 255, 0.0);
    position: relative;
}

.scan-frame .corner {
    position: absolute;
    width: 36rpx;
    height: 36rpx
}

.scan-frame .corner.top-left {
    left: -6rpx;
    top: -6rpx;
    border-top-left-radius: 6rpx;
    box-shadow: 0 0 0 6rpx rgba(139, 92, 246, 0.12) inset
}

.scan-frame .corner.top-right {
    right: -6rpx;
    top: -6rpx;
    border-top-right-radius: 6rpx;
    box-shadow: 0 0 0 6rpx rgba(139, 92, 246, 0.12) inset
}

.scan-frame .corner.bottom-left {
    left: -6rpx;
    bottom: -6rpx;
    border-bottom-left-radius: 6rpx;
    box-shadow: 0 0 0 6rpx rgba(139, 92, 246, 0.12) inset
}

.scan-frame .corner.bottom-right {
    right: -6rpx;
    bottom: -6rpx;
    border-bottom-right-radius: 6rpx;
    box-shadow: 0 0 0 6rpx rgba(139, 92, 246, 0.12) inset
}

.results {
    display: flex;
    flex-direction: column;
    gap: 12rpx
}

.bottom-results {
    position: absolute;
    left: 12rpx;
    right: 12rpx;
    bottom: 24rpx;
    z-index: 50;
    max-height: 36vh;
    overflow: auto;
}

.result-item {
    background: #fff;
    padding: 16rpx;
    border-radius: 12rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.03)
}

.result-item.fading {
    opacity: 0;
    transform: translateY(6rpx);
    transition: opacity 600ms ease, transform 600ms ease
}

.code {
    font-family: monospace;
    color: #7c3aed;
    font-size: 22rpx
}

.msg {
    color: #334155;
    font-size: 20rpx
}

.time {
    color: #94a3b8;
    font-size: 18rpx
}
</style>
