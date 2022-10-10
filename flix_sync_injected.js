const maxDelta = 3000;
const eventDispatchInterval = 1000;

const receivedEventName = "oninjectormessage";
const dispatchedEventName = "oninjectedmessage";

const receivedMessageTypes = Object.freeze({
  CALIBRATE: "calibrate",
  PAUSE: "pause",
});

const dispatchedMessageTypes = Object.freeze({
  CURRENT_TIME: "currentTime",
  PAUSE: "pause",
});

function netflixPlayer() {
  videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
  sessionId = videoPlayer.getAllPlayerSessionIds()[0];

  return videoPlayer.getVideoPlayerBySessionId(sessionId);
}

function pausePlayer() {
  const player = netflixPlayer();
  player.pause();
}

function calibratePlayHeader(data) {
  const player = netflixPlayer();
  if (Math.abs(player.getCurrentTime() - data.currentPlayerTime) > maxDelta) {
    player.seek(data.currentPlayerTime);
    player.play();
  }
}

function dispatchEvent(payloadData) {
  document.dispatchEvent(
    new CustomEvent(dispatchedEventName, {
      detail: payloadData,
    })
  );
}

window.addEventListener("message", function (e) {
  const message = e.data;
  switch (message.type) {
    case receivedMessageTypes.CALIBRATE:
      calibratePlayHeader(message.data);
      break;
    case receivedMessageTypes.PAUSE:
      pausePlayer();
      break;
  }
});

setInterval(function () {
  const player = netflixPlayer();
  if (videoPlayer.isVideoPlayingForSessionId(sessionId)) {
    const currentPlayerTime = player.getCurrentTime();
    dispatchEvent({
      type: dispatchedMessageTypes.CURRENT_TIME,
      data: { currentPlayerTime: currentPlayerTime },
    });
  } else {
    dispatchEvent({
      type: dispatchedMessageTypes.PAUSE,
      data: {},
    });
  }
}, eventDispatchInterval);
