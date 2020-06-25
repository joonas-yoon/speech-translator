class translator {
    constructor(tab, stream) {
        this.tab = tab;
        this.stream = stream;
        this.visualTimerId = this.visualize();
        
        var audioElement = document.createElement('audio');
        audioElement.setAttribute("preload", "auto");
        audioElement.autobuffer = true;
        audioElement.srcObject = this.stream;
        audioElement.load();
        audioElement.play();
    }

    get active() {
        return this.stream && this.stream.active;
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

        function test(self){
            analyser.getFloatTimeDomainData(dataArray);
            const sum = dataArray.reduce((a, b) => Math.abs(a) + Math.abs(b), 0);
            const avg = (sum / dataArray.length) || 0;
            const percentage = Math.max(0, Math.min(1.0, Math.abs(avg * 10)));
            chrome.tabs.sendMessage(self.tab.id, {method: 'visualize', avgDecibel: percentage});
        }
        
        return setInterval(test.bind(null, this), 200);
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