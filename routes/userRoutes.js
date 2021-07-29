const express = require('express');
const passport = require('passport');
const authController = require('../controller/authController');
const userController = require('../controller/userController');
const { signupEmailRules, signupPhoneRules, validationFunction } = require('../utils/validations');

const router = express.Router();

// Google Authentication Route
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),
);

// Google Authentication callback Route
router.get(
	'/auth/google/callback',
	passport.authenticate('google', {
		successRedirect: 'https://themagnit.com/',
		failureRedirect: '/auth/error',
	}),
	function (req, res) {
		console.log(req);
	}
);

// Facebook Authentication callback Route
router.get(
  '/auth/facebook',
  passport.authenticate('facebook', { scope: ['public_profile', 'email'] }),
);

// Facebook Authentication callback Route
router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: 'https://themagnit.com/',
    failureRedirect: '/auth/error',
  }),
);

router.post('/signup-email', authController.signupWithEmail);
router.post('/signup-phone', signupPhoneRules, validationFunction, authController.signupWithNumber);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// forgot Password with Email
router.post('/forgotPassword-with-email', authController.forgotPassword);
// Forgot Password Via Number
router.post(
  '/forgetPassword-with-phone',
  authController.forgotPasswordWithNumber,
);

//Reset Password
router.patch('/resetPassword/:token', authController.resetPassword);

//Send verification email
router.post(
  '/send-verification-email',
  authController.sendVerificationCodetoEmail,
);

//Send verification Phone
router.post(
  '/send-verification-phone',
  authController.sendVerificationCodetoPhone,
);

//account verification
router.patch(
  '/account-verification/:token',
  authController.accountVerification,
);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
	.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser);
router.route('/protected').post(authController.authenticate, (req, res) => {
	res.json({
		user: req.user,
	});
});
module.exports = router;
