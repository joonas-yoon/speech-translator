// stream.js
// forked from https://github.com/mdn/web-dictaphone

function initialize(){
  // set up basic variables for app

  var host = '<your_host:port>';

  var btn_record = document.querySelector('.btn_record');
  var btn_stop = document.querySelector('.btn_stop');
  var soundClips = document.querySelector('.sound-clips');
  var canvas = document.querySelector('.visualizer');
  var mainSection = document.querySelector('.main-controls');
  var audioLive = document.getElementById('player');

  var random_id = Math.random().toString(36).substring(2, 12);

  // disable stop button while not recording

  btn_stop.disabled = true;

  // visualiser setup - create web audio api context and canvas

  var audioCtx = new (window.AudioContext || webkitAudioContext)();
  var canvasCtx = canvas.getContext("2d");

  //main block for doing the audio recording

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

        var clipName = get_current_clipname();
        console.log(clipName);
        var clipContainer = document.createElement('form');
        var clipLabel = document.createElement('p');
        var audio = document.createElement('audio');
        var deleteButton = document.createElement('button');
       
        clipLabel.textContent = clipName;
        clipContainer.classList.add('clip');
        audio.setAttribute('controls', '');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete';

        clipContainer.id = clipName;
        clipContainer.enctype = 'multipart/form-data';
        clipContainer.action = host + '/collect';

        clipContainer.appendChild(audio);
        clipContainer.appendChild(clipLabel);
        clipContainer.appendChild(deleteButton);
        soundClips.appendChild(clipContainer);

        audio.controls = true;
        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
        chunks = [];
        var audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped");

        deleteButton.onclick = function(e) {
          evtTgt = e.target;
          evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
        };

        clipLabel.onclick = function() {
          var existingName = clipLabel.textContent;
          var newClipName = prompt('Enter a new name for your sound clip?');
          if(newClipName === null) {
            clipLabel.textContent = existingName;
          } else {
            clipLabel.textContent = newClipName;
          }
        };

        send_audio(clipContainer, blob);
      }

      mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
      }
    }

    processStream(window.currentStream);

    audioLive.setAttribute('controls', 'true');
    audioLive.srcObject = window.currentStream;
    audioLive.play();

  } else {
     console.log('getUserMedia not supported on your browser!');
  }

  function send_audio(form, audio){
    var fileData = new FormData(form);
    fileData.append('audio', audio);
    $.ajax({
      url: form.action,
      type: 'post',
      data: fileData,
      async: false,
      processData: false,
      contentType: false
    }).done(function(response){
        console.info('success', response);
    });
  }

  function visualize(stream) {
    console.log('visualize', stream);
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
window.addEventListener('load', initialize);