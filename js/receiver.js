let viewer = document.getElementById('spchtrs-viewer');
let threadContainer = viewer.querySelector('#spchtrs-threads');

function getRandomHash(){
  return Math.random().toString(36).substring(2, 12);
}

function createText(text){
  let t = document.createElement('span');
  t.classList.add('text-bg');
  t.innerHTML = text;
  return t;
}

function setText(id, text){
  let t = document.getElementById(id);
  if (!t) return false;
  let wrapper = t.querySelector('.text > span');
  wrapper.innerHTML = text;
  return true;
}

function addTextItem(text, subtext){
  let item = document.createElement('div');
  item.classList.add('item');
  item.id = getRandomHash();

  let text_cont = document.createElement('div');
  text_cont.classList.add('text');
  if (text) text_cont.appendChild(createText(text));
  item.appendChild(text_cont);

  let text_cont2 = document.createElement('div');
  text_cont2.classList.add('sub-text');
  if (subtext) text_cont2.appendChild(createText(subtext));
  item.appendChild(text_cont2);

  threadContainer.appendChild(item);

  let $threads = $(threadContainer);
  let counts = $threads.find(".item").length;
  if (counts >= 5){
    threadContainer.removeChild(threadContainer.firstChild);
  }

  return new Promise(function(resolve, reject) {
    resolve({itemId: item.id, text: subtext});
  });
}

async function appendResult(results, sendResponse){
  if (!results || !results.length) return;
  let transcripts = [];
  for (const result of results) {
    let alternatives = result.alternatives || [];
    // console.log('[alternatives]', alternatives);
    for (const alter of alternatives) {
      let text = alter.transcript || '';
      let confidence = alter.confidence || 0.0;
      let confidenceHumanized = Math.round(confidence * 100 * 100) / 100;
      await addTextItem('&#8230;', text)
        .then((item) => {
          transcripts.push(item);
        });
    }
  }
  sendResponse(transcripts);
}

// visualiser setup - create web audio api context and canvas
function visualize(percentage){
  let footerContainer = viewer.querySelector('.footer');
  let bar = footerContainer.querySelector('.volumebar');
  bar.style.width = (percentage * 50) + '%';
}

function hideViewer(){
  $(viewer).fadeOut();
  chrome.runtime.sendMessage({msg: 'stop'});
}

function showViewer(){
  $(viewer).fadeIn();
  chrome.runtime.sendMessage({msg: 'start'});
}

(function ping() {
  // Listen for messages
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (chrome.runtime.lastError) {
      setTimeout(ping, 100);
      return;
    }

    if (msg.method === 'showViewer') {
      showViewer();
    } else if (msg.method === 'hideViewer') {
      hideViewer();
    } else if (msg.method === 'visualize') {
      visualize(msg.avgDecibel);
    } else if (msg.method === 'recognize') {
      appendResult(msg.results, sendResponse);
    } else if (msg.method === 'message') {
      if (!setText(msg.itemId, msg.text)) {
        addTextItem('&#8230;', msg.text);
      }
    }
  });
})();

// when page refreshed, display needs to sync up
chrome.runtime.sendMessage({msg: 'display'}, function (isDisplayed) {
  if (isDisplayed) {
    showViewer();
  } else {
    hideViewer();
  }
});

// make element draggable
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  var oldmouseup, oldmousemove;

  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    if (oldmouseup === undefined) oldmouseup = document.onmouseup;
    if (onmousemove === undefined) oldmouseup = document.onmousemove;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
    elmnt.dragged = true;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = oldmouseup;
    document.onmousemove = onmousemove;
    oldmouseup = undefined;
    oldmousemove = undefined;
  }
}

// absolutely center positioned
(function centering(){
  if (threadContainer.dragged) return;
  threadContainer.style.left = 'calc(50% - ' + (threadContainer.offsetWidth / 2) + 'px)';
  setTimeout(centering, 100);
})();

dragElement(threadContainer);