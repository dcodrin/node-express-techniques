const Browser = require('zombie');

describe('Cross-Page Tests', () => {

    let browser;
    beforeEach(() => {
        browser = new Browser();
    });

    describe('referrer fields', () => {

        it(`should populate the referrer field with "oregon coast" path`, (done) => {
            const referrer = browser.referrer ='http://localhost:3000/tours/oregon-coast';
            browser.visit(referrer, () => {
                browser.clickLink('.requestGroupRate', () => {
                    browser.fill('referrer', browser.referrer);
                    browser.assert.input('form input[name="referrer"]', referrer);
                    done();
                });
            });
        });

        it(`should populate the referrer field with "hood-river" path`, (done) => {
            const referrer = browser.referrer = 'http://localhost:3000/tours/hood-river';
            browser.visit(referrer, () => {
                browser.clickLink('.requestGroupRate', () => {
                    browser.fill('referrer', browser.referrer);
                    browser.assert.input('form input[name="referrer"]', referrer);
                    done();
                });
            });
        });

        it(`should result in an empty referrer field`, (done) => {
            const location = 'http://localhost:3000/tours/request-group-rate';
            browser.visit(location, () => {
                browser.fill('referrer', browser.referrer);
                browser.assert.input('form input[name="referrer"]', '');
                done();
            });
        });
    });
});