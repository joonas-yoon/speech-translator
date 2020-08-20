function inject_css(css) {
    const href = chrome.extension.getURL(css);
    const linktag = document.createElement('link');
    Object.assign(linktag, {
        rel: 'stylesheet',
        type: 'text/css',
        href,
    });
    document.getElementsByTagName('head')[0].appendChild(linktag);
}

function inject_html(node) {
    document.getElementsByTagName('body')[0].appendChild(node);
}

function create_selectbox(id, list) {
    let form = document.createElement('div');
    form.id = id;
    form.classList = 'spchtrs search-form';
    let langList = document.createElement('div');
    langList.classList = 'spchtrs select-langs';
    for(var i=0; i<list.length; ++i) {
        let lang = document.createElement('div');
        lang.classList = 'spch lang';
        lang.innerText = list[i];
        langList.appendChild(lang);
    }
    form.appendChild(langList);
    let input = document.createElement('input');
    input.classList = 'spch lang-input';
    form.appendChild(input);
    return form;
}

(function(){
    let wrapper = document.createElement('div');
    wrapper.id = 'spchtrs-viewer';

    let threadContainer = document.createElement('div');
    threadContainer.id = 'spchtrs-threads';
    threadContainer.className = 'threads';
    wrapper.appendChild(threadContainer);

    let footer = document.createElement('div');
    footer.className = 'footer';
    let volumeCell = document.createElement('div');
    volumeCell.classList = 'volumebar gradient-animation-background';
    footer.appendChild(volumeCell);
    wrapper.appendChild(footer);

    inject_html(wrapper);
})();