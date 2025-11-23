// ------- 名字 → 目录名、资源路径 -------
function nameToFolder(name) {
  // "Yan Lu" -> "Yan_Lu"
  return name.trim().replace(/\s+/g, "_");
}

function buildAssetsForPerson(name) {
  var folder = "../Resources/people/" + nameToFolder(name) + "/";
  return {
    photoUrl: folder + "photo.jpg",   // for all photos, us photo.jpg as filename
    introUrl: folder + "intro.txt"
  };
}

// ------- 解析 people.txt -------

/*
 映射关系：
 Principal Investigator: -> pi
 Postdoc Researcher:     -> postdoc
 Graduate Students:          -> graduate
 Bachelor Intership & Visiting Scholar:     -> bachelor_visiting
 Alumni:                 -> alumni
*/

function parsePeopleText(text) {
  var lines = text.split(/\r?\n/);
  var currentSection = null;

  var sectionMap = {
    "Principal Investigator": "pi",
    "Postdoc Researcher": "postdoc",
    "Graduate Students": "graduate",
    "Bachelor Intership & Visiting Scholar": "bachelor_visiting",
    "Alumni": "alumni"
  };

  var data = {
    pi: [],
    postdoc: [],
    graduate: [],
    bachelor_visiting: [],
    alumni: []
  };

  lines.forEach(function (rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    if (line.endsWith(":")) {
      currentSection = line.slice(0, -1);
      return;
    }

    if (currentSection) {
      var group = sectionMap[currentSection];
      if (!group) return;

      var person = {
        name: line,
        role: currentSection
      };
      data[group].push(person);
    }
  });

  return data;
}

function parseIntroText(text) {
  var result = {
    position: "",
    scholar: "",
    email: "",
    intro: ""
  };

  var lines = text.split(/\r?\n/);
  var currentField = null;
  var introLines = [];

  lines.forEach(function (rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    if (/^Position:?$/i.test(line)) {
      currentField = "position";
      return;
    }
    if (/^(Google Scholar|Scholar):?$/i.test(line)) {
      currentField = "scholar";
      return;
    }
    if (/^(Email|E-mail):?$/i.test(line)) {
      currentField = "email";
      return;
    }
    if (/^Intro/i.test(line)) {  // Introduction / Introducton 都能匹配
      currentField = "intro";
      return;
    }

    if (currentField === "intro") {
      // Intro 内容保留原始行
      introLines.push(rawLine);
    } else if (currentField && !result[currentField]) {
      // position / scholar / email 只取第一次非空内容
      result[currentField] = line;
    }
  });

  result.intro = introLines.join("\n").trim();
  return result;
}

function parseIntroText(text) {
  var result = {
    position: "",
    scholar: "",
    email: "",
    linkedin: "",
    website: "",
    intro: ""
  };

  var lines = text.split(/\r?\n/);
  var currentField = null;
  var introLines = [];

  lines.forEach(function (rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    if (/^Position:?$/i.test(line)) {
      currentField = "position";
      return;
    }
    if (/^(Google Scholar|Scholar):?$/i.test(line)) {
      currentField = "scholar";
      return;
    }
    if (/^(Email|E-mail):?$/i.test(line)) {
      currentField = "email";
      return;
    }
    if (/^LinkedIn:?$/i.test(line)) {
      currentField = "linkedin";
      return;
    }
    if (/^(Website|Homepage|Personal Website):?$/i.test(line)) {
      currentField = "website";
      return;
    }
    if (/^Intro/i.test(line)) {   // Introduction / Intro 都能匹配
      currentField = "intro";
      return;
    }

    if (currentField === "intro") {
      introLines.push(rawLine);   // Intro 部分保留原始行
    } else if (currentField && !result[currentField]) {
      // 非 Intro 字段只取第一行
      result[currentField] = line;
    }
  });

  result.intro = introLines.join("\n").trim();
  return result;
}

// ------- 为每个人加载 intro.txt -------
function loadIntroForPerson(person) {
  var assets = buildAssetsForPerson(person.name);
  person.photoUrl = assets.photoUrl;

  return fetch(assets.introUrl)
    .then(function (res) {
      if (!res.ok) {
        person.intro = "";
        person.position = "";
        person.scholar = "";
        person.email = "";
        person.linkedin = "";
        person.website = "";
        return;
      }
      return res.text().then(function (txt) {
        var parsed = parseIntroText(txt);
        person.intro = parsed.intro;
        person.position = parsed.position;
        person.scholar = parsed.scholar;
        person.email = parsed.email;
        person.linkedin = parsed.linkedin;
        person.website = parsed.website;
      });
    })
    .catch(function () {
      person.intro = "";
      person.position = "";
      person.scholar = "";
      person.email = "";
      person.linkedin = "";
      person.website = "";
    });
}

function createLinksRow(person) {
  var hasScholar = !!person.scholar;
  var hasEmail = !!person.email;

  if (!hasScholar && !hasEmail) {
    return null;
  }

  var container = document.createElement("div");
  container.className = "person-links";

  if (hasEmail) {
    var aMail = document.createElement("a");
    aMail.className = "icon-link";
    aMail.href = "mailto:" + person.email;

    var imgMail = document.createElement("img");
    imgMail.src = "../Resources/icons/email.svg"; // 如果你用 png，这里改成 .png
    imgMail.alt = "Email";
    imgMail.className = "icon-image";

    aMail.appendChild(imgMail);
    container.appendChild(aMail);
  }

  if (hasScholar) {
    var aSch = document.createElement("a");
    aSch.className = "icon-link";
    aSch.href = person.scholar;
    aSch.target = "_blank";
    aSch.rel = "noopener";

    var imgSch = document.createElement("img");
    imgSch.src = "../Resources/icons/scholar.svg"; // 同上
    imgSch.alt = "Google Scholar";
    imgSch.className = "icon-image";

    aSch.appendChild(imgSch);
    container.appendChild(aSch);
  }

  return container;
}

function createLinksRow(person) {
  var hasScholar  = !!person.scholar;
  var hasEmail    = !!person.email;
  var hasLinkedin = !!person.linkedin;
  var hasWebsite  = !!person.website;

  if (!hasScholar && !hasEmail && !hasLinkedin && !hasWebsite) {
    return null;
  }

  var container = document.createElement("div");
  container.className = "person-links";

  if (hasEmail) {
    var aMail = document.createElement("a");
    aMail.className = "icon-link";
    aMail.href = "mailto:" + person.email;

    var imgMail = document.createElement("img");
    imgMail.src = "../Resources/icons/email.svg";   // 自己准备图标
    imgMail.alt = "Email";
    imgMail.className = "icon-image";

    aMail.appendChild(imgMail);
    container.appendChild(aMail);
  }

  if (hasScholar) {
    var aSch = document.createElement("a");
    aSch.className = "icon-link";
    aSch.href = person.scholar;
    aSch.target = "_blank";
    aSch.rel = "noopener";

    var imgSch = document.createElement("img");
    imgSch.src = "../Resources/icons/scholar.svg";
    imgSch.alt = "Google Scholar";
    imgSch.className = "icon-image";

    aSch.appendChild(imgSch);
    container.appendChild(aSch);
  }

  if (hasLinkedin) {
    var aLi = document.createElement("a");
    aLi.className = "icon-link";
    aLi.href = person.linkedin;
    aLi.target = "_blank";
    aLi.rel = "noopener";

    var imgLi = document.createElement("img");
    imgLi.src = "../Resources/icons/linkedin.svg";
    imgLi.alt = "LinkedIn";
    imgLi.className = "icon-image";

    aLi.appendChild(imgLi);
    container.appendChild(aLi);
  }

  if (hasWebsite) {
    var aWeb = document.createElement("a");
    aWeb.className = "icon-link";
    aWeb.href = person.website;
    aWeb.target = "_blank";
    aWeb.rel = "noopener";

    var imgWeb = document.createElement("img");
    imgWeb.src = "../Resources/icons/website.svg";    // 可以是地球图标
    imgWeb.alt = "Website";
    imgWeb.className = "icon-image";

    aWeb.appendChild(imgWeb);
    container.appendChild(aWeb);
  }

  return container;
}

function createPersonCard(person) {
  // 判断是不是 PI：依赖 people.text 解析时的 role 字段
  // 你的 parsePeopleText 一般把 PI 的 section 写成 "Principal Investigator"
  var isPI = person.role && person.role.indexOf("Principal Investigator") === 0;

  if (isPI) {
    // ================== PI：左图右文 ==================
    var card = document.createElement("div");
    card.className = "person-card pi-card";

    // 左边图片区域
    var imgWrap = document.createElement("div");
    imgWrap.className = "pi-photo-wrap";

    var img = document.createElement("img");
    img.className = "person-photo";
    img.src = person.photoUrl;
    img.alt = person.name;
    img.onerror = function () {
      this.style.display = "none";
    };
    imgWrap.appendChild(img);

    // 右边文字区域
    var info = document.createElement("div");
    info.className = "pi-info";

    // 名字
    var nameEl = document.createElement("div");
    nameEl.className = "person-name";
    nameEl.textContent = person.name;

    // 职位
    var positionEl = document.createElement("div");
    positionEl.className = "person-position";
    positionEl.textContent = person.position || "";

    // 图标行（Email / Scholar / LinkedIn / Website）
    var linksRow = createLinksRow(person);

    // 头行：名字 + 图标在一行
    var headerLine = document.createElement("div");
    headerLine.className = "person-header-line";
    headerLine.appendChild(nameEl);
    if (linksRow) headerLine.appendChild(linksRow);

    // 简介
    var intro = document.createElement("div");
    intro.className = "person-intro";
    intro.textContent = person.intro || "";

    // 组装右侧信息：有就加
    info.appendChild(headerLine);
    if (person.position) {
      info.appendChild(positionEl);
    }
    if (person.intro) {
      info.appendChild(intro);
    }

    // 组装整个卡片
    card.appendChild(imgWrap);
    card.appendChild(info);

    return card;

  } else {
    // ================== 其他人：上图下文 ==================
    var card2 = document.createElement("div");
    card2.className = "person-card";

    var img2 = document.createElement("img");
    img2.className = "person-photo";
    img2.src = person.photoUrl;
    img2.alt = person.name;
    img2.onerror = function () {
      this.style.display = "none";
    };

    var nameEl2 = document.createElement("div");
    nameEl2.className = "person-name";
    nameEl2.textContent = person.name;

    var positionEl2 = document.createElement("div");
    positionEl2.className = "person-position";
    positionEl2.textContent = person.position || "";

    var linksRow2 = createLinksRow(person);

    var intro2 = document.createElement("div");
    intro2.className = "person-intro";
    intro2.textContent = person.intro || "";

    // 头行：名字 + 图标在一行
    var headerLine2 = document.createElement("div");
    headerLine2.className = "person-header-line";
    headerLine2.appendChild(nameEl2);
    if (linksRow2) headerLine2.appendChild(linksRow2);

    card2.appendChild(img2);
    card2.appendChild(headerLine2);
    if (person.position) {
      card2.appendChild(positionEl2);
    }
    if (person.intro) {
      card2.appendChild(intro2);
    }

    return card2;
  }
}

// ------- 渲染到页面 -------
function renderPeople(data) {
  var piContainer       = document.getElementById("pi-container");
  var postdocContainer  = document.getElementById("postdoc-container");
  var graduateContainer = document.getElementById("graduate-container");
  var bachelor_visitingContainer = document.getElementById("bachelor_visiting-container");
  var alumniContainer   = document.getElementById("alumni-container");

  function sortByName(list) {
    return list.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  data.pi.forEach(function (p)       { piContainer.appendChild(createPersonCard(p)); });
  data.postdoc.forEach(function (p)  { postdocContainer.appendChild(createPersonCard(p)); });
  data.graduate.forEach(function (p)      { graduateContainer.appendChild(createPersonCard(p)); });
  data.bachelor_visiting.forEach(function (p) { bachelor_visitingContainer.appendChild(createPersonCard(p)); });
  data.alumni.forEach(function (p)   { alumniContainer.appendChild(createPersonCard(p)); });
}

// ------- 主流程 -------
function loadPeople() {
  fetch("../Resources/people/people.txt")
    .then(function (res) {
      return res.text();
    })
    .then(function (text) {
      var parsed = parsePeopleText(text);

      var allPersons = []
        .concat(parsed.pi)
        .concat(parsed.postdoc)
        .concat(parsed.graduate)
        .concat(parsed.bachelor_visiting)
        .concat(parsed.alumni);

      var promises = allPersons.map(function (p) {
        return loadIntroForPerson(p);
      });

      return Promise.all(promises).then(function () {
        renderPeople(parsed);
      });
    })
    .catch(function (err) {
      console.error("Failed to load people.text:", err);
    });
}

document.addEventListener("DOMContentLoaded", loadPeople);