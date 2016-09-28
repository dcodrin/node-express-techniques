const Attraction = require('../db/models/attraction');

const handlers = {
    getAllAttractions: function (req, res) {
        Attraction.find({approved: true}, (err, attractions) => {
            if (err) return res.status(500).send('Error occured: database error.');
            res.json(attractions.map(({name, id, description, location}) => ({name, id, description, location})));
        })
    },
    postAttraction: function (req, res) {
        const {name, description, location, email} = req.body;
        const history = {
            event: 'created',
            date: new Date(),
            email
        };
        const approved = true;

        const attraction = new Attraction({
            name,
            description,
            location,
            history,
            approved
        });
        attraction.save((err, attraction) => {
            if (err) return res.status(500).send('Error occurred: database error.');
            res.json({id: attraction._id});
        })
    },
    putAttraction: function (req, res) {
        Attraction.findByIdAndUpdate(req.params.id, {$set: {name: req.body.name}}, {new: true}, (err, a) => {
            if (err) return res.status(500).send('Error occurred: database error.');
            const {name, _id: id, description, location} = a;
            res.json({name, id, description, location})
        });
    },
    getAttraction: function (req, res) {
        Attraction.findById(req.params.id, (err, a) => {
            if (err) return res.status(500).send('Error occurred: database error.');
            const {name, _id: id, description, location} = a;
            res.json({name, id, description, location})
        })
    },
    delAttraction: function (req, res) {
        Attraction.findOneAndRemove({_id: req.params.id}, (err, a) => {
            if (err) return res.status(500).send('Error occurred: database error.');
            const {name, _id: id, description, location} = a;
            res.json({name, id, description, location})
        });
    }
};

module.exports = function (app) {
    app.get('/api/attractions', handlers.getAllAttractions);
    app.post('/api/attraction', handlers.postAttraction);
    app.get('/api/attraction/:id', handlers.getAttraction);
    app.put('/api/attraction/:id', handlers.putAttraction);
    app.delete('/api/attraction/:id', handlers.delAttraction);
};