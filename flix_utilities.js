const dataChannelId = "syncChannel";
const universalSuccessCode = "OK";

const dispatchedEventName = "oninjectormessage";
const receivedEventName = "oninjectedmessage";

const targetOrigin = "https://www.netflix.com";

const peerConnectionConfiguration = Object.freeze({
  iceServers: [
    {
      urls: "stun:stun.stunprotocol.org",
    },
  ],
});

const flixLogLevel = Object.freeze({
  INFO: 0,
  WARN: 1,
  ERROR: 2,
});

const roles = Object.freeze({
  HOST: "host",
  GUEST: "guest",
});

const peerConnectionStates = Object.freeze({
  NEW: "new",
  CHECKING: "checking",
  CLOSED: "closed",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  FAILED: "failed",
  UNKNOWN: "unknown",
});

const dataChannelMessageTypes = Object.freeze({
  SYNC: "sync",
  PAUSE: "pause",
});

const contentTabEvents = Object.freeze({
  CREATE_OFFER: "createOffer",
  GENERATE_ANSWER: "generateAnswer",
  ESTABLISH_CONNECTION: "establishConnection",
});

const popupEvents = Object.freeze({
  SET_GENERATED_OFFER: "setGeneratedOffer",
  SET_GENERATED_ANSWER: "setGeneratedAnswer",
  SET_CONNECTION_CONNECTION_SUCCESS: "setConnectionSuccess",
  SET_CONNECTION_CONNECTION_FAILURE: "setConnectionFailure",
});

const receivedDocumentEventMessageTypes = Object.freeze({
  CURRENT_TIME: "currentTime",
  PAUSE: "pause",
});

const dispatchedWindowEventMessageTypes = Object.freeze({
  CALIBRATE: "calibrate",
  PAUSE: "pause",
});

function flixLog(level, tag, message) {
  const formattedLog = `[flix-sync] ${tag}: ${message}`;
  switch (level) {
    case flixLogLevel.INFO:
      console.log(formattedLog);
      break;
    case flixLogLevel.WARN:
      console.log(formattedLog);
      break;
    case flixLogLevel.ERROR:
      console.error(formattedLog);
      break;
    default:
      console.log(formattedLog);
  }
}
