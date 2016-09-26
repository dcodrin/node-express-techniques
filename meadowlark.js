import express from 'express';
import handlebars from'express-handlebars';
import bodyParser from 'body-parser';
import formidable from 'formidable';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import morgan from 'morgan';
import cluster from 'cluster';
import {create} from 'domain';
import {validateEmail, saveContestEntry, convertFromUSD} from './api/api';
import fs from 'fs';
import connectMongo from 'connect-mongo';

import connection from './db/connection';
import Vacation from './db/models/vacation';
import VacationInSeasonListener from './db/models/vacationInSeasonListener';
import seedDatabase from './db/dbseed';

// Check if paths exists if not create them
const dataDir = __dirname + '/data';
const vacationPhotoDir = __dirname + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);


import credentials from './credentials';

const app = express();

// establish db connection based on environment;
const mongooseConnection = connection(app.get('env'));
// seed database with data with none present
seedDatabase();

// set mongo session store through mlab

const MongoStore = connectMongo(expressSession);


// handle uncaught errors
app.use((req, res, next) => {
    // create domain fro request
    const domain = create();
    // handle errors on domain
    domain.on('error', (err) => {
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);

        try {
            // failsafe shutdown in 5 seconds
            setTimeout(() => {
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);

            //disconnect from cluster
            const worker = cluster.worker;
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
app.use((req, res, next) => {
    if (cluster.isWorker) {
        console.log(`Worker ${cluster.worker.id} received request.`)
    }
    next();
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
    secret: credentials.cookieSecret,
    store: new MongoStore({mongooseConnection: mongooseConnection.connection})
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

    // Use to test domain uncaught error handling
    // setImmediate(() => {
    //     throw new Error('KABOOM!')
    // });
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

app.get('/vacations', (req, res) => {
    Vacation.find({available: true}, (err, vacations) => {
        const context = {
            currency: req.session.currency || 'USD',
            vacations: vacations.map(vacation => {
                let {sku, name, description, inSeason, priceInCents} = vacation;
                return {
                    sku,
                    name,
                    description,
                    price: vacation.getDisplayPrice(convertFromUSD(priceInCents, req.session.currency)),
                    inSeason
                };
            })
        };
        switch (req.session.currency) {
            case 'USD':
                context.currencyUSD = 'selected';
                break;
            case  'GBP':
                context.currencyGBP = 'selected';
                break;
            case 'BTC':
                context.currencyBTC = 'selected';
                break;
            default:
                context.currencyUSD = 'selected';
        }
        res.render('vacations', context);
    });
});

app.get('/notify-when-in-season', (req, res) => {
    res.render('notify-when-in-season', {sku: req.query.sku})
});

app.post('/notify-when-in-season', (req, res) => {
    VacationInSeasonListener.update({email: req.body.email}, {$push: {skus: req.body.sku}}, {upsert: true}, (err) => {
        if (err) {
            console.error(err.stack);
            req.session.flash = {
                type: 'danger',
                intro: 'Oops!',
                message: 'There was an error processing your request.'
            };
            res.redirect(303, '/vacations');
        }
        req.session.flash = {
            type: 'success',
            intro: 'Thank you! ',
            message: 'You will be notified when this vacation is in season.'
        };
        return res.redirect(303, '/vacations');
    })
});

app.get('/contest/vacation-photo', (req, res) => {
    const now = new Date();
    res.render('contest/vacation-photo', {year: now.getUTCFullYear(), month: now.getMonth()});
});

app.get('/set-currency/:currency', (req, res) => {
    req.session.currency = req.params.currency;
    res.redirect(303, '/vacations');
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
            res.session.flash = {
                type: 'danger',
                intro: 'Oops!',
                message: 'There was an error processing your submission. PLease try again.'
            };
            res.redirect(303, '/contest/vacation-photo');
        }

        const photo = files.photo;
        const dir = vacationPhotoDir + '/' + Date.now();
        const path = dir + '/' + photo.name;
        fs.mkdirSync(dir);
        fs.renameSync(photo.path, dir + '/' + photo.name);
        saveContestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path);
        req.session.flash = {
            type: 'success',
            intro: 'Good luck!',
            message: 'You have been entered into the contest.'
        };

        console.log('Received fields:');
        console.log(fields);
        console.log('Received files');
        console.log(files);
        res.redirect(303, '/contest/vacation-photo/entries');
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
    return app.listen(app.get('port'), () => {
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