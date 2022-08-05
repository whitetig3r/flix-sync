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

function handleConnectionStateChange(event) {
  flixLog(flixLogLevel.INFO, "handleConnectionStateChange", event);
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

  initiateSyncing();

  notifyPopup("setConnectionSuccess", null, function (response) {
    return response === universalSuccessCode;
  });
}

function dataChannelMessage(message) {
  const text = message.data;
  console.log(text);
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
  peerConnection = createPeerConnection(lastIceCandidateHost);

  dataChannel = peerConnection.createDataChannel(dataChannelId);
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;

  const createOfferPromise = peerConnection.createOffer();
  createOfferPromise.then(createOfferDone, createOfferFailed);
}

function generateAnswer(offer) {
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

function initiateSyncing() {
  console.log("init sync");
}

// END: CORE SYNCING