// 방문자 수 배지. 브라우저마다 한 번만 센다.
// 주소 뒤에 ?me 를 붙여 한 번 열면 그 브라우저는 집계(배지·Vercel Analytics)에서 빠진다. ?me=off 로 되돌린다.
// pf-me 저장과 Analytics 스크립트 생략은 각 페이지 head 의 인라인 스크립트가 먼저 처리한다.
(function () {
  var ls;
  try { ls = window.localStorage; ls.getItem('x'); } catch (e) { ls = null; }
  var params = new URLSearchParams(location.search);
  if (params.has('me')) {
    params.delete('me');
    var q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  var isMe = ls && ls.getItem('pf-me') === '1';
  var counted = ls && ls.getItem('pf-counted') === '1';
  var shouldCount = ls && !isMe && !counted && !navigator.webdriver;

  fetch('/api/visitors', { method: shouldCount ? 'POST' : 'GET' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || typeof d.count !== 'number') return;
      if (shouldCount) ls.setItem('pf-counted', '1');
      render(d.count);
    })
    .catch(function () {});

  function render(count) {
    var el = document.createElement('span');
    el.className = 'visitor-badge';
    el.title = isMe ? '내 방문은 집계하지 않음' : '방문자 수';
    el.innerHTML = '<span class="visitor-dot" aria-hidden="true"></span>방문 ' + count.toLocaleString('ko-KR') + '명';
    var css = document.createElement('style');
    css.textContent =
      '.visitor-badge{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font:600 12px ui-monospace,SFMono-Regular,Consolas,monospace;color:#5d6570}' +
      '.visitor-dot{width:6px;height:6px;border-radius:50%;background:#2f9e6b}' +
      '.visitor-badge.floating{position:fixed;top:14px;right:16px;z-index:9999;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid #d9dddf;box-shadow:0 2px 8px rgba(0,0,0,.06)}';
    document.head.appendChild(css);
    var slot = document.querySelector('.header-actions');
    if (slot) slot.insertBefore(el, slot.firstChild);
    else { el.classList.add('floating'); document.body.appendChild(el); }
  }
})();
