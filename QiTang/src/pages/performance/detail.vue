<template>
    <view class="page">


        <!-- 加载状态 -->
        <view v-if="loading" class="loading-state">
            <text>加载中...</text>
        </view>

        <!-- 错误状态 -->
        <view v-else-if="error" class="error-state">
            <text class="error-icon">⚠️</text>
            <text class="error-title">{{ error }}</text>
            <button class="retry-btn" @tap="fetchDetail">重新加载</button>
        </view>

        <!-- 详情内容 -->
        <view v-else-if="performance" class="content">
            <!-- 海报区域 -->
            <view class="poster-section">
                <image class="poster-image" :src="performance.coverUrl || defaultCover" mode="aspectFill"
                    @error="onPosterError"></image>
                <view class="poster-overlay">
                    <view class="status-badge" :class="getStatusClass(performance.statusDesc)">
                        <text>{{ performance.statusDesc }}</text>
                    </view>
                </view>
            </view>

            <!-- 基本信息卡片 -->
            <view class="info-card">
                <view class="perf-title-row">
                    <text class="perf-title">{{ performance.name }}</text>
                    <view v-if="canEdit" class="edit-btn-mini" @tap="goEdit">
                        <text class="edit-icon-mini">✏️</text>
                        <text>编辑</text>
                    </view>
                    <view class="share-btn-mini" @tap="generateShareQr">
                        <text class="share-icon-mini">🔗</text>
                        <text>生成二维码</text>
                    </view>
                </view>
                <view class="perf-detail-stats">
                    <view class="stat-item">
                        <text class="stat-icon">🔥</text>
                        <text class="stat-label">热度</text>
                        <text class="stat-value">{{ performance.hotScore ? performance.hotScore.toFixed(1) : '0.0'
                            }}</text>
                    </view>
                    <view class="stat-item">
                        <text class="stat-icon">👁</text>
                        <text class="stat-label">浏览</text>
                        <text class="stat-value">{{ performance.viewCount || 0 }}</text>
                    </view>
                    <view class="stat-item">
                        <text class="stat-icon">💬</text>
                        <text class="stat-label">评论</text>
                        <text class="stat-value">{{ performance.commentCount || 0 }}</text>
                    </view>
                </view>
                <text class="perf-desc">{{ performance.description }}</text>
            </view>

            <!-- 场次信息卡片 -->
            <view v-if="performance.sessions && performance.sessions.length" class="section-card"
                :class="{ 'section-disabled': performance.sessionsDisabled }">
                <view class="section-header">
                    <text class="section-icon">📅</text>
                    <text class="section-title">演出场次</text>
                    <text class="section-hint" v-if="performance.publishStatus === 1">请选择心仪场次进行预约</text>
                </view>
                <view class="session-list-modern">
                    <view v-for="(session, idx) in performance.sessions" :key="idx" class="session-card-modern"
                        :class="{ 'session-ended': session.sessionEnded, 'session-ongoing': session.sessionOngoing }"
                        @tap="goVenueDetail(session)">
                        <!-- 右上角预览：仅在存在电子票时显示 -->
                        <view v-if="session.hasTicketTemplate" class="session-eye"
                            @tap.stop="previewTicketTemplate(session)">
                            <text class="eye-icon">👁</text>
                        </view>

                        <view class="session-main-modern">
                            <view class="session-info-left">
                                <view class="venue-row-modern">
                                    <text class="venue-name-bold">{{ session.venueName }}</text>
                                </view>

                                <view class="badge-row-modern">
                                    <view v-if="session.sessionEnded" class="badge-mini badge-gray">已结束</view>
                                    <view v-else-if="session.sessionOngoing" class="badge-mini badge-yellow">演出中</view>
                                    <view v-else-if="performance.showTicketInfo" class="badge-mini badge-purple">
                                        剩余 {{ session.ticketSurplus }}/{{ session.ticketTotal }}
                                    </view>

                                    <!-- 管理员操作：更轻量的展示方式 -->
                                    <view
                                        v-if="(canEdit || isCurrentUserAdmin()) && !session.sessionEnded && !session.sessionOngoing"
                                        class="admin-action-btn" @tap.stop="openTemplateUploader(session)">
                                        <text class="admin-action-text">{{ session.hasTicketTemplate ? '更新电子票' :
                                            '设置电子票背景' }}</text>
                                    </view>
                                </view>

                                <view class="time-grid-modern">
                                    <view class="time-item-modern">
                                        <text class="time-icon">🕒</text>
                                        <text class="time-text">{{ formatSessionTime(session.startTime) }} 开始</text>
                                    </view>
                                    <view class="time-item-modern">
                                        <text class="time-icon">🏁</text>
                                        <text class="time-text">{{ formatSessionTime(session.endTime) }} 结束</text>
                                    </view>
                                </view>
                            </view>
                            <view class="session-btn-wrap">
                                <button v-if="!getSessionId(session)" class="btn-modern btn-disabled"
                                    disabled>无法识别ID</button>
                                <button v-else-if="performance.sessionsDisabled" class="btn-modern btn-disabled"
                                    disabled>不可预约</button>
                                <button v-else-if="session.sessionEnded" class="btn-modern btn-disabled"
                                    disabled>已结束</button>
                                <button v-else-if="session.sessionOngoing" class="btn-modern btn-yellow"
                                    disabled>进行中</button>
                                <button v-else-if="isSessionBooked(session)" class="btn-modern btn-success-bordered"
                                    disabled>已预约</button>
                                <button v-else-if="performance.showTicketInfo && session.ticketSurplus <= 0"
                                    class="btn-modern btn-disabled" disabled>名额不足</button>
                                <button v-else class="btn-modern btn-primary-pill"
                                    :disabled="bookingLoading[getSessionId(session)]" @tap.stop="bookSession(session)">
                                    {{ bookingLoading[getSessionId(session)] ? '预约中' : '立即预约' }}
                                </button>
                                <!-- 仅在场次结束后且用户为组织者/管理员显示出席名单入口 -->
                                <button v-if="session.sessionEnded && (canEdit || isCurrentUserAdmin())"
                                    class="btn-modern btn-outline" @tap.stop="viewAttendance(session)">📊 出席名单 </button>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 主演信息卡片 -->
            <view v-if="performance.staff && performance.staff.length" class="section-card">
                <view class="section-header">
                    <text class="section-icon">🎭</text>
                    <text class="section-title">主演阵容</text>
                    <text class="section-hint">左右滑动查看更多</text>
                </view>
                <scroll-view class="staff-scroll" scroll-x enable-flex show-scrollbar="false">
                    <view class="staff-list">
                        <view v-for="(person, idx) in performance.staff" :key="idx" class="staff-card">
                            <image class="staff-avatar" :src="person.staffAvatar || noAvatarSrc" mode="aspectFill"
                                @error="onImgError">
                            </image>
                            <text class="no-avatar-label" v-if="!person.staffAvatar">未上传头像</text>
                            <view class="staff-info">
                                <text class="staff-name">{{ person.staffName }}</text>
                                <text v-if="person.staffType || person.position || person.role"
                                    class="staff-position">{{ person.staffType || person.position || person.role
                                    }}</text>
                                <text v-if="person.introduction || person.description" class="staff-intro">{{
                                    person.introduction || person.description }}</text>
                            </view>
                        </view>
                    </view>
                </scroll-view>
            </view>

            <!-- 视频回放与直播：组织者/管理员可添加回放或直播观看链接 -->
            <view v-if="(mediaLinks && mediaLinks.length) || canManageMedia" class="section-card">
                <view class="section-header">
                    <text class="section-icon">🎬</text>
                    <text class="section-title">视频回放与直播</text>
                    <text class="section-hint">共 {{ mediaLinks && mediaLinks.length ? mediaLinks.length : 0 }} 项</text>
                </view>

                <view v-if="mediaLinks && mediaLinks.length" class="media-list">
                    <view v-for="(m, idx) in mediaLinks" :key="m.id || idx" class="media-item">
                        <view class="media-left">
                            <view class="media-badges">
                                <text class="type-badge">{{ m.typeName || (m.type === 1 ? '录像回放' : m.type === 2 ? '在线直播'
                                    : '未知类型') }}</text>
                                <text class="platform-badge">{{ m.platformName || '' }}</text>
                            </view>
                            <text class="media-title">{{ m.title || m.externalKey || m.typeName }}</text>
                            <text class="media-sub">{{ m.platformName }} · {{ m.typeName }}</text>
                        </view>
                        <view class="media-actions">
                            <button class="copy-btn" @tap="copyMediaLink(m)">复制链接</button>
                            <button v-if="canManageMedia" class="copy-btn" style="margin-left:12rpx;background:#ef4444;"
                                @tap="deleteMediaLink(m.id)">删除</button>
                        </view>
                    </view>
                </view>

                <view v-else class="media-empty" style="padding:24rpx;text-align:center;color:#6b7280;">
                    <text style="font-size:28rpx;font-weight:700;display:block;margin-bottom:8rpx;">暂无回放或直播链接</text>
                    <text v-if="canManageMedia"
                        style="font-size:22rpx;display:block;margin-bottom:8rpx;">你可以为本场演出添加视频回放或直播链接，方便观众观看</text>
                    <text v-else style="font-size:20rpx;color:#9ca3af;display:block;">暂无回放或直播链接</text>
                </view>

                <view style="margin-top:12rpx;display:flex;justify-content:flex-end;">
                    <button v-if="canManageMedia" class="copy-btn" @tap="openNewMediaModal">添加外链</button>
                </view>

                <!-- 新媒体弹窗 -->
                <view v-if="newMediaModalVisible" class="modal-mask">
                    <view class="modal-box">
                        <view class="modal-header">
                            <text class="modal-title">添加回放/直播链接</text>
                            <text class="modal-close" @tap="closeNewMediaModal">✕</text>
                        </view>
                        <view class="modal-body">
                            <input class="input" placeholder="标题（选填）" v-model="newMedia.title" />
                            <input class="input" placeholder="外部链接 externalKey（必填）" v-model="newMedia.externalKey" />
                            <view style="display:flex;gap:12rpx;margin-top:8rpx;align-items:center;">
                                <picker mode="selector" :range="typeLabels" :value="newMedia.typeIndex"
                                    @change="onNewMediaTypeChange">
                                    <view class="picker">类型：{{ typeLabels[newMedia.typeIndex] || '未知' }}</view>
                                </picker>
                                <picker mode="selector" :range="platformLabels" :value="newMedia.platformIndex"
                                    @change="onNewMediaPlatformChange">
                                    <view class="picker">平台：{{ platformLabels[newMedia.platformIndex] || '其他' }}</view>
                                </picker>
                                <input class="input" type="number" placeholder="权重（数字）"
                                    v-model.number="newMedia.sortOrder" style="width:140rpx;" />
                            </view>
                        </view>
                        <view class="modal-footer">
                            <button class="pag-btn" @tap="closeNewMediaModal">取消</button>
                            <button class="copy-btn" @tap="addMediaLink" style="margin-left:12rpx;">添加</button>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 评论区 -->
            <view class="section-card">
                <view class="section-header">
                    <view class="header-left">
                        <text class="section-icon">💬</text>
                        <text class="section-title">最新评论</text>
                        <text class="section-hint" style="margin-left:12rpx;">共 {{ commentsTotal ||
                            performance.commentCount || 0 }} 条</text>
                    </view>
                    <view class="section-hint" @tap="fetchComments(0)"
                        style="margin-left:auto;display:flex;align-items:center;gap:6rpx;">
                        <text>刷新</text>
                        <text style="font-size:24rpx;">🔄</text>
                    </view>
                </view>

                <view v-if="comments && comments.length" class="comments-list-refined">
                    <view v-for="(c, i) in comments" :key="c.id || i" class="comment-card-modern">
                        <image class="comment-avatar-modern"
                            :src="(c.userStatus === 0 || c.banned || c.isBanned) ? (wechatDefaultAvatar || noAvatarSrc) : (c.avatarUrl || noAvatarSrc)"
                            mode="aspectFill" @longpress="onCommentAvatarLongpress(c)" @error="onImgError"></image>
                        <view class="comment-content-wrap">
                            <view class="comment-meta-top">
                                <text class="nickname-bold"
                                    :class="{ 'banned-name': (c.userStatus === 0 || c.banned || c.isBanned) }">{{
                                        (c.userStatus === 0 || c.banned || c.isBanned) ? '封禁用户' : (c.nickname || '匿名')
                                    }}</text>
                                <text class="time-light">{{ formatSessionTime(c.createTime) }}</text>
                            </view>
                            <view class="comment-bubble">
                                <view v-if="c.status === 0" class="banned-content-placeholder">
                                    <text class="banned-icon">🚫</text>
                                    <text>该评论涉嫌违规，已被系统屏蔽</text>
                                </view>
                                <text v-else class="comment-text-main">{{ c.content }}</text>
                            </view>
                        </view>
                    </view>

                    <!-- 分页控制 -->
                    <view v-if="commentsTotal > commentsSize" class="pagination-refined">
                        <button class="pag-btn" :disabled="commentsPage === 0"
                            @tap="fetchComments(commentsPage - 1)">上一页</button>
                        <text class="pag-info">{{ commentsPage + 1 }} / {{ Math.ceil(commentsTotal / commentsSize)
                            }}</text>
                        <button class="pag-btn" :disabled="(commentsPage + 1) * commentsSize >= commentsTotal"
                            @tap="fetchComments(commentsPage + 1)">下一页</button>
                    </view>
                </view>
                <view v-else class="empty-comments-state">
                    <text class="empty-icon">🍃</text>
                    <text>暂无评论，虚位以待</text>
                </view>

                <!-- 输入区域 -->
                <view class="comment-input-bar">
                    <image v-if="isLoggedIn" class="input-avatar" :src="currentUserAvatar || noAvatarSrc"
                        mode="aspectFill" @error="onImgError"></image>
                    <view class="input-field-wrap">
                        <textarea class="textarea-refined" v-model="newCommentContent" auto-height
                            :placeholder="isLoggedIn ? '留下一份精彩评论...' : '请登录后参与讨论'"
                            :disabled="!canComment && !isLoggedIn"></textarea>
                        <view class="input-actions-row">
                            <text v-if="!isLoggedIn" class="login-prompt" @tap="goLogin">点击去登录</text>
                            <text v-else-if="userStatus === 0" class="banned-status-text">您目前处于封禁状态</text>
                            <button class="send-btn-refined" @tap="postComment"
                                :disabled="!canComment || posting">发布</button>
                        </view>
                    </view>
                </view>
            </view>



            <!-- 二维码弹窗 -->
            <view v-if="qrModalVisible" class="modal-mask" @tap="closeQrModal">
                <view class="modal-content" @tap.stop>
                    <view class="modal-header">
                        <text class="modal-title">分享二维码</text>
                        <view class="modal-close" @tap="closeQrModal">✕</view>
                    </view>
                    <view style="text-align:center;padding:20rpx;">
                        <image v-if="qrImageUrl" :src="qrImageUrl" mode="widthFix" style="max-width:80%;height:auto;"
                            @longpress="saveQrToAlbum"></image>
                        <text v-else>暂无二维码</text>
                    </view>
                    <view class="modal-footer">
                        <button class="ghost-btn" @tap="closeQrModal">关闭</button>
                        <button class="primary-btn" @tap="saveQrToAlbum">保存到相册</button>
                    </view>
                </view>
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
            performance: null,
            loading: false,
            error: '',
            defaultCover: '/static/default-performance.png'
            ,
            // comments
            comments: [],
            // media links
            mediaLinks: [],
            // new media form
            newMedia: {
                title: '',
                externalKey: '',
                type: 1,
                platform: 1,
                sortOrder: 0,
                // picker index mappings for user-facing labels
                typeIndex: 0,
                platformIndex: 0
            },
            newMediaModalVisible: false,

            // 前端显示标签与后端数值映射
            typeLabels: ['录像回放', '在线直播'],
            typeValues: [1, 2],
            platformLabels: ['Bilibili', '微信视频号', '其他'],
            platformValues: [1, 2, 3],
            commentsPage: 0,
            commentsSize: 10,
            commentsTotal: 0,
            newCommentContent: '',
            posting: false,
            // 兼容多种登录信息存储方式：优先读取 /me 缓存（onLoad 时会调用 refreshUserFromStorage()）
            __me: (uni.getStorageSync && uni.getStorageSync('me')) || null,
            userId: uni.getStorageSync('userId') || null,
            // 初始不从 storage 强行解读 status，避免空字符串误判；将在 refreshUserFromStorage 中统一处理
            userStatus: null,
            currentUserAvatar: uni.getStorageSync('avatar') || null,
            // 使用已存在的默认头像资源，避免请求不存在文件导致 500 错误
            noAvatarSrc: '/static/wechat-default-avatar.png',
            wechatDefaultAvatar: '/static/wechat-default-avatar.png'
            ,
            // 已预约的场次 ID 列表（用于前端显示一个人一个场次只能预约一次）
            myBookedSessionIds: [],
            // 每个场次的预约 loading 状态（以 sessionId 为键）
            bookingLoading: {}
            ,
            // 二维码分享状态
            qrModalVisible: false,
            qrImageUrl: '',
            generatingQr: false
        }
    },
    computed: {
        canEdit() {
            if (!this.performance) return false
            const userId = uni.getStorageSync('userId')
            const role = uni.getStorageSync('role')
            const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
            // 判断是否为举办者：支持 organizerType 为 USER 或 ORGANIZATION
            let isOwner = false
            try {
                const ot = this.performance.organizerType
                if (ot === 'USER') {
                    isOwner = String(this.performance.organizerId) === String(userId)
                } else if (ot === 'ORGANIZATION') {
                    // 组织负责人 ID（organizerLeaderId）与 organizer.leaderId 两者兼容
                    isOwner = String(this.performance.organizerLeaderId) === String(userId) || (this.performance.organizer && String(this.performance.organizer.leaderId) === String(userId))
                }
            } catch (e) {
                isOwner = String(this.performance.organizerId) === String(userId) || (this.performance.organizer && String(this.performance.organizer.leaderId) === String(userId))
            }
            return isOwner || isAdmin
        },

        // 仅用于媒体外链管理：组织者 / ADMIN / SUPER_ADMIN
        canManageMedia() {
            if (!this.performance) return false
            const userId = uni.getStorageSync('userId')
            const role = uni.getStorageSync('role')
            const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
            let isOwner = false
            try {
                const ot = this.performance.organizerType
                if (ot === 'USER') {
                    isOwner = String(this.performance.organizerId) === String(userId)
                } else if (ot === 'ORGANIZATION') {
                    isOwner = String(this.performance.organizerLeaderId) === String(userId) || (this.performance.organizer && String(this.performance.organizer.leaderId) === String(userId))
                }
            } catch (e) {
                isOwner = String(this.performance.organizerId) === String(userId) || (this.performance.organizer && String(this.performance.organizer.leaderId) === String(userId))
            }
            return isOwner || isAdmin
        },
        isLoggedIn() {
            return !!this.userId
        },
        canComment() {
            return this.isLoggedIn && this.userStatus === 1 && this.newCommentContent && this.newCommentContent.trim().length > 0
        }
    },
    onShareAppMessage() {
        this.reportShare()
        return {
            title: this.performance ? this.performance.name : '演出详情',
            path: `/pages/performance/detail?id=${this.performanceId}`
        }
    },
    onShareTimeline() {
        return {
            title: this.performance ? this.performance.name : '演出详情',
            query: `id=${this.performanceId}`
        }
    },
    onLoad(options) {
        const id = options && (options.id || options.performanceId)
        if (id) this.performanceId = id
        // 刷新本地缓存的用户信息，先尝试获取详情并上报浏览埋点
        this.refreshUserFromStorage()
        this.fetchDetail()
        this.reportView()
    },
    methods: {
        reportView() {
            if (!this.performanceId) return
            api.request({ url: `/api/recommendation/stats/view/${this.performanceId}`, method: 'POST' }).catch(() => { })
        },
        reportShare() {
            if (!this.performanceId) return
            api.request({ url: `/api/recommendation/stats/share/${this.performanceId}`, method: 'POST' }).catch(() => { })
        },
        /* shareToTimeline removed */
        fetchDetail() {
            if (!this.performanceId) return

            this.loading = true
            this.error = ''

            api.request({
                url: `/api/performance/${this.performanceId}`,
                method: 'GET'
            })
                .then((res) => {
                    if (!res?.success) {
                        this.error = res?.message || '获取演出详情失败'
                        return
                    }

                    const dto = res.data
                    if (!dto) {
                        this.error = '演出不存在'
                        return
                    }

                    // 映射后端 DTO 到页面数据
                    // 规范化后端返回的场次结构，兼容不同命名
                    const rawSessions = dto.sessions || []
                    const sessions = (rawSessions || []).map(s => {
                        const id = s && (s.id || s.sessionId || s.sessionID || s.sid) ? (s.id || s.sessionId || s.sessionID || s.sid) : null
                        return Object.assign({}, s, {
                            id: id,
                            // 兼容不同时间字段命名
                            startTime: s.startTime || s.start || s.beginTime || null,
                            endTime: s.endTime || s.end || s.finishTime || null,
                            venueName: s.venueName || (s.venue && (s.venue.name || s.venue.title)) || s.venueTitle || ''
                        })
                    })
                    // 按 sortorder 排序主演列表
                    const staff = (dto.staff || []).sort((a, b) => {
                        const orderA = a.sortorder !== undefined ? a.sortorder : 999999
                        const orderB = b.sortorder !== undefined ? b.sortorder : 999999
                        return orderA - orderB
                    })
                    const publishStatus = dto.publishStatus

                    // 计算总票数
                    let totalSurplus = 0
                    let totalTickets = 0
                    sessions.forEach(s => {
                        totalSurplus += (s.ticketSurplus || 0)
                        totalTickets += (s.ticketTotal || 0)
                    })

                    // 判断是否显示票务信息
                    const showTicketInfo = totalTickets > 0 && publishStatus !== 5 && publishStatus !== 3

                    // 根据场次的 startTime / endTime 计算每个场次的状态（始终计算，用于渲染灰/黄/可预约）
                    let isOngoing = false
                    let allSessionsEnded = false
                    let hasEndedSession = false
                    let hasNotStartedSession = false
                    try {
                        const now = Date.now()
                        let hasAnySession = false

                        for (let i = 0; i < sessions.length; i++) {
                            const s = sessions[i]
                            if (!s) continue
                            const st = s.startTime ? new Date(s.startTime).getTime() : NaN
                            const et = s.endTime ? new Date(s.endTime).getTime() : NaN

                            if (!isNaN(st) && !isNaN(et)) {
                                hasAnySession = true
                                // 为每个场次添加状态标记
                                if (now > et) {
                                    s.sessionEnded = true
                                    hasEndedSession = true
                                } else if (st <= now && now <= et) {
                                    s.sessionOngoing = true
                                    isOngoing = true
                                } else if (now < st) {
                                    s.sessionNotStarted = true
                                    hasNotStartedSession = true
                                }
                            }
                        }

                        // 如果有场次信息但没有正在进行或未开演的场次，说明全部结束
                        if (hasAnySession && !isOngoing && !hasNotStartedSession) {
                            allSessionsEnded = true
                        }
                    } catch (e) {
                        // ignore parse errors
                    }

                    // 计算显示的状态（时间判断只在 publishStatus === 1 时影响显示文本）
                    let displayStatus = dto.statusDesc || ''
                    if (publishStatus === 2) {
                        displayStatus = '已下架'
                    } else if (publishStatus === 1) {
                        // 只有未开演状态才进行时间判断
                        if (allSessionsEnded && sessions.length > 0) {
                            // 所有场次都已结束
                            displayStatus = '散场中'
                        } else if (hasEndedSession && hasNotStartedSession) {
                            // 有场次结束但还有未开演的场次
                            displayStatus = '未开演'
                        } else if (isOngoing) {
                            displayStatus = '演出中'
                        }
                    }

                    if (!displayStatus) {
                        displayStatus = '未知'
                    }

                    this.performance = {
                        id: dto.performanceId,
                        name: dto.title,
                        coverUrl: dto.posterUrl,
                        description: dto.description || '',
                        statusDesc: displayStatus,
                        publishStatus: publishStatus,
                        hotScore: dto.hotScore,
                        viewCount: dto.viewCount || 0,
                        commentCount: dto.commentCount || 0,
                        sessions: sessions,
                        staff: staff,
                        ticketSurplus: totalSurplus,
                        ticketTotal: totalTickets,
                        showTicketInfo: showTicketInfo,
                        organizerType: dto.organizerType,
                        organizerId: dto.organizerId,
                        organizerLeaderId: dto.organizerLeaderId,
                        organizerName: dto.organizerName,
                        organizer: dto.organizer,
                        // 标记整场演出是否全部场次已结束（供模板显示）
                        allSessionsEnded: !!allSessionsEnded,
                        // 当 publishStatus !== 1 时，视为不可预约（模块置灰）
                        sessionsDisabled: publishStatus !== 1
                    }

                    // 检查每个场次是否存在电子票（优先判断，有则缓存 URL 并显示眼睛按钮）
                    const checks = (this.performance.sessions || []).map(s => {
                        const sid = this.getSessionId(s)
                        if (!sid) {
                            try { this.$set(s, 'hasTicketTemplate', false) } catch (e) { s.hasTicketTemplate = false }
                            return Promise.resolve()
                        }
                        return this.fetchTemplateUrlForSession(sid).then(url => {
                            if (url) {
                                try { this.$set(s, 'ticketTemplateUrl', url); this.$set(s, 'hasTicketTemplate', true) } catch (e) { s.ticketTemplateUrl = url; s.hasTicketTemplate = true }
                            } else {
                                try { this.$set(s, 'hasTicketTemplate', false) } catch (e) { s.hasTicketTemplate = false }
                            }
                        }).catch(() => {
                            try { this.$set(s, 'hasTicketTemplate', false) } catch (e) { s.hasTicketTemplate = false }
                        })
                    })

                    Promise.all(checks).then(() => {
                        // 在完成场次电子票检查后再加载用户已预约、评论与媒体外链，避免 UI 提示与异步冲突
                        this.fetchMyTicketsForSessions()
                        this.fetchComments(0)
                        this.fetchMediaLinks()
                    })
                })
                .catch((err) => {
                    console.error('获取演出详情失败:', err)
                    this.error = '加载失败，请稍后重试'
                })
                .finally(() => {
                    this.loading = false
                })
        },
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
        getStatusClass(statusDesc) {
            const map = {
                '待审批': 'status-pending',
                '演出中': 'status-ongoing',
                '已发布': 'status-active',
                '售票中': 'status-active',
                '未开演': 'status-active',
                '已下架': 'status-ended',
                '已结束': 'status-ended',
                '散场中': 'status-ended',
                '审批拒绝': 'status-cancelled',
                '草稿': 'status-pending',
                '被征用/需重排': 'status-cancelled'
            }
            return map[statusDesc] || ''
        },
        goVenueDetail(session) {
            if (!session) return
            const vid = session.venueId || (session.venue && session.venue.id)
            if (vid) {
                // 同时传入 id 和 venueId 以兼容不同页面的参数约定
                uni.navigateTo({ url: `/pages/venue/detail?id=${vid}&venueId=${vid}` })
            } else {
                uni.showToast({ title: '无法跳转：缺少场地 ID', icon: 'none' })
            }
        },
        goBack() {
            uni.navigateBack()
        },
        goEdit() {
            if (!this.performanceId) return
            uni.navigateTo({ url: `/pages/performance/edit?id=${this.performanceId}` })
        }
        ,
        // 生成并展示分享二维码（调用后端生成小程序码）
        async generateShareQr() {
            if (!this.performance || !this.performance.id) {
                uni.showToast({ title: '演出信息缺失', icon: 'none' })
                return
            }
            this.generatingQr = true
            uni.showLoading({ title: '生成二维码中' })
            try {
                const id = this.performance.id
                const url = `${api.BASE_URL}/api/performance/${id}/wxacode`
                const token = uni.getStorageSync('token')
                const header = token ? { Authorization: `Bearer ${token}` } : {}
                const dl = await new Promise((resolve, reject) => {
                    uni.downloadFile({ url, header, success: (d) => resolve(d), fail: (err) => reject(err) })
                })
                uni.hideLoading()
                this.generatingQr = false
                if (dl && dl.statusCode === 200 && dl.tempFilePath) {
                    this.qrImageUrl = dl.tempFilePath
                    this.qrModalVisible = true
                } else if (dl && dl.statusCode) {
                    uni.showToast({ title: `生成失败，状态 ${dl.statusCode}`, icon: 'none' })
                } else {
                    uni.showToast({ title: '生成二维码失败', icon: 'none' })
                }
            } catch (e) {
                uni.hideLoading()
                this.generatingQr = false
                uni.showToast({ title: '生成二维码请求失败', icon: 'none' })
            }
        },
        async saveQrToAlbum() {
            if (!this.qrImageUrl) return
            uni.showLoading({ title: '保存中' })
            try {
                let tempPath = this.qrImageUrl
                if (this.qrImageUrl.startsWith('http')) {
                    const dl = await new Promise((resolve, reject) => {
                        uni.downloadFile({ url: this.qrImageUrl, success: (d) => resolve(d), fail: (err) => reject(err) })
                    })
                    tempPath = dl.tempFilePath || tempPath
                } else if (this.qrImageUrl.startsWith('data:')) {
                    uni.hideLoading()
                    uni.showToast({ title: '请长按图片保存到相册', icon: 'none' })
                    return
                }
                await new Promise((resolve, reject) => {
                    uni.saveImageToPhotosAlbum({ filePath: tempPath, success: () => resolve(), fail: (err) => reject(err) })
                })
                uni.hideLoading()
                uni.showToast({ title: '二维码已保存到相册', icon: 'success' })
            } catch (err) {
                uni.hideLoading()
                uni.showToast({ title: '保存失败，可能无相册权限或路径错误', icon: 'none' })
            }
        },
        closeQrModal() {
            this.qrModalVisible = false
            this.qrImageUrl = ''
        },
        viewAttendance(session) {
            const sid = this.getSessionId(session)
            if (!sid) {
                uni.showToast({ title: '无法识别场次 ID', icon: 'none' })
                return
            }
            // 导航到出席名单页面（由后续页面负责调用 /api/ticket/attendance/{sessionId} 与导出接口）
            uni.navigateTo({ url: `/pages/attendance/session?sessionId=${encodeURIComponent(sid)}` })
        },
        fetchComments(page = 0) {
            if (!this.performanceId) return
            this.commentsPage = page
            api.request({ url: `/api/comment/list?performanceId=${this.performanceId}&page=${page}&size=${this.commentsSize}`, method: 'GET' })
                .then((res) => {
                    if (!res?.success) return
                    const data = res.data || {}
                    this.comments = data.content || []
                    this.commentsTotal = data.totalElements || 0
                })
                .catch(() => { })
        },
        fetchMediaLinks() {
            if (!this.performanceId) return
            api.request({ url: `/api/media/list?performanceId=${this.performanceId}`, method: 'GET' })
                .then((res) => {
                    if (!res?.success) return
                    this.mediaLinks = res.data || []
                }).catch(() => { })
        },
        addMediaLink() {
            if (!this.canManageMedia) {
                uni.showToast({ title: '无权限', icon: 'none' })
                return
            }
            const payload = {
                performanceId: Number(this.performanceId),
                title: (this.newMedia.title || '').trim(),
                externalKey: (this.newMedia.externalKey || '').trim(),
                type: Number(this.newMedia.type) || 1,
                platform: Number(this.newMedia.platform) || 3,
                sortOrder: this.newMedia.sortOrder || 0
            }
            if (!payload.externalKey) {
                uni.showToast({ title: 'externalKey 必填', icon: 'none' })
                return
            }
            api.request({ url: '/api/media/add', method: 'POST', data: payload })
                .then((res) => {
                    if (res?.success) {
                        uni.showToast({ title: '添加成功', icon: 'none' })
                        this.newMedia.title = ''
                        this.newMedia.externalKey = ''
                        this.newMedia.type = 1
                        this.newMedia.platform = 1
                        this.newMedia.typeIndex = this.typeValues.indexOf(1) >= 0 ? this.typeValues.indexOf(1) : 0
                        this.newMedia.platformIndex = this.platformValues.indexOf(1) >= 0 ? this.platformValues.indexOf(1) : 0
                        this.newMedia.sortOrder = 0
                        this.fetchMediaLinks()
                        this.newMediaModalVisible = false
                    } else {
                        uni.showToast({ title: res?.message || '添加失败', icon: 'none' })
                    }
                }).catch(() => { uni.showToast({ title: '添加失败', icon: 'none' }) })
        },

        openNewMediaModal() {
            this.newMediaModalVisible = true
        },

        closeNewMediaModal() {
            this.newMediaModalVisible = false
        },

        onNewMediaTypeChange(e) {
            const idx = Number(e.detail.value)
            const i = Number.isNaN(idx) ? 0 : idx
            this.newMedia.typeIndex = i
            this.newMedia.type = this.typeValues[i] || this.typeValues[0]
        },

        onNewMediaPlatformChange(e) {
            const idx = Number(e.detail.value)
            const i = Number.isNaN(idx) ? 0 : idx
            this.newMedia.platformIndex = i
            this.newMedia.platform = this.platformValues[i] || this.platformValues[0]
        },
        deleteMediaLink(mediaId) {
            if (!this.canManageMedia) {
                uni.showToast({ title: '无权限', icon: 'none' })
                return
            }
            if (!mediaId) return
            uni.showModal({
                title: '确认', content: '确定删除该外链吗？此操作不可恢复。', success: (m) => {
                    if (!m.confirm) return
                    api.request({ url: `/api/media/${mediaId}`, method: 'DELETE' })
                        .then((res) => {
                            if (res?.success) {
                                uni.showToast({ title: '删除成功', icon: 'none' })
                                this.fetchMediaLinks()
                            } else {
                                uni.showToast({ title: res?.message || '删除失败', icon: 'none' })
                            }
                        }).catch(() => { uni.showToast({ title: '删除失败', icon: 'none' }) })
                }
            })
        },
        onImgError(e) {
            try {
                if (e && e.target) {
                    e.target.src = this.noAvatarSrc || '/static/wechat-default-avatar.png'
                }
            } catch (err) {
                // ignore
            }
        },

        onPosterError(e) {
            try {
                if (e && e.target) {
                    e.target.src = this.defaultCover || '/static/default-performance.png'
                }
            } catch (err) {
                // ignore
            }
        },
        getMediaDisplayUrl(media) {
            if (!media) return ''
            // 按后台实体要求，复制并分享使用 externalKey 字段
            return media.externalKey || ''
        },
        /* ========== 票务支持 ========== */
        getSessionId(session) {
            return session && (session.id || session.sessionId || session.sessionID || session.sid) ? (session.id || session.sessionId || session.sessionID || session.sid) : null
        },
        isSessionBooked(session) {
            const sid = this.getSessionId(session)
            if (!sid) return false
            return (this.myBookedSessionIds || []).indexOf(Number(sid)) >= 0
        },
        isPerformanceEnded() {
            if (!this.performance || !this.performance.sessions || !this.performance.sessions.length) return false
            // 若所有场次都标记为已结束，则认为演出已结束
            try {
                return this.performance.sessions.every(s => !!s && !!s.sessionEnded)
            } catch (e) {
                return false
            }
        },
        fetchMyTicketsForSessions() {
            // 若用户未登录则跳过
            this.refreshUserFromStorage()
            if (!this.isLoggedIn) return
            if (!this.performance || !this.performance.sessions) return
            // 优化：向后端按演出过滤并使用合理的 page size（不再使用 1000）
            const pid = Number(this.performanceId)
            const page = 0
            const size = 50
            api.request({ url: `/api/ticket/my?page=${page}&size=${size}&status=0&performanceId=${pid}`, method: 'GET' })
                .then(res => {
                    if (!res?.success) return
                    const data = res.data || {}
                    const tickets = data.content || data || []
                    const ids = []
                    tickets.forEach(t => {
                        const sid = t.sessionId || t.sessionID || t.sessionid
                        if (sid !== undefined && sid !== null) ids.push(Number(sid))
                    })
                    this.myBookedSessionIds = Array.from(new Set(ids))
                }).catch(() => { /* ignore errors */ })
        },
        openTemplateUploader(session) {
            const sid = this.getSessionId(session)
            const pid = this.performanceId
            if (!sid || !pid) { uni.showToast({ title: '无法打开上传器：缺少场次或演出ID', icon: 'none' }); return }
            let target = `/pages/ticket/template-upload?performanceId=${pid}&sessionId=${sid}`
            try {
                if (session && session.ticketTemplateUrl) target += `&templateUrl=${encodeURIComponent(session.ticketTemplateUrl)}`
            } catch (e) { }
            uni.navigateTo({ url: target })
        },
        fetchTemplateUrlForSession(sessionId) {
            if (!sessionId) return Promise.resolve(null)
            return api.request({ url: `/api/ticket/template/url/${sessionId}`, method: 'GET' })
                .then(res => {
                    if (!res?.success) return null
                    return res.data || null
                }).catch(() => null)
        },
        async previewTicketTemplate(session) {
            const sid = this.getSessionId(session)
            if (!sid) { uni.showToast({ title: '无法识别场次 ID', icon: 'none' }); return }
            // 若已缓存 URL，直接预览
            if (session && session.ticketTemplateUrl) {
                try { uni.previewImage({ urls: [session.ticketTemplateUrl] }) } catch (e) { uni.showToast({ title: '预览失败', icon: 'none' }) }
                return
            }
            uni.showLoading({ title: '加载中' })
            const url = await this.fetchTemplateUrlForSession(sid)
            uni.hideLoading()
            if (url) {
                try { this.$set(session, 'ticketTemplateUrl', url) } catch (e) { session.ticketTemplateUrl = url }
                try { uni.previewImage({ urls: [url] }) } catch (e) { uni.showToast({ title: '预览失败', icon: 'none' }) }
            } else {
                uni.showToast({ title: '暂无可预览的电子票背景', icon: 'none' })
            }
        },
        bookSession(session) {
            // 停止事件冒泡，避免触发父级跳转
            const sid = this.getSessionId(session)
            if (!sid) {
                uni.showToast({ title: '无法识别场次 ID', icon: 'none' })
                return
            }
            this.refreshUserFromStorage()
            if (!this.isLoggedIn) {
                this.goLogin()
                return
            }
            // 防止重复点击
            this.$set(this.bookingLoading, sid, true)

            api.request({ url: '/api/ticket/book', method: 'POST', data: { sessionId: Number(sid) } })
                .then(res => {
                    if (!res?.success) {
                        uni.showToast({ title: res?.message || '预约失败', icon: 'none' })
                        return
                    }
                    // 后端返回 TicketDetailDTO，前端记录该场次已预约并更新余票提示
                    uni.showToast({ title: '预约成功', icon: 'none' })
                    // 标记已预约
                    const numSid = Number(sid)
                    if ((this.myBookedSessionIds || []).indexOf(numSid) < 0) this.myBookedSessionIds.push(numSid)
                    // 更新会话余票（若存在且为数字）
                    try {
                        if (session.ticketSurplus !== undefined && typeof session.ticketSurplus === 'number') {
                            if (session.ticketSurplus > 0) session.ticketSurplus = session.ticketSurplus - 1
                        }
                    } catch (e) { }
                })
                .catch(() => { uni.showToast({ title: '预约失败，请稍后重试', icon: 'none' }) })
                .finally(() => { this.$set(this.bookingLoading, sid, false) })
        },
        copyMediaLink(media) {
            const url = this.getMediaDisplayUrl(media)
            if (!url) {
                uni.showToast({ title: '无可复制链接', icon: 'none' })
                return
            }
            try {
                uni.setClipboardData({ data: url, success: () => { uni.showToast({ title: '已复制到剪贴板', icon: 'none' }) } })
            } catch (e) {
                uni.showToast({ title: '复制失败', icon: 'none' })
            }
        },
        postComment() {
            // 读取最新的 /me 缓存以确保实时的封禁状态
            this.refreshUserFromStorage()
            if (!this.isLoggedIn) {
                this.goLogin()
                return
            }
            if (this.userStatus !== 1) {
                uni.showToast({ title: '您的账号被封禁，无法发表评论', icon: 'none' })
                return
            }
            const content = (this.newCommentContent || '').trim()
            if (!content) {
                uni.showToast({ title: '请输入评论内容', icon: 'none' })
                return
            }
            this.posting = true
            const payload = { performanceId: Number(this.performanceId), content }
            api.request({ url: '/api/comment/post', method: 'POST', data: payload })
                .then((res) => {
                    if (!res?.success) {
                        uni.showToast({ title: res?.message || '发布失败', icon: 'none' })
                        return
                    }
                    uni.showToast({ title: '发布成功', icon: 'none' })
                    this.newCommentContent = ''
                    this.fetchComments(0)
                })
                .catch((err) => {
                    uni.showToast({ title: '发布失败，请稍后重试', icon: 'none' })
                })
                .finally(() => { this.posting = false })
        },
        goLogin() {
            uni.navigateTo({ url: '/pages/login/login' })
        }
        ,
        refreshUserFromStorage() {
            try {
                let raw = (uni.getStorageSync && uni.getStorageSync('me')) || null
                let me = raw
                // /me 有时以 { success: true, data: {...} } 形式存储
                if (raw && raw.data) me = raw.data
                if (me) {
                    this.userId = (me.id !== undefined && me.id !== null) ? me.id : this.userId
                    if (me.status !== undefined && me.status !== null && me.status !== '') {
                        const s = Number(me.status)
                        this.userStatus = Number.isNaN(s) ? this.userStatus : s
                    }
                    if (me.avatar) this.currentUserAvatar = me.avatar

                } else {
                    // fallback to older keys
                    this.userId = uni.getStorageSync('userId') || this.userId
                    const maybeStatus = uni.getStorageSync('userStatus')
                    if (maybeStatus !== undefined && maybeStatus !== '') {
                        const s = Number(maybeStatus)
                        this.userStatus = Number.isNaN(s) ? this.userStatus : s
                    }
                    this.currentUserAvatar = uni.getStorageSync('avatar') || this.currentUserAvatar


                    // 如果本地没有 /me 缓存，尝试直接调用后端获取最新用户信息并写回 storage
                    try {
                        api.request({ url: '/api/users/me', method: 'GET' })
                            .then((resp) => {
                                if (!resp) return
                                const payload = resp.data ? resp.data : resp
                                // write back a common wrapper so future reads are consistent
                                try { uni.setStorageSync('me', resp) } catch (e) { /* ignore */ }
                                if (payload) {
                                    if (payload.id !== undefined && payload.id !== null) this.userId = payload.id
                                    if (payload.status !== undefined && payload.status !== null && payload.status !== '') {
                                        const s2 = Number(payload.status)
                                        this.userStatus = Number.isNaN(s2) ? this.userStatus : s2
                                    }
                                    if (payload.avatar) this.currentUserAvatar = payload.avatar

                                }
                            }).catch(() => { })
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        ,
        isCurrentUserAdmin() {
            const role = uni.getStorageSync('role')
            return role === 'ADMIN' || role === 'SUPER_ADMIN'
        },
        isCurrentUserSuperAdmin() {
            const role = uni.getStorageSync('role')
            return role === 'SUPER_ADMIN'
        },
        onCommentAvatarLongpress(comment) {
            if (!this.isCurrentUserAdmin()) return
            const actions = []
            // toggle hide/show based on comment.status (assume 1 visible, 0 hidden)
            const isHidden = comment.status === 0
            actions.push(isHidden ? '显示评论' : '隐藏评论')
            // 封禁 / 解封 用户：根据 comment 中可能存在的标识判断展示文案
            const isUserBanned = comment.userStatus === 0 || comment.banned === true || comment.isBanned === true
            actions.push(isUserBanned ? '解封用户' : '封禁用户')
            if (this.isCurrentUserSuperAdmin()) actions.push('删除评论')
            uni.showActionSheet({
                itemList: actions,
                success: (res) => {
                    const idx = res.tapIndex
                    const choice = actions[idx]
                    if (choice === '隐藏评论') {
                        this.auditComment(comment.id, 0)
                    } else if (choice === '显示评论') {
                        this.auditComment(comment.id, 1)
                    } else if (choice === '封禁用户') {
                        this.banOrUnbanUser(comment, true)
                    } else if (choice === '解封用户') {
                        this.banOrUnbanUser(comment, false)
                    } else if (choice === '删除评论') {
                        uni.showModal({
                            title: '确认', content: '确定删除该评论吗？此操作不可恢复。', success: (m) => {
                                if (m.confirm) this.deleteComment(comment.id)
                            }
                        })
                    }
                }
            })
        },
        auditComment(commentId, status) {
            if (!commentId) return
            api.request({ url: '/api/comment/audit', method: 'PUT', data: { commentId, status } })
                .then((res) => {
                    if (res?.success) {
                        uni.showToast({ title: '操作成功', icon: 'none' })
                        this.fetchComments(this.commentsPage)
                    } else {
                        uni.showToast({ title: res?.message || '操作失败', icon: 'none' })
                    }
                }).catch(() => { uni.showToast({ title: '操作失败', icon: 'none' }) })
        },
        banOrUnbanUser(comment, ban) {
            if (!comment) return
            const openId = comment.openId || comment.openid || comment.userOpenId
            const userId = comment.userId || comment.user_id || comment.uid
            if (!openId && !userId) {
                uni.showToast({ title: '无法识别用户标识，操作取消', icon: 'none' })
                return
            }
            const params = []
            // 仅在存在时传 openId 或 userId，ban 参数始终传递
            if (openId) params.push(`openId=${encodeURIComponent(openId)}`)
            if (userId !== undefined && userId !== null) params.push(`userId=${encodeURIComponent(userId)}`)
            params.push(`ban=${ban ? 'true' : 'false'}`)
            const url = `/api/admin/users/ban?${params.join('&')}`

            api.request({ url, method: 'PUT' })
                .then((res) => {
                    if (res?.success) {
                        uni.showToast({ title: '操作成功', icon: 'none' })
                        this.fetchComments(this.commentsPage)
                    } else {
                        uni.showToast({ title: res?.message || '操作失败', icon: 'none' })
                    }
                }).catch(() => { uni.showToast({ title: '操作失败', icon: 'none' }) })
        },
        deleteComment(commentId) {
            if (!commentId) return
            api.request({ url: `/api/comment/${commentId}`, method: 'DELETE' })
                .then((res) => {
                    if (res?.success) {
                        uni.showToast({ title: '删除成功', icon: 'none' })
                        this.fetchComments(this.commentsPage)
                    } else {
                        uni.showToast({ title: res?.message || '删除失败', icon: 'none' })
                    }
                }).catch(() => { uni.showToast({ title: '删除失败', icon: 'none' }) })
        },
    }
}
</script>

<style scoped>
/* ========== 页面整体 ========== */
.page {
    min-height: 100vh;
    background: #f6f2ee;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}

/* ========== 固定顶部导航 ========== */
.nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: calc(env(safe-area-inset-top) + 88rpx);
    padding-top: env(safe-area-inset-top);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 245, 255, 0.98) 100%);
    backdrop-filter: blur(20px) saturate(180%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 32rpx;
    padding-right: 32rpx;
    box-shadow: 0 8rpx 32rpx rgba(139, 92, 246, 0.12), 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
    border-bottom: 1rpx solid rgba(139, 92, 246, 0.08);
}

.nav-back {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.back-icon {
    font-size: 40rpx;
    color: #7c3aed;
    font-weight: 700;
}

.back-text {
    font-size: 28rpx;
    color: #7c3aed;
    font-weight: 600;
}

.nav-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1f2937;
}

.nav-placeholder {
    width: 100rpx;
}

/* ========== 加载和错误状态 ========== */
.loading-state {
    padding: 200rpx 0;
    text-align: center;
    color: #9ca3af;
    font-size: 28rpx;
}

.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    padding: 200rpx 32rpx;
}

.error-icon {
    font-size: 120rpx;
    opacity: 0.5;
}

.error-title {
    font-size: 28rpx;
    color: #6b7280;
    font-weight: 600;
}

.retry-btn {
    padding: 20rpx 48rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    border-radius: 16rpx;
    font-size: 28rpx;
    font-weight: 600;
    box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.3);
}

/* ========== 内容区域 ========== */
.content {
    padding-top: calc(env(safe-area-inset-top) + 88rpx);
}

/* ========== 海报区域 ========== */
.poster-section {
    position: relative;
    width: 100%;
    height: 600rpx;
    overflow: hidden;
}

.poster-image {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #e9d5ff 0%, #fae8ff 50%, #fef3c7 100%);
}

.poster-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg,
            rgba(0, 0, 0, 0.3) 0%,
            rgba(0, 0, 0, 0) 30%,
            rgba(0, 0, 0, 0) 70%,
            rgba(0, 0, 0, 0.4) 100%);
    display: flex;
    padding: 32rpx;
}

.share-btn {
    margin-left: auto;
    background: rgba(255, 255, 255, 0.12);
    padding: 8rpx 14rpx;
    border-radius: 12rpx;
    color: #fff;
    font-size: 24rpx;
    align-self: flex-start;
}

/* ========== 详情区块通用样式 ========== */
.section-card {
    margin: 0 32rpx 32rpx;
    padding: 32rpx;
    background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
    border-radius: 24rpx;
    box-shadow: 0 4rpx 20rpx rgba(139, 92, 246, 0.08),
        0 8rpx 40rpx rgba(139, 92, 246, 0.06);
    border: 1rpx solid rgba(139, 92, 246, 0.08);
}

.section-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 24rpx;
    flex-wrap: nowrap;
}

.section-icon {
    font-size: 32rpx;
}

.section-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: 0.5rpx;
}

.section-hint {
    font-size: 22rpx;
    color: #9ca3af;
    font-weight: 500;
    margin-left: auto;
}

/* ========== 评论区美化 ========== */
.comments-list-refined {
    display: flex;
    flex-direction: column;
    gap: 40rpx;
    margin-bottom: 40rpx;
}

.comment-card-modern {
    display: flex;
    gap: 24rpx;
    align-items: flex-start;
}

.comment-avatar-modern {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    flex-shrink: 0;
    border: 3rpx solid rgba(139, 92, 246, 0.1);
}

.comment-content-wrap {
    flex: 1;
}

.comment-meta-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8rpx;
}

.nickname-bold {
    font-size: 28rpx;
    font-weight: 700;
    color: #333;
}

.banned-name {
    color: #999 !important;
}

.time-light {
    font-size: 22rpx;
    color: #bbb;
}

.comment-bubble {
    padding: 18rpx 24rpx;
    background: rgba(139, 92, 246, 0.04);
    border: 1rpx solid rgba(139, 92, 246, 0.08);
    border-radius: 4rpx 24rpx 24rpx 24rpx;
    position: relative;
    max-width: 95%;
}

.comment-text-main {
    font-size: 28rpx;
    color: #4b5563;
    line-height: 1.6;
    word-break: break-all;
}

.banned-content-placeholder {
    display: flex;
    align-items: center;
    gap: 12rpx;
    font-size: 26rpx;
    color: #9ca3af;
    background: #f3f4f6;
    border-radius: 12rpx;
    padding: 12rpx;
    border: 1rpx dashed #d1d5db;
}

.banned-icon {
    font-size: 28rpx;
}

/* 分页 */
.pagination-refined {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-top: 1rpx dashed rgba(139, 92, 246, 0.1);
    margin-top: 20rpx;
}

.pag-btn {
    font-size: 24rpx;
    padding: 12rpx 28rpx;
    background: #fff;
    border: 1rpx solid rgba(139, 92, 246, 0.2);
    border-radius: 30rpx;
    line-height: 1;
    color: #7c3aed;
    font-weight: 600;
}

.pag-btn:active {
    background: rgba(139, 92, 246, 0.05);
}

.pag-btn[disabled] {
    opacity: 0.4;
    color: #ccc;
    background: #fafafa;
    border-color: #eee;
}

.pag-info {
    font-size: 24rpx;
    color: #9ca3af;
    font-weight: 500;
}

/* 评论输入 */
.comment-input-bar {
    display: flex;
    gap: 20rpx;
    padding: 24rpx;
    background: #fff;
    border-top: 1rpx solid rgba(139, 92, 246, 0.1);
    border-radius: 20rpx;
}

.input-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    margin-top: 6rpx;
    border: 2rpx solid rgba(139, 92, 246, 0.1);
}

.input-field-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.textarea-refined {
    width: 100%;
    min-height: 80rpx;
    background: rgba(139, 92, 246, 0.02);
    padding: 20rpx;
    border: 1rpx solid rgba(139, 92, 246, 0.1);
    border-radius: 16rpx;
    font-size: 28rpx;
    line-height: 1.4;
    box-sizing: border-box;
    color: #4b5563;
}

.input-actions-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 20rpx;
}

.send-btn-refined {
    margin: 0;
    padding: 12rpx 40rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #fff;
    border-radius: 999rpx;
    font-size: 26rpx;
    font-weight: 700;
    box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.3);
}

.send-btn-refined[disabled] {
    opacity: 0.5;
    background: #dae1e7;
    box-shadow: none;
}

.login-prompt {
    font-size: 24rpx;
    color: #8b5cf6;
    font-weight: 600;
    text-decoration: none;
    border-bottom: 2rpx solid rgba(139, 92, 246, 0.3);
}

.banned-status-text {
    font-size: 24rpx;
    color: #ef4444;
}

.empty-comments-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
    padding: 80rpx 0;
}

.empty-icon {
    font-size: 64rpx;
    filter: grayscale(1);
    opacity: 0.4;
}

.empty-comments-state text:last-child {
    font-size: 26rpx;
    color: #999;
}

/* ========== 媒体外链美化 ========== */
.media-list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.media-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    border-radius: 20rpx;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(139, 92, 246, 0.01) 100%);
    border: 1rpx solid rgba(139, 92, 246, 0.1);
}

.media-left {
    flex: 1;
}

.media-title {
    font-size: 28rpx;
    font-weight: 800;
    color: #1f2937;
    margin-bottom: 8rpx;
    display: block;
}

.media-sub {
    font-size: 22rpx;
    color: #6b7280;
    font-weight: 500;
}

.copy-btn {
    padding: 8rpx 24rpx;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #fff;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
    box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.2);
    line-height: 2;
}

.copy-btn:active {
    transform: scale(0.95);
    box-shadow: none;
}

.media-badges {
    display: flex;
    gap: 12rpx;
    margin-bottom: 12rpx;
}

.type-badge,
.platform-badge {
    font-size: 20rpx;
    padding: 4rpx 16rpx;
    border-radius: 999rpx;
    font-weight: 700;
    border: 1rpx solid rgba(255, 255, 255, 0.5);
}

.type-badge {
    background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);
    color: #b45309;
}

.platform-badge {
    background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1a56db;
}

/* 媒体弹窗 (模态) */
.modal-mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4rpx);
}

.modal-box {
    width: 86%;
    background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
    border-radius: 32rpx;
    padding: 40rpx;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
    border: 1rpx solid rgba(139, 92, 246, 0.1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;
}

.modal-title {
    font-size: 32rpx;
    font-weight: 900;
    color: #1f2937;
}

.modal-close {
    font-size: 36rpx;
    color: #9ca3af;
    padding: 10rpx;
}

.modal-body {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.modal-body .input {
    background: rgba(139, 92, 246, 0.02);
    border: 1rpx solid rgba(139, 92, 246, 0.1);
    border-radius: 16rpx;
    padding: 20rpx 24rpx;
    font-size: 28rpx;
    color: #4b5563;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 40rpx;
    gap: 20rpx;
}

.picker {
    font-size: 26rpx;
    color: #7c3aed;
    background: rgba(139, 92, 246, 0.08);
    padding: 12rpx 24rpx;
    border-radius: 16rpx;
    font-weight: 600;
}


/* 分享弹窗 */
.share-modal {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

.share-sheet {
    width: 100%;
    background: #fff;
    padding: 24rpx;
    border-top-left-radius: 20rpx;
    border-top-right-radius: 20rpx;
}

.share-actions {
    display: flex;
    gap: 12rpx;
    justify-content: center
}

.share-action {
    padding: 12rpx 18rpx;
    background: #f3f4f6;
    border-radius: 12rpx;
    font-size: 26rpx
}

.share-cancel {
    margin-top: 12rpx;
    text-align: center;
    color: #64748b
}

.status-badge {
    padding: 12rpx 24rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    font-weight: 700;
    backdrop-filter: blur(12rpx) saturate(180%);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
    letter-spacing: 0.5rpx;
    border: 1rpx solid rgba(255, 255, 255, 0.3);
    align-self: flex-start;
}

.status-pending {
    background: linear-gradient(135deg, rgba(254, 243, 199, 0.98) 0%, rgba(253, 230, 138, 0.98) 100%);
    color: #78350f;
}

.status-ongoing {
    background: linear-gradient(135deg, rgba(255, 250, 205, 0.98) 0%, rgba(254, 240, 138, 0.98) 100%);
    color: #92400e;
}

.status-active {
    background: linear-gradient(135deg, rgba(167, 243, 208, 0.98) 0%, rgba(134, 239, 172, 0.98) 100%);
    color: #14532d;
}

.status-ended {
    background: linear-gradient(135deg, rgba(241, 245, 249, 0.98) 0%, rgba(226, 232, 240, 0.98) 100%);
    color: #475569;
}

.status-cancelled {
    background: linear-gradient(135deg, rgba(254, 226, 226, 0.98) 0%, rgba(254, 202, 202, 0.98) 100%);
    color: #7f1d1d;
}

/* ========== 基本信息卡片 ========== */
.info-card {
    margin: 32rpx;
    padding: 32rpx;
    background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
    border-radius: 24rpx;
    box-shadow: 0 4rpx 20rpx rgba(139, 92, 246, 0.08),
        0 8rpx 40rpx rgba(139, 92, 246, 0.06);
    border: 1rpx solid rgba(139, 92, 246, 0.08);
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.perf-title {
    font-size: 36rpx;
    font-weight: 800;
    color: #1f2937;
    line-height: 1.4;
    letter-spacing: 0.5rpx;
    flex: 1;
}

.perf-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16rpx;
    width: 100%;
}

.edit-btn-mini {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 8rpx 16rpx;
    background: #f3f4f6;
    border-radius: 999rpx;
    font-size: 22rpx;
    color: #4b5563;
    font-weight: 600;
    white-space: nowrap;
}

.edit-btn-mini:active {
    background: #e5e7eb;
    transform: scale(0.95);
}

.share-btn-mini {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 16rpx;
    background: #eef2ff;
    border-radius: 999rpx;
    font-size: 22rpx;
    color: #6d28d9;
    font-weight: 600;
    white-space: nowrap;
}

.share-btn-mini:active {
    background: #e9d5ff;
    transform: scale(0.95);
}

.edit-icon-mini {
    font-size: 24rpx;
}

.perf-detail-stats {
    display: flex;
    gap: 32rpx;
    margin-top: 8rpx;
    margin-bottom: 8rpx;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.stat-icon {
    font-size: 24rpx;
}

.stat-label {
    font-size: 22rpx;
    color: #6b7280;
}

.stat-value {
    font-size: 24rpx;
    color: #8b5cf6;
    font-weight: 700;
}

.perf-desc {
    font-size: 26rpx;
    color: #6b7280;
    line-height: 1.8;
    font-weight: 400;
}

/* ========== 场次列表美化 ========== */
.session-list-modern {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.session-card-modern {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 30rpx;
    border: 1rpx solid rgba(139, 92, 246, 0.08);
    box-shadow: 0 4rpx 16rpx rgba(139, 92, 246, 0.04);
    transition: all 0.3s ease;
    position: relative;
    margin-bottom: 24rpx;
}

.session-card-modern:active {
    transform: translateY(2rpx);
    box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.02);
}

.session-main-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24rpx;
}

.session-info-left {
    flex: 1;
    padding-right: 20rpx;
}

.venue-row-modern {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 12rpx;
    padding-right: 70rpx;
    /* 避免遮挡右上角眼睛图标 */
}

.venue-name-bold {
    font-size: 32rpx;
    font-weight: 800;
    color: #111827;
    letter-spacing: 0.5rpx;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.badge-row-modern {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;
    flex-wrap: wrap;
}

.badge-mini {
    font-size: 20rpx;
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
    font-weight: 700;
}

.badge-purple {
    background: rgba(139, 92, 246, 0.1);
    color: #7c3aed;
}

.badge-yellow {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
}

.badge-gray {
    background: #f3f4f6;
    color: #6b7280;
}

/* 管理员轻量按钮 */
.admin-action-btn {
    padding: 2rpx 12rpx;
    background: #f5f3ff;
    border-radius: 8rpx;
    border: 1rpx solid rgba(139, 92, 246, 0.15);
}

.admin-action-text {
    font-size: 20rpx;
    color: #8b5cf6;
    font-weight: 600;
}

.time-grid-modern {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
    background: #f8fafc;
    padding: 16rpx;
    border-radius: 12rpx;
}

.time-item-modern {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.time-icon {
    font-size: 24rpx;
    opacity: 0.6;
}

.time-text {
    font-size: 24rpx;
    color: #475569;
    font-weight: 600;
}

.session-btn-wrap {
    flex-shrink: 0;
}

/* 现代按钮样式 */
.btn-modern {
    min-width: 160rpx;
    height: 72rpx;
    line-height: 72rpx;
    font-size: 26rpx;
    font-weight: 800;
    border-radius: 36rpx;
    padding: 0 32rpx;
    text-align: center;
    border: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary-pill {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #ffffff;
    box-shadow: 0 8rpx 20rpx rgba(124, 58, 237, 0.25);
}

.btn-primary-pill:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 12rpx rgba(124, 58, 237, 0.2);
}

.btn-success-bordered {
    background: #ffffff;
    color: #10b981;
    border: 2rpx solid #10b981;
    box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.05);
}

.btn-yellow {
    background: #fffbeb;
    color: #d97706;
    border: 1rpx solid rgba(245, 158, 11, 0.3);
}

.btn-outline {
    background: #ffffff;
    color: #7c3aed;
    border: 2rpx solid #7c3aed;
    box-shadow: 0 4rpx 10rpx rgba(124, 58, 237, 0.08);
}

.btn-outline:active {
    background: #f5f3ff;
    transform: scale(0.96);
}

.btn-disabled {
    background: #f1f5f9;
    color: #94a3b8;
}

/* 状态样式覆盖 */
.session-card-modern.session-ended {
    background: #f8fafc;
    border-color: #e2e8f0;
    opacity: 0.75;
}

.session-card-modern.session-ongoing {
    border-color: rgba(245, 158, 11, 0.2);
    background: linear-gradient(to bottom right, #ffffff, #fffdfa);
}

.section-card.section-disabled {
    opacity: 0.6;
}

/* 小眼睛图标，位于场次卡右上角 */
.session-eye {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.98);
    border-radius: 50%;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
    z-index: 10;
    border: 1rpx solid rgba(0, 0, 0, 0.03);
}

.session-eye:active {
    transform: scale(0.9);
    background: #f3f4f6;
}

.eye-icon {
    font-size: 30rpx;
    color: #4b5563;
}

.btn-small {
    min-width: 84rpx;
    height: 40rpx;
    line-height: 40rpx;
    padding: 0 12rpx;
    border-radius: 20rpx;
    background: #fff;
    border: 1rpx solid rgba(124, 58, 237, 0.12);
    color: #7c3aed;
    font-weight: 700;
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
}

.session-venue {
    font-size: 28rpx;
    color: #4b5563;
    font-weight: 700;
    letter-spacing: 0.5rpx;
}

.session-ticket {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 8rpx 16rpx;
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-radius: 999rpx;
    box-shadow: 0 2rpx 8rpx rgba(59, 130, 246, 0.15);
    border: 1rpx solid rgba(59, 130, 246, 0.2);
}

.ticket-label {
    font-size: 20rpx;
    color: #1e40af;
    font-weight: 700;
}

.ticket-value {
    font-size: 22rpx;
    font-weight: 800;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.session-time-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-top: 8rpx;
}

.time-label {
    font-size: 24rpx;
    color: #6b7280;
    font-weight: 600;
    min-width: 80rpx;
}

.time-value {
    font-size: 24rpx;
    color: #8b5cf6;
    font-weight: 600;
}

/* ========== 主演列表 ========== */
.staff-scroll {
    width: 100%;
    white-space: nowrap;
}

.staff-list {
    display: inline-flex;
    gap: 20rpx;
    padding-bottom: 8rpx;
}

.staff-card {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: 280rpx;
    padding: 24rpx;
    background: linear-gradient(135deg, rgba(245, 243, 255, 0.8) 0%, rgba(237, 233, 254, 0.8) 100%);
    border-radius: 20rpx;
    border: 1rpx solid rgba(139, 92, 246, 0.15);
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.staff-card:active {
    transform: scale(0.96);
    background: linear-gradient(135deg, rgba(245, 243, 255, 0.95) 0%, rgba(237, 233, 254, 0.95) 100%);
}

.staff-avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
    box-shadow: 0 6rpx 16rpx rgba(139, 92, 246, 0.2);
    border: 3rpx solid rgba(139, 92, 246, 0.2);
    margin-bottom: 16rpx;
}

/* 无头像提示 */
.no-avatar-label {
    font-size: 20rpx;
    color: #9ca3af;
    margin-bottom: 8rpx;
}

.staff-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
    width: 100%;
}

.staff-name {
    font-size: 28rpx;
    color: #1f2937;
    font-weight: 800;
    letter-spacing: 0.5rpx;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.staff-position {
    padding: 6rpx 16rpx;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
    border-radius: 999rpx;
    font-size: 22rpx;
    color: #7c3aed;
    font-weight: 600;
    border: 1rpx solid rgba(139, 92, 246, 0.2);
    white-space: nowrap;
}

.staff-intro {
    font-size: 22rpx;
    color: #6b7280;
    line-height: 1.6;
    font-weight: 400;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    width: 100%;
    white-space: normal;
}
</style>
