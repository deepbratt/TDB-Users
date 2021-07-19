const User = require('../model/userModel');
const AppError = require('tdb_globalutils/errorHandling/AppError');
const catchAsync = require('tdb_globalutils/errorHandling/catchAsync');
const { appErrors, appSuccess } = require('../constants/appConstants');
const { SUCCESS } = require('tdb_globalutils/constants/appConstants').resStatus;
const jwt = require('jsonwebtoken');
const jwtManagement = require('../utils/jwtManagement');
const sendEmail = require('../utils/email');
const sendSMS = require('../utils/resetThroughNum');

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = {
    firstName: req.body.firstName.trim(),
    lastName: req.body.lastName.trim(),
    email: req.body.email.trim(),
    phone: req.body.phone.trim(),
    password: req.body.password.trim(),
    passwordConfirm: req.body.passwordConfirm.trim(),
  };
  await User.create(newUser);
  res.status(201).json({
    status: SUCCESS,
    message: appSuccess.OPERATION_SUCCESSFULL,
  });
});

exports.signupWithEmail = catchAsync(async (req, res, next) => {
  const newUser = {
    firstName: req.body.firstName.trim(),
    lastName: req.body.lastName.trim(),
    email: req.body.email.trim(),
    password: req.body.password.trim(),
    passwordConfirm: req.body.passwordConfirm.trim(),
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
    phone: req.body.phone.trim(),
    password: req.body.password.trim(),
    passwordConfirm: req.body.passwordConfirm.trim(),
  };

  await User.create(newUser);

  res.status(201).json({
    status: SUCCESS,
    message: appSuccess.OPERATION_SUCCESSFULL,
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
  jwtManagement.createSendJwtToken(user, 200, req, res);
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
  // if (currentUser.changedPasswordAfter(decoded.iat)) {
  // 	return next(new AppError('You have recently changed password! Please login again.', 401));
  // }

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

//? Forgot Password Via Email
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError(appErrors.NOT_FOUND), 404);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const message = `Your Password Reset Code is : ${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token(valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: SUCCESS,
      message: 'Token sent to Email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was error sending email. Please try again later'),
      500,
    );
  }
});

//? Reset Password Via Email
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = req.params.token;

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new AppError('Password reset link is invalid or has been expired'),
    );
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

  const resetToken = user.createPasswordResetToken();
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

    return next(
      new AppError('There was error sending Code. Please try again later'),
      500,
    );
  }
});

//? Reset Password Via Phone Number.
exports.resetPasswordWithNumber = catchAsync(async (req, res, next) => {
  const hashedToken = req.params.token;

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new AppError('Password reset Code is invalid or has been expired'),
    );
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

exports.protectedRoute = async (req, res) => {
  res.status(200).json({
    status: SUCCESS,
  });
};
