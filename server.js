'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var validUrl = require('valid-url');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

// Database config
const dbConfig = { useNewUrlParser: true, useUnifiedTopology: true };
mongoose.connect(process.env.MONGOLAB_URI, dbConfig);
var db = mongoose.connection; 
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Database connection successful');
})

const urlSchema = new mongoose.Schema({
  tag: Number,
  url: String,
})
const Url = mongoose.model('Url', urlSchema);

app.use(cors());

// mount the body-parser to handle POST body parsing
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

const getLatestUrlTag = () => {
  var latestTag;
  Url.find().sort({tag: -1}).limit(1).exec((err, results) => {
    if(err) {
      console.log("error finding last tag");
    } else {
      latestTag = results[0].tag;
      console.log("Latest tag: " + latestTag);
    }
  });
  return latestTag;
}

console.log("returned: " + getLatestUrlTag());

// post requests to /api/shorturl/new
app.post("/api/shorturl/new", function (req, res) {
  
  let url = req.body.url;

  // Test URL and send an error if invalid
  if(!validUrl.isUri(url)) {
    console.log("Invalid URL: " + url);
    res.json({"error": "invalid URL"});
    return;
  }
    
  let matches = url.match(/https?:\/\/([a-zA-Z0-9-.]+)/);
  let server = matches[1]; // extract the server name
  console.log("New URL: " + url + " (" + server + ")");

  dns.lookup(server, (err, address, family) => {
    if(err) {
      console.log("Invalid server");
      res.json({"error": "Invalid server"});
    } else {
      console.log('address: ' + address + " family: " + family);
      var newUrl = new Url({ tag: 1, url: url });
      newUrl.save((err, data) => {
        if(err) {
          console.log("error saving new URL to the db");
        } else {
          console.log("New URL successfully saved");
        }
      });
      res.json({"status": "OK"});
    }
  });
    
  
});

app.listen(port, function () {
  console.log('Node.js listening on port ' + port);
});