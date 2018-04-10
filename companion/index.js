import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { Stop, Departure, Deviation, StopData } from "../common/index";

const API_URL = "http://reisapi.ruter.no/StopVisit/GetDepartures/"
const SUFFIX = "?json=true";

let stops = [new Stop("Møllefaret", 3012540 //3012594
                     )];

let s = JSON.stringify;

getStopInfo(stops[0].id);

function getStopInfo(stopId) {
  fetch(getUrl(stopId), { method: "GET"})
  .then(function(response) {
    response.json().then(function(data) {
      let data = processData(data);
    });
  }, function(error) {
    console.log("Error: " + error.code + " - " + error.message);
  });
}

function processData(data) {
  let deviations = []
  let departures = []
  
  for (let entry of data) {
    let dd = entry['MonitoredVehicleJourney'];
    let ri = dd['MonitoredCall'];
    
    let departure = new Departure();
    departure.lineNumber = dd['PublishedLineName'];
    departure.destinationName = dd['DestinationName'];
    departure.platform = ri['DeparturePlatformName'];
    departure.aimedDepartureTime = new Date(ri['AimedDepartureTime']);
    departure.expectedDepartureTime = new Date(ri['ExpectedDepartureTime']);
    departure.vehicleType = getVehicleType(dd['VehicleMode']);
    departure.delay = parseDelay(dd['Delay']);

    for (let deviation of entry['Extensions']['Deviations']) {
      let found = false;
      for (let item of deviations) {
        if (item.id === deviation['ID']) {
          found = true;
        }
      }
      
      if (!found) {
        deviations.push(new Deviation(deviation['ID'], deviation['Header']));
      }
    }
    
    departures.push(departure);
  }
  
  return new StopData(departures, deviations);
}

function parseDelay(delayStr) {
  if (delayStr === null) {
    return 0
  }
  if (delayStr.charAt(0) === '-') {
    return -Number(Math.round(Number(delayStr.substring(3, delayStr.length - 1)) / 60.0))
  } else {
    return Number(Math.round(Number(delayStr.substring(2, delayStr.length - 1)) / 60.0))
  }
  return delayStr;
}

function getVehicleType(type) {
  let type_string;
  switch (type) {
    case 0:
      return 'bus';
    default:
      return 'metro';
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
