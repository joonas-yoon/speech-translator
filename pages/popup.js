var storage = chrome.storage.sync;

var message = document.querySelector('#message');

let btn_start = document.getElementById('btn-start');
let btn_stop = document.getElementById('btn-stop');

storage.get('button', (result) => {
  if (!result.button) {
    setButton('ready');
  }
});

function setButton(newButtonState){
  storage.set({button: newButtonState}, sync);
}

function sync() {
  storage.get('button', (result) => {
    if (result.button === 'active') {
      btn_start.style.display = 'none';
      btn_stop.style.display = 'initial';
    } else {
      btn_stop.style.display = 'none';
      btn_start.style.display = 'initial';
    }
    setTimeout(sync, 200);
  });
}

// init button events
btn_start.onclick = function(e){
  setButton('active');
  return false;
};

btn_stop.onclick = function(e){
  setButton('ready');
  return false;
};

(function(){
  var optionsUrl = chrome.extension.getURL('pages/options.html');
  message.innerHTML = 'Set a style in the <a target="_blank" href="' +
      optionsUrl + '">options page</a> first.';
  sync();
})();