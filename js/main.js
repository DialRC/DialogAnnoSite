require.config({
    // alias libraries paths
    paths: {
        'jquery' : '../bower_components/jquery/dist/jquery.min',
        'domReady': '../bower_components/requirejs-domready/domReady',
        'angular': '../bower_components/angular/angular.min',
        'bootstrap': '../bower_components/bootstrap/dist/js/bootstrap.min'
    },

    // angular does not support AMD out of the box, put it in a shim
    shim: {
        'angular': {
            deps: ['jquery'],
            exports: 'angular'
        },
        'bootstrap' : {deps: ['jquery']}
    },

    // kick start application
    deps: ['./bootstrap']
});