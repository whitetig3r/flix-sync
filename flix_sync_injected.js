const maxDelta = 5000;
const eventDispatchInterval = 3000;

const receivedEventName = "oninjectormessage";
const dispatchedEventName = "oninjectedmessage";

const receivedMessageTypes = Object.freeze({
  CALLIBRATE: "calibrate",
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
  console.log("Trying to seek!");
  player.pause();
}

function calibratePlayHeader(data) {
  const player = netflixPlayer();
  if (Math.abs(player.getCurrentTime() - data.currentPlayerTime) > maxDelta) {
    console.log("Trying to seek!");
    player.seek(data.currentPlayerTime);
  }
}

function dispatchEvent(payloadData) {
  document.dispatchEvent(
    new CustomEvent(dispatchedEventName, {
      detail: payloadData,
    })
  );
}

document.addEventListener(receivedEventName, function (e) {
  console.log(e.detail);
  switch (e.detail.type) {
    case receivedMessageTypes.CALLIBRATE:
      calibratePlayHeader(e.detail.data);
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
