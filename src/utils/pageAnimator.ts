import { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'

let currentIndex = 0
let isAnimating = false
let sections: HTMLElement[] = []
let reducedMotion = false
let navLocked = false
let observer: Observer | null = null
let activeTimeline: gsap.core.Timeline | null = null
let initialized = false

function handleHashChange() {
    goTo(sectionIndexFromHash())
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'PageDown') {
        e.preventDefault()
        goTo(currentIndex + 1)
    } else if (e.key === 'PageUp') {
        e.preventDefault()
        goTo(currentIndex - 1)
    }
}

export function disposePageAnimator() {
    if (!initialized) return

    window.removeEventListener('hashchange', handleHashChange)
    document.removeEventListener('keydown', handleKeyDown)
    observer?.kill()
    observer = null
    activeTimeline?.kill()
    activeTimeline = null
    gsap.killTweensOf(sections)
    initialized = false
    sections = []
    isAnimating = false
    navLocked = false
}

export function lockNavigation(locked: boolean) {
    navLocked = locked
}

function sectionIndexFromHash(): number {
    const id = window.location.hash.replace('#', '')
    if (!id) return 0
    const idx = sections.findIndex((el) => el.id === id)
    return idx >= 0 ? idx : 0
}

function syncHash(index: number) {
    const id = sections[index]?.id
    if (id) {
        window.history.replaceState(null, '', `#${id}`)
    }
}

function dispatchSectionChange(index: number) {
    const id = sections[index]?.id
    window.dispatchEvent(new CustomEvent('section:change', {
        detail: { index, id },
    }))
}

function setActiveSection(index: number) {
    sections.forEach((section, sectionIndex) => {
        section.classList.toggle('is-active', sectionIndex === index)
    })
}

function setEnteringSection(index: number | null) {
    sections.forEach((section, sectionIndex) => {
        section.classList.toggle('is-entering', sectionIndex === index)
    })
}

export function initPageAnimator() {
    if (initialized) return
    initialized = true
    gsap.registerPlugin(Observer)
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sections = gsap.utils.toArray('.snap-section')
    if (!sections.length) {
        initialized = false
        return
    }

    // 初始状态：按 URL hash 定位当前屏，其余隐藏
    currentIndex = sectionIndexFromHash()
    setActiveSection(currentIndex)
    sections.forEach((el) => {
        gsap.set(el, { yPercent: 0, autoAlpha: 0, pointerEvents: 'none' })
    })
    gsap.set(sections[currentIndex], { autoAlpha: 1, zIndex: 1, pointerEvents: 'auto' })

    // 进入页面即把当前屏写入地址栏 hash（如 /studio → /studio#Prologue）
    syncHash(currentIndex)

    // 广播当前屏，供各区块（如 Symphony）按需启停自身动画
    dispatchSectionChange(currentIndex)

    // 首屏入场动画：仅在首页（无 hash 或 #Prologue）播放，且用户未开启减少动画
    // 注意：不动 .logo（深浅切换完全交给 CSS class，避免 gsap 内联 opacity 干扰）
    if (currentIndex === 0 && !reducedMotion) {
        activeTimeline = gsap.timeline()
        activeTimeline.from('.title-text', {
            y: -30, opacity: 0, duration: 1, ease: 'power3.out',
        })
        const hero = sections[0].querySelector('.fullscreen-photo')
        if (hero) {
            activeTimeline.from(
                hero,
                { scale: 1.08, duration: 1.2, ease: 'power3.out' },
                '-=0.5'
            )
        }
    }

    // 支持浏览器前进/后退与手动改 hash
    window.addEventListener('hashchange', handleHashChange)

    observer = Observer.create({
        type: 'wheel,touch',
        wheelSpeed: -1,
        onUp: () => goTo(currentIndex + 1),
        onDown: () => goTo(currentIndex - 1),
        tolerance: 10,
        preventDefault: true,
    })

    // 键盘翻页：PageDown/PageUp（不占用方向键，避免干扰 Tab 焦点移动）
    document.addEventListener('keydown', handleKeyDown)
}

function goTo(index: number) {
    if (navLocked || isAnimating || index < 0 || index >= sections.length || index === currentIndex) return
    isAnimating = true

    const direction = index > currentIndex ? 1 : -1
    const outgoing = sections[currentIndex]
    const incoming = sections[index]
    // 在过渡结束前保留旧区域的 active 状态，避免旧区域仍然可见时就失去自己的
    // font-family，造成明显的字体闪烁。
    setEnteringSection(index)
    currentIndex = index
    syncHash(index)
    dispatchSectionChange(index)

    activeTimeline?.kill()
    const tl = gsap.timeline({
        onComplete: () => {
            gsap.set(outgoing, { autoAlpha: 0, zIndex: 0, pointerEvents: 'none' })
            gsap.set(incoming, { yPercent: 0, zIndex: 1, pointerEvents: 'auto' })
            outgoing.classList.remove('is-active')
            setEnteringSection(null)
            incoming.classList.add('is-active')
            isAnimating = false
            if (activeTimeline === tl) activeTimeline = null
        },
        defaults: { duration: reducedMotion ? 0 : 1.2, ease: 'power4.inOut' },
    })
    activeTimeline = tl

    // incoming 滑入起点 + 置顶
    gsap.set(incoming, { yPercent: 100 * direction, autoAlpha: 1, zIndex: 2, pointerEvents: 'none' })

    // 旧屏滑出，新屏同时滑入（交叠过渡）
    tl.to(outgoing, { yPercent: -100 * direction })
    tl.to(incoming, { yPercent: 0 }, '<')
}
