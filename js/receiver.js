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

  const player = document.getElementById('player');
  player.srcObject = null;
  const tracks = window.currentStream.getTracks();
  for (let i = 0; i < tracks.length; ++i) {
    tracks[i].stop();
  }
  window.currentStream = null;

  document.body.className = 'shutdown';
}

function init() {
  // Add onended event listeners. This detects when tab capture was shut down by
  // closing the tab being captured.
  const tracks = window.currentStream.getTracks();
  for (var i = 0; i < tracks.length; ++i) {
    tracks[i].addEventListener('ended', function() {
      console.log('MediaStreamTrack[' + i + '] ended, shutting down...');
      shutdownReceiver();
    });
  }

  window.remote_host = 'http://speechtranslator.net/api';

  ping();
  init_streamer();

  // will be expired on 2019-07-15
  $('#modal_endup').modal('show');
}

window.addEventListener('load', init);

// Shutdown when the receiver page is closed.
window.addEventListener('beforeunload', shutdownReceiver);

// forked from https://github.com/mdn/web-dictaphone
function init_streamer() {
  // set up basic variables for app

  const mainButton = document.getElementById('btn_main');
  const btn_record = document.querySelector('.btn_record');
  const btn_stop = document.querySelector('.btn_stop');
  const canvas = document.querySelector('.visualizer');
  const mainSection = document.querySelector('.main-controls');
  const audioLive = document.getElementById('player');
  const resultContainer = document.getElementById('results');
  const loadingSpinner = document.getElementById('loading_spinner');

  const random_id = get_random_hash();
  let timer = null;
  let enable = false;

  // audio player setup

  audioLive.addEventListener('canplay', function() {
    this.volume = 1.0;
    this.muted = false;
    this.play();
  });

  // disable stop button while not recording

  btn_stop.disabled = true;

  // visualiser setup - create web audio api context and canvas

  const audioCtx = new (window.AudioContext || webkitAudioContext)();
  const canvasCtx = canvas.getContext('2d');

  // main block for doing the audio recording

  if (navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia supported.');

    let chunks = [];

    const processStream = function(stream) {
      const mediaRecorder = new MediaRecorder(stream);

      visualize(stream);

      btn_record.onclick = function() {
        if (!enable) return;

        mediaRecorder.start();
        console.log(mediaRecorder.state);
        // console.log("recorder started");
        btn_record.style.background = 'red';

        btn_stop.disabled = false;
        btn_record.disabled = true;
      };

      btn_stop.onclick = function() {
        mediaRecorder.stop();
        console.log(mediaRecorder.state);
        // console.log("recorder stopped");
        btn_record.style.background = '';
        btn_record.style.color = '';
        // mediaRecorder.requestData();

        btn_stop.disabled = true;
        btn_record.disabled = false;
      };

      mediaRecorder.onstart = function(e) {
        active_loader(true);
      };

      mediaRecorder.onstop = function(e) {
        // console.log("data available after MediaRecorder.stop() called.");

        const container = document.createElement('div');
        const clipContainer = document.createElement('div');
        const revertContainer = document.createElement('div');
        const audio = document.createElement('audio');
        const buttonGroup = document.createElement('div');
        const revertButton = document.createElement('a');
        const playButton = document.createElement('a');
        const deleteButton = document.createElement('a');

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
        const blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'});
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        // console.log("recorder stopped");

        playButton.addEventListener('click', function(e) {
          $(audio).toggleClass('hidden');
        });

        deleteButton.addEventListener('click', function(e) {
          const evtTgt = e.target;
          const container = evtTgt.parentNode.parentNode;
          $(container).transition('fade left');
          $(container.parentNode).find('.revert').transition('fade left');
        });

        revertButton.addEventListener('click', function(e) {
          const evtTgt = e.target;
          const container = evtTgt.parentNode;
          console.log(container);
          console.log(container.parentNode);
          console.log(container.parentNode.parentNode);
          $(container).transition('fade left');
          $(container.parentNode).find('.segment').transition('fade left');
        });

        send_audio(clipContainer, blob);
      };

      mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
      };

      mainButton.onclick = function(e) {
        if (this.classList.contains('start')) {
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
      };
    };

    processStream(window.currentStream);

    // audio player setup
    audioLive.setAttribute('controls', 'true');
    audioLive.srcObject = window.currentStream;
    audioLive.play();
  } else {
    console.log('getUserMedia not supported on your browser!');
  }

  function send_audio(container, audio) {
    const fileData = new FormData();
    fileData.append('audio', audio);
    fileData.append('filename', get_current_clipname());

    const langcode = $('#src_lang').dropdown('get value') || 'en-US';
    fileData.append('langcode', langcode);

    $.ajax({
      url: window.remote_host + '/app/collect',
      type: 'post',
      data: fileData,
      processData: false,
      contentType: false,
    }).done(function(response) {
      post_recognize(container, response);
    });
  }

  function post_recognize(container, response) {
    if (!response.hasOwnProperty('results') || !response.results.length) {
      container.remove();
      active_loader(false);
    } else {
      const view_type = $('input[name=result_view_type]').val() || 'b';
      container.classList.add('type_' + view_type);
      container.parentNode.style.display = 'block';
      response.results.forEach(function(result, idx) {
        const alternatives = result.alternatives || [];
        console.log('[alternatives]', alternatives);
        for (let i=0; i<alternatives.length; i++) {
          append_result(container, alternatives[i], view_type);
        }
      });
    }
  }

  function append_result(container, alternative, view_type) {
    const text = alternative.transcript || '';
    const confidence = alternative.confidence || 0.0;

    if (!text) {
      active_loader(false);
      return;
    }

    const res = document.createElement('div');
    const contText = document.createElement('p');
    const contTranslated = document.createElement('p');
    const contDetail = document.createElement('div');
    const contDetailBtn = document.createElement('a');
    const contDetailText = document.createElement('div');

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
      get_yyyymmddhis(),
    ].join('<br>');

    contDetail.appendChild(contDetailBtn);
    contDetail.appendChild(contDetailText);
    res.appendChild(contText);
    res.appendChild(contTranslated);
    res.appendChild(contDetail);
    container.appendChild(res);

    contDetailBtn.addEventListener('click', function(e) {
      const evtTgt = e.target;
      const btn = evtTgt.parentNode;
      const info = btn.parentNode.getElementsByClassName('info')[0];
      btn.style.display = 'none';
      info.style.display = 'block';
    });

    if (view_type != 'a') {
      request_translate(contTranslated, text);
    } else {
      active_loader(false);
    }
  }

  function request_translate(output, text) {
    if (!window.appRunning) {
      active_loader(false);
      return;
    }

    console.log(`[text]: ${text}`);

    $.ajax({
      url: window.remote_host + '/app/translate',
      type: 'post',
      data: JSON.stringify({
        dst_lang: $('#dst_lang').dropdown('get value'),
        src_text: text,
      }),
      processData: false,
      contentType: 'application/json',
    }).done(function(response) {
      console.log('[translated]', response[0], response[1].data);
      output.innerText = response[0];
      active_loader(false);
    });
  }

  function visualize(stream) {
    const source = audioCtx.createMediaStreamSource(stream);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    // analyser.connect(audioCtx.destination);

    draw();

    function draw() {
      WIDTH = canvas.width;
      HEIGHT = canvas.height;

      requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

      canvasCtx.beginPath();

      const sliceWidth = WIDTH * 1.0 / bufferLength;
      let x = 0;


      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * HEIGHT/2;

        if (i === 0) {
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

  function active_loader(val) {
    loadingSpinner.style.display = val ? 'block' : 'none';
  }

  function get_current_clipname() {
    return random_id + '-' + (new Date().getTime());
  }

  function get_random_hash() {
    return Math.random().toString(36).substring(2, 12);
  }

  function do_cycling() {
    if (!window.appRunning) return;

    if (btn_stop.disabled) {
      btn_record.click();
      return setTimeout(do_cycling, 10 * 1000);
    } else {
      btn_stop.click();
      return setTimeout(do_cycling, 10);
    }
  }

  window.onresize = function() {
    canvas.width = mainSection.offsetWidth;
  };

  window.onresize();

  $(document).ready(function() {
    const msg = $('.ui.configuration.message');

    function init_languages(dropdown, default_lang) {
      $.ajax({
        url: window.remote_host + '/app/translate/supports',
        type: 'get',
      }).done(function(response) {
        const langs = [];
        (response || []).forEach(function(e) {
          langs.push({value: e.code, name: e.name});
        });
        dropdown
            .dropdown({values: langs})
            .dropdown('set selected', default_lang)
            .dropdown({
              onChange: function(value, name, $selectedItem) {
                if ($selectedItem.parent().parent().data('type') == 'src') {
                  msg.find('.source').text(name);
                } else {
                  msg.find('.destination').text(name);
                }
                msg.transition('fade in');
              },
            });
      });
    }

    const src_lang = $('#src_lang');
    const dst_lang = $('#dst_lang');

    init_languages(src_lang, 'en');
    init_languages(dst_lang, 'ko');

    $('.ui.message .close').on('click', function() {
      $(this).closest('.message').transition('fade');
    });

    $('.help .label').on('click', function() {
      $('.help.modal').modal('show');
    });

    $('.result_view_type').checkbox({
      onChange: function() {
        $('input[name=result_view_type]').val(this.value);
      },
    });

    $(loadingSpinner).progress({
      loading: true,
    });

    setInterval(function() {
      const el = $(loadingSpinner).find('.bar');
      const color = el.data('color') || 0;
      const colors = ['#d01919', '#fbbd08', '#21ba45', '#2185d0', '#767676'];
      el.css('background-color', colors[color]);
      el.data('color', (color + 1) % colors.length);
    }, 1000);
  });
}

function get_yyyymmddhis() {
  const d = new Date();
  function zf(str) {
    return ('00' + str).slice(-2);
  }
  return [
    d.getFullYear(), zf(d.getMonth()+1), zf(d.getDate()),
  ].join('/')+' '+[
    zf(d.getHours()), zf(d.getMinutes()), zf(d.getSeconds()),
  ].join(':');
}

function ping() {
  $.ajax({
    url: window.remote_host + '/ping',
    type: 'get',
    error: function(xhr, status, error) {
      const modal = $('#modal_notice');
      modal.modal('show');
      active_service(false);
      window.ping = false;
    },
    success: function(response) {
      active_service(true);
      window.ping = true;
    },
  });

  setTimeout(ping, 10 * 1000);
}

function active_service(appRunning) {
  window.appRunning = appRunning || false;
  const mainButton = document.getElementById('btn_main');
  const mainAltButton = document.getElementById('btn_main_disabled');
  mainButton.style.display = appRunning ? 'block' : 'none';
  mainAltButton.style.display = appRunning ? 'none' : 'block';
}
