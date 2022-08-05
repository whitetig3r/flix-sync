const dataChannelId = "syncChannel";
const universalSuccessCode = "OK";

const flixLogLevel = Object.freeze({
  INFO: 0,
  WARN: 1,
  ERROR: 2,
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
