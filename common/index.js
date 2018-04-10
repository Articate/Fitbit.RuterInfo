export class Stop {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }
}

export class Departure {
  let lineNumber;
  let destinationName;
  let delay;
  let aimedDepartureTime;
  let expectedDepartureTime;
  let platform;
  let vehicleType;
}

export function getVehicleType(type) {
  let type_string;
  switch type:
    case 0:
      return 'bus';    
    default:
      return 'metro';
}