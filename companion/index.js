import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { Favourite, Departure, Deviation, StopData } from "../common/index";
import { outbox } from "file-transfer";
import * as cbor from 'cbor';
import { TRANSFER_START,
        TRANSFER_END,
        SEND_BUFFERED,
        MESSAGE_LENGTH,
        SEND_AS_FILE,
        STOP_DATA_FILE } from "../common/const.js";

const API_URL = "https://reisapi.ruter.no/Favourites/GetFavourites";

let message_buffer = [];

let s = JSON.stringify;

let favs = [
  new Favourite('Møllefaret', 3012594, 32, 'Kværnerbyen'),
  new Favourite('Røa', 3012450, 2, 'Ellingsrudåsen')
];

//sendDepartureInfo(getFavouriteRequest(favs));

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
  .then(data => sendData(processData(data)));
}

function processData(data) {
  let allInfo = [];
 
  for (let stop of data) {
    let deviations = [];
    let departures = [];
    
    if (departures.length >= 4) {
      break;
    }
    
    let stopContent = stop['MonitoredStopVisits'];
    if (stopContent.length === 0) {
      continue;
    }
    let info = stopContent[0]['MonitoredVehicleJourney']
    let stopData = new StopData();
    stopData.id = stop['StopID'];
    stopData.name = getStopName(stopData.id);
    stopData.lineNumber = stop['LineID'];
    stopData.destination = stop['Destination'];
    stopData.vehicleType = getVehicleType(info['VehicleMode']);
    
    let lineId = stop['StopID'];
    for (let entry of stopContent) {
      let dd = entry['MonitoredVehicleJourney'];
      let ri = dd['MonitoredCall'];

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
    
    allInfo.push(stopData);
  }
  
  return allInfo;
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
  if (evt.data && evt.data.command == "update") {
    sendDepartureInfo(getFavouriteRequest(favs));
  }
}

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
function sendData(data) {
  if (SEND_AS_FILE) {
    sendAsFile(data);
  } else {
    messaging.peerSocket.send(data);
  }
}

function sendAsFile(data) {
  outbox.enqueue(STOP_DATA_FILE, cbor.encode(data))
    .then(evt => { return })
    .catch(error => console.log("Error sending settings: " + error));
}

function sendDataBuffered(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    let dataStr = JSON.stringify(data);
    message_buffer.push(TRANSFER_START);
    
    for (let i = 0; i < dataStr.length; i = i + MESSAGE_LENGTH) {
      let end = (i + MESSAGE_LENGTH) < dataStr.length ? (i + MESSAGE_LENGTH) : dataStr.length;
      message_buffer.push(dataStr.substring(i, end));
    }    
    
    message_buffer.push(TRANSFER_END);
    
    bufferedSend();
  }
}

function bufferedSend() {
  while (messaging.peerSocket.bufferedAmount < 128 && message_buffer.length > 0) {
    messaging.peerSocket.send(message_buffer.shift());
  }
}

messaging.peerSocket.onbufferedamountdecrease = () => {
  if (SEND_BUFFERED) {
    bufferedSend();
  }
}
