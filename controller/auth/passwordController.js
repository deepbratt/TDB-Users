const crypto = require('crypto');
const User = require('../../model/userModel');
const AppError = require('@utils/tdb_globalutils/errorHandling/AppError');
const catchAsync = require('@utils/tdb_globalutils/errorHandling/catchAsync');
const { ERRORS, STATUS_CODE, SUCCESS_MSG, STATUS } = require('@constants/tdb-constants');
const Email = require('../../utils/email');
const sendSMS = require('../../utils/sendSMS');

//Forgot Password Via Email
exports.forgotPasswordEmail = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
	}

	const resetToken = await user.createPasswordResetToken();
	await user.save({ validateBeforeSave: false });

	try {
		const res = await new Email(user, resetToken).forgotPassword();
		if (res[0].status === 'rejected') {
			throw new Error(ERRORS.RUNTIME.SENDING_EMAIL, STATUS_CODE.SERVER_ERROR);
		}
		res.status(STATUS_CODE.OK).json({
			status: STATUS.SUCCESS,
			message: SUCCESS_MSG.SUCCESS_MESSAGES.TOKEN_SENT_EMAIL,
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(new AppError(ERRORS.RUNTIME.SENDING_EMAIL), STATUS_CODE.SERVER_ERROR);
	}
});

//Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
	const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
	//const hashedToken = req.params.token;

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() },
	});

	if (!user) {
		return next(new AppError(ERRORS.INVALID.INVALID_RESET_LINK));
	}

	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	await user.save();
	res.status(STATUS_CODE.OK).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.TOKEN_SENT_EMAIL,
	});
});

//? Forgot Password Via Phone Number
exports.forgotPasswordNumber = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ phone: req.body.phone });

	if (!user) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
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

		res.status(STATUS_CODE.OK).json({
			status: STATUS.SUCCESS,
			message: SUCCESS_MSG.SUCCESS_MESSAGES.TOKEN_SENT_PHONE,
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(new AppError(ERRORS.RUNTIME.SENDING_EMAIL), STATUS_CODE.SERVER_ERROR);
	}
});
