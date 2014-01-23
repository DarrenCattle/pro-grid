if(process.env.NEW_RELIC_APP_NAME) {
  require('newrelic');
} // requires new relic if the production env is heroku

var gridDimensions = 32;
var crypto = require('crypto');
var express = require('express');
var validator = require('validator');
var app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);
// valid api keys
var apiKeys = [];

function validateData(data, dimensions) {
  // yeah so what it's a long return statement why you talkin shit
  return validator.isInt(data.row) && validator.isInt(data.col) && validator.isHexColor(data.color) && data.row < dimensions && data.col < dimensions;
}

function generateApiKey (socket) {
  // works
  var key = crypto.randomBytes(48).toString('hex');
  console.log("socket: " + socket.id + " key: " + key);
  socket.set('apiKey', key, function() {
    apiKeys.push(key);
    socket.emit('fresh api key', { apiKey: key});
  });
}

function checkApiKey (key) {
  console.log('check this key ' + key);
  if(key && validator.isHexadecimal(key) && key.toString().length === 96) {
    var exists = apiKeys.indexOf(key);
    if(exists > -1) {
      apiKeys.splice(exists, 1);
      return true;
    } else {
      console.log("unsigned request, fuck you. Reason: key is not in the apiKeys array");
      return false;
    }
  } else {
    console.log("unsigned request, fuck you. Reason: key is not valid or key not provided");
    return false;
  }
}

// instantiate grid array
// this happens once per server boot
var grid = [];
for(var y = 0; y < gridDimensions; y++) {
  grid.push(new Array(gridDimensions));
  for(var x = 0; x < gridDimensions; x++) {
    grid[y][x] = {
      row: y,
      col: x,
      color: ""
    };
  }
}

function checkIfGridColored () {
  console.log("checking if grid is colored!");
  for (var y = 0; y < gridDimensions; y++) {
    for (var x = 0; x < gridDimensions; x++) {
      if (grid[y][x].color == '')
        return false;
    }
  }
  return true;
} 

/* server startup checks. If any of these fail the server will not run. 
 * the validateData function in order to start the server. 
 */
(function serverTests() {
  //test validateData
  console.log("info: Startup tests engage");
  var testData = {
    row: 10000,
    col: "notvalid",
    color: "totallynotvalid"
  }
  if(validateData(testData, 32) === true) {
    console.error("FAILED: validateData function is not working properly");
    process.exit(1);
  } else {
    console.log("PASSED: validateData is nominal");
  }
  if(!grid) {
    console.error("FAILED: grid is not instantiated properly");
    process.exit(1);
  } else {
    console.log("PASSED: grid instantiation nominal");
  }
}());

var port = process.env.PORT || 9001;
server.listen(port);

app.use(express.static(__dirname + '/dist'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/dist/index.html');
});

if(process.env.NODE_ENV === 'production') {

  io.enable('browser client minification');
  io.enable('browser client etag');        
  io.enable('browser client gzip');        
  io.set('log level', 1);                  
  io.set('transports', [
      'websocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);

}
io.set('log level', 1);    
io.sockets.on('connection', function (socket) {
  
  generateApiKey(socket);
  console.log("api keys registered:\n" + apiKeys.join('\n'));
  socket.emit('server ready', { gridArray: grid });
  //Socket listener for user click
  socket.on('clicked', function (data) {
    var check = checkApiKey(data.apiKey);
    console.log("check " + check);
    if(validateData(data, gridDimensions) && check) {
      var gridCol = grid[data.row][data.col];
      generateApiKey(socket);
      if(gridCol.color == '') {
        gridCol.color = data.color;
        if (checkIfGridColored()) {
          console.log('Clearing grid!');
          for (var y = 0; y < gridDimensions; y++) {
            for (var x = 0; x < gridDimensions; x++) {
              var resetGridCol = grid[y][x];
              resetGridCol.color = '';
              socket.broadcast.emit('update', resetGridCol);
            }
          }
        }
      } else {
        gridCol.color = '';
      }
      socket.broadcast.emit('update', gridCol);
    } else {
      socket.emit('naughty', { message: "goodbye"});
      socket.disconnect();
    }    
  });

  socket.on('disconnect', function() {
    socket.get('apiKey', function(err, key) {
      apiKeys.splice(apiKeys.indexOf(key), 1);
    });
  });

});