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

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.post("/api/shorturl/new", function (req, res) {
  
  let url = req.body.url;
  
  if(validUrl.isUri(url)) {
    let matches = url.match(/https?:\/\/([a-zA-Z0-9-.]+)/);
    let server = matches[1]; // extract the server name
    console.log("New URL: " + url + " (" + server + ")");
    dns.lookup(server, (err, address, family) => {
      if(err) {
        console.log("Invalid server");
        res.json({"error": "Invalid server"});
      } else {
        console.log('address: ' + address + " family: " + family);
        res.json({"status": "OK"});
      }
    });
  } else {
    console.log("Invalid URL: " + url);
    res.json({"error": "invalid URL"});
  }
  
});

app.listen(port, function () {
  console.log('Node.js listening on port ' + port);
});