const main = require('./handlers/main'),
    tours = require('./handlers/tours'),
    newsletter = require('./handlers/newsletter'),
    vacations = require('./handlers/vacations'),
    confirmations = require('./handlers/confirmations');

module.exports = function (app) {
    //main
    app.get('/', main.home);
    app.get('/about', main.about);
    //tours
    app.get('/tours/hood-river', tours.hoodRiver);
    app.get('/tours/oregon-coast', tours.oregonCoast);
    app.get('/tours/request-group-rate', tours.reqGroupRate);
    //newsletter
    app.get('/newsletter', newsletter.getNewsletter);
    app.post('/newsletter', newsletter.postNewsletter);
    //vacations
    app.get('/vacations', vacations.getVacations);
    app.get('/notify-when-in-season', vacations.getNotifyWhenInSeason);
    app.post('/notify-when-in-season', vacations.postNotifyWhenInSeason);
    app.get('/contest/vacation-photo', vacations.getVacationPhoto);
    app.post('/contest/vacation-photo/:year/:month', vacations.postVacationPhoto);
    app.get('/set-currency/:currency', vacations.getSetCurrency);
    app.post('/process', vacations.postProcess);
    //confirmations
    app.get('/thankyou', confirmations.getThankYou);
};