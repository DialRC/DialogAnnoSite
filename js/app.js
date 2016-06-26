var app = angular.module("app", ['selectize']);

var view1Controller = app.controller("viewController", function ($scope, $http) {
    var SERVER_URL = "http://skylar.speech.cs.cmu.edu:9000/";
    init();
    $scope.listFiles = [];
    $http.get(SERVER_URL + "list").then(function(res){
        var files = res.data.data;
        if (files.length > 0) {
            files.forEach(function (file) {
                $scope.listFiles.push({name: file})
            });

            $scope.selectedFile = files[0];
        }
    });

    $scope.removeLabel1 = removeLabel1;

    $scope.addLabel1 = function (turn) {
        if (!turn.label1) {
            turn.label1 = [];
        }
        turn.label1.push({row1: angular.copy(turn.row1), row2: angular.copy(turn.row2)});
        turn.row1 = undefined;
        turn.row2 = undefined;
    };

    function processContent(turns) {
        turns.forEach(function(turn, index){
            var contentArrs = [];
            turn.content.forEach(function(content) {
                contentArrs.push({content: content, value: 'n', displayName: 'No'});
            });
            $scope.turns[index].label2 = contentArrs;
            // $scope.label2.push({content: content, value: 'n', displayName: 'No'});
        });
    }

    function getFileData(name) {
        $scope.loadingFileData = true;
        $http.get(SERVER_URL + "get/" + $scope.selectedFile).then(function(res){
            $scope.fileData = res.data.data;
            $scope.fileData.turns.forEach(function(turn) {
                $scope.turns.push({
                    comment: turn.comment
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

    function init() {
        $scope.label2 = [];
        $scope.label1 = [];
        $scope.fileData = {};
        $scope.turns = [];
    }

    $scope.saveData = function() {
        var requestBody = {turns : []};
        $scope.turns.forEach(function (turn, turnIntex){
            requestBody.turns.push({
                "label-1": "",
                "label-2": []
            });
            turn.label1.forEach(function(label, index){
                requestBody.turns[turnIntex]["label-1"] = requestBody.turns[turnIntex]["label-1"] + label.row1 + "-" + label.row2;
                if (index < turn.label1.length - 1) {
                    requestBody.turns[turnIntex]["label-1"] = requestBody.turns[turnIntex]["label-1"] + " "
                }
            });

            turn.label2.forEach(function(arrContent,index) {
                requestBody.turns[turnIntex]["label-2"].push(arrContent.content + "-" + arrContent.value);
            });
        });

        console.log(requestBody);
/*        $scope.label1.forEach(function(label, index){
            requestBody["label-1"] = requestBody["label-1"] + label.row1 + "-" + label.row2;
            if (index < $scope.label1.length -1) {
                requestBody["label-1"] = requestBody["label-1"] + " "
            }
            console.log(requestBody)
        });

        $scope.label2.forEach(function(arrContent) {
            requestBody["label-2"].push(arrContent.content + "-" + arrContent.value);
        });*/

        $http.post(SERVER_URL + "save/" + $scope.selectedFile, requestBody).then(function(res) {
            alert("Save " + $scope.selectedFile + " successful")
        }, function (error) {
            alert("Save " + $scope.selectedFile + " failed")
        });
    }

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

    $scope.checkLabel1 = function() {
        console.log($scope.turns);
        var check  = false;
        $scope.turns.forEach(function(turn) {
            if (!turn.label1 || turn.label1.length <= 0) {
                check = true;
            }
        });
        return check;
    };

    function removeLabel1(label, index) {
        label.splice(index, 1);
    }
});