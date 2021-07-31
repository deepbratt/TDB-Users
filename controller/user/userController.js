const Users = require('../../model/userModel');
const { AppError, catchAsync } = require('@utils/tdb_globalutils');
const { ERRORS, STATUS_CODE, SUCCESS_MSG, STATUS } = require('@constants/tdb-constants');

exports.getAllUsers = catchAsync(async (req, res, next) => {
	const result = await Users.find();

	if (!result) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
	}

	res.status(STATUS_CODE.OK).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL,
		total: result.length,
		data: {
			result,
		},
	});
});

exports.createUser = catchAsync(async (req, res, next) => {
	res.send(ERRORS.INVALID.NOT_FOUND);
});

exports.getUser = catchAsync(async (req, res, next) => {
	const result = await Users.findById(req.params.id);

	if (!result) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
	}

	res.status(STATUS_CODE.OK).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL,
		data: {
			result,
		},
	});
});

exports.updateUser = catchAsync(async (req, res, next) => {
	const result = await Users.findByIdAndUpdate(req.params.id, req.body, {
		runValidators: true,
		new: true,
	});

	if (!result) return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);

	res.status(STATUS_CODE.OK).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL,
		data: {
			result,
		},
	});
});

exports.deleteUser = catchAsync(async (req, res, next) => {
	const result = await Users.findByIdAndDelete(req.params.id);

	if (!result) {
		return next(new AppError(ERRORS.INVALID.NOT_FOUND), STATUS_CODE.NOT_FOUND);
	}

	res.status(STATUS_CODE.OK).json({
		status: STATUS.SUCCESS,
		message: SUCCESS_MSG.SUCCESS_MESSAGES.OPERATION_SUCCESSFULL,
		data: null,
	});
});
