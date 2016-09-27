'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressHandlebars = require('express-handlebars');

var _expressHandlebars2 = _interopRequireDefault(_expressHandlebars);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _domain = require('domain');

var _connectMongo = require('connect-mongo');

var _connectMongo2 = _interopRequireDefault(_connectMongo);

var _connection = require('./db/connection');

var _connection2 = _interopRequireDefault(_connection);

var _dbseed = require('./db/dbseed');

var _dbseed2 = _interopRequireDefault(_dbseed);

var _routes = require('./routes');

var _routes2 = _interopRequireDefault(_routes);

var _credentials = require('./credentials');

var _credentials2 = _interopRequireDefault(_credentials);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();

// establish db connection based on environment;
var mongooseConnection = (0, _connection2.default)(app.get('env'));
// seed database with data with none present
(0, _dbseed2.default)();

// set mongo session store through mlab

var MongoStore = (0, _connectMongo2.default)(_expressSession2.default);

// handle uncaught errors
app.use(function (req, res, next) {
    // create domain fro request
    var domain = (0, _domain.create)();
    // handle errors on domain
    domain.on('error', function (err) {
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);

        try {
            // failsafe shutdown in 5 seconds
            setTimeout(function () {
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);

            //disconnect from cluster
            var worker = _cluster2.default.worker;
            if (worker) {
                worker.disconnect();
            }

            // stop taking new requests
            startServer().close();

            try {
                // attempt to use Express error route
                next(err);
            } catch (err) {
                // if Express error route fails try Node response
                console.error('Express error route failed\n', err.stack);
                res.status(500);
                res.setHeader('content-tpe', 'text/plain');
                res.end('Server error');
            }
        } catch (err) {
            console.error('Unable to send 500 response.\n', err.stack);
        }
    });

    // add the req and res objects to the domain
    domain.add(req);
    domain.add(res);

    // execute the rest of the request chain
    domain.run(next);
});

//cluster middleware to check which worker is handling request
app.use(function (req, res, next) {
    if (_cluster2.default.isWorker) {
        console.log('Worker ' + _cluster2.default.worker.id + ' received request.');
    }
    next();
});

//handlebars helpers
var helpers = {
    section: function section(name, options) {
        if (!this._sections) {
            this._sections = {};
        }
        this._sections[name] = options.fn(this);
        return null;
    }
};

//set up handlebars  view engine
var engine = _expressHandlebars2.default.create({ defaultLayout: 'main', helpers: helpers }).engine;
app.engine('handlebars', engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

//serve static content
app.use(_express2.default.static(__dirname + '/public'));

// parse application/x-www-form-urlencoded
app.use(_bodyParser2.default.urlencoded({ extended: true }));

// parse application/json
app.use(_bodyParser2.default.json());

//parse cookies, pass cookie secret as argument
app.use((0, _cookieParser2.default)(_credentials2.default.cookieSecret));

app.use((0, _expressSession2.default)({
    resave: false,
    saveUninitialized: false,
    secret: _credentials2.default.cookieSecret,
    store: new MongoStore({ mongooseConnection: mongooseConnection.connection })
}));

//test middleware
app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

//flash messages
//NOTE: to display flash messages make sure to redirect after setting the message
app.use(function (req, res, next) {
    //if there's a flash message, transfer it to the context then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

app.use((0, _morgan2.default)('dev'));

//handle routes
(0, _routes2.default)(app);

//custom 404 page
//404 responses are not the result of an error, error-handler middleware will not capture them
//add at the very bottom of the stack
app.use(function (req, res) {
    res.status(404).render('404');
});

//custom 500 page
//error handling middleware accepts 4 arguments
app.use(function (err, req, res, next) {
    console.error(err); // eslint-disable-line no-console
    res.status(500).render('500');
});

var startServer = function startServer() {
    return app.listen(app.get('port'), function () {
        console.log('Express started in ' + app.get('env') + ' mode on http://localhost:' + app.get('port') + ';'); // eslint-disable-line no-console
    });
};

// check to see if module is run directly as node meadowlark.js or is required in another module
if (require.main === module) {
    // app is run directly, run server
    startServer();
} else {
    // app is imported from another file via require
    module.exports = startServer;
}

//# sourceMappingURL=meadowlark-compiled.js.map