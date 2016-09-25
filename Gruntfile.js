module.exports = (grunt) => {
    // load plugins
    ['grunt-cafe-mocha', 'grunt-link-checker'].forEach(task => {grunt.loadNpmTasks(task)});
    // configure plugins
    grunt.initConfig({
        cafemocha: {
            all: {src: 'qa/tests-*.js', options: {ui: 'tdd'}}
        },
        linkChecker: {
            options: {
                maxConcurrency: 20
            },
            dev: {
                site: 'localhost',
                options: {
                    initialPort: 3000
                }
            }
        }
    });
    // register tasks
    grunt.registerTask('default', ['cafemocha', 'linkChecker']);
};