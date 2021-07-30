const crypto = require('crypto');
const User = require('../../model/userModel');
const AppError = require('@utils/tdb_globalutils/errorHandling/AppError');
const catchAsync = require('@utils/tdb_globalutils/errorHandling/catchAsync');
const { ERRORS, STATUS_CODE, SUCCESS_MSG, STATUS } = require('@constants/tdb-constants');
const Email = require('../../utils/email');
const sendSMS = require('../../utils/sendSMS');

exports.sendVerificationCodetoPhone = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ phone: req.body.phone });
	if (!user) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND, STATUS_CODE.NOT_FOUND));
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

		res.status(STATUS_CODE.OK).json({
			status: STATUS.SUCCESS,
			message: SUCCESS_MSG.SUCCESS_MESSAGES.TOKEN_SENT_PHONE,
		});
	} catch (err) {
		user.accountVeificationToken = undefined;
		user.verificationTokenExpires = undefined;
		await user.save({ validateBeforeSave: false });
		return next(new AppError(ERRORS.RUNTIME.SENDING_MESSAGE), STATUS_CODE.SERVER_ERROR);
	}
});

exports.sendVerificationCodetoEmail = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
	}

	const verificationToken = await user.accountVerificationToken();
	await user.save({ validateBeforeSave: false });

	try {
		// await sendSMS({
		// 	body: `Your TezDealz account verification code is ${verificationToken}`,
		// 	phone: user.phone, // Text this number
		// 	from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
		// });

		res.status(STATUS_CODE.OK).json({
			status: STATUS.SUCCESS,
			message: SUCCESS_MSG.SUCCESS_MESSAGES.TOKEN_SENT_EMAIL,
		});
	} catch (err) {
		user.accountVeificationToken = undefined;
		user.verificationTokenExpires = undefined;
		await user.save({ validateBeforeSave: false });
		return next(new AppError(ERRORS.RUNTIME.SENDING_MESSAGE), STATUS_CODE.SERVER_ERROR);
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
		return next(new AppError(ERRORS.INVALID.INVALID_VERIFICATION_TOKEN), STATUS_CODE.UNAVAILABLE);
	}

	user.isVerified = true;
	user.accountVeificationToken = undefined;
	user.verificationTokenExpires = undefined;
	await user.save();
	res.status(STATUS_CODE.OK).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.ACCOUNT_VERIFICATION,
	});
});
