import { parseFitFile } from "./fitFile";

export class Workout {
  constructor(fitData) {
    this.fitData = fitData;
    this.coords = this.fitData.records
      .map((x) => [x.position_long, x.position_lat])
      .filter((x) => x[0] != null);
  }

  static async fromFile(file) {
    return new Workout(await parseFitFile(file));
  }
}
