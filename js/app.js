var app = angular.module("app", ['selectize']);

var view1Controller = app.controller("viewController", function ($scope, $http) {
    var SERVER_URL = "http://skylar.speech.cs.cmu.edu:9000/";
    init();
    function init() {
        $scope.fileData = {};
        $scope.turns = [];
    }

    function mapToSent(actions) {
        var sent = "";
        actions.forEach(function(act) {
            if (act in $scope.nlg) {
                sent = sent + " " + $scope.nlg[act];
            }
        });
        return sent;
    }

    function updateTurnSent() {
        $scope.turns.forEach(function (turn){
            turn.sent = mapToSent(turn.actions);
        });
    }

    function getFileData(name) {
        $scope.loadingFileData = true;
        $http.get(SERVER_URL + "get/" + $scope.selectedFile).then(function(res){
            $scope.fileData = res.data.data;
            $scope.fileData.turns.forEach(function(turn, idx) {
                $scope.turns.push({
                    idx: idx,
                    mentions: turn.mentions,
                    belief: turn.belief,
                    slot_desc: turn.slot_desc,
                    history: turn.history,
                    actions: turn.actions,
                    sent: mapToSent(turn.actions),
                    valid: true
                });
            });
            // shuffle the turns to make is independent
            shuffle($scope.turns);
            $scope.loadingFileData = false;
        }, function(error) {
            alert("Can't load file data");
        });
    }

    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    $scope.actOptions = {
        valueField: 'name',
        labelField: 'name',
        sortField: 'name',
        searchField: ['name'],
        placeholder: 'Pick Actions',
        delimiter: ',',
        maxItems: 10,
        onChange: function(value) {
            console.log("Check valid");
            $scope.validateActions();
            updateTurnSent();
        }
    };
    $scope.beliefOptions = {
        valueField: 'name',
        labelField: 'name',
        searchField: ['name'],
        placeholder: 'Pick slot value',
        delimiter: ',',
        maxItems: 1
    };

    $http.get(SERVER_URL + "files").then(function(res){
        // get session wise values
        $scope.listFiles = [];
        $scope.terminals = [];
        $scope.turnYield = [];
        $scope.nlg = [];

        var files = res.data.data;
        var terminals = res.data.terminals;
        var turnYield = res.data.turn_yield;
        $scope.nlg = res.data.nlg;

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
        console.log($scope.nlg.length + " nlg keys");
    });

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
            savedTurns[turn.idx] = {
                mentions: turn.mentions,
                belief: turn.belief,
                actions: turn.actions
            };
        });
        var requestBody = {turns : savedTurns};
        $http.post(SERVER_URL + "save/" + $scope.selectedFile, requestBody).then(function(res) {
            alert("Save " + $scope.selectedFile + " successful")
        }, function (error) {
            alert("Save " + $scope.selectedFile + " failed")
        });
    };
});