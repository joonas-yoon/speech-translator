let srcLang = document.getElementById('src-lang');
let dstLang = document.getElementById('dst-lang');

function createLangaugeItem(name) {
    let lang = document.createElement('div');
    lang.className = 'lang';
    lang.innerText = name;
    lang.addEventListener('click', (evt) => {
        let input = evt.target.parentElement.parentElement.querySelector('input[type=text]');
        input.value = lang.innerText;
        input.dispatchEvent(new Event('keyup'));
    });
    return lang;
}

function onInputChanged(evt) {
    let e = evt.target;
    let langs = e.parentElement.querySelectorAll('.select-langs > .lang');
    let str = e.value.toLowerCase();
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
    let langList = evt.target.parentElement.querySelector('.select-langs');
    langList.style.display = 'block';
}

function hideLangList(evt) {
    let langList = evt.target.parentElement.querySelector('.select-langs');
    setTimeout(function(){ langList.style.display = 'none'; }, 100);
}

document.addEventListener('DOMContentLoaded', function(){
    let langs = ['Arabic', 'Chinese', 'Danish', 'Dutch', 'English', 'French', 'German', 'Greek', 'Hungarian', 'Italian', 'Japanese', 'Korean', 'Lithuanian', 'Persian', 'Polish', 'Portuguese', 'Russian', 'Spanish', 'Swedish', 'Turkish', 'Vietnamese'];
    let srcLangList = srcLang.querySelector('.select-langs');
    let dstLangList = dstLang.querySelector('.select-langs');
    for (var i = 0; i < langs.length; i++) {
        srcLangList.appendChild(createLangaugeItem(langs[i]));
        dstLangList.appendChild(createLangaugeItem(langs[i]));
    }
    let srcLangInput = srcLang.querySelector('input');
    let dstLangInput = dstLang.querySelector('input');
    srcLangInput.addEventListener('keyup', onInputChanged);
    dstLangInput.addEventListener('keyup', onInputChanged);
    srcLangInput.addEventListener('focus', showLangList);
    dstLangInput.addEventListener('focus', showLangList);
    srcLangInput.addEventListener('focusout', hideLangList);
    dstLangInput.addEventListener('focusout', hideLangList);
});