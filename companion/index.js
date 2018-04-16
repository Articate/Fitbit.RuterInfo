import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { Favourite, Departure, Deviation, StopData } from "../common/index";
import { outbox } from "file-transfer";
import * as cbor from 'cbor';
import { STOP_DATA_FILE, API_URL } from "../common/const.js";

let s = JSON.stringify;

let favs = [
  new Favourite('Møllefaret', 3012594, 32, 'Kværnerbyen'),
  new Favourite('Røa', 3012450, 2, 'Ellingsrudåsen')
];

function getFavouriteRequest(favourites) {
  let str = '';
  for (let fav of favourites) {
    str += `${fav.id}-${fav.line}-${fav.destination},`;
  }
  return str;
}

function sendDepartureInfo(favouritesStr) {
  let url = API_URL + '?favouritesRequest=' + favouritesStr + '&json=true';
  fetch(encodeURI(url), { method: "GET"})
  .then(response => response.json())
  .catch(error => console.error('Error:', error))
  .then(data => sendStopData(processData(data)));
}

function processData(data) {
  let allInfo = [];
 
  for (let stop of data) {
    let stopData = getStopData(stop);    
    allInfo.push(stopData);
  }
  
  return allInfo;
}

function getStopData(stop) {
  let stopData = new StopData();
  let stopContent = stop['MonitoredStopVisits'];
  
  if (stopContent.length === 0) {
    return null;
  }
  
  let info = stopContent[0]['MonitoredVehicleJourney']

  stopData.id = stop['StopID'];
  stopData.name = getStopName(stopData.id);
  stopData.lineNumber = stop['LineID'];
  stopData.destination = stop['Destination'];
  stopData.vehicleType = getVehicleType(info['VehicleMode']);

  for (let entry of stopContent) {
    let dd = entry['MonitoredVehicleJourney'];
    let ri = dd['MonitoredCall'];
    
    stopData.vehicleType = getVehicleType(dd['VehicleMode'])

    let departure = new Departure();
    departure.aimedDepartureTime = ri['AimedDepartureTime'];
    departure.expectedDepartureTime = ri['ExpectedDepartureTime'];
    departure.delay = parseDelay(dd['Delay']);

    stopData.departures.push(departure);

    let deviations = entry['Extensions']['Deviations'];      
    for (let deviation of deviations) {
      let found = false;
      for (let item of deviations) {
        if (item.id === deviation['ID']) {
          found = true;
        }
      }

      if (!found) {
        stopData.deviations.push(new Deviation(deviation['ID'], deviation['Header']));
      }
    }
  }
  
  return stopData;
}

function getStopName(id) {
  for (let fav of favs) {
    if (fav.id === id) {
      return fav.name;
    }
  }
  return "not found";
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
}

function getVehicleType(type) {
  let type_string;
  switch (type) {
    case 0:
      return 'bus';
    case 4:
    default:
      return 'metro';
  }
}

function getUrl(parameter) {
  return API_URL + parameter + SUFFIX;
}

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Processing started");
  sendDepartureInfo(getFavouriteRequest(favs));
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("Companion Socket Closed");
};

messaging.peerSocket.onmessage = function(evt) {
  if (evt.data && evt.data.command === "update") {
    sendDepartureInfo(getFavouriteRequest(favs));
  }
}

/*
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
*/

function sendStopData(data) {
  outbox.enqueue(STOP_DATA_FILE, cbor.encode(data))
    .then(evt => { return })
    .catch(error => console.log("Error sending settings: " + error));
}