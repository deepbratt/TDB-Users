const mongoose = require('mongoose');
const validator = require('validator');
const bcryptjs = require('bcryptjs');
const { appErrors } = require('../constants/appConstants');

const userSchema = new mongoose.Schema({
  facebookId: {
    type: String,
  },
  googleId: {
    type: String,
  },
  displayName: {
    type: String,
  },
  firstName: {
    type: String,
    minlength: 3,
    maxlength: 15,
    required: [true, appErrors.FIRSTNAME_REQUIRED],
    // validate: [validator.isAlpha, appErrors.INVALID_FIRSTNAME],
  },
  middleName: {
    type: String,
  },
  lastName: {
    type: String,
    minlength: 3,
    maxlength: 15,
    required: [true, appErrors.LASTNAME_REQUIRED],
    validate: [validator.isAlpha, appErrors.INVALID_LASTNAME],
  },
  email: {
    type: String,
    unique: [true, 'Email should be Unique'],
    lowercase: true,
    validate: [validator.isEmail, appErrors.INVALID_EMAIL],
    index: true,
    sparse: true,
  },
  phone: {
    type: String,
    unique: [true, 'Phone Number Should be Unique'],
    validate: [validator.isMobilePhone, appErrors.INVALID_PHONE_NUM],
    index: true,
    sparse: true,
  },
  password: {
    type: String,
    minlength: [8, 'Password length must be 8 Characters'],
    select: false,
  },
  // dateOfjoin: {
  // 	type: Date,
  // 	required: true,
  // 	default: Date.now(),
  // },
  passwordConfirm: {
    type: String,
    minlength: [8, 'Password length must be 8 characters'],
    select: false,
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: appErrors.PASSWORD_MISMATCH,
    },
  },
  image: {
    type: String,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
});

//pre save middleware (runs before data saved to db)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 12);
  next();
});

//SCHEMA METHODS
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userpassword,
) {
  // Check Password Is Correct??
  return await bcryptjs.compare(candidatePassword, userpassword);
};

// Instance Method to get Random 4-digit code
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = Math.floor(Math.random() * (1000 - 9999 + 1) + 9999);

  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
