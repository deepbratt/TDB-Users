const crypto = require('crypto');
const User = require('../model/userModel');
const AppError = require('tdb_globalutils/errorHandling/AppError');
const catchAsync = require('tdb_globalutils/errorHandling/catchAsync');
const { appErrors, appSuccess } = require('../constants/appConstants');
const { SUCCESS } = require('tdb_globalutils/constants/appConstants').resStatus;
const jwt = require('jsonwebtoken');
const jwtManagement = require('../utils/jwtManagement');
const Email = require('../utils/email');
const sendSMS = require('../utils/sendSMS');

exports.signupWithEmail = catchAsync(async (req, res, next) => {
	const newUser = {
		firstName: req.body.firstName.trim(),
		lastName: req.body.lastName.trim(),
		email: req.body.email.trim(),
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
	};

	await User.create(newUser);
	res.status(201).json({
		status: SUCCESS,
		message: appSuccess.OPERATION_SUCCESSFULL,
	});
});

exports.signupWithNumber = catchAsync(async (req, res, next) => {
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
		body: `Your TezDealz account verification code is ${verificationToken}`,
		phone: newUser.phone, // Text this number
		from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
	});

	res.status(201).json({
		status: SUCCESS,
		message: `${appSuccess.OPERATION_SUCCESSFULL} Account verification token Sent, Please Verify First.`,
	});
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		// checking email or password empty?
		return next(new AppError(appErrors.NO_CREDENTIALS, 400));
	}
	const user = await User.findOne({ email: email }).select('+password');
	//user existance and password is correct
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError(appErrors.WRONG_CREDENTIAL_ERROR, 401));
	}
	// check acccount verification
	if (!user.isVerified) {
		return next(new AppError('Your Account is not verified, Please Verify First', 401));
	}
	jwtManagement.createSendJwtToken(user, 200, req, res);
});

exports.authenticate = catchAsync(async (req, res, next) => {
	//passportauthentication
	if (req.session.passport.user.id) {
		const user = await User.findById(req.session.passport.user.id);
		if (user) {
			req.user = user;
			return next();
		}
	}
	//getting token and check is it there
	let token;
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.session && req.session.jwt) {
		token = req.session.jwt;
	}
	if (!token) {
		return next(new AppError(appErrors.UNAUTHORIZED_ERROR, 401));
	}

	//verification token
	const decoded = jwt.verify(token, JWT_SECRET);
	//check if user sitll exists
	const currentUser = await User.findById(decoded.userdata.id);
	if (!currentUser) {
		return next(new AppError(`User ${appErrors.NOT_FOUND}`, 404));
	}
	//check if user changed password after the token was issued
	if (currentUser.changedPasswordAfter(decoded.iat)) {
		return next(new AppError('You have recently changed password! Please login again.', 401));
	}
	//Grant access to protected route
	req.user = currentUser;
	next();
});

exports.logout = catchAsync(async (req, res, next) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10),
		httpOnly: true,
	});
	res.status(200).json({ status: SUCCESS });
});

//Forgot Password Via Email
exports.forgotPassword = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	const resetToken = await user.createPasswordResetToken();
	await user.save({ validateBeforeSave: false });

	try {
		const res = await new Email(user, resetToken).forgotPassword();
		if (res[0].status === 'rejected') {
			throw new Error('There was error sending email. Please try again later');
		}
		res.status(200).json({
			status: SUCCESS,
			message: 'Token sent to Email',
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(new AppError('There was error sending email. Please try again later'), 500);
	}
});

//Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
	// const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
	const hashedToken = req.params.token;

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() },
	});

	if (!user) {
		return next(new AppError('Password reset link is invalid or has been expired'));
	}

	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	await user.save();
	res.status(200).json({
		status: SUCCESS,
		message: 'Your Password has been reset successfully',
	});
});

//? Forgot Password Via Phone Number
exports.forgotPasswordWithNumber = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ phone: req.body.phone });

	if (!user) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	const resetToken = await user.createPasswordResetToken();
	// console.log(resetToken);
	await user.save({ validateBeforeSave: false });

	try {
		await sendSMS({
			body: `Your TezDealz password reset code is ${resetToken}`,
			phone: user.phone, // Text this number
			from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
		});

		res.status(200).json({
			status: SUCCESS,
			message: 'Token sent to Number',
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(new AppError('There was error sending Code. Please try again later'), 500);
	}
});

exports.sendVerificationCodetoPhone = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ phone: req.body.phone });

	if (!user) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	const verificationToken = await user.accountVerificationToken();
	// console.log(resetToken);
	await user.save({ validateBeforeSave: false });

	try {
		await sendSMS({
			body: `Your TezDealz account verification code is ${verificationToken}`,
			phone: user.phone, // Text this number
			from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
		});

		res.status(200).json({
			status: SUCCESS,
			message: 'Verification Token sent to Number',
		});
	} catch (err) {
		user.accountVeificationToken = undefined;
		user.verificationTokenExpires = undefined;
		await user.save({ validateBeforeSave: false });
		return next(new AppError('There was error sending Code. Please try again later'), 500);
	}
});

exports.sendVerificationCodetoEmail = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	const verificationToken = await user.accountVerificationToken();
	await user.save({ validateBeforeSave: false });

	try {
		// await sendSMS({
		// 	body: `Your TezDealz account verification code is ${verificationToken}`,
		// 	phone: user.phone, // Text this number
		// 	from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
		// });

		res.status(200).json({
			status: SUCCESS,
			message: 'Verification Token sent to Email',
		});
	} catch (err) {
		user.accountVeificationToken = undefined;
		user.verificationTokenExpires = undefined;
		await user.save({ validateBeforeSave: false });
		return next(new AppError('There was error sending Code. Please try again later'), 500);
	}
});

exports.accountVerification = catchAsync(async (req, res, next) => {
	const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
	//const hashedToken = req.params.token;

	const user = await User.findOne({
		accountVeificationToken: hashedToken,
		verificationTokenExpires: { $gt: Date.now() },
	});

	if (!user) {
		return next(new AppError('Verification Code is invalid or has been expired'));
	}

	user.isVerified = true;
	user.accountVeificationToken = undefined;
	user.verificationTokenExpires = undefined;
	await user.save();
	res.status(200).json({
		status: SUCCESS,
		message: 'Your Account has been verified successfully',
	});
});
