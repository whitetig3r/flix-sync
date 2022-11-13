// START: CLICK EVENTS

function clickCreateOffer() {
  document.getElementById("generateOffer").disabled = true;

  notifyContentTab("createOffer", null, function (response) {
    if (response !== universalSuccessCode) {
      flixLog(flixLogLevel.ERROR, "clickCreateOffer", "Failed to createOffer");
    }
  });
}

function clickOfferPasted() {
  flixLog(flixLogLevel.INFO, "clickOfferPasted", "Offer pasted in paste zone");
  const offerPasteZone = document.getElementById("offerPasteZone");

  offerPasteZone.readOnly = true;
  const offer = JSON.parse(offerPasteZone.value);

  notifyContentTab("generateAnswer", offer, function (response) {
    if (response != universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "clickOfferPasted",
        "Failed to generateAnswer"
      );
    }
  });
}

function clickAnswerPasted() {
  flixLog(
    flixLogLevel.INFO,
    "clickAnswerPasted",
    "Answer pasted in paste zone"
  );

  const answerPasteZone = document.getElementById("answerPasteZone");
  answerPasteZone.readOnly = true;

  const answer = JSON.parse(answerPasteZone.value);

  notifyContentTab("establishConnection", answer, function (response) {
    if (response !== universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "clickAnswerPasted",
        "Failed to establishConnection"
      );
    }
  });
}

function clickSubmitRole(role) {
  const chooserSection = document.getElementById("chooser");

  chooserSection.classList.remove("chooser");
  chooserSection.classList.add("hidden");

  if (role === roles.HOST) {
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
  const generatedElement = document.getElementById(elementId);

  navigator.clipboard.writeText(generatedElement.innerHTML).then(
    function () {
      generatedElement.innerHTML = "Copying to clipboard was successful!";
    },
    function (err) {
      flixLog(
        flixLoglevels.ERROR,
        "clickCopyToClipBoard",
        "Could not copy text -" + err
      );
    }
  );
}

function registerHandlers() {
  bindClickEvent("submitHost", clickSubmitRole.bind(this, "host"));
  bindClickEvent("submitGuest", clickSubmitRole.bind(this, "guest"));
  bindClickEvent("generateOffer", clickCreateOffer);
  bindClickEvent("answerSubmit", clickAnswerPasted);
  bindClickEvent("offerSubmit", clickOfferPasted);
  bindClickEvent(
    "generatedOffer",
    clickCopyToClipBoard.bind(this, "generatedOffer")
  );
  bindClickEvent(
    "generatedAnswer",
    clickCopyToClipBoard.bind(this, "generatedAnswer")
  );
}

function bindClickEvent(elementId, eventHandler) {
  document.getElementById(elementId).addEventListener("click", eventHandler);
}

// END: CLICK EVENTS

// START: TAB EVENTS

function setGeneratedOffer(offer) {
  const generatedOfferElement = document.getElementById("generatedOffer");
  generatedOfferElement.innerHTML = JSON.stringify(offer);
}

function setGeneratedAnswer(answer) {
  const generatedAnswerElement = document.getElementById("generatedAnswer");
  generatedAnswerElement.innerHTML = JSON.stringify(answer);
}

function setConnectionSuccess() {
  const successBanner = document.getElementById("successBanner");
  successBanner.classList.remove("hidden");
  successBanner.classList.add("viewable");
  document.getElementById("mainSection").classList.add("hidden");
}

async function notifyContentTab(message, param, callback) {
  const queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);

  return chrome.tabs.sendMessage(
    tab.id,
    { type: message, param: param },
    (response) => {
      callback(response);
      return response === universalSuccessCode;
    }
  );
}

// END: TAB EVENTS

// START: INIT

function retrieveConnectionStatus() {
  notifyContentTab("getConnectionStatus", null, function (response) {
    switch (response) {
      case universalNoConnectionCode:
        flixLog(
          flixLogLevel.INFO,
          "getConnectionStatus",
          "No active RTC data channel; a new one needs to be setup"
        );
        break;
      case universalFailureCode:
        flixLog(
          flixLogLevel.ERROR,
          "getConnectionStatus",
          "RTC data channel connection status undetermined; failure reported from content script"
        );
        break;
      case universalSuccessCode:
        flixLog(
          flixLogLevel.INFO,
          "getConnectionStatus",
          "Active RTC Data channel retrieved"
        );
    }
  });
}

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  switch (message.type) {
    case popupEvents.SET_GENERATED_OFFER:
      setGeneratedOffer(message.param);
      sendResponse(universalSuccessCode);
      break;
    case popupEvents.SET_GENERATED_ANSWER:
      setGeneratedAnswer(message.param);
      sendResponse(universalSuccessCode);
      break;
    case popupEvents.SET_CONNECTION_SUCCESS:
      setConnectionSuccess();
      sendResponse(universalSuccessCode);
      break;
    case popupEvents.SET_CONNECTION_FAILURE:
      // no-op for now
      sendResponse(universalSuccessCode);
      break;
  }
});

document.addEventListener("DOMContentLoaded", function () {
  registerHandlers();
  retrieveConnectionStatus();
});

// END: INIT
