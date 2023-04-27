const crypto = require("crypto");
const fs = require("fs");
function decryptFile(inputFile, outputFile, key, algo, callback) {
  fs.readFile(inputFile, (err, input) => {
    if (err) {
      console.log(err);
    } else {
      try {
        const iv = input.slice(0, 16); //Buffer.from(input.toString("hex").slice(0, 32), "hex");
        input = input.slice(16); //Buffer.from(input.toString("hex").slice(32), "hex");
        const decipher = crypto.createDecipheriv(
          algo,
          Buffer.from(key, "hex"),
          iv
        );
        const decrypted = Buffer.concat([
          decipher.update(input),
          decipher.final(),
        ]);
        outputFile;

        fs.writeFile(outputFile, decrypted, (err) => {
          if (err) {
            callback(err);
          } else {
            fs.unlink(`${inputFile}`, (err) => {
              if (err) throw err;
            });
            callback(null);
          }
        });
      } catch (err) {
        callback(err);
      }
    }
  });
}

module.exports = decryptFile;
