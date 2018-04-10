import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { Stop, Departure, getVehicleType } from "../common/index";
// Ruter
const API_URL = "http://reisapi.ruter.no/StopVisit/GetDepartures/"
const SUFFIX = "?json=true";

let stops = [new Stop("Møllefaret", 3012594)];

let s = JSON.stringify;

console.log(s(stops));

getStopInfo(stops[0].id);

function getStopInfo(stopId) {
  fetch(getUrl(stopId), { method: "GET"})
  .then(function(response) {
    response.json().then(function(data) {
      processData(data);
    });
  }, function(error) {
    console.log("Error: " + error.code + " - " + error.message);
  });
}

function processData(data) {
  for (let entry of data) {
    let departureData = entry['MonitoredVehicleJourney'];
    let realtimeInfo = departure_data['MonitoredCall'];
    
    let departure = new Departure(departureData, realtimeInfo);
    departure.lineNumber = depag
  }
}

function getUrl(parameter) {
  return API_URL + parameter + SUFFIX;
}

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Companion Socket Open");
  restoreSettings();
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("Companion Socket Closed");
};

// A user changes settings
settingsStorage.onchange = evt => {
  let data = {
    key: evt.key,
    newValue: evt.newValue
  };
  sendVal(data);
};

// Restore any previously saved settings and send to the device
function restoreSettings() {
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    if (key) {
      let data = {
        key: key,
        newValue: settingsStorage.getItem(key)
      };
      sendVal(data);
    }
  }
}

// Send data to device using Messaging API
function sendVal(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  }
}
