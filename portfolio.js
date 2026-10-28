'use strict';
// Portfolio interactions: no dependencies; keyboard and reduced-motion friendly.
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const originalSite = 'https://simhyeoncheol.github.io/';
const cards = $$('.project-card');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smooth = prefersReducedMotion ? 'auto' : 'smooth';

// Preserve the original profile photograph and screenshot paths. The remote original
// is used only as a fallback when this replacement is opened outside its repository.
function handleOriginalImage(img) {
  img.addEventListener('error', () => {
    if (img.dataset.triedRemote !== 'yes') {
      img.dataset.triedRemote = 'yes';
      const originalPath = img.getAttribute('src');
      if (originalPath && !/^https?:/i.test(originalPath)) {
        img.src = originalSite + originalPath.replace(/^\.\//, '');
        return;
      }
    }
    img.hidden = true;
  });
}
$$('.project-image img, .portrait-back img').forEach(handleOriginalImage);

const menuButton = $('.menu-button');
const mobileNav = $('#mobile-nav');
function closeMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', '메뉴 열기');
  if (mobileNav) mobileNav.hidden = true;
}
menuButton?.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
  mobileNav.hidden = !opening;
});
$$('.mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 870) closeMenu(); });

// Filter image-led projects; a mixed project can appear in multiple categories.
const filters = $$('.project-filters button');
filters.forEach(button => button.addEventListener('click', () => {
  const selected = button.dataset.filter;
  filters.forEach(b => {
    const active = b === button;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  applyFilter(selected);
  moveFilterInk(button);
}));

// 필터 전환: 빠지는 카드는 줄어들며 사라지고, 남는 카드는 새 자리로 미끄러지고(FLIP), 새로 들어오는 카드는 차례로 올라온다.
const matchesFilter = (card, selected) => selected === 'all' || (card.dataset.type || '').split(' ').includes(selected);
let filterRun = 0;
async function applyFilter(selected) {
  const run = ++filterRun;
  if (prefersReducedMotion || !Element.prototype.animate) {
    cards.forEach(card => { card.hidden = !matchesFilter(card, selected); });
    return;
  }
  cards.forEach(card => card.classList.add('is-in'));
  const leaving = cards.filter(card => !card.hidden && !matchesFilter(card, selected));
  await Promise.all(leaving.map(card => card.animate(
    [{opacity:1, transform:'none'}, {opacity:0, transform:'scale(.92) translateY(10px)'}],
    {duration:220, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'}).finished.catch(() => {})));
  if (run !== filterRun) return;
  const before = new Map(cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
  cards.forEach(card => { card.getAnimations().forEach(a => a.cancel()); card.hidden = !matchesFilter(card, selected); });
  let entering = 0;
  cards.filter(card => !card.hidden).forEach(card => {
    const prev = before.get(card), now = card.getBoundingClientRect();
    if (prev) {
      const dx = prev.left - now.left, dy = prev.top - now.top, sx = prev.width / now.width;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(1 - sx) > 1) {
        card.animate([{transformOrigin:'top left', transform:`translate(${dx}px,${dy}px) scale(${sx})`}, {transformOrigin:'top left', transform:'none'}],
          {duration:560, easing:'cubic-bezier(.2,.75,.2,1)'});
      }
    } else {
      card.animate([{opacity:0, transform:'translateY(36px) scale(.96)'}, {opacity:1, transform:'none'}],
        {duration:620, delay:90 * entering++, easing:'cubic-bezier(.2,.75,.2,1)', fill:'backwards'});
    }
  });
}

// 선택된 필터 아래 밑줄이 버튼 사이를 미끄러져 이동한다.
const filterGroup = $('.project-filters');
const filterInk = document.createElement('span');
filterInk.className = 'filter-ink';
filterInk.setAttribute('aria-hidden', 'true');
filterGroup?.appendChild(filterInk);
function moveFilterInk(button) {
  if (!filterGroup || !button) return;
  filterInk.style.width = button.offsetWidth + 'px';
  filterInk.style.transform = `translateX(${button.offsetLeft}px)`;
}
moveFilterInk($('.project-filters button.active'));
window.addEventListener('resize', () => moveFilterInk($('.project-filters button.active')));

// 썸네일 위에서 커서를 따라 기울어지고 빛이 비치며, 커서 옆에 이동 안내가 따라다닌다.
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (canHover && !prefersReducedMotion) {
  const chip = document.createElement('div');
  chip.className = 'cursor-chip';
  chip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(chip);
  document.body.classList.add('has-cursor-chip');
  $$('.project-image').forEach(frame => {
    const isLink = frame.tagName === 'A';
    frame.addEventListener('pointerenter', () => {
      chip.textContent = isLink ? 'VIEW PROJECT ↗' : 'ZOOM ＋';
      chip.classList.add('show');
    });
    frame.addEventListener('pointermove', (event) => {
      const r = frame.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - .5, y = (event.clientY - r.top) / r.height - .5;
      frame.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      frame.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      frame.style.setProperty('--px', (-x * 16).toFixed(1) + 'px');
      frame.style.setProperty('--py', (-y * 12).toFixed(1) + 'px');
      frame.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%');
      frame.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%');
      chip.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    });
    frame.addEventListener('pointerleave', () => {
      chip.classList.remove('show');
      ['--rx','--ry','--px','--py'].forEach(v => frame.style.removeProperty(v));
    });
  });
}
// Keep displayed counts accurate when a project belongs to both App and Web.
filters.forEach(button => {
  const category = button.dataset.filter;
  const count = cards.filter(card => category === 'all' || (card.dataset.type || '').split(' ').includes(category)).length;
  const small = $('small', button);
  if (small) small.textContent = String(count).padStart(2,'0');
});

// Real-world evidence tabs: role=tab/tabpanel with arrow-key navigation.
const skillTabs = $$('.expertise-tab');
function activateSkill(index, focus=false) {
  skillTabs.forEach((tab,i) => {
    const active = i === index;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    if (panel) panel.hidden = !active;
  });
  if (focus) skillTabs[index].focus();
}
skillTabs.forEach((tab,index) => {
  tab.addEventListener('click', () => activateSkill(index));
  tab.addEventListener('keydown', (event) => {
    let target;
    if (['ArrowRight','ArrowDown'].includes(event.key)) target = (index + 1) % skillTabs.length;
    else if (['ArrowLeft','ArrowUp'].includes(event.key)) target = (index + skillTabs.length - 1) % skillTabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = skillTabs.length - 1;
    else return;
    event.preventDefault();
    activateSkill(target, true);
  });
});

// Native screenshots open in a contained lightbox, not a fake mock-up.
const lightbox = $('#lightbox');
const lightboxImage = $('#lightbox-image');
const lightboxTitle = $('#lightbox-title');
let previouslyFocused = null;
function openLightbox(path,title,trigger) {
  if (!lightbox || !lightboxImage) return;
  previouslyFocused = trigger || document.activeElement;
  lightboxImage.hidden = false;
  lightboxImage.dataset.triedRemote = 'no';
  lightboxImage.src = path;
  lightboxImage.alt = `${title} 원본 프로젝트 이미지`;
  lightboxTitle.textContent = title;
  lightbox.hidden = false;
  document.body.classList.add('modal-open');
  $('.lightbox-close')?.focus();
}
function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.hidden = true;
  document.body.classList.remove('modal-open');
  lightboxImage.removeAttribute('src');
  previouslyFocused?.focus?.();
}
lightboxImage?.addEventListener('error', () => {
  if (lightboxImage.dataset.triedRemote !== 'yes') {
    lightboxImage.dataset.triedRemote = 'yes';
    const path = lightboxImage.getAttribute('src');
    if (path && !/^https?:/i.test(path)) {
      lightboxImage.src = originalSite + path;
      return;
    }
  }
  lightboxImage.hidden = true;
  lightboxTitle.textContent += ' — 이미지를 불러오지 못했습니다';
});
$$('[data-lightbox]').forEach(trigger => trigger.addEventListener('click', () => openLightbox(trigger.dataset.lightbox,trigger.dataset.title || 'Project',trigger)));
$$('[data-close-lightbox]').forEach(element => element.addEventListener('click', closeLightbox));

// Cmd/Ctrl+K quick project finder with a small, accessible results list.
const searchOverlay = $('#command-overlay');
const searchInput = $('#command-input');
const searchResults = $('#command-results');
const searchDialog = $('#command-dialog');
const searchItems = [
  ...cards.map((card,index) => ({
    title: $('h3', card)?.textContent.replace('↗','').trim() || `Project ${index+1}`,
    subtitle: (card.dataset.type || '').toUpperCase() + ' / PROJECT',
    words: (card.dataset.keywords || '') + ' ' + (card.textContent || ''),
    selector: '#' + card.id,
    num: String(index+1).padStart(2,'0')
  })),
  {title:'Technical Expertise',subtitle:'STACK / EXPERIENCE',words:'전문성 기술 backend frontend payments mobile 전문성 기술',selector:'#expertise',num:'10'},
  {title:'Work Experience',subtitle:'CAREER',words:'경력 이원헬스케어 더바디채널 experience',selector:'#experience',num:'11'},
  {title:'About & Contact',subtitle:'PROFILE',words:'소개 학력 연락 about contact',selector:'#about',num:'12'}
];
let selectedResult = 0;
let visibleItems = [];
let focusBeforeSearch = null;
function openSearch(trigger) {
  if (!searchOverlay) return;
  closeMenu();
  focusBeforeSearch = trigger || document.activeElement;
  searchOverlay.hidden = false;
  document.body.classList.add('modal-open');
  searchInput.value = '';
  renderSearch();
  searchInput.focus();
}
function closeSearch() {
  if (!searchOverlay || searchOverlay.hidden) return;
  searchOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  focusBeforeSearch?.focus?.();
}
function renderSearch() {
  const query = searchInput.value.toLocaleLowerCase('ko').trim();
  visibleItems = searchItems.filter(item => (item.title + ' ' + item.words + ' ' + item.subtitle).toLocaleLowerCase('ko').includes(query)).slice(0,9);
  selectedResult = 0;
  searchResults.replaceChildren();
  if (!visibleItems.length) {
    const msg = document.createElement('p');
    msg.className = 'command-empty';
    msg.textContent = '검색 결과가 없습니다.';
    searchResults.append(msg);
    return;
  }
  visibleItems.forEach((item,index) => {
    const result = document.createElement('button');
    result.type = 'button';
    result.className = 'command-result' + (index === selectedResult ? ' active' : '');
    result.setAttribute('role','option');
    result.setAttribute('aria-selected',String(index === selectedResult));
    const num = document.createElement('span');num.textContent = item.num;
    const details = document.createElement('div');
    const title = document.createElement('strong');title.textContent = item.title;
    const subtitle = document.createElement('small');subtitle.textContent = item.subtitle;
    details.append(title,subtitle);result.append(num,details);
    result.addEventListener('click', () => navigateResult(index));
    result.addEventListener('mouseenter', () => selectResult(index));
    searchResults.append(result);
  });
}
function selectResult(index) {
  selectedResult = index;
  $$('.command-result', searchResults).forEach((el,i)=>{
    el.classList.toggle('active',i===index);
    el.setAttribute('aria-selected',String(i===index));
  });
  $$('.command-result',searchResults)[index]?.scrollIntoView({block:'nearest'});
}
function navigateResult(index) {
  const entry = visibleItems[index];
  if (!entry) return;
  const target = $(entry.selector);
  if (!target) return;
  // Project search should reveal items hidden by a previously selected filter.
  if (target.classList.contains('project-card') && target.hidden) {
    filters.find(b => b.dataset.filter === 'all')?.click();
  }
  closeSearch();
  target.scrollIntoView({behavior:smooth,block:'start'});
  if (target.classList.contains('project-card')) {
    target.querySelector('a,button')?.focus({preventScroll:true});
  }
}
$$('.search-trigger,[data-open-search]').forEach(trigger => trigger.addEventListener('click', () => openSearch(trigger)));
$$('[data-close-command]').forEach(el => el.addEventListener('click', closeSearch));
searchInput?.addEventListener('input',renderSearch);
searchInput?.addEventListener('keydown',event => {
  if (event.key === 'ArrowDown') {event.preventDefault();selectResult(Math.min(visibleItems.length-1,selectedResult+1));}
  else if (event.key === 'ArrowUp') {event.preventDefault();selectResult(Math.max(0,selectedResult-1));}
  else if (event.key === 'Enter') {event.preventDefault();navigateResult(selectedResult);}
});
document.addEventListener('keydown',event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (searchOverlay?.hidden) openSearch(document.activeElement); else closeSearch();
  }
  if (event.key === 'Escape') {
    if (!searchOverlay?.hidden) closeSearch();
    else if (!lightbox?.hidden) closeLightbox();
    else closeMenu();
  }
  if (event.key === 'Tab' && !searchOverlay?.hidden) {
    const candidates = $$('button:not([disabled]),input:not([disabled])',searchDialog).filter(el=>el.offsetParent!==null);
    if (!candidates.length) return;
    const first=candidates[0], last=candidates[candidates.length-1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  }
  if (event.key === 'Tab' && !lightbox?.hidden) {
    event.preventDefault();$('.lightbox-close')?.focus();
  }
});

// Subtle page progress and current section highlight.
const progressBar = $('.reading-progress span');
let scheduled = false;
function updateProgress() {
  const total = Math.max(1,document.documentElement.scrollHeight - window.innerHeight);
  if (progressBar) progressBar.style.width = Math.min(100,100*window.scrollY/total) + '%';
  scheduled=false;
}
window.addEventListener('scroll',() => {if (!scheduled){scheduled=true;requestAnimationFrame(updateProgress)}},{passive:true});
updateProgress();
if ('IntersectionObserver' in window) {
  const menuLinks = $$('.desktop-nav a');
  const spy = new IntersectionObserver(entries => {
    entries.filter(e=>e.isIntersecting).forEach(e=>menuLinks.forEach(link=>link.classList.toggle('is-current',link.getAttribute('href') === '#'+e.target.id)));
  },{rootMargin:'-23% 0px -66% 0px'});
  ['stack','experience','expertise','projects','about'].forEach(id=>{const section=document.getElementById(id);if(section)spy.observe(section)});
}
$('#year').textContent = new Date().getFullYear();

// mailto는 메일 앱이 없으면 아무 반응이 없으므로, 주소를 복사하고 안내를 띄운다.
const copyToast = $('#copy-toast');
let toastTimer;
function showToast(html) {
  if (!copyToast) return;
  copyToast.innerHTML = html;
  copyToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { copyToast.hidden = true; }, 4000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly',''); area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  }
}
$$('a[href^="mailto:"]').forEach(link => link.addEventListener('click', async (event) => {
  event.preventDefault();
  const href = link.getAttribute('href');
  const address = href.replace(/^mailto:/,'').split('?')[0];
  const copied = await copyText(address);
  showToast(`<span>${copied ? '이메일 주소를 복사했습니다' : '이메일 주소'} · <b>${address}</b></span><a href="${href}">메일 앱으로 열기 ↗</a>`);
}));

// 등장 애니메이션: 첫 화면은 순서대로, 아래 섹션은 스크롤해서 보일 때 차례로 나타난다.
const root = document.documentElement;
function countDownRank(el, from = 99) {
  const to = Number(el.dataset.to);
  const start = performance.now(), duration = 1150;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(from - (from - to) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
if (root.classList.contains('motion')) {
  window.__motionReady = true;
  const heading = $('.hero h1');
  if (heading) {
    let i = 0;
    [...heading.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...node.textContent].forEach(chr => {
          const span = document.createElement('span');
          span.className = 'ch'; span.textContent = chr; span.style.setProperty('--i', i++);
          frag.appendChild(span);
        });
        node.replaceWith(frag);
      } else if (node.classList?.contains('name-dot')) {
        node.classList.add('ch'); node.style.setProperty('--i', i++);
      }
    });
    heading.classList.add('split');
  }
  $$('.rank-num').forEach(el => { el.textContent = '99'; });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('loaded');
    const heroRank = $('.pro-badge .rank-num');
    if (heroRank) setTimeout(() => countDownRank(heroRank), 900);
  }));

  const revealTargets = $$('.section-head, .stack-row, .career, .expertise-layout, .project-card, .about-statement, .about-facts > div, .about-facts > details, .esports-card, .footer-mail');
  const targetSet = new Set(revealTargets);
  revealTargets.forEach(el => {
    const siblings = [...el.parentElement.children].filter(c => targetSet.has(c));
    const index = Math.max(0, siblings.indexOf(el));
    el.style.setProperty('--d', (el.classList.contains('project-card') ? (index % 3) * 110 : Math.min(index, 5) * 90) + 'ms');
    $$('p strong', el).forEach((strong, n) => strong.style.setProperty('--i', n));
  });
  const revealer = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach(entry => {
      entry.target.classList.add('is-in');
      $$('.rank-num', entry.target).forEach(el => setTimeout(() => countDownRank(el), 400));
      revealer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealTargets.forEach(el => revealer.observe(el));
}
