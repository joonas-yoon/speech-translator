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

    let helpbutton = document.createElement('div');
    helpbutton.className = 'helper';
    helpbutton.style.backgroundImage = 'url(' + chrome.extension.getURL('icon128.png') + ')';
    wrapper.appendChild(helpbutton);

    inject_html(wrapper);
})();