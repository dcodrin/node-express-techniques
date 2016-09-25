const {loadTest} = require('loadtest');
const expect = require('chai').expect;

describe('Stress tests', () => {
    describe('Homepage', () => {
        it('should handle 50 requests per second', (done) => {
            const options = {
                url: 'http://localhost:3000',
                concurrency: 5,
                maxRequests: 50
            };
            loadTest(options, (err, result) => {
                expect(!err);
                expect(result.totalTimeSeconds < 1);
                done();
            })
        });
    });
});