var app = angular.module("app", ['selectize']);
//var SERVER_URL = "http://skylar.speech.cs.cmu.edu:9000/";
var SERVER_URL = "http://127.0.0.1:8000/";

// controller for the END-to-END page
var dialogViewController = app.controller("dialogViewController", function ($scope, $http) {
    init();
    function init() {
        $scope.fileData = {};
        $scope.turns = [];
    }

    function getFileData(name) {
        $scope.loadingFileData = true;
        $http.get(SERVER_URL + "get_dialog/" + $scope.selectedFile).then(function(res){
            $scope.fileData = res.data.data;
            console.log($scope.fileData);
            console.log($scope.fileData.turns);
            $scope.fileData.turns.forEach(function(turn, idx) {
                var norm_turn = JSON.parse(JSON.stringify(turn));
                norm_turn["sys_utt"] = turn.sys_utt;
                if ("woz_utt" in turn) {
                    norm_turn["woz_utt"] = turn.woz_utt;
                } else {
                    norm_turn["woz_utt"] = turn.sys_utt;
                }
                norm_turn["idx"] = idx;
                norm_turn["final_pause"] = Math.round(turn.final_pause);
                $scope.turns.push(norm_turn);
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
        var files = res.data.data;
        if (files.length > 0) {
            files.forEach(function (file, f_idx) {
                $scope.listFiles.push({name: file, label: (f_idx+1)+". "+ file});
            });
            $scope.listFiles.reverse();
            $scope.selectedFile = files[files.length-1];
        }
    });

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
                belief: turn.belief,
                woz_utt: turn.woz_utt
            };
        });
        console.log(savedTurns);
        var requestBody = {turns : savedTurns};
        $http.post(SERVER_URL + "save/" + $scope.selectedFile, requestBody).then(function(res) {
            alert("Save " + $scope.selectedFile + " successful")
        }, function (error) {
            alert("Save " + $scope.selectedFile + " failed")
        });
    };
});

// controller for the NLU page
var nluViewController = app.controller("nluViewController", function ($scope, $http) {

    init();
    function init() {
        $scope.newUtts = "";
        $scope.utterances = [];
        $scope.intent_tags = [];
        $scope.domain_tags = [];
        var intent_tags = ["greeting", "inform", "request", "wh-question", "yn-question",
            "confirm", "disconfirm", "restart",
            "goodbye", "ask_repeat", "dont_care", "other"];

        intent_tags.forEach(function (t) {
            $scope.intent_tags.push({name: t});
        });
        var domain_tags = ["art", "food", "hotel", "bus", "flight", "weather", "game",
            "QA", "shopping", "skills", "news", "translation", "movie", "other"];
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
                    domains: utt.domains,
                    black_domains: utt.black_domains,
                    last_update: utt.last_update
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
                domains: utt.domains,
                black_domains: utt.black_domains
            });
        });
        var requestBody = {utterances : savedUtts};
        console.log(requestBody);
        $http.post(SERVER_URL + "save_utts", requestBody).then(function(res) {
            alert("Save batch-" + $scope.selectedBatch + " successful");
            console.log(res.data);
            $scope.label_data_size = res.data.data;
            console.log("Updated " + res.data.data.toString() + " utts");
        }, function (error) {
            alert("Save batch-" + $scope.selectedBatch + " failed")
        });
    };
    
    $scope.addData = function () {
        if ($scope.newUtts.length <= 0) {
            return;
        }
        var uttList = $scope.newUtts.split("\n");
        var requestBody = {utterances : uttList};
        console.log(requestBody);
        $http.post(SERVER_URL + "add_utts", requestBody).then(function(res) {
            alert("Add new utterances successful");
            console.log(res.data);
            $scope.newUtts = "";
        }, function (error) {
            alert("Submit failed")
        });
    }
});

// controller for teh Cheat Sheet Page
var cheatsheetViewController = app.controller("cheatsheetController", function($scope, $http) {
    // cheat sheet
    $scope.intent_defs = [
        {tag: "greeting", def: "say hi"},
        {tag: "inform", def: "give some information about slots values"},
        {tag:"request", def: "ask for something, e.g. tell me, give me, I'd like etc"},
        {tag: "wh-question", def:"a question begin with WH"},
        {tag: "yn-question", def:"a question expects Y/N answer"},
        {tag: "confirm", def:"express yes"},
        {tag: "disconfirm", def:"express no"},
        {tag: "restart", def:"special command to reset Skylar to initial state"},
        {tag: "goodbye", def:"intend to end the dialog"},
        {tag: "ask_repeat", def:"request skylar to repeat the last prompt"},
        {tag: "dont_care", def:"anything is fine, I don't care"},
        {tag: "other", def:"when there is a clear intent, but not in the list"}];
    $scope.domain_defs = [
        {tag: "art", def: "give some information"},
        {tag: "food", def: "restaurant"},
        {tag: "hotel", def: "hotels"},
        {tag: "bus", def: "bus schedule"},
        {tag: "flight", def: "flights inforation"},
        {tag: "weather", def: "weather info"},
        {tag: "game", def: "play a game"},
        {tag: "QA", def: " wikipedia-like question answering"},
        {tag: "shopping", def: "shopping mall"},
        {tag: "skills", def: "what skill does Skylar have"},
        {tag: "news", def: "about news, latest events"},
        {tag: "translation", def: "e.g. en to fr"},
        {tag: "movie", def: "latest movie, where to watch"},
        {tag: "other", def: "when there is a clear topic, but not in the list"}];
});