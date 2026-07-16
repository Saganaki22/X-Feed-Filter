import { serializeExport, parseImport } from '../shared/import-export.js';
import { extensionApi } from '../shared/browser-api.js';
import type { ContentMessage, ContentResponse, Rule, Settings } from '../shared/types.js';
import { setAnnounceRegion, announce } from './accessibility.js';
import { RuleEditor } from './rule-editor.js';
import { store } from './state.js';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
}

async function queryActiveTab(msg: ContentMessage): Promise<ContentResponse | null> {
  try {
    const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    const res = (await extensionApi.tabs.sendMessage(tab.id, msg)) as ContentResponse | undefined;
    return res ?? null;
  } catch {
    // Most common cause: the active tab isn't x.com (no content script).
    return null;
  }
}

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function updateActionState(enabled: boolean): void {
  // Resolve icon paths from the extension root in the background context.
  // Calling action.setIcon here would resolve paths from popup/ instead.
  void extensionApi.runtime
    .sendMessage({ type: 'SET_ACTION_STATE', enabled })
    .catch(() => undefined);
}

function askConfirmation(options: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
}): Promise<boolean> {
  const dialog = byId<HTMLDialogElement>('confirmDialog');
  const accept = byId<HTMLButtonElement>('confirmAccept');
  byId<HTMLElement>('confirmTitle').textContent = options.title;
  byId<HTMLElement>('confirmMessage').textContent = options.message;
  accept.textContent = options.confirmLabel;
  accept.classList.toggle('xff-btn--danger-solid', options.danger === true);
  accept.classList.toggle('xff-btn--primary', options.danger !== true);
  dialog.returnValue = '';

  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {
      once: true,
    });
    dialog.showModal();
  });
}

function typeBadge(rule: Rule): string {
  switch (rule.type) {
    case 'handle':
      return '@';
    case 'hashtag':
      return '#';
    default:
      return 'Aa';
  }
}

function buildRuleItem(rule: Rule, editor: RuleEditor): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'xff-rule';
  li.dataset.id = rule.id;
  if (editor.getEditingId() === rule.id) li.classList.add('xff-rule--editing');

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'xff-rule__toggle';
  toggle.checked = rule.enabled;
  toggle.id = `r-${rule.id}`;
  toggle.setAttribute('aria-label', `Enable filter ${rule.value}`);
  toggle.addEventListener('change', () => store.toggleRule(rule.id, toggle.checked));

  const badge = document.createElement('span');
  badge.className = `xff-badge xff-badge--${rule.type}`;
  badge.textContent = typeBadge(rule);
  badge.title = rule.type;

  const main = document.createElement('div');
  main.className = 'xff-rule__main';

  const value = document.createElement('span');
  value.className = 'xff-rule__value';
  value.textContent = rule.value;
  if (!rule.enabled) li.classList.add('xff-rule--off');

  const meta = document.createElement('span');
  meta.className = 'xff-rule__meta';
  const metaParts: string[] = [];
  metaParts.push(rule.enabled ? 'Active' : 'Paused');
  metaParts.push(rule.matchMode === 'whole' ? 'whole word' : 'contains');
  if (rule.caseSensitive) metaParts.push('case-sensitive');
  if (rule.note) metaParts.push(rule.note);
  meta.textContent = metaParts.join(' · ');

  main.append(value, meta);

  const actions = document.createElement('div');
  actions.className = 'xff-rule__actions';

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'xff-iconbtn';
  edit.textContent = 'Edit';
  edit.setAttribute('aria-label', `Edit ${rule.value}`);
  edit.addEventListener('click', () => {
    editor.startEdit(rule);
    li.classList.add('xff-rule--editing');
  });

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'xff-iconbtn xff-iconbtn--danger';
  del.textContent = 'Delete';
  del.setAttribute('aria-label', `Delete ${rule.value}`);
  del.addEventListener('click', async () => {
    const accepted = await askConfirmation({
      title: 'Delete filter?',
      message: `“${rule.value}” will be permanently removed.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!accepted) return;
    if (editor.getEditingId() === rule.id) editor.reset();
    store.deleteRule(rule.id);
    announce(`Deleted ${rule.value}`);
  });

  actions.append(edit, del);

  const label = document.createElement('label');
  label.className = 'xff-rule__label';
  label.htmlFor = `r-${rule.id}`;
  label.append(badge, main);

  li.append(toggle, label, actions);
  return li;
}

async function refreshStats(): Promise<void> {
  const el = byId<HTMLSpanElement>('stat-hidden');
  const res = await queryActiveTab({ type: 'GET_STATS' });
  if (res?.ok && res.stats) {
    el.textContent = String(res.stats.hidden);
    el.title = `${res.stats.hidden} hidden · ${res.stats.scanned} checked this session`;
  } else {
    el.textContent = '—';
    el.title = 'Open x.com to see session counts';
  }
}

function render(settings: Settings, editor: RuleEditor): void {
  const master = byId<HTMLInputElement>('master');
  const brandIcon = byId<HTMLImageElement>('brandIcon');
  const hideMode = byId<HTMLSelectElement>('hideMode');
  const count = byId<HTMLSpanElement>('count');
  const list = byId<HTMLUListElement>('ruleList');
  const empty = byId<HTMLElement>('emptyState');
  const search = byId<HTMLInputElement>('filter');

  if (master.checked !== settings.masterEnabled) master.checked = settings.masterEnabled;
  brandIcon.src = settings.masterEnabled
    ? '../icons/icon-enabled-32.png'
    : '../icons/icon-disabled-32.png';
  updateActionState(settings.masterEnabled);
  if (hideMode.value !== settings.hideMode) hideMode.value = settings.hideMode;

  const q = search.value.trim().toLocaleLowerCase();
  const rules = settings.rules.filter((r) => !q || r.value.toLocaleLowerCase().includes(q));
  const activeCount = settings.rules.filter((rule) => rule.enabled).length;
  count.textContent = `${activeCount} active`;
  count.title = `${activeCount} of ${settings.rules.length} filters active`;

  list.replaceChildren();
  for (const rule of rules) list.appendChild(buildRuleItem(rule, editor));

  const hasMatches = rules.length > 0;
  empty.hidden = hasMatches;
  list.hidden = !hasMatches;
  void editor;
}

async function main(): Promise<void> {
  setAnnounceRegion(byId('announce'));

  const manifest = extensionApi.runtime.getManifest();
  const version = byId<HTMLSpanElement>('version');
  const displayVersion = manifest.version_name ?? manifest.version;
  version.textContent = `v${displayVersion}`;
  version.title = `Version ${displayVersion}`;

  const editor = new RuleEditor({
    form: byId('ruleForm'),
    type: byId('type'),
    value: byId('value'),
    whole: byId('whole'),
    caseSensitive: byId('caseSensitive'),
    note: byId('note'),
    advancedWrap: byId('advanced'),
    moreBtn: byId('more'),
    addBtn: byId('add'),
    cancelBtn: byId('cancelEdit'),
    message: byId('formMessage'),
  });

  store.subscribe((s) => render(s, editor));
  await store.load();

  byId<HTMLInputElement>('master').addEventListener('change', (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    updateActionState(enabled);
    void store.setMaster(enabled);
  });
  byId<HTMLSelectElement>('hideMode').addEventListener('change', (e) => {
    void store.setHideMode((e.target as HTMLSelectElement).value as Settings['hideMode']);
  });
  byId<HTMLInputElement>('filter').addEventListener('input', () => render(store.get(), editor));

  byId<HTMLButtonElement>('rescan').addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    button.classList.remove('xff-rescan--success', 'xff-rescan--error');
    button.classList.add('xff-rescan--busy');
    button.textContent = 'Rescanning…';

    const result = await queryActiveTab({ type: 'RESCAN' });
    await refreshStats();
    button.classList.remove('xff-rescan--busy');

    if (result?.ok) {
      button.classList.add('xff-rescan--success');
      button.textContent = 'Rescanned ✓';
      announce('Feed rescan complete');
    } else {
      button.classList.add('xff-rescan--error');
      button.textContent = 'Open X first';
      announce('Open X to rescan the feed');
    }

    window.setTimeout(() => {
      button.disabled = false;
      button.classList.remove('xff-rescan--success', 'xff-rescan--error');
      button.textContent = 'Rescan feed';
    }, 1400);
  });

  byId<HTMLButtonElement>('export').addEventListener('click', () => {
    download('x-feed-filter-rules.json', serializeExport(store.get()));
    announce('Exported filters');
  });

  const fileInput = byId<HTMLInputElement>('fileInput');
  byId<HTMLButtonElement>('import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const text = await file.text();
    const res = parseImport(text, store.get(), 'replace');
    if (!res.ok || !res.settings) {
      announce(res.error ?? 'Import failed');
      alert(res.error ?? 'Import failed');
      return;
    }
    const current = store.get().rules.length;
    const incoming = res.settings.rules.length;
    const accepted = await askConfirmation({
      title: 'Replace filters?',
      message: `Replace ${current} existing filter(s) with ${incoming} imported filter(s)?`,
      confirmLabel: 'Replace',
    });
    if (!accepted) return;
    store.setRules(res.settings.rules);
    announce(`Imported ${incoming} filters`);
  });

  byId<HTMLButtonElement>('reset').addEventListener('click', async () => {
    const accepted = await askConfirmation({
      title: 'Reset everything?',
      message: 'All settings and filters will be permanently removed.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (!accepted) return;
    await store.reset();
    editor.reset();
    announce('Settings reset');
  });

  void refreshStats();
  window.setTimeout(refreshStats, 800);
}

void main();
