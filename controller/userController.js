const Users = require('../model/userModel');
const { appErrors, appSuccess } = require('../constants/appConstants');
const { SUCCESS } = require('../constants/appConstants').resStatus;
const { catchAsync, AppError } = require('tdb_globalutils');

exports.getAllUsers = catchAsync(async (req, res, next) => {
	const result = await Users.find();

	if (!result) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	res.status(200).json({
		status: SUCCESS,
		message: appSuccess.OPERATION_SUCCESSFULL,
		total: result.length,
		data: {
			result,
		},
	});
});

exports.createUser = catchAsync(async (req, res, next) => {
	res.send('This route is not defined yet!!!');
});

exports.getUser = catchAsync(async (req, res, next) => {
	const result = await Users.findById(req.params.id);

	if (!result) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	res.status(200).json({
		status: SUCCESS,
		message: appSuccess.OPERATION_SUCCESSFULL,
		data: {
			result,
		},
	});
});

exports.updateUser = catchAsync(async (req, res, next) => {
	res.send('This route is defined Yet!!!');
});

exports.deleteUser = catchAsync(async (req, res, next) => {
	const result = await Users.findByIdAndDelete(req.params.id);

	if (!result) {
		return next(new AppError(appErrors.NOT_FOUND), 404);
	}

	res.status(200).json({
		status: SUCCESS,
		message: appSuccess.OPERATION_SUCCESSFULL,
		data: null,
	});
});
