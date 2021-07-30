const {
	accountVerification,
	sendVerificationCodetoEmail,
	sendVerificationCodetoPhone,
} = require('./accountVerification');
const {
	resetPassword,
	forgotPasswordEmail,
	forgotPasswordNumber,
} = require('./passwordController');
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
	forgotPasswordEmail,
	forgotPasswordNumber,
	signupEmail,
	signupPhone,
	loginEmail,
	loginPhone,
	continueGoogle,
	continueFacebook,
	isLoggedIn,
	logout,
};
