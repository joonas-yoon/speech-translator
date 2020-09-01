'use strict';

const API_URL = 'http://localhost/api';

function getRandomHash() {
  return Math.random().toString(36).substring(2, 12);
}

function getCurrentClipname() {
  return getRandomHash() + '-' + new Date().getTime();
}

function getOptions(callback) {
  chrome.storage.local.get('options', function (item) {
    callback(item.options || {});
  });
}

function errorMessage(tabId, itemId, msg) {
  chrome.tabs.sendMessage(tabId, {
    method: 'message',
    itemId: itemId,
    text: '<i>[' + msg + ']</i>',
  });
}

class Translator {
  constructor(tab, stream) {
    const self = this;

    this.tab = tab;
    this.stream = stream;
    this.visualTimerId = this.visualize();

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = function (e) {
      self.chunks.push(e.data);
    };

    const audioElement = document.createElement('audio');
    audioElement.setAttribute('preload', 'auto');
    audioElement.autobuffer = true;
    audioElement.srcObject = this.stream;
    audioElement.load();
    audioElement.play();
    this.audio = audioElement;

    this.appRunning = false;
  }

  get active() {
    return this.stream && this.stream.active;
  }

  get state() {
    return this.active && this.mediaRecorder && this.mediaRecorder.state;
  }

  uncapture() {
    clearInterval(this.visualTimerId);
    this.stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  visualize() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(this.stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    source.connect(analyser);

    function requestDraw(self) {
      analyser.getFloatTimeDomainData(dataArray);
      const sum = dataArray.reduce((a, b) => Math.abs(a) + Math.abs(b), 0);
      const avg = sum / dataArray.length || 0;
      const percentage = Math.max(0, Math.min(1.0, Math.abs(avg * 10)));
      chrome.tabs.sendMessage(self.tab.id, {
        method: 'visualize',
        avgDecibel: percentage,
      });
    }

    return setInterval(requestDraw.bind(null, this), 200);
  }

  startRecord() {
    const self = this;
    const prevState = this.state;
    this.mediaRecorder.start();
    console.log('state: ', prevState, '->', this.state);
    setTimeout(function () {
      if (self.appRunning) {
        self.stopRecord();
      }
    }, 10 * 1000);
  }

  stopRecord() {
    const prevState = this.state;
    this.mediaRecorder.stop();
    console.log('state: ', prevState, '->', this.state);
    this.play();
    if (this.appRunning) {
      this.startRecord();
    }
  }

  play() {
    const audio = document.createElement('audio');
    const blob = new Blob(this.chunks, { type: 'audio/ogg; codecs=opus' });
    if (this.chunks.length) {
      this.chunks = [];
      audio.src = window.URL.createObjectURL(blob);
      console.log(audio);
      // audio.play();
      this.requestRecognize(blob);
    }
  }

  start() {
    this.appRunning = true;
    this.startRecord();
  }

  stop() {
    this.appRunning = false;
    this.stopRecord();
  }

  requestRecognize(audio) {
    const self = this;
    const fileData = new FormData();
    const clipId = getCurrentClipname();
    fileData.append('audio', audio);
    fileData.append('filename', clipId);
    getOptions(function (options) {
      fileData.append('langcode', options.srcLangCode);
      $.ajax({
        url: API_URL + '/app/collect',
        type: 'post',
        data: fileData,
        processData: false,
        contentType: false,
      })
        .done(function (response) {
          if (response && response.results.length) {
            console.log('response.results', response.results);
            chrome.tabs.sendMessage(
              self.tab.id,
              {
                method: 'recognize',
                results: response.results || [],
              },
              async function (resp) {
                for (const res of resp) {
                  await self.requestTranslate(res);
                }
              }
            );
          }
        })
        .fail(function (xhr, status, errorThrown) {
          errorMessage(
            self.tab.id,
            clipId,
            `${xhr.statusText} - ${xhr.status}`
          );
        });
    });
  }

  async requestTranslate(response) {
    if (!response || Object.keys(response).length === 0) return;
    const self = this;
    const itemId = response.itemId;
    const text = response.text;

    await getOptions(function (options) {
      console.log(
        `[src: ${options.srcLangCode}/${options.srcLangName}] -> [dst: ${options.dstLangCode}/${options.dstLangName}]`
      );
      $.ajax({
        url: API_URL + '/app/translate',
        type: 'post',
        data: JSON.stringify({
          src_lang: options.srcLangCode || 'en',
          dst_lang: options.dstLangCode || 'ko',
          src_text: text,
        }),
        processData: false,
        contentType: 'application/json',
      })
        .done(function (translatedResult) {
          let translatedText = '';
          if (translatedResult) {
            translatedText = translatedResult[0];
            console.log(`[${options.srcLangName}]: ${text}`);
            console.log(`[${options.dstLangName}]: ${translatedText}`);
          }
          chrome.tabs.sendMessage(self.tab.id, {
            method: 'message',
            itemId: itemId,
            text: translatedText,
          });
        })
        .fail(function (xhr, status, errorThrown) {
          errorMessage(
            self.tab.id,
            response.itemId,
            `${xhr.statusText} - ${xhr.status}`
          );
        });
    });
  }
}

const clients = {};

// Respond to the click on extension Icon
chrome.browserAction.onClicked.addListener(function (tab) {
  console.log(tab, clients);

  // uncapture if already captured
  if (clients[tab.id] && clients[tab.id].active) {
    clients[tab.id].uncapture();
    delete clients[tab.id];
    chrome.tabs.sendMessage(tab.id, { method: 'hideViewer' });
  } else {
    // capture a stream from current tab
    chrome.tabCapture.capture({ video: false, audio: true }, function (stream) {
      if (!stream) {
        console.error(
          'Error starting tab capture: ' +
            (chrome.runtime.lastError.message || 'UNKNOWN')
        );
        return;
      }

      clients[tab.id] = new Translator(tab, stream);
      chrome.tabs.sendMessage(tab.id, { method: 'showViewer' });
    });
  }
});

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
  if (!clients[sender.tab.id]) {
    console.log('No client connected');
    return;
  }
  if (data.msg === 'start') {
    clients[sender.tab.id].start();
    sendResponse(true);
  } else if (data.msg === 'stop') {
    clients[sender.tab.id].stop();
    sendResponse(true);
  } else if (data.msg === 'display') {
    sendResponse(clients[sender.tab.id] !== undefined);
  }
});
