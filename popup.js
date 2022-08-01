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
  textelement = document.getElementById("generatedOffer");
  offer = peerConnection.localDescription;
  textelement.innerHTML = JSON.stringify(offer);
}

function clickCreateOffer() {
  document.getElementById("generateOffer").disabled = true;
  peerConnection = createPeerConnection(lastIceCandidateHost);
  dataChannel = peerConnection.createDataChannel("chat");
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;
  createOfferPromise = peerConnection.createOffer();
  createOfferPromise.then(createOfferDone, createOfferFailed);
}

function createOfferDone(offer) {
  console.log("createOfferDone");
  setLocalPromise = peerConnection.setLocalDescription(offer);
  setLocalPromise.then(setLocalDone, setLocalFailed);
}

function createOfferFailed(reason) {
  console.log("createOfferFailed:" + reason);
}

function clickOfferSent() {
  console.log("clickOfferSent");
}

function clickAnswerPasted() {
  console.log("clickAnswerPasted");
  textelement = document.getElementById("answerPasteZone");
  textelement.readOnly = true;
  answer = JSON.parse(textelement.value);
  setRemotePromise = peerConnection.setRemoteDescription(answer);
  setRemotePromise.then(setRemoteDoneHost, setRemoteFailedHost);
}

function setRemoteDoneHost() {
  console.log("setRemoteDoneHost");
}

function setRemoteFailedHost(reason) {
  console.log("setRemoteFailedHost:" + reason);
}

// ANSWER STUFF

function clickOfferPasted() {
  console.log("clickOfferPasted");
  peerConnection = createPeerConnection(lastIceCandidateGuest);
  peerConnection.ondatachannel = handleDataChannel;
  textelement = document.getElementById("offerPasteZone");
  textelement.readOnly = true;
  offer = JSON.parse(textelement.value);
  setRemotePromise = peerConnection.setRemoteDescription(offer);
  setRemotePromise.then(setRemoteDoneGuest, setRemoteFailedGuest);
}

function setRemoteDoneGuest() {
  console.log("setRemoteDoneGuest");
  createAnswerPromise = peerConnection.createAnswer();
  createAnswerPromise.then(createAnswerDone, createAnswerFailed);
}

function setRemoteFailedGuest(reason) {
  console.log("setRemoteFailedGuest");
  console.log(reason);
}

function createAnswerDone(answer) {
  console.log("createAnswerDone");
  setLocalPromise = peerConnection.setLocalDescription(answer);
  setLocalPromise.then(setLocalDone, setLocalFailed);
}

function createAnswerFailed(reason) {
  console.log("createAnswerFailed:" + reason);
}

function setLocalDone() {
  console.log("setLocalDone");
}

function setLocalFailed(reason) {
  console.log("setLocalFailed:" + reason);
}

function lastIceCandidateGuest() {
  console.log("lastIceCandidateGuest");
  textelement = document.getElementById("generatedAnswer");
  answer = peerConnection.localDescription;
  textelement.innerHTML = JSON.stringify(answer);
}

function handleDataChannel(event) {
  console.log("handleDatachannel");
  dataChannel = event.channel;
  dataChannel.onopen = dataChannelOpen;
  dataChannel.onmessage = dataChannelMessage;
}

function clickSubmitRole(role) {
  const chooserSection = document.getElementById("chooser");

  chooserSection.classList.remove("chooser");
  chooserSection.classList.add("hidden");

  if (role === "host") {
    const hostSection = document.getElementById("host");
    hostSection.classList.remove("hidden");
    hostSection.classList.add("viewable");
  } else {
    const guestSection = document.getElementById("guest");
    guestSection.classList.remove("hidden");
    guestSection.classList.add("viewable");
  }
}

function clickCopyToClipBoard(elementId) {
  navigator.clipboard
    .writeText(document.getElementById(elementId).innerHTML)
    .then(
      function () {
        console.log("Async: Copying to clipboard was successful!");
      },
      function (err) {
        console.error("Async: Could not copy text: ", err);
      }
    );
}

function registerHandlers() {
  document
    .getElementById("submitHost")
    .addEventListener("click", clickSubmitRole.bind(this, "host"));
  document
    .getElementById("submitGuest")
    .addEventListener("click", clickSubmitRole.bind(this, "guest"));
  document
    .getElementById("generateOffer")
    .addEventListener("click", clickCreateOffer);
  document
    .getElementById("answerSubmit")
    .addEventListener("click", clickAnswerPasted);
  document
    .getElementById("offerSubmit")
    .addEventListener("click", clickOfferPasted);
  document
    .getElementById("generatedOffer")
    .addEventListener(
      "click",
      clickCopyToClipBoard.bind(this, "generatedOffer")
    );
  document
    .getElementById("generatedAnswer")
    .addEventListener(
      "click",
      clickCopyToClipBoard.bind(this, "generatedAnswer")
    );
}

function dataChannelOpen() {
  console.log("dataChannelOpen");
  console.log("connected");
  successBanner = document.getElementById("successBanner");
  successBanner.classList.remove("hidden");
  successBanner.classList.add("viewable");
  document.getElementsByTagName("main").classList.add("hidden");
}

function dataChannelMessage(message) {
  console.log("dataChannelMessage");
  console.log(message);
  text = message.data;
  console.log(text);
}

document.addEventListener("DOMContentLoaded", function () {
  registerHandlers();
});
