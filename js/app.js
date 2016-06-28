var app = angular.module("app", ['selectize']);

var view1Controller = app.controller("viewController", function ($scope, $http) {
    var SERVER_URL = "http://skylar.speech.cs.cmu.edu:9000/";
    $scope.actOptions = {
        valueField: 'name',
        labelField: 'name',
        placeholder: 'Pick Actions',
        delimiter: ',',
        maxItems: 10,
        onChange: function(value) {
            console.log("Check valid");
            $scope.validateActions();
        }
    };
    $scope.beliefOptions = {
        valueField: 'name',
        labelField: 'name',
        placeholder: 'Pick slot value',
        delimiter: ',',
        maxItems: 1
    };

    init();
    function init() {
        $scope.fileData = {};
        $scope.turns = [];
    }

    // get session wise values
    $scope.listFiles = [];
    $scope.terminals = [];
    $scope.turnYield = [];

    $http.get(SERVER_URL + "files").then(function(res){
        var files = res.data.data;
        var terminals = res.data.terminals;
        var turnYield = res.data.turn_yield;


        if (files.length > 0) {
            files.forEach(function (file) {
                $scope.listFiles.push({name: file});
            });

            $scope.selectedFile = files[0];
        }
        if (terminals.length > 0) {
            terminals.forEach(function (t) {
                $scope.terminals.push({name: t});
            });
        }
        if (turnYield.length > 0) {
            turnYield.forEach(function (t) {
                $scope.turnYield.push(t);
            });
        }
        console.log($scope.terminals.length + " terminals");
        console.log($scope.turnYield.length + " expects user input");
    });

    function getFileData(name) {
        $scope.loadingFileData = true;
        $http.get(SERVER_URL + "get/" + $scope.selectedFile).then(function(res){
            $scope.fileData = res.data.data;
            $scope.fileData.turns.forEach(function(turn) {
                $scope.turns.push({
                    mentions: turn.mentions,
                    belief: turn.belief,
                    history: turn.history,
                    actions: turn.actions,
                    valid: true
                });
            });
            $scope.loadingFileData = false;
        }, function(error) {
            alert("Can't load file data");
        });
    }

    $scope.validateActions = function() {
        var allGood = true;
        $scope.turns.forEach(function (turn){
            if (turn.actions.length <= 0) {
                turn.valid = false;
            } else {
                var good = true;
                for (var i = 0; i < turn.actions.length; i++) {
                    if (turn.actions[i].indexOf('next') > -1) {
                        continue;
                    }
                    var isYielding = $scope.turnYield.indexOf(turn.actions[i]) > -1;
                    if (i < turn.actions.length - 1) {
                        if (isYielding) {
                            good = false;
                            break;
                        }
                    } else if (i == turn.actions.length - 1){
                        if (!isYielding) {
                            good = false;
                        }
                    }
                }
                turn.valid = good;
                if (!good) {
                    allGood = false;
                }
            }
        });
        return allGood;
    };

    $scope.changeContentValue = function(content) {
        if (content.value == 'n') {
            content.value = 'y';
            content.displayName = 'Yes'
        }
        else {
            content.value = 'n';
            content.displayName = 'No'
        }
    };

    $scope.$watch("selectedFile", function (newValue){
        if (newValue) {
            init();
            getFileData(newValue);
        }
    });

    $scope.saveData = function() {
        var savedTurns = [];
        $scope.turns.forEach(function(turn) {
            savedTurns.push({
                mentions: turn.mentions,
                belief: turn.belief,
                actions: turn.actions
            })
        });
        var requestBody = {turns : savedTurns};
        $http.post(SERVER_URL + "save/" + $scope.selectedFile, requestBody).then(function(res) {
            alert("Save " + $scope.selectedFile + " successful")
        }, function (error) {
            alert("Save " + $scope.selectedFile + " failed")
        });
    };
});