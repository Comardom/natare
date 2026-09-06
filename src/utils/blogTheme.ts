type Theme = 'light' | 'dark'

function currentTheme(): Theme {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function updateControl(control: HTMLElement, theme: Theme) {
    control.setAttribute(
        'aria-label',
        theme === 'dark' ? '切换到浅色模式' : '切换到深色模式',
    )
    control.setAttribute('aria-pressed', String(theme === 'dark'))
}

function updateControls(theme: Theme) {
    document
        .querySelectorAll<HTMLElement>('[data-theme-control="toggle"]')
        .forEach((control) => updateControl(control, theme))
}

function setTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`
    updateControls(theme)
    window.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }))
}

export function initBlogThemeToggle() {
    const controls = document.querySelectorAll<HTMLElement>('[data-theme-control="toggle"]')
    if (!controls.length) return

    controls.forEach((control) => {
        if (control.dataset.themeBound === 'true') return
        control.dataset.themeBound = 'true'

        updateControl(control, currentTheme())
        control.addEventListener('click', () => {
            const nextTheme: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
            setTheme(nextTheme)
        })
    })
}
