import express from 'express';
import handlebars from'express-handlebars';
import bodyParser from 'body-parser';
import formidable from 'formidable';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import morgan from 'morgan';
import cluster from 'cluster';

import credentials from './credentials';

const app = express();

//cluster middleware to check which worker is handling request
app.use((req, res, next) => {
    if (cluster.isWorker) {
        console.log(`Worker ${cluster.worker.id} received request.`)
    }
});

//handlebars helpers
const helpers = {
    section: function (name, options) {
        if (!this._sections) {
            this._sections = {};
        }
        this._sections[name] = options.fn(this);
        return null;
    }
};
//api helpers
const validateEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};

//set up handlebars  view engine
const engine = handlebars.create({defaultLayout: 'main', helpers}).engine;
app.engine('handlebars', engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

//serve static content
app.use(express.static(__dirname + '/public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

// parse application/json
app.use(bodyParser.json());

//parse cookies, pass cookie secret as argument
app.use(cookieParser(credentials.cookieSecret));

app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret
}));

//test middleware
app.use((req, res, next) => {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

//flash messages
//NOTE: to display flash messages make sure to redirect after setting the message
app.use((req, res, next) => {
    //if there's a flash message, transfer it to the context then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) => {
    res.render('about', {pageTestScript: '/qa/tests-about.js'});
});

app.get('/tours/hood-river', (req, res) => {
    res.render('tours/hood-river');
});

app.get('/tours/oregon-coast', (req, res) => {
    res.render('tours/oregon-coast');
});


app.get('/tours/request-group-rate', (req, res) => {
    res.render('tours/request-group-rate');
});

app.get('/newsletter', (req, res) => {
    res.render('newsletter', {csrf: 'CSRF token goes here'});
});

app.post('/newsletter', (req, res) => {
    const {email, name} = req.body;
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

app.get('/contest/vacation-photo', (req, res) => {
    const now = new Date();
    res.render('contest/vacation-photo', {year: now.getUTCFullYear(), month: now.getMonth()});
});

app.post('/process', (req, res) => {
    if (req.xhr || req.accepts('json/html') === 'json') {
        res.send({success: true})
    } else {
        res.redirect(303, '/thank-you')
    }
});

app.post('/contest/vacation-photo/:year/:month', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.redirect(303, '/error');
        }
        console.log('Received fields:');
        console.log(fields);
        console.log('Received files');
        console.log(files);
        res.redirect(303, '/thank-you');
    })
});


app.get('/thank-you', (req, res) => {
    res.render('thankyou');
});

//custom 404 page
//404 responses are not the result of an error, error-handler middleware will not capture them
//add at the very bottom of the stack
app.use((req, res)=> {
    res.status(404).render('404');
});

//custom 500 page
//error handling middleware accepts 4 arguments
app.use((err, req, res, next) => {
    console.error(err); // eslint-disable-line no-console
    res.status(500).render('500');
});

const startServer = () => {
    app.listen(app.get('port'), () => {
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