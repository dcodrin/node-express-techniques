const {assert} = require('chai'),
    http = require('http'),
    rest = require('restler');

describe('REST API test', () => {
    const attraction = {
        lat: 45.516011,
        lng: -122.682062,
        name: 'Portland Art Museum',
        description: 'Cool looking place!',
        email: 'test@coolstuff.com'
    };
    const root = 'http://localhost:3000';

    it('should be able to add an attraction', (done) => {
        rest.post(root + '/api/attraction', {data: attraction})
            .on('success', (data) => {
                assert.match(data.id, /\w/, 'id must be set');
                done();
            })
    });
    it('should retrieve all attractions', (done) => {
        rest.post(root + '/api/attraction', {data: attraction})
            .on('success', (data) => {
                rest.get(root + '/api/attractions')
                    .on('success', (data) => {
                        assert(data.length > 0);
                        done();
                    });
            })
    });
    it('should be able to retrieve an attraction', (done) => {
        rest.post(root + '/api/attraction', {data: attraction})
            .on('success', (data) => {
                rest.get(root + '/api/attraction/' + data.id)
                    .on('success', (data) => {
                        assert(data.name === attraction.name);
                        assert(data.description === attraction.description);
                        done();
                    });
            });
    });
    it('should be able to update an attraction', (done) => {
        const update = {name: 'Space Museum'};
        rest.post(root + '/api/attraction', {data: attraction})
            .on('success', (data) => {
                rest.putJson(root + '/api/attraction/' + data.id, update)
                    .on('success', (data) => {
                        assert(data.name === update.name);
                        done();
                    });
            });
    });
    it('should be able to delete an attraction', (done) => {
        rest.post(root + '/api/attraction', {data: attraction})
            .on('success', (data1) => {
                rest.del(root + '/api/attraction/' + data1.id)
                    .on('success', (data2) => {
                        assert(data1.id === data2.id);
                        done();
                    })
            })
    })
});