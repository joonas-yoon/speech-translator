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

    let helper = document.createElement('div');
    helper.className = 'helper';
    let langs = ['Arabic', 'Chinese', 'Danish', 'Dutch', 'English', 'French', 'German', 'Greek', 'Hungarian', 'Italian', 'Japanese', 'Korean', 'Lithuanian', 'Persian', 'Polish', 'Portuguese', 'Russian', 'Spanish', 'Swedish', 'Turkish', 'Vietnamese'];
    let form1 = create_selectbox('form1', langs);
    let form2 = create_selectbox('form2', langs);
    let arrow = document.createElement('div');
    arrow.style.display = 'inline-block';
    arrow.style.margin = '0 1rem';
    arrow.innerHTML = '&#8594;';
    helper.appendChild(form1);
    helper.appendChild(arrow);
    helper.appendChild(form2);

    wrapper.appendChild(helper);

    inject_html(wrapper);
})();