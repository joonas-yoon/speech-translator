function inject_css(css) {
  const href = chrome.extension.getURL(css);
  const linktag = document.createElement("link");
  Object.assign(linktag, {
    rel: "stylesheet",
    type: "text/css",
    href,
  });
  document.getElementsByTagName("head")[0].appendChild(linktag);
}

function inject_html(node) {
  document.getElementsByTagName("body")[0].appendChild(node);
}

function create_selectbox(id, list) {
  const form = document.createElement("div");
  form.id = id;
  form.classList = "spchtrs search-form";
  const langList = document.createElement("div");
  langList.classList = "spchtrs select-langs";
  for (let i = 0; i < list.length; ++i) {
    const lang = document.createElement("div");
    lang.classList = "spch lang";
    lang.innerText = list[i];
    langList.appendChild(lang);
  }
  form.appendChild(langList);
  const input = document.createElement("input");
  input.classList = "spch lang-input";
  form.appendChild(input);
  return form;
}

(function () {
  const wrapper = document.createElement("div");
  wrapper.id = "spchtrs-viewer";

  const threadContainer = document.createElement("div");
  threadContainer.id = "spchtrs-threads";
  threadContainer.className = "threads";
  wrapper.appendChild(threadContainer);

  const footer = document.createElement("div");
  footer.className = "footer";
  const volumeCell = document.createElement("div");
  volumeCell.classList = "volumebar gradient-animation-background";
  footer.appendChild(volumeCell);
  wrapper.appendChild(footer);

  inject_html(wrapper);
})();
