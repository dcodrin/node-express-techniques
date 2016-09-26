const mongoose = require('mongoose');
const {mongo: {development, production}} = require('../credentials');

// keepAlive prevents database connection errors for long running apps like websites
const options = {
    server: {
        socketOptions: {keepAlive: 1}
    }
};

const connection = (env) => {
    switch (env) {
        case 'development':
            return mongoose.connect(development.connectionString, options);
        case 'production':
            return mongoose.connect(production.connectionString, options);
        default:
            throw new Error('Unknown execution environment: ' + env);
    }
};

export default connection;