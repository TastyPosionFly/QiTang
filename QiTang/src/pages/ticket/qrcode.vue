<template>
    <view class="page">
        <image v-if="bg" :src="bg" class="bg-image" mode="aspectFill"></image>
        <view class="overlay"></view>

        <view class="card">
            <!-- 电子票装饰圆孔 -->
            <view class="ticket-dot left"></view>
            <view class="ticket-dot right"></view>

            <text class="title">{{ title || '电子票' }}</text>

            <view class="qr-box" v-if="code">
                <image :src="qrUrl" class="qr-image" mode="aspectFit"></image>
            </view>
            <view class="qr-box" v-else>
                <text class="error-tip">二维码生成中...</text>
            </view>

            <view class="ticket-footer-info">
                <text class="footer-tip">请扫码入场</text>
            </view>

            <view class="actions">
                <button class="save-btn" @tap="saveToAlbum">
                    <text class="btn-icon">📥</text>
                    <text>保存到相册</text>
                </button>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            code: '',
            bg: '',
            title: ''
        }
    },
    computed: {
        qrUrl() {
            if (!this.code) return ''
            const data = encodeURIComponent(this.code)
            // 使用外部 API 生成二维码图片，尺寸可调整；确保服务器请求允许
            return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${data}`
        }
    },
    onLoad(options) {
        // options 由 navigateTo 的 query 提供
        if (options.code) this.code = decodeURIComponent(options.code)
        if (options.bg) this.bg = decodeURIComponent(options.bg)
        if (options.performancePosterUrl) this.bg = decodeURIComponent(options.performancePosterUrl)
        if (options.performanceTitle) this.title = decodeURIComponent(options.performanceTitle)
        else if (options.title) this.title = decodeURIComponent(options.title)
    },
    methods: {
        saveToAlbum() {
            const url = this.qrUrl
            uni.showLoading({ title: '正在保存' })
            uni.downloadFile({
                url,
                success: (res) => {
                    if (res.statusCode === 200) {
                        uni.saveImageToPhotosAlbum({
                            filePath: res.tempFilePath,
                            success: () => {
                                uni.showToast({ title: '已保存到相册', icon: 'success' })
                            },
                            fail: (err) => {
                                console.warn('save fail', err)
                                uni.showToast({ title: '保存失败', icon: 'none' })
                            },
                            complete: () => uni.hideLoading()
                        })
                    } else {
                        uni.hideLoading()
                        uni.showToast({ title: '下载失败', icon: 'none' })
                    }
                },
                fail: () => {
                    uni.hideLoading()
                    uni.showToast({ title: '下载失败', icon: 'none' })
                }
            })
        }
    }
}
</script>

<style scoped>
.page {
    position: relative;
    min-height: 100vh;
    background: #f6f8fc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bg-image {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
}

.overlay {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 1;
}

.card {
    position: relative;
    z-index: 2;
    width: 650rpx;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(20rpx);
    -webkit-backdrop-filter: blur(20rpx);
    border-radius: 40rpx;
    padding: 60rpx 40rpx 50rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 30rpx 60rpx rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 装饰圆孔 */
.ticket-dot {
    position: absolute;
    top: 130rpx;
    /* 调整位置匹配标题下方 */
    width: 32rpx;
    height: 32rpx;
    background: #111;
    /* 背景色取决于外部 overlay */
    border-radius: 50%;
    z-index: 3;
    filter: blur(2rpx);
}

.ticket-dot.left {
    left: -16rpx;
}

.ticket-dot.right {
    right: -16rpx;
}

.title {
    font-size: 38rpx;
    color: #1e293b;
    font-weight: 800;
    margin-bottom: 50rpx;
    letter-spacing: 2rpx;
}

.qr-box {
    background: #ffffff;
    padding: 24rpx;
    border-radius: 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04) inset;
    border: 1px solid #f1f5f9;
    margin-bottom: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.qr-image {
    width: 480rpx;
    height: 480rpx;
}

.error-tip {
    font-size: 24rpx;
    color: #94a3b8;
    height: 480rpx;
    width: 480rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ticket-footer-info {
    margin-bottom: 50rpx;
}

.footer-tip {
    font-size: 24rpx;
    color: #94a3b8;
    background: #f8fafc;
    padding: 8rpx 30rpx;
    border-radius: 100rpx;
}

.actions {
    width: 100%;
    display: flex;
    justify-content: center;
}

.save-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #fff;
    border-radius: 100rpx;
    padding: 0 60rpx;
    height: 100rpx;
    line-height: 100rpx;
    font-size: 30rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16rpx 32rpx rgba(124, 58, 237, 0.25);
    border: none;
    transition: transform 0.2s active;
}

.save-btn:active {
    transform: scale(0.97);
}

.btn-icon {
    margin-right: 12rpx;
    font-size: 34rpx;
}

/* view button removed per request */
</style>
