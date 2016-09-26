const connection = require('./connection');
const Vacation = require('./models/vacation');

const seedDb = () => {
    Vacation.find((err, vacations) => {

        if (err) {
            return console.error(err);
        }
        if (vacations.length) {
            return;
        }

        new Vacation({
            name: 'Hood River Day Trip',
            slug: 'Hood River Day Trip',
            category: 'Day Trip',
            sku: 'HR199',
            description: 'Sail on the river!',
            priceInCents: 9995,
            tags: ['day trip', 'hood river', 'sailing'],
            inSeason: true,
            available: true,
            requiresWaiver: false,
            maximumGuests: 16,
            notes: '',
            packagesSold: 0
        }).save();

        new Vacation({
            name: 'Oregon Coast Getaway',
            slug: 'Oregon Coast Getaway',
            category: 'Weeked gateaway',
            sku: 'OC39',
            description: 'Enjoy the ocean air!',
            priceInCents: 269995,
            tags: ['weeked getaway', 'ocean', 'coast'],
            inSeason: false,
            available: true,
            requiresWaiver: false,
            maximumGuests: 8,
            notes: '',
            packagesSold: 0
        }).save();

        new Vacation({
            name: 'Rock Climbing in Bend',
            slug: 'Rock Climbing in Bend',
            category: 'Adventure',
            sku: 'B99',
            description: 'Climb some rocks!',
            priceInCents: 289995,
            tags: ['rocks', 'climb', 'weekend getaway'],
            inSeason: true,
            available: false,
            requiresWaiver: true,
            maximumGuests: 4,
            notes: 'This is cool!',
            packagesSold: 0
        }).save();
    });
};

module.exports = seedDb;