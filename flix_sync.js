function createPeerConnection(lastIceCandidate) {
  let peerConnection;
  const configuration = {
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  };

  try {
    peerConnection = new RTCPeerConnection(configuration);
  } catch (err) {
    flixLog(flixLogLevel.ERROR, "createPeerConnection", err);
  }

  peerConnection.onicecandidate = handleIceCandidate(lastIceCandidate);
  peerConnection.onconnectionstatechange = handleConnectionStateChange;
  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;

  return peerConnection;
}

function handleIceCandidate(lastIceCandidate) {
  return function (event) {
    if (event.candidate != null) {
      flixLog(
        flixLogLevel.INFO,
        "handleIceCandidate",
        "Received new ICE candidate"
      );
    } else {
      lastIceCandidate();
    }
  };
}

function handleConnectionStateChange(_event) {
  switch (peerConnection.connectionState) {
    case "new":
    case "checking":
      flixLog(
        flixLogLevel.INFO,
        "handleConnectionStateChange",
        peerConnection.state
      );
      break;

    case "closed":
    case "connected":
      flixLog(
        flixLogLevel.WARN,
        "handleConnectionStateChange",
        peerConnection.state
      );
      break;

    case "disconnected":
    case "failed":
      flixLog(
        flixLogLevel.ERROR,
        "handleConnectionStateChange",
        peerConnection.state
      );
      break;

    default:
      flixLog(
        flixLogLevel.INFO,
        "handleConnectionStateChange",
        "unknown state"
      );
      break;
  }
}

function handleIceConnectionStateChange(event) {
  flixLog(
    flixLogLevel.INFO,
    "handleIceConnectionStateChange",
    event.target.iceConnectionState
  );
}

function lastIceCandidateHost() {
  const offer = peerConnection.localDescription;
  notifyPopup(popupEvents.SET_GENERATED_OFFER, offer, function (response) {
    return response === universalSuccessCode;
  });
}

function lastIceCandidateGuest() {
  const answer = peerConnection.localDescription;
  notifyPopup(popupEvents.SET_GENERATED_ANSWER, answer, function (response) {
    return response === universalSuccessCode;
  });
}

function handleDataChannel(event) {
  dataChannel = event.channel;
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;
}

function dataChannelOpen() {
  flixLog(flixLogLevel.INFO, "dataChannelOpen", "Data channel is open");

  notifyPopup("setConnectionSuccess", null, function (response) {
    return response === universalSuccessCode;
  });
}

function dataChannelMessage(message) {
  console.log(message);
  switch (message.type) {
    case dataChannelMessageTypes.SYNC:
      dispatchCalibrateEvent(message);
      break;
    case dataChannelMessageTypes.PAUSE:
      dispatchPauseEvent(message);
      break;
  }
}

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  switch (message.type) {
    case contentTabEvents.CREATE_OFFER:
      createOffer();
      sendResponse(universalSuccessCode);
      break;
    case contentTabEvents.GENERATE_ANSWER:
      generateAnswer(message.param);
      sendResponse(universalSuccessCode);
      break;
    case contentTabEvents.ESTABLISH_CONNECTION:
      establishConnection(message.param);
      sendResponse(universalSuccessCode);
      break;
  }
});

function notifyPopup(message, param) {
  return chrome.runtime.sendMessage(
    { type: message, param: param },
    (response) => {
      return response === universalSuccessCode;
    }
  );
}

// START: MESSAGE ACTIONS

function createOffer() {
  role = roles.HOST;

  peerConnection = createPeerConnection(lastIceCandidateHost);

  dataChannel = peerConnection.createDataChannel(dataChannelId);
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;

  const createOfferPromise = peerConnection.createOffer();
  createOfferPromise.then(createOfferDone, createOfferFailed);
}

function generateAnswer(offer) {
  role = roles.GUEST;

  peerConnection = createPeerConnection(lastIceCandidateGuest);
  peerConnection.ondatachannel = handleDataChannel;

  const setRemotePromise = peerConnection.setRemoteDescription(offer);
  setRemotePromise.then(setRemoteDoneGuest, setRemoteFailedGuest);

  const createAnswerPromise = peerConnection.createAnswer();
  createAnswerPromise.then(createAnswerDone, createAnswerFailed);
}

function establishConnection(answer) {
  const setRemotePromise = peerConnection.setRemoteDescription(answer);
  setRemotePromise.then(setRemoteDoneHost, setRemoteFailedHost);
}

function createOfferDone(offer) {
  const setLocalPromise = peerConnection.setLocalDescription(offer);
  setLocalPromise.then(setLocalDone, setLocalFailed);
}

function createOfferFailed(reason) {
  flixLog(
    flixLogLevel.ERROR,
    "createOfferFailed",
    "Offer failed to be created - " + reason
  );
}

function createAnswerDone(answer) {
  const setLocalPromise = peerConnection.setLocalDescription(answer);
  setLocalPromise.then(setLocalDone, setLocalFailed);
}

function createAnswerFailed(reason) {
  flixLog(
    flixLogLevel.ERROR,
    "createAnswerFailed",
    "Answer failed to be created - " + reason
  );
}

// END: MESSAGE ACTIONS

// START: STATUS LOGGING

function setLocalDone() {
  flixLog(flixLogLevel.INFO, "setLocalDone", "Local has been set");
}

function setLocalFailed(reason) {
  flixLog(flixLogLevel.ERROR, "setLocalFailed", "Local set failed - " + reason);
}

function setRemoteDoneHost() {
  flixLog(flixLogLevel.INFO, "setRemoteDoneHost", "Remote host has been set");
}

function setRemoteFailedHost(reason) {
  flixLog(
    flixLogLevel.ERROR,
    "setRemoteFailedHost",
    "Remote host set failed - " + reason
  );
}

function setRemoteDoneGuest() {
  flixLog(flixLogLevel.INFO, "setRemoteDoneGuest", "Remote guest has been set");
}

function setRemoteFailedGuest(reason) {
  flixLog(
    flixLogLevel.ERROR,
    "setRemoteFailedGuest",
    "Remote guest set failed - " + reason
  );
}

// END: STATUS LOGGING

// START: CORE SYNCING

function sendOnDataChannel(payload) {
  dataChannel.send(JSON.stringify(payload));
}

function dispatchEvent(payloadData) {
  window.postMessage(
    {
      ...payloadData,
      source: "flix-sync-content",
    },
    targetOrigin
  );
}

function dispatchCalibrateEvent(payload) {
  dispatchEvent({
    type: dispatchedMessageTypes.CALIBRATE,
    data: { currentPlayerTime: payload },
  });
}

function dispatchPauseEvent(_payload) {
  dispatchEvent({
    type: dispatchedMessageTypes.PAUSE,
    data: {},
  });
}

document.addEventListener(receivedEventName, function (e) {
  if (
    peerConnection &&
    peerConnection.connectionState === "connected" &&
    dataChannel
  ) {
    switch (e.detail.type) {
      case receivedMessageTypes.CURRENT_TIME:
        if (role === roles.HOST) {
          const currentPlayerHead = e.detail.data.currentPlayerTime;
          sendOnDataChannel({
            type: dataChannelMessageTypes.SYNC,
            data: { currentPlayerTime: currentPlayerHead },
          });
        }
        break;
      case receivedMessageTypes.PAUSE:
        sendOnDataChannel({
          type: dataChannelMessageTypes.PAUSE,
          data: {},
        });
        break;
    }
  }
});

// END: CORE SYNCING
