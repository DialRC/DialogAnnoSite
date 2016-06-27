var app = angular.module("app", ['selectize']);

var view1Controller = app.controller("viewController", function ($scope, $http) {
    var SERVER_URL = "http://localhost:8000/";
    $scope.actOptions = {
        valueField: 'name',
        labelField: 'name',
        placeholder: 'Pick Actions',
        delimiter: ',',
        maxItems: 10,
        onChange: function(value) {
            console.log("Check valid");
            validateActions();
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
        $scope.label2 = [];
        $scope.label1 = [];
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

    function processContent(turns) {
        turns.forEach(function(turn, index){
            var contentArrs = [];
            turn.content.forEach(function(content) {
                contentArrs.push({content: content, value: 'n', displayName: 'No'});
            });
            $scope.turns[index].label2 = contentArrs;
        });
    }

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
                })
            });
            if ($scope.fileData.turns[0].label) {
                decodeLabel($scope.fileData.turns);
            } else {
                processContent($scope.fileData.turns);
            }
            $scope.loadingFileData = false;
        }, function(error) {
            alert("Can't load file data");
        });
    }

    $scope.validateActions = function() {
        var allGood = true;
        $scope.turns.forEach(function (turn, idx){
            if (turn.actions.length <= 0) {
                turn.valid = false;
            } else {
                var good = true;
                for (var i = 0; i < turn.actions.length; i++) {
                    var isYielding = $scope.turnYield.indexOf(turn.actions[i]) > 0;
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
        var requestBody = {turns : []};
        $scope.turns.forEach(function (turn, turnIndex){
            requestBody.turns.push({
                "label-1": "",
                "label-2": []
            });
            turn.label1.forEach(function(label, index){
                requestBody.turns[turnIndex]["label-1"] = requestBody.turns[turnIndex]["label-1"] + label.row1 + "-" + label.row2;
                if (index < turn.label1.length - 1) {
                    requestBody.turns[turnIndex]["label-1"] = requestBody.turns[turnIndex]["label-1"] + " "
                }
            });

            turn.label2.forEach(function(arrContent,index) {
                requestBody.turns[turnIndex]["label-2"].push(arrContent.content + "-" + arrContent.value);
            });
        });

        $http.post(SERVER_URL + "save/" + $scope.selectedFile, requestBody).then(function(res) {
            alert("Save " + $scope.selectedFile + " successful")
        }, function (error) {
            alert("Save " + $scope.selectedFile + " failed")
        });
    };

    function decodeLabel(turns) {
        turns.forEach(function(turn, index){
            var label1 = turn.label["label-1"].split(" ");
            label1.forEach(function(lb) {
                var data = lb.split("-");
                if (!$scope.turns[index].label1) {
                    $scope.turns[index].label1 = [];
                }
                $scope.turns[index].label1.push({row1: angular.copy(data[0]), row2: angular.copy(data[1])});
            });

            turn.label["label-2"].forEach(function(lb) {
                var value = lb.substring(lb.length - 1,lb.length);
                var content = lb.substring(0, lb.length - 2);
                var displayName = "";
                if (value == 'n') {
                    displayName = "No"
                } else {
                    displayName = "Yes"
                }
                if (!$scope.turns[index].label2) {
                    $scope.turns[index].label2 = [];
                }
                $scope.turns[index].label2.push({content: content, value: value, displayName: displayName});
            })
        });
    }
});