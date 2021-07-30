const crypto = require('crypto');
const User = require('../../model/userModel');
const AppError = require('@utils/tdb_globalutils/errorHandling/AppError');
const catchAsync = require('@utils/tdb_globalutils/errorHandling/catchAsync');
const { ERRORS, STATUS_CODE, SUCCESS_MSG, STATUS } = require('@constants/tdb-constants');
const jwtManagement = require('../../utils/jwtManagement');
const Email = require('../../utils/email');
const sendSMS = require('../../utils/sendSMS');

exports.continueGoogle = catchAsync(async (req, res, next) => {
	let user;
	user = await User.findOne({ googleId: req.body.googleId });
	if (!user) {
		req.body.isVerified = true;
		user = await User.create(req.body);
	}
	jwtManagement.createSendJwtToken(user, STATUS_CODE.OK, req, res);
});

exports.continueFacebook = catchAsync(async (req, res, next) => {
	let user;
	user = await User.findOne({ facebookId: req.body.facebookId });
	if (!user) {
		req.body.isVerified = true;
		user = await User.create(req.body);
	}
	jwtManagement.createSendJwtToken(user, STATUS_CODE.OK, req, res);
});

exports.signupEmail = catchAsync(async (req, res, next) => {
	const newUser = {
		firstName: req.body.firstName.trim(),
		lastName: req.body.lastName.trim(),
		email: req.body.email.trim(),
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
	};

	await User.create(newUser);
	res.status(STATUS_CODE.CREATED).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL,
	});
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
	//getting token and check is it there
	let token;
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.session.jwt) {
		token = req.session.jwt;
	}
	if (!token) {
		return next(new AppError(ERRORS.UNAUTHORIZED.NOT_LOGGED_IN, STATUS_CODE.UNAVAILABLE));
	}
	//verification token
	const decoded = jwt.verify(token, process.env.JWT_SECRET);
	//check if user sitll exists
	const currentUser = await User.findById(decoded.userdata.id);
	if (!currentUser) {
		return next(new AppError(`User ${ERRORS.INVALID.NOT_FOUND}`, STATUS_CODE.NOT_FOUND));
	}
	//check if user changed password after the token was issued
	if (currentUser.changedPasswordAfter(decoded.iat)) {
		return next(new AppError(ERRORS.UNAUTHORIZED.INVALID_JWT, STATUS_CODE.UNAVAILABLE));
	}
	//send loggedIn User
	res.status(STATUS_CODE.OK).json({
		user: currentUser,
	});
});

exports.signupPhone = catchAsync(async (req, res, next) => {
	const newUser = {
		firstName: req.body.firstName.trim(),
		lastName: req.body.lastName.trim(),
		phone: req.body.phone,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
	};

	const user = await User.create(newUser);

	const verificationToken = await user.accountVerificationToken();
	// console.log(resetToken);
	await user.save({ validateBeforeSave: false });
	await sendSMS({
		body: `${SUCCESS_MSG.SUCCESS_MESSAGES.TEZDEALZ_VEFRIFICATION_CODE} ${verificationToken}`,
		phone: newUser.phone, // Text this number
		from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
	});

	res.status(STATUS_CODE.CREATED).json({
		status: STATUS.SUCCESS,
		message: `${SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL} ${SUCCESS_MSG.SUCCESS_MESSAGES.ACCOUNT_VERIFICATION_TOKEN}`,
	});
});

exports.loginEmail = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;
	if (!email || !password) {
		// checking email or password empty?
		return next(new AppError(ERRORS.INVALID.NO_CREDENTIALS, STATUS_CODE.BAD_REQUEST));
	}
	const user = await User.findOne({ email: email }).select('+password');
	if (user.googleId || user.facebookId) {
		return next(new AppError(ERRORS.INVALID.WRONG_CREDENTIAL_ERROR, STATUS_CODE.UNAVAILABLE));
	}
	//user existance and password is correct
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError(ERRORS.INVALID.WRONG_CREDENTIAL_ERROR, STATUS_CODE.UNAVAILABLE));
	}
	// check acccount verification
	if (!user.isVerified) {
		return next(new AppError(ERRORS.UNAUTHORIZED.NOT_VERIFIED, STATUS_CODE.UNAVAILABLE));
	}
	jwtManagement.createSendJwtToken(user, STATUS_CODE.OK, req, res);
});

exports.loginPhone = catchAsync(async (req, res, next) => {
	const { phone, password } = req.body;

	if (!phone || !password) {
		// checking email or password empty?
		return next(new AppError(ERRORS.INVALID.NO_CREDENTIALS, STATUS_CODE.BAD_REQUEST));
	}
	const user = await User.findOne({ phone: phone }).select('+password');
	if (user.googleId || user.facebookId) {
		return next(new AppError(ERRORS.INVALID.WRONG_CREDENTIAL_ERROR, STATUS_CODE.UNAVAILABLE));
	}
	//user existance and password is correct
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError(ERRORS.INVALID.WRONG_CREDENTIAL_ERROR, STATUS_CODE.UNAVAILABLE));
	}
	// check acccount verification
	if (!user.isVerified) {
		return next(new AppError(ERRORS.UNAUTHORIZED.NOT_VERIFIED, STATUS_CODE.UNAVAILABLE));
	}
	jwtManagement.createSendJwtToken(user, STATUS_CODE.OK, req, res);
});

exports.logout = catchAsync(async (req, res, next) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10),
		httpOnly: true,
	});
	res.status(STATUS_CODE.OK).json({ status: STATUS.SUCCESS });
});
