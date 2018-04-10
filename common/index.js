export class Stop {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  name;
  id;
}

export class StopData {
  constructor(departures, deviations) {
    this.departures = departures;
    this.deviations = deviations;
  }
  departures;
  deviations;
}

export class Deviation {
  constructor(id, header) {
    this.id = id;
    this.header = header;
  }

  id;
  header;
}

export class Departure {
  lineNumber;
  destinationName;
  delay;
  aimedDepartureTime;
  expectedDepartureTime;
  platform;
  vehicleType;
  delay;
}