// START: STATE MANAGEMENT

function getValueFromLocalStorage(key) {
  return chrome.storage.local.get([key]);
}

function setValueInLocalStorage(key, value) {
  chrome.storage.local.set({ [key]: value }, function () {
    flixLog(
      flixLogLevel.INFO,
      "setValueInLocalStorage",
      "Set value: " + JSON.stringify(value) + " in localStorage for: " + key
    );
  });
}

function clearValuesInLocalStorage() {
  chrome.storage.local.remove(["role", "offer", "answer"], function () {
    flixLog(
      flixLogLevel.INFO,
      "clearValuesInLocalStorage",
      "Cleared local storage"
    );
  });
}

// END: STATE MANAGEMENT

// START: CLICK EVENTS

function clickCreateOffer() {
  document.getElementById("generateOffer").disabled = true;

  notifyContentTab("createOffer", null, function (response) {
    if (response != universalSuccessCode) {
      flixLog(flixLogLevel.ERROR, "clickCreateOffer", "Failed to createOffer");
    }
  });
}

function clickOfferPasted() {
  flixLog(flixLogLevel.INFO, "clickOfferPasted", "Offer pasted in paste zone");

  const offerPasteZone = document.getElementById("offerPasteZone");

  offerPasteZone.readOnly = true;
  const offer = JSON.parse(offerPasteZone.value);
  setValueInLocalStorage("offer", offer);

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
    if (response != universalSuccessCode) {
      flixLog(
        flixLogLevel.ERROR,
        "clickAnswerPasted",
        "Failed to establishConnection"
      );
    }
  });
}

function clickSubmitRole(role) {
  setValueInLocalStorage("role", role);

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
      const previousInnerContent = generatedElement.innerHTML;
      generatedElement.innerHTML = "Copying to clipboard was successful!";
      setTimeout(() => {
        generatedElement.innerHTML = previousInnerContent;
      }, 3000);
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
  setValueInLocalStorage("offer", offer);
  const generatedOfferElement = document.getElementById("generatedOffer");
  generatedOfferElement.innerHTML = JSON.stringify(offer);
}

function setGeneratedAnswer(answer) {
  const generatedAnswerElement = document.getElementById("generatedAnswer");
  setValueInLocalStorage("answer", answer);
  generatedAnswerElement.innerHTML = JSON.stringify(answer);
}

function setConnectionSuccess() {
  clearValuesInLocalStorage();
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

// START: UTILS

function isValid(obj) {
  return obj && (typeof obj != "object" || Object.keys(obj).length > 0);
}

// END: UTILS

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
        return universalNoConnectionCode;
      case universalFailureCode:
        flixLog(
          flixLogLevel.ERROR,
          "getConnectionStatus",
          "RTC data channel connection status undetermined; failure reported from content script"
        );
        return universalFailureCode;
      case universalSuccessCode:
        setConnectionSuccess();
        flixLog(
          flixLogLevel.INFO,
          "getConnectionStatus",
          "Active RTC Data channel retrieved"
        );
        return universalSuccessCode;
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

document.addEventListener("DOMContentLoaded", async function () {
  registerHandlers();
  if (retrieveConnectionStatus() == universalSuccessCode) {
    return;
  }

  const existingRoleObject = await getValueFromLocalStorage("role");
  const existingOfferObject = await getValueFromLocalStorage("offer");
  const existingAnswerObject = await getValueFromLocalStorage("answer");

  if (
    !(
      isValid(existingRoleObject) &&
      ["host", "guest"].includes(existingRoleObject["role"])
    )
  ) {
    return;
  }
  clickSubmitRole(existingRoleObject["role"]);

  if (
    isValid(existingOfferObject) &&
    existingOfferObject["offer"] &&
    existingRoleObject["role"] == "host"
  ) {
    document.getElementById("generateOffer").disabled = true;
    setGeneratedOffer(existingOfferObject["offer"]);
  }

  if (
    isValid(existingAnswerObject) &&
    existingAnswerObject["answer"] &&
    existingRoleObject["role"] == "guest"
  ) {
    document.getElementById("generateAnswer").disabled = true;
    setGeneratedAnswer(existingAnswerObject["answer"]);
  }
});

// END: INIT
