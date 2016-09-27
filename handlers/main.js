module.exports = {
    home: function (req, res) {
        res.render('home', {active: {home: true}});
    },
    about: function (req, res) {
        res.render('about', {active: {about: true}});
    }
};

