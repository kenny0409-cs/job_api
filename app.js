const express = require('express');

const app = express();
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const helmet =require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const connectDatabase = require('./config/database');
const errorMiddleware = require('./middlewares/error');
const errorHandler = require('./utils/errorhandle');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors'); //allow other domain to access the API
const bodyparser = require('body-parser');


//setting up config.env file variables
dotenv.config({path : './config/config.env'})

//Handling uncaught expectations
process.on('uncaughtException', err=> {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down due to uncaught exception');
    process.exit(1);
});


//connecting to Database
connectDatabase();

//setup body parser(parsing the string of the informations based on catergories)
app.use(express.json());


//set cookie parser 
app.use(cookieParser());

//handle file uploads
app.use(fileUpload());

//setup security header
app.use(helmet());

//
app.use(express.static('public'));


//set up body parser
app.use(bodyparser.urlencoded({ extended : true}));

//Sanitize data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xssClean());

//Prevent Parameter pollution
app.use(hpp({
    whitelist : ['positions']
}));

// Setup CORS - accessbile by other domain
app.use(cors());


//rate limiting
const limiter  =rateLimit({
    windowMs : 10*60*1000, // 10minutes
    max : 100
});

app.use(limiter);


//Importing route
const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const user = require('./routes/user');

app.use('/api/v1',jobs);
app.use('/api/v1',auth);
app.use('/api/v1',user);

app.all('*', (req,res,next) => {
    next(new errorHandler(`${req.originalUrl} route not found `, 404));
});

//Middleware to handle errors
app.use(errorMiddleware);


const port = process.env.port;
app.listen(port, ()=>{
    console.log(`server is started on port ${process.env.port} in ${process.env.NODE_ENV} mode.`);
});

//handling unhandled promise rejection
process.on('unhandledRejection', err => {
    console.log(`Error : ${err.message}`);
    console.log('Shutting down the server due to handled promise rejection.');
    server.close( () => {
        process.exit(1);
    })
});


