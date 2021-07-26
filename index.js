const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const axios = require('axios');
const passport = require('passport');
const {AppError} = require('tdb_globalutils');
//const {c}= require('tdb_globalutils')
dotenv.config({ path: './config/config.env' }); // read config.env to environmental variables
require('./config/dbConnection')(); // db connection
require('./passportStrategies/facebookStrategy');
require('./passportStrategies/googleStrategy');

// Global Error Handler
const {errorHandler} = require('tdb_globalutils');

const userRoute = require('./constants/appConstants').routeConsts.userRoute;
const userRouter = require('./routes/userRoutes');

const PORT = 3004;// port
const app = express();

// CORS
app.use(cors());

app.use(passport.initialize());
app.use(passport.session());

// GLOBAL MIDDLEWARES
app.use(express.json()); // body parser (reading data from body to req.body)
app.use(cookieParser()); // cookie parser (reading data from cookie to req.cookie)

app.use(userRoute, userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(errorHandler);

app.listen(PORT, async () => {
<<<<<<< HEAD
  console.log(`listening`);
  // const res = await axios.get('http://bookings-srv:3002/bookings');
  // console.log(res);
=======
	console.log(`Listening on Port ${PORT}`);
	const res = await axios.get('http://bookings-srv:3002/v1/bookings');
	console.log(res);
>>>>>>> e81991f2fefe56ec6026925dc0bbb4de6407476d
});
