var {validateEmail} = require('../api/api');

module.exports = {
    getNewsletter: function (req, res) {
        res.render('newsletter', {csrf: 'CSRF token goes here', active: {newsletter: true}});
    },
    postNewsletter: function (req, res) {
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
    }
};