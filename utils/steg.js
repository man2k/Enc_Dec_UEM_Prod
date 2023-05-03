const fs = require("fs");
const steggy = require("steggy");
const sharp = require("sharp");
const { concatSeries } = require("async");

const convertJpgToPng = (jpgFilePath, pngFilePath, callback) => {
  sharp(jpgFilePath)
    .png()
    .toBuffer()
    .then((pngBuffer) => {
      fs.writeFile(pngFilePath, pngBuffer, (err) => {
        if (err) {
          return callback(err);
        }
        callback(null, pngBuffer);
      });
    })
    .catch((err) => {
      callback(err);
    });
};

const steganograph = (
  inputFilePath,
  outputFilePath,
  secret,
  pass,
  callback
) => {
  // console.log(inputFilePath);
  convertJpgToPng(inputFilePath, outputFilePath, (err, img) => {
    if (err) {
      console.log("lol error", err);
    } else {
      const steggyData = steggy.conceal(pass)(img, secret);
      fs.writeFileSync(outputFilePath, steggyData);
      callback(null);
    }
  });
};

const unsteganograph = (steganographedFilePath, pass, callback) => {
  const steganographedImageData = fs.readFileSync(steganographedFilePath);
  console.log(steganographedFilePath);

  try {
    const hiddenFileData = steggy.reveal(pass)(steganographedImageData);
    callback(null, hiddenFileData.toString());
  } catch (e) {
    callback(`unsteg ${steganographedFilePath}` + e);
  }
};

module.exports = { steganograph, unsteganograph };
