let viewer = document.getElementById('spchtrs-viewer');
let threadContainer = viewer.querySelector('.threads');

function addText(text){
  let item = document.createElement('div');
  item.classList.add('item');

  function wrapText(text){
    let t = document.createElement('span');
    t.classList.add('text-bg');
    t.innerHTML = text;
    return t;
  }

  let text_cont = document.createElement('div');
  text_cont.classList.add('text');
  text_cont.appendChild(wrapText(text));
  item.appendChild(text_cont);

  let text_cont2 = document.createElement('div');
  text_cont2.classList.add('sub-text');
  text_cont2.appendChild(wrapText('hello'));
  item.appendChild(text_cont2);

  threadContainer.appendChild(item);

  let $threads = $(threadContainer);
  let counts = $threads.find(".item").length;
  if (counts >= 5){
    threadContainer.removeChild(threadContainer.firstChild);
  }
}

// visualiser setup - create web audio api context and canvas
function visualize(percentage){
  let footerContainer = viewer.querySelector('.footer');
  let bar = footerContainer.querySelector('.volumebar');
  bar.style.width = (percentage * 50) + '%';
}

function hideViewer(){
  // $(viewer).fadeOut();
}

function showViewer(){
  $(viewer).fadeIn();
}

(function ping() {
  // Listen for messages
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (chrome.runtime.lastError) {
      setTimeout(ping, 100);
      return;
    }

    if (msg.method === 'showViewer') {
      let str = Math.random().toString(36).substring(2);
      addText(str);
      showViewer();
    } else if (msg.method === 'hideViewer') {
      hideViewer();
    } else if (msg.method === 'visualize') {
      visualize(msg.avgDecibel);
    }
  });
})();