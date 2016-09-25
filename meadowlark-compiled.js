'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressHandlebars = require('express-handlebars');

var _expressHandlebars2 = _interopRequireDefault(_expressHandlebars);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _formidable = require('formidable');

var _formidable2 = _interopRequireDefault(_formidable);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _domain = require('domain');

var _credentials = require('./credentials');

var _credentials2 = _interopRequireDefault(_credentials);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();

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
//api helpers
var validateEmail = function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
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
    secret: _credentials2.default.cookieSecret
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

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/about', function (req, res) {

    // Use to test domain uncaught error handling
    // setImmediate(() => {
    //     throw new Error('KABOOM!')
    // });
    res.render('about', { pageTestScript: '/qa/tests-about.js' });
});

app.get('/tours/hood-river', function (req, res) {
    res.render('tours/hood-river');
});

app.get('/tours/oregon-coast', function (req, res) {
    res.render('tours/oregon-coast');
});

app.get('/tours/request-group-rate', function (req, res) {
    res.render('tours/request-group-rate');
});

app.get('/newsletter', function (req, res) {
    res.render('newsletter', { csrf: 'CSRF token goes here' });
});

app.post('/newsletter', function (req, res) {
    var _req$body = req.body;
    var email = _req$body.email;
    var name = _req$body.name;

    if (!validateEmail(email)) {
        if (req.xhr) {
            return res.json({error: 'Invalid email address.'});
        }
        req.session.flash = {
            type: 'danger',
            intro: 'Validation error!',
            message: 'The email address entered was not valid'
        };
        return res.redirect(303, '/newsletter/archive');
    }
});

app.get('/contest/vacation-photo', function (req, res) {
    var now = new Date();
    res.render('contest/vacation-photo', { year: now.getUTCFullYear(), month: now.getMonth() });
});

app.post('/process', function (req, res) {
    if (req.xhr || req.accepts('json/html') === 'json') {
        res.send({ success: true });
    } else {
        res.redirect(303, '/thank-you');
    }
});

app.post('/contest/vacation-photo/:year/:month', function (req, res) {
    var form = new _formidable2.default.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (err) {
            return res.redirect(303, '/error');
        }
        console.log('Received fields:');
        console.log(fields);
        console.log('Received files');
        console.log(files);
        res.redirect(303, '/thank-you');
    });
});

app.get('/thank-you', function (req, res) {
    res.render('thankyou');
});

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