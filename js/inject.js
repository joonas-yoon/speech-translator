function injectHtml(node) {
  document.getElementsByTagName('body')[0].appendChild(node);
}

(function () {
  const wrapper = document.createElement('div');
  wrapper.id = 'spchtrs-viewer';

  const threadContainer = document.createElement('div');
  threadContainer.id = 'spchtrs-threads';
  threadContainer.className = 'threads';
  wrapper.appendChild(threadContainer);

  const footer = document.createElement('div');
  footer.className = 'footer';
  const volumeCell = document.createElement('div');
  volumeCell.classList = 'volumebar gradient-animation-background';
  footer.appendChild(volumeCell);
  wrapper.appendChild(footer);

  injectHtml(wrapper);
})();
