
const express =require("express");
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const { log } = require("console");

const app =express();


// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// MongoURI
const mongoUri="mongodb://localhost:27017/mongodb-upload";

// Create connection to mongodb
const conn=mongoose.createConnection(mongoUri)

// Init gfs
let gfs;
let gridfsBucket;
conn.once("open",()=>{
    // Init stream
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db,{bucketName: 'uploads'});
    gfs= Grid(conn.db,mongoose.mongo)
    gfs.collection("uploads");
});


// Create Storage Engine 
const storage = new GridFsStorage({
    url: mongoUri,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
        //   const metadata="Kemani";
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads',
           
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });


app.set("view engine","ejs");

app.get("/",(req,res)=>{
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
          res.render('index', { files: false });
        } else {
          files.map(file => {
            if (
              file.contentType === 'image/jpeg' ||
              file.contentType === 'image/png'
            ) {
              file.isImage = true;
            } else {
              file.isImage = false;
            }
          });
          res.render('index', { files: files });
        }
      });
    // res.render("index")
})


app.post('/upload',upload.single('file'),(req,res)=>{
    res.redirect("/")
    // res.json({file:req.file});
})


// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: 'No files exist'
        });
      }
      // Files exist
      return res.json(files);
    });
  });


// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      // File exists
      return res.json(file);
    });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      // Check if image
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        // Read output to browser
        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
        // const readstream = gfs.createReadStream(file.filename);
        // readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    });
  });

// @route DELETE /files/:id
// @desc  Delete file
app.post('/files/:id', (req, res) => {
    // res.json({files:"File has been attemted to be delted"})
    gfs.remove({_id:req.params.id, root:'uploads' }, (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
      res.redirect('/');
    });
  });

const port =5000;
app.listen(port,()=>{
    console.log(`Server Started on port ${port}`);
})