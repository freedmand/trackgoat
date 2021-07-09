import FitFileParser from "fit-file-parser";

const fitParser = new FitFileParser();

export function parseFitFile(file) {
  return new Promise((resolve, reject) => {
    file.arrayBuffer().then((buffer) => {
      fitParser.parse(buffer, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  });
}
