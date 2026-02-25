export const showError = (message) => {
    if (!message) return
    uni.showToast({
        title: message,
        icon: 'none',
        duration: 2000
    })
}

export const showSuccess = (message) => {
    if (!message) return
    uni.showToast({
        title: message,
        icon: 'success',
        duration: 1800
    })
}
