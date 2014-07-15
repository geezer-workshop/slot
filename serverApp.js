var _ = require('lodash'),
    helpers = require('./templateHelpers'),
    baseAppConstructor = require('./app');

module.exports = function(params) {

    var baseApp = baseAppConstructor({
        rootPath: params.rootPath + '/'
    });

    var app = baseApp.instance;

    _.extend(app, {

        wasRendered: false
    });

    return app;
};