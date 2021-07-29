const mongoose = require('mongoose');
const validator = require('validator');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const { ERRORS } = require('@constants/tdb-constants');

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
    required: [true, ERRORS.REQUIRED.FIRSTNAME_REQUIRED],
    // validate: [validator.isAlpha, ERRORS.INVALID.INVALID_FIRSTNAME],
  },
  middleName: {
    type: String,
  },
  lastName: {
    type: String,
    minlength: 3,
    maxlength: 15,
    required: [true, ERRORS.REQUIRED.LASTNAME_REQUIRED],
    validate: [validator.isAlpha, ERRORS.INVALID.INVALID_LASTNAME],
  },
  email: {
    type: String,
    lowercase: true,
    validate: [validator.isEmail, ERRORS.INVALID.INVALID_EMAIL],
  },
  phone: {
    type: String,
    validate: [validator.isMobilePhone, ERRORS.INVALID.INVALID_PHONE_NUM],
  },
  password: {
    type: String,
    minlength: [8, ERRORS.INVALID.PASSWORD_LENGTH],
    select: false,
  },
  passwordConfirm: {
    type: String,
    minlength: [8, ERRORS.INVALID.PASSWORD_LENGTH],
    select: false,
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: ERRORS.INVALID.PASSWORD_MISMATCH,
    },
  },
  image: {
    type: String,
  },
  accountVeificationToken: {
    type: String,
    select: false,
  },
  verificationTokenExpires: {
    type: Date,
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  passwordChangedAt: Date,
});

//indexes
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

//pre save middleware (runs before data saved to db)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now();
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
//CHANGED_PASSWORD_AFTER
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
// Instance Method to get Random 4-digit code
userSchema.methods.createPasswordResetToken = async function () {
  let resetToken;
  do {
    resetToken = Math.floor(Math.random() * (1000 - 9999 + 1) + 9999);
  } while (
    await User.findOne({
      passwordResetToken: await crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex'),
    })
  );
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.accountVerificationToken = async function () {
  let verificationToken;
  do {
    verificationToken = Math.floor(
      Math.random() * (100000 - 999999 + 1) + 999999,
    ).toString();
  } while (
    await User.findOne({
      accountVeificationToken: crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex'),
    })
  );
  this.accountVeificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.verificationTokenExpires = Date.now() + 10 * 60 * 1000;
  return verificationToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
