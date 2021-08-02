const {
  accountVerification,
  sendVerificationCodetoEmail,
  sendVerificationCodetoPhone,
} = require('./accountVerification');
const { resetPassword, forgotPassword } = require('./passwordController');
const {
  signupEmail,
  signupPhone,
  loginEmail,
  loginPhone,
  continueGoogle,
  continueFacebook,
  isLoggedIn,
  logout,
} = require('./authController');

module.exports = {
  accountVerification,
  sendVerificationCodetoEmail,
  sendVerificationCodetoPhone,
  resetPassword,
  forgotPassword,
  signupEmail,
  signupPhone,
  loginEmail,
  loginPhone,
  continueGoogle,
  continueFacebook,
  isLoggedIn,
  logout,
};
