import express from 'express';
import handlebars from'express-handlebars';

const app = express();

//set up handlebars  view engine
const engine = handlebars.create({defaultLayout: 'main'}).engine;
app.engine('handlebars', engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

//serve static content
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) => {
    res.render('about');
});

//custom 404 page
//404 responses are not the result of an error, error-handler middleware will not capture them
//add at the very bottom of the stack
app.use((req, res)=> {
    res.status(404).render('404');
});

//custom 500 page
//error handling middleware accepts 4 arguments
app.use((err, req, res, next) => {
    console.error(err); // eslint-disable-line no-console
    res.status(500).render('500');
});


app.listen(app.get('port'), () => {
    console.log('Express started on http://localhost:' + app.get('port') + ';'); // eslint-disable-line no-console
});