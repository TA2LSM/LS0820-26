const mongoose = require('mongoose');
const slugify = require('slugify');

//--- Şema oluşturma ----------
const toursSchema = new mongoose.Schema(
  {
    //name: String,
    //rating: Number,
    //price: Number,
    name: {
      type: String,
      //required: true,
      //Aşağıdaki için ilk parametre required için olması gereken değer, ikincisi hata olursa görüntülenecek mesaj
      required: [true, 'A tour must have a name!'], // <-- validator
      unique: true, //Her tur ismi özel olmalıdır. Aynı isimli tur olamaz.
      trim: true,
    }, //Schema Type Options Object
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration!'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size!'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a dificulty!'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, //eğer rating değeri oluşturma sırasında boş bırakılırsa bu değer otomatik atanır
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price!'],
    },
    priceDiscount: Number,
    summary: {
      type: String,
      trim: true, //baştaki ve sondaki boşlukları siler
      required: [true, 'A tour must have a summary!'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image!'],
    },
    images: [String], // String array
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //bu bilgi eklenecek ama kullanıcı sorgu çekince ona yollanmayacak *****
    },
    startDates: [Date], // date format array
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  //settings (toursSchema.virtual için eklendi)
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// DOCUMENT MIDDLEWARE
// .save() ve .create() işlevinden önce (pre) çalışacak bir middleware'dir.
// .insertMany(), .findOneAndUpdate(), .findByIdAndupdate()... burada KULLANILMAMALIDIR.
// Yoksa .save() çalışmayacaktır. Burada this, mevcut döküman'ı gösteriyor.
toursSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lover: true }); //this, o anda işlenen öğeyi temsil eder *********
  next();
});

// toursSchema.pre('save', function (next) {
//   console.log('Will save the document...');
// });

// // POST MIDDLEWARE
// // tamamlanmış doc dökümanı var. Burası işlem tamamlandıktan sonra çalışır
// toursSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// Tour.find() işlemine her girmeden önce burası çalışacak .findOne() için çalışmaz mesela...
// /^find/ kısmına HOOK deniyor. Burada this, mevcut query'i gösteriyor.
//toursSchema.pre('find', function (next) {
toursSchema.pre(/^find/, function (next) {
  //bu şekilde kullanmak daha sağlıklı
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

toursSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start}ms`);
  //console.log(docs);
  next();
});

//AGGREGATION MIDDLEWARE
//Burada this, mevcut aggregation objesi'ni gösteriyor.
toursSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  //console.log(this.pipeline());
  next();
});

//Aşağıdaki virtual data, database'de olmayacak istek gelince oluşturulacak.
//function() this'e erişebiliyor ama err() fonksiyonu erişemez. Bu nedenle regular function kullanıldı.
toursSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//--- Şemadan model oluşturma ----------
//ilk harfi büyük olarak özellikle yazılıyor ki "model" olarak tanımlandığı anlaşılsın.
//parametre olan Tour modelin ismi, ikinci parametre ise kullanılacak şema.
const Tour = mongoose.model('Tour', toursSchema);

/*
// Modelden döküman oluşturmak
// const testTour = new Tour({
//   name: 'The Forest Hiker',
//   rating: 4.7,
//   price: 497,
// });

//ValidatorError: A tour must have a price! verecek çünkü price->required olarak ayarlı idi
// const testTour = new Tour({
//   name: 'The Park Camper',
// });

//rating: 4.5 olarak ayarlanacak. rating key'i olmadığı için "default" değer atandı. (şemadan geliyor)
const testTour = new Tour({
  name: 'The Park Camper',
  price: 997,
});

// testTour dökümanı "save" methodu ile database'e kaydedilir. save(), promise döner.
testTour
  .save()
  .then((doc) => {
    console.log(doc);
  })
  .catch((err) => {
    console.log('ERROR: ', err);
  });
//aynı döküman tekrar kaydedilmek istenirse şemadaki "name->unique" özelliğinden dolayı hata verecektir.
*/

module.exports = Tour;
