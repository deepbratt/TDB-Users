const crypto = require('crypto');
const User = require('../model/userModel');
const AppError = require('@utils/tdb_globalutils/errorHandling/AppError');
const catchAsync = require('@utils/tdb_globalutils/errorHandling/catchAsync');
const {
  ERRORS,
  STATUS_CODE,
  SUCCESS_MSG,
  STATUS,
} = require('@constants/tdb-constants');
const jwt = require('jsonwebtoken');
const jwtManagement = require('../utils/jwtManagement');
const Email = require('../utils/email');
const sendSMS = require('../utils/resetThroughNum');

exports.signupWithEmail = catchAsync(async (req, res, next) => {
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
    body: `${SUCCESS_MSG.SUCCESS_MESSAGES.TEZDEALZ_VEFRIFICATION_CODE} ${verificationToken}`,
    phone: newUser.phone, // Text this number
    from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
  });

  res.status(STATUS_CODE.CREATED).json({
    status: STATUS.SUCCESS,
    message: `${SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL} ${SUCCESS_MSG.SUCCESS_MESSAGES.ACCOUNT_VERIFICATION_TOKEN}`,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    // checking email or password empty?
    return next(
      new AppError(ERRORS.INVALID.NO_CREDENTIALS, STATUS_CODE.BAD_REQUEST),
    );
  }
  const user = await User.findOne({ email: email }).select('+password');
  //user existance and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      new AppError(
        ERRORS.INVALID.WRONG_CREDENTIAL_ERROR,
        STATUS_CODE.UNAVAILABLE,
      ),
    );
  }
  // check acccount verification
  if (!user.isVerified) {
    return next(
      new AppError(ERRORS.UNAUTHORIZED.NOT_VERIFIED, STATUS_CODE.UNAVAILABLE),
    );
  }
  jwtManagement.createSendJwtToken(user, STATUS_CODE.OK, req, res);
});

exports.authenticate = catchAsync(async (req, res, next) => {
  //getting token and check is it there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError(ERRORS.REQUIRED.NO_CREDENTIALS, STATUS_CODE.UNAVAILABLE),
    );
  }
  //verification token
  const decoded = jwt.verify(token, JWT_SECRET);
  //check if user sitll exists
  const currentUser = await User.findById(decoded.userdata.id);
  if (!currentUser) {
    return next(
      new AppError(`User ${ERRORS.INVALID.NOT_FOUND}`, STATUS_CODE.NOT_FOUND),
    );
  }
  //check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(ERRORS.UNAUTHORIZED.INVALID_JWT, STATUS_CODE.UNAVAILABLE),
    );
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
  res.status(STATUS_CODE.OK).json({ status: STATUS.SUCCESS });
});

//Forgot Password Via Email
exports.forgotPassword = catchAsync(async (req, res, next) => {
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

    return next(
      new AppError(ERRORS.RUNTIME.SENDING_EMAIL),
      STATUS_CODE.SERVER_ERROR,
    );
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
exports.forgotPasswordWithNumber = catchAsync(async (req, res, next) => {
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

    return next(
      new AppError(ERRORS.RUNTIME.SENDING_EMAIL),
      STATUS_CODE.SERVER_ERROR,
    );
  }
});

exports.sendVerificationCodetoPhone = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ phone: req.body.phone });

  if (!user) {
    return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
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
    return next(
      new AppError(ERRORS.RUNTIME.SENDING_MESSAGE),
      STATUS_CODE.SERVER_ERROR,
    );
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
    return next(
      new AppError(ERRORS.RUNTIME.SENDING_MESSAGE),
      STATUS_CODE.SERVER_ERROR,
    );
  }
});

exports.accountVerification = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  //const hashedToken = req.params.token;

  const user = await User.findOne({
    accountVeificationToken: hashedToken,
    verificationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new AppError(ERRORS.INVALID.INVALID_VERIFICATION_TOKEN),
      STATUS_CODE.UNAVAILABLE,
    );
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
