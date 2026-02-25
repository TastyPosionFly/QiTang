<template>
    <view class="page">
        <!-- 页面头部 -->
        <view class="header">
            <view class="header-content">
                <text class="page-title">🎭 演出申请</text>
                <text class="page-subtitle">让每次灵感落地 · 填写申请详情</text>
            </view>
        </view>

        <!-- 步骤 1：场地与时间 -->
        <view class="section">
            <view class="section-title">
                <text class="section-icon">📍</text>
                <text>场地与时间</text>
            </view>
            <view class="card">
                <!-- 场次列表 -->
                <view class="form-item">
                    <view class="label-row">
                        <text class="label">演出场次</text>
                        <view class="add-btn" @tap="addSession">
                            <text>➕ 添加</text>
                        </view>
                    </view>

                    <view v-if="form.sessions.length === 0" class="empty-hint">暂无场次，请点击添加一个并选择场地</view>

                    <view v-for="(s, idx) in form.sessions" :key="idx" class="session-block">
                        <view class="session-header">
                            <text class="session-index">场次 {{ idx + 1 }}</text>
                            <text class="session-del" @tap="removeSession(idx)">删除</text>
                        </view>
                        <view class="session-body">
                            <!-- 每个场次独立的场地选择 -->
                            <view class="session-venue-mini">
                                <text class="label-mini">📍 场次地点选择</text>
                                <view class="sv-mini-box" @tap="activateSessionSearch(idx)">
                                    <view class="sv-mini-name-group">
                                        <text class="sv-mini-name">{{ s.venueName || '点击搜索并选择场地' }}</text>
                                        <text v-if="s.venueId" class="sv-mini-status-on">已选</text>
                                    </view>
                                    <text class="sv-mini-btn">{{ s.venueId ? '更改' : '选择' }}</text>
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

                                <!-- 新增：该场次所选场地的规则展示（按需展开或直接展示） -->
                                <view v-if="s.venueId && s.venueHoursAndBlocks" class="venue-rules-card mini">
                                    <view class="vrc-header">
                                        <text class="vrc-title">📅 开放规则</text>
                                    </view>
                                    <!-- 屏蔽日期 -->
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
                                    <!-- 开放时间表 (周一到周日) -->
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

                                <!-- 新增：该场次所选场地的后续占用情况 -->
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


                            <view class="time-picker-group">
                                <picker class="tp-item" mode="date" @change="onSessionDateChange(idx, $event, 'start')">
                                    <text class="tp-label">起</text>
                                    <text class="tp-val">{{ s.startDate || '选择日期' }}</text>
                                </picker>
                                <picker class="tp-item" mode="time" @change="onSessionTimeChange(idx, $event, 'start')">
                                    <text class="tp-label">时</text>
                                    <text class="tp-val">{{ s.startTimeOnly || '时间' }}</text>
                                </picker>
                            </view>
                            <view class="time-picker-group">
                                <picker class="tp-item" mode="date" @change="onSessionDateChange(idx, $event, 'end')">
                                    <text class="tp-label">止</text>
                                    <text class="tp-val">{{ s.endDate || '选择日期' }}</text>
                                </picker>
                                <picker class="tp-item" mode="time" @change="onSessionTimeChange(idx, $event, 'end')">
                                    <text class="tp-label">时</text>
                                    <text class="tp-val">{{ s.endTimeOnly || '时间' }}</text>
                                </picker>
                            </view>
                            <view class="ticket-input">
                                <text class="ti-label">可售票数</text>
                                <input type="number" v-model="s.ticketTotal" placeholder="0" class="ti-val" />
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <!-- 步骤 2：申请主体 -->
        <view class="section">
            <view class="section-title">
                <text class="section-icon">👤</text>
                <text>申请主体</text>
            </view>
            <view class="card">
                <view class="type-selector">
                    <view class="type-item" :class="{ 'type-active': organizerType === 'USER' }"
                        @tap="changeOrganizerType('USER')">
                        <text class="type-icon">🆔</text>
                        <text>个人名义</text>
                    </view>
                    <view class="type-item" :class="{ 'type-active': organizerType === 'ORGANIZATION' }"
                        @tap="changeOrganizerType('ORGANIZATION')">
                        <text class="type-icon">🏢</text>
                        <text>组织名义</text>
                    </view>
                </view>

                <view v-if="organizerType === 'ORGANIZATION'" class="org-list">
                    <text class="label">选择所属组织</text>
                    <scroll-view v-if="myOrgs.length > 0" scroll-y class="org-scroll">
                        <view v-for="org in myOrgs" :key="org.id" class="org-card" :class="{
                            'org-selected': selectedOrg && selectedOrg.id === org.id,
                            'org-disabled': !org.isLeader
                        }" @tap="selectOrg(org)">
                            <view class="org-main">
                                <text class="org-name">{{ org.name }}</text>
                                <text v-if="org.isLeader" class="leader-badge">负责人</text>
                                <text v-else class="member-badge">非负责人</text>
                            </view>
                            <view class="org-check" v-if="selectedOrg && selectedOrg.id === org.id">✔</view>
                        </view>
                    </scroll-view>
                    <view v-else class="empty-hint">你尚未中加入任何组织</view>
                    <text v-if="selectedOrg && !selectedOrg.isLeader" class="error-tip">⚠️ 只有组织负责人可以代表组织申请演出</text>
                </view>
            </view>
        </view>

        <!-- 步骤 3：基本信息 -->
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
                <view class="form-item">
                    <text class="label">申请理由</text>
                    <textarea class="textarea mini" v-model="form.applyReason" placeholder="可选，说明申请此次演出的背景..." />
                </view>
            </view>
        </view>

        <!-- 步骤 4：演职人员 -->
        <view class="section last">
            <view class="section-title">
                <text class="section-icon">🎭</text>
                <text>演职人员</text>
            </view>
            <view class="card">
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
            <button class="submit-btn" :loading="submitting" @tap="submitApplication">提交申请</button>
        </view>
    </view>
</template>

<script>
import api from '@/utils/api'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            venues: [],
            venueKeyword: '',
            myOrgs: [],
            selectedOrg: null,
            organizerType: 'USER',
            form: {
                title: '',
                description: '',
                posterFile: '',
                posterUrl: '',
                categoryId: null,
                organizerType: 'USER',
                organizerId: null,
                sessions: [],
                staffList: [],
                applyReason: ''
            },
            posterPreview: '',
            submitting: false,
            activeSessionVenueIdx: -1,
        }
    },
    computed: {
        organizerTypeLabel() {
            return this.organizerType === 'USER' ? '个人申请' : '组织申请'
        }
    },
    onLoad() {
        this.fetchMyOrgs()
        // 不要在这里默认初始化，让用户手动添加更清晰，或者根据需要初始化
        if (this.form.sessions.length === 0) this.addSession()
    },
    methods: {
        changeOrganizerType(type) {
            this.organizerType = type
            this.form.organizerType = type
            if (type === 'USER') this.selectedOrg = null
        },
        renderVenueStatus(v) {
            if (!v) return ''
            if (v.status === 0) return '维护中/屏蔽'
            return '可用'
        },
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
            // 获取该场地的规则与后续安排
            this.fetchSessionVenueData(v.id, idx)
            this.activeSessionVenueIdx = -1
        },
        fetchSessionVenueData(venueId, idx) {
            if (!venueId) return
            // 1. 获取开放规则
            api.request({ url: `/api/venues/${venueId}/hours-and-blocks`, method: 'GET' })
                .then(res => {
                    if (res?.success) {
                        this.$set(this.form.sessions[idx], 'venueHoursAndBlocks', res.data)
                    }
                })
                .catch(() => { })

            // 2. 获取具体占用情况 (未来 6 个月)
            const today = new Date()
            const start = this.formatDate(today)
            const endDate = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())
            const end = this.formatDate(endDate)

            api.request({ url: `/api/venues/${venueId}/events`, method: 'GET', data: { start, end } })
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

        // --- 场地开放规则助手 ---
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
        // --- End ---

        // 格式化展示已占用的场次时间
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
        removeSession(i) { this.form.sessions.splice(i, 1) },
        onSessionDateChange(idx, e, which) {
            const v = e.detail && (e.detail.value || e.detail) ? (e.detail.value || e.detail) : ''
            if (which === 'start') this.form.sessions[idx].startDate = v
            else this.form.sessions[idx].endDate = v
            this.combineSessionDateTime(idx)
        },
        onSessionTimeChange(idx, e, which) {
            const v = e.detail && (e.detail.value || e.detail) ? (e.detail.value || e.detail) : ''
            if (which === 'start') this.form.sessions[idx].startTimeOnly = v
            else this.form.sessions[idx].endTimeOnly = v
            this.combineSessionDateTime(idx)
        },
        combineSessionDateTime(idx) {
            const s = this.form.sessions[idx]
            const buildLocal = (datePart, timePart) => {
                if (!datePart || !timePart) return null
                const [y, m, d] = datePart.split('-').map(Number)
                const [hh, mm] = timePart.split(':').map(Number)
                const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0)
                const yy = dt.getFullYear()
                const mm2 = String(dt.getMonth() + 1).padStart(2, '0')
                const dd = String(dt.getDate()).padStart(2, '0')
                const hh2 = String(dt.getHours()).padStart(2, '0')
                const min2 = String(dt.getMinutes()).padStart(2, '0')
                return `${yy}-${mm2}-${dd}T${hh2}:${min2}:00`
            }

            if (s.startDate && s.startTimeOnly) {
                s.startTime = buildLocal(s.startDate, s.startTimeOnly)
            }
            if (s.endDate && s.endTimeOnly) {
                s.endTime = buildLocal(s.endDate, s.endTimeOnly)
            }
        },
        fetchMyOrgs() {
            api.request({ url: '/api/organization/my-organizations', method: 'GET' })
                .then(res => {
                    if (res?.success && Array.isArray(res.data)) {
                        const userId = uni.getStorageSync('userId')
                        this.myOrgs = res.data.map(o => ({
                            ...o,
                            isLeader: String(o.leaderId || o.leader) === String(userId)
                        }))
                    } else {
                        this.myOrgs = []
                    }
                })
                .catch(() => { this.myOrgs = [] })
        },
        selectOrg(org) { this.selectedOrg = org },
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
        addStaff() { this.form.staffList.push({ staffName: '', staffType: '', introduction: '', staffAvatarFile: '', staffAvatar: '' }) },
        removeStaff(i) { this.form.staffList.splice(i, 1) },
        chooseStaffPhoto(idx) {
            uni.chooseImage({
                count: 1, success: (res) => {
                    const p = res.tempFilePaths && res.tempFilePaths[0]
                    if (!p) return
                    this.form.staffList[idx].staffAvatarFile = p
                    this.form.staffList[idx].staffAvatar = p
                }
            })
        },
        validateSessions() {
            const sessions = this.form.sessions
            if (sessions.length === 0) { showError('请至少添加一个场次'); return false }
            for (let i = 0; i < sessions.length; i++) {
                const a = sessions[i]
                if (!a.venueId) { showError(`场次 ${i + 1} 尚未选择场地`); return false }
                if (!a.startTime || !a.endTime) { showError(`场次 ${i + 1} 日期时间不完整`); return false }
                if (new Date(a.startTime) >= new Date(a.endTime)) { showError(`场次 ${i + 1} 结束时间不能早于开始时间`); return false }
                if (new Date(a.startTime) <= new Date()) { showError(`场次 ${i + 1} 必须是将来时间`); return false }

                // --- 递归校验每个场地的规则 (由各自 session 对象携带) ---
                if (a.venueHoursAndBlocks) {
                    const vBlocks = a.venueHoursAndBlocks
                    const blockDate = a.startDate
                    if (vBlocks.blockedDates && vBlocks.blockedDates.some(b => b.date === blockDate)) {
                        const bObj = vBlocks.blockedDates.find(b => b.date === blockDate)
                        showError(`场次 ${i + 1} 日期 ${blockDate} 为屏蔽日期 (原因: ${bObj.reason || '不可用'})，请重新选择`); return false
                    }

                    const dtStart = new Date(a.startTime)
                    const day = dtStart.getDay()
                    const rule = vBlocks.openingHours && vBlocks.openingHours.find(h =>
                        h.dayOfWeek === day || (day === 0 && h.dayOfWeek === 7) || (day === 7 && h.dayOfWeek === 0)
                    )
                    if (!rule || !rule.openTime || !rule.closeTime) {
                        showError(`场次 ${i + 1} 所选场地在 ${this.formatDayOfWeek(day)} 不对公众开放`); return false
                    }

                    const stTime = a.startTimeOnly
                    const etTime = a.endTimeOnly
                    if (stTime < rule.openTime || etTime > rule.closeTime) {
                        showError(`场次 ${i + 1} 已超出该场地 ${this.formatDayOfWeek(day)} 的开放时间范围 (${rule.openTime} ~ ${rule.closeTime})`); return false
                    }
                }

                // 场地冲突校验 (由各自 session 对象携带的 events 列表)
                if (a.venueEvents && a.venueEvents.length) {
                    const sSt = new Date(a.startTime).getTime(), sEt = new Date(a.endTime).getTime()
                    for (let e of a.venueEvents) {
                        const eSt = new Date(e.startTime).getTime(), eEt = new Date(e.endTime).getTime()
                        if (!(sEt <= eSt || sSt >= eEt)) {
                            showError(`选中的场次 ${i + 1} 与该场地已有活动时间冲突`); return false
                        }
                    }
                }
            }

            // 内部冲突 (场次之间即便场地不同，时间通常也不建议重叠，或者至少同一个人/组织不能同时在两个地方)
            for (let i = 0; i < sessions.length; i++) {
                for (let j = i + 1; j < sessions.length; j++) {
                    const A = sessions[i], B = sessions[j]
                    if (!(new Date(A.endTime) <= new Date(B.startTime) || new Date(B.endTime) <= new Date(A.startTime))) {
                        showError(`场次 ${i + 1} 与 场次 ${j + 1} 时间存在重叠`); return false
                    }
                }
            }
            return true
        },
        async submitApplication() {
            if (this.form.sessions.some(s => !s.venueId)) { showError('请为所有场次选择场地'); return }
            if (!this.form.title.trim()) { showError('请填写演出标题'); return }
            if (this.organizerType === 'ORGANIZATION') {
                if (!this.selectedOrg) { showError('请选择主办组织'); return }
                if (!this.selectedOrg.isLeader) { showError('您不是该组织的负责人'); return }
            }
            if (!this.validateSessions()) return

            const organizerId = this.organizerType === 'USER' ? Number(uni.getStorageSync('userId')) : Number(this.selectedOrg.id)

            const payload = {
                title: this.form.title.trim(),
                description: this.form.description || '',
                posterUrl: this.form.posterUrl || '',
                categoryId: this.form.categoryId || 1,
                organizerType: this.organizerType,
                organizerId: organizerId,
                sessions: this.form.sessions.map(s => ({ venueId: s.venueId, venueName: s.venueName, startTime: s.startTime, endTime: s.endTime, ticketTotal: Number(s.ticketTotal) || 0 })),
                staffList: this.form.staffList.map(st => ({ staffName: st.staffName, staffType: st.staffType, introduction: st.introduction || '' })),
                applyReason: this.form.applyReason || ''
            }

            this.submitting = true
            uni.showLoading({ title: '提交中...' })

            try {
                const token = uni.getStorageSync('token')
                const headers = token ? { Authorization: `Bearer ${token}` } : {}

                const res = await api.request({ url: '/api/performance/apply', method: 'POST', data: payload })
                if (!res?.success) { showError(res?.message || '提交失败'); this.submitting = false; uni.hideLoading(); return }

                const perfId = res.id || (res.data && res.data.id)
                if (!perfId) {
                    showError('未能获取演出 ID'); this.submitting = false; uni.hideLoading(); return
                }

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
                    }).catch(() => {
                        showError('海报上传失败，已提交申请草稿')
                    })
                }

                await this.uploadStaffPhotos(perfId)

                showSuccess('申请提交成功')
                setTimeout(() => uni.navigateBack(), 1200)
                this.submitting = false
                uni.hideLoading()
            } catch (err) {
                console.error('submitApplication error', err)
                showError('请求异常')
                this.submitting = false
                uni.hideLoading()
            }
        },
        async uploadStaffPhotos(perfId) {
            const token = uni.getStorageSync('token')
            if (!token) return
            const photos = this.form.staffList.filter(s => s.staffAvatarFile)
            if (photos.length === 0) return

            for (let st of photos) {
                try {
                    await new Promise((resolve, reject) => {
                        uni.uploadFile({
                            url: `${api.BASE_URL}/api/performance/${perfId}/staff-photos`,
                            filePath: st.staffAvatarFile,
                            name: 'staffPhotos',
                            header: { Authorization: `Bearer ${token}` },
                            success: (r) => resolve(r),
                            fail: (e) => reject(e)
                        })
                    })
                } catch (e) { console.error('Staff photo upload failed', e) }
            }
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
