const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = {
  exposedHeaders: ["Content-Disposition", "filename", "x-key"],
};
require("dotenv").config();

const port = process.env.PORT || 3000;

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const encryptFile = require("./utils/encryptFile");
const decryptFile = require("./utils/decryptFile");
const { steganograph, unsteganograph } = require("./utils/steg");

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", express.static(path.resolve(__dirname, "public")));

const makeStorage = () => {
  if (!fs.existsSync("/tmp/uploads")) {
    fs.mkdirSync("/tmp/uploads");
  }
  if (!fs.existsSync("/tmp/uploads/store")) {
    fs.mkdirSync("/tmp/uploads/store");
  }
  if (!fs.existsSync("/tmp/uploads/store/steganograph")) {
    fs.mkdirSync("/tmp/uploads/store/steganograph");
  }
};
makeStorage();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    makeStorage();
    cb(null, "/tmp/uploads/store");
  },
  filename: (req, file, cb) => {
    const filename = `forenc.${file.mimetype.split("/")[1]}`;
    cb(null, filename);
  },
});

const storagedec = multer.diskStorage({
  destination: (req, file, cb) => {
    makeStorage();
    cb(null, "/tmp/uploads/store");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    makeStorage();
    cb(null, "/tmp/uploads/store/steganograph");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname + ".png");
  },
});

const storage3 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/tmp/uploads/store/steganograph");
  },
  filename: function (req, file, cb) {
    cb(null, "steganographed.png");
  },
});

const upload = multer({ storage: storage });
const uploadEnc = multer({ storage: storagedec });
const upload2 = multer({ storage: storage2 });
const upload3 = multer({ storage: storage3 });
let originalFileName;
let originalFilePath;
app.post("/upload/enc", upload.single("file"), (req, res) => {
  const file = req.file;
  originalFilePath = req.file.path;
  originalFileName = req.file.originalname;
  if (!file) {
    return res.status(400).json({ error: "File Upload Failed" });
  }
  console.log("File Uploaded Successfully");
  res.status(200).json({ success: true });
});
app.post("/upload/dec", uploadEnc.single("file"), (req, res) => {
  const file = req.file;
  originalFilePath = req.file.path;
  originalFileName = req.file.originalname;
  if (!file) {
    return res.status(400).json({ error: "File Upload Failed" });
  }
  console.log("File Uploaded Successfully");
  res.status(200).json({ success: true });
});

app.post("/upload/steg", upload2.single("file"), (req, res) => {
  const file = req.file;
  const secret = req.body.secret;
  const pass = req.body.password;

  steganograph(
    `/tmp/uploads/store/steganograph/${file.filename}`,
    `/tmp/uploads/store/steganograph/steganographed.png`,
    secret,
    pass,
    (err) => {
      res.json({ success: true });
    }
  );
});

app.post("/unsteg", upload3.single("file"), (req, res) => {
  try {
    unsteganograph(
      `/tmp/uploads/store/steganograph/steganographed.png`,
      req.body.password,
      (err, secret) => {
        if (err) {
          res.status(400).json({ error: "Wrong Password" });
        } else {
          const Regex = /^[a-zA-Z0-9_.-]*$/gm;
          if (Regex.exec(secret)[0]) {
            res.status(200).json({ secret: secret });
          } else {
            res.status(400).json({ error: "Wrong Password" });
          }
        }
      }
    );
  } catch (e) {
    console.error(e);
    res.send("error unsteg", e);
  }
});

app.get("/execsteg", (req, res) => {
  res.download("/tmp/uploads/store/steganograph/steganographed.png");
});

app.get("/encrypt/:algo", (req, res) => {
  const { algo } = req.params;
  if (fs.existsSync(originalFilePath) && originalFilePath) {
    encryptFile(
      originalFilePath,
      `/tmp/uploads/store/${originalFileName}.enc`,
      algo,
      (err, key) => {
        if (err) {
          console.error("err", err);
          res.status(400).redirect("/");
        } else if (key) {
          console.log("File Encrypted Successfully");
          const file = fs.readFileSync(
            `/tmp/uploads/store/${originalFileName}.enc`
          );
          res
            .status(200)
            .set("x-key", key.toString("hex"))
            .download(`/tmp/uploads/store/${originalFileName}.enc`); //.json({ key: key.toString("hex") });
        }
      }
    );
  } else {
    res.json({ success: false });
  }
});

app.post("/decrypt/:algo", (req, res) => {
  const { algo } = req.params;
  if (fs.existsSync(originalFilePath)) {
    // console.log(__dirname);
    decryptFile(
      originalFilePath,
      `/tmp/uploads/store/${originalFileName.replace(".enc", "")}`,
      req.body.key,
      algo,
      (err) => {
        if (err) {
          console.error("err", err);
          res.status(400).json({ success: false, error: err });
        } else {
          console.log("File Decrypted Successfully");

          const options = {
            root: `/tmp/uploads/store/`,
          };
          fs.readdir("/tmp/uploads/store/", (err, files) => {
            files.forEach((file) => {
              console.log(file);
            });
          });
          res.header("filename", originalFileName.replace(".enc", ""));

          res.sendFile(originalFileName.replace(".enc", ""), options, (e) => {
            if (e) {
              console.log(e);
            } else {
              console.log("File Sent Successfully");
              fs.unlink(
                `/tmp/uploads/store/${originalFileName.replace(".enc", "")}`,
                (err) => {
                  if (err) throw err;
                }
              );
            }
          });
        }
      }
    );
  } else {
    res.json({ success: false });
  }
});

const server = () => {
  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });
};

server();
// app.listen(port, () => {
//   console.log(`App listening at http://localhost:${port}`);
// });
