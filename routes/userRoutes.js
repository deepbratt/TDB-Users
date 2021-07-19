const express = require('express');
const passport = require('passport');
const authController = require('../controller/authController');
const userController = require('../controller/userController');
const {
  signupValidationRules,
  validationFunction,
} = require('../utils/validations');

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
  // function (req, res) {
  //   res.redirect('/v1/users');
  // },
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

// signup
router.post(
  '/signup',
  signupValidationRules,
  validationFunction,
  authController.signup,
);

router.post('/signupWithEmail', authController.signupWithEmail);
router.post('/signupWithNumber', authController.signupWithNumber);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.get(
  '/protected',
  authController.authenticate,
  authController.protectedRoute,
);

// forgot Password with Email
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Forgot Password Via Number
router.post('/forgetPassword', authController.forgotPasswordWithNumber);
router.patch(
  '/resetPasswordNumber/:token',
  authController.resetPasswordWithNumber,
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

module.exports = router;
