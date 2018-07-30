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
  // Add onended event listeners. This detects when tab capture was shut down by
  // closing the tab being captured.
  var tracks = window.currentStream.getTracks();
  for (var i = 0; i < tracks.length; ++i) {
    tracks[i].addEventListener('ended', function() {
      console.log('MediaStreamTrack[' + i + '] ended, shutting down...');
      shutdownReceiver();
    });
  }

  init_streamer();
}

window.addEventListener('load', init);

// Shutdown when the receiver page is closed.
window.addEventListener('beforeunload', shutdownReceiver);

// forked from https://github.com/mdn/web-dictaphone
function init_streamer(){
  window.remote_host = 'http://api.speechtranslator.ga:3000';

  // set up basic variables for app

  var mainButton = document.getElementById('btn_main');
  var btn_record = document.querySelector('.btn_record');
  var btn_stop = document.querySelector('.btn_stop');
  var canvas = document.querySelector('.visualizer');
  var mainSection = document.querySelector('.main-controls');
  var audioLive = document.getElementById('player');
  var resultContainer = document.getElementById('results');

  var random_id = Math.random().toString(36).substring(2, 12);

  // audio player setup

  audioLive.addEventListener('canplay', function() {
    this.volume = 1.0;
    this.muted = false;
    this.play();
  });

  // disable stop button while not recording

  btn_stop.disabled = true;

  // visualiser setup - create web audio api context and canvas

  var audioCtx = new (window.AudioContext || webkitAudioContext)();
  var canvasCtx = canvas.getContext("2d");

  // main block for doing the audio recording

  if (navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia supported.');

    var chunks = [];

    var processStream = function (stream) {
      var mediaRecorder = new MediaRecorder(stream);

      visualize(stream);

      btn_record.onclick = function() {
        mediaRecorder.start();
        console.log(mediaRecorder.state);
        console.log("recorder started");
        btn_record.style.background = "red";

        btn_stop.disabled = false;
        btn_record.disabled = true;
      }

      btn_stop.onclick = function() {
        mediaRecorder.stop();
        console.log(mediaRecorder.state);
        console.log("recorder stopped");
        btn_record.style.background = "";
        btn_record.style.color = "";
        // mediaRecorder.requestData();

        btn_stop.disabled = true;
        btn_record.disabled = false;
      }

      mediaRecorder.onstop = function(e) {
        console.log("data available after MediaRecorder.stop() called.");

        var clipContainer = document.createElement('blockquote');
        var clipText = document.createElement('p');
        var clipDetail = document.createElement('footer');
        var audio = document.createElement('audio');
        var playButton = document.createElement('i');
        var deleteButton = document.createElement('i');

        clipContainer.style.display = 'none';
        audio.style.display = 'none';

        clipContainer.className = 'blockquote';
        clipDetail.className = 'blockquote-footer';
        clipText.className = 'text';
        audio.setAttribute('controls', '');
        playButton.className = 'fas fa-headphones';
        deleteButton.className = 'fas fa-trash-alt';

        clipContainer.appendChild(audio);
        clipContainer.appendChild(clipText);
        clipContainer.appendChild(clipDetail);
        clipContainer.appendChild(playButton);
        clipContainer.appendChild(deleteButton);
        resultContainer.appendChild(clipContainer);

        audio.controls = true;
        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
        chunks = [];
        var audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped");

        playButton.addEventListener('click', function(e){
          audio.style.display = 'block';
        });

        deleteButton.addEventListener('click', function(e){
          evtTgt = e.target;
          evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
        });

        send_audio(clipContainer, blob);
      }

      mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
      }
    }

    processStream(window.currentStream);

    // audio player setup
    audioLive.setAttribute('controls', 'true');
    audioLive.srcObject = window.currentStream;
    audioLive.play();

  } else {
     console.log('getUserMedia not supported on your browser!');
  }

  function send_audio(container, audio){
    var fileData = new FormData();
    fileData.append('audio', audio);
    fileData.append('filename', get_current_clipname());
    fileData.append('langcode', 'en-US');

    $.ajax({
      url: window.remote_host + '/collect',
      type: 'post',
      data: fileData,
      processData: false,
      contentType: false
    }).done(function(response){
      post_recognize(container, response);
    });
  }

  function post_recognize(container, response){
    if (!response.hasOwnProperty('results') || !response.results.length) {
      container.remove();
      return;
    }

    var results = response.results;
    container.style.display = 'block';
    for (var i in results){
      if (results.hasOwnProperty(i)) {
        var alternatives = results[i].alternatives || Array();
        var average_conf = 0.0;
        console.log('[alternatives]', alternatives);
        for (var i=0; i < alternatives.length; i++){
          var text = alternatives[i].transcript;
          if (!text) continue;

          var confidence = alternatives[i].confidence || 0.0;
          var quote = container.querySelector('.text');
          quote.innerText += (i > 0 ? '<br>' : '') + text;

          var detail = container.querySelector('.blockquote-footer');
          average_conf = (average_conf * i + confidence) / (i + 1.);
          detail.innerText = (Math.round(average_conf * 100 * 100)/100) + '%';

          var translated = document.createElement('i');
          translated.className = 'translated';
          quote.appendChild(translated);
          request_translate(translated, text);
        }
      }
    }

    scrollDownTo(resultContainer);
  }

  function request_translate(output, text){
    console.log(`[text]: ${text}`);

    $.ajax({
      url: window.remote_host + '/translate',
      type: 'post',
      data: JSON.stringify({
        dst_lang: 'ko',
        src_text: text
      }),
      processData: false,
      contentType: 'application/json'
    }).done(function(response){
      output.innerHTML += '<br>' + response[0];
      scrollDownTo(resultContainer);
    });
  }

  function visualize(stream) {
    var source = audioCtx.createMediaStreamSource(stream);

    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    //analyser.connect(audioCtx.destination);

    draw();

    function draw() {
      WIDTH = canvas.width
      HEIGHT = canvas.height;

      requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;


      for(var i = 0; i < bufferLength; i++) {
   
        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();

    }
  }

  function scrollDownTo(el){
    window.scrollTo(0, el.scrollHeight);
  }

  function get_current_clipname(){
    return random_id + "-" + (new Date().getTime());
  }

  (function do_cycling(){
    if(!!btn_stop.disabled){
      btn_record.click();
      setTimeout(do_cycling, 10 * 1000);
    }
    else {
      btn_stop.click();
      setTimeout(do_cycling, 10);
    }
  })();

  window.onresize = function() {
    canvas.width = mainSection.offsetWidth;
  };

  window.onresize();
}