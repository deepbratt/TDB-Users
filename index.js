const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const { AppError } = require('tdb_globalutils');
//const {c}= require('tdb_globalutils')
dotenv.config({ path: './config/config.env' }); // read config.env to environmental variables
require('./config/dbConnection')(); // db connection
require('./passportStrategies/facebookStrategy');
require('./passportStrategies/googleStrategy');

// Global Error Handler
const { errorHandler } = require('tdb_globalutils');

const userRoute = require('./constants/appConstants').routeConsts.userRoute;
const userRouter = require('./routes/userRoutes');

const PORT = 3004; // port
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

app.listen(PORT, () => {
  console.log(`Listening on Port ${PORT}`);
});
