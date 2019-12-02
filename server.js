'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser'); // parsing of POST data
var validUrl = require('valid-url'); // URL validation
var dns = require('dns'); // DNS lookups
var dnsPromises = dns.promises;

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

app.use(cors());

// mount the body-parser to handle POST body parsing
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

// default page with form
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// Save post requests to /api/shorturl/new
app.post("/api/shorturl/new", function (req, res) {
  
  let url = req.body.url;

  // Test URL and send an error if invalid
  if(!validUrl.isUri(url)) {
    console.log("Invalid URL: " + url);
    res.json({"error": "invalid URL"});
    return;
  }
  
  // extract the server name from the URL
  let matches = url.match(/https?:\/\/([a-zA-Z0-9-.]+)/);
  let server = matches[1];

  dnsPromises.lookup(server).then(result => { // CHECK DNS
      console.log('DNS lookup successful: ' + result.address);
      // determine the latest short_url
      return Url.find().sort({short_url: -1}).limit(1).exec();
  })
  .then(results => { // SAVE URL TO DATABASE
      // calculate the next short_url by adding 1
      let newShort = results.length > 0 ? parseInt(results[0].short_url) + 1 : 1;
      let newUrl = new Url({ original_url: url, short_url: newShort });
      return newUrl.save();
  })
  .then(results => { // SEND SUCCESSFUL JSON RESPONSE
      console.log("New URL successfully saved");
      res.json({"original_url": results.original_url, "short_url": results.short_url});
  })
  .catch(err => { // CATCH AND SEND ERROR RESPONSES
    if(err.code === 'ENOTFOUND') {
      console.log("Error: server " + server + " not found");
      res.json({"error": "Invalid server" });
    } else {
      console.log(err);
      res.json({"error": err.toString() });
    }
  });
  
});

// Redirect requests to short URLs to their corresponding original URL
app.get("/api/shorturl/:short_url", (req, res) => {
  console.log("Looking for short_url " + req.params.short_url);
  Url.findOne({ short_url: req.params.short_url })
    .then(results => { // short URL found, redirect to original
      if(results) {
        console.log("Redirecting /api/shorturl/" + req.params.short_url + " to " + results.original_url); 
        res.redirect(results.original_url);
      } else { // short URL not found, output an error message
        res.send("<h2>Sorry, we're unable to find that URL</h2>");
      }
    }).catch(err => {
      console.log("Error" + err);
    });
});

// 404 error for anything else
app.get("*", (req, res) => {
  res.send("<h2>Error 404: Page not found</h2>");
});

// Database config
const dbConfig = { useNewUrlParser: true, useUnifiedTopology: true };
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
})
const Url = mongoose.model('Url', urlSchema);

// connect databse
mongoose
  .connect(process.env.MONGOLAB_URI, dbConfig)
  .then(result => {
    // start server
    app.listen(port, function () {
      console.log('Database connected, server listening');
    });
  })
  .catch(err => {
    console.log(err);
  });
