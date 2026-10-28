// Pewarna sintaks ringan tanpa dependensi.
// Mendukung: bash/shell, javascript/ts/json, python, php, html/xml, css, yaml, markdown, sql.
(function () {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const words = list => new Set(list.split(' '));
  const KW = {
    js: words('const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of this null undefined true false'),
    py: words('def return if elif else for while in not and or is import from as class try except finally raise with lambda pass break continue yield None True False self async await global'),
    bash: words('if then else elif fi for in do done while case esac function return export local echo cd sudo apt apt-get yum dnf npm npx node git cat grep ls rm cp mv mkdir chmod chown systemctl curl wget source exit set'),
    php: words('function return if else elseif foreach for while echo new class public private protected static use namespace require include array null true false try catch throw'),
    sql: words('select from where insert into values update set delete create table alter drop join left right inner outer on and or not null as order by group having limit primary key index')
  };

  const ALIAS = {
    javascript: 'js', js: 'js', ts: 'js', typescript: 'js', json: 'js', jsx: 'js',
    python: 'py', py: 'py',
    bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
    php: 'php', sql: 'sql', css: 'css',
    html: 'html', xml: 'html', svg: 'html',
    yaml: 'yaml', yml: 'yaml',
    markdown: 'md', md: 'md'
  };

  // Aturan per bahasa: [kelas, regex sticky]. Urutan menentukan prioritas.
  const RULES = {
    js: [['com', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y], ['str', /`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/y]],
    py: [['com', /#[^\n]*/y], ['str', /"""[\s\S]*?"""|'''[\s\S]*?'''|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/y]],
    bash: [['com', /#[^\n]*/y], ['str', /'[^']*'|"(?:\\.|[^"\\])*"/y], ['var', /\$\{?[\w@#?*!-]+\}?/y], ['flag', /(?<=\s)--?[\w-]+/y]],
    php: [['com', /\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\//y], ['str', /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/y], ['var', /\$\w+/y]],
    sql: [['com', /--[^\n]*/y], ['str', /'(?:''|[^'])*'/y]],
    css: [['com', /\/\*[\s\S]*?\*\//y], ['str', /'[^']*'|"[^"]*"/y], ['kw', /[.#]?[\w-]+(?=\s*\{)/y], ['attr', /[\w-]+(?=\s*:)/y]],
    yaml: [['com', /#[^\n]*/y], ['str', /'[^'\n]*'|"[^"\n]*"/y], ['attr', /^[ \t-]*[\w.-]+(?=\s*:)/my]],
    md: [['kw', /^#{1,6} [^\n]*/my], ['com', /^>[^\n]*/my], ['str', /`[^`\n]+`/y], ['attr', /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)/y]],
    html: [['com', /<!--[\s\S]*?-->/y], ['tag', /<\/?[\w-]+|\/?>/y], ['str', /"[^"]*"|'[^']*'/y], ['attr', /[\w:-]+(?==)/y]]
  };

  const NUM = /\b\d+(?:\.\d+)?\b/y;
  const WORD = /[A-Za-z_][\w-]*/y;

  window.highlightCode = (code, lang) => {
    const key = ALIAS[(lang || '').toLowerCase()];
    if (!key) return esc(code);
    const rules = RULES[key] || [];
    const keywords = KW[key];
    let out = '';
    let i = 0;
    while (i < code.length) {
      let matched = false;
      for (const [cls, re] of rules) {
        re.lastIndex = i;
        const m = re.exec(code);
        if (m && m[0].length) {
          out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      NUM.lastIndex = i;
      let m = NUM.exec(code);
      if (m) { out += `<span class="tk-num">${m[0]}</span>`; i += m[0].length; continue; }
      WORD.lastIndex = i;
      m = WORD.exec(code);
      if (m) {
        const w = m[0];
        const isKw = keywords && keywords.has(key === 'sql' ? w.toLowerCase() : w);
        const isFn = !isKw && code[i + w.length] === '(';
        out += isKw ? `<span class="tk-kw">${w}</span>` : isFn ? `<span class="tk-fn">${w}</span>` : esc(w);
        i += w.length;
        continue;
      }
      out += esc(code[i]);
      i += 1;
    }
    return out;
  };
})();
