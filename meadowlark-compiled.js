'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressHandlebars = require('express-handlebars');

var _expressHandlebars2 = _interopRequireDefault(_expressHandlebars);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _formidable = require('formidable');

var _formidable2 = _interopRequireDefault(_formidable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();

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

//test middleware
app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/about', function (req, res) {
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

app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' + app.get('port') + ';'); // eslint-disable-line no-console
});

//# sourceMappingURL=meadowlark-compiled.js.map