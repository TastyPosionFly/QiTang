<template>
    <view class="page" @touchmove="onPageTouchMove">
        <view v-if="loading" class="loading-state">加载中...</view>
        <view v-else-if="!venue" class="error-state">场地信息未找到</view>
        <view v-else class="content">
            <!-- 照片预览区 -->
            <view class="photo-section" v-if="venue.photoList && venue.photoList.length > 0">
                <swiper class="photo-swiper" :indicator-dots="true" :autoplay="false" :circular="true">
                    <swiper-item v-for="(photo, index) in venue.photoList" :key="photo.id || index">
                        <image class="photo-image" :src="photo.url" mode="aspectFill" @tap="previewPhoto(index)">
                        </image>
                    </swiper-item>
                </swiper>
                <view class="photo-count">{{ currentPhotoIndex + 1 }} / {{ venue.photoList.length }}</view>
            </view>

            <!-- 基本信息卡片 -->
            <view class="card info-card">
                <view class="venue-header">
                    <text class="venue-title">{{ venue.name || '-' }}</text>
                    <view class="status-badge" :class="'status-' + venue.status">
                        <text class="status-text">{{ mapStatus(venue.status) }}</text>
                    </view>
                </view>
                <view class="venue-actions">
                    <view v-if="isSuperAdmin || isVenueManager" class="action-btn status-change-btn"
                        @tap="showStatusChangeMenu">
                        <text class="btn-icon">🔄</text>
                        <text class="btn-text-small">切换</text>
                    </view>
                    <view v-if="isSuperAdmin || isVenueManager" class="action-btn edit-btn" @tap="navigateToEdit">
                        <text class="btn-icon">✏️</text>
                        <text class="btn-text-small">编辑</text>
                    </view>
                    <view v-if="isSuperAdmin" class="action-btn delete-btn" @tap="confirmDelete">
                        <text class="btn-icon">🗑</text>
                        <text class="btn-text-small">删除</text>
                    </view>
                </view>

                <view class="venue-description">{{ venue.description || '暂无描述' }}</view>

                <view class="info-grid">
                    <view class="info-item">
                        <text class="info-label">开放时间</text>
                        <text class="info-value" :class="formatTodayClass(venue)">{{ formatTodayOpening(venue) }}</text>
                    </view>
                    <view class="info-item">
                        <text class="info-label">类型</text>
                        <text class="info-value">{{ mapType(venue.type) }}</text>
                    </view>
                    <view class="info-item">
                        <text class="info-label">容量</text>
                        <text class="info-value">{{ venue.capacity || '-' }}人</text>
                    </view>
                </view>

                <view class="address-section">
                    <text class="address-icon">📍</text>
                    <text class="address-text">{{ venue.address || '暂无地址' }}</text>
                </view>
            </view>

            <!-- 设备信息卡片 -->
            <view class="card equipment-card" v-if="getEquipmentList(venue.equipmentInfo).length > 0">
                <view class="card-title">设备信息</view>
                <view class="equipment-grid">
                    <view class="equipment-item" v-for="(item, idx) in getEquipmentList(venue.equipmentInfo)"
                        :key="idx">
                        <text class="equipment-key">{{ item.label }}</text>
                        <text class="equipment-value">{{ item.value }}</text>
                    </view>
                </view>
            </view>

            <!-- 场地管理员信息 -->
            <view class="card manager-card" v-if="venue.manager">
                <view class="card-title">场地管理员</view>
                <view class="manager-info">
                    <image class="manager-avatar" :src="venue.manager.avatarUrl || '/static/default-avatar.png'"
                        mode="aspectFill"></image>
                    <view class="manager-details">
                        <text class="manager-name">{{ venue.manager.name || '-' }}</text>
                        <text class="manager-role">场地管理员</text>
                        <view class="manager-contact" v-if="venue.manager.phone">
                            <text class="contact-icon">📞</text>
                            <text class="contact-text">{{ venue.manager.phone }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 预约日历区域 -->
            <view class="card calendar-card main-feature">
                <view class="calendar-header-wrapper">
                    <view class="card-title calendar-title">
                        <text class="calendar-title-text">📅 场地时间表</text>
                        <text v-if="isSuperAdmin || isVenueManager" class="calendar-hint">（点击日期可屏蔽）</text>
                    </view>
                    <view v-if="isSuperAdmin || isVenueManager" class="hours-manage-btn" @tap="openHoursModal">
                        <text class="hours-btn-icon">⏰</text>
                        <text class="hours-btn-text">设置开放时间</text>
                    </view>
                </view>

                <view v-if="calendarLoading" class="calendar-loading">加载中...</view>
                <view v-else class="calendar-container">
                    <!-- 月份切换 -->
                    <view class="calendar-header">
                        <view class="month-switch" @tap="changeMonth(-1)">
                            <text class="switch-icon">◀</text>
                        </view>
                        <text class="current-month">
                            {{ currentMonth.getFullYear() }}年{{ currentMonth.getMonth() + 1 }}月
                        </text>
                        <view class="month-switch" @tap="changeMonth(1)">
                            <text class="switch-icon">▶</text>
                        </view>
                        <!-- 长按并拖动以多日选择（管理员） -->
                    </view>

                    <!-- 星期标题 -->
                    <view class="weekday-header">
                        <text class="weekday-label">一</text>
                        <text class="weekday-label">二</text>
                        <text class="weekday-label">三</text>
                        <text class="weekday-label">四</text>
                        <text class="weekday-label">五</text>
                        <text class="weekday-label">六</text>
                        <text class="weekday-label">日</text>
                    </view>

                    <!-- 选择计数指示（松手后显示） -->
                    <view
                        v-if="!isSelecting && selectedBlockDates && selectedBlockDates.length > 0 && (isSuperAdmin || isVenueManager)"
                        class="selection-indicator">
                        <text class="selection-text">已选 {{ selectedBlockDates.length }} 天</text>
                    </view>

                    <!-- 日期格子 -->
                    <view class="calendar-grid" id="calendarGrid">
                        <view v-for="(day, index) in calendarDays" :key="index" class="day-cell" :class="{
                            'blank': day.blank,
                            'today': day.isToday,
                            'venue-maintenance': !day.blank && venue && venue.status === 0,
                            'venue-disabled': !day.blank && venue && venue.status === 2,
                            'blocked': day.isBlocked,
                            'has-events': day.events && day.events.length > 0,
                            'closed': !day.blank && !day.isBlocked && !day.openingHours && venue && venue.status === 1
                            , 'multi-selected': isDateSelected(day.dateObj)
                        }" @touchstart.stop="onDayPointerStart(day, index, $event)"
                            @touchend.stop="onDayPointerEnd(day, index, $event)" @tap="onDayTap(day)">
                            <view v-if="!day.blank" class="day-content">
                                <text class="day-number">{{ day.date }}</text>
                                <view v-if="day.events && day.events.length > 0" class="event-dots">
                                    <text class="event-dot" v-for="i in Math.min(day.events.length, 3)" :key="i"></text>
                                </view>
                                <text v-if="venue && venue.status === 0" class="day-label">维护</text>
                                <text v-else-if="venue && venue.status === 2" class="day-label">停用</text>
                                <text v-else-if="day.isBlocked" class="day-label">屏蔽</text>
                                <text v-else-if="!day.openingHours" class="day-label">休息</text>
                            </view>
                        </view>
                    </view>

                    <!-- 图例说明 -->
                    <view class="calendar-legend">
                        <view class="legend-item">
                            <view class="legend-dot today-dot"></view>
                            <text class="legend-text">今天</text>
                        </view>
                        <view class="legend-item" v-if="venue && venue.status === 0">
                            <view class="legend-dot maintenance-dot"></view>
                            <text class="legend-text">维护</text>
                        </view>
                        <view class="legend-item" v-else-if="venue && venue.status === 2">
                            <view class="legend-dot disabled-dot"></view>
                            <text class="legend-text">停用</text>
                        </view>
                        <view class="legend-item" v-else>
                            <view class="legend-dot event-dot-sample"></view>
                            <text class="legend-text">有演出</text>
                        </view>
                        <view class="legend-item" v-if="venue && venue.status === 1">
                            <view class="legend-dot blocked-dot"></view>
                            <text class="legend-text">屏蔽</text>
                        </view>
                        <view class="legend-item" v-if="venue && venue.status === 1">
                            <view class="legend-dot closed-dot"></view>
                            <text class="legend-text">休息</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <!-- 时间表弹窗 -->
        <!-- 编辑基础信息弹窗（仅更新非图片字段） -->
        <view v-if="showEditModal" class="edit-modal" @tap.self="showEditModal = false">
            <view class="edit-container" @tap.stop>
                <view class="edit-header">
                    <text class="edit-title">编辑场地信息</text>
                    <view class="close-btn" @tap="showEditModal = false"><text>✕</text></view>
                </view>

                <scroll-view class="edit-body" scroll-y>
                    <view class="form-item">
                        <text class="form-label">场地名称</text>
                        <input class="form-input" v-model="editForm.name" />
                    </view>
                    <view class="form-item">
                        <text class="form-label">场地描述</text>
                        <textarea class="form-textarea" v-model="editForm.description"></textarea>
                    </view>
                    <view class="form-item">
                        <text class="form-label">场地地址</text>
                        <input class="form-input" v-model="editForm.address" />
                    </view>
                    <view class="form-item">
                        <text class="form-label">场地容量</text>
                        <input class="form-input" v-model="editForm.capacity" type="number" />
                    </view>
                    <view class="form-item">
                        <text class="form-label">场地类型</text>
                        <input class="form-input" v-model="editForm.type" placeholder="填写类型编号或留空" />
                    </view>

                    <view class="form-item">
                        <text class="form-label">封面图片（可选）</text>
                        <view class="image-upload-section">
                            <view v-if="coverImageFile" class="image-preview small">
                                <image :src="coverImageFile.url || coverImageFile.path" class="preview-image"></image>
                                <view class="image-remove" @tap="coverImageFile = null">✕</view>
                            </view>
                            <view v-else class="upload-btn small" @tap="selectCoverForEdit">
                                <text class="upload-icon">📷</text>
                                <text class="upload-text">选择封面</text>
                            </view>
                        </view>
                    </view>

                    <view class="form-item">
                        <text class="form-label">相册图片 - 新增（可选）</text>
                        <view class="image-gallery">
                            <view v-for="(photo, idx) in newPhotoFiles" :key="idx" class="image-preview small">
                                <image :src="photo.url || photo.path" class="preview-image"></image>
                                <view class="image-remove" @tap="removeNewPhoto(idx)">✕</view>
                            </view>
                            <view class="upload-btn small" @tap="selectNewPhotos">
                                <text class="upload-icon">+</text>
                                <text class="upload-text">添加图片</text>
                            </view>
                        </view>
                    </view>

                    <view class="form-item">
                        <text class="form-label">相册图片 - 删除现有图片</text>
                        <view class="image-gallery">
                            <view v-for="(p, idx) in venue.photoList || []" :key="p.id || idx"
                                class="image-preview small">
                                <image :src="p.url" class="preview-image"></image>
                                <view class="image-remove" @tap="toggleDeletePhoto(p.id)">{{ deletePhotoIds &&
                                    deletePhotoIds.includes(p.id) ? '恢复' : '删除' }}</view>
                            </view>
                        </view>
                    </view>

                    <view class="form-item">
                        <text class="form-label">设备信息</text>
                        <view class="equipment-list">
                            <view v-for="(eq, idx) in editForm.equipmentList" :key="idx" class="equipment-item">
                                <input class="equipment-input" v-model="eq.key" placeholder="设备名" />
                                <input class="equipment-input" v-model="eq.value" placeholder="设备描述" />
                                <view class="equipment-remove" @tap="removeEditEquipment(idx)">✕</view>
                            </view>
                        </view>
                        <view class="add-equipment-btn" @tap="addEditEquipment">+ 添加设备</view>
                    </view>

                    <view class="form-item" v-if="isSuperAdmin">
                        <text class="form-label">更换场地管理员 (仅超级管理员)</text>
                        <input class="form-input" v-model="editForm.managerId" placeholder="输入管理员ID" />
                    </view>
                </scroll-view>

                <view class="edit-actions">
                    <button class="cancel-btn" @tap="showEditModal = false">取消</button>
                    <button class="submit-btn" @tap="submitEdit" :disabled="editing">{{ editing ? '保存中...' : '保存'
                    }}</button>
                </view>
            </view>
        </view>
        <view v-if="showTimeline" class="timeline-modal" @tap.self="closeTimeline">
            <view class="timeline-container" @tap.stop>
                <!-- 弹窗头部 -->
                <view class="timeline-header">
                    <text class="timeline-title">📋 场地时间表</text>
                    <view class="close-btn" @tap="closeTimeline">
                        <text class="close-icon">✕</text>
                    </view>
                </view>

                <!-- 日期切换 -->
                <view class="timeline-date-switcher">
                    <view class="date-switch-btn" @tap="changeTimelineDate(-1)">
                        <text class="switch-text">◀ 前一天</text>
                    </view>
                    <view class="current-date-display">
                        <text class="date-text">{{ formatTimelineDate(timelineDates[currentTimelineIndex]) }}</text>
                        <text class="weekday-text">{{ getWeekdayName(timelineDates[currentTimelineIndex]) }}</text>
                    </view>
                    <view class="date-switch-btn" @tap="changeTimelineDate(1)">
                        <text class="switch-text">后一天 ▶</text>
                    </view>
                </view>

                <!-- 时间轴内容 -->
                <scroll-view class="timeline-scroll" scroll-y>
                    <!-- 场馆维护中 -->
                    <view v-if="venue && venue.status === 0" class="venue-status-overlay maintenance-overlay">
                        <view class="status-icon">🛠️</view>
                        <text class="status-title">场馆维护中</text>
                        <text class="status-desc">场地正在进行维护保养，暂时不对外开放</text>
                        <view class="status-hint">请关注后续通知</view>
                    </view>

                    <!-- 场馆停用 -->
                    <view v-else-if="venue && venue.status === 2" class="venue-status-overlay disabled-overlay">
                        <view class="status-icon">🚫</view>
                        <text class="status-title">场馆已停用</text>
                        <text class="status-desc">该场地已停止使用，无法进行预约</text>
                        <view class="status-hint">请选择其他场地</view>
                    </view>

                    <!-- 如果当天被屏蔽，显示全天屏蔽提示 -->
                    <view v-else-if="isDateBlocked(formatDate(timelineDates[currentTimelineIndex]))"
                        class="blocked-day-overlay">
                        <view class="blocked-icon">⛔</view>
                        <text class="blocked-title">场地屏蔽</text>
                        <text class="blocked-reason">{{
                            getBlockedReason(formatDate(timelineDates[currentTimelineIndex])) }}</text>
                        <view class="blocked-hint">该日期场地不可用</view>
                    </view>

                    <!-- 如果当天是休息日 -->
                    <view v-else-if="isDateClosed(timelineDates[currentTimelineIndex])" class="closed-day-overlay">
                        <view class="closed-icon">😴</view>
                        <text class="closed-title">今日休息</text>
                        <text class="closed-desc">该场地今日不开放，请选择其他日期</text>
                        <view class="closed-hint">查看其他开放日期</view>
                    </view>

                    <!-- 正常的时间表 -->
                    <view v-else class="timeline-wrapper">
                        <view class="timeline-content">
                            <view v-for="hour in 24" :key="hour" class="hour-block" :class="{
                                'out-of-hours': !isHourInOpeningRange(hour - 1, timelineDates[currentTimelineIndex])
                            }">
                                <view class="hour-label-section">
                                    <text class="hour-label">{{ String(hour - 1).padStart(2, '0') }}:00</text>
                                </view>
                                <view class="hour-content">
                                    <!-- 如果是开放时间外 -->
                                    <view v-if="!isHourInOpeningRange(hour - 1, timelineDates[currentTimelineIndex])"
                                        class="closed-overlay">
                                        <text class="closed-text">未开放</text>
                                    </view>
                                </view>
                            </view>
                        </view>

                        <!-- 演出层，绝对定位在时间轴上方 -->
                        <view class="events-layer">
                            <view v-for="(event, idx) in getDayEvents(timelineDates[currentTimelineIndex])" :key="idx"
                                class="event-block-full" :style="getEventFullStyle(event)">
                                <text class="event-name">{{ event.performanceName }}</text>
                                <text class="event-time">{{ formatEventTime(event) }}</text>
                                <text class="event-organizer">{{ event.organizerName }}</text>
                            </view>
                        </view>
                    </view>
                </scroll-view>

                <!-- 底部图例 -->
                <view class="timeline-footer">
                    <view class="footer-legend">
                        <view class="legend-item-small">
                            <view class="legend-color event-color"></view>
                            <text class="legend-label">演出占用</text>
                        </view>
                        <view class="legend-item-small">
                            <view class="legend-color closed-color"></view>
                            <text class="legend-label">未开放</text>
                        </view>
                        <view class="legend-item-small">
                            <view class="legend-color blocked-color"></view>
                            <text class="legend-label">已屏蔽</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <!-- 设置开放时间弹窗 -->
        <view v-if="showHoursModal" class="hours-modal" @tap="onHoursOverlayTap">
            <view class="hours-container" @tap.stop>
                <view class="hours-header">
                    <view class="hours-header-content">
                        <text class="hours-icon">⏰</text>
                        <view class="hours-header-text">
                            <text class="hours-title">设置开放时间</text>
                            <text class="hours-subtitle">设置每周固定开放时间</text>
                        </view>
                    </view>
                    <view class="hours-close-btn" @tap="showHoursModal = false">
                        <text class="close-icon">✕</text>
                    </view>
                </view>

                <scroll-view class="hours-body" scroll-y>
                    <view v-for="(day, idx) in weeklyHours" :key="idx" class="day-card"
                        :class="{ 'day-closed': day.isClosed }">
                        <view class="day-card-header">
                            <view class="day-info">
                                <text class="day-name">{{ ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx] }}</text>
                                <text v-if="day.isClosed" class="closed-badge">休息日</text>
                            </view>
                            <view class="day-switch" @tap.stop>
                                <text class="switch-label">{{ day.isClosed ? '已关闭' : '营业中' }}</text>
                                <switch :checked="day.isClosed" @change="toggleDayClosed(idx, $event)" @tap.stop
                                    color="#f87171" />
                            </view>
                        </view>
                        <view v-if="!day.isClosed" class="day-card-body">
                            <view class="time-picker-group">
                                <view class="picker-item">
                                    <text class="picker-label">🌅 开始时间</text>
                                    <picker mode="time" :value="day.openTime" @change="onOpenTimeChange(idx, $event)">
                                        <view class="picker-value">
                                            <text class="time-text">{{ day.openTime || '09:00' }}</text>
                                            <text class="picker-arrow">›</text>
                                        </view>
                                    </picker>
                                </view>
                                <view class="time-divider"></view>
                                <view class="picker-item">
                                    <text class="picker-label">🌙 结束时间</text>
                                    <picker mode="time" :value="day.closeTime" @change="onCloseTimeChange(idx, $event)">
                                        <view class="picker-value">
                                            <text class="time-text">{{ day.closeTime || '22:00' }}</text>
                                            <text class="picker-arrow">›</text>
                                        </view>
                                    </picker>
                                </view>
                            </view>
                        </view>
                    </view>
                </scroll-view>

                <view class="hours-footer">
                    <view class="footer-btn cancel-btn" @tap="showHoursModal = false">
                        <text class="btn-text">取消</text>
                    </view>
                    <view class="footer-btn submit-btn" :class="{ 'btn-loading': savingHours }"
                        @tap="submitOpeningHours">
                        <text class="btn-text">{{ savingHours ? '保存中...' : '保存设置' }}</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 屏蔽日期确认弹窗 -->
        <view v-if="showBlockModal" class="block-modal" @tap.self="onModalClose">
            <view class="block-container" @tap.stop>
                <view class="block-header">
                    <view class="block-header-left">
                        <text class="block-title">⛔ 屏蔽日期</text>
                        <text class="block-subtitle">被屏蔽的日期将无法预约</text>
                    </view>
                    <view class="close-btn" @tap="onModalClose"><text>✕</text></view>
                </view>

                <view class="block-body">
                    <view class="block-date-display">
                        <text class="block-date-label">目标日期</text>
                        <view v-if="selectedBlockDates && selectedBlockDates.length > 0" class="block-multi-list">
                            <text class="block-multi-count">已选 {{ selectedBlockDates.length }} 天</text>
                            <view class="block-multi-items">
                                <text v-for="(d, i) in selectedBlockDates" :key="i" class="block-multi-item">{{
                                    formatBlockDate(d) }}</text>
                            </view>
                        </view>
                        <text v-else class="block-date-value">{{ formatBlockDate(blockDate) }}</text>
                    </view>

                    <view class="block-input">
                        <text class="block-reason-label">屏蔽原因（可选）</text>
                        <textarea class="block-reason-input" v-model="blockReason" placeholder="请输入屏蔽原因（可选）"
                            maxlength="200"></textarea>
                    </view>

                    <view class="block-warning">
                        <text class="warning-icon">⚠️</text>
                        <text class="warning-text">屏蔽此日期将取消当天所有演出，请谨慎操作</text>
                    </view>
                </view>

                <view class="block-footer">
                    <view class="footer-btn cancel-btn" @tap="onModalClose"><text class="btn-text">取消</text>
                    </view>
                    <view class="footer-btn submit-block-btn" :class="{ 'btn-loading': blocking }"
                        @tap="submitBlockDate"><text class="btn-text">{{ blocking ? '屏蔽中...' : '确认屏蔽' }}</text></view>
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
            userRole: '',
            currentUserId: null,
            venue: null,
            loading: false,
            venueId: null,
            currentPhotoIndex: 0,
            // 日历数据
            calendarData: null,
            events: [],
            currentMonth: null,
            calendarLoading: false,
            // 时间表弹窗
            showTimeline: false,
            timelineDate: null,
            timelineDates: [],
            currentTimelineIndex: 0
            ,
            isDeleting: false
            ,
            // 编辑 modal
            showEditModal: false,
            editForm: {
                name: '',
                description: '',
                address: '',
                capacity: '',
                type: '',
                equipmentList: [],
                managerId: ''
            },
            coverImageFile: null,
            newPhotoFiles: [],
            editing: false,
            // 开放时间设置
            showHoursModal: false,
            savingHours: false,
            weeklyHours: [
                { dayOfWeek: 1, isClosed: false, openTime: '09:00', closeTime: '22:00' },
                { dayOfWeek: 2, isClosed: false, openTime: '09:00', closeTime: '22:00' },
                { dayOfWeek: 3, isClosed: false, openTime: '09:00', closeTime: '22:00' },
                { dayOfWeek: 4, isClosed: false, openTime: '09:00', closeTime: '22:00' },
                { dayOfWeek: 5, isClosed: false, openTime: '09:00', closeTime: '22:00' },
                { dayOfWeek: 6, isClosed: false, openTime: '09:00', closeTime: '22:00' },
                { dayOfWeek: 7, isClosed: false, openTime: '09:00', closeTime: '22:00' }
            ],
            // 屏蔽日期
            showBlockModal: false,
            blockDate: null,
            // 长按拖动选择：已选日期（Date 对象数组）
            selectedBlockDates: [],
            isSelecting: false,
            longPressTimer: null,
            pointerDown: false,
            // 日历格子位置信息
            calendarGridRect: null,
            blockReason: '',
            blocking: false
        }
    },
    watch: {
        showBlockModal(val) {
            if (!val) {
                // 关闭弹窗时如果未提交，清除临时选择
                this.selectedBlockDates = []
                this.isSelecting = false
                this.calendarGridRect = null
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer)
                    this.longPressTimer = null
                }
            }
        }
    },
    computed: {
        isSuperAdmin() {
            const role = this.userRole || uni.getStorageSync('role') || ''
            if (!role) return false
            const r = String(role).toLowerCase()
            return r.includes('admin') || r.includes('super')
        },
        isVenueManager() {
            if (!this.venue || !this.venue.manager) return false
            return String(this.venue.manager.id) === String(this.currentUserId)
        },
        // 生成当前月份的日历格子
        calendarDays() {
            if (!this.currentMonth) return []
            const year = this.currentMonth.getFullYear()
            const month = this.currentMonth.getMonth()
            const firstDay = new Date(year, month, 1)
            const lastDay = new Date(year, month + 1, 0)
            let firstDayOfWeek = firstDay.getDay()
            firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek
            const daysInMonth = lastDay.getDate()
            const blanks = firstDayOfWeek - 1
            const days = []
            for (let i = 0; i < blanks; i++) {
                days.push({ blank: true })
            }
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d)
                const dateStr = this.formatDate(date)
                days.push({
                    date: d,
                    dateStr: dateStr,
                    dateObj: date,
                    isToday: this.isToday(date),
                    isBlocked: this.isDateBlocked(dateStr),
                    openingHours: this.getOpeningHours(date, dateStr),
                    events: this.getDateEvents(dateStr)
                })
            }
            return days
        }
    },
    onLoad(options) {
        if (options.venueId) {
            this.venueId = options.venueId
            // 初始化当前月份
            this.currentMonth = new Date()
            this.fetchVenueDetail()
            this.fetchCalendarData()
            this.fetchEvents()
        }
    },
    onShow() {
        this.checkUserRole()
        // 页面返回时刷新场地详情，确保编辑后显示最新数据
        this.fetchVenueDetail()
    },
    methods: {
        onPageTouchMove(evt) {
            // 页面级 touchmove，传递给全局处理器
            if (this.isSelecting) {
                this.handleGlobalTouchMove(evt)
            }
        },
        async submitBlockDate() {
            if (this.blocking) return

            const datesToBlock = (this.selectedBlockDates && this.selectedBlockDates.length > 0)
                ? this.selectedBlockDates
                : (this.blockDate ? [this.blockDate] : [])

            if (!datesToBlock || datesToBlock.length === 0) {
                uni.showToast({ title: '请选择要屏蔽的日期', icon: 'none' })
                return
            }

            // 客户端拦截：不允许提交过去的日期（避免后端返回类似 "无法屏蔽过去的日期" 的错误）
            const today = new Date()
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const pastDates = datesToBlock.filter(d => {
                if (!d) return false
                const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
                return dd < todayStart
            })
            if (pastDates && pastDates.length > 0) {
                const formatYMD = (d) => {
                    const y = d.getFullYear()
                    const m = String(d.getMonth() + 1).padStart(2, '0')
                    const day = String(d.getDate()).padStart(2, '0')
                    return `${y}-${m}-${day}`
                }
                const list = pastDates.map(formatYMD).join(', ')
                uni.showToast({ title: `无法屏蔽过去的日期: ${list}`, icon: 'none', duration: 3000 })
                return
            }

            const confirmed = await new Promise(resolve => {
                const content = datesToBlock.length === 1
                    ? `屏蔽 ${this.formatBlockDate(datesToBlock[0])} 将取消当天所有演出，确定要继续吗？`
                    : `屏蔽 ${datesToBlock.length} 天将取消对应日期的所有演出，确定要继续吗？`
                uni.showModal({ title: '确认屏蔽', content, success: (res) => resolve(res.confirm) })
            })
            if (!confirmed) return

            this.blocking = true
            try {
                const formatYMD = (d) => {
                    const year = d.getFullYear()
                    const month = String(d.getMonth() + 1).padStart(2, '0')
                    const day = String(d.getDate()).padStart(2, '0')
                    return `${year}-${month}-${day}`
                }

                let dataPayload = { venueId: this.venueId, reason: this.blockReason || '管理员屏蔽' }
                if (datesToBlock.length === 1) {
                    dataPayload.blockedDate = formatYMD(datesToBlock[0])
                } else {
                    dataPayload.blockedDates = datesToBlock.map(d => formatYMD(d))
                }

                const res = await api.request({ url: '/api/venues/block', method: 'POST', data: dataPayload })
                if (res && res.success) {
                    const data = res.data || {}
                    const cancelCount = data.canceledPerformancesCount || 0
                    const msg = datesToBlock.length === 1
                        ? `已屏蔽 ${this.formatBlockDate(datesToBlock[0])}${cancelCount > 0 ? `，取消了 ${cancelCount} 场演出` : ''}`
                        : `已屏蔽 ${datesToBlock.length} 天${cancelCount > 0 ? `，共取消 ${cancelCount} 场演出` : ''}`
                    uni.showToast({ title: msg, icon: 'success', duration: 2000 })
                    this.showBlockModal = false
                    // watch 会自动清除 selectedBlockDates
                    this.fetchCalendarData()
                    this.fetchEvents()
                } else {
                    uni.showToast({ title: res?.message || '屏蔽失败', icon: 'none' })
                }
            } catch (err) {
                console.error('屏蔽日期失败:', err)
                uni.showToast({ title: '网络错误', icon: 'none' })
            } finally {
                this.blocking = false
            }
        },
        fetchVenueDetail() {
            if (!this.venueId) return
            this.loading = true
            api.request({
                url: `/api/venues/${this.venueId}`,
                method: 'GET'
            })
                .then((res) => {
                    if (res?.success && res.data) {
                        this.venue = res.data
                    } else {
                        uni.showToast({ title: '获取场地信息失败', icon: 'none' })
                    }
                })
                .catch((err) => {
                    console.error('获取场地详情失败:', err)
                    uni.showToast({ title: '网络错误', icon: 'none' })
                })
                .finally(() => {
                    this.loading = false
                })
                // 当详情获取完成后填充编辑表单
                .then(() => {
                    if (this.venue) {
                        this.editForm.name = this.venue.name || ''
                        this.editForm.description = this.venue.description || ''
                        this.editForm.address = this.venue.address || ''
                        this.editForm.capacity = this.venue.capacity || ''
                        this.editForm.type = this.venue.type || ''
                    }
                })
        },
        checkUserRole() {
            const cachedRole = uni.getStorageSync('role') || ''
            this.userRole = cachedRole
            api.request({ url: '/api/users/me', method: 'GET' })
                .then((res) => {
                    if (res?.success && res.data) {
                        this.userRole = res.data.role || this.userRole || ''
                        if (res.data.role) uni.setStorageSync('role', res.data.role)
                        this.currentUserId = res.data.id || this.currentUserId
                    }
                })
                .catch(() => {
                    // 使用缓存值
                })
        },
        previewPhoto(index) {
            if (!this.venue.photoList || this.venue.photoList.length === 0) return
            const urls = this.venue.photoList.map(p => p.url)
            uni.previewImage({
                current: index,
                urls: urls
            })
        },
        mapStatus(s) {
            if (s === 1 || String(s) === '1') return '正常'
            if (s === 0 || String(s) === '0') return '维护'
            if (s === 2 || String(s) === '2') return '停用'
            return s === undefined || s === null ? '未知' : String(s)
        },
        mapType(t) {
            const map = { 1: '剧场', 2: '礼堂', 3: '多功能', 4: '户外广场', 5: '其他' }
            return map[t] || (t ? String(t) : '-')
        },
        formatTodayOpening(v) {
            if (!v) return '-'
            const status = v.status !== undefined && v.status !== null ? String(v.status) : null
            if (status === '0') return '维护'
            if (status === '2') return '停用'
            const hoy = v.todayOpeningHours || null
            const blocked = v.todayBlocked || false
            if (blocked) return '休息'
            if ((hoy && hoy.isClosed) || v.isClosed) return '休息'
            const openTime = (hoy && hoy.openTime) || v.openTime
            const closeTime = (hoy && hoy.closeTime) || v.closeTime
            if (openTime && closeTime) {
                const o = String(openTime).slice(0, 5)
                const c = String(closeTime).slice(0, 5)
                const parseToMinutes = (t) => {
                    if (!t) return null
                    const parts = String(t).split(':')
                    const hh = Number(parts[0] || 0)
                    const mm = Number(parts[1] || 0)
                    return hh * 60 + mm
                }
                const openMin = parseToMinutes(o)
                const closeMin = parseToMinutes(c)
                const now = new Date()
                const nowMin = now.getHours() * 60 + now.getMinutes()
                let within = false
                if (openMin !== null && closeMin !== null) {
                    if (openMin <= closeMin) {
                        within = nowMin >= openMin && nowMin < closeMin
                    } else {
                        within = nowMin >= openMin || nowMin < closeMin
                    }
                }
                if (within) return `营业 ${o}-${c}`
                return `未开放 ${o}-${c}`
            }
            return '-'
        },
        formatTodayClass(v) {
            try {
                const status = v.status !== undefined && v.status !== null ? String(v.status) : null
                if (status === '0') return 'today-maintain'
                if (status === '2') return 'today-disabled'
                const txt = this.formatTodayOpening(v)
                if (!txt || txt === '-') return ''
                if (txt.startsWith('营业')) return 'today-open'
                return 'today-closed'
            } catch (err) {
                return ''
            }
        },
        getEquipmentList(e) {
            if (!e) return []
            try {
                let obj = e
                if (typeof e === 'string') obj = JSON.parse(e)
                if (typeof obj === 'object' && obj !== null) {
                    const items = []
                    for (const [k, v] of Object.entries(obj)) {
                        const label = k
                        let val = v
                        if (typeof v === 'boolean') val = v ? '是' : '否'
                        else if (typeof v === 'string' && (v.toLowerCase() === 'true' || v.toLowerCase() === 'false'))
                            val = v.toLowerCase() === 'true' ? '是' : '否'
                        else if (typeof v === 'object' && v !== null) {
                            if (Array.isArray(v)) val = v.join(', ')
                            else val = JSON.stringify(v)
                        }
                        items.push({ label, value: val })
                    }
                    return items
                }
                return []
            } catch (err) {
                return []
            }
        },
        // 日历相关方法
        fetchCalendarData() {
            if (!this.venueId) return
            this.calendarLoading = true
            api.request({
                url: `/api/venues/${this.venueId}/hours-and-blocks`,
                method: 'GET'
            })
                .then((res) => {
                    if (res?.success && res.data) {
                        this.calendarData = res.data
                    }
                })
                .catch((err) => {
                    console.error('获取开放时间失败:', err)
                })
                .finally(() => {
                    this.calendarLoading = false
                })
        },
        fetchEvents() {
            if (!this.venueId || !this.currentMonth) return
            const year = this.currentMonth.getFullYear()
            const month = this.currentMonth.getMonth()
            const start = this.formatDate(new Date(year, month, 1))
            const end = this.formatDate(new Date(year, month + 1, 0))

            api.request({
                url: `/api/venues/${this.venueId}/events`,
                method: 'GET',
                data: { start, end }
            })
                .then((res) => {
                    if (res?.success && res.data) {
                        this.events = res.data
                    }
                })
                .catch((err) => {
                    console.error('获取活动信息失败:', err)
                })
        },
        showStatusChangeMenu() {
            if (!this.isSuperAdmin && !this.isVenueManager) return

            const statusOptions = ['正常', '维护中', '已停用']
            const statusValues = [1, 0, 2]
            const currentStatus = this.venue.status

            uni.showActionSheet({
                itemList: statusOptions,
                success: (res) => {
                    const newStatus = statusValues[res.tapIndex]
                    if (newStatus !== currentStatus) {
                        this.changeVenueStatus(newStatus)
                    }
                }
            })
        },
        async changeVenueStatus(newStatus) {
            if (!this.venueId) return

            const statusMap = { 1: '正常', 0: '维护中', 2: '已停用' }

            uni.showLoading({ title: '更新中...' })

            try {
                // 使用 form-urlencoded 提交，后端使用 @ModelAttribute 绑定
                const payloadStr = `id=${encodeURIComponent(Number(this.venueId))}&status=${encodeURIComponent(newStatus)}`
                const res = await api.request({
                    url: '/api/venues/update',
                    method: 'POST',
                    header: { 'content-type': 'application/x-www-form-urlencoded' },
                    data: payloadStr
                })

                if (res && res.success) {
                    uni.showToast({ title: `已设置为${statusMap[newStatus]}`, icon: 'success' })
                    // 刷新场地详情
                    this.fetchVenueDetail()
                    this.fetchCalendarData()
                } else {
                    console.warn('changeVenueStatus failed response:', res)
                    uni.showToast({ title: res?.message || '更新失败', icon: 'none' })
                }
            } catch (err) {
                console.error('更新场地状态失败:', err)
                uni.showToast({ title: '网络错误', icon: 'none' })
            } finally {
                uni.hideLoading()
            }
        },
        confirmDelete() {
            if (!this.isSuperAdmin) return
            uni.showModal({
                title: '确认删除',
                content: '删除场地会同时移除相关数据，确定要删除该场地吗？',
                success: (res) => {
                    if (res.confirm) {
                        this.deleteVenue()
                    }
                }
            })
        },
        deleteVenue() {
            if (!this.venueId || this.isDeleting) return
            this.isDeleting = true
            uni.showLoading({ title: '删除中...' })
            api.request({
                url: `/api/venues/${this.venueId}/delete`,
                method: 'DELETE'
            })
                .then((res) => {
                    if (res?.success) {
                        uni.showToast({ title: '删除成功', icon: 'success' })
                        setTimeout(() => uni.navigateBack(), 1000)
                    } else {
                        uni.showToast({ title: res?.message || '删除失败', icon: 'none' })
                    }
                })
                .catch((err) => {
                    console.error('删除场地失败:', err)
                    uni.showToast({ title: '网络错误，删除失败', icon: 'none' })
                })
                .finally(() => {
                    this.isDeleting = false
                    uni.hideLoading()
                })
        },
        changeMonth(offset) {
            const year = this.currentMonth.getFullYear()
            const month = this.currentMonth.getMonth()
            this.currentMonth = new Date(year, month + offset, 1)
            this.fetchEvents()
        },
        formatDate(date) {
            if (!date) return ''
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        },
        isToday(date) {
            const today = new Date()
            return date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()
        },
        isDateBlocked(dateStr) {
            if (!this.calendarData || !this.calendarData.blockedDates) return false
            // 处理对象数组格式
            return this.calendarData.blockedDates.some(blocked => {
                if (typeof blocked === 'string') {
                    return blocked === dateStr
                }
                return blocked.date === dateStr
            })
        },
        getBlockedReason(dateStr) {
            if (!this.calendarData || !this.calendarData.blockedDates) return null
            const blocked = this.calendarData.blockedDates.find(b => {
                if (typeof b === 'string') return b === dateStr
                return b.date === dateStr
            })
            if (blocked && typeof blocked === 'object') {
                return blocked.reason || '场地屏蔽'
            }
            return '场地屏蔽'
        },
        isDateClosed(date) {
            if (!date || !this.calendarData) return false
            const dateStr = this.formatDate(date)
            // 获取开放时间
            const hours = this.getOpeningHours(date, dateStr)
            return !hours // 如果没有开放时间，则为休息日
        },
        getOpeningHours(date, dateStr) {
            if (!this.calendarData) return null
            // 检查是否有特殊日期规则
            const exception = this.calendarData.exceptions?.find(e => e.date === dateStr)
            if (exception) {
                if (exception.closed || exception.isClosed) return null
                return { openTime: exception.openTime, closeTime: exception.closeTime, note: exception.note }
            }
            // 使用常规开放时间
            const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
            const hours = this.calendarData.openingHours?.find(h => h.dayOfWeek === dayOfWeek)
            // 支持 closed 和 isClosed 两种字段名
            if (hours && !hours.closed && !hours.isClosed) {
                return { openTime: hours.openTime, closeTime: hours.closeTime }
            }
            return null
        },
        getDateEvents(dateStr) {
            return this.events.filter(e => e.performanceDate === dateStr)
        },
        onDateClick(day) {
            if (day.blank) return

            // 普通点击逻辑继续由下方 action sheet 处理

            // 如果是管理员，显示选项菜单
            if (this.isSuperAdmin || this.isVenueManager) {
                uni.showActionSheet({
                    itemList: ['查看时间表', '屏蔽该日期'],
                    success: (res) => {
                        if (res.tapIndex === 0) {
                            // 查看时间表
                            this.showTimelineForDate(day)
                        } else if (res.tapIndex === 1) {
                            // 屏蔽日期（单日）
                            this.openBlockModal(day.dateObj)
                        }
                    }
                })
            } else {
                // 普通用户只查看时间表
                this.showTimelineForDate(day)
            }
        },
        showTimelineForDate(day) {
            // 生成前后2天的日期列表（共5天）
            const dates = []
            for (let i = -2; i <= 2; i++) {
                const d = new Date(day.dateObj)
                d.setDate(d.getDate() + i)
                dates.push(d)
            }
            this.timelineDates = dates
            this.currentTimelineIndex = 2 // 中间是选中的日期
            this.showTimeline = true
        },
        // 多选模式相关方法
        // 长按拖动选择：开始/移动/结束处理
        onDayPointerStart(day, index, evt) {
            if (day.blank) return
            if (!(this.isSuperAdmin || this.isVenueManager)) return
            this.pointerDown = true
            // 启动长按计时器（300ms）
            if (this.longPressTimer) clearTimeout(this.longPressTimer)
            this.longPressTimer = setTimeout(() => {
                this.isSelecting = true
                this.selectedBlockDates = []
                this.addDateToSelection(day.dateObj)
                // 查询日历格子的位置信息
                this.queryCalendarGridRect()
            }, 300)
        },
        onDayTap(day) {
            // 普通点击（非拖动选择）
            if (!this.isSelecting && !day.blank) {
                this.onDateClick(day)
            }
        },
        handleGlobalTouchMove(evt) {
            if (!this.isSelecting || !this.calendarGridRect) return

            // 获取触摸点坐标
            const touch = evt.touches ? evt.touches[0] : evt
            if (!touch) return

            const { clientX, clientY } = touch
            const { left, top, width, height } = this.calendarGridRect

            // 计算相对于网格的位置
            const relX = clientX - left
            const relY = clientY - top

            // 检查是否在网格内
            if (relX < 0 || relY < 0 || relX > width || relY > height) return

            // 计算在哪一行哪一列（7列网格，8rpx gap）
            const cols = 7
            const cellWidth = width / cols
            const cellHeight = cellWidth // aspect-ratio 1:1

            const col = Math.floor(relX / cellWidth)
            const row = Math.floor(relY / cellHeight)
            const cellIndex = row * cols + col

            // 获取对应的日期
            if (cellIndex >= 0 && cellIndex < this.calendarDays.length) {
                const day = this.calendarDays[cellIndex]
                if (!day.blank && day.dateObj) {
                    this.addDateToSelection(day.dateObj)
                }
            }
        },
        queryCalendarGridRect() {
            // 查询日历网格的位置和尺寸
            const query = uni.createSelectorQuery().in(this)
            query.select('#calendarGrid').boundingClientRect(rect => {
                if (rect) {
                    this.calendarGridRect = rect
                }
            }).exec()
        },
        onDayPointerEnd(day, index, evt) {
            // 清理计时器
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer)
                this.longPressTimer = null
            }
            this.pointerDown = false
            if (this.isSelecting) {
                this.isSelecting = false
                this.calendarGridRect = null // 清理位置信息
                if (this.selectedBlockDates && this.selectedBlockDates.length > 0) {
                    // 打开批量屏蔽弹窗
                    this.openBlockModal(this.selectedBlockDates)
                }
            } else {
                // 非长按（普通点击），触发原有点击逻辑
                this.onDateClick(day)
            }
        },
        addDateToSelection(date) {
            if (!date) return
            const key = this.formatDate(date)
            const exists = this.selectedBlockDates.some(d => this.formatDate(d) === key)
            if (!exists) this.selectedBlockDates.push(new Date(date))
        },
        isDateSelected(date) {
            if (!date) return false
            const key = this.formatDate(date)
            return this.selectedBlockDates.some(d => this.formatDate(d) === key)
        },
        onModalClose() {
            // 手动关闭弹窗时清除选择
            this.showBlockModal = false
            this.selectedBlockDates = []
            this.isSelecting = false
            this.calendarGridRect = null
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer)
                this.longPressTimer = null
            }
        },
        closeTimeline() {
            this.showTimeline = false
        },
        navigateToEdit() {
            // 跳转到编辑页面
            if (!this.venueId) {
                uni.showToast({ title: '场地ID缺失', icon: 'none' })
                return
            }
            uni.navigateTo({
                url: `/pages/venue/edit?venueId=${this.venueId}`
            })
        },
        openEditModal() {
            // 填充最新数据
            if (this.venue) {
                this.editForm.name = this.venue.name || ''
                this.editForm.description = this.venue.description || ''
                this.editForm.address = this.venue.address || ''
                this.editForm.capacity = this.venue.capacity || ''
                this.editForm.type = this.venue.type || ''
            }
            this.showEditModal = true
        },
        async submitEdit() {
            if (this.editing) return
            // 简单校验
            if (!this.editForm.name || !String(this.editForm.name).trim()) {
                uni.showToast({ title: '请输入场地名称', icon: 'none' })
                return
            }
            this.editing = true
            const payload = {
                id: this.venueId,
                name: String(this.editForm.name).trim(),
                description: String(this.editForm.description || '').trim(),
                address: String(this.editForm.address || '').trim(),
                capacity: Number(this.editForm.capacity) || 0,
                type: this.editForm.type
            }
            try {
                const res = await api.request({ url: '/api/venues/update', method: 'POST', data: payload })
                if (res?.success) {
                    uni.showToast({ title: '更新成功', icon: 'success' })
                    this.showEditModal = false
                    // 刷新详情
                    this.fetchVenueDetail()
                } else {
                    uni.showToast({ title: res?.message || '更新失败', icon: 'none' })
                }
            } catch (err) {
                console.error('更新场地失败', err)
                uni.showToast({ title: '网络错误，更新失败', icon: 'none' })
            } finally {
                this.editing = false
            }
        },
        changeTimelineDate(offset) {
            const newIndex = this.currentTimelineIndex + offset
            if (newIndex >= 0 && newIndex < this.timelineDates.length) {
                this.currentTimelineIndex = newIndex
            } else {
                // 扩展日期范围
                if (offset < 0) {
                    const newDate = new Date(this.timelineDates[0])
                    newDate.setDate(newDate.getDate() - 1)
                    this.timelineDates.unshift(newDate)
                } else {
                    const lastDate = this.timelineDates[this.timelineDates.length - 1]
                    const newDate = new Date(lastDate)
                    newDate.setDate(newDate.getDate() + 1)
                    this.timelineDates.push(newDate)
                    this.currentTimelineIndex = this.timelineDates.length - 1
                }
            }
        },
        formatTimelineDate(date) {
            if (!date) return ''
            const y = date.getFullYear()
            const m = date.getMonth() + 1
            const d = date.getDate()
            return `${y}年${m}月${d}日`
        },
        getWeekdayName(date) {
            if (!date) return ''
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
            return days[date.getDay()]
        },
        isHourInOpeningRange(hour, date) {
            if (!date || !this.calendarData) return false
            const dateStr = this.formatDate(date)

            // 检查是否屏蔽
            if (this.isDateBlocked(dateStr)) return false

            // 获取开放时间
            const hours = this.getOpeningHours(date, dateStr)
            if (!hours) return false

            const openHour = parseInt(hours.openTime.split(':')[0])
            const closeHour = parseInt(hours.closeTime.split(':')[0])
            const closeMin = parseInt(hours.closeTime.split(':')[1])

            // 处理跨夜情况
            if (openHour <= closeHour) {
                return hour >= openHour && (hour < closeHour || (hour === closeHour && closeMin > 0))
            } else {
                return hour >= openHour || hour < closeHour
            }
        },
        getDayEvents(date) {
            if (!date) return []
            const dateStr = this.formatDate(date)
            return this.getDateEvents(dateStr)
        },
        getEventFullStyle(event) {
            // 计算演出在整个24小时时间轴中的位置和高度
            // 每个小时块高度为 120rpx，总高度 = 24 * 120 = 2880rpx
            const startTime = event.startTime.slice(11, 16)
            const endTime = event.endTime.slice(11, 16)
            const [startH, startM] = startTime.split(':').map(Number)
            const [endH, endM] = endTime.split(':').map(Number)

            // 计算从00:00开始的分钟数
            const startMinutes = startH * 60 + startM
            const endMinutes = endH * 60 + endM

            // 每分钟对应的rpx高度 = 2880 / (24 * 60) = 2rpx
            const pixelPerMinute = 2
            const top = startMinutes * pixelPerMinute
            const height = (endMinutes - startMinutes) * pixelPerMinute

            return {
                top: `${top}rpx`,
                height: `${height}rpx`
            }
        },
        getEventsInHour(hour, date) {
            if (!date) return []
            const dateStr = this.formatDate(date)
            const dayEvents = this.getDateEvents(dateStr)

            return dayEvents.filter(event => {
                if (!event.startTime || !event.endTime) return false

                const startHour = parseInt(event.startTime.slice(11, 13))
                const endHour = parseInt(event.endTime.slice(11, 13))
                const endMin = parseInt(event.endTime.slice(14, 16))

                // 检查该小时是否在演出时间范围内
                if (startHour <= endHour) {
                    return hour >= startHour && (hour < endHour || (hour === endHour && endMin > 0))
                } else {
                    // 跨夜演出
                    return hour >= startHour || hour < endHour
                }
            })
        },
        formatEventTime(event) {
            const start = event.startTime ? event.startTime.slice(11, 16) : ''
            const end = event.endTime ? event.endTime.slice(11, 16) : ''
            return `${start} - ${end}`
        },
        // 打开设置开放时间弹窗
        openHoursModal() {
            // 从场地数据加载现有开放时间
            if (this.calendarData && this.calendarData.openingHours) {
                this.calendarData.openingHours.forEach(item => {
                    const idx = item.dayOfWeek - 1
                    if (idx >= 0 && idx < 7) {
                        this.weeklyHours[idx] = {
                            dayOfWeek: item.dayOfWeek,
                            isClosed: item.isClosed || false,
                            openTime: item.openTime || '09:00',
                            closeTime: item.closeTime || '22:00'
                        }
                    }
                })
            }
            this.showHoursModal = true
        },
        toggleDayClosed(idx, e) {
            try {
                // 防御：确保 idx 有效
                if (typeof idx !== 'number' || idx < 0 || idx >= this.weeklyHours.length) {
                    console.warn('Invalid idx:', idx)
                    return
                }

                // 阻止事件冒泡，防止触发overlay关闭
                if (e && e.stopPropagation) {
                    e.stopPropagation()
                }

                // 从 event.detail.value 获取 switch 的新状态
                const newValue = e && e.detail && typeof e.detail.value !== 'undefined' ? e.detail.value : !this.weeklyHours[idx].isClosed

                // 使用 $set 确保响应式更新（uni-app/Vue2）
                this.$set(this.weeklyHours[idx], 'isClosed', newValue)

                console.log(`Day ${idx + 1} (${['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx]}) isClosed changed to:`, newValue)
            } catch (err) {
                console.error('toggleDayClosed error', err)
            }
        },
        onOpenTimeChange(idx, e) {
            this.weeklyHours[idx].openTime = e.detail.value
        },
        onCloseTimeChange(idx, e) {
            this.weeklyHours[idx].closeTime = e.detail.value
        },
        async submitOpeningHours() {
            if (this.savingHours) return
            this.savingHours = true

            try {
                // 构建提交数据
                const toLocalTime = (t) => {
                    if (!t) return null
                    const parts = String(t).split(':')
                    if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`
                    if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`
                    // 如果已有秒则只取前3段
                    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`
                }

                const dtoList = this.weeklyHours.map(day => {
                    const dto = {
                        dayOfWeek: day.dayOfWeek,
                        isClosed: !!day.isClosed
                    }
                    if (!day.isClosed) {
                        const ot = toLocalTime(day.openTime)
                        const ct = toLocalTime(day.closeTime)
                        if (ot) dto.openTime = ot
                        if (ct) dto.closeTime = ct
                    }
                    return dto
                })

                const res = await api.request({
                    url: `/api/venues/${this.venueId}/hours`,
                    method: 'POST',
                    data: dtoList
                })

                if (res && res.success) {
                    uni.showToast({ title: '设置成功', icon: 'success' })
                    this.showHoursModal = false
                    // 重新加载日历数据并刷新场地详情以保证页面一致
                    this.fetchCalendarData()
                    this.fetchVenueDetail()
                } else {
                    uni.showToast({ title: res?.message || '设置失败', icon: 'none' })
                }
            } catch (err) {
                console.error('设置开放时间失败:', err)
                uni.showToast({ title: '网络错误', icon: 'none' })
            } finally {
                this.savingHours = false
            }
        },
        onHoursOverlayTap(e) {
            try {
                // 仅当点击目标等于当前容器时才关闭（避免子元素点击导致关闭）
                if (e && e.target && e.currentTarget && e.target === e.currentTarget) {
                    this.showHoursModal = false
                }
            } catch (err) {
                // 回退行为：如果无法判断则不关闭，避免误关闭
                console.warn('overlay tap判断失败，忽略关闭', err)
            }
        },
        // 打开屏蔽日期弹窗
        // 打开屏蔽日期弹窗
        // 支持传入单个 Date 或多个 Date（数组）
        openBlockModal(dateOrDates) {
            this.blockReason = ''
            if (Array.isArray(dateOrDates)) {
                this.selectedBlockDates = dateOrDates.map(d => new Date(d))
                this.blockDate = null
            } else if (dateOrDates) {
                this.blockDate = new Date(dateOrDates)
                this.selectedBlockDates = []
            } else {
                this.blockDate = null
                this.selectedBlockDates = []
            }
            this.showBlockModal = true
        },
        formatBlockDate(date) {
            if (!date) return ''
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}年${month}月${day}日`
        }
    }
}
</script>

<style scoped>
.page {
    min-height: 100vh;
    background-color: #f6f2ee;
    padding-bottom: 40rpx;
}

.loading-state,
.error-state {
    text-align: center;
    padding: 200rpx 0;
    font-size: 28rpx;
    color: #94a3b8;
}

.content {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

/* 照片预览区 */
.photo-section {
    position: relative;
    width: 100%;
    height: 500rpx;
    background: #e2e8f0;
}

.photo-swiper {
    width: 100%;
    height: 100%;
}

.photo-image {
    width: 100%;
    height: 100%;
}

.photo-count {
    position: absolute;
    bottom: 24rpx;
    right: 24rpx;
    padding: 8rpx 16rpx;
    background: rgba(0, 0, 0, 0.6);
    color: #ffffff;
    font-size: 22rpx;
    border-radius: 999rpx;
}

/* 卡片通用样式 */
.card {
    margin: 0 32rpx;
    padding: 32rpx;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    box-shadow: 0 12rpx 24rpx rgba(15, 23, 42, 0.08);
}

.card-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 24rpx;
}

/* 基本信息卡片 */
.venue-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 12rpx;
}

.venue-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #0f172a;
    line-height: 48rpx;
    flex: 1;
    min-width: 0;
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 0 14rpx;
    height: 48rpx;
    border-radius: 10rpx;
    font-size: 20rpx;
    line-height: 1;
    flex-shrink: 0;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

.status-badge.status-1 {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #065f46;
    border: 1rpx solid #6ee7b7;
}

.status-badge.status-0 {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border: 1rpx solid #fbbf24;
}

.status-badge.status-2 {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    color: #991b1b;
    border: 1rpx solid #fca5a5;
}

/* status-icon removed: icons replaced by text-only status */

.status-text {
    font-size: 22rpx;
    font-weight: 600;
    line-height: 1;
}

.venue-actions {
    display: flex;
    align-items: center;
    gap: 10rpx;
    flex-wrap: wrap;
    margin-bottom: 16rpx;
}

/* 统一的操作按钮样式 */
.action-btn {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 10rpx 14rpx;
    border-radius: 10rpx;
    font-size: 20rpx;
    font-weight: 600;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.btn-icon {
    font-size: 20rpx;
    line-height: 1;
}

.btn-text-small {
    font-size: 22rpx;
    font-weight: 600;
    line-height: 1;
}

.status-change-btn {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    color: #ffffff;
    border: 1rpx solid #059669;
}

.edit-btn {
    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
    color: #ffffff;
    border: 1rpx solid #7c3aed;
}

.delete-btn {
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
    color: #ffffff;
    border: 1rpx solid #dc2626;
}

/* 编辑弹窗样式 */
.edit-modal {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx;
}

.edit-container {
    width: 100%;
    max-width: 720rpx;
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
}

.edit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx;
    border-bottom: 1rpx solid #eef2f6;
}

.edit-title {
    font-size: 28rpx;
    font-weight: 700
}

.edit-body {
    max-height: 60vh;
    padding: 20rpx
}

.edit-actions {
    display: flex;
    gap: 12rpx;
    padding: 16rpx;
    justify-content: flex-end
}

.edit-container .form-item {
    margin-bottom: 16rpx
}

.edit-container .form-input,
.edit-container .form-textarea {
    width: 100%;
    padding: 12rpx;
    border-radius: 8rpx;
    border: 1rpx solid #e6edf3
}

.status-text {
    font-size: 22rpx;
    font-weight: 700;
}

.venue-description {
    font-size: 26rpx;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 28rpx;
}

.info-grid {
    display: flex;
    gap: 24rpx;
    padding: 24rpx 0;
    border-top: 1rpx solid #e2e8f0;
    border-bottom: 1rpx solid #e2e8f0;
    margin-bottom: 24rpx;
}

.info-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.info-label {
    font-size: 22rpx;
    color: #94a3b8;
}

.info-value {
    font-size: 26rpx;
    color: #0f172a;
    font-weight: 600;
}

.info-value.today-open {
    color: #15803d;
    font-weight: 700;
}

.info-value.today-closed {
    color: #94a3b8;
}

.info-value.today-maintain {
    color: #b45309;
    font-weight: 700;
}

.info-value.today-disabled {
    color: #dc2626;
    font-weight: 700;
}

.address-section {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    padding: 16rpx 20rpx;
    background: rgba(37, 99, 235, 0.05);
    border-radius: 12rpx;
}

.address-icon {
    font-size: 28rpx;
    line-height: 1.5;
}

.address-text {
    flex: 1;
    font-size: 24rpx;
    color: #475569;
    line-height: 1.5;
}

/* 设备信息卡片 - 紧凑布局 */
.equipment-card {
    padding: 24rpx 32rpx;
}

.equipment-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
}

.equipment-item {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 10rpx 16rpx;
    background: #f8fafc;
    border-radius: 8rpx;
    border: 1rpx solid #e2e8f0;
}

.equipment-key {
    font-size: 20rpx;
    color: #64748b;
    font-weight: 500;
}

.equipment-value {
    font-size: 20rpx;
    color: #0f172a;
    font-weight: 600;
}

/* 管理员卡片 */
.manager-info {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.manager-avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 16rpx;
    background: #e2e8f0;
}

.manager-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.manager-name {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
}

.manager-role {
    font-size: 22rpx;
    color: #64748b;
}

.manager-contact {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-top: 4rpx;
    padding: 8rpx 12rpx;
    background: rgba(37, 99, 235, 0.08);
    border-radius: 8rpx;
    width: fit-content;
}

.contact-icon {
    font-size: 20rpx;
}

.contact-text {
    font-size: 22rpx;
    color: #2563eb;
    font-weight: 500;
}

/* 日历区域 - 重点功能 */
.calendar-card.main-feature {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 243, 255, 0.95) 100%);
    border: 2rpx solid rgba(79, 70, 229, 0.15);
    box-shadow: 0 16rpx 32rpx rgba(79, 70, 229, 0.12);
}

.calendar-header-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    flex-wrap: wrap;
    gap: 16rpx;
}

.calendar-title {
    display: flex;
    align-items: center;
    flex: 1;
}

.calendar-title-text {
    font-size: 32rpx;
    font-weight: 600;
}

.calendar-loading {
    text-align: center;
    padding: 60rpx 0;
    color: #94a3b8;
    font-size: 24rpx;
}

.calendar-container {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20rpx;
}

.month-switch {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(79, 70, 229, 0.1);
    border-radius: 12rpx;
}

.switch-icon {
    font-size: 28rpx;
    color: #4f46e5;
    font-weight: 700;
}

.current-month {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
}

.weekday-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4rpx;
    padding: 12rpx 0;
    border-bottom: 2rpx solid rgba(79, 70, 229, 0.1);
}

.weekday-label {
    text-align: center;
    font-size: 22rpx;
    color: #64748b;
    font-weight: 600;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8rpx;
}

.day-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border-radius: 12rpx;
    border: 1rpx solid #e2e8f0;
    position: relative;
}

.day-cell.blank {
    background: transparent;
    border: none;
}

.day-cell.today {
    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
    border-color: #4f46e5;
    box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.3);
}

.day-cell.today .day-number {
    color: #ffffff;
    font-weight: 700;
}

.day-cell.blocked {
    background: #fee;
    border-color: #fca5a5;
}

.day-cell.blocked .day-number {
    color: #dc2626;
}

.day-cell.closed {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    border-width: 2rpx;
}

.day-cell.closed .day-number {
    color: #d97706;
    font-weight: 600;
}

.day-cell.closed .day-label {
    color: #f59e0b;
    font-weight: 600;
}

.day-cell.venue-maintenance {
    background: linear-gradient(135deg, #fef3c7 0%, #fde047 100%);
    border-color: #eab308;
    border-width: 2rpx;
}

.day-cell.venue-maintenance .day-number {
    color: #ca8a04;
    font-weight: 700;
}

.day-cell.venue-maintenance .day-label {
    color: #ca8a04;
    font-weight: 700;
}

.day-cell.venue-disabled {
    background: linear-gradient(135deg, #fecaca 0%, #f87171 100%);
    border-color: #ef4444;
    border-width: 2rpx;
}

.day-cell.venue-disabled .day-number {
    color: #dc2626;
    font-weight: 700;
}

.day-cell.venue-disabled .day-label {
    color: #dc2626;
    font-weight: 700;
}

.day-cell.has-events {
    border-color: #a78bfa;
    border-width: 2rpx;
}

.day-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    width: 100%;
    height: 100%;
}

.day-number {
    font-size: 24rpx;
    color: #0f172a;
    font-weight: 600;
}

.day-label {
    font-size: 18rpx;
    color: #64748b;
}

.event-dots {
    display: flex;
    gap: 4rpx;
    background: #a78bfa;
}

/* 多日选择高亮样式 */
.day-cell.multi-selected {
    background: #fff1f2;
    border-color: #fb7185;
    box-shadow: 0 2rpx 8rpx rgba(251, 113, 133, 0.08);
}

.day-cell.multi-selected .day-number {
    color: #b91c1c;
    font-weight: 800;
}

.day-cell.multi-selected .day-label {
    color: #b91c1c;
}

.selection-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10rpx 16rpx;
    background: #fff1f2;
    border: 1rpx solid #fb7185;
    border-radius: 12rpx;
    margin: 0 20rpx;
}

.selection-text {
    color: #b91c1c;
    font-weight: 700;
}

.event-dot {
    width: 8rpx;
    height: 8rpx;
    background: #8b5cf6;
    border-radius: 50%;
}

.day-cell.today .event-dot {
    background: #ffffff;
}

.day-cell.venue-maintenance .event-dot {
    background: #854d0e;
}

.day-cell.venue-disabled .event-dot {
    background: #7f1d1d;
}

.calendar-legend {
    display: flex;
    justify-content: space-around;
    padding: 20rpx 0 10rpx;
    border-top: 2rpx dashed rgba(79, 70, 229, 0.1);
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
}

.legend-dot {
    width: 32rpx;
    height: 32rpx;
    border-radius: 8rpx;
    border: 1rpx solid #e2e8f0;
}

.legend-dot.today-dot {
    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
    border-color: #4f46e5;
}

.legend-dot.event-dot-sample {
    background: #ffffff;
    border-color: #a78bfa;
    border-width: 2rpx;
    position: relative;
}

.legend-dot.event-dot-sample::after {
    content: '';
    position: absolute;
    bottom: 6rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    background: #8b5cf6;
    border-radius: 50%;
}

.legend-dot.blocked-dot {
    background: #fee;
    border-color: #fca5a5;
}

.legend-dot.closed-dot {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    border-width: 2rpx;
}

.legend-dot.maintenance-dot {
    background: linear-gradient(135deg, #fef3c7 0%, #fde047 100%);
    border-color: #eab308;
    border-width: 2rpx;
}

.legend-dot.disabled-dot {
    background: linear-gradient(135deg, #fecaca 0%, #f87171 100%);
    border-color: #ef4444;
    border-width: 2rpx;
}

.legend-text {
    font-size: 20rpx;
    color: #64748b;
}

/* 时间表弹窗样式 */
.timeline-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-end;
    z-index: 9999;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.timeline-container {
    width: 100%;
    max-height: 85vh;
    background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
    border-radius: 32rpx 32rpx 0 0;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
    box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.15);
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }

    to {
        transform: translateY(0);
    }
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx 32rpx 24rpx;
    border-bottom: 2rpx solid #e5e7eb;
    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
    border-radius: 32rpx 32rpx 0 0;
}

.timeline-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #ffffff;
}

.close-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    backdrop-filter: blur(10rpx);
}

.close-icon {
    font-size: 32rpx;
    color: #ffffff;
    font-weight: 300;
}

.timeline-date-switcher {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
    border-bottom: 2rpx solid #e5e7eb;
}

.date-switch-btn {
    padding: 12rpx 20rpx;
    background: rgba(79, 70, 229, 0.1);
    border-radius: 12rpx;
    min-width: 140rpx;
}

.switch-text {
    font-size: 24rpx;
    color: #4f46e5;
    font-weight: 600;
}

.current-date-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
}

.date-text {
    font-size: 28rpx;
    font-weight: 700;
    color: #0f172a;
}

.weekday-text {
    font-size: 22rpx;
    color: #64748b;
}

.timeline-scroll {
    flex: 1;
    overflow-y: auto;
}

.timeline-wrapper {
    position: relative;
    padding: 0 24rpx 24rpx;
}

.timeline-content {
    position: relative;
}

.events-layer {
    position: absolute;
    top: 0;
    left: 124rpx;
    right: 24rpx;
    pointer-events: none;
    z-index: 10;
}

.hour-block {
    display: flex;
    height: 120rpx;
    border-bottom: 1rpx solid #e5e7eb;
    position: relative;
    transition: background-color 0.2s;
}

.hour-block:hover {
    background: rgba(79, 70, 229, 0.02);
}

.hour-block.out-of-hours {
    background: repeating-linear-gradient(45deg,
            #f9fafb,
            #f9fafb 10rpx,
            #f3f4f6 10rpx,
            #f3f4f6 20rpx);
}

.hour-label-section {
    width: 100rpx;
    padding: 16rpx 0;
    display: flex;
    align-items: flex-start;
}

.hour-label {
    font-size: 24rpx;
    color: #6b7280;
    font-weight: 600;
    font-family: 'Courier New', monospace;
}

.hour-content {
    flex: 1;
    position: relative;
    min-height: 100rpx;
    padding: 8rpx 0;
}

.event-block-full {
    position: absolute;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    border-radius: 16rpx;
    padding: 16rpx 20rpx;
    box-shadow: 0 6rpx 20rpx rgba(139, 92, 246, 0.4);
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    overflow: hidden;
    border: 3rpx solid rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10rpx);
    pointer-events: auto;
    min-height: 100rpx;
}

.event-block-full::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6rpx;
    height: 100%;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 16rpx 0 0 16rpx;
}

.event-name {
    font-size: 28rpx;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.4;
    margin-bottom: 4rpx;
}

.event-time {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    font-family: 'Courier New', monospace;
    background: rgba(255, 255, 255, 0.15);
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    width: fit-content;
}

.event-organizer {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 4rpx;
}

.closed-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2rpx);
}

.closed-text {
    font-size: 22rpx;
    color: #9ca3af;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.8);
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    border: 1rpx dashed #d1d5db;
}

.timeline-footer {
    padding: 20rpx 32rpx;
    border-top: 2rpx solid #e5e7eb;
    background: #ffffff;
}

.footer-legend {
    display: flex;
    justify-content: center;
    gap: 40rpx;
}

.legend-item-small {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.legend-color {
    width: 40rpx;
    height: 28rpx;
    border-radius: 6rpx;
}

.legend-color.event-color {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.3);
}

.legend-color.closed-color {
    background: repeating-linear-gradient(45deg,
            #f9fafb,
            #f9fafb 6rpx,
            #f3f4f6 6rpx,
            #f3f4f6 12rpx);
    border: 1rpx solid #e5e7eb;
}

.legend-label {
    font-size: 22rpx;
    color: #6b7280;
}

/* 全天屏蔽覆盖层 */
.blocked-day-overlay {
    min-height: 800rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 40rpx;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%);
    position: relative;
    overflow: hidden;
}

.blocked-day-overlay::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: repeating-linear-gradient(45deg,
            transparent,
            transparent 40rpx,
            rgba(220, 38, 38, 0.05) 40rpx,
            rgba(220, 38, 38, 0.05) 80rpx);
    z-index: 0;
}

.blocked-icon {
    font-size: 120rpx;
    margin-bottom: 24rpx;
    animation: pulseBlock 2s ease-in-out infinite;
    z-index: 1;
}

@keyframes pulseBlock {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }
}

.blocked-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #dc2626;
    margin-bottom: 16rpx;
    z-index: 1;
}

.blocked-reason {
    font-size: 28rpx;
    color: #991b1b;
    text-align: center;
    line-height: 1.6;
    padding: 20rpx 32rpx;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 16rpx;
    border: 2rpx solid #fca5a5;
    margin-bottom: 24rpx;
    max-width: 80%;
    box-shadow: 0 4rpx 16rpx rgba(220, 38, 38, 0.15);
    z-index: 1;
}

.blocked-hint {
    font-size: 22rpx;
    color: #ef4444;
    background: rgba(255, 255, 255, 0.7);
    padding: 12rpx 24rpx;
    border-radius: 999rpx;
    border: 1rpx solid #fca5a5;
    z-index: 1;
}

.legend-color.blocked-color {
    background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
    border: 2rpx solid #fca5a5;
    position: relative;
}

.legend-color.blocked-color::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(45deg,
            transparent,
            transparent 6rpx,
            rgba(220, 38, 38, 0.15) 6rpx,
            rgba(220, 38, 38, 0.15) 12rpx);
}

/* 休息日覆盖层 */
.closed-day-overlay {
    min-height: 800rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 40rpx;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
    position: relative;
    overflow: hidden;
}

.closed-day-overlay::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: repeating-linear-gradient(45deg,
            transparent,
            transparent 40rpx,
            rgba(245, 158, 11, 0.08) 40rpx,
            rgba(245, 158, 11, 0.08) 80rpx);
    z-index: 0;
}

.closed-icon {
    font-size: 120rpx;
    margin-bottom: 24rpx;
    animation: pulseClosed 2s ease-in-out infinite;
    z-index: 1;
}

@keyframes pulseClosed {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }
}

.closed-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #d97706;
    margin-bottom: 16rpx;
    z-index: 1;
}

.closed-desc {
    font-size: 28rpx;
    color: #92400e;
    text-align: center;
    line-height: 1.6;
    padding: 20rpx 32rpx;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 16rpx;
    border: 2rpx solid #fbbf24;
    margin-bottom: 24rpx;
    max-width: 80%;
    box-shadow: 0 4rpx 16rpx rgba(245, 158, 11, 0.2);
    z-index: 1;
}

.closed-hint {
    font-size: 22rpx;
    color: #d97706;
    background: rgba(255, 255, 255, 0.7);
    padding: 12rpx 24rpx;
    border-radius: 999rpx;
    border: 1rpx solid #fbbf24;
    z-index: 1;
}

/* 场馆状态覆盖层 */
.venue-status-overlay {
    min-height: 800rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 40rpx;
    position: relative;
    overflow: hidden;
}

.venue-status-overlay::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    z-index: 0;
}

.maintenance-overlay {
    background: linear-gradient(135deg, #fef3c7 0%, #fde047 50%, #facc15 100%);
}

.maintenance-overlay::before {
    background: repeating-linear-gradient(45deg,
            transparent,
            transparent 40rpx,
            rgba(234, 179, 8, 0.1) 40rpx,
            rgba(234, 179, 8, 0.1) 80rpx);
}

.disabled-overlay {
    background: linear-gradient(135deg, #fee2e2 0%, #fca5a5 50%, #f87171 100%);
}

.disabled-overlay::before {
    background: repeating-linear-gradient(45deg,
            transparent,
            transparent 40rpx,
            rgba(239, 68, 68, 0.1) 40rpx,
            rgba(239, 68, 68, 0.1) 80rpx);
}

.status-icon {
    font-size: 120rpx;
    margin-bottom: 24rpx;
    animation: pulseStatus 2s ease-in-out infinite;
    z-index: 1;
}

@keyframes pulseStatus {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.1);
        opacity: 0.85;
    }
}

.status-title {
    font-size: 40rpx;
    font-weight: 700;
    margin-bottom: 16rpx;
    z-index: 1;
}

.maintenance-overlay .status-title {
    color: #ca8a04;
}

.disabled-overlay .status-title {
    color: #dc2626;
}

.status-desc {
    font-size: 28rpx;
    text-align: center;
    line-height: 1.6;
    padding: 20rpx 32rpx;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 16rpx;
    margin-bottom: 24rpx;
    max-width: 80%;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
    z-index: 1;
}

.maintenance-overlay .status-desc {
    color: #854d0e;
    border: 2rpx solid #facc15;
}

.disabled-overlay .status-desc {
    color: #991b1b;
    border: 2rpx solid #fca5a5;
}

.status-hint {
    font-size: 22rpx;
    background: rgba(255, 255, 255, 0.7);
    padding: 12rpx 24rpx;
    border-radius: 999rpx;
    z-index: 1;
}

.maintenance-overlay .status-hint {
    color: #ca8a04;
    border: 1rpx solid #facc15;
}

.disabled-overlay .status-hint {
    color: #dc2626;
    border: 1rpx solid #fca5a5;
}

/* 日历提示 */
.calendar-hint {
    font-size: 22rpx;
    color: #94a3b8;
    margin-left: 8rpx;
}

/* 开放时间管理按钮 */
.hours-manage-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    padding: 16rpx 28rpx;
    border-radius: 50rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;
    box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.35);
    transition: all 0.3s ease;
}

.hours-btn-icon {
    font-size: 28rpx;
}

.hours-btn-text {
    font-size: 26rpx;
    font-weight: 600;
}

/* 开放时间弹窗 */
.hours-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-end;
    z-index: 9999;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.hours-container {
    width: 100%;
    max-height: 85vh;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }

    to {
        transform: translateY(0);
    }
}

.hours-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40rpx 32rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hours-header-content {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.hours-icon {
    font-size: 48rpx;
}

.hours-header-text {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
}

.hours-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #fff;
}

.hours-subtitle {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.85);
}

.hours-close-btn {
    width: 56rpx;
    height: 56rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-icon {
    font-size: 32rpx;
    color: #fff;
    font-weight: 600;
}

.hours-body {
    max-height: 55vh;
    overflow-y: scroll;
    padding: 24rpx 24rpx 32rpx;
    background: #f8f9fb;
}

.day-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 28rpx 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
}

.day-card.day-closed {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 2rpx solid #fca5a5;
}

.day-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.day-info {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.day-name {
    font-size: 32rpx;
    font-weight: 600;
    color: #1e293b;
}

.closed-badge {
    background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
    color: #fff;
    font-size: 20rpx;
    padding: 6rpx 16rpx;
    border-radius: 999rpx;
    font-weight: 600;
}

.day-switch {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.switch-label {
    font-size: 26rpx;
    color: #64748b;
    font-weight: 500;
}

.day-card-body {
    padding-top: 20rpx;
    border-top: 2rpx solid #f1f5f9;
}

.time-picker-group {
    display: flex;
    gap: 24rpx;
}

.picker-item {
    flex: 1;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16rpx;
    padding: 20rpx 16rpx;
    border: 2rpx solid #e2e8f0;
}

.picker-label {
    font-size: 24rpx;
    color: #64748b;
    margin-bottom: 12rpx;
    display: block;
}

.picker-value {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 16rpx;
    background: #fff;
    border-radius: 12rpx;
    border: 2rpx solid #cbd5e1;
}

.time-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #4f46e5;
}

.picker-arrow {
    font-size: 36rpx;
    color: #94a3b8;
    transform: rotate(90deg);
}

.time-divider {
    width: 2rpx;
    height: 80rpx;
    background: linear-gradient(to bottom, transparent, #cbd5e1, transparent);
    margin: 20rpx 0;
}

.hours-footer {
    display: flex;
    gap: 16rpx;
    padding: 24rpx 32rpx;
    background: #fff;
    border-top: 2rpx solid #f1f5f9;
    box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.footer-btn {
    flex: 1;
    padding: 28rpx;
    border-radius: 16rpx;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    transition: all 0.3s ease;
}

.cancel-btn {
    background: #f1f5f9;
    color: #64748b;
}

.submit-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.4);
}

.btn-loading {
    opacity: 0.7;
}

.btn-text {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

/* 屏蔽日期弹窗 */
.block-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.block-container {
    width: 85%;
    background: #fff;
    border-radius: 24rpx;
    overflow: hidden;
}

.block-header {
    background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
    color: #fff;
    padding: 36rpx 32rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.block-header-left {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.block-subtitle {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.9);
}

.block-title {
    font-size: 34rpx;
    font-weight: 600;
}

.block-close {
    font-size: 30rpx;
    padding: 8rpx;
}

.block-body {
    padding: 32rpx;
}

.block-date-display {
    background: #fef2f2;
    border: 2rpx solid #fca5a5;
    border-radius: 12rpx;
    padding: 20rpx;
    text-align: center;
    margin-bottom: 24rpx;
}

.block-date-label {
    font-size: 24rpx;
    color: #991b1b;
    margin-bottom: 8rpx;
}

.block-date-value {
    font-size: 32rpx;
    font-weight: 600;
    color: #dc2626;
}

.block-reason-label {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 12rpx;
}

.block-reason-input {
    background: #f9f9f9;
    border: 1rpx solid #e0e0e0;
    border-radius: 12rpx;
    padding: 16rpx;
    font-size: 28rpx;
    min-height: 130rpx;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow: auto;
    resize: none;
}

.block-warning {
    background: #fef3c7;
    border: 1rpx solid #fbbf24;
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin-top: 24rpx;
    display: flex;
    align-items: center;
}

.warning-icon {
    font-size: 32rpx;
    margin-right: 12rpx;
}

.warning-text {
    flex: 1;
    font-size: 24rpx;
    color: #92400e;
    line-height: 1.5;
}

.block-footer {
    display: flex;
    gap: 16rpx;
    padding: 24rpx 20rpx;
    border-top: 1rpx solid #f0f0f0;
}

.submit-block-btn {
    flex: 1;
    background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
    color: #fff;
    padding: 20rpx 0;
    border-radius: 12rpx;
    text-align: center;
    font-size: 30rpx;
    font-weight: 700;
}

.submit-block-btn.disabled {
    opacity: 0.6;
}
</style>
