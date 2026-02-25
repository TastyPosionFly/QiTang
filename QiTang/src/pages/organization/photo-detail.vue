<template>
    <view class="page">
        <view class="close-btn" @tap="goBack">
            <text>✕</text>
        </view>
        
        <view v-if="loading" class="state">加载中...</view>
        <view v-else-if="photos.length" id="photoSlider" class="photo-slider" ref="photoSlider" @touchstart.stop.prevent="onTouchStart" @touchmove.stop.prevent="onTouchMove" @touchend.stop.prevent="onTouchEnd">
            <view class="photo-track" :style="trackStyle">
                <view class="slide" v-for="(photo, idx) in photos" :key="photo.id || idx">
                    <image class="photo" :src="resolveAvatar(photo.photoUrl || photo.url)" mode="aspectFit" @tap="goBack"></image>
                </view>
            </view>
        </view>

        <view v-if="photos.length" class="info-panel">
            <view class="info-title">{{ (currentPhoto && currentPhoto.description) || '暂无描述' }}</view>
            <view class="info-details">
                <view class="info-row">
                    <text class="info-label">上传者：</text>
                    <text class="info-value">{{ (currentPhoto && (currentPhoto.uploader?.nickname || currentPhoto?.uploader?.name)) || '未知' }}</text>
                </view>
                <view class="info-row">
                    <text class="info-label">上传时间：</text>
                    <text class="info-value">{{ currentPhoto ? formatUploadTime(currentPhoto.uploadTime) : '未知' }}</text>
                </view>
            </view>
        </view>
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
                photos: [],
                loading: false,
                currentPhotoIndex: 0,
                downloadedMap: {},
                loadingPreview: false,
                containerWidth: 0,
                dragOffset: 0,
                isDragging: false,
                transitioning: false,
                _touchStartX: 0,
                _touchStartY: 0,
                _touchStartTime: 0,
                _touchMoved: false
            }
        },
        
        onLoad(options) {
            this.orgId = options.orgId || ''
            this.currentPhotoIndex = parseInt(options.photoIndex || '0')
            if (!this.orgId) {
                showError('缺少组织编号')
                return
            }
            // 优先从本地缓存读取相册数据以便快速显示，若无则发起请求
            try {
                const raw = uni.getStorageSync(`album_photos_${this.orgId}`)
                if (raw) {
                    this.photos = Array.isArray(raw) ? raw : JSON.parse(raw)
                }
            } catch (e) {
                // ignore parse errors
            }
            // 如果已经从缓存获取到数据，则先展示并在后台静默刷新最新数据
            if (this.photos && this.photos.length) {
                // 触发静默刷新（不显示 loading）
                this.fetchPhotos(true)
            } else {
                this.fetchPhotos()
            }
            // 延迟获取容器宽度
            this.$nextTick(() => {
                const query = uni.createSelectorQuery().in(this)
                query.select('#photoSlider').boundingClientRect(rect => {
                    if (rect && rect.width) this.containerWidth = rect.width
                }).exec()
            })
        },
        watch: {
            currentPhotoIndex() {
                this.prefetchSurroundingImages()
            }
        },
        computed: {
            currentPhoto() {
                if (this.photos && this.photos.length > this.currentPhotoIndex) {
                    return this.photos[this.currentPhotoIndex]
                }
                return null
            },
            trackStyle() {
                const w = this.containerWidth || 0
                const translate = -this.currentPhotoIndex * w + (this.dragOffset || 0)
                return {
                    transform: `translateX(${translate}px)`,
                    transition: this.isDragging ? 'none' : 'transform 300ms ease'
                }
            }
        },
        methods: {
            resolveAvatar,
            fetchPhotos(silent = false) {
                if (!silent) this.loading = true
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
                            try {
                                uni.setStorageSync(`album_photos_${this.orgId}`, JSON.stringify(this.photos || []))
                            } catch (e) {
                                // ignore
                            }
                            // 触发预下载当前及相邻图片以减少预览等待
                            this.$nextTick(() => {
                                this.prefetchSurroundingImages()
                            })
                        } else {
                            showError(res?.message || '获取照片失败')
                        }
                    })
                    .catch(() => {
                        showError('请求失败')
                    })
                    .finally(() => {
                        if (!silent) this.loading = false
                    })
            },
            // 预下载当前、前一张、后一张图片到临时文件，保存在 downloadedMap
            prefetchSurroundingImages() {
                const indices = [this.currentPhotoIndex - 1, this.currentPhotoIndex, this.currentPhotoIndex + 1]
                indices.forEach(i => {
                    if (i < 0 || i >= this.photos.length) return
                    const url = this.resolveAvatar(this.photos[i].photoUrl || this.photos[i].url)
                    if (this.downloadedMap[url]) return
                    try {
                        uni.downloadFile({
                            url,
                            success: (res) => {
                                if (res.statusCode === 200 && res.tempFilePath) {
                                    this.$set ? this.$set(this.downloadedMap, url, res.tempFilePath) : (this.downloadedMap[url] = res.tempFilePath)
                                }
                            }
                        })
                    } catch (e) {
                        // ignore
                    }
                })
            },

            // Tap to exit is handled on tap; the touch handlers below implement drag/swipe with animation
            onTouchStart(e) {
                const t = (e.touches && e.touches[0]) || {}
                this._touchStartX = t.clientX || t.pageX || 0
                this._touchStartY = t.clientY || t.pageY || 0
                this._touchStartTime = Date.now()
                this._touchMoved = false
                this.isDragging = true
                this.dragOffset = 0
                this.transitioning = false
            },
            onTouchMove(e) {
                if (!this.isDragging) return
                const t = (e.touches && e.touches[0]) || {}
                const dx = (t.clientX || t.pageX || 0) - (this._touchStartX || 0)
                const dy = (t.clientY || t.pageY || 0) - (this._touchStartY || 0)
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._touchMoved = true
                // 边界阻尼效果
                if ((this.currentPhotoIndex === 0 && dx > 0) || (this.currentPhotoIndex === this.photos.length - 1 && dx < 0)) {
                    this.dragOffset = dx * 0.35
                } else {
                    this.dragOffset = dx
                }
            },
            onTouchEnd(e) {
                if (!this.isDragging) return
                this.isDragging = false
                const endTime = Date.now()
                const duration = endTime - (this._touchStartTime || endTime)
                const changedTouches = (e.changedTouches && e.changedTouches[0]) || {}
                const endX = changedTouches.clientX || changedTouches.pageX || this._touchStartX || 0
                const endY = changedTouches.clientY || changedTouches.pageY || this._touchStartY || 0
                const dx = endX - (this._touchStartX || 0)
                const dy = endY - (this._touchStartY || 0)

                // Tap (短时间、位移极小) -> 退出
                if (!this._touchMoved && duration < 250 && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
                    this.goBack()
                    this.dragOffset = 0
                    return
                }

                const absDx = Math.abs(dx)
                const SWIPE_THRESHOLD = Math.max(50, (this.containerWidth || 0) * 0.2)
                if (absDx > SWIPE_THRESHOLD && absDx > Math.abs(dy)) {
                    if (dx < 0) {
                        if (this.currentPhotoIndex < this.photos.length - 1) this.currentPhotoIndex++
                    } else {
                        if (this.currentPhotoIndex > 0) this.currentPhotoIndex--
                    }
                }

                // 开启动画回位/切换
                this.transitioning = true
                // 重置偏移，trackStyle 中会应用过渡
                this.dragOffset = 0
                setTimeout(() => {
                    this.transitioning = false
                }, 320)
            },
            formatUploadTime(timeStr) {
                if (!timeStr) return '未知'
                try {
                    const date = new Date(timeStr)
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    const hours = String(date.getHours()).padStart(2, '0')
                    const minutes = String(date.getMinutes()).padStart(2, '0')
                    return `${year}-${month}-${day} ${hours}:${minutes}`
                } catch (e) {
                    return timeStr
                }
            },
            goBack() {
                uni.navigateBack()
            },
            previousPhoto() {
                if (this.currentPhotoIndex > 0) {
                    this.currentPhotoIndex--
                }
            },
            nextPhoto() {
                if (this.currentPhotoIndex < this.photos.length - 1) {
                    this.currentPhotoIndex++
                }
            }
        }
    }
</script>

<style>
    .page {
        min-height: 100vh;
        background-color: #000000;
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .close-btn {
        position: absolute;
        top: 20rpx;
        right: 20rpx;
        width: 60rpx;
        height: 60rpx;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }

    .close-btn text {
        font-size: 36rpx;
        color: #ffffff;
        font-weight: 300;
    }

    .state {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26rpx;
        color: #ffffff;
    }

    .photo-container {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40rpx;
        box-sizing: border-box;
    }

    .photo-slider {
        height: 80vh; /* 图片区域占 80% 视口高度 */
        position: relative;
        overflow: hidden;
        display: block;
        background: #000000;
    }

    .photo-track {
        display: flex;
        height: 100%;
        will-change: transform;
    }

    .slide {
        flex: 0 0 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 24rpx 20rpx;
        box-sizing: border-box;
    }

    .photo {
        max-width: 100%;
        max-height: 100%;
        display: block;
    }

    .info-panel {
        height: 20vh; /* 信息面板占 20% 视口高度 */
        background: #ffffff;
        padding: 16rpx 20rpx;
        border-radius: 20rpx 20rpx 0 0;
        box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.1);
        overflow: hidden;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .info-title {
        font-size: 28rpx;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 16rpx;
        line-height: 1.4;
    }

    .info-details {
        display: flex;
        flex-direction: column;
        gap: 12rpx;
        margin-bottom: 24rpx;
    }

    .info-row {
        display: flex;
        align-items: flex-start;
        gap: 12rpx;
    }

    .info-label {
        font-size: 24rpx;
        color: #64748b;
        min-width: 100rpx;
        font-weight: 500;
        flex-shrink: 0;
    }

    .info-value {
        font-size: 24rpx;
        color: #0f172a;
        flex: 1;
        word-break: break-word;
    }

    .nav-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12rpx;
        padding-top: 16rpx;
        border-top: 1rpx solid #e2e8f0;
    }

    .nav-btn {
        padding: 12rpx 24rpx;
        font-size: 24rpx;
        border-radius: 8rpx;
        background: #f1f5f9;
        color: #0f172a;
        border: none;
        flex: 1;
        height: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nav-btn[disabled] {
        opacity: 0.4;
    }

    .photo-counter {
        font-size: 24rpx;
        color: #64748b;
        font-weight: 500;
        text-align: center;
        flex: 0.8;
    }

    .state {
        padding: 60rpx;
        text-align: center;
    }
</style>

