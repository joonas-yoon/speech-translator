// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Note: |window.currentStream| was set in background.js.

// Stop video play-out, stop the MediaStreamTracks, and set style class to
// 'shutdown'.
function shutdownReceiver() {
  if (!window.currentStream) {
    return;
  }

  var player = document.getElementById('player');
  player.srcObject = null;
  var tracks = window.currentStream.getTracks();
  for (var i = 0; i < tracks.length; ++i) {
    tracks[i].stop();
  }
  window.currentStream = null;

  document.body.className = 'shutdown';
}

function init() {
  init_connection();
  init_player();
}

window.addEventListener('load', init);

// Shutdown when the receiver page is closed.
window.addEventListener('beforeunload', shutdownReceiver);


function init_player() {
  // Start video play-out of the captured audio/video MediaStream once the page
  // has loaded.
  var player = document.getElementById('player');
  player.addEventListener('canplay', function() {
    this.volume = 0.75;
    this.muted = false;
    this.play();
  });
  player.setAttribute('controls', '1');
  player.srcObject = window.currentStream;

  // Add onended event listeners. This detects when tab capture was shut down by
  // closing the tab being captured.
  var tracks = window.currentStream.getTracks();
  for (var i = 0; i < tracks.length; ++i) {
    tracks[i].addEventListener('ended', function() {
      console.log('MediaStreamTrack[' + i + '] ended, shutting down...');
      shutdownReceiver();
    });
  }
}

function init_connection(){
  var socket = io.connect('http://13.209.124.153:8080', { transports: ['websocket'] });
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onError);
  socket.on('reconnect_error', onError);

  socket.on('counter', onMessage);

  function onConnect(evt) {
      logging('<span style="color: green;">Connected!</span>');
      sendMessage('hello?');
  }

  function onDisconnect(evt) {
      logging('<span style="color: red;">Disconnected.</span>');
  }

  function onMessage(data) {
      logging('<span style="color: blue;">RESPONSE: ' + data+'</span>');
  }

  function onError(message) {
      logging('<span style="color: red;">ERROR:</span> ' + message);
  }

  function sendMessage(message) {
      logging('MESSAGE: ' + message);
  }

  function logging(message){
    var output = document.getElementById('log');
    var pre = document.createElement('p');
    pre.style.wordWrap = 'break-word';
    pre.innerHTML = message;
    output.appendChild(pre);
  }
}