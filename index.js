const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const axios = require('axios');
const passport = require('passport');
const AppError = require('tdb_globalutils/errorHandling/AppError');
//const {c}= require('tdb_globalutils')
dotenv.config({ path: './config/config.env' }); // read config.env to environmental variables
require('./config/dbConnection')(); // db connection
require('./passportStrategies/facebookStrategy');
require('./passportStrategies/googleStrategy');

// Global Error Handler
const globalErrorHandler = require('tdb_globalutils/errorHandling/errorHandler');

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

app.get('/v1/users', (req, res) => {
  res.status(200).json({
    title: 'users',
  });
});
app.get('/v1/users/abx', (req, res) => {
  res.status(200).json({
    title: 'user abc',
  });
});

app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

app.listen(PORT, async () => {
	console.log(`Listening on Port ${PORT}`);
	const res = await axios.get('http://bookings-srv:3002/v1/bookings');
	console.log(res);
});
