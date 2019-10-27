const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Пожалуйста, сообщите своё имя!'],
  },
  email: {
    type: String,
    required: [true, 'Пожалуйста, сообщите адрес электронной почты!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Некорректный адрес электронной почты!'],
  },
  photo: String,
  role: {
    type: String,
    enum: {
      values: ['user', 'guide', 'lead-guide', 'admin'],
      message: 'Данной роли не существует',
    },
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Пожалуйста, заполните пароль!'],
    minlength: [8, 'Пароль должен быть не короче 8 символов!'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Пожалуйста, подтвердите пароль!'],
    validate: {
      // Only works on CREATE or SAVE
      validator: function(el) {
        return el === this.password;
      },
      message: 'Пароли не совпадают!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  // hash the password
  this.password = await bcrypt.hash(this.password, 12);

  // delete passwordConfirm field
  // that field used only for comparison
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  // -1000 small hack: saving to the db bit slower then issuing JWT
  // passwordChangedAt sometime set after JWT has been created
  // user not be able to login using the token
  // (go to changedPasswordAfter logic)
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  // points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  // this.password not available, because select is false
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
