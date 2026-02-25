<template>
    <view class="page">
        <view class="album-preview-card">
            <view v-if="albumPhotos && albumPhotos.length" id="albumPreview" class="album-slider" ref="albumPreview"
                @touchstart.stop.prevent="onPreviewStart" @touchmove.stop.prevent="onPreviewMove"
                @touchend.stop.prevent="onPreviewEnd">
                <view class="album-track" :style="previewTrackStyle">
                    <view class="album-item" v-for="(photo, index) in previewPhotos" :key="photo.id || index"
                        @tap="previewAlbumImage(index)">
                        <image class="album-image" :src="resolveAvatar(photo.photoUrl || photo.url)" mode="aspectFit">
                        </image>
                    </view>
                </view>
            </view>
            <view v-else class="album-empty-state">
                <text class="empty-text">该组织还未上传相片</text>
            </view>
            <view class="album-upload-btn" v-if="canManageOrg" @tap="goAlbumPage">
                <text class="upload-text">上传相片</text>
            </view>
            <view v-if="albumPhotos && albumPhotos.length" class="album-more-btn" @tap="goAlbumPage">
                <text class="more-text">查看更多</text>
            </view>
        </view>

        <view class="card" v-if="loading">
            <text class="state">加载中...</text>
        </view>

        <view v-else class="card org-info-card">
            <view class="org-header">
                <image class="avatar" :src="resolveAvatar(orgDetail.avatar || orgDetail.avatarUrl)" mode="aspectFill">
                </image>
                <view class="org-main">
                    <text class="org-name">{{ orgDetail.name || orgDetail.orgName || '未命名组织' }}</text>
                    <text class="org-meta">负责人：{{ leader.nickname || leader.name || '未知' }}</text>
                    <text class="org-meta">状态：{{ orgDetail.statusDesc || formatStatus(orgDetail.status) }}</text>
                </view>
            </view>
            <text class="org-desc">{{ orgDetail.description || orgDetail.orgDescription || '暂无组织介绍' }}</text>

            <view class="action-row">
                <button class="primary-btn" :disabled="joinDisabled" @tap="applyJoin">{{ joinButtonLabel }}</button>
                <button class="ghost-btn" v-if="canManageOrg" @tap="editOrganization">修改组织信息</button>
                <button class="danger-btn" v-if="canDisbandOrg" :loading="disbandLoading"
                    @tap="disbandOrganization">解散组织</button>
                <button class="ghost-btn" v-if="canQuitOrganization" :loading="quitLoading"
                    @tap="quitOrganization">退出组织</button>
                <button class="danger-btn" v-if="canBanOrg" :loading="orgBanLoading"
                    @tap="banOrganization">封禁组织</button>
            </view>
        </view>

        <view class="card members-card">
            <text class="section-title">组织成员</text>
            <view v-if="membersLoading" class="state">成员信息加载中...</view>
            <view v-else-if="members.length" class="member-list">
                <view class="member-item" v-for="member in members" :key="member.user?.id || member.userId">
                    <image class="member-avatar" :src="resolveAvatar(member.user?.avatar || member.avatar)"
                        mode="aspectFill" @tap="openMember(member)"></image>
                    <view class="member-main" @tap="openMember(member)">
                        <text class="member-name">{{ member.user?.nickname || member.user?.name || '未命名成员' }}</text>
                        <text class="member-meta">角色：{{ roleLabel(member.memberRole) }}</text>
                        <text class="member-meta">学院：{{ member.user?.college || '-' }} 专业：{{ member.user?.major || '-'
                        }}</text>
                    </view>
                    <view class="member-actions" v-if="showMemberActions(member)">
                        <button v-if="canChangeRole(member)" class="mini-btn ghost" :loading="isRoleChanging(member)"
                            @tap.stop="changeMemberRole(member)">{{ roleToggleLabel(member) }}</button>
                        <button v-if="canTransferLeadership(member)" class="mini-btn primary"
                            :loading="isTransferLoading(member)" @tap.stop="transferLeadership(member)">设为首领</button>
                        <button v-if="canOperateMember(member)" class="mini-btn"
                            @tap.stop="kickMember(member)">移出</button>
                    </view>
                </view>
            </view>
            <view v-else class="state">暂无成员信息</view>
        </view>

        <view class="user-modal-mask" v-if="userDialogVisible" @tap="closeUserDialog">
            <view class="user-modal" @tap.stop>
                <view class="user-modal-header">
                    <image v-if="userDialogUser?.avatar" class="user-modal-avatar"
                        :src="resolveAvatar(userDialogUser.avatar)" mode="aspectFill"></image>
                    <view v-else class="user-modal-avatar placeholder"></view>
                    <view class="user-modal-main">
                        <text class="user-modal-name">{{ userDialogUser.nickname || userDialogUser.name || '未命名成员'
                        }}</text>
                        <text class="user-modal-meta">状态：{{ userStatusLabel }}</text>
                        <text class="user-modal-meta">系统角色：{{ userDialogUser.role || '-' }}</text>
                    </view>
                    <button class="close-btn" @tap="closeUserDialog">关闭</button>
                </view>

                <view class="user-modal-body">
                    <view v-if="userDetailLoading" class="user-modal-state">信息加载中...</view>
                    <view v-else-if="userDetailError" class="user-modal-state error">{{ userDetailError }}</view>
                    <view v-else>
                        <view class="user-modal-row" v-if="userDialogMember?.memberRole">
                            <text class="row-label">组织权限</text>
                            <text class="row-value">{{ roleLabel(userDialogMember.memberRole) }}</text>
                        </view>
                        <view class="user-modal-row">
                            <text class="row-label">身份</text>
                            <text class="row-value">{{ userIdentityLabel }}</text>
                        </view>
                        <view class="user-modal-row">
                            <text class="row-label">学院</text>
                            <text class="row-value">{{ userDialogUser.college || '-' }}</text>
                        </view>
                        <view class="user-modal-row">
                            <text class="row-label">专业</text>
                            <text class="row-value">{{ userDialogUser.major || '-' }}</text>
                        </view>
                        <view class="user-modal-row" v-if="canViewOpenId && userDialogOpenId">
                            <text class="row-label">OpenId</text>
                            <text class="row-value" selectable>{{ userDialogOpenId }}</text>
                        </view>
                        <view class="user-modal-row" v-if="userDialogUser.phone || userDialogUser.mobile">
                            <text class="row-label">电话</text>
                            <text class="row-value">{{ userDialogUser.phone || userDialogUser.mobile }}</text>
                        </view>
                        <view class="user-modal-row" v-if="userDialogUser.email">
                            <text class="row-label">邮箱</text>
                            <text class="row-value">{{ userDialogUser.email }}</text>
                        </view>
                    </view>
                </view>

                <view class="user-modal-actions" v-if="canBanUser">
                    <block v-if="userBanOpenId">
                        <button class="mini-btn danger" :loading="userBanLoading" v-if="!userIsBanned"
                            @tap="toggleUserBan(true)">封禁用户</button>
                        <button class="mini-btn ghost" :loading="userBanLoading" v-else
                            @tap="toggleUserBan(false)">解除封禁</button>
                    </block>
                    <text v-else class="user-modal-hint">缺少 id，无法执行封禁操作</text>
                </view>
            </view>
        </view>

        <!-- 使用原生确认框替代自定义解散输入框 -->

    </view>
</template>

<script>
import api from '@/utils/api'
import { resolveAvatar } from '@/utils/avatar'
import { showError, showSuccess } from '@/utils/notify'

export default {
    data() {
        return {
            orgId: '',
            orgDetail: {},
            leader: {},
            members: [],
            loading: false,
            membersLoading: false,
            currentRole: uni.getStorageSync('role') || '',
            currentOpenId: uni.getStorageSync('openid') || '',
            currentUserId: uni.getStorageSync('userId') || '',
            isMember: false,
            orgBanLoading: false,
            userDialogVisible: false,
            userDialogMember: null,
            userDialogTarget: null,
            userDetail: null,
            userDetailLoading: false,
            userDetailError: '',
            userBanLoading: false,
            roleChangeLoadingKey: '',
            transferLoadingKey: '',
            quitLoading: false,
            albumPhotos: [],
            currentAlbumIndex: 0,
            albumScrollLeft: 0,
            albumLastScrollLeft: 0,
            albumStartScrollLeft: 0,
            // preview slider state (用于顶部相册预览，最多展示 5 张)
            previewContainerWidth: 0,
            previewDragOffset: 0,
            previewIsDragging: false,
            previewIndex: 0,
            previewTouchStartX: 0,
            previewTouchStartY: 0,
            previewTouchStartTime: 0,
            previewTouchMoved: false,

            // 解散相关状态
            disbandLoading: false,
            disbandDialogVisible: false,
            disbandReasonText: '',

            identityMap: {
                1: '学生',
                2: '学校职工',
                3: '校外人员'
            }
        }
    },
    computed: {
        isPlatformAdmin() {
            const role = (this.currentRole || '').toUpperCase()
            return role === 'ADMIN' || role === 'SUPER_ADMIN'
        },
        isOrgLeader() {
            const currentOpenId = this.currentOpenId
            const currentUserId = this.currentUserId
            const leader = this.leader || {}
            const leaderUser = leader.user || leader
            const leaderOpenId = leaderUser?.openid || leaderUser?.openId
            const leaderUserId = leaderUser?.userId || leaderUser?.id || leader.userId || leader.id
            if (currentOpenId && leaderOpenId && currentOpenId === leaderOpenId) return true
            if (currentUserId && leaderUserId && String(currentUserId) === String(leaderUserId)) return true
            const leaderMember = this.members.find((member) => {
                const role = (member?.memberRole || '').toUpperCase()
                if (role !== 'LEADER' && role !== 'OWNER') return false
                const identifiers = this.getMemberIdentifiers(member)
                if (currentOpenId && identifiers.openId && currentOpenId === identifiers.openId) return true
                if (currentUserId && identifiers.userId && String(currentUserId) === String(identifiers.userId)) return true
                return false
            })
            return !!leaderMember
        },
        // 是否为组织管理员（memberRole 为 MANAGER 或 OWNER）
        isOrgManager() {
            const openId = this.currentOpenId
            const userId = this.currentUserId
            const manager = this.members.find((member) => {
                const role = (member?.memberRole || '').toUpperCase()
                if (role !== 'MANAGER' && role !== 'OWNER') return false
                const ids = this.getMemberIdentifiers(member)
                if (openId && ids.openId && openId === ids.openId) return true
                if (userId && ids.userId && String(userId) === String(ids.userId)) return true
                return false
            })
            return !!manager
        },
        canManageOrg() {
            return this.isOrgLeader || this.isPlatformAdmin
        },
        // 可以解散组织：首领 / 管理员 / 平台管理员
        canDisbandOrg() {
            return this.isPlatformAdmin || this.isOrgLeader || this.isOrgManager
        },
        canBanOrg() {
            return this.isPlatformAdmin
        },
        canQuitOrganization() {
            return this.isMember && !this.isOrgLeader
        },
        canViewOpenId() {
            return this.isOrgLeader || this.isPlatformAdmin
        },
        userDialogOpenId() {
            const user = this.userDialogUser || {}
            if (user.openid) return user.openid
            if (user.openId) return user.openId
            if (this.userDialogMember?.user?.openid) return this.userDialogMember.user.openid
            if (this.userDialogMember?.user?.openId) return this.userDialogMember.user.openId
            return ''
        },
        isBanned() {
            const status = this.orgDetail?.status
            if (status === undefined || status === null) return false
            if (typeof status === 'string') {
                const upper = status.toUpperCase()
                if (upper === 'BANNED' || upper === 'DISABLED') return true
                const parsed = Number(status)
                return !Number.isNaN(parsed) && parsed === -2
            }
            return Number(status) === -2
        },
        joinDisabled() {
            return this.isMember || this.isBanned
        },
        joinButtonLabel() {
            if (this.isBanned) return '组织已封禁'
            if (this.isMember) return '已加入该组织'
            return '申请加入组织'
        },
        canBanUser() {
            return this.canBanOrg
        },
        userDialogUser() {
            if (this.userDetail) {
                if (this.userDetail.user) return this.userDetail.user
                return this.userDetail
            }
            if (this.userDialogMember?.user) return this.userDialogMember.user
            return this.userDialogMember || {}
        },
        userStatusLabel() {
            const rawStatus = (this.userDialogUser && this.userDialogUser.status !== undefined)
                ? this.userDialogUser.status
                : (this.userDialogMember?.status ?? this.userDialogMember?.user?.status)
            const status = this.normalizeStatus(rawStatus)
            if (status === null) return '未知'
            return status === 1 ? '正常' : '封禁'
        },
        userIdentityLabel() {
            const user = this.userDialogUser || {}
            const identity = user.userIdentity !== undefined ? user.userIdentity : (
                this.userDialogMember?.user?.userIdentity ?? this.userDialogMember?.userIdentity
            )
            return this.identityMap[identity] || '未知'
        },
        userIsBanned() {
            const rawStatus = (this.userDialogUser && this.userDialogUser.status !== undefined)
                ? this.userDialogUser.status
                : (this.userDialogMember?.status ?? this.userDialogMember?.user?.status)
            const status = this.normalizeStatus(rawStatus)
            if (status === null) return false
            return status !== 1
        },
        userBanOpenId() {
            const user = this.userDialogUser || {}
            if (user.openid) return user.openid
            if (user.openId) return user.openId
            if (this.userDialogMember?.user?.openid) return this.userDialogMember.user.openid
            if (this.userDialogMember?.user?.openId) return this.userDialogMember.user.openId
            return (this.userDialogTarget && this.userDialogTarget.openId) || ''
        },
        previewPhotos() {
            return (this.albumPhotos || []).slice(0, 5)
        },
        previewTrackStyle() {
            const w = this.previewContainerWidth || 0
            const translate = -this.previewIndex * w + (this.previewDragOffset || 0)
            return {
                transform: `translateX(${translate}px)`,
                transition: this.previewIsDragging ? 'none' : 'transform 300ms ease'
            }
        }
    },
    watch: {
        previewIndex(val) {
            this.currentAlbumIndex = val
        }
    },
    onLoad(options) {
        this.orgId = options?.id || ''
        if (!this.orgId) {
            showError('缺少组织编号')
            return
        }
        this.fetchDetail()
        this.fetchMembers()
        this.fetchAlbum()

        // 监听组织更新事件
        uni.$on('organizationUpdated', this.handleOrganizationUpdate)
    },
    onUnload() {
        // 移除事件监听
        uni.$off('organizationUpdated', this.handleOrganizationUpdate)
    },
    methods: {
        handleOrganizationUpdate(data) {
            // 如果更新的是当前组织，刷新数据
            if (data?.orgId && String(data.orgId) === String(this.orgId)) {
                this.fetchDetail()
                this.fetchMembers()
            }
        },
        resolveAvatar,
        normalizeStatus(value) {
            if (value === undefined || value === null) return null
            if (typeof value === 'string') {
                const trimmed = value.trim()
                if (!trimmed) return null
                const upper = trimmed.toUpperCase()
                if (upper === 'ENABLED' || upper === 'ACTIVE') return 1
                if (upper === 'BANNED' || upper === 'DISABLED') return 0
                const parsed = Number(trimmed)
                if (!Number.isNaN(parsed)) return parsed
                return null
            }
            const num = Number(value)
            if (Number.isNaN(num)) return null
            return num
        },
        formatStatus(status) {
            if (status === undefined || status === null) return '未知'
            if (typeof status === 'string') {
                const upper = status.toUpperCase()
                if (upper === 'BANNED' || upper === 'DISABLED') return '已封禁'
                const parsed = Number(status)
                if (!Number.isNaN(parsed)) return this.formatStatus(parsed)
                return status
            }
            if (status === 1) return '正常'
            if (status === 0) return '待审核'
            if (status === -1) return '已解散'
            if (status === -2) return '已封禁'
            return '未知'
        },
        roleLabel(role) {
            const map = {
                LEADER: '首领',
                MANAGER: '管理员',
                MEMBER: '成员',
                OWNER: '负责人'
            }
            return map[role] || role || '-'
        },
        fetchDetail() {
            this.loading = true
            api.request({ url: `/api/organization/${this.orgId}`, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '获取组织详情失败')
                        return
                    }
                    const data = res.data || {}
                    this.orgDetail = data
                    this.leader = data.Leader || data.leader || {}
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        fetchAlbum() {
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
                        this.albumPhotos = Array.isArray(res.data) ? res.data : []
                        this.previewIndex = 0
                        // 更新 preview 容器宽度
                        this.$nextTick(() => {
                            try {
                                const query = uni.createSelectorQuery().in(this)
                                query.select('#albumPreview').boundingClientRect(rect => {
                                    if (rect && rect.width) this.previewContainerWidth = rect.width
                                }).exec()
                            } catch (e) {
                                // ignore
                            }
                        })
                    }
                })
                .catch(() => {
                    console.error('获取相册失败')
                })
        },
        goAlbumPage() {
            uni.navigateTo({
                url: `/pages/organization/album?orgId=${this.orgId}&orgName=${encodeURIComponent(this.orgDetail.name || this.orgDetail.orgName || '组织相册')}`
            })
        },
        previewAlbumImage(index) {
            // 打开 photo-detail 页面，传入 orgId 和 photoIndex（preview 的索引与 albumPhotos 的前 5 项索引一致）
            uni.navigateTo({
                url: `/pages/organization/photo-detail?orgId=${this.orgId}&photoIndex=${index}`
            })
        },
        onAlbumScroll(e) {
            // 记录滚动位置
            const currentScroll = e.detail.scrollLeft
            if (this.albumStartScrollLeft === undefined || this.albumStartScrollLeft === null) {
                this.albumStartScrollLeft = currentScroll
            }
            this.albumLastScrollLeft = currentScroll
        },
        onAlbumScrollEnd(e) {
            // 获取屏幕宽度作为每张图片的宽度
            const screenWidth = uni.getSystemInfoSync().windowWidth
            const startScroll = this.albumStartScrollLeft || 0
            const endScroll = this.albumLastScrollLeft
            const scrollDistance = Math.abs(endScroll - startScroll)
            const threshold = screenWidth * 0.05

            // 计算当前应该停留的图片
            let targetIndex = this.currentAlbumIndex
            if (endScroll > startScroll) {
                // 向左滑动（scrollLeft增加）
                if (scrollDistance > threshold) {
                    targetIndex = Math.min(this.currentAlbumIndex + 1, this.previewPhotos.length - 1)
                }
            } else if (endScroll < startScroll) {
                // 向右滑动（scrollLeft减少）
                if (scrollDistance > threshold) {
                    targetIndex = Math.max(this.currentAlbumIndex - 1, 0)
                }
            }

            // 自动滚动到目标位置
            this.albumScrollLeft = targetIndex * screenWidth
            this.currentAlbumIndex = targetIndex
            // 重置滑动起点
            this.albumStartScrollLeft = null
        },
        // preview slider touch handlers (阻尼滑动)
        onPreviewStart(e) {
            const t = (e.touches && e.touches[0]) || {}
            this.previewTouchStartX = t.clientX || t.pageX || 0
            this.previewTouchStartY = t.clientY || t.pageY || 0
            this.previewTouchMoved = false
            this.previewTouchStartTime = Date.now()
            this.previewIsDragging = true
            this.previewDragOffset = 0
        },
        onPreviewMove(e) {
            if (!this.previewIsDragging) return
            const t = (e.touches && e.touches[0]) || {}
            const dx = (t.clientX || t.pageX || 0) - (this.previewTouchStartX || 0)
            const dy = (t.clientY || t.pageY || 0) - (this.previewTouchStartY || 0)
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.previewTouchMoved = true
            // 边界阻尼
            if ((this.previewIndex === 0 && dx > 0) || (this.previewIndex === this.previewPhotos.length - 1 && dx < 0)) {
                this.previewDragOffset = dx * 0.35
            } else {
                this.previewDragOffset = dx
            }
        },
        onPreviewEnd(e) {
            if (!this.previewIsDragging) return
            this.previewIsDragging = false
            const changed = (e.changedTouches && e.changedTouches[0]) || {}
            const endX = changed.clientX || changed.pageX || this.previewTouchStartX || 0
            const endY = changed.clientY || changed.pageY || this.previewTouchStartY || 0
            const dx = endX - (this.previewTouchStartX || 0)
            const dy = endY - (this.previewTouchStartY || 0)
            const duration = Date.now() - (this.previewTouchStartTime || Date.now())

            // 短按（tap）识别：未明显移动且按下时间短 -> 打开 photo-detail
            if (!this.previewTouchMoved && duration < 300 && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
                try {
                    uni.setStorageSync(`album_photos_${this.orgId}`, JSON.stringify(this.albumPhotos || []))
                } catch (e) {
                    // ignore
                }
                uni.navigateTo({ url: `/pages/organization/photo-detail?orgId=${this.orgId}&photoIndex=${this.previewIndex}` })
                this.previewDragOffset = 0
                return
            }
            const absDx = Math.abs(dx)
            const SWIPE_THRESHOLD = Math.max(40, (this.previewContainerWidth || 0) * 0.15)
            if (absDx > SWIPE_THRESHOLD && absDx > Math.abs((changed.clientY || changed.pageY || 0) - (this.previewTouchStartY || 0))) {
                if (dx < 0) {
                    if (this.previewIndex < this.previewPhotos.length - 1) this.previewIndex++
                } else {
                    if (this.previewIndex > 0) this.previewIndex--
                }
            }
            // 回弹动画
            this.previewDragOffset = 0
        },
        fetchMembers() {
            this.membersLoading = true
            api.request({ url: `/api/organization/${this.orgId}/members`, method: 'GET' })
                .then((res) => {
                    if (!res?.success) {
                        this.members = []
                        this.isMember = false
                        showError(res?.message || '获取成员信息失败')
                        return
                    }
                    this.members = Array.isArray(res.data) ? res.data : []
                    const openId = this.currentOpenId
                    const userId = this.currentUserId
                    this.isMember = this.members.some((item) => {
                        const identifiers = this.getMemberIdentifiers(item)
                        if (openId && identifiers.openId && openId === identifiers.openId) return true
                        if (userId && identifiers.userId && String(userId) === String(identifiers.userId)) return true
                        return false
                    })
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.membersLoading = false
                })
        },
        applyJoin() {
            if (this.isBanned) {
                showError('该组织已被封禁')
                return
            }
            if (this.isMember) {
                showError('您已加入该组织')
                return
            }
            if (!this.orgId) {
                showError('缺少组织编号')
                return
            }
            const orgName = this.orgDetail.name || this.orgDetail.orgName || '该组织'
            uni.showModal({
                title: `申请加入 ${orgName}`,
                content: '请在下方输入框中说明您的申请理由（选填）',
                editable: true,
                placeholderText: '例如：我对该组织的活动很感兴趣...',
                success: (res) => {
                    if (!res.confirm) return
                    const reason = res.content || ''
                    api.request({
                        url: '/api/organization/member/apply',
                        method: 'POST',
                        data: {
                            orgId: this.orgId,
                            reason
                        }
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '申请失败')
                                return
                            }
                            showSuccess('申请已提交')
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                }
            })
        },
        quitOrganization() {
            if (!this.canQuitOrganization || this.quitLoading) return
            uni.showModal({
                title: '退出组织',
                content: '确定要退出该组织吗？',
                success: (res) => {
                    if (!res.confirm) return
                    this.quitLoading = true
                    api.request({
                        url: `/api/organization/member/quit?orgId=${encodeURIComponent(this.orgId)}`,
                        method: 'POST'
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '退出组织失败')
                                return
                            }
                            showSuccess('已退出组织')
                            this.fetchDetail()
                            this.fetchMembers()
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                        .finally(() => {
                            this.quitLoading = false
                        })
                }
            })
        },
        editOrganization() {
            if (!this.canManageOrg) return
            uni.navigateTo({ url: `/pages/organization/apply?orgId=${this.orgId}` })
        },
        openMember(member) {
            const user = member?.user || {}
            const userId = user.userId || user.id || member.userId || member.id
            if (!userId) {
                showError('缺少用户编号，无法查看信息')
                return
            }
            const openId = user.openid || user.openId || member.openid || member.openId || ''
            this.userDialogMember = { ...member }
            this.userDialogTarget = {
                userId,
                openId
            }
            this.userDetail = null
            this.userDetailError = ''
            this.userBanLoading = false
            this.userDetailLoading = true
            this.userDialogVisible = true
            this.loadUserDetail()
        },
        loadUserDetail() {
            const target = this.userDialogTarget || {}
            const userId = target.userId
            if (!userId) {
                this.userDetailLoading = false
                this.userDetailError = '缺少用户编号'
                return
            }
            api.request({
                url: `/api/users/member?id=${encodeURIComponent(userId)}`,
                method: 'GET'
            })
                .then((res) => {
                    if (!res?.success) {
                        this.userDetailError = res?.message || '获取用户信息失败'
                        showError(this.userDetailError)
                        this.userDetail = null
                        return
                    }
                    const detail = res.data || null
                    this.userDetail = detail
                    if (detail) {
                        const detailUser = detail.user || detail
                        const detailOpenId = detailUser?.openid || detailUser?.openId
                        if (detailOpenId && this.userDialogTarget && !this.userDialogTarget.openId) {
                            this.userDialogTarget = {
                                ...this.userDialogTarget,
                                openId: detailOpenId
                            }
                        }
                    }
                })
                .catch(() => {
                    this.userDetailError = '请求失败，请检查网络或登录状态'
                    showError(this.userDetailError)
                    this.userDetail = null
                })
                .finally(() => {
                    this.userDetailLoading = false
                })
        },
        memberActionKey(member) {
            const ids = this.getMemberIdentifiers(member)
            return ids.memberId || ids.userId || ids.openId || ''
        },
        getMemberIdentifiers(member) {
            if (!member) {
                return { memberId: null, userId: null, openId: null }
            }
            const user = member.user || {}
            const memberId =
                member.memberId ??
                member.MemberId ??
                member.id ??
                member.ID ??
                member.memberID ??
                member.userId ??
                member.UserId ??
                user.userId ??
                user.UserId ??
                user.id ??
                null
            const userId =
                user.userId ??
                user.UserId ??
                user.id ??
                member.userId ??
                member.UserId ??
                member.id ??
                member.ID ??
                null
            const openId =
                user.openid ??
                user.openId ??
                user.OpenId ??
                member.openid ??
                member.openId ??
                member.OpenId ??
                null
            return { memberId, userId, openId }
        },
        canChangeRole(member) {
            if (!member) return false
            if (!this.isOrgLeader) return false
            const role = (member.memberRole || '').toUpperCase()
            if (role === 'LEADER' || role === 'OWNER') return false
            const ids = this.getMemberIdentifiers(member)
            return !!ids.memberId
        },
        roleToggleLabel(member) {
            const role = (member?.memberRole || '').toUpperCase()
            return role === 'MANAGER' ? '设为成员' : '设为管理员'
        },
        isRoleChanging(member) {
            const key = this.memberActionKey(member)
            return !!key && this.roleChangeLoadingKey === key
        },
        changeMemberRole(member) {
            if (!this.canChangeRole(member)) return
            const key = this.memberActionKey(member)
            const currentRole = (member.memberRole || '').toUpperCase()
            const targetRole = currentRole === 'MANAGER' ? 'MEMBER' : 'MANAGER'
            const identifiers = this.getMemberIdentifiers(member)
            const memberId = identifiers.memberId
            if (!memberId) {
                showError('缺少成员编号，无法调整权限')
                return
            }
            this.roleChangeLoadingKey = key
            api.request({
                url: '/api/organization/member/change-role',
                method: 'POST',
                data: {
                    orgId: this.orgId,
                    memberId,
                    newRole: targetRole
                }
            })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '权限调整失败')
                        return
                    }
                    showSuccess('权限已更新')
                    this.fetchMembers()
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.roleChangeLoadingKey = ''
                })
        },
        canTransferLeadership(member) {
            if (!member) return false
            if (!(this.isOrgLeader || this.isPlatformAdmin)) return false
            const role = (member.memberRole || '').toUpperCase()
            if (role === 'LEADER' || role === 'OWNER') return false
            const identifiers = this.getMemberIdentifiers(member)
            const memberOpenId = identifiers.openId
            const leaderOpenId = this.leader?.openid || this.leader?.openId
            if (memberOpenId && leaderOpenId && memberOpenId === leaderOpenId) return false
            return !!identifiers.memberId
        },
        isTransferLoading(member) {
            const key = this.memberActionKey(member)
            return !!key && this.transferLoadingKey === key
        },
        transferLeadership(member) {
            if (!this.canTransferLeadership(member)) return
            const key = this.memberActionKey(member)
            const identifiers = this.getMemberIdentifiers(member)
            const memberId = identifiers.memberId
            if (!memberId) {
                showError('缺少成员编号，无法转移首领')
                return
            }
            const previousLeaderIdentifiers = this.getMemberIdentifiers(this.leader)
            const name = member?.user?.nickname || member?.user?.name || member.nickname || member.name || '该成员'
            uni.showModal({
                title: '转移组织首领',
                content: `确定将 ${name} 设置为新的组织首领吗？`,
                success: (res) => {
                    if (!res.confirm) return
                    this.transferLoadingKey = key
                    api.request({
                        url: `/api/organization/change-leader?orgId=${encodeURIComponent(this.orgId)}&newLeaderId=${encodeURIComponent(memberId)}`,
                        method: 'POST'
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '转移失败')
                                return
                            }
                            showSuccess('已转移组织首领')
                            this.members = this.members.map((item) => {
                                const ids = this.getMemberIdentifiers(item)
                                if (ids.memberId === memberId) {
                                    return { ...item, memberRole: 'LEADER' }
                                }
                                if (previousLeaderIdentifiers?.memberId && ids.memberId === previousLeaderIdentifiers.memberId) {
                                    return { ...item, memberRole: 'MEMBER' }
                                }
                                return item
                            })
                            this.leader = {
                                ...member,
                                memberRole: 'LEADER'
                            }
                            this.fetchDetail()
                            this.fetchMembers()
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                        .finally(() => {
                            this.transferLoadingKey = ''
                        })
                }
            })
        },
        showMemberActions(member) {
            return this.canChangeRole(member) || this.canTransferLeadership(member) || this.canOperateMember(member)
        },
        canOperateMember(member) {
            if (!member) return false
            const identifiers = this.getMemberIdentifiers(member)
            const memberOpenId = identifiers.openId
            const memberUserId = identifiers.userId
            // 不能踢出自己
            if (this.currentOpenId && memberOpenId && this.currentOpenId === memberOpenId) return false
            if (this.currentUserId && memberUserId !== undefined && memberUserId !== null && String(memberUserId) === String(this.currentUserId)) return false

            const memberRole = (member.memberRole || '').toUpperCase()
            // 无论是谁，都不能踢出组织首领
            if (memberRole === 'LEADER' || memberRole === 'OWNER') return false

            // 只有组织首领或平台管理员可以执行踢人操作
            return this.isOrgLeader || this.isPlatformAdmin
        },
        kickMember(member) {
            if (!this.canOperateMember(member)) return
            const identifiers = this.getMemberIdentifiers(member)
            const memberId = identifiers.memberId
            const user = member?.user || {}
            if (!memberId) {
                showError('缺少成员编号')
                return
            }
            const name = user.nickname || user.name || '该成员'
            uni.showModal({
                title: '踢出成员',
                content: `确定将 ${name} 移出该组织吗？`,
                success: (res) => {
                    if (!res.confirm) return
                    api.request({
                        url: `/api/organization/member/kick?orgId=${encodeURIComponent(this.orgId)}&memberId=${encodeURIComponent(memberId)}`,
                        method: 'POST'
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '操作失败')
                                return
                            }
                            showSuccess('已移出成员')
                            this.fetchMembers()
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                }
            })
        },
        closeUserDialog() {
            this.userDialogVisible = false
            this.userDialogMember = null
            this.userDialogTarget = null
            this.userDetail = null
            this.userDetailError = ''
            this.userDetailLoading = false
            this.userBanLoading = false
        },
        toggleUserBan(ban) {
            if (!this.canBanUser || this.userBanLoading) return
            const openId = this.userBanOpenId
            if (!openId) {
                showError('缺少用户 openId')
                return
            }
            this.userBanLoading = true
            api.request({
                url: `/api/admin/users/ban?openId=${encodeURIComponent(openId)}&ban=${ban}`,
                method: 'PUT'
            })
                .then((res) => {
                    if (!res?.success) {
                        showError(res?.message || '操作失败')
                        return
                    }
                    showSuccess(ban ? '已封禁用户' : '已解封用户')
                    const newStatus = ban ? 0 : 1
                    if (this.userDetail) {
                        if (this.userDetail.user) {
                            this.userDetail = {
                                ...this.userDetail,
                                user: { ...this.userDetail.user, status: newStatus }
                            }
                        } else {
                            this.userDetail = { ...this.userDetail, status: newStatus }
                        }
                    }
                    if (this.userDialogMember) {
                        if (this.userDialogMember.user) {
                            this.userDialogMember = {
                                ...this.userDialogMember,
                                user: { ...this.userDialogMember.user, status: newStatus }
                            }
                        } else {
                            this.userDialogMember = { ...this.userDialogMember, status: newStatus }
                        }
                    }
                    this.fetchMembers()
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.userBanLoading = false
                })
        },
        banOrganization() {
            if (!this.canBanOrg || this.orgBanLoading) return
            if (!this.orgId) {
                showError('缺少组织编号')
                return
            }
            const orgName = this.orgDetail.name || this.orgDetail.orgName || '该组织'
            uni.showModal({
                title: '封禁组织',
                content: `确定要封禁 ${orgName} 吗？`,
                editable: true,
                placeholderText: '请输入封禁原因（可选）',
                success: (res) => {
                    if (!res.confirm) return
                    const reason = res.content || ''
                    this.orgBanLoading = true
                    api.request({
                        url: '/api/organization/ban',
                        method: 'POST',
                        data: {
                            orgId: this.orgId,
                            reason
                        }
                    })
                        .then((response) => {
                            if (!response?.success) {
                                showError(response?.message || '封禁失败')
                                return
                            }
                            showSuccess('组织已封禁')
                            this.fetchDetail()
                            this.fetchMembers()
                        })
                        .catch(() => {
                            showError('请求失败，请检查网络或登录状态')
                        })
                        .finally(() => {
                            this.orgBanLoading = false
                        })
                }
            })
        },
        // 通过原生确认框发起解散（不需要理由）
        disbandOrganization() {
            if (!this.canDisbandOrg || this.disbandLoading) return
            if (!this.orgId) {
                showError('缺少组织编号')
                return
            }
            const orgName = this.orgDetail.name || this.orgDetail.orgName || '该组织'
            uni.showModal({
                title: '解散组织',
                content: `确定要解散 ${orgName} 吗？此操作不可撤销。`,
                success: (res) => {
                    if (!res.confirm) return
                    this.submitDisband()
                }
            })
        },
        // 提交解散请求（仅传 orgId）
        submitDisband() {
            if (!this.canDisbandOrg || this.disbandLoading) return
            if (!this.orgId) {
                showError('缺少组织编号')
                return
            }
            this.disbandLoading = true
            const q = `orgId=${encodeURIComponent(this.orgId)}`
            api.request({
                url: `/api/organization/disband?${q}`,
                method: 'POST'
            })
                .then((response) => {
                    if (!response?.success) {
                        showError(response?.message || '解散失败')
                        return
                    }
                    showSuccess(response?.message || '组织已解散')
                    try { uni.$emit('organizationUpdated', { orgId: this.orgId }) } catch (e) { }
                    setTimeout(() => uni.navigateBack(), 600)
                })
                .catch(() => {
                    showError('请求失败，请检查网络或登录状态')
                })
                .finally(() => {
                    this.disbandLoading = false
                })
        }
    }
}
</script>

<style>
.page {
    min-height: 100vh;
    padding: 40rpx 32rpx 40rpx;
    box-sizing: border-box;
    background-color: #f6f2ee;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.header {
    padding: 8rpx 8rpx 4rpx;
}

.title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.subtitle {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #64748b;
}

.album-preview-card {
    position: relative;
    background: #ffffff;
    border-radius: 24rpx;
    padding: 16rpx;
    box-shadow: 0 8rpx 16rpx rgba(15, 23, 42, 0.06);
    overflow: hidden;
    height: 30vh;
    /* 预览区占 30% */
    box-sizing: border-box;
}

.album-scroll {
    width: 100%;
    height: 280rpx;
    white-space: nowrap;
    scroll-behavior: smooth;
}

.album-slider {
    width: 100%;
    height: calc(100% - 8rpx);
    overflow: hidden;
    position: relative;
}

.album-track {
    display: flex;
    height: 100%;
    will-change: transform;
}

.album-item {
    flex: 0 0 100%;
    width: 100%;
    height: 100%;
    background-color: #f1f5f9;
    border-radius: 12rpx;
    overflow: hidden;
}

.album-image {
    width: 100%;
    height: 100%;
}

.album-empty-state {
    width: 100%;
    height: calc(100% - 8rpx);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8fafc;
    border-radius: 12rpx;
}

.empty-text {
    font-size: 24rpx;
    color: #94a3b8;
}

.album-more-btn {
    position: absolute;
    right: 20rpx;
    bottom: 20rpx;
    background: rgba(255, 255, 255, 0.7);
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(4px);
}

.more-text {
    font-size: 20rpx;
    color: #1e293b;
    font-weight: 500;
}

.album-upload-btn {
    position: absolute;
    left: 20rpx;
    bottom: 20rpx;
    background: rgba(37, 99, 235, 0.85);
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.3);
    backdrop-filter: blur(4px);
}

.upload-text {
    font-size: 20rpx;
    color: #ffffff;
    font-weight: 500;
}

.card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    padding: 24rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
}

.state {
    font-size: 24rpx;
    color: #94a3b8;
    text-align: center;
    padding: 32rpx 0;
}

.org-header {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.avatar {
    width: 150rpx;
    height: 150rpx;
    border-radius: 16rpx;
    background: #e2e8f0;
}

.org-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.org-name {
    font-size: 40rpx;
    font-weight: 700;
    color: #0f172a;
}

.org-meta {
    font-size: 26rpx;
    color: #475569;
}

.org-desc {
    margin-top: 12rpx;
    font-size: 28rpx;
    color: #475569;
    line-height: 1.6;
}

/* org info card occupies 20% of viewport */
.org-info-card {
    height: 30vh;
    box-sizing: border-box;
    padding: 20rpx;
    margin-top: 16rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    /* 固定区域，不允许在卡片内上下滚动 */
}

/* members area occupies remaining 50% and scrolls */
.members-card {
    height: 50vh;
    box-sizing: border-box;
    margin-top: 32rpx;
    /* 整体下移，避免与 org-info-card 内部内容重叠 */
    overflow: hidden;
    padding: 16rpx;
}

.members-card .member-list {
    height: 100%;
    overflow-y: auto;
    padding-right: 8rpx;
}

.action-row {
    display: flex;
    gap: 16rpx;
    margin-top: 24rpx;
    flex-wrap: wrap;
}

.primary-btn,
.ghost-btn,
.danger-btn {
    flex: 1;
    min-width: 200rpx;
    border-radius: 999rpx;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 24rpx;
    text-align: center;
}

.primary-btn {
    background: #2563eb;
    color: #fff;
}

.primary-btn[disabled] {
    background: #94a3b8;
    color: #ffffff;
}

.ghost-btn {
    background: #e2e8f0;
    color: #1e293b;
}

.danger-btn {
    background: #dc2626;
    color: #ffffff;
}

.user-modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.52);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40rpx 32rpx;
    box-sizing: border-box;
    z-index: 999;
}

.user-modal {
    width: 100%;
    max-width: 640rpx;
    background: #ffffff;
    border-radius: 24rpx;
    padding: 28rpx 24rpx;
    box-shadow: 0 18rpx 36rpx rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.user-modal-header {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.user-modal-avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: #e2e8f0;
}

.user-modal-avatar.placeholder {
    display: inline-flex;
}

.user-modal-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.user-modal-name {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
}

.user-modal-meta {
    font-size: 22rpx;
    color: #64748b;
}

.close-btn {
    height: 60rpx;
    line-height: 60rpx;
    padding: 0 24rpx;
    border-radius: 999rpx;
    background: #e2e8f0;
    color: #1e293b;
    font-size: 24rpx;
}

.user-modal-body {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.user-modal-state {
    font-size: 24rpx;
    color: #475569;
    text-align: center;
}

.user-modal-state.error {
    color: #dc2626;
}

.user-modal-row {
    display: flex;
    justify-content: space-between;
    gap: 16rpx;
}

.row-label {
    font-size: 24rpx;
    color: #64748b;
    min-width: 120rpx;
}

.row-value {
    font-size: 24rpx;
    color: #0f172a;
    flex: 1;
    text-align: right;
    word-break: break-all;
}

.user-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;
}

.user-modal-hint {
    font-size: 22rpx;
    color: #dc2626;
}

.mini-btn.danger {
    background: #dc2626;
    color: #ffffff;
}

.mini-btn.ghost {
    background: #e2e8f0;
    color: #1e293b;
}

.mini-btn.primary {
    background: #2563eb;
    color: #ffffff;
}

.section-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
}

.member-list {
    margin-top: 16rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.member-item {
    display: flex;
    gap: 16rpx;
    padding: 16rpx;
    background: #f8fafc;
    border-radius: 16rpx;
}

.member-avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: #e2e8f0;
}

.member-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.member-actions {
    display: flex;
    flex-direction: row;
    gap: 8rpx;
    align-items: center;
    justify-content: flex-end;
}

.member-name {
    font-size: 26rpx;
    font-weight: 600;
    color: #0f172a;
}

.member-meta {
    font-size: 22rpx;
    color: #64748b;
}

.mini-btn {
    background: #ef4444;
    color: #fff;
    border-radius: 12rpx;
    height: 56rpx;
    line-height: 56rpx;
    font-size: 22rpx;
    padding: 0 16rpx;
    margin: 0;
}

/* Disband modal styles */
.disband-modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.52);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24rpx;
    box-sizing: border-box;
    z-index: 1000;
}

.disband-modal {
    width: 100%;
    max-width: 720rpx;
    background: #fff;
    border-radius: 16rpx;
    padding: 20rpx;
    box-shadow: 0 18rpx 36rpx rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.disband-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #0f172a;
}

.disband-hint {
    font-size: 22rpx;
    color: #64748b;
}

.disband-textarea {
    min-height: 200rpx;
    border-radius: 12rpx;
    border: 1rpx solid #e6eef8;
    padding: 12rpx;
    font-size: 24rpx;
    color: #0f172a;
    resize: none;
    background: #f8fafc;
}

.disband-actions {
    display: flex;
    gap: 12rpx;
    justify-content: flex-end;
    margin-top: 8rpx;
}
</style>
