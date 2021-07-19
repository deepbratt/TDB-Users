const mailchimp = require('@mailchimp/mailchimp_transactional')('oPIBOuBWlJrboohVeIt5fg');

module.exports = class Email {
	constructor(user, resetToken) {
		this.to = user.email;
		this.firstName = user.firstName;
		this.lastName = user.lastName;
		this.resetToken = resetToken;
	}
	async forgotPassword() {
		const response = await mailchimp.messages.sendTemplate({
			template_name: 'tezdealsforgotpassword',
			template_content: [
				{
					name: 'fname',
					content: this.firstName,
				},
				{
					name: 'resetToken',
					content: this.resetToken,
				},
			],
			message: {
				subject: 'Password Reset Token Valid for 30 minutes',
				from_email: 'info@themagnit.com',
				from_name: 'TezDeal',
				to: [
					{
						email: this.to,
						name: this.firstName,
					},
				],
			},
		});
		return response;
	}
};

// const sendEmail = async (options) => {
// 	const transporter = nodemailer.createTransport({
// 		host: process.env.MAILTRAP_HOST,
// 		port: process.env.MAILTRAP_PORT,
// 		auth: {
// 			user: process.env.MAILTRAP_USER,
// 			pass: process.env.MAILTRAP_PASSWORD,
// 		},
// 	});

// 	const mailOptions = {
// 		from: 'TezDealz <info@TezDealz.com>',
// 		to: options.email,
// 		subject: options.subject,
// 		text: options.message,
// 	};

// 	await transporter.sendMail(mailOptions);
// };
