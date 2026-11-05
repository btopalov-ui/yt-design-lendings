/* ЧП‑2026 «Больше впечатлений в подарок» — поведение статической посадочной.
   Без зависимостей. Вся разметка уже в HTML: скрипт только переключает состояния. */
;(() => {
  const doc = document.documentElement
  doc.classList.add('bf-js')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))

  const plural = (n, [one, few, many]) => {
    const m = n % 10
    const h = n % 100
    if (m === 1 && h !== 11) return one
    if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return few
    return many
  }

  /* ─── Таймер до конца акции; после дедлайна — состояние «акция завершилась» ─── */
  const deadline = new Date(window.BF_DEADLINE).getTime()
  const tick = () => {
    let s = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
    const ended = s === 0
    const d = Math.floor(s / 86400)
    s %= 86400
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const text = `${d} ${plural(d, ['день', 'дня', 'дней'])} ${String(h).padStart(2, '0')} ч ${String(m).padStart(2, '0')} мин`
    $$('[data-countdown]').forEach((el) => (el.textContent = text))
    $$('[data-countdown-chip], [data-countdown-line]').forEach((el) => (el.hidden = ended))
    const title = $('[data-final-title]')
    if (ended && title) title.textContent = 'Акция завершилась — авторские туры остаются'
    return ended
  }
  if (!tick()) setInterval(tick, 30000)

  /* ─── Появление блоков при прокрутке ─── */
  const rv = $$('.bf-rv')
  if (reduced || !('IntersectionObserver' in window)) {
    rv.forEach((el) => el.classList.add('is-in'))
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    rv.forEach((el) => {
      const sib = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.classList.contains('bf-rv')) : []
      el.style.transitionDelay = `${Math.min(Math.max(0, sib.indexOf(el)), 6) * 80}ms`
      io.observe(el)
    })
  }

  /* ─── Переход к каталогу ─── */
  const toCatalog = () => $('#bf-catalog')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  $$('[data-to-catalog]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault()
      toCatalog()
    }),
  )

  /* ─── Карусель главного экрана ─── */
  const hero = $('[data-hero]')
  if (hero) {
    const slides = JSON.parse($('#bf-hero-data').textContent)
    const layers = $$('.bf-hero__layer', hero)
    const gifts = $$('.bf-hero__gift', hero)
    const segs = $$('.bf-hero__segs button', hero)
    const info = $('[data-hero-info]', hero)
    const stack = $('[data-hero-stack]', hero)
    const count = $('[data-hero-count]', hero)
    const DURATION = 7000
    hero.style.setProperty('--dur', `${DURATION / 1000}s`)
    let current = 0
    let timer = null
    // Пауза из независимых источников: наведение на подпись, фокус внутри, скрытая вкладка
    const pauses = { hover: false, focus: false, hidden: document.hidden }
    const paused = () => pauses.hover || pauses.focus || pauses.hidden

    const restart = () => {
      clearTimeout(timer)
      hero.classList.toggle('is-paused', paused())
      if (reduced || paused()) return
      timer = setTimeout(() => go(current + 1), DURATION)
    }
    const pause = (src, v) => {
      if (pauses[src] === v) return
      pauses[src] = v
      if (paused()) {
        clearTimeout(timer)
        hero.classList.add('is-paused')
      } else restart()
    }

    const renderStack = () => {
      stack.innerHTML = ''
      ;[1, 2, 3].forEach((o) => {
        const k = (current + o) % slides.length
        const s = slides[k]
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'bf-mini'
        b.setAttribute('aria-label', `Показать: ${s.title}`)
        b.innerHTML = `<img src="./assets/promo/${s.img}.webp" alt=""><small></small><b></b>`
        b.querySelector('small').textContent = s.place
        b.querySelector('b').textContent = s.title
        b.addEventListener('click', () => go(k))
        stack.appendChild(b)
      })
    }

    const renderInfo = () => {
      const s = slides[current]
      $('[data-f="place"]', info).textContent = `${s.place} · ${s.type}`
      $('[data-f="unique"]', info).textContent = s.unique
      $('[data-f="when"]', info).textContent = s.when
      $('[data-f="href"]', info).href = s.href
    }

    const go = (i) => {
      const next = (i + slides.length) % slides.length
      if (next !== current) {
        layers[current].classList.remove('is-on')
        gifts[current].classList.remove('is-on')
        gifts[current].setAttribute('aria-hidden', 'true')
        current = next
        layers[current].classList.add('is-on')
        gifts[current].classList.add('is-on')
        gifts[current].removeAttribute('aria-hidden')
        // подпись: короткое исчезновение и появление с новым текстом
        if (reduced) renderInfo()
        else {
          info.classList.add('is-swap')
          setTimeout(() => {
            renderInfo()
            info.classList.remove('is-swap')
          }, 350)
        }
        renderStack()
        count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`
      }
      // сегменты: прошедшие залиты, текущий заново запускает анимацию заполнения
      segs.forEach((b, k) => {
        b.classList.toggle('is-done', k < current)
        b.classList.remove('is-on')
      })
      void segs[current].offsetWidth
      segs[current].classList.add('is-on')
      restart()
    }

    $('[data-hero-prev]', hero).addEventListener('click', () => go(current - 1))
    $('[data-hero-next]', hero).addEventListener('click', () => go(current + 1))
    segs.forEach((b, k) => b.addEventListener('click', () => go(k)))
    hero.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(current + 1)
      if (e.key === 'ArrowLeft') go(current - 1)
    })
    const bottom = $('[data-hero-bottom]', hero)
    bottom.addEventListener('pointerenter', () => pause('hover', true))
    bottom.addEventListener('pointerleave', () => pause('hover', false))
    hero.addEventListener('focusin', () => pause('focus', true))
    hero.addEventListener('focusout', (e) => {
      if (!hero.contains(e.relatedTarget)) pause('focus', false)
    })
    document.addEventListener('visibilitychange', () => pause('hidden', document.hidden))

    // параллакс за курсором и свайп на телефоне
    if (!reduced) {
      hero.addEventListener('pointermove', (e) => {
        hero.style.setProperty('--px', String(e.clientX / window.innerWidth - 0.5))
        hero.style.setProperty('--py', String(e.clientY / window.innerHeight - 0.5))
      })
    }
    let sx = null
    hero.addEventListener('pointerdown', (e) => (sx = e.clientX))
    hero.addEventListener('pointerup', (e) => {
      if (sx !== null && Math.abs(e.clientX - sx) > 60 && e.pointerType !== 'mouse') go(current + (e.clientX < sx ? 1 : -1))
      sx = null
    })

    renderStack()
    restart()
  }

  /* ─── Подборка: закреплённая лента, которая едет при прокрутке ─── */
  const sel = $('[data-selection]')
  if (sel) {
    const frame = $('.bf-selection__frame', sel)
    const track = $('[data-selection-track]', sel)
    const head = $('.bf-head', sel)
    const mq = window.matchMedia('(min-width: 901px)')
    let pinned = false
    let dist = 0
    let scale = 1
    let ticking = false

    const update = () => {
      ticking = false
      if (!pinned) return
      const top = sel.getBoundingClientRect().top
      const progress = Math.min(1, Math.max(0, -top / Math.max(dist, 1)))
      const x = -progress * dist
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(${scale})`
      const vw = window.innerWidth
      Array.from(track.children).forEach((card) => {
        const center = (card.offsetLeft + card.offsetWidth / 2) * scale + x
        const k = Math.min(1, Math.max(0, 1 - center / vw)) // 0 у правого края → 1 у левого
        card.style.transform = `translateY(${(40 - 50 * k).toFixed(1)}px) rotate(${(4 - 6 * k).toFixed(2)}deg)`
      })
    }
    const unpin = () => {
      pinned = false
      sel.classList.remove('is-pinned')
      sel.style.height = ''
      track.style.transform = ''
      track.style.marginBottom = ''
      Array.from(track.children).forEach((c) => (c.style.transform = ''))
    }
    const measure = () => {
      if (!mq.matches || reduced) return unpin()
      pinned = true
      sel.classList.add('is-pinned')
      track.style.transform = ''
      // Заголовок с лентой должны влезть в экран по высоте. На невысоких экранах (ноутбуки) уменьшаем
      // ленту, чтобы эффект остался; если пришлось бы сжать сильнее 70% — обычная лента без закрепления.
      const headH = track.getBoundingClientRect().top - head.getBoundingClientRect().top
      const trackH = track.offsetHeight
      scale = Math.min(1, (window.innerHeight - headH) / trackH)
      if (scale < 0.7) return unpin()
      // отрицательный отступ снизу компенсирует пустое место после уменьшения ленты
      track.style.marginBottom = `${(-(1 - scale) * trackH).toFixed(1)}px`
      dist = Math.max(0, track.scrollWidth * scale - window.innerWidth + 32)
      sel.style.height = `${window.innerHeight + dist}px`
      update()
    }
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking && pinned) {
          ticking = true
          requestAnimationFrame(update)
        }
      },
      { passive: true },
    )
    window.addEventListener('resize', measure)
    mq.addEventListener('change', measure)
    // высота ленты зависит от картинок — пересчитываем после их загрузки
    window.addEventListener('load', measure)
    measure()
    void frame
  }

  /* ─── Наклон карточек за курсором (каталог и незакреплённая подборка, только мышь) ─── */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    $$('.bf-gift').forEach((card) => {
      card.classList.add('is-tilt')
      card.addEventListener('pointermove', (e) => {
        if (card.closest('.bf-selection.is-pinned')) return
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        card.style.transform = `perspective(900px) rotateY(${(x * 6).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg) translateY(-4px)`
      })
      card.addEventListener('pointerleave', () => {
        if (!card.closest('.bf-selection.is-pinned')) card.style.transform = ''
      })
    })
  }

  /* ─── Каталог: фильтры и «Показать ещё» ─── */
  const catalog = $('[data-catalog]')
  if (catalog) {
    const cards = $$('[data-catalog-grid] .bf-gift', catalog)
    const more = $('[data-more]', catalog)
    const countEl = $('[data-count]', catalog)
    const moreWrap = $('[data-catalog-more]', catalog)
    const empty = $('[data-empty]', catalog)
    const PAGE = 18
    const state = { type: 'all', region: 'all', limit: PAGE }

    const apply = () => {
      const match = cards.filter(
        (c) => (state.type === 'all' || c.dataset.type === state.type) && (state.region === 'all' || c.dataset.region === state.region),
      )
      cards.forEach((c) => (c.hidden = true))
      match.slice(0, state.limit).forEach((c) => (c.hidden = false))
      const shown = Math.min(state.limit, match.length)
      const rest = match.length - shown
      const next = Math.min(PAGE, rest)
      more.hidden = rest <= 0
      more.textContent = `Показать ещё ${next} ${plural(next, ['тур', 'тура', 'туров'])}`
      countEl.textContent = `Показано ${shown} из ${match.length}`
      moreWrap.hidden = match.length === 0
      empty.hidden = match.length !== 0
      $$('[data-filter]', catalog).forEach((g) =>
        $$('button', g).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === state[g.dataset.filter]))),
      )
    }
    const set = (key, value) => {
      state[key] = value
      state.limit = PAGE
      apply()
    }

    $$('[data-filter]', catalog).forEach((g) =>
      g.addEventListener('click', (e) => {
        const b = e.target.closest('button')
        if (b) set(g.dataset.filter, b.dataset.value)
      }),
    )
    more.addEventListener('click', () => {
      state.limit += PAGE
      apply()
    })
    $('[data-reset]', catalog).addEventListener('click', () => {
      state.type = 'all'
      state.region = 'all'
      state.limit = PAGE
      apply()
    })
    // типы подарков ведут в каталог с нужным фильтром
    $$('[data-kind]').forEach((b) =>
      b.addEventListener('click', () => {
        state.type = b.dataset.kind
        state.region = 'all'
        state.limit = PAGE
        apply()
        toCatalog()
      }),
    )
    apply()
  }
})()
