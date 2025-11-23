// main.js
document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const emptyHintEl = document.getElementById("empty-hint");
  const sortSelect = document.getElementById("sort-select");
  const searchInput = document.getElementById("search-input");
  const journalListEl = document.getElementById("journal-list");
  const confListEl = document.getElementById("conf-list");

  let entries = [];

  // read ExPub.txt
  fetch("../Resources/pub/ExPub.txt")
    .then((resp) => {
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
      }
      return resp.text();
    })
    .then((text) => {
      entries = parseBibTeX(text);
      if (!entries.length) {
        statusEl.textContent = "ExPub.txt 解析成功，但没有找到任何条目。";
      } else {
        statusEl.textContent =
          "已从 ExPub.txt 读取 " + entries.length + " 条文献。";
      }
      render();
    })
    .catch((err) => {
      statusEl.textContent = "加载 ExPub.txt 失败：" + err.message;
    });

  sortSelect.addEventListener("change", render);
  searchInput.addEventListener("input", render);

  function render() {
    if (!entries.length) {
      journalListEl.innerHTML = "";
      confListEl.innerHTML = "";
      emptyHintEl.style.display = "none";
      return;
    }

    const sortMode = sortSelect.value;
    const keyword = searchInput.value.trim().toLowerCase();

    let data = entries.slice();

    // 搜索过滤：标题 / 作者 / 期刊 / 会议名等
    if (keyword) {
      data = data.filter((e) => {
        const haystack = [
          e.title,
          e.rawAuthors,
          e.journal,
          e.booktitle,
          e.publisher,
          e.organization
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      });
    }

    // 排序
    data.sort((a, b) => {
      if (sortMode === "year-desc") {
        return (b.year || 0) - (a.year || 0);
      }
      if (sortMode === "year-asc") {
        return (a.year || 0) - (b.year || 0);
      }
      if (sortMode === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

    // 分类：期刊 / 会议
    const journals = data.filter(isJournalEntry);
    const conferences = data.filter(isConferenceEntry);

    // 如果两类都为空，就提示
    if (!journals.length && !conferences.length) {
      journalListEl.innerHTML = "";
      confListEl.innerHTML = "";
      emptyHintEl.style.display = "block";
      return;
    } else {
      emptyHintEl.style.display = "none";
    }

    // 分别渲染期刊和会议列表，编号在各自类别内从 [1] 开始
    journalListEl.innerHTML = journals
      .map((entry, idx) => {
        const ieeeText = formatIEEE(entry);
        return `<li class="pub-item">
          <div class="pub-text">
            <span class="pub-index">[${idx + 1}]</span>${ieeeText}
          </div>
        </li>`;
      })
      .join("");

    confListEl.innerHTML = conferences
      .map((entry, idx) => {
        const ieeeText = formatIEEE(entry);
        return `<li class="pub-item">
          <div class="pub-text">
            <span class="pub-index">[${idx + 1}]</span>${ieeeText}
          </div>
        </li>`;
      })
      .join("");
  }
});

/* ---------------- BibTeX 解析 ---------------- */

/**
 * 解析 BibTeX 文本为 entries 数组
 * 仅处理常见格式：@type{key, field={value}, ...}
 */
function parseBibTeX(text) {
  const entries = [];
  const entryRegex = /@(\w+)\s*\{([^,]+),([\s\S]*?)\}\s*(?=@|$)/g;
  let match;
  while ((match = entryRegex.exec(text)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();
    const body = match[3];

    const fields = {};
    const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}/g;
    let fmatch;
    while ((fmatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fmatch[1].toLowerCase();
      let value = fmatch[2].trim();
      // 简单去掉转义
      value = value.replace(/\\%/g, "%");
      fields[fieldName] = value;
    }

    const entry = {
      type,
      key,
      ...fields
    };

    // 提取 year 为数字
    if (entry.year) {
      const y = parseInt(entry.year, 10);
      if (!Number.isNaN(y)) {
        entry.year = y;
      }
    }

    // 保存原始 author 字符串
    entry.rawAuthors = entry.author || "";

    entries.push(entry);
  }
  return entries;
}

/* ---------------- 分类辅助函数 ---------------- */

function isJournalEntry(e) {
  return e.type === "article" || !!e.journal;
}

function isConferenceEntry(e) {
  return e.type === "inproceedings" || !!e.booktitle;
}

/* ---------------- 作者格式：IEEE ---------------- */

/**
 * 将 BibTeX 的 author 字段转换为作者对象数组
 * 例如 "Song, Fei and Zhang, Ying and Zhang, Jing"
 * -> [{initials:"F.", family:"Song"}, ...]
 */
function parseAuthorsIEEE(authorField) {
  if (!authorField) return [];
  const parts = authorField
    .split(/\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts
    .map((name) => {
      name = name.replace(/[{}]/g, "").trim();
      if (!name) return null;

      let family = "";
      let given = "";

      if (name.includes(",")) {
        // "姓, 名"
        const arr = name.split(",");
        family = arr[0].trim();
        given = (arr[1] || "").trim();
      } else {
        // "名 姓"
        const tokens = name.split(/\s+/);
        family = tokens.pop();
        given = tokens.join(" ");
      }

      const initials = (given || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((g) => g[0].toUpperCase() + ".")
        .join(" ");

      return { family, initials };
    })
    .filter(Boolean);
}

/**
 * 将作者对象数组变成 IEEE 风格字符串：
 * F. Song, Y. Zhang, and J. Zhang
 * >6 时截断为前 6 个 + et al.
 */
function formatAuthorsIEEE(authors) {
  if (!authors.length) return "";

  const MAX_AUTHORS = 6;
  let useEtAl = authors.length > MAX_AUTHORS;
  let arr = authors;
  if (useEtAl) {
    arr = authors.slice(0, MAX_AUTHORS);
  }

  const names = arr.map((a) => {
    if (a.initials) {
      return `${a.initials} ${a.family}`;
    }
    return a.family;
  });

  if (names.length === 1) {
    return useEtAl ? `${names[0]} et al.` : names[0];
  }

  if (names.length === 2) {
    return useEtAl ? `${names[0]}, ${names[1]}, et al.` : `${names[0]} and ${names[1]}`;
  }

  const last = names[names.length - 1];
  const before = names.slice(0, -1).join(", ");
  if (useEtAl) {
    return `${before}, ${last}, et al.`;
  }
  return `${before}, and ${last}`;
}

/* ---------------- IEEEtran 风格格式化 ---------------- */

/**
 * 将单条 entry 格式化为 IEEE 样式的 HTML 字符串（不含 [n]）
 */
function formatIEEE(entry) {
  const authorsArr = parseAuthorsIEEE(entry.rawAuthors);
  const authorsStr = formatAuthorsIEEE(authorsArr);

  const title = entry.title || "";
  const year = entry.year != null ? String(entry.year) : "n.d.";
  const pages = entry.pages ? entry.pages.replace(/--/g, "–") : "";
  const url = entry.url || ""; // 如果 BibTeX 里有 url 字段就当作链接

  // 标题加引号；如有 URL 就超链接
  const quotedTitle = `"${title}"`;
  const titleHTML = url
    ? `<a class="pub-title-link" href="${url}" target="_blank" rel="noopener noreferrer">${quotedTitle}</a>`
    : quotedTitle;

  // authors, "title",
  let base = authorsStr ? `${authorsStr}, ${titleHTML}, ` : `${titleHTML}, `;

  // 期刊论文
  if (isJournalEntry(entry)) {
    const journal = entry.journal || "";
    const volume = entry.volume || "";
    const number = entry.number || "";

    const parts = [];

    if (journal) {
      parts.push(`<em>${journal}</em>`);
    }

    if (volume || number) {
      let volStr = "";
      if (volume) {
        volStr += `vol. ${volume}`;
      }
      if (number) {
        if (volStr) volStr += ", ";
        volStr += `no. ${number}`;
      }
      parts.push(volStr);
    }

    if (pages) {
      parts.push(`pp. ${pages}`);
    }

    if (year) {
      parts.push(year);
    }

    return base + parts.join(", ") + ".";
  }

  // 会议论文
  if (isConferenceEntry(entry)) {
    const booktitle = entry.booktitle || "";
    const org = entry.organization || entry.publisher || "";

    const parts = [];

    if (booktitle) {
      parts.push(`in <em>${booktitle}</em>`);
    }

    if (pages) {
      parts.push(`pp. ${pages}`);
    }

    if (org) {
      parts.push(org);
    }

    if (year) {
      parts.push(year);
    }

    return base + parts.join(", ") + ".";
  }

  // 其它类型的兜底格式
  const where =
    entry.booktitle || entry.journal || entry.publisher || entry.organization;
  if (where) {
    return base + `<em>${where}</em>, ${year}.`;
  }
  return base + year + ".";
}