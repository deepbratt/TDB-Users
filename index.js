const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
//const {c}= require('tdb_globalutils')
dotenv.config({ path: './config/config.env' }); // read config.env to environmental variables
require('./config/dbConnection')(); // db connection

const PORT = process.env.PORT || 5003; // port
const app = express();

// CORS
app.use(cors());

// GLOBAL MIDDLEWARES
app.use(express.json()); // body parser (reading data from body to req.body)
app.use(cookieParser()); // cookie parser (reading data from cookie to req.cookie)

app.get('/users', (req, res) => {
	res.status(200).json({
		title: 'users',
	});
});

app.listen(PORT, () => {
	console.log(`listening`);
});
