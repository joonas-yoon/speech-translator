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
  
  window.remote_host = 'http://speechtranslator.net/api';

  ping();
  init_streamer();
}

window.addEventListener('load', init);

// Shutdown when the receiver page is closed.
window.addEventListener('beforeunload', shutdownReceiver);

// forked from https://github.com/mdn/web-dictaphone
function init_streamer(){
  // set up basic variables for app

  var mainButton = document.getElementById('btn_main');
  var btn_record = document.querySelector('.btn_record');
  var btn_stop = document.querySelector('.btn_stop');
  var canvas = document.querySelector('.visualizer');
  var mainSection = document.querySelector('.main-controls');
  var audioLive = document.getElementById('player');
  var resultContainer = document.getElementById('results');
  var loadingSpinner = document.getElementById('loading_spinner');

  var random_id = get_random_hash();
  var timer = null;
  var enable = false;

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
        if (!enable) return;

        mediaRecorder.start();
        console.log(mediaRecorder.state);
        // console.log("recorder started");
        btn_record.style.background = "red";

        btn_stop.disabled = false;
        btn_record.disabled = true;
      }

      btn_stop.onclick = function() {
        mediaRecorder.stop();
        console.log(mediaRecorder.state);
        // console.log("recorder stopped");
        btn_record.style.background = "";
        btn_record.style.color = "";
        // mediaRecorder.requestData();

        btn_stop.disabled = true;
        btn_record.disabled = false;
      }

      mediaRecorder.onstart = function(e) {
        active_loader(true);
      }

      mediaRecorder.onstop = function(e) {
        // console.log("data available after MediaRecorder.stop() called.");

        var container = document.createElement('div');
        var clipContainer = document.createElement('div');
        var revertContainer = document.createElement('div');
        var audio = document.createElement('audio');
        var buttonGroup = document.createElement('div');
        var revertButton = document.createElement('a');
        var playButton = document.createElement('a');
        var deleteButton = document.createElement('a');

        container.style.display = 'none';

        container.className = 'result';
        clipContainer.className = 'ui stacked segment';
        revertContainer.className = 'revert';
        audio.setAttribute('controls', '');
        audio.className = 'hidden';
        buttonGroup.className = 'actions';
        playButton.className = 'ui action blue play small label';
        deleteButton.className = 'ui action red delete small label';
        revertButton.className = 'btn';

        playButton.innerHTML = '<i class="play fas fa-headphones"></i> &nbsp; 다시 듣기';
        deleteButton.innerHTML = '<i class="delete fas fa-trash-alt"></i> &nbsp; 기록 지우기';
        revertButton.innerHTML = '<i class="fas fa-undo"></i> &nbsp; 실행 취소';

        clipContainer.appendChild(audio);
        buttonGroup.appendChild(playButton);
        buttonGroup.appendChild(deleteButton);
        clipContainer.appendChild(buttonGroup);
        revertContainer.appendChild(revertButton);
        container.appendChild(clipContainer);
        container.appendChild(revertContainer);
        $(resultContainer).prepend(container);

        audio.controls = true;
        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
        chunks = [];
        var audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        // console.log("recorder stopped");

        playButton.addEventListener('click', function(e){
          $(audio).toggleClass('hidden');
        });

        deleteButton.addEventListener('click', function(e){
          var evtTgt = e.target;
          var container = evtTgt.parentNode.parentNode;
          $(container).transition('fade left');
          $(container.parentNode).find('.revert').transition('fade left');
        });

        revertButton.addEventListener('click', function(e){
          var evtTgt = e.target;
          var container = evtTgt.parentNode;
          console.log(container);
          console.log(container.parentNode);
          console.log(container.parentNode.parentNode);
          $(container).transition('fade left');
          $(container.parentNode).find('.segment').transition('fade left');
        });

        send_audio(clipContainer, blob);
      }

      mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
      }

      mainButton.onclick = function(e) {
        if(this.classList.contains('start')){
          enable = true;
          this.classList.add('stop');
          this.classList.add('red');
          this.classList.remove('start');
          this.classList.remove('primary');
          timer = do_cycling();
        } else {
          enable = false;
          this.classList.remove('stop');
          this.classList.remove('red');
          this.classList.add('start');
          this.classList.add('primary');
          clearTimeout(timer);
        }
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

    var langcode = $("#src_lang").dropdown('get value') || 'en-US';
    fileData.append('langcode', langcode);

    $.ajax({
      url: window.remote_host + '/app/collect',
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
      active_loader(false);
    } else {
      var view_type = $("input[name=result_view_type]").val() || 'b';
      container.classList.add('type_' + view_type);
      container.parentNode.style.display = 'block';
      response.results.forEach(function(result, idx){
        var alternatives = result.alternatives || [];
        console.log('[alternatives]', alternatives);
        for(var i=0; i<alternatives.length; i++){
          append_result(container, alternatives[i], view_type);
        }
      });
    }
  }

  function append_result(container, alternative, view_type){
    var text = alternative.transcript || '';
    var confidence = alternative.confidence || 0.0;

    if (!text) {
      active_loader(false);
      return;
    }

    var res = document.createElement('div');
    var contText = document.createElement('p');
    var contTranslated = document.createElement('p');
    var contDetail = document.createElement('div');
    var contDetailBtn = document.createElement('a');
    var contDetailText = document.createElement('div');

    res.className = 'phrase';
    res.id = get_random_hash();
    contText.className = 'text';
    contTranslated.className = 'translated';
    contDetail.className = 'detail';
    contDetailBtn.className = 'btn';
    contDetailText.className = 'info';

    contText.innerText = text;
    contDetailBtn.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
    contDetailText.innerHTML = [
      '인식률: ' + (Math.round(confidence * 100 * 100)/100) + '%',
      get_yyyymmddhis()
    ].join('<br>');

    contDetail.appendChild(contDetailBtn);
    contDetail.appendChild(contDetailText);
    res.appendChild(contText);
    res.appendChild(contTranslated);
    res.appendChild(contDetail);
    container.appendChild(res);

    contDetailBtn.addEventListener('click', function(e){
      var evtTgt = e.target;
      var btn = evtTgt.parentNode;
      var info = btn.parentNode.getElementsByClassName('info')[0];
      btn.style.display = 'none';
      info.style.display = 'block';
    });

    if (view_type != 'a') {
      request_translate(contTranslated, text);
    } else {
      active_loader(false);
    }
  }

  function request_translate(output, text){
    if (!window.appRunning) {
      active_loader(false);
      return;
    }

    console.log(`[text]: ${text}`);

    $.ajax({
      url: window.remote_host + '/app/translate',
      type: 'post',
      data: JSON.stringify({
        dst_lang: $("#dst_lang").dropdown('get value'),
        src_text: text
      }),
      processData: false,
      contentType: 'application/json'
    }).done(function(response){
      console.log('[translated]', response[0], response[1].data);
      output.innerText = response[0];
      active_loader(false);
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
  
  function active_loader(val){
    loadingSpinner.style.display = val ? 'block' : 'none';
  }

  function get_current_clipname(){
    return random_id + "-" + (new Date().getTime());
  }

  function get_random_hash(){
    return Math.random().toString(36).substring(2, 12);
  }

  function do_cycling(){
    if(!window.appRunning) return;

    if(!!btn_stop.disabled){
      btn_record.click();
      return setTimeout(do_cycling, 10 * 1000);
    }
    else {
      btn_stop.click();
      return setTimeout(do_cycling, 10);
    }
  }

  window.onresize = function() {
    canvas.width = mainSection.offsetWidth;
  };

  window.onresize();

  $(document).ready(function(){
    var msg = $('.ui.configuration.message');

    function init_languages(dropdown, default_lang){
      $.ajax({
        url: window.remote_host + '/app/translate/supports',
        type: 'get'
      }).done(function(response){
        var langs = [];
        (response || []).forEach(function(e){
          langs.push({value: e.code, name: e.name});
        });
        dropdown
          .dropdown({values: langs})
          .dropdown('set selected', default_lang)
          .dropdown({
            onChange: function(value, name, $selectedItem) {
              if($selectedItem.parent().parent().data('type') == 'src'){
                msg.find('.source').text(name);
              } else {
                msg.find('.destination').text(name);
              }
              msg.transition('fade in');
            }
          });
      });
    }

    var src_lang = $("#src_lang");
    var dst_lang = $("#dst_lang");

    init_languages(src_lang, 'en');
    init_languages(dst_lang, 'ko');

    $('.ui.message .close').on('click', function() {
      $(this).closest('.message').transition('fade');
    });

    $(".help .label").on('click', function() {
      $('.help.modal').modal('show');
    });

    $(".result_view_type").checkbox({
      onChange: function(){
        $("input[name=result_view_type]").val(this.value);
      }
    })

    $(loadingSpinner).progress({
      loading: true
    });

    setInterval(function(){
      var el = $(loadingSpinner).find('.bar');
      var color = el.data('color') || 0;
      var colors = ['#d01919', '#fbbd08', '#21ba45', '#2185d0', '#767676'];
      el.css('background-color', colors[color]);
      el.data('color', (color + 1) % colors.length);
    }, 1000);
  });
}

function get_yyyymmddhis(){
  var d = new Date();
  function zf(str){
    return ("00" + str).slice(-2);
  }
  return [
    d.getFullYear(), zf(d.getMonth()+1), zf(d.getDate())
  ].join('/')+' '+[
    zf(d.getHours()), zf(d.getMinutes()), zf(d.getSeconds())
  ].join(':');
}

function ping(){
  $.ajax({
    url: window.remote_host + '/ping',
    type: 'get',
    error: function(xhr, status, error){
      var modal = $("#modal_notice");
      modal.modal('show');
      active_service(false);
      window.ping = false;
    },
    success: function(response){
      active_service(true);
      window.ping = true;
    }
  });

  setTimeout(ping, 10 * 1000);
}

function active_service(appRunning){
  window.appRunning = appRunning || false;
  var mainButton = document.getElementById('btn_main');
  var mainAltButton = document.getElementById('btn_main_disabled');
  mainButton.style.display = appRunning ? 'block' : 'none';
  mainAltButton.style.display = appRunning ? 'none' : 'block';
}