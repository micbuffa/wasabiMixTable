var fs = require("fs");
// We need to use the express framework: have a real web server that knows how to send mime types etc.
var express=require('express');
var path = require('path');
// promises lib
var Q = require('q');

// Init globals variables for each module required
var app = express()
, http = require('http')
, server = http.createServer(app);


// Config
var PORT = '3000',
	TRACKS_PATH = './client/multitrack/',
    TRACKS_URL = 'multitrack/',
    addrIP = "0.0.0.0";

// launch the http server on given port
server.listen(PORT || 3000, "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});



app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  // For Microsoft browsers
  var url = req.originalUrl;
  if(url.endsWith("vtt")) {
     res.header("Content-Type", "text/vtt");
  }
  next();
});

app.use(express.static(path.resolve(__dirname, 'client')));


// routing
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

// routing
app.get('/track', function (req, res) {
	function sendTracks(trackList) {
		if (!trackList)
			return res.send(404, 'No track found');
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(trackList));
		res.end();
	}

	getTracks(sendTracks); 
});


String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// routing
app.get('/track/:id', function (req, res) {
	var id = req.params.id;
	
	function sendTrack(track) {
		if (!track)
			return res.send(404, 'Track not found with id "' + id + '"');
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(track));
		res.end();
	}

	getTrack(id, sendTrack); 

});


function getTracks(callback) {
	getFiles(TRACKS_PATH, callback);
}


function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function isASoundFile(fileName) {
    if(endsWith(fileName, ".mp3")) return true;
    if(endsWith(fileName, ".ogg")) return true;
    if(endsWith(fileName, ".wav")) return true;
    return false;
}

function getTrack(id, callback) {
	console.log("id = " + id);
	if(!id) return;

	getFiles(TRACKS_PATH + id, function(fileNames) {
		if(! fileNames) { 
			callback(null);
			return;
		}

		var track = {
			id: id,
			instruments: []
			
		};
		

		fileNames.sort();
		for (var i = 0; i < fileNames.length; i++) {
			// filter files that are not sound files
			if(isASoundFile(fileNames[i])) {
				var instrument = fileNames[i].match(/(.*)\.[^.]+$/, '')[1];
				track.instruments.push({
					name: instrument,
					sound: fileNames[i]
				});
			} else {
				continue;
			}
		}
		//  heck if there is a metadata.json file
		checkForMetaDataFile(track, id, callback);

	});
		
}

function  checkForMetaDataFile(track, id, callback) {
	var metadataFileName = TRACKS_PATH+id+'/'+'metadata.json';

	Q.nfcall(fs.readFile, metadataFileName, "utf-8")
	.then(function(data) {      
    	//console.log('##metadata.json file has been read for track: '+id);
    	track.metadata = JSON.parse(data);
    	track.metadata.tabFileName = TRACKS_URL + id + '/' +  track.metadata.tabFileName;
    	//console.log(track.metadata.tabFileName);
	})
	.fail(function(err) {
    	//console.log('no metadata.json file for this song: '+id);
	})
	.done(function() {
		//console.log("calling callback");
		callback(track);	
	});
}


function comparator(prop){
    return function(a,b){
        if( a[prop] > b[prop]){
            return 1;
        } else if( a[prop] < b[prop] ){
            return -1;
        }
        return 0;
    };
}

function getFiles(dirName, callback) {
	fs.readdir(dirName, function(error, directoryObject) {
		if(directoryObject !== undefined) {
		    directoryObject.sort();
		}
		callback(directoryObject);

	});
}

