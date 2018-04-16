import document from "document";
import { vibration } from "haptics";
import * as messaging from "messaging";
import { inbox } from "file-transfer";
import { readFileSync } from "fs";
import { 
  TRANSFER_START,
  TRANSFER_END,
  SEND_BUFFERED,
  SEND_AS_FILE,
  STOP_DATA_FILE,
  METRO_COLOR,
  BUS_COLOR
} from "../common/const.js";

let s = JSON.stringify;
let main = document.getElementById('main-container');
let getByClass = main.getElementsByClassName;

let messageBuffer = [];
let domItems = [];
let spinner = document.getElementById('spinner-container');

(function setup() {
  spinner.animate('enable');
  gatherDom();
})();

function gatherDom() {
  let stopContainers = getByClass("stop-container");
  let stopName = getByClass("stop-name");
  let lineNumber = getByClass("line-number");
  let lineNumberText = getByClass("line-number-text");
  let lineDest = getByClass("line-dest");
  let lineDestText = getByClass("line-dest-text");
  let mainDep = getByClass("main-departure");
  let mainDelay = getByClass("main-delay");
  
  for (let i in stopName) {    
    domItems.push({
      stopContainer: stopContainers[i],
      stopName: stopName[i],
      lineNumber: lineNumber[i],
      lineNumberText: lineNumberText[i],
      lineDest: lineDest[i],
      lineDestText: lineDestText[i],
      mainDep: mainDep[i],
      mainDelay: mainDelay[i]
    });
  }
}

/*let test = document.getElementById('mytest');
test.onclick = evt => {
  console.log("Click: " + JSON.stringify(evt));
}*/

inbox.onnewfile = evt => {
  let fileName;
  while (fileName = inbox.nextFile()) {
    console.log("File received: " + fileName);

    if (fileName === STOP_DATA_FILE) {
      let data = readFileSync(fileName, 'cbor');
      updateDisplay(data);
    }
  }
}

messaging.peerSocket.onmessage = evt => {
  let data = evt['data'];
  if (SEND_BUFFERED) {
    processPartMessage(data);
  } else {
    updateDisplay(data);
  }
};

function processPartMessage(data) {
  if (data === TRANSFER_START) {
    messageBuffer = [];
  } else if (data === TRANSFER_END) {
    processData();
  } else {
    messageBuffer.push(data);
  }
}

function processData() {
  let dataStr = "";
  while (messageBuffer.length > 0) {
    dataStr += messageBuffer.shift();
  }  
  
  let stopInfo = JSON.parse(dataStr);  
  updateDisplay(stopInfo);
}

function updateDisplay(stopInfo) {  
  for(let i in stopInfo) {
    let stop = stopInfo[i];
    let main_departure = stop.departures[0];
    domItems[i].stopName.text = stop.name;
    domItems[i].lineNumber.style.fill = getColor(stop.vehicleType);
    domItems[i].lineNumberText.text = stop.lineNumber;
    domItems[i].lineDest.style.fill = getColor(stop.vehicleType);
    domItems[i].lineDestText.text = stop.destination;
    domItems[i].mainDep.text = getDepartureText(main_departure.aimedDepartureTime);
    domItems[i].mainDelay.text = getDelayText(main_departure.delay);
  }
  
  for (let i = stopInfo.length; i < domItems.length; i++) {
    let container = domItems[i].stopContainer;
    container.style.display = "none";
  }
  
  spinner.animate("disable");
  spinner.style.display = "none";
  
  // force redraw
  main.value = main.value;
}

function getColor(vehicleType) {
  if (vehicleType === "bus") {
    return BUS_COLOR;
  } else if (vehicleType === "metro") {
    return METRO_COLOR;
  }
}

function getDepartureText(dateStr) {
  let date = new Date(dateStr);
  let timeTo = Math.round((Math.floor((date - Date.now())/1000)) / 60);
  if (timeTo > 0) {
    return timeTo + " min";
  } else {
    return "nå";
  }
}

function getDelayText(delay) {
  if (delay > 0) {
    return `(forsinkelse: ${delay} min)`;
  } else {
    return "";
  }
}

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("App Socket Open");
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("App Socket Closed");
};

document.onkeypress = function(e) {
  if (e.key !== "up" && e.key !== "down") {
    return;
  }
  
  if (messaging.peerSocket.readyState !== messaging.peerSocket.OPEN) {
    console.error("Messaging not ready");
    return;
  }
  
  vibration.start("bump");
  spinner.style.display = "inline";
  spinner.getElementById('spinner-background').style.opacity = 0.65;
  spinner.animate("enable");
  messaging.peerSocket.send({
    command: 'update'
  });
}
