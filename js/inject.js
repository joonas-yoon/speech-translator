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
    threadContainer.className = 'threads';
    wrapper.appendChild(threadContainer);

    let footer = document.createElement('div');
    footer.className = 'footer';
    let volumeCell = document.createElement('div');
    volumeCell.classList = 'volumebar';
    footer.appendChild(volumeCell);
    wrapper.appendChild(footer);

    inject_html(wrapper);
})();