const express = require('express');
const { authenticate } = require('../middlewares/index');
const authController = require('../controller/auth/index');
const userController = require('../controller/user/userController');
const { signupEmailRules, signupPhoneRules, validationFunction } = require('../utils/validations');

const router = express.Router();

// Google Authentication Route
router.post('/google-auth', authController.continueGoogle);
// Facebook Authentication Route
router.post('/facebook-auth', authController.continueFacebook);
//email-phone
router.post('/signup-email', signupEmailRules, validationFunction, authController.signupEmail);
router.post('/signup-phone', signupPhoneRules, validationFunction, authController.signupPhone);
router.post('/login-email', authController.loginEmail);
router.post('/login-phone', authController.loginPhone);
router.get('/logout', authController.logout);

// forgot Password with Email
router.post('/forgotPassword-with-email', authController.forgotPasswordEmail);
// Forgot Password Via Number
router.post('/forgetPassword-with-phone', authController.forgotPasswordNumber);
//Reset Password
router.patch('/resetPassword/:token', authController.resetPassword);
//Send verification email
router.post('/send-verification-email', authController.sendVerificationCodetoEmail);
//Send verification Phone
router.post('/send-verification-phone', authController.sendVerificationCodetoPhone);
//account verification
router.patch('/account-verification/:token', authController.accountVerification);
//users
router.route('/').get(userController.getAllUsers).post(userController.createUser);
router
	.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser);
router.route('/isLoggedin').get(authController.isLoggedIn);
router.route('/protected').post(authenticate, (req, res) => {
	res.json({
		user: req.user,
	});
});
module.exports = router;
