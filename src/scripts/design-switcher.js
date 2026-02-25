/**
 * Design Switcher — floating dropdown to navigate between design previews.
 *
 * HOW TO ADD A NEW DESIGN:
 *   1. Add an entry to the DESIGNS array below.
 *   2. Add  <script>window.DESIGN_CURRENT = 'YourName';</script>
 *           <script src="src/scripts/design-switcher.js"></script>
 *      before </body> on the new page.
 */
(function () {
  'use strict';

  // ── Design registry ─────────────────────────────────────────────────────────
  // Add new designs here. `url` is relative to the project root.
  var DESIGNS = [
    { name: 'Vibemaster', url: 'index.html',           desc: 'Inter · Indigo/Purple' },
    { name: 'Stitch',     url: 'preview-stitch.html',  desc: 'Space Grotesk · Electric Blue' },
  ];

  var current = window.DESIGN_CURRENT || '';

  // ── Styles ──────────────────────────────────────────────────────────────────
  var css = [
    '#ds-widget{position:fixed;top:76px;right:20px;z-index:9999;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',

    '#ds-trigger{display:flex;align-items:center;gap:7px;padding:8px 14px;',
      'background:rgba(4,7,16,0.97);border:1px solid rgba(255,255,255,0.12);',
      'border-radius:12px;cursor:pointer;color:#94a3b8;font-size:11px;',
      'font-weight:700;letter-spacing:0.05em;text-transform:uppercase;',
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
      'box-shadow:0 4px 24px rgba(0,0,0,0.45);user-select:none;',
      'transition:border-color .15s,color .15s;}',

    '#ds-trigger:hover{border-color:rgba(255,255,255,0.22);color:#e2e8f0;}',
    '#ds-trigger .ds-name{color:#e2e8f0;}',
    '#ds-trigger .ds-icon{font-size:16px;color:#475569;transition:transform .2s;}',
    '#ds-widget.ds-open #ds-trigger .ds-icon{transform:rotate(180deg);}',
    '#ds-trigger .ds-label-pre{color:#475569;font-size:10px;letter-spacing:0.06em;}',

    '#ds-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:230px;',
      'background:rgba(4,7,16,0.98);border:1px solid rgba(255,255,255,0.1);',
      'border-radius:12px;padding:6px;',
      'box-shadow:0 12px 40px rgba(0,0,0,0.6);',
      'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
      'display:none;}',

    '#ds-widget.ds-open #ds-menu{display:block;}',

    '.ds-menu-label{padding:6px 10px 4px;font-size:9px;font-weight:800;',
      'letter-spacing:0.12em;text-transform:uppercase;color:#1e293b;}',

    '.ds-item{display:flex;align-items:center;justify-content:space-between;',
      'gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;',
      'text-decoration:none;transition:background .1s;}',

    '.ds-item:hover{background:rgba(255,255,255,0.06);}',
    '.ds-item.ds-active{background:rgba(255,255,255,0.04);cursor:default;pointer-events:none;}',

    '.ds-item-info{display:flex;flex-direction:column;gap:2px;}',
    '.ds-item-name{font-size:12px;font-weight:700;color:#cbd5e1;}',
    '.ds-item-desc{font-size:10px;color:#334155;}',
    '.ds-item.ds-active .ds-item-name{color:#fff;}',
    '.ds-item.ds-active .ds-item-desc{color:#475569;}',
    '.ds-check{font-size:14px;color:#2b8cee;flex-shrink:0;}',
  ].join('');

  var el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);

  // ── Widget ──────────────────────────────────────────────────────────────────
  var widget = document.createElement('div');
  widget.id = 'ds-widget';

  // Dropdown menu
  var menu = document.createElement('div');
  menu.id = 'ds-menu';

  DESIGNS.forEach(function (d) {
    var isActive = d.name === current;
    var a = document.createElement('a');
    a.className = 'ds-item' + (isActive ? ' ds-active' : '');
    a.href = isActive ? '#' : d.url;

    var info = document.createElement('div');
    info.className = 'ds-item-info';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'ds-item-name';
    nameSpan.textContent = d.name;
    info.appendChild(nameSpan);

    if (d.desc) {
      var descSpan = document.createElement('span');
      descSpan.className = 'ds-item-desc';
      descSpan.textContent = d.desc;
      info.appendChild(descSpan);
    }
    a.appendChild(info);

    if (isActive) {
      var check = document.createElement('span');
      check.className = 'ds-check material-symbols-outlined';
      check.textContent = 'check_circle';
      a.appendChild(check);
    }
    menu.appendChild(a);
  });

  // Trigger button
  var trigger = document.createElement('div');
  trigger.id = 'ds-trigger';

  var labelPre = document.createElement('span');
  labelPre.className = 'ds-label-pre';
  labelPre.textContent = 'Design';

  var nameEl = document.createElement('span');
  nameEl.className = 'ds-name';
  nameEl.textContent = current || 'Switch';

  var iconEl = document.createElement('span');
  iconEl.className = 'ds-icon material-symbols-outlined';
  iconEl.textContent = 'expand_more';

  trigger.appendChild(labelPre);
  trigger.appendChild(nameEl);
  trigger.appendChild(iconEl);

  widget.appendChild(menu);
  widget.appendChild(trigger);

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    widget.classList.toggle('ds-open');
  });

  document.addEventListener('click', function () {
    widget.classList.remove('ds-open');
  });

  document.body.appendChild(widget);
})();
