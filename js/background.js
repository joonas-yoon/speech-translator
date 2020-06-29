const SERVER_HOST = 'http://localhost:3000/api';

function get_random_hash(){
  return Math.random().toString(36).substring(2, 12);
}

function get_current_clipname(){
  return get_random_hash() + "-" + (new Date().getTime());
}

class translator {
  constructor(tab, stream) {
    let self = this;
  
    this.tab = tab;
    this.stream = stream;
    this.visualTimerId = this.visualize();
    
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = function(e) {
      console.log(self.chunks);
      self.chunks.push(e.data);
    }
    
    var audioElement = document.createElement('audio');
    audioElement.setAttribute("preload", "auto");
    audioElement.autobuffer = true;
    audioElement.srcObject = this.stream;
    audioElement.load();
    audioElement.play();
    this.audio = audioElement;

    this.startRecord();
    setTimeout(function(){
      self.stopRecord();
    }, 5000);
    setTimeout(function(){
      self.play();
    }, 8000);
  }

  get active() {
    return this.stream && this.stream.active;
  }

  get state() {
    return this.active && this.mediaRecorder && this.mediaRecorder.state;
  }

  uncapture() {
    clearInterval(this.visualTimerId);
    this.stream.getTracks().forEach(function(track){
      track.stop();
    });
  }

  visualize() {
    var audioCtx = new (window.AudioContext || webkitAudioContext)();
    var source = audioCtx.createMediaStreamSource(this.stream);
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Float32Array(bufferLength);
    source.connect(analyser);

    function requestDraw(self){
      analyser.getFloatTimeDomainData(dataArray);
      const sum = dataArray.reduce((a, b) => Math.abs(a) + Math.abs(b), 0);
      const avg = (sum / dataArray.length) || 0;
      const percentage = Math.max(0, Math.min(1.0, Math.abs(avg * 10)));
      chrome.tabs.sendMessage(self.tab.id, {method: 'visualize', avgDecibel: percentage});
    }
    
    return setInterval(requestDraw.bind(null, this), 200);
  }

  startRecord() {
    console.log('state', this.state);
    this.mediaRecorder.start();
  }

  stopRecord() {
    console.log('state', this.state);
    this.mediaRecorder.stop();
  }

  play() {
    let audio = document.createElement('audio');
    let blob = new Blob(this.chunks, { 'type' : 'audio/ogg; codecs=opus' });
    if (this.chunks.length) {
      this.chunks = [];
      audio.src = window.URL.createObjectURL(blob);
      console.log(audio);
      // audio.play();
      this.requestRecognize(blob);
    }
  }
  
  requestRecognize(audio) {
    let self = this;
    let fileData = new FormData();
    let clipId = get_current_clipname();
    fileData.append('audio', audio);
    fileData.append('filename', clipId);
    
    let langcode = 'en-US';
    fileData.append('langcode', langcode);

    $.ajax({
      url: SERVER_HOST + '/app/collect',
      type: 'post',
      data: fileData,
      processData: false,
      contentType: false
    }).done(function(response){
      chrome.tabs.sendMessage(self.tab.id, {
        method: 'recognize',
        results: response.results || []
      });
      // requestTranslate();
    });
  }

  requestTranslate(clipId, text) {

  }
};

let clients = {};

// Respond to the click on extension Icon
chrome.browserAction.onClicked.addListener(function (tab) {
  console.log(tab, clients);

  // uncapture if already captured
  if (clients[tab.id] && clients[tab.id].active) {
    clients[tab.id].uncapture();
    delete clients[tab.id];
    chrome.tabs.sendMessage(tab.id, {method: 'hideViewer'});
  } else {
    // capture a stream from current tab
    chrome.tabCapture.capture(
      {video: false, audio: true},
      function (stream) {
        if (!stream) {
          console.error('Error starting tab capture: ' +
                (chrome.runtime.lastError.message || 'UNKNOWN'));
          return;
        }

        clients[tab.id] = new translator(tab, stream);
        chrome.tabs.sendMessage(tab.id, {method: 'showViewer'});
      }
    );
  }
});