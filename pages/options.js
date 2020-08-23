const API_URL = 'http://localhost/api';
// Store CSS data in the "local" storage area.
const storage = chrome.storage.local;

const srcLang = document.getElementById('src-lang');
const dstLang = document.getElementById('dst-lang');
const srcLangList = srcLang.querySelector('.select-langs');
const dstLangList = dstLang.querySelector('.select-langs');
const srcLangInput = srcLang.querySelector('input');
const dstLangInput = dstLang.querySelector('input');

function createLangaugeItem(code, name) {
  const lang = document.createElement('div');
  lang.className = 'lang';
  lang.innerText = name;
  lang.data_code = code;
  lang.addEventListener('click', (evt) => {
    const input = evt.target.parentElement.parentElement.querySelector(
      'input[type=text]'
    );
    input.value = lang.innerText;
    input.value_code = lang.data_code;
    input.dispatchEvent(new Event('keyup'));
  });
  return lang;
}

function onInputChanged(evt) {
  const e = evt.target;
  const langs = e.parentElement.querySelectorAll('.select-langs > .lang');
  const str = e.value.toLowerCase();
  langs.forEach(function (val, idx) {
    if (val.innerText.toLowerCase().includes(str)) {
      val.classList.add('active');
      val.classList.remove('inactive');
    } else {
      val.classList.add('inactive');
      val.classList.remove('active');
    }
  });
}

function showLangList(evt) {
  const langList = evt.target.parentElement.querySelector('.select-langs');
  langList.style.display = 'block';
}

function hideLangList(evt) {
  const langList = evt.target.parentElement.querySelector('.select-langs');
  setTimeout(function () {
    langList.style.display = 'none';
  }, 100);
}

function load() {
  $.ajax({
    url: API_URL + '/app/translate/supports',
    data: {},
    method: 'GET',
    dataType: 'json',
  })
    .done(function (langs) {
      for (let i = 0; i < langs.length; i++) {
        srcLangList.appendChild(
          createLangaugeItem(langs[i].code, langs[i].name)
        );
        dstLangList.appendChild(
          createLangaugeItem(langs[i].code, langs[i].name)
        );
      }
      srcLangInput.addEventListener('keyup', onInputChanged);
      dstLangInput.addEventListener('keyup', onInputChanged);
      srcLangInput.addEventListener('focus', showLangList);
      dstLangInput.addEventListener('focus', showLangList);
      srcLangInput.addEventListener('focusout', hideLangList);
      dstLangInput.addEventListener('focusout', hideLangList);
      document.getElementById('btn-save').removeAttribute('disabled');
    })
    .fail(function (xhr, status, errorThrown) {
      console.error(xhr, status, errorThrown);
      addAlertMessage('Server Error', 'fail', true);
    })
    .always(sync);
}

// syncronize between forms and storage
function sync() {
  // get settings or set default
  storage.get('options', function (item) {
    const options = item.options || {};
    if (options.srcLangName) {
      srcLangInput.value = options.srcLangName;
      dstLangInput.value_code = options.dstLangCode;
    } else {
      srcLangInput.value = 'English';
      srcLangInput.value_code = 'en';
    }
    if (options.dstLangCode) {
      dstLangInput.value = options.dstLangName;
      dstLangInput.value_code = options.dstLangCode;
    } else {
      dstLangInput.value = 'Korean';
      dstLangInput.value_code = 'ko';
    }
  });
}

function save() {
  const opt = {};
  opt['srcLangName'] = srcLangInput.value || 'Korean';
  opt['srcLangCode'] = srcLangInput.value_code || 'ko';
  opt['dstLangName'] = dstLangInput.value || 'English';
  opt['dstLangCode'] = dstLangInput.value_code || 'en';
  storage.set({ options: opt }, function () {
    addAlertMessage('All saved successfully!', 'success');
    sync();
  });
}

function addAlertMessage(msg, cls, keep) {
  const alerts = document.getElementById('alerts');
  const box = document.createElement('div');
  box.className = 'alert ' + (cls || '');
  box.innerHTML = msg;
  alerts.appendChild(box);
  if (!keep) {
    setTimeout(function () {
      box.remove();
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  load();

  document.getElementById('btn-save').addEventListener('click', function (evt) {
    evt.preventDefault;
    evt.stopPropagation();
    save();
  });

  document
    .getElementById('btn-close')
    .addEventListener('click', function (evt) {
      evt.preventDefault;
      evt.stopPropagation();
      window.close();
    });
});
