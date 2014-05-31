'use strict';

angular.module('proGridApp')
  .controller('MainCtrl', ['$scope', 'Randomcolor', function ($scope, Randomcolor) {
    var socket = io.connect();
    // Socket listener for updating grid
    var userColor = Randomcolor.new();
    var apiKey = 1;
    //heatmod
    var save = [];
    for(var y = 0; y < dimensions; y++) {
  		save.push(new Array(dimensions));}
    var clicksmax = 0;

    var updateGrid = function(row, col, color, clicks) {
      var selector = '.col_' + row + '_' + col;
      var el = document.querySelector(selector);
      if(el.style.backgroundColor) {
        el.style.backgroundColor = '';
      } else {
        el.style.backgroundColor = color;
      }
      if(clicks>clicksmax)clicksmax=clicks;
    };
    socket.on('server ready', function (data) {
      //grid is an array
      console.log('Hello There! Hope you are enjoying the app. Please be nice! Please help us fix our issues over at: https://github.com/pro-grid/pro-grid Thank you. -progrid.io');
      data.gridArray.forEach(function (element) {
        element.forEach(function (element) {
          updateGrid(element.row, element.col, element.color, element.clicks);
        });
      });
    });

    socket.on('fresh api key', function (data) {
      apiKey = data.apiKey;
    });

    socket.on('update', function (data) {
      updateGrid(data.row, data.col, data.color, data.clicks);
    });
    socket.on('connect', function () {
      $scope.message = false;
    });
    socket.on('disconnect', function () {
      $scope.message = {
        title: 'Disconnected',
        body: 'You have been disconnected. Feel free to refresh the page if this message doesn’t go away.'
      };
      console.log('goodbye');
    });

    $scope.dimensions = 32;

    $scope.generateGrid = function(num) {
      return new Array(num);
    };

    $scope.gridClicked = function(row, col) {
      updateGrid(row, col, userColor, clicks+1);
      socket.emit('clicked', { row: row, col: col, color: userColor, apiKey: apiKey, clicks: clicks });
    };

    $scope.gridRightClicked = function(row, col) {
      var selector = '.col_' + row + '_' + col;
      var el = document.querySelector(selector);
      userColor = colorToHex(el.style.backgroundColor);
    };

    $scope.closeMessage = function() {
      $scope.message = false;
    };

    $scope.gridClicked = _.throttle($scope.gridClicked, 100, {trailing: false});

	$scope.heatOn = function() {
	//savegrid
	for(var y = 0; y < dimensions; y++) {
  		for(var x = 0; x < dimensions; x++) {
    		save[y][x] = {row:y,col:x,clicks:z};
    		var red = Math.floor(save[y][x].clicks*255/clicksmax);
    		var redhex = "0123456789ABCDEF".charAt((red-red%16)/16)
    		 + "0123456789ABCDEF".charAt(red%16);
    		updateGrid(y,x,"#"+redhex+"00"+"00");
    		}
		}
	};

	$scope.heatOff = function() {
  	data.gridArray.forEach(function (element) {
    	element.forEach(function (element) {
      		updateGrid(element.row, element.col, element.color, element.clicks);
    		});
  		});
	});
}]);

angular.module('proGridApp')
  .directive('ngRightClick', function($parse) {
      return function(scope, element, attrs) {
          var fn = $parse(attrs.ngRightClick);
          element.bind('contextmenu', function(event) {
              scope.$apply(function() {
                  event.preventDefault();
                  fn(scope, {$event:event});
                });
            });
        };
    });

function colorToHex(color) {
  if (color.substr(0, 1) === '#') {
    return color;
  }
  var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);

  var red = parseInt(digits[2]);
  var green = parseInt(digits[3]);
  var blue = parseInt(digits[4]);

  var rgb = blue | (green << 8) | (red << 16);
  return digits[1] + '#' + rgb.toString(16);
}