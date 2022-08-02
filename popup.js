// START: CLICK EVENTS

function clickCreateOffer() {
  document.getElementById("generateOffer").disabled = true;
  notifyContentTab("createOffer", null, function (response) {
    if (!response) {
      console.log("FAILED");
    }
  });
}

function clickOfferPasted() {
  console.log("clickOfferPasted");
  textelement = document.getElementById("offerPasteZone");
  textelement.readOnly = true;
  offer = JSON.parse(textelement.value);
  notifyContentTab("generateAnswer", offer, function (response) {
    if (!response) {
      console.log("FAILED");
    }
  });
}

function clickAnswerPasted() {
  console.log("clickAnswerPasted");
  textelement = document.getElementById("answerPasteZone");
  textelement.readOnly = true;
  answer = JSON.parse(textelement.value);
  notifyContentTab("connect", answer, function (response) {
    if (!response) {
      console.log("FAILED");
    }
  });
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

// END: CLICK EVENTS

// START: TAB EVENTS
function setGeneratedOffer(offer) {
  textelement = document.getElementById("generatedOffer");
  textelement.innerHTML = JSON.stringify(offer);
}

function setGeneratedAnswer(answer) {
  textelement = document.getElementById("generatedAnswer");
  textelement.innerHTML = JSON.stringify(answer);
}

function setConnectionSuccess() {
  successBanner = document.getElementById("successBanner");
  successBanner.classList.remove("hidden");
  successBanner.classList.add("viewable");
  document.getElementById("mainSection").classList.add("hidden");
}

async function notifyContentTab(message, param) {
  queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);

  return chrome.tabs.sendMessage(
    tab.id,
    { type: message, param: param },
    (response) => {
      return response === "OK";
    }
  );
}

// END: TAB EVENTS

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  switch (message.type) {
    case "setGeneratedOffer":
      setGeneratedOffer(message.param);
      sendResponse("OK");
      break;
    case "setGeneratedAnswer":
      setGeneratedAnswer(message.param);
      sendResponse("OK");
      break;
    case "connectionSuccess":
      setConnectionSuccess();
      sendResponse("OK");
      break;
  }
});

document.addEventListener("DOMContentLoaded", function () {
  registerHandlers();
});
