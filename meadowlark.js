import express from 'express';
import handlebars from'express-handlebars';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import morgan from 'morgan';
import cluster from 'cluster';
import {create} from 'domain';
import connectMongo from 'connect-mongo';
import cors from 'cors';

import connection from './db/connection';
import seedDatabase from './db/dbseed';
import routes from './routes';
import endpoints from './rest-api/endpoints';
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

//cors for api only
app.use('/api', cors());

//handle routes
routes(app);

//handle rest endpoints
endpoints(app);

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