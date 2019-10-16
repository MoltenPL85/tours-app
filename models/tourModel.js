const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Тур должен содержать имя'],
      unique: true,
      trim: true,
      maxlength: [40, 'Имя тура должно содержать не более 40 символов'],
      minlength: [10, 'Имя тура должно содержать не менее 10 символов'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'У тура должна быть продолжительность'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Тур должен содержать количество человек в группе'],
    },
    difficulty: {
      type: String,
      required: [true, 'У тура должна быть указана сложность'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Сложность должна быть: лёгкой, средней, трудной',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Рейтинг должен быть больше 1.0'],
      max: [5, 'Рейтинг должен быть не больше 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Тур должен содержать цену'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Величина скидки ({VALUE}) должна быть ниже обычной цены',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'Тур должен содержать краткое описание'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      // required: [true, 'Тур должен содержать обложку'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// AGGREGATION MIDDLEWARE
// before all aggregate queries put condition where secret tours not shows
tourSchema.pre('aggregate', function(next) {
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });

  console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
