<template>
    <view class="page">
        <view class="header">
            <view class="header-content">
                <text class="page-title">✏️ 编辑演出</text>
                <text class="page-subtitle">修改演出信息并提交更新</text>
            </view>
        </view>

        <view v-if="loading" class="state-box">
            <text>加载中...</text>
        </view>

        <view v-else class="content">
            <!-- 步骤 1：场地与时间 (重用 apply.vue 布局) -->
            <view class="section">
                <view class="section-title">
                    <text class="section-icon">📍</text>
                    <text>场地与时间</text>
                </view>
                <view class="card">
                    <text v-if="!canEditSessions && form.publishStatus === 3" class="error-tip">演出已结束，场次不可编辑</text>
                    <text v-else-if="!canEditSessions" class="error-tip">距首场小于 60 分钟，时间已锁定，仅可修改票数</text>

                    <!-- 场次列表 -->
                    <view class="form-item">
                        <view class="label-row">
                            <text class="label">演出场次</text>
                            <view v-if="canEditSessions" class="add-btn" @tap="addSession">
                                <text>➕ 添加</text>
                            </view>
                        </view>

                        <view v-if="form.sessions.length === 0" class="empty-hint">暂无场次，请点击添加一个并选择场地</view>

                        <view v-for="(s, idx) in form.sessions" :key="idx" class="session-block">
                            <view class="session-header">
                                <text class="session-index">场次 {{ idx + 1 }}</text>
                                <text class="session-del" v-if="canEditSessions" @tap="removeSession(idx)">删除</text>
                            </view>

                            <!-- 场次独立场地选择 -->
                            <view class="session-venue-mini">
                                <text class="label-mini">📍 场次地点选择</text>
                                <view class="sv-mini-box" @tap="canEditSessions ? activateSessionSearch(idx) : null">
                                    <view class="sv-mini-name-group">
                                        <text class="sv-mini-name">{{ s.venueName || '点击搜索并选择场地' }}</text>
                                        <text v-if="s.venueId" class="sv-mini-status-on">已选</text>
                                    </view>
                                    <text class="sv-mini-btn" v-if="canEditSessions">{{ s.venueId ? '更改' : '选择'
                                    }}</text>
                                </view>

                                <!-- 场次级搜索区域 -->
                                <view v-if="activeSessionVenueIdx === idx" class="session-search-box">
                                    <view class="search-box mini">
                                        <text class="search-icon">🔍</text>
                                        <input class="input" placeholder="输入关键字搜索场地" v-model="venueKeyword"
                                            @input="searchVenues" />
                                        <text class="search-close" @tap="activeSessionVenueIdx = -1">✕</text>
                                    </view>
                                    <scroll-view v-if="venues.length > 0" class="venue-results mini" scroll-y>
                                        <view v-for="v in venues" :key="v.id" class="venue-item mini"
                                            @tap="selectVenueForSession(v, idx)">
                                            <view class="venue-info">
                                                <text class="v-name">{{ v.name }}</text>
                                                <text class="v-addr">{{ v.address }}</text>
                                            </view>
                                        </view>
                                    </scroll-view>
                                </view>

                                <!-- 该场次所选场地的规则展示 -->
                                <view v-if="s.venueId && s.venueHoursAndBlocks" class="venue-rules-card mini">
                                    <view class="vrc-header">
                                        <text class="vrc-title">📅 开放规则</text>
                                    </view>
                                    <view
                                        v-if="s.venueHoursAndBlocks.blockedDates && s.venueHoursAndBlocks.blockedDates.length > 0"
                                        class="vrc-blocks mini">
                                        <text class="vrc-label">🚫 屏蔽日期：{{ s.venueHoursAndBlocks.blockedDates.length
                                        }}天</text>
                                        <scroll-view scroll-y class="vrc-block-scroll mini">
                                            <view v-for="(b, bidx) in s.venueHoursAndBlocks.blockedDates" :key="bidx"
                                                class="vrc-block-mini-item">
                                                <text class="vbmi-date">🗓️ {{ b.date }}</text>
                                                <text class="vbmi-reason">📝 {{ b.reason || '不可用' }}</text>
                                            </view>
                                        </scroll-view>
                                    </view>
                                    <view class="vrc-timetable mini">
                                        <scroll-view scroll-x class="vrc-days">
                                            <view v-for="item in s.venueHoursAndBlocks.openingHours"
                                                :key="item.dayOfWeek" class="vrc-day-item"
                                                :class="{ 'vrc-day-today': isToday(item.dayOfWeek) }">
                                                <text class="vdi-day">{{ formatDayOfWeek(item.dayOfWeek) }}</text>
                                                <text class="vdi-time">{{ formatTimeRange(item.openTime, item.closeTime)
                                                }}</text>
                                            </view>
                                        </scroll-view>
                                    </view>
                                </view>

                                <!-- 该场次所选场地的后续占用情况 -->
                                <view v-if="s.venueId && s.venueEvents && s.venueEvents.length > 0"
                                    class="venue-events-card mini">
                                    <view class="vec-header">
                                        <text class="vec-title">🎭 当前场地占用情况</text>
                                    </view>
                                    <scroll-view scroll-y class="vec-list mini">
                                        <view v-for="(ev, eidx) in s.venueEvents" :key="eidx" class="vec-item mini">
                                            <text class="vec-time">⏰ {{ formatEventTime(ev.startTime, ev.endTime)
                                            }}</text>
                                            <text class="vec-name-mini">📌 演出名称：{{ ev.title }}</text>
                                        </view>
                                    </scroll-view>
                                </view>
                            </view>

                            <view class="session-body">
                                <view class="time-picker-group">
                                    <picker class="tp-item" mode="date" :disabled="!canEditSessions"
                                        @change="onSessionDateChange(idx, $event, 'start')">
                                        <text class="tp-label">起</text>
                                        <text class="tp-val">{{ s.startDate || '选择日期' }}</text>
                                    </picker>
                                    <picker class="tp-item" mode="time" :disabled="!canEditSessions"
                                        @change="onSessionTimeChange(idx, $event, 'start')">
                                        <text class="tp-label">时</text>
                                        <text class="tp-val">{{ s.startTimeOnly || '时间' }}</text>
                                    </picker>
                                </view>
                                <view class="time-picker-group">
                                    <picker class="tp-item" mode="date" :disabled="!canEditSessions"
                                        @change="onSessionDateChange(idx, $event, 'end')">
                                        <text class="tp-label">止</text>
                                        <text class="tp-val">{{ s.endDate || '选择日期' }}</text>
                                    </picker>
                                    <picker class="tp-item" mode="time" :disabled="!canEditSessions"
                                        @change="onSessionTimeChange(idx, $event, 'end')">
                                        <text class="tp-label">时</text>
                                        <text class="tp-val">{{ s.endTimeOnly || '时间' }}</text>
                                    </picker>
                                </view>
                                <view class="ticket-input">
                                    <text class="ti-label">可售票数</text>
                                    <input type="number" v-model="s.ticketTotal" placeholder="0" class="ti-val"
                                        :disabled="!canEditSessions" />
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 步骤 2：基本信息 -->
            <view class="section">
                <view class="section-title">
                    <text class="section-icon">📝</text>
                    <text>基本信息</text>
                </view>
                <view class="card">
                    <view class="form-item">
                        <text class="label">演出标题</text>
                        <input class="input input-bordered" v-model="form.title" placeholder="请输入演出完整标题" />
                    </view>
                    <view class="form-item">
                        <text class="label">演出海报</text>
                        <view class="poster-upload" @tap="choosePoster">
                            <image v-if="posterPreview" :src="posterPreview" class="poster-p" mode="aspectFill"></image>
                            <view v-else class="poster-placeholder">
                                <text class="plus">＋</text>
                                <text>上传海报</text>
                            </view>
                        </view>
                    </view>
                    <view class="form-item">
                        <text class="label">演出详情</text>
                        <textarea class="textarea" v-model="form.description" placeholder="介绍演出的精彩内容..." />
                    </view>

                    <!-- 管理员可控制上架状态 -->
                    <view v-if="isAdmin" class="form-item">
                        <text class="label">演出状态 (管理员权限)</text>
                        <picker mode="selector" :range="publishOptions" :value="publishIndex" @change="onPublishChange">
                            <view class="picker-box">
                                <text class="val">{{ publishOptions[publishIndex] }}</text>
                                <text class="arrow"></text>
                            </view>
                        </picker>
                    </view>
                </view>
            </view>

            <!-- 步骤 3：演职人员 -->
            <view class="section last">
                <view class="section-title">
                    <text class="section-icon">🎭</text>
                    <text>演职人员</text>
                </view>
                <view class="card">
                    <text class="staff-hint">演职人员姓名与职位为必填，头像为可选。</text>
                    <view class="staff-list">
                        <view v-for="(p, idx) in form.staffList" :key="idx" class="staff-card">
                            <view class="staff-avatar" @tap="chooseStaffPhoto(idx)">
                                <image v-if="p.staffAvatar" :src="p.staffAvatar" mode="aspectFill"></image>
                                <text v-else>📷</text>
                            </view>
                            <view class="staff-info">
                                <input class="staff-input name" v-model="p.staffName" placeholder="姓名" />
                                <input class="staff-input type" v-model="p.staffType" placeholder="职位 (如:导演)" />
                                <textarea class="staff-input intro" v-model="p.introduction"
                                    placeholder="简介（可选，如：广播台金牌主持）"></textarea>
                            </view>
                            <text class="staff-del" @tap="removeStaff(idx)">✕</text>
                        </view>
                    </view>
                    <view class="add-staff-btn" @tap="addStaff">
                        <text>＋ 添加演职人员</text>
                    </view>
                </view>
            </view>

            <view class="footer-spacer"></view>

            <view class="footer">
                <view class="footer-actions">
                    <button class="cancel-btn" @tap="handleCancel">取消修改</button>
                    <button class="save-btn" :loading="submitting" @tap="submitUpdate">保存并提交</button>
                </view>
            </view>
        </view>

    </view>
</template>

<script>
import api from '@/utils/api'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            loading: true,
            submitting: false,
            performanceId: null,
            form: {
                title: '',
                description: '',
                posterFile: '',
                posterUrl: '',
                sessions: [],
                staffList: [],
                // applyReason removed for edit page
                organizerType: 'USER',
                organizerId: null
            },
            posterPreview: '',
            userInfo: {},
            isAdmin: false,
            canEditSessions: true,
            publishOptions: ['已上架', '已下架'],
            publishIndex: 0,
            // 场地选择相关
            venueKeyword: '',
            venues: [],
            activeSessionVenueIdx: -1,
        }
    },
    onLoad(options) {
        if (!options.id) {
            showError('缺少演出 ID');
            setTimeout(() => uni.navigateBack(), 800);
            return
        }
        this.performanceId = options.id
        this.fetchUserInfoAndDetail()
    },
    methods: {
        async fetchUserInfoAndDetail() {
            try {
                const res = await api.request({ url: '/api/users/me', method: 'GET' })
                if (!res?.success) { showError('获取用户信息失败'); return }
                this.userInfo = res.data || {}
                this.isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(this.userInfo.role)
                await this.fetchDetail()
            } catch (e) { showError('初始化失败') }
        },
        async fetchDetail() {
            this.loading = true
            try {
                const res = await api.request({ url: `/api/performance/${this.performanceId}`, method: 'GET' })
                if (!res?.success) { showError(res?.message || '获取演出失败'); uni.navigateBack(); return }
                const dto = res.data
                if (!dto) { showError('演出不存在'); uni.navigateBack(); return }

                // 权限：演出的主导者（负责人）或管理员可编辑
                const userId = uni.getStorageSync('userId')
                const isLeader = (dto.organizerId && String(dto.organizerId) === String(userId)) || (dto.organizer && dto.organizer.leaderId && String(dto.organizer.leaderId) === String(userId))
                if (!isLeader && !this.isAdmin) {
                    showError('无权限编辑该演出');
                    setTimeout(() => uni.navigateBack(), 800)
                    return
                }

                // 填充表单
                this.form.title = dto.title || ''
                this.form.description = dto.description || ''
                this.form.posterUrl = dto.posterUrl || ''
                this.posterPreview = this.form.posterUrl
                // 保存原始文本以便比较是否发生变化
                this._originalTitle = this.form.title
                this._originalDescription = this.form.description
                this._originalPosterUrl = this.form.posterUrl
                // applyReason is not used on edit page
                this.form.organizerType = dto.organizerType || 'USER'
                this.form.organizerId = dto.organizerId || (dto.organizer && dto.organizer.id) || null

                // sessions -> local fields
                // 保存原始 sessions 以便后续比较（用于检测是否修改时间或场地）
                this._originalSessions = (dto.sessions || []).map(s => ({
                    sessionId: s.sessionId || s.id || null,
                    venueId: s.venueId || s.venue?.id || null,
                    startTime: s.startTime || s.start || null,
                    endTime: s.endTime || s.end || null,
                    ticketTotal: s.ticketTotal || 0
                }))

                this.form.sessions = (dto.sessions || []).map(s => {
                    const start = s.startTime || s.start || null
                    const end = s.endTime || s.end || null
                    const parseDate = (iso) => {
                        if (!iso) return { date: '', time: '' }
                        const d = new Date(iso)
                        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                        return { date, time }
                    }
                    const sd = parseDate(start), ed = parseDate(end)
                    return { sessionId: s.sessionId || s.id || null, venueId: s.venueId || s.venue?.id, venueName: s.venueName || s.venue?.name || '', startDate: sd.date, startTimeOnly: sd.time, endDate: ed.date, endTimeOnly: ed.time, startTime: start, endTime: end, ticketTotal: s.ticketTotal || 0, venueHoursAndBlocks: null, venueEvents: [] }
                })

                // 为每个已选定场地的场次加载具体的开放规则与后续占位信息
                this.form.sessions.forEach((s, i) => {
                    if (s.venueId) {
                        this.fetchSessionVenueData(s.venueId, i)
                    }
                })

                // staff（职位字段优先使用 staffType），包含 introduction
                this.form.staffList = (dto.staff || []).map(st => ({ staffId: st.staffId || st.id, staffName: st.staffName || st.name || '', staffType: st.staffType || st.position || st.role || '', staffAvatar: st.staffAvatar || st.avatarUrl || '', introduction: st.introduction || st.description || '' }))
                // 保存原始 staff 简化信息用于比较
                this._originalStaffList = (this.form.staffList || []).map(s => ({ id: s.staffId || s.id || null, staffName: s.staffName || '', staffType: s.staffType || '', staffAvatar: s.staffAvatar || '', introduction: s.introduction || '' }))

                // publish status -> 映射到 picker index（0: 已上架, 1: 已下架）
                const pIndex = (dto.publishStatus === 1) ? 0 : 1
                this.publishIndex = pIndex
                // keep publishStatus in form for template checks (保留原始值，例如 3 表示已结束)
                this.form.publishStatus = dto.publishStatus || 0
                this._originalPublishStatus = this.form.publishStatus

                // 计算 sessions 可否编辑：
                // - 如果演出已结束 (publishStatus === 3) 则不可编辑
                // - 否则若距离首场不足 60 分钟也不可编辑
                let canEdit = true
                if (dto.publishStatus === 3) {
                    canEdit = false
                } else {
                    const starts = (dto.sessions || []).map(s => new Date(s.startTime || s.start).getTime()).filter(t => !isNaN(t))
                    if (starts.length) {
                        const earliest = Math.min(...starts)
                        const now = Date.now()
                        canEdit = now < (earliest - 60 * 60 * 1000)
                    } else {
                        canEdit = true
                    }
                }
                this.canEditSessions = canEdit

            } catch (e) { console.error(e); showError('获取演出详情失败') }
            finally { this.loading = false }
        },
        choosePoster() {
            uni.chooseImage({
                count: 1, success: (res) => {
                    const p = res.tempFilePaths && res.tempFilePaths[0]
                    if (!p) return
                    this.form.posterFile = p
                    this.posterPreview = p
                }
            })
        },
        addSession() {
            this.form.sessions.push({
                venueId: null,
                venueName: '',
                startDate: '',
                startTimeOnly: '',
                endDate: '',
                endTimeOnly: '',
                startTime: null,
                endTime: null,
                ticketTotal: 0,
                venueHoursAndBlocks: null,
                venueEvents: []
            })
        },
        removeSession(i) { if (!this.canEditSessions) return; this.form.sessions.splice(i, 1) },
        onSessionDateChange(idx, e, which) { const v = (e.detail && (e.detail.value || e.detail)) ? (e.detail.value || e.detail) : ''; if (which === 'start') this.form.sessions[idx].startDate = v; else this.form.sessions[idx].endDate = v; this.combineSessionDateTime(idx) },
        onSessionTimeChange(idx, e, which) { const v = (e.detail && (e.detail.value || e.detail)) ? (e.detail.value || e.detail) : ''; if (which === 'start') this.form.sessions[idx].startTimeOnly = v; else this.form.sessions[idx].endTimeOnly = v; this.combineSessionDateTime(idx) },
        combineSessionDateTime(idx) {
            const s = this.form.sessions[idx]
            const buildLocal = (datePart, timePart) => { if (!datePart || !timePart) return null; const [y, m, d] = datePart.split('-').map(Number); const [hh, mm] = timePart.split(':').map(Number); const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0); const yy = dt.getFullYear(); const mm2 = String(dt.getMonth() + 1).padStart(2, '0'); const dd = String(dt.getDate()).padStart(2, '0'); const hh2 = String(dt.getHours()).padStart(2, '0'); const min2 = String(dt.getMinutes()).padStart(2, '0'); return `${yy}-${mm2}-${dd}T${hh2}:${min2}:00` }
            if (s.startDate && s.startTimeOnly) s.startTime = buildLocal(s.startDate, s.startTimeOnly)
            if (s.endDate && s.endTimeOnly) s.endTime = buildLocal(s.endDate, s.endTimeOnly)
        },
        addStaff() { this.form.staffList.push({ staffId: null, staffName: '', staffType: '', introduction: '', staffAvatarFile: '', staffAvatar: '' }) },
        removeStaff(i) { this.form.staffList.splice(i, 1) },
        chooseStaffPhoto(idx) { uni.chooseImage({ count: 1, success: (res) => { const p = res.tempFilePaths && res.tempFilePaths[0]; if (!p) return; this.form.staffList[idx].staffAvatarFile = p; this.form.staffList[idx].staffAvatar = p } }) },
        handleCancel() {
            uni.showModal({
                title: '提示',
                content: '取消编辑？',
                confirmText: '确定',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) uni.navigateBack()
                }
            })
        },
        onPublishChange(e) {
            const idx = Number(e.detail.value)
            this.publishIndex = idx
            // 将 picker 的索引映射回后端的 publishStatus（0 -> 1 已上架，1 -> 2 已下架）
            this.form.publishStatus = idx === 0 ? 1 : 2
        },

        async submitUpdate() {
            if (this.form.sessions.some(s => !s.venueId)) { showError('请为所有场次选择场地'); return }
            if (!this.form.title || !this.form.title.trim()) { showError('请填写演出标题'); return }
            if (!this.validateSessions()) return

            // 演职人员必填校验（姓名与职位必填，头像可选）
            for (let i = 0; i < this.form.staffList.length; i++) {
                const st = this.form.staffList[i]
                if (!st) continue
                if (!st.staffName || !String(st.staffName).trim() || !st.staffType || !String(st.staffType).trim()) {
                    showError(`请填写第 ${i + 1} 位演职人员的姓名和职位`);
                    return
                }
            }

            // 构建差异化 payload：仅包含发生变更的字段/模块，避免无意义上传
            const perfCmd = { performanceId: Number(this.performanceId) }
            const titleTrim = (this.form.title || '').trim()
            if (titleTrim !== (this._originalTitle || '')) perfCmd.title = titleTrim
            if ((this.form.description || '') !== (this._originalDescription || '')) perfCmd.description = this.form.description || ''
            // poster 上传使用单独接口：如果用户选择了新文件，则无需在 perfCmd 中传 posterUrl；但如果 posterUrl 字符串被修改（例如外链填入），则发送
            if ((this.form.posterUrl || '') !== (this._originalPosterUrl || '') && !this.form.posterFile) perfCmd.posterUrl = this.form.posterUrl || ''
            if ((this.form.publishStatus || 0) !== (this._originalPublishStatus || 0)) perfCmd.publishStatus = this.form.publishStatus || 0

            // sessions 和 staff 仅在有实际改动时才发送完整数组
            const hasSessionsChanged = (() => {
                try {
                    const normCurrent = (this.form.sessions || []).map(s => ({ sessionId: s.sessionId || null, venueId: s.venueId || null, startTime: s.startTime || null, endTime: s.endTime || null, ticketTotal: Number(s.ticketTotal) || 0 }))
                    const orig = this._originalSessions || []
                    if (normCurrent.length !== orig.length) return true
                    for (let i = 0; i < normCurrent.length; i++) {
                        const a = normCurrent[i], b = orig[i]
                        if (String(a.sessionId || '') !== String(b.sessionId || '') || String(a.venueId || '') !== String(b.venueId || '') || String(a.startTime || '') !== String(b.startTime || '') || String(a.endTime || '') !== String(b.endTime || '') || Number(a.ticketTotal || 0) !== Number(b.ticketTotal || 0)) return true
                    }
                    return false
                } catch (e) { return true }
            })()

            const hasStaffChanged = (() => {
                try {
                    const cur = (this.form.staffList || []).map(s => ({ id: s.staffId || s.id || null, staffName: s.staffName || '', staffType: s.staffType || '', staffAvatar: (s.staffAvatarFile ? (s.staffAvatarFile.split(/[\\\/]/).pop()) : (s.staffAvatar || '')), introduction: s.introduction || '' }))
                    const orig = this._originalStaffList || []
                    if (cur.length !== orig.length) return true
                    for (let i = 0; i < cur.length; i++) {
                        const a = cur[i], b = orig[i]
                        if (String(a.id || '') !== String(b.id || '') || a.staffName !== b.staffName || a.staffType !== b.staffType || a.staffAvatar !== (b.staffAvatar || '') || a.introduction !== (b.introduction || '')) return true
                    }
                    return false
                } catch (e) { return true }
            })()

            // 后端期望 performanceCmd 不为 null，始终传 performanceId
            const payload = {}
            payload.performanceCmd = perfCmd
            if (hasSessionsChanged) payload.sessions = this.form.sessions.map(s => ({ venueId: s.venueId, venueName: s.venueName || '', startTime: s.startTime, endTime: s.endTime, ticketTotal: Number(s.ticketTotal) || 0 }))
            if (hasStaffChanged) payload.staffList = this.form.staffList.map(st => {
                const getAvatarName = (s) => {
                    if (!s) return ''
                    if (s.staffAvatarFile) {
                        const parts = (s.staffAvatarFile || '').split(/[\\\/]/)
                        return parts[parts.length - 1]
                    }
                    if (s.staffAvatar) {
                        const parts = (s.staffAvatar || '').split('/')
                        return parts[parts.length - 1]
                    }
                    return ''
                }
                return { id: st.staffId || st.id || null, staffName: st.staffName, staffType: st.staffType, staffAvatar: getAvatarName(st), introduction: st.introduction || '' }
            })
            if (this.form.delayReason) payload.delayReason = this.form.delayReason || ''

            // 如果没有任何变化且没有上传的海报文件，则无需提交
            const noChangeAndNoFile = Object.keys(payload).length === 0 && !this.form.posterFile
            if (noChangeAndNoFile) { showError('未检测到修改，无需提交'); return }
            // 若只有海报文件变更（payload 为空但有 posterFile），至少发送 performanceId 以便后端返回 perfId 用于上传海报
            if (Object.keys(payload).length === 0 && this.form.posterFile) {
                payload.performanceCmd = { performanceId: Number(this.performanceId) }
            }

            this.submitting = true
            uni.showLoading({ title: '提交中...' })
            try {
                const token = uni.getStorageSync('token')
                const headers = token ? { Authorization: `Bearer ${token}` } : {}

                const res = await api.request({ url: '/api/performance/update', method: 'POST', data: payload })
                if (!res?.success) { showError(res?.message || '提交失败'); this.submitting = false; uni.hideLoading(); return }
                const perfId = res.data && (res.data.performanceId || res.data.id) || this.performanceId
                if (!perfId) { showError('未能获取演出 ID'); this.submitting = false; uni.hideLoading(); return }

                if (this.form.posterFile) {
                    await new Promise((resolve, reject) => {
                        uni.uploadFile({
                            url: `${api.BASE_URL}/api/performance/${perfId}/poster`,
                            filePath: this.form.posterFile,
                            name: 'poster',
                            header: headers,
                            success: (r) => resolve(r),
                            fail: (e) => reject(e)
                        })
                    }).catch(() => { showError('海报上传失败，已提交更新') })
                }

                const returnedStaff = res.data && (res.data.staff || res.data.staffList) || null
                await this.uploadStaffPhotos(perfId, returnedStaff)

                showSuccess('更新提交成功')
                setTimeout(() => {
                    try {
                        uni.navigateBack({
                            delta: 1,
                            success: () => {
                                // 在返回后短延迟再调用上页的刷新函数，确保页面已 active
                                setTimeout(() => {
                                    try {
                                        const pages = getCurrentPages ? getCurrentPages() : []
                                        const last = pages && pages.length ? pages[pages.length - 1] : null
                                        if (last) {
                                            if (typeof last.fetchDetail === 'function') last.fetchDetail()
                                            else if (typeof last.onShow === 'function') last.onShow()
                                        }
                                    } catch (e) { console.warn('返回后刷新上一页失败', e) }
                                }, 200)
                            },
                            fail: () => { console.warn('navigateBack 失败') }
                        })
                    } catch (e) { console.warn('navigateBack 调用失败', e) }
                }, 1200)
                this.submitting = false
                uni.hideLoading()
            } catch (err) {
                console.error('submitUpdate error', err)
                showError('请求异常')
                this.submitting = false
                uni.hideLoading()
            }
        },

        async uploadStaffPhotos(perfId, returnedStaff) {
            const token = uni.getStorageSync('token')
            if (!token) return

            // If backend returned staff list with IDs, upload accordingly.
            // Match by id first; if local entry lacks id, try matching by name+type to find returned id.
            if (Array.isArray(returnedStaff) && returnedStaff.length > 0) {
                const serverById = {}
                for (let s of returnedStaff) {
                    const sid = s.staffId || s.id || s.staffId
                    if (sid) serverById[sid] = s
                }

                for (let i = 0; i < this.form.staffList.length; i++) {
                    const localSt = this.form.staffList[i]
                    if (!localSt || !localSt.staffAvatarFile) continue

                    let staffId = localSt.staffId || localSt.id || null
                    if (!staffId) {
                        // try to find server record by name+type
                        const match = returnedStaff.find(rs => (rs.staffName === localSt.staffName && rs.staffType === localSt.staffType))
                        staffId = match && (match.staffId || match.id) ? (match.staffId || match.id) : null
                    }
                    if (!staffId) { console.warn('无法找到对应的 staffId，跳过头像上传，index=', i); continue }

                    try {
                        await new Promise((resolve, reject) => {
                            uni.uploadFile({
                                url: `${api.BASE_URL}/api/performance/${perfId}/staff/${staffId}/avatar`,
                                filePath: localSt.staffAvatarFile,
                                name: 'avatar',
                                header: { Authorization: `Bearer ${token}` },
                                success: (r) => resolve(r),
                                fail: (e) => reject(e)
                            })
                        })
                    } catch (e) { console.error('Staff avatar upload failed', e) }
                }
                return
            }

            // Fallback: try uploading local staff entries that contain staffId
            for (let i = 0; i < this.form.staffList.length; i++) {
                const st = this.form.staffList[i]
                if (!st || !st.staffAvatarFile) continue
                const staffId = st.staffId || st.id
                if (!staffId) {
                    console.warn('跳过未分配 staffId 的本地演职人员头像上传，index=', i)
                    continue
                }
                try {
                    await new Promise((resolve, reject) => {
                        uni.uploadFile({
                            url: `${api.BASE_URL}/api/performance/${perfId}/staff/${staffId}/avatar`,
                            filePath: st.staffAvatarFile,
                            name: 'avatar',
                            header: { Authorization: `Bearer ${token}` },
                            success: (r) => resolve(r),
                            fail: (e) => reject(e)
                        })
                    })
                } catch (e) { console.error('Staff avatar upload failed', e) }
            }
        },

        // --- 场地选择 & 校验 ---
        searchVenues() {
            const kw = (this.venueKeyword || '').trim()
            const url = kw ? `/api/venues?name=${encodeURIComponent(kw)}` : '/api/venues'
            api.request({ url, method: 'GET' })
                .then(res => {
                    if (res?.success) this.venues = res.data || []
                    else this.venues = []
                })
                .catch(() => { this.venues = [] })
        },
        activateSessionSearch(idx) {
            this.activeSessionVenueIdx = idx
            this.venueKeyword = this.form.sessions[idx].venueName || ''
            this.venues = []
        },
        selectVenueForSession(v, idx) {
            if (!this.form.sessions[idx]) return
            const s = this.form.sessions[idx]
            s.venueId = v.id
            s.venueName = v.name
            this.fetchSessionVenueData(v.id, idx)
            this.activeSessionVenueIdx = -1
        },
        fetchSessionVenueData(venueId, idx) {
            if (!venueId) return
            // 规则
            api.request({ url: `/api/venues/${venueId}/hours-and-blocks`, method: 'GET' })
                .then(res => {
                    if (res?.success) {
                        this.$set(this.form.sessions[idx], 'venueHoursAndBlocks', res.data)
                    }
                })
                .catch(() => { })
            // 事件
            const today = new Date()
            api.request({ url: `/api/venues/${venueId}/events`, method: 'GET', data: { start: this.formatDate(today), end: this.formatDate(new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())) } })
                .then(res => {
                    if (res?.success && Array.isArray(res.data)) {
                        const mapped = res.data.map(ev => ({
                            ...ev,
                            title: ev.title || ev.performanceName || ev.performance_name || ev.name || ''
                        }))
                        this.$set(this.form.sessions[idx], 'venueEvents', mapped.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)))
                    }
                })
                .catch(() => { })
        },
        clearSessionVenue(idx) {
            const s = this.form.sessions[idx]
            if (!s) return
            s.venueId = null
            s.venueName = ''
            s.venueHoursAndBlocks = null
            s.venueEvents = []
        },
        formatDayOfWeek(day) {
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
            return days[day % 7]
        },
        formatTimeRange(open, close) {
            if (!open || !close) return '不开放'
            return `${open}-${close}`
        },
        isToday(day) {
            const now = new Date()
            let d = now.getDay()
            if (d === 0) d = 7
            return d === day || now.getDay() === day
        },

        formatEventTime(st, et) {
            if (!st || !et) return ''
            const d1 = new Date(st), d2 = new Date(et)
            const date = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`
            const range = `${String(d1.getHours()).padStart(2, '0')}:${String(d1.getMinutes()).padStart(2, '0')} - ${String(d2.getHours()).padStart(2, '0')}:${String(d2.getMinutes()).padStart(2, '0')}`
            return `${date} 【${range}】`
        },
        formatDate(date) {
            if (!date) return ''
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        },
        validateSessions() {
            if (!this.canEditSessions && this.form.sessions.some(s => s.startTime && (new Date(s.startTime).getTime() - Date.now() < 60 * 60 * 1000))) {
                showError('距离开始不足60分钟，无法在此修改场次时间'); return false
            }

            const sessions = this.form.sessions
            if (sessions.length === 0) { showError('请至少添加一个场次'); return false }
            for (let i = 0; i < sessions.length; i++) {
                const a = sessions[i]
                // 基础必填校验（票数修改也需要 venue 与 时间 字段存在于界面）
                if (!a.venueId) { showError(`场次 ${i + 1} 尚未选择场地`); return false }
                if (!a.startTime || !a.endTime) { showError(`场次 ${i + 1} 日期时间不完整`); return false }
                if (new Date(a.startTime) >= new Date(a.endTime)) { showError(`场次 ${i + 1} 结束时间不能早于开始时间`); return false }

                // 如果该场次未修改时间/场地（与原始数据相比），则跳过规则/占用冲突的校验，避免误报
                const orig = (this._originalSessions && this._originalSessions[i]) || null
                const changed = !orig || orig.venueId !== a.venueId || orig.startTime !== a.startTime || orig.endTime !== a.endTime
                if (!changed) continue

                // 规则校验
                if (a.venueHoursAndBlocks) {
                    const vBlocks = a.venueHoursAndBlocks
                    const blockDate = a.startDate
                    if (vBlocks.blockedDates && vBlocks.blockedDates.some(b => b.date === blockDate)) {
                        const bObj = vBlocks.blockedDates.find(b => b.date === blockDate)
                        showError(`场次 ${i + 1} 日期 ${blockDate} 为屏蔽日期 (${bObj.reason || '不开放'})`); return false
                    }
                    const dtStart = new Date(a.startTime)
                    const day = dtStart.getDay()
                    const rule = vBlocks.openingHours && vBlocks.openingHours.find(h => h.dayOfWeek === day || (day === 0 && h.dayOfWeek === 7) || (day === 7 && h.dayOfWeek === 0))
                    if (!rule || !rule.openTime || !rule.closeTime) { showError(`该场地在 ${this.formatDayOfWeek(day)} 不对公众开放`); return false }
                    if (a.startTimeOnly < rule.openTime || a.endTimeOnly > rule.closeTime) {
                        showError(`场次 ${i + 1} 超出场地 ${this.formatDayOfWeek(day)} 开放范围 (${rule.openTime}~${rule.closeTime})`); return false
                    }
                }

                // 占用冲突
                if (a.venueEvents && a.venueEvents.length) {
                    const sSt = new Date(a.startTime).getTime(), sEt = new Date(a.endTime).getTime()
                    for (let e of a.venueEvents) {
                        const eSt = new Date(e.startTime).getTime(), eEt = new Date(e.endTime).getTime()
                        if (!(sEt <= eSt || sSt >= eEt)) { showError(`场次 ${i + 1} 与该场地已有活动冲突`); return false }
                    }
                }
            }
            // 内部冲突
            for (let i = 0; i < sessions.length; i++) {
                for (let j = i + 1; j < sessions.length; j++) {
                    const A = sessions[i], B = sessions[j]
                    if (!(new Date(A.endTime) <= new Date(B.startTime) || new Date(B.endTime) <= new Date(A.startTime))) {
                        showError(`场次 ${i + 1} 与 ${j + 1} 时间重叠`); return false
                    }
                }
            }
            return true
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    background: #f1f5f9;
    padding: 0 0 160rpx;
    display: flex;
    flex-direction: column;
}

.header {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: 60rpx 40rpx 40rpx;
    color: #ffffff;
}

.page-title {
    font-size: 40rpx;
    font-weight: 800;
    display: block;
    margin-bottom: 8rpx;
}

.page-subtitle {
    font-size: 24rpx;
    opacity: 0.9;
}

.section {
    padding: 24rpx 32rpx;
}

.section.last {
    padding-bottom: 40rpx;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;
    font-size: 30rpx;
    font-weight: 700;
    color: #334155;
}

.section-icon {
    font-size: 32rpx;
}

.card {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 32rpx;
    box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}

.form-item {
    margin-bottom: 32rpx;
}

.form-item:last-child {
    margin-bottom: 0;
}

.label {
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 16rpx;
    display: block;
}

.input {
    flex: 1;
    font-size: 28rpx;
    color: #1e293b;
}

.input-bordered {
    border: 2rpx solid #e6e8fa;
    background: #ffffff;
    padding: 14rpx 18rpx;
    border-radius: 10rpx;
}

.textarea {
    width: 100%;
    height: 240rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 16rpx;
    padding: 20rpx;
    font-size: 28rpx;
    box-sizing: border-box;
}

.textarea.mini {
    height: 120rpx;
}

.poster-upload {
    width: 100%;
    height: 360rpx;
    background: #f8fafc;
    border: 2rpx dashed #cbd5e1;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.poster-p {
    width: 100%;
    height: 100%;
}

.poster-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #94a3b8;
    font-weight: 600;
}

.plus {
    font-size: 60rpx;
    line-height: 1;
    margin-bottom: 10rpx;
}

/* 场次区块 */
.add-btn {
    font-size: 22rpx;
    color: #7c3aed;
    background: #f5f3ff;
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    font-weight: 700;
    display: inline-block;
    margin-top: 10rpx;
}

.session-block {
    background: #f8fafc;
    border-radius: 16rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
    border: 1rpx solid #e2e8f0;
}

.session-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;
}

.session-index {
    font-size: 22rpx;
    background: #e2e8f0;
    color: #475569;
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
    font-weight: 700;
}

.session-del {
    font-size: 22rpx;
    color: #ef4444;
    font-weight: 600;
}

.time-picker-group {
    display: flex;
    gap: 12rpx;
    margin-bottom: 12rpx;
}

.tp-item {
    flex: 1;
    background: #ffffff;
    border: 1rpx solid #e2e8f0;
    border-radius: 12rpx;
    padding: 12rpx 16rpx;
    display: flex;
    flex-direction: column;
}

.tp-label {
    font-size: 18rpx;
    color: #94a3b8;
    margin-bottom: 2rpx;
}

.tp-val {
    font-size: 24rpx;
    font-weight: 600;
    color: #1e293b;
}

.ticket-input {
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1rpx solid #e2e8f0;
    border-radius: 12rpx;
    padding: 12rpx 16rpx;
}

.ti-label {
    font-size: 20rpx;
    color: #64748b;
    margin-right: 16rpx;
    width: 100rpx;
}

.ti-val {
    flex: 1;
    font-size: 24rpx;
    font-weight: 700;
    color: #0f172a;
}

/* 演职人员 */
.staff-card {
    display: flex;
    align-items: center;
    background: #f8fafc;
    padding: 20rpx;
    border-radius: 20rpx;
    margin-bottom: 20rpx;
    position: relative;
}

.staff-hint {
    font-size: 20rpx;
    color: #6b7280;
    margin: 8rpx 0 12rpx 0;
}

.staff-avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    overflow: hidden;
}

.staff-avatar image {
    width: 100%;
    height: 100%;
}

.staff-info {
    flex: 1;
}

.staff-input {
    width: 100%;
    font-size: 26rpx;
    border: 1rpx solid #e2e8f0;
    padding: 10rpx 12rpx;
    border-radius: 8rpx;
    color: #1e293b;
}

.staff-input.name {
    font-weight: 700;
    margin-bottom: 12rpx;
}

.staff-del {
    padding: 10rpx;
    color: #94a3b8;
    font-size: 32rpx;
}

.add-staff-btn {
    text-align: center;
    padding: 24rpx;
    background: #f8fafc;
    border: 2rpx dashed #cbd5e1;
    border-radius: 20rpx;
    color: #64748b;
    font-size: 24rpx;
    font-weight: 600;
}

/* 底部按钮 */
.footer-spacer {
    height: 160rpx;
}

.footer-actions {
    display: flex;
    gap: 32rpx;
    padding: 32rpx;
    background: #ffffff;
    border-top: 1rpx solid #e2e8f0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
}

.cancel-btn,
.save-btn {
    flex: 1;
    height: 96rpx;
    line-height: 96rpx;
    border-radius: 48rpx;
    font-size: 30rpx;
    font-weight: 700;
}

.cancel-btn {
    background: #f1f5f9;
    color: #64748b;
    border: none;
}

.save-btn {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    color: #ffffff;
    box-shadow: 0 10rpx 25rpx -5rpx rgba(124, 58, 237, 0.4);
    border: none;
}

.save-btn:active {
    opacity: 0.9;
    transform: scale(0.98);
}

.disabled-field {
    opacity: 0.7;
    background-color: #f8fafc;
}

.picker-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18rpx 24rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 12rpx;
}

.picker-box .val {
    font-size: 28rpx;
    color: #1e293b;
}

.picker-box.gray .val {
    color: #94a3b8;
}

.arrow {
    border: solid #94a3b8;
    border-width: 0 4rpx 4rpx 0;
    display: inline-block;
    padding: 6rpx;
    transform: rotate(45deg);
}

.submit-btn {
    height: 96rpx;
    line-height: 96rpx;
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    color: #ffffff;
    font-weight: 700;
    border-radius: 48rpx;
    box-shadow: 0 10rpx 25rpx -5rpx rgba(124, 58, 237, 0.4);
    border: none;
    width: 100%;
}

.submit-btn:active {
    transform: scale(0.98);
    opacity: 0.9;
}

.error-tip {
    font-size: 22rpx;
    color: #ef4444;
    margin-bottom: 12rpx;
    display: block;
}

.state-box {
    padding: 200rpx 0;
    text-align: center;
    color: #94a3b8;
}

/* 场地选择样式（从 apply.vue 统一复制） */
.search-box {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 16rpx;
    padding: 0 24rpx;
    height: 88rpx;
    transition: all 0.3s;
}

.search-box:focus-within {
    border-color: #7c3aed;
    background: #ffffff;
}

.search-icon {
    font-size: 28rpx;
    margin-right: 16rpx;
}

.venue-results {
    max-height: 400rpx;
    background: #ffffff;
    border: 1rpx solid #e2e8f0;
    border-top: none;
    border-bottom-left-radius: 16rpx;
    border-bottom-right-radius: 16rpx;
    box-shadow: 0 10rpx 15rpx -3rpx rgba(0, 0, 0, 0.1);
}

.venue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    border-bottom: 1rpx solid #f1f5f9;
}

.venue-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.v-name {
    font-size: 28rpx;
    font-weight: 600;
}

.v-addr {
    font-size: 22rpx;
    color: #94a3b8;
}

.v-status {
    font-size: 20rpx;
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    background: #f1f5f9;
    color: #94a3b8;
}

.v-status-on {
    background: #dcfce7;
    color: #15803d;
}

.selected-venue-card {
    background: #f5f3ff;
    border: 2rpx solid #ddd6fe;
    border-radius: 16rpx;
    padding: 24rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.svc-name {
    font-size: 30rpx;
    font-weight: 700;
    color: #6d28d9;
    display: block;
    margin-bottom: 4rpx;
}

.svc-addr {
    font-size: 22rpx;
    color: #7c3aed;
}

.svc-change {
    font-size: 24rpx;
    color: #7c3aed;
    background: #ffffff;
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    font-weight: 600;
}

.venue-rules-card {
    margin-top: 24rpx;
    background: #fdf2f8;
    border: 2rpx dashed #f472b6;
    border-radius: 16rpx;
    padding: 24rpx;
}

.vrc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.vrc-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #be185d;
}

.vrc-status-active {
    font-size: 20rpx;
    color: #ffffff;
    background: #ec4899;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    font-weight: 600;
}

.vrc-label {
    font-size: 24rpx;
    color: #9d174d;
    font-weight: 600;
    margin-bottom: 12rpx;
    display: block;
}

.vrc-blocks {
    margin-bottom: 24rpx;
}

.vrc-header.no-margin {
    margin-bottom: 12rpx;
}

.vrc-badge {
    font-size: 20rpx;
    background: #db2777;
    color: #ffffff;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
    font-weight: 700;
}

.vrc-block-scroll {
    max-height: 320rpx;
}

.vrc-block-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.vrc-block-card {
    background: #ffffff;
    border: 2rpx solid #fbcfe8;
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    box-shadow: 0 4rpx 10rpx rgba(190, 24, 93, 0.05);
}

.vbc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
}

.vbc-date {
    font-size: 26rpx;
    font-weight: 700;
    color: #be185d;
}

.vbc-tag {
    font-size: 18rpx;
    color: #db2777;
    background: #fdf2f8;
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
    border: 1rpx solid #db2777;
    font-weight: 600;
}

.vbc-body {
    display: flex;
    align-items: flex-start;
}

.vbc-reason-label {
    font-size: 24rpx;
    color: #9d174d;
    font-weight: 600;
    flex-shrink: 0;
}

.vbc-reason-content {
    font-size: 24rpx;
    color: #be185d;
    line-height: 1.4;
}

.venue-events-card {
    margin-top: 24rpx;
    background: #fcf9f2;
    border: 2rpx dashed #d97706;
    border-radius: 16rpx;
    padding: 24rpx;
}

.vec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.vec-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #92400e;
}

.vec-count {
    font-size: 20rpx;
    color: #d97706;
    background: #fef3c7;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}

.vec-list {
    max-height: 400rpx;
    margin-bottom: 16rpx;
}

.vec-item {
    display: flex;
    align-items: flex-start;
    padding-bottom: 16rpx;
    margin-bottom: 16rpx;
    border-bottom: 1rpx solid rgba(217, 119, 6, 0.1);
}

.vec-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.vec-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: #d97706;
    margin-top: 10rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.vec-content {
    flex: 1
}

.vec-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4rpx
}

.vec-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #78350f
}

.vec-tag {
    font-size: 18rpx;
    color: #ffffff;
    background: #f59e0b;
    padding: 2rpx 10rpx;
    border-radius: 6rpx
}

.vec-time {
    font-size: 22rpx;
    color: #b45309;
    opacity: 0.8
}

.vec-hint {
    font-size: 20rpx;
    color: #d97706;
    opacity: 0.7;
    font-style: italic;
    text-align: right;
    display: block
}

.vrc-days {
    white-space: nowrap;
    width: 100%;
    margin-top: 8rpx
}

.vrc-day-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    background: #ffffff;
    padding: 16rpx 24rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
    border: 1rpx solid #fbcfe8;
    min-width: 120rpx
}

.vrc-day-today {
    background: #fdf2f8;
    border-color: #ec4899;
    box-shadow: 0 0 10rpx rgba(236, 72, 153, 0.2)
}

.vdi-day {
    font-size: 24rpx;
    font-weight: 700;
    color: #be185d;
    margin-bottom: 4rpx
}

.vdi-time {
    font-size: 20rpx;
    color: #db2777
}

/* session-venue 样式 */
.session-venue {
    margin: 12rpx 0 20rpx
}

.svc-row {
    display: flex;
    justify-content: space-between;
    align-items: center
}

.svc-name-small {
    font-size: 24rpx;
    color: #334155
}

.session-search {
    margin-top: 12rpx
}

.page {
    min-height: 100vh;
    background: #f1f5f9;
    padding: 0 0 160rpx;
    display: flex;
    flex-direction: column;
}

.header {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    padding: 60rpx 40rpx 40rpx;
    color: #ffffff;
}

.page-title {
    font-size: 40rpx;
    font-weight: 800;
    display: block;
    margin-bottom: 8rpx;
}

.page-subtitle {
    font-size: 24rpx;
    opacity: 0.9;
}

.section {
    padding: 24rpx 32rpx;
}

.section.last {
    padding-bottom: 40rpx;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;
    font-size: 30rpx;
    font-weight: 700;
    color: #334155;
}

.section-icon {
    font-size: 32rpx;
}

.card {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 32rpx;
    box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}

.form-item {
    margin-bottom: 32rpx;
}

.form-item:last-child {
    margin-bottom: 0;
}

.label {
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 16rpx;
    display: block;
}

.search-box {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 16rpx;
    padding: 0 24rpx;
    height: 88rpx;
    transition: all 0.3s;
}

.search-box:focus-within {
    border-color: #7c3aed;
    background: #ffffff;
}

.search-icon {
    font-size: 28rpx;
    margin-right: 16rpx;
}

.input {
    flex: 1;
    font-size: 28rpx;
    color: #1e293b;
}

/* 可交互输入框边框样式（用于演出标题和演职人员输入） */
.input-bordered {
    border: 2rpx solid #e6e8fa;
    background: #ffffff;
    padding: 14rpx 18rpx;
    border-radius: 10rpx;
}

.staff-input {
    border: 1rpx solid #e2e8f0;
    padding: 10rpx 12rpx;
    border-radius: 8rpx;
    font-size: 26rpx;
    color: #1e293b;
}

.staff-input.name {
    margin-bottom: 12rpx;
}

/* 场地搜索结果 */
.venue-results {
    max-height: 400rpx;
    background: #ffffff;
    border: 1rpx solid #e2e8f0;
    border-top: none;
    border-bottom-left-radius: 16rpx;
    border-bottom-right-radius: 16rpx;
    box-shadow: 0 10rpx 15rpx -3rpx rgba(0, 0, 0, 0.1);
}

.venue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    border-bottom: 1rpx solid #f1f5f9;
}

.venue-info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.v-name {
    font-size: 28rpx;
    font-weight: 600;
}

.v-addr {
    font-size: 22rpx;
    color: #94a3b8;
}

.v-status {
    font-size: 20rpx;
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    background: #f1f5f9;
    color: #94a3b8;
}

.v-status-on {
    background: #dcfce7;
    color: #15803d;
}

/* 已选场地卡片 */
.selected-venue-card {
    background: #f5f3ff;
    border: 2rpx solid #ddd6fe;
    border-radius: 16rpx;
    padding: 24rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.svc-name {
    font-size: 30rpx;
    font-weight: 700;
    color: #6d28d9;
    display: block;
    margin-bottom: 4rpx;
}

.svc-addr {
    font-size: 22rpx;
    color: #7c3aed;
}

.svc-change {
    font-size: 24rpx;
    color: #7c3aed;
    background: #ffffff;
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    font-weight: 600;
}

/* 场地开放规则规则卡片 (New) */
.venue-rules-card {
    margin-top: 24rpx;
    background: #fdf2f8;
    border: 2rpx dashed #f472b6;
    border-radius: 16rpx;
    padding: 24rpx;
}

.vrc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.vrc-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #be185d;
}

.vrc-status-active {
    font-size: 20rpx;
    color: #ffffff;
    background: #ec4899;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    font-weight: 600;
}

.vrc-label {
    font-size: 24rpx;
    color: #9d174d;
    font-weight: 600;
    margin-bottom: 12rpx;
    display: block;
}

.vrc-blocks {
    margin-bottom: 24rpx;
}

.vrc-header.no-margin {
    margin-bottom: 12rpx;
}

.vrc-badge {
    font-size: 20rpx;
    background: #db2777;
    color: #ffffff;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
    font-weight: 700;
}

.vrc-block-scroll {
    max-height: 320rpx;
}

.vrc-block-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.vrc-block-card {
    background: #ffffff;
    border: 2rpx solid #fbcfe8;
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    box-shadow: 0 4rpx 10rpx rgba(190, 24, 93, 0.05);
}

.vbc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
}

.vbc-date {
    font-size: 26rpx;
    font-weight: 700;
    color: #be185d;
}

.vbc-tag {
    font-size: 18rpx;
    color: #db2777;
    background: #fdf2f8;
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
    border: 1rpx solid #db2777;
    font-weight: 600;
}

.vbc-body {
    display: flex;
    align-items: flex-start;
}

.vbc-reason-label {
    font-size: 24rpx;
    color: #9d174d;
    font-weight: 600;
    flex-shrink: 0;
}

.vbc-reason-content {
    font-size: 24rpx;
    color: #be185d;
    line-height: 1.4;
}

/* 场地安排占用卡片 (New) */
.venue-events-card {
    margin-top: 24rpx;
    background: #fcf9f2;
    border: 2rpx dashed #d97706;
    border-radius: 16rpx;
    padding: 24rpx;
}

.vec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.vec-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #92400e;
}

.vec-count {
    font-size: 20rpx;
    color: #d97706;
    background: #fef3c7;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}

.vec-list {
    max-height: 400rpx;
    margin-bottom: 16rpx;
}

.vec-item {
    display: flex;
    align-items: flex-start;
    padding-bottom: 16rpx;
    margin-bottom: 16rpx;
    border-bottom: 1rpx solid rgba(217, 119, 6, 0.1);
}

.vec-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.vec-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: #d97706;
    margin-top: 10rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.vec-content {
    flex: 1;
}

.vec-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4rpx;
}

.vec-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #78350f;
}

.vec-tag {
    font-size: 18rpx;
    color: #ffffff;
    background: #f59e0b;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
}

.vec-time {
    font-size: 22rpx;
    color: #b45309;
    opacity: 0.8;
}

.vec-hint {
    font-size: 20rpx;
    color: #d97706;
    opacity: 0.7;
    font-style: italic;
    text-align: right;
    display: block;
}

.vrc-days {
    white-space: nowrap;
    width: 100%;
    margin-top: 8rpx;
}

.vrc-day-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    background: #ffffff;
    padding: 16rpx 24rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
    border: 1rpx solid #fbcfe8;
    min-width: 120rpx;
}

.vrc-day-today {
    background: #fdf2f8;
    border-color: #ec4899;
    box-shadow: 0 0 10rpx rgba(236, 72, 153, 0.2);
}

.vdi-day {
    font-size: 24rpx;
    font-weight: 700;
    color: #be185d;
    margin-bottom: 4rpx;
}

.vdi-time {
    font-size: 20rpx;
    color: #db2777;
}

/* 场地安排占用卡片 (New) */
.venue-events-card {
    margin-top: 24rpx;
    background: #fcf9f2;
    border: 2rpx dashed #d97706;
    border-radius: 16rpx;
    padding: 24rpx;
}

.vec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.vec-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #92400e;
}

.vec-count {
    font-size: 20rpx;
    color: #d97706;
    background: #fef3c7;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}

.vec-list {
    max-height: 360rpx;
    margin-bottom: 16rpx;
}

.vec-item {
    display: flex;
    align-items: flex-start;
    padding-bottom: 16rpx;
    margin-bottom: 16rpx;
    border-bottom: 1rpx solid rgba(217, 119, 6, 0.1);
}

.vec-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.vec-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: #d97706;
    margin-top: 10rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.vec-content {
    flex: 1;
}

.vec-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4rpx;
}

.vec-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #78350f;
}

.vec-tag {
    font-size: 18rpx;
    color: #ffffff;
    background: #f59e0b;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
}

.vec-time {
    font-size: 22rpx;
    color: #b45309;
    opacity: 0.8;
}

.vec-hint {
    font-size: 20rpx;
    color: #d97706;
    opacity: 0.7;
    font-style: italic;
    text-align: right;
    display: block;
}

/* 场次区块 */
.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
}

.add-btn {
    font-size: 22rpx;
    color: #7c3aed;
    background: #f5f3ff;
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    font-weight: 700;
}

.session-block {
    background: #f8fafc;
    border-radius: 16rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
    border: 1rpx solid #e2e8f0;
}

.session-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;
}

.session-index {
    font-size: 22rpx;
    background: #e2e8f0;
    color: #475569;
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
    font-weight: 700;
}

.session-del {
    font-size: 22rpx;
    color: #ef4444;
    font-weight: 600;
}

.time-picker-group {
    display: flex;
    gap: 12rpx;
    margin-bottom: 12rpx;
}

.tp-item {
    flex: 1;
    background: #ffffff;
    border: 1rpx solid #e2e8f0;
    border-radius: 12rpx;
    padding: 12rpx 16rpx;
    display: flex;
    flex-direction: column;
}

.tp-label {
    font-size: 18rpx;
    color: #94a3b8;
    margin-bottom: 2rpx;
}

.tp-val {
    font-size: 24rpx;
    font-weight: 600;
    color: #1e293b;
}

.ticket-input {
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1rpx solid #e2e8f0;
    border-radius: 12rpx;
    padding: 12rpx 16rpx;
}

.ti-label {
    font-size: 20rpx;
    color: #64748b;
    margin-right: 16rpx;
    width: 100rpx;
}

.ti-val {
    flex: 1;
    font-size: 24rpx;
    font-weight: 700;
    color: #0f172a;
}

/* 主体选择 */
.type-selector {
    display: flex;
    gap: 20rpx;
    margin-bottom: 32rpx;
}

.type-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    padding: 30rpx 0;
    background: #f8fafc;
    border: 4rpx solid transparent;
    border-radius: 20rpx;
    transition: all 0.3s;
}

.type-active {
    background: #f5f3ff;
    border-color: #7c3aed;
    transform: translateY(-4rpx);
}

.type-icon {
    font-size: 40rpx;
}

.type-item text:last-child {
    font-size: 26rpx;
    font-weight: 700;
    color: #475569;
}

.type-active text:last-child {
    color: #7c3aed;
}

.org-scroll {
    max-height: 300rpx;
}

.org-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 16rpx;
    margin-bottom: 12rpx;
}

.org-selected {
    border-color: #7c3aed;
    background: #f5f3ff;
}

.org-disabled {
    opacity: 0.6;
    background: #f1f5f9;
}

.org-name {
    font-size: 28rpx;
    font-weight: 600;
    margin-bottom: 6rpx;
}

.leader-badge {
    font-size: 18rpx;
    padding: 2rpx 10rpx;
    background: #dcfce7;
    color: #15803d;
    border-radius: 4rpx;
}

.member-badge {
    font-size: 18rpx;
    padding: 2rpx 10rpx;
    background: #fee2e2;
    color: #b91c1c;
    border-radius: 4rpx;
}

.org-check {
    color: #7c3aed;
    font-weight: 800;
}

.error-tip {
    font-size: 22rpx;
    color: #ef4444;
    margin-top: 12rpx;
    display: block;
}

/* 基础信息 */
.textarea {
    width: 100%;
    height: 240rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 16rpx;
    padding: 20rpx;
    font-size: 28rpx;
}

.textarea.mini {
    height: 120rpx;
}

.poster-upload {
    width: 100%;
    height: 360rpx;
    background: #f8fafc;
    border: 2rpx dashed #cbd5e1;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.poster-p {
    width: 100%;
    height: 100%;
}

.poster-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #94a3b8;
    font-weight: 600;
}

.plus {
    font-size: 60rpx;
    line-height: 1;
    margin-bottom: 10rpx;
}

/* 演职人员 */
.staff-card {
    display: flex;
    align-items: center;
    background: #f8fafc;
    padding: 20rpx;
    border-radius: 20rpx;
    margin-bottom: 20rpx;
    position: relative;
}

.staff-avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    overflow: hidden;
}

.staff-avatar image {
    width: 100%;
    height: 100%;
}

.staff-info {
    flex: 1;
}

.staff-input {
    width: 100%;
    font-size: 26rpx;
}

.staff-input.name {
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4rpx;
}

.staff-input.type {
    color: #64748b;
}

.staff-del {
    padding: 10rpx;
    color: #94a3b8;
    font-size: 32rpx;
}

.add-staff-btn {
    text-align: center;
    padding: 24rpx;
    background: #f8fafc;
    border: 2rpx dashed #cbd5e1;
    border-radius: 20rpx;
    color: #64748b;
    font-size: 24rpx;
    font-weight: 600;
}

/* 底部按钮 */
.footer-spacer {
    height: 160rpx;
}

.footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 32rpx;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    z-index: 100;
}

.submit-btn {
    height: 96rpx;
    line-height: 96rpx;
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    color: #ffffff;
    font-weight: 700;
    border-radius: 48rpx;
    box-shadow: 0 10rpx 25rpx -5rpx rgba(124, 58, 237, 0.4);
    border: none;
}

.submit-btn:active {
    transform: scale(0.98);
    opacity: 0.9;
}

.empty-hint {
    text-align: center;
    padding: 40rpx;
    color: #94a3b8;
    font-size: 24rpx;
}

/* 编辑页特有样式 */
.footer-actions {
    display: flex;
    gap: 32rpx;
}

.cancel-btn,
.save-btn {
    flex: 1;
    height: 96rpx;
    line-height: 96rpx;
    border-radius: 48rpx;
    font-size: 30rpx;
    font-weight: 700;
}

.cancel-btn {
    background: #f1f5f9;
    color: #64748b;
    border: none;
}

.save-btn {
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    color: #ffffff;
    box-shadow: 0 10rpx 25rpx -5rpx rgba(124, 58, 237, 0.4);
    border: none;
}

.picker-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18rpx 24rpx;
    background: #f8fafc;
    border: 2rpx solid #e2e8f0;
    border-radius: 12rpx;
}

.picker-box .val {
    font-size: 28rpx;
    color: #1e293b;
}

.arrow {
    border: solid #94a3b8;
    border-width: 0 4rpx 4rpx 0;
    display: inline-block;
    padding: 6rpx;
    transform: rotate(45deg);
}

/* Session independent venue styles */
.session-venue-mini {
    background: #fdf2f8;
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin-bottom: 24rpx;
    border: 1rpx solid rgba(236, 72, 153, 0.1);
}

.label-mini {
    font-size: 24rpx;
    color: #db2777;
    font-weight: 700;
    margin-bottom: 8rpx;
    display: block;
    text-transform: uppercase;
    letter-spacing: 1rpx;
}

.sv-mini-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sv-mini-name {
    font-size: 32rpx;
    color: #1f2937;
    font-weight: 600;
    flex: 1;
}

.sv-mini-tag {
    font-size: 22rpx;
    background: #be185d;
    color: #fff;
    padding: 2rpx 8rpx;
    border-radius: 4rpx;
    margin-left: 12rpx;
    font-weight: 400;
}

.sv-mini-btn {
    font-size: 28rpx;
    color: #db2777;
    font-weight: 600;
    margin-left: 16rpx;
    padding: 4rpx 12rpx;
    background: #fff;
    border: 1rpx solid #db2777;
    border-radius: 8rpx;
}

/* Session search box */
.session-search-box {
    margin-top: 16rpx;
    background: #fff;
    border-radius: 8rpx;
    padding: 8rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.search-box.mini {
    height: 70rpx;
    background: #f9fafb !important;
    border-radius: 8rpx;
    padding: 0 16rpx;
    display: flex;
    align-items: center;
}

.search-box.mini .input {
    flex: 1;
    font-size: 28rpx;
    margin: 0 12rpx;
    height: 100%;
}

.search-close {
    font-size: 32rpx;
    color: #9ca3af;
    padding: 0 8rpx;
}

.venue-results.mini {
    max-height: 300rpx;
    margin-top: 8rpx;
    border-top: 1rpx solid #f3f4f6;
}

.venue-item.mini {
    padding: 20rpx;
    border-bottom: 1rpx solid #f9fafb;
}

.venue-item.mini:last-child {
    border-bottom: none;
}

.venue-item.mini .v-name {
    font-size: 28rpx;
    color: #374151;
    font-weight: 600;
    margin-bottom: 4rpx;
}

.venue-item.mini .v-addr {
    font-size: 24rpx;
    color: #6b7280;
}

/* Mini Rules and Events Styles */
.venue-rules-card.mini {
    margin-top: 16rpx;
    background: #fff;
    border-radius: 8rpx;
    padding: 16rpx;
    border: 1rpx dashed #f472b6;
}

.venue-rules-card.mini .vrc-title {
    font-size: 28rpx;
    color: #be185d;
    font-weight: 700;
}

.vrc-blocks.mini {
    margin: 12rpx 0;
}

.vrc-block-scroll.mini {
    max-height: 180rpx;
}

.vrc-block-mini-item {
    display: flex;
    justify-content: space-between;
    padding: 8rpx 0;
    border-bottom: 1rpx solid #fdf2f8;
}

.vbmi-date {
    font-size: 24rpx;
    color: #db2777;
    font-weight: 600;
}

.vbmi-reason {
    font-size: 22rpx;
    color: #9d174d;
}

.venue-events-card.mini {
    margin-top: 12rpx;
    background: #fff;
    border-radius: 8rpx;
    padding: 16rpx;
    border: 1rpx dashed #d97706;
}

.venue-events-card.mini .vec-title {
    font-size: 28rpx;
    color: #92400e;
    font-weight: 700;
}

.vec-list.mini {
    max-height: 240rpx;
}

.vec-item.mini {
    display: flex;
    flex-direction: column;
    padding: 10rpx 0;
    border-bottom: 1rpx solid #fffbeb;
}

.vec-time {
    font-size: 24rpx;
    color: #b45309;
    margin-bottom: 4rpx;
}

.vec-name-mini {
    font-size: 26rpx;
    color: #78350f;
    font-weight: 600;
}
</style>
