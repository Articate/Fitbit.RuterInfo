export class Favourite {
  constructor(name, id, line, destination) {
    this.name = name;
    this.id = id;
    this.line = line;
    this.destination = destination;
  }

  name;
  id;
  line;
  destination;
}

export class StopData {
  name;
  id;
  lineNumber;
  destination;
  vehicleType;
  departures;
  deviations;
  
  constructor() {
    this.departures = [];
    this.deviations = [];
  }
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
  aimedDepartureTime;
  expectedDepartureTime;
  delay;
}