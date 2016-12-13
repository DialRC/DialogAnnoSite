var app = angular.module("app", ['selectize']);

var dialogViewController = app.controller("dialogViewController", function ($scope, $http) {
    var SERVER_URL = "http://skylar.speech.cs.cmu.edu:9000/";
    // var SERVER_URL = "http://127.0.0.1:8000/";
    init();
    function init() {
        $scope.fileData = {};
        $scope.turns = [];
    }

    function mapToSent(actions, chat) {
        var sent = "";
        actions.forEach(function(act) {
            if (act in $scope.nlg) {
                if (act == "qachat_bot") {
                    sent = sent + " " + chat + ".";
                } else {
                    sent = sent + " " + $scope.nlg[act];
                }
            }
        });
        return sent;
    }

    function updateTurnSent() {
        $scope.turns.forEach(function (turn, turn_idx){
            turn.sent = mapToSent(turn.actions, $scope.turns[turn_idx].chat);
        });
    }

    function getFileData(name) {
        $scope.loadingFileData = true;
        $http.get(SERVER_URL + "get_dialog/" + $scope.selectedFile).then(function(res){
            $scope.fileData = res.data.data;
            console.log($scope.fileData);
            console.log($scope.fileData.turns);
            $scope.fileData.turns.forEach(function(turn, idx) {
                $scope.turns.push({
                    idx: idx,
                    mentions: turn.mentions,
                    belief: turn.belief,
                    slot_desc: turn.slot_desc,
                    history: turn.history,
                    chat: turn.chat,
                    actions: turn.actions,
                    sent: mapToSent(turn.actions, turn.chat),
                    valid: true
                });
            });
            // shuffle the turns to make is independent
            // shuffle($scope.turns);
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

    $scope.fileOptions = {
        valueField: 'name',
        labelField: 'label',
        placeholder: 'Pick file',
        maxItems: 1
    };

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
            files.forEach(function (file, f_idx) {
                $scope.listFiles.push({name: file, label: (f_idx+1)+". "+ file});
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
        console.log(Object.keys($scope.nlg).length + " nlg keys");
    });

    $scope.validateActions = function() {
        var allGood = true;
        $scope.turns.forEach(function (turn){
            if (turn.actions.length <= 0) {
                turn.valid = false;
            } else {
                var good = true;
                for (var i = 0; i < turn.actions.length; i++) {
                    if (turn.actions[i].indexOf('next') > -1 ||
                        turn.actions[i].indexOf('newcall') > -1) {
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

var nluViewController = app.controller("nluViewController", function ($scope, $http) {
    var SERVER_URL = "http://skylar.speech.cs.cmu.edu:9000/";

    init();
    function init() {
        $scope.utterances = [];
        $scope.intent_tags = [];
        $scope.domain_tags = [];
        var intent_tags = ["Inform", "Request", "wh-question", "yn-question",
            "Confirm", "Disconfirm", "Restart",
            "Goodbye", "Ask_repeat", "Other"];
        intent_tags.forEach(function (t) {
            $scope.intent_tags.push({name: t});
        });
        var domain_tags = ["art", "food", "travel", "weather",
            "QA", "shopping", "skills", "news", "translation", "movie"];
        domain_tags.forEach(function (t) {
            $scope.domain_tags.push({name: t});
        });
    }

    function getBatch(name) {
        $scope.loadingFileData = true;
        console.log("Fetch batch " + $scope.selectedBatch);
        $http.get(SERVER_URL + "get_utt_batch/" + $scope.selectedBatch).then(function(res){
            $scope.batchData = res.data.data;
            //console.log(res.data.data);
            $scope.batchData.forEach(function(utt, idx) {
                $scope.utterances.push({
                    key: utt.key,
                    query: utt.query,
                    intents: utt.intents,
                    domains: utt.domains
                });
            });
            console.log($scope.batchData);
            $scope.loadingFileData = false;
        }, function(error) {
            alert("Can't load file data");
        });
    }

    $http.get(SERVER_URL + "utt_batches").then(function(res){
        // get session wise values
        $scope.listBatches = [];
        $scope.data_size = res.data.data_size;
        $scope.label_data_size = res.data.label_data_size;

        for (var i=0; i < res.data.batch_number; i++) {
            $scope.listBatches.push({name: i.toString(), label: "batch " + (i+1).toString()});
        }
        $scope.selectedBatch = "0";
        console.log($scope.data_size + " utterance in total");
        console.log($scope.label_data_size + " already labelled");
        console.log($scope.listBatches.length + " batches");
    });

    $scope.batchOptions = {
        valueField: 'name',
        labelField: 'label',
        placeholder: 'Pick batch',
        maxItems: 1
    };

    $scope.tagOptions = {
        valueField: 'name',
        labelField: 'name',
        sortField: 'name',
        searchField: ['name'],
        placeholder: 'Pick Tags',
        delimiter: ',',
        maxItems: 10
    };

    $scope.$watch("selectedBatch", function (newValue){
        if (newValue) {
            init();
            getBatch(newValue);
        }
    });

    $scope.saveData = function() {
        var savedUtts = [];
        $scope.utterances.forEach(function(utt) {
            savedUtts.push({
                key: utt.key,
                query: utt.query,
                intents: utt.intents,
                domains: utt.domains
            });
        });
        var requestBody = {utterances : savedUtts};
        console.log(requestBody);
        $http.post(SERVER_URL + "save_utts", requestBody).then(function(res) {
            alert("Save " + $scope.selectedBatch + " successful");
            console.log(res.data);
            $scope.label_data_size = res.data.data;
            console.log("Updated " + res.data.data.toString() + " utts");
        }, function (error) {
            alert("Save " + $scope.selectedBatch + " failed")
        });
    };

});