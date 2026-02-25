<template>
    <view class="page">
        <!-- 页面头部 -->
        <view class="header">
            <view class="header-content">
                <text class="title">热门管理</text>
                <text class="subtitle">人工推荐与首页轮播配置</text>
            </view>
            <view class="header-decoration"></view>
        </view>

        <!-- 搜索控制区 -->
        <view class="card search-card">
            <view class="card-header">
                <text class="card-icon">🔍</text>
                <text class="card-title">筛选演出</text>
            </view>
            <view class="search-row">
                <view class="input-wrapper">
                    <input v-model="keyword" placeholder="搜索演出（名称/关键词）" class="search-input" confirm-type="search"
                        @confirm="searchPerf" @input="onSearchInput" />
                </view>
                <button class="primary-btn search-btn" @tap="searchPerf">搜索</button>
            </view>
            <view class="hint">选取演出后，可将其添加至首页轮播或分类置顶。</view>
        </view>

        <!-- 搜索结果列表 -->
        <view v-if="searchResults.length > 0 || searching" class="results-container">
            <view class="section-label">搜索结果</view>
            <scroll-view class="results-scroll" scroll-y>
                <view v-if="searching" class="state-loading">
                    <text class="loading-icon">⏳</text>
                    <text>搜索中...</text>
                </view>
                <view v-else-if="searchResults.length === 0" class="state-empty">无匹配结果</view>
                <view v-else class="perf-list">
                    <view v-for="p in searchResults" :key="p.id" class="perf-item-card" @tap="openAddModal(p)">
                        <image :src="p.coverUrl || defaultCover" class="perf-thumb" mode="aspectFill" />
                        <view class="perf-info">
                            <text class="perf-name">{{ p.name }}</text>
                            <text class="perf-desc">{{ p.displaySessions && p.displaySessions[0] ?
                                formatSessionBrief(p.displaySessions[0]) : '暂无排期' }}</text>
                        </view>
                        <view class="perf-action">
                            <text class="add-icon">+</text>
                        </view>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 当前配置列表 -->
        <view class="card config-card">
            <view class="list-header">
                <view class="lh-left">
                    <text class="card-icon">✨</text>
                    <text class="card-title">当前配置</text>
                </view>
                <view class="lh-right">
                    <picker mode="selector" :range="viewTypeOptions" :value="selectedViewTypeIndex"
                        @change="onViewTypeChange">
                        <view class="type-picker">
                            <text>{{ viewTypeOptions[selectedViewTypeIndex] || '全部类型' }}</text>
                            <text class="picker-arrow">▾</text>
                        </view>
                    </picker>
                    <view class="refresh-btn" @tap="fetchConfigs">
                        <text class="refresh-icon">🔄</text>
                    </view>
                </view>
            </view>

            <view v-if="loadingConfigs" class="state-loading">
                <text class="loading-icon">⏳</text>
                <text>加载中...</text>
            </view>
            <view v-else-if="configs.length === 0" class="state-empty">
                <text>暂无推荐内容</text>
            </view>
            <view v-else class="config-list">
                <view v-for="cfg in configs" :key="cfg.id" class="config-item">
                    <view class="cfg-main">
                        <view class="cfg-badge" :class="'type-' + cfg.type">{{ typeLabel(cfg.type) }}</view>
                        <text class="cfg-title">{{ cfg.performanceTitle }}</text>
                        <view class="cfg-details">
                            <text class="cfg-detail-item">权重: {{ cfg.sortOrder || 0 }}</text>
                            <text class="cfg-detail-divider">|</text>
                            <text class="cfg-detail-item">{{ fmtDate(cfg.startTime) }} 至 {{ fmtDate(cfg.endTime)
                            }}</text>
                        </view>
                    </view>
                    <view class="cfg-action" @tap="deleteConfig(cfg.id)">
                        <text class="delete-icon">🗑️</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="configPage + 1 < configTotalPages" class="load-more" @tap="loadMoreConfigs">
            <text v-if="loadingMoreConfigs">加载中...</text>
            <text v-else>点击加载更多</text>
        </view>

        <!-- 添加推荐模态框 -->
        <view v-if="showAdd" class="modal-mask">
            <view class="modal-content" @tap.stop>
                <view class="modal-header">
                    <text class="modal-title">添加推荐配置</text>
                    <text class="modal-subtitle">{{ selPerf.name }}</text>
                    <view class="close-btn" @tap="closeAdd">✕</view>
                </view>

                <view class="form-container">
                    <view class="form-item">
                        <text class="form-label">推荐位置</text>
                        <picker mode="selector" :range="typeOptions" :value="form.type - 1" @change="onTypeChange">
                            <view class="form-picker">
                                <text>{{ typeOptions[form.type - 1] || typeOptions[0] }}</text>
                                <text class="picker-arrow">▾</text>
                            </view>
                        </picker>
                    </view>

                    <view class="form-item">
                        <text class="form-label">排序权重</text>
                        <input v-model.number="form.sortOrder" type="number" placeholder="数字越大越靠前" class="form-input" />
                    </view>

                    <view class="form-item">
                        <text class="form-label">开始时间</text>
                        <view class="form-picker" @tap="openStartSelector">
                            <text>{{ startPickerLabel || '请选择开始时间' }}</text>
                            <text class="picker-arrow">▾</text>
                        </view>
                    </view>

                    <view class="form-item">
                        <text class="form-label">结束时间</text>
                        <view class="form-picker" @tap="openEndSelector">
                            <text>{{ endPickerLabel || '请选择结束时间 (可选)' }}</text>
                            <text class="picker-arrow">▾</text>
                        </view>
                    </view>
                </view>

                <view class="modal-footer">
                    <button class="ghost-btn" @tap="closeAdd">取消</button>
                    <button class="primary-btn" @tap="submitAdd">确定添加</button>
                </view>
            </view>
        </view>

        <!-- 升级版：嵌入式日期时间选择器 -->
        <view v-if="showStartSelector || showEndSelector" class="dt-picker-mask" @tap="closeSelectors">
            <view class="dt-picker-card" @tap.stop>
                <view class="dt-header">
                    <view class="dt-header-side">
                        <text class="dt-cancel" @tap="closeSelectors">取消</text>
                    </view>
                    <text class="dt-title">{{ showStartSelector ? '选择开始时间' : '选择结束时间' }}</text>
                    <view class="dt-header-side">
                        <text class="dt-confirm" @tap="confirmSelector">确定</text>
                    </view>
                </view>
                <picker-view class="dt-picker-view" :value="tempPickerValues" @change="onPickerViewChange"
                    immediate-change="true" @touchstart.stop @touchmove.stop>
                    <picker-view-column>
                        <view v-for="(item, index) in dateOptions" :key="index" class="dt-item">{{ item }}</view>
                    </picker-view-column>
                    <picker-view-column>
                        <view v-for="(item, index) in hourOptions" :key="index" class="dt-item">{{ item }}</view>
                    </picker-view-column>
                </picker-view>
            </view>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'

export default {
    components: {},
    data() {
        return {
            keyword: '',
            searching: false,
            searchResults: [],
            defaultCover: '/static/default-performance.png',
            // 本地防抖计时器（用于自动搜索）
            searchTimer: null,

            configs: [],
            loadingConfigs: false,
            configPage: 0,
            configSize: 20,
            configTotalPages: 0,
            configTotalElements: 0,
            loadingMoreConfigs: false,

            // view type selector
            // viewTypeOptions index: 0 => 全部, 1 => 首页轮播(1), 2 => 列表置顶(2)
            viewTypeOptions: ['全部', '首页轮播', '列表置顶'],
            selectedViewTypeIndex: 0,
            selectedViewType: null,
            typeMap: { 1: '首页轮播', 2: '列表置顶' },

            // add modal
            showAdd: false,
            selPerf: {},
            typeOptions: ['首页轮播', '列表置顶'],
            form: { type: 2, sortOrder: 0, startTime: '', endTime: '' },
            // picker 显示文本（用于 datetime picker）
            startPickerLabel: '',
            endPickerLabel: ''
            ,
            // custom selector state
            dateOptions: [],
            hourOptions: [],
            showStartSelector: false,
            showEndSelector: false,
            // 临时存储选择器组件的选择值 [dateIdx, hourIdx]
            tempPickerValues: [0, 0]
        }
    },
    onShow() {
        this.fetchConfigs(0)
    },
    methods: {
        formatSessionBrief(s) {
            if (!s || !s.startTime) return '时间待定'
            const dt = new Date(s.startTime)
            return `${dt.getMonth() + 1}月${dt.getDate()}日 ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`
        },
        fmtDate(t) {
            if (!t) return '永久'
            try {
                // 处理 ISO 格式
                const d = new Date(t)
                if (isNaN(d.getTime())) return t
                return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
            } catch (e) {
                return t
            }
        },
        fmt(t) { return t || '-' },
        async searchPerf() {
            if (!this.keyword) {
                // 无关键词时不弹提示，保持无感知自动搜索行为
                this.searchResults = []
                return
            }
            this.searching = true
            try {
                const params = { page: 0, size: 10, keyword: this.keyword }
                const res = await api.request({ url: '/api/performance/list', method: 'GET', data: params })
                if (res && res.success) {
                    // 支持 Page<T> 或 Array<T>
                    const payload = res.data
                    const list = payload?.content || (Array.isArray(payload) ? payload : [])
                    this.searchResults = list.map(item => {
                        const perf = item.performance || item
                        return {
                            id: perf.id || item.performanceId || item.id,
                            name: perf.title || perf.name || perf.description || item.title || item.name || '未命名演出',
                            coverUrl: perf.posterUrl || perf.coverUrl || item.posterUrl || item.coverUrl,
                            displaySessions: perf.sessions || item.sessions || []
                        }
                    })
                } else {
                    this.searchResults = []
                }
            } catch (e) {
                this.searchResults = []
            } finally {
                this.searching = false
            }
        },
        openAddModal(perf) {
            this.selPerf = perf
            // 默认开始时间为当前整点（精确到小时）
            const now = new Date()
            now.setMinutes(0, 0, 0)
            const y = now.getFullYear()
            const m = String(now.getMonth() + 1).padStart(2, '0')
            const d = String(now.getDate()).padStart(2, '0')
            const hh = String(now.getHours()).padStart(2, '0')
            const label = `${y}-${m}-${d} ${hh}:00`
            this.form = { type: 2, sortOrder: 0, startTime: `${y}-${m}-${d}T${hh}:00:00`, endTime: null }
            this.startPickerLabel = label
            this.endPickerLabel = ''
            this.showAdd = true
        },
        closeAdd() { this.showAdd = false; this.selPerf = {} },
        async submitAdd() {
            if (!this.selPerf || !this.selPerf.id) {
                uni.showToast({ title: '请选择演出', icon: 'none' })
                return
            }
            // CreateRecommendationCmd expects LocalDateTime (ISO-like without timezone).
            const payload = {
                performanceId: Number(this.selPerf.id),
                type: Number(this.form.type || 2),
                sortOrder: this.form.sortOrder || 0,
                startTime: this.form.startTime ? this.form.startTime : null,
                endTime: this.form.endTime ? this.form.endTime : null
            }
            uni.showLoading({ title: '提交中' })
            try {
                const res = await api.request({ url: '/api/recommendation/admin/add', method: 'POST', data: payload })
                uni.hideLoading()
                if (res && res.success) {
                    uni.showToast({ title: '添加成功', icon: 'success' })
                    this.showAdd = false
                    this.fetchConfigs(0)
                } else {
                    uni.showToast({ title: res?.message || '添加失败', icon: 'none' })
                }
            } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: '请求失败', icon: 'none' })
            }
        },
        async fetchConfigs(requestPage = 0) {
            // 防止事件对象被误传
            if (requestPage && typeof requestPage === 'object') requestPage = 0
            if (!this.configs) this.configs = []

            const isLoadMore = requestPage > 0
            if (isLoadMore) {
                if (this.loadingMoreConfigs) return
                this.loadingMoreConfigs = true
            } else {
                if (this.loadingConfigs) return
                this.loadingConfigs = true
                this.configs = []
            }

            try {
                const params = { page: requestPage, size: this.configSize }
                if (this.selectedViewType != null) params.type = this.selectedViewType
                const res = await api.request({ url: '/api/recommendation/admin/config/list', method: 'GET', data: params })
                if (res && res.success) {
                    const payload = res.data || res
                    // 兼容多种后端包装形式
                    let content = []
                    if (Array.isArray(payload)) content = payload
                    else if (Array.isArray(payload.content)) content = payload.content
                    else if (Array.isArray(payload.data)) content = payload.data
                    else if (Array.isArray(payload.content?.content)) content = payload.content.content

                    // 将 PerformanceRecommendation 映射为前端显示项（保留 performance 对象并补充 title）
                    const mapped = content.map(c => {
                        const perf = c.performance || null
                        const title = c.performanceTitle || perf?.title || perf?.name || perf?.description || c.performanceName || c.title || c.name || '未命名演出'
                        return {
                            id: c.id,
                            performance: perf,
                            performanceTitle: title,
                            type: c.type,
                            sortOrder: c.sortOrder,
                            startTime: c.startTime,
                            endTime: c.endTime,
                            createTime: c.createTime
                        }
                    })
                    if (isLoadMore) this.configs = [...this.configs, ...mapped]
                    else this.configs = mapped
                    this.configTotalPages = payload.totalPages || payload.total_pages || (Array.isArray(payload) ? 1 : 0)
                    this.configTotalElements = payload.totalElements || payload.total_elements || this.configs.length
                    this.configPage = requestPage
                } else {
                    if (!isLoadMore) this.configs = []
                }
            } catch (e) {
                // 请求失败，保持空列表
                if (!isLoadMore) this.configs = []
            } finally {
                this.loadingConfigs = false
                this.loadingMoreConfigs = false
            }
        },

        // selector 控制器
        openStartSelector() {
            this.buildDateHourOptions();
            // 根据当前 startTime 设置初始索引
            const current = this.form.startTime ? new Date(this.form.startTime) : new Date();
            this.setPickerValuesFromDate(current);
            this.showStartSelector = true;
            this.showEndSelector = false;
        },
        openEndSelector() {
            this.buildDateHourOptions();
            // 根据当前 endTime 设置初始索引
            const current = this.form.endTime ? new Date(this.form.endTime) : new Date();
            this.setPickerValuesFromDate(current);
            this.showEndSelector = true;
            this.showStartSelector = false;
        },
        setPickerValuesFromDate(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            const hourStr = String(date.getHours()).padStart(2, '0') + ':00'

            let dIdx = this.dateOptions.indexOf(dateStr);
            let hIdx = this.hourOptions.indexOf(hourStr);

            this.tempPickerValues = [dIdx > -1 ? dIdx : 0, hIdx > -1 ? hIdx : 0];
        },
        onPickerViewChange(e) {
            this.tempPickerValues = e.detail.value;
        },
        confirmSelector() {
            const dIdx = this.tempPickerValues[0];
            const hIdx = this.tempPickerValues[1];
            const dateStr = this.dateOptions[dIdx]; // "2023-10-27"
            const hourStr = this.hourOptions[hIdx].split(':')[0]; // "09"

            // 构造最终时间 Date 对象用于比较
            const finalDate = new Date(`${dateStr}T${hourStr}:00:00`);
            const finalTime = `${dateStr}T${hourStr}:00:00`;
            const label = `${dateStr} ${hourStr}:00`;

            if (this.showStartSelector) {
                // 如果已有结束时间且结束时间 <= 选择的开始时间，自动把结束时间设为开始时间后 1 小时
                if (this.form.endTime) {
                    const endDate = new Date(this.form.endTime);
                    if (finalDate >= endDate) {
                        const newEnd = new Date(finalDate);
                        newEnd.setHours(newEnd.getHours() + 1);
                        const y2 = newEnd.getFullYear();
                        const m2 = String(newEnd.getMonth() + 1).padStart(2, '0');
                        const d2 = String(newEnd.getDate()).padStart(2, '0');
                        const hh2 = String(newEnd.getHours()).padStart(2, '0');
                        this.form.endTime = `${y2}-${m2}-${d2}T${hh2}:00:00`;
                        this.endPickerLabel = `${y2}-${m2}-${d2} ${hh2}:00`;
                        uni.showToast({ title: '结束时间已自动调整为开始后 1 小时', icon: 'none' });
                    }
                }
                this.form.startTime = finalTime;
                this.startPickerLabel = label;
            } else {
                // 选择结束时间：如果已有开始时间且结束时间 <= 开始时间，则自动将开始时间设为结束前 1 小时
                if (this.form.startTime) {
                    const startDate = new Date(this.form.startTime);
                    if (finalDate <= startDate) {
                        const newStart = new Date(finalDate);
                        newStart.setHours(newStart.getHours() - 1);
                        const y1 = newStart.getFullYear();
                        const m1 = String(newStart.getMonth() + 1).padStart(2, '0');
                        const d1 = String(newStart.getDate()).padStart(2, '0');
                        const hh1 = String(newStart.getHours()).padStart(2, '0');
                        this.form.startTime = `${y1}-${m1}-${d1}T${hh1}:00:00`;
                        this.startPickerLabel = `${y1}-${m1}-${d1} ${hh1}:00`;
                        uni.showToast({ title: '开始时间已自动调整为结束前 1 小时', icon: 'none' });
                    }
                }
                this.form.endTime = finalTime;
                this.endPickerLabel = label;
            }
            this.closeSelectors();
        },
        closeSelectors() {
            this.showStartSelector = false;
            this.showEndSelector = false;
        },
        buildDateHourOptions() {
            // 构建未来 365 天日期选项
            const dates = []
            const today = new Date()
            for (let i = 0; i < 365; i++) {
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                dates.push(`${y}-${m}-${day}`)
            }
            this.dateOptions = dates
            const hours = []
            for (let h = 0; h < 24; h++) hours.push(String(h).padStart(2, '0') + ':00')
            this.hourOptions = hours
        },



        loadMoreConfigs() {
            if (this.configPage + 1 >= this.configTotalPages) return
            this.fetchConfigs(this.configPage + 1)
        },
        onTypeChange(e) {
            // picker 返回索引
            const idx = Number(e?.detail?.value)
            this.form.type = (idx >= 0) ? (idx + 1) : 2
        },
        onSearchInput() {
            // 自动搜索：防抖 400ms
            if (this.searchTimer) clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => {
                this.searchPerf()
            }, 400)
        },
        onStartTimeChange(e) {
            const raw = e?.detail?.value || '' // 格式: "YYYY-MM-DD HH:mm"
            if (!raw) {
                this.form.startTime = null
                this.startPickerLabel = ''
                return
            }
            // 转为后端期望的 LocalDateTime 形式：YYYY-MM-DDTHH:mm:ss
            const iso = raw.replace(' ', 'T') + ':00'
            this.form.startTime = iso
            this.startPickerLabel = raw
        },
        onEndTimeChange(e) {
            const raw = e?.detail?.value || ''
            if (!raw) {
                this.form.endTime = null
                this.endPickerLabel = ''
                return
            }
            const iso = raw.replace(' ', 'T') + ':00'
            this.form.endTime = iso
            this.endPickerLabel = raw
        },
        onViewTypeChange(e) {
            const idx = Number(e?.detail?.value)
            this.selectedViewTypeIndex = idx
            this.selectedViewType = (idx === 0) ? null : idx
            this.fetchConfigs(0)
        },
        typeLabel(t) { return t == null ? '全部' : (this.typeMap[t] || String(t)) },
        async deleteConfig(id) {
            if (!id) return
            uni.showModal({
                title: '确认', content: '确定删除该推荐配置？', success: async (r) => {
                    if (r.confirm) {
                        uni.showLoading({ title: '删除中' })
                        try {
                            const res = await api.request({ url: `/api/recommendation/admin/${id}`, method: 'DELETE' })
                            uni.hideLoading()
                            if (res && res.success) { uni.showToast({ title: '删除成功', icon: 'success' }); this.fetchConfigs() }
                            else uni.showToast({ title: res?.message || '删除失败', icon: 'none' })
                        } catch (e) { uni.hideLoading(); uni.showToast({ title: '删除请求失败', icon: 'none' }) }
                    }
                }
            })
        },
        goBack() { uni.navigateBack() }
    }
}
</script>

<style scoped>
.page {
    min-height: 100vh;
    padding: 30rpx;
    background-color: #f8fafc;
    padding-bottom: 60rpx;
}

/* Header Styles */
.header {
    margin-bottom: 40rpx;
    position: relative;
    padding: 20rpx 10rpx;
}

.header-content {
    position: relative;
    z-index: 2;
}

.title {
    font-size: 44rpx;
    font-weight: 800;
    color: #1e293b;
    display: block;
}

.subtitle {
    font-size: 26rpx;
    color: #64748b;
    margin-top: 10rpx;
    display: block;
}

.header-decoration {
    position: absolute;
    right: -20rpx;
    top: 10rpx;
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(139, 92, 246, 0.05));
    border-radius: 50%;
    z-index: 1;
}

/* Card Common */
.card {
    background: #ffffff;
    border-radius: 28rpx;
    padding: 32rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.card-header {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
}

.card-icon {
    margin-right: 12rpx;
    font-size: 32rpx;
}

.card-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #1e293b;
}

/* Search Bar */
.search-row {
    display: flex;
    gap: 16rpx;
    align-items: center;
}

.input-wrapper {
    flex: 1;
    background: #f1f5f9;
    border-radius: 16rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
}

.search-input {
    flex: 1;
    font-size: 28rpx;
    color: #1e293b;
}

.primary-btn {
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 600;
    padding: 0 40rpx;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 16rpx;
    border: none;
    transition: all 0.2s;
}

.primary-btn:active {
    transform: scale(0.96);
    opacity: 0.9;
}

.hint {
    font-size: 24rpx;
    color: #94a3b8;
    margin-top: 20rpx;
}

/* Search Results List */
.results-container {
    margin-bottom: 40rpx;
}

.section-label {
    font-size: 24rpx;
    color: #64748b;
    font-weight: 600;
    margin-left: 10rpx;
    margin-bottom: 16rpx;
    text-transform: uppercase;
    letter-spacing: 1rpx;
}

.results-scroll {
    max-height: 480rpx;
    background: #ffffff;
    border-radius: 28rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.perf-item-card {
    display: flex;
    align-items: center;
    padding: 24rpx;
    border-bottom: 1rpx solid #f1f5f9;
}

.perf-item-card:last-child {
    border-bottom: none;
}

.perf-thumb {
    width: 100rpx;
    height: 100rpx;
    border-radius: 16rpx;
    background: #f1f5f9;
}

.perf-info {
    flex: 1;
    margin: 0 20rpx;
    display: flex;
    flex-direction: column;
}

.perf-name {
    font-size: 28rpx;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 6rpx;
}

.perf-desc {
    font-size: 24rpx;
    color: #94a3b8;
}

.perf-action {
    width: 60rpx;
    height: 60rpx;
    background: #f1f5f9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.add-icon {
    font-size: 36rpx;
    color: #7c3aed;
    line-height: 1;
}

/* Config List Styling */
.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
}

.lh-left {
    display: flex;
    align-items: center;
}

.lh-right {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.type-picker {
    background: #f1f5f9;
    padding: 10rpx 20rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    font-size: 24rpx;
    color: #64748b;
}

.picker-arrow {
    margin-left: 6rpx;
    font-size: 20rpx;
}

.refresh-btn {
    width: 56rpx;
    height: 56rpx;
    background: #f1f5f9;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.config-list {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.config-item {
    display: flex;
    padding: 24rpx;
    background: #f8fafc;
    border-radius: 20rpx;
    align-items: flex-start;
}

.cfg-main {
    flex: 1;
    position: relative;
    padding-top: 40rpx;
}

.cfg-badge {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 20rpx;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    font-weight: 700;
}

.type-1 {
    background: #ede9fe;
    color: #7c3aed;
}

.type-2 {
    background: #e0f2fe;
    color: #0284c7;
}

.cfg-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #334155;
    margin-bottom: 12rpx;
    display: block;
}

.cfg-details {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.cfg-detail-item {
    font-size: 22rpx;
    color: #94a3b8;
}

.cfg-detail-divider {
    font-size: 20rpx;
    color: #e2e8f0;
}

.cfg-action {
    padding: 10rpx;
}

.delete-icon {
    font-size: 32rpx;
    opacity: 0.6;
}

/* State Messages */
.state-loading,
.state-empty {
    padding: 60rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 26rpx;
}

.loading-icon {
    font-size: 48rpx;
    margin-bottom: 16rpx;
}

/* Load More */
.load-more {
    text-align: center;
    padding: 24rpx;
    color: #7c3aed;
    font-size: 26rpx;
    font-weight: 600;
}

/* Modal Styling */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4rpx);
    /* 允许内部元素正常接收事件，避免遮罩拦截 */
    pointer-events: auto;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40rpx;
}

.modal-content {
    width: 100%;
    background: #ffffff;
    border-radius: 36rpx;
    padding: 40rpx;
    /* 去除 transform 动画，避免影响原生 picker 弹出 */
}


.modal-header {
    margin-bottom: 40rpx;
}

.close-btn {
    position: absolute;
    right: 24rpx;
    top: 24rpx;
    font-size: 32rpx;
    color: #94a3b8;
}

.modal-title {
    font-size: 36rpx;
    font-weight: 800;
    color: #1e293b;
    display: block;
}

.modal-subtitle {
    font-size: 26rpx;
    color: #94a3b8;
    margin-top: 8rpx;
    display: block;
}

.form-container {
    margin-bottom: 40rpx;
}

.form-item {
    margin-bottom: 30rpx;
}

.form-label {
    font-size: 24rpx;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 12rpx;
    display: block;
}

.form-picker {
    background: #f1f5f9;
    height: 88rpx;
    border-radius: 16rpx;
    padding: 0 24rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 28rpx;
    color: #1e293b;
}

.form-input {
    background: #f1f5f9;
    height: 88rpx;
    border-radius: 16rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: #1e293b;
}

.modal-footer {
    display: flex;
    gap: 20rpx;
}

.modal-footer button {
    flex: 1;
}

.ghost-btn {
    background: #f1f5f9;
    color: #64748b;
    font-size: 28rpx;
    font-weight: 600;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 16rpx;
    border: none;
}

.dt-picker-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.dt-picker-card {
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding-bottom: env(safe-area-inset-bottom);
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }

    to {
        transform: translateY(0);
    }
}

.dt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 34rpx 40rpx;
    border-bottom: 1rpx solid #f1f5f9;
}

.dt-header-side {
    width: 120rpx;
    display: flex;
}

.dt-header-side:last-child {
    justify-content: flex-end;
}

.dt-cancel {
    color: #64748b;
    font-size: 32rpx;
    padding: 10rpx 0;
}

.dt-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1e293b;
    flex: 1;
    text-align: center;
}

.dt-confirm {
    color: #7c3aed;
    font-size: 32rpx;
    font-weight: 700;
    padding: 10rpx 0;
}

.dt-picker-view {
    width: 100%;
    height: 480rpx;
    background: #ffffff;
}

.dt-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100rpx;
    text-align: center;
    font-size: 34rpx;
    color: #1e293b;
}

/* 移除选择器蒙层的反馈声/触感通常由系统控制，但我们可以确保没有 hover 态的音效 */
.dt-cancel:active,
.dt-confirm:active {
    opacity: 0.6;
}
</style>