// The peerConnection to be used
var peerConnection;
// The dataChannel to be used
var dataChannel;
// The role of the current user
var role;

function createPeerConnection(lastIceCandidate) {
  try {
    const peerConnection = new RTCPeerConnection(peerConnectionConfiguration);

    peerConnection.onicecandidate = handleIceCandidate(lastIceCandidate);
    peerConnection.onconnectionstatechange = handleConnectionStateChange;
    peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;

    return peerConnection;
  } catch (err) {
    flixLog(flixLogLevel.ERROR, "createPeerConnection", err);
  }
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
    case peerConnectionStates.NEW:
    case peerConnectionStates.CHECKING:
      flixLog(
        flixLogLevel.INFO,
        "handleConnectionStateChange",
        peerConnection.state
      );
      break;

    case peerConnectionStates.CLOSED:
    case peerConnectionStates.CONNECTED:
      flixLog(
        flixLogLevel.WARN,
        "handleConnectionStateChange",
        peerConnection.state
      );
      break;

    case peerConnectionStates.DISCONNECTED:
    case peerConnectionStates.FAILED:
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
        `${peerConnectionStates.UNKNOWN} state`
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
    if (response != universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "lastIceCandidateHost",
        "Failed to setGeneratedOffer"
      );
    }
  });
}

function lastIceCandidateGuest() {
  const answer = peerConnection.localDescription;
  notifyPopup(popupEvents.SET_GENERATED_ANSWER, answer, function (response) {
    if (response != universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "lastIceCandidateGuest",
        "Failed to setGeneratedAnswer"
      );
    }
  });
}

function handleDataChannel(event) {
  dataChannel = event.channel;
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;
}

function dataChannelOpen() {
  flixLog(flixLogLevel.INFO, "dataChannelOpen", "Data channel is open");
  notifyPopup(popupEvents.SET_CONNECTION_SUCCESS, null, function (response) {
    if (response != universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "dataChannelOpen",
        "Failed to open dataChannel"
      );
    }
  });
}

function dataChannelMessage(message) {
  const messageData = JSON.parse(message.data);
  switch (messageData.type) {
    case dataChannelMessageTypes.SYNC:
      dispatchCalibrateEvent(messageData);
      break;
    case dataChannelMessageTypes.PAUSE:
      dispatchPauseEvent(messageData);
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
    case contentTabEvents.GET_CONNECTION_STATUS: {
      reportConnectionStatus(sendResponse);
      break;
    }
  }
});

function reportConnectionStatus(sendResponse) {
  if (
    peerConnection &&
    peerConnection.connectionState === peerConnectionStates.CONNECTED
  ) {
    sendResponse(universalSuccessCode);
    notifyPopup(popupEvents.SET_CONNECTION_SUCCESS, null, function (response) {
      if (response != universalSuccessCode) {
        flixLog(
          flixLogLevel.ERROR,
          "getConnectionStatus",
          "Failed to setConnectionSuccess"
        );
      }
    });
  }

  sendResponse(universalNoConnectionCode);
  notifyPopup(popupEvents.SET_CONNECTION_FAILURE, null, function (response) {
    if (response != universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "getConnectionStatus",
        "Failed to setConnectionFailure"
      );
    }
  });
}

function notifyPopup(message, param, callback) {
  return chrome.runtime.sendMessage(
    { type: message, param: param },
    (response) => {
      callback(response);
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
    type: dispatchedWindowEventMessageTypes.CALIBRATE,
    data: { currentPlayerTime: payload.data.currentPlayerTime },
  });
}

function dispatchPauseEvent(_payload) {
  dispatchEvent({
    type: dispatchedWindowEventMessageTypes.PAUSE,
    data: {},
  });
}

document.addEventListener(receivedEventName, function (event) {
  if (
    peerConnection &&
    peerConnection.connectionState === peerConnectionStates.CONNECTED &&
    dataChannel
  ) {
    if (role != roles.HOST) {
      return;
    }

    switch (event.detail.type) {
      case receivedDocumentEventMessageTypes.CURRENT_TIME:
        const currentPlayerHead = event.detail.data.currentPlayerTime;
        sendOnDataChannel({
          type: dataChannelMessageTypes.SYNC,
          data: { currentPlayerTime: currentPlayerHead },
        });
        break;
      case receivedDocumentEventMessageTypes.PAUSE:
        sendOnDataChannel({
          type: dataChannelMessageTypes.PAUSE,
          data: {},
        });
        break;
    }
  }
});

// END: CORE SYNCING
