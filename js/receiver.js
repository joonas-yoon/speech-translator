let viewer = document.getElementById('spchtrs-viewer');
let threadContainer = viewer.querySelector('.threads');

function wrapText(text){
  let t = document.createElement('span');
  t.classList.add('text-bg');
  t.innerHTML = text;
  return t;
}

function addTextItem(text, subtext){
  let item = document.createElement('div');
  item.classList.add('item');

  let text_cont = document.createElement('div');
  text_cont.classList.add('text');
  if (text) text_cont.appendChild(wrapText(text));
  item.appendChild(text_cont);

  let text_cont2 = document.createElement('div');
  text_cont2.classList.add('sub-text');
  if (subtext) text_cont2.appendChild(wrapText(subtext));
  item.appendChild(text_cont2);

  threadContainer.appendChild(item);

  let $threads = $(threadContainer);
  let counts = $threads.find(".item").length;
  if (counts >= 5){
    threadContainer.removeChild(threadContainer.firstChild);
  }

  return new Promise(function(resolve, reject) {
    resolve(item, text, subtext);
  });
}

function requestTranslate(item, text, subtext) {
  let result = 'translated-text';
  let resultText = item.querySelector('.text > span');
  return new Promise(function(resolve, reject) {
    setTimeout(function(){
      resultText.innerText = result;
    }, 2000);
  });
}

function appendResult(results){
  if (!results || !results.length) return;
  results.forEach(function(result, idx){
    let alternatives = result.alternatives || [];
    console.log('[alternatives]', alternatives);
    for(var i = 0; i < alternatives.length; i++){
      let text = alternatives[i].transcript || '';
      let confidence = alternatives[i].confidence || 0.0;
      let confidenceHumanized = Math.round(confidence * 100 * 100) / 100;
      addTextItem('&#8230;', text)
        .then(requestTranslate);
    }
  });

}

// visualiser setup - create web audio api context and canvas
function visualize(percentage){
  let footerContainer = viewer.querySelector('.footer');
  let bar = footerContainer.querySelector('.volumebar');
  bar.style.width = (percentage * 50) + '%';
}

function hideViewer(){
  $(viewer).fadeOut();
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
      showViewer();
    } else if (msg.method === 'hideViewer') {
      hideViewer();
    } else if (msg.method === 'visualize') {
      visualize(msg.avgDecibel);
    } else if (msg.method === 'recognize') {
      appendResult(msg.results);
    }
  });
})();