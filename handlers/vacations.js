const {convertFromUSD, saveContestEntry} = require('../api/api');
const Vacation = require('../db/models/vacation');
const VacationInSeasonListener = require('../db/models/vacationInSeasonListener');
const formidable = require('formidable');
const fs = require('fs');

module.exports = {
    getVacations: function (req, res) {
        Vacation.find({available: true}, (err, vacations) => {
            const context = {
                active: {vacations: true},
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
                case 'GBP':
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
    },
    getNotifyWhenInSeason: function (req, res) {
        res.render('notify-when-in-season', {sku: req.query.sku})
    },
    postNotifyWhenInSeason: function (req, res) {
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
    },
    getSetCurrency: function (req, res) {
        req.session.currency = req.params.currency;
        res.redirect(303, '/vacations');
    },
    getVacationPhoto: function (req, res) {
        const now = new Date();
        res.render('contest/vacation-photo', {year: now.getUTCFullYear(), month: now.getMonth()});
    },
    postVacationPhoto: function (req, res) {
        // Check if paths exists if not create them
        const dataDir = __dirname + '/data';
        const vacationPhotoDir = __dirname + '/vacation-photo';
        fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
        fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

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
    },
    postProcess: function (req, res) {
        if (req.xhr || req.accepts('json/html') === 'json') {
            res.send({success: true})
        } else {
            res.redirect(303, '/thank-you')
        }
    }
};