function createPeerConnection(lastIceCandidate) {
  configuration = {
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  };
  try {
    peerConnection = new RTCPeerConnection(configuration);
  } catch (err) {
    console.log("error: " + err);
  }

  peerConnection.onicecandidate = handleIceCandidate(lastIceCandidate);
  peerConnection.onconnectionstatechange = handleConnectionStateChange;
  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;

  return peerConnection;
}

function handleIceCandidate(lastIceCandidate) {
  return function (event) {
    if (event.candidate != null) {
      console.log("INFO: New ICE candidate");
    } else {
      console.log("INFO: All ICE candidates");
      lastIceCandidate();
    }
  };
}

function handleConnectionStateChange(event) {
  console.log("INFO:" + event);
}

function handleIceConnectionStateChange(event) {
  console.log("ICE state:" + event.target.iceConnectionState);
}

function lastIceCandidateHost() {
  console.log("lastIceCandidateHost");
  offer = peerConnection.localDescription;
  notifyPopup("setGeneratedOffer", offer, function (response) {
    return response === "OK";
  });
}

function lastIceCandidateGuest() {
  console.log("lastIceCandidateGuest");
  answer = peerConnection.localDescription;
  notifyPopup("setGeneratedAnswer", answer, function (response) {
    return response === "OK";
  });
}

function handleDataChannel(event) {
  console.log("handleDatachannel");
  dataChannel = event.channel;
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;
}

function dataChannelOpen() {
  console.log("dataChannelOpen");
  console.log("connected");
  notifyPopup("connectionSuccess", null, function (response) {
    return response === "OK";
  });
}

function dataChannelMessage(message) {
  console.log("dataChannelMessage");
  console.log(message);
  text = message.data;
  console.log(text);
}

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  switch (message.type) {
    case "createOffer":
      createOffer();
      sendResponse("OK");
      break;
    case "generateAnswer":
      generateAnswer(message.param);
      sendResponse("OK");
      break;
    case "connect":
      establishConnection(message.param);
      sendResponse("OK");
      break;
  }
});

function notifyPopup(message, param) {
  return chrome.runtime.sendMessage(
    { type: message, param: param },
    (response) => {
      return response === "OK";
    }
  );
}

// START: MESSAGE ACTIONS

function createOffer() {
  peerConnection = createPeerConnection(lastIceCandidateHost);
  dataChannel = peerConnection.createDataChannel("chat");
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;
  createOfferPromise = peerConnection.createOffer();
  createOfferPromise.then(createOfferDone, createOfferFailed);
}

function generateAnswer(offer) {
  peerConnection = createPeerConnection(lastIceCandidateGuest);
  peerConnection.ondatachannel = handleDataChannel;
  setRemotePromise = peerConnection.setRemoteDescription(offer);
  setRemotePromise.then(setRemoteDoneGuest, setRemoteFailedGuest);
  createAnswerPromise = peerConnection.createAnswer();
  createAnswerPromise.then(createAnswerDone, createAnswerFailed);
}

function establishConnection(answer) {
  setRemotePromise = peerConnection.setRemoteDescription(answer);
  setRemotePromise.then(setRemoteDoneHost, setRemoteFailedHost);
}

function createOfferDone(offer) {
  setLocalPromise = peerConnection.setLocalDescription(offer);
  setLocalPromise.then(setLocalDone, setLocalFailed);
  console.log("createOfferDone");
}

function createOfferFailed(reason) {
  console.log("createOfferFailed:" + reason);
}

function createAnswerDone(answer) {
  console.log("createAnswerDone");
  setLocalPromise = peerConnection.setLocalDescription(answer);
  setLocalPromise.then(setLocalDone, setLocalFailed);
}

function createAnswerFailed(reason) {
  console.log("createAnswerFailed:" + reason);
}

// END: MESSAGE ACTIONS

// START: STATUS LOGGING

function setLocalDone() {
  console.log("setLocalDone");
}

function setLocalFailed(reason) {
  console.log("setLocalFailed:" + reason);
}

function setRemoteDoneHost() {
  console.log("setRemoteDoneHost");
}

function setRemoteFailedHost(reason) {
  console.log("setRemoteFailedHost:" + reason);
}

function setRemoteDoneGuest() {
  console.log("setRemoteDoneGuest");
}

function setRemoteFailedGuest(reason) {
  console.log("setRemoteFailedGuest:" + reason);
}

// END: STATUS LOGGING
