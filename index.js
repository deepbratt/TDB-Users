const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { AppError } = require('@utils/tdb_globalutils');
//const {c}= require('tdb_globalutils')
dotenv.config({ path: './config/config.env' }); // read config.env to environmental variables
require('./config/dbConnection')(); // db connection
const session = require('cookie-session');

// Global Error Handler
const { errorHandler } = require('@utils/tdb_globalutils');

const userRoute = require('./constants/routeConts').routeConsts.userRoute;
const userRouter = require('./routes/userRoutes');

const PORT = 3004; // port
const app = express();

// CORS
app.use(cors());

app.use(
	morgan('dev', {
		skip: function (req, res) {
			return res.statusCode < 200;
		},
	})
);

// GLOBAL MIDDLEWARES
app.use(express.json()); // body parser (reading data from body to req.body)
//app.use(cookieParser()); // cookie parser (reading data from cookie to req.cookie)

app.use(
	session({
		signed: false,
	})
);

app.use(userRoute, userRouter);

app.all('*', (req, res, next) => {
	next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Listening on Port ${PORT}`);
});
