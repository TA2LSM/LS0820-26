const Tour = require('../models/tourModel');
//const { getFileInfo } = require('prettier');
const APIFeatures = require('../utils/apiFeatures');

//MIDDLEWARE. 3. parametre her zaman "next" olacak. Çıkışta da next(); demek zorundayız. Yoksa kod takılır.
//birisi /top-5-cheap olarak istekte bulunursa aşağıdaki parametreler query objesine yerleştirilir ve
//getAllTours() fonksiyonu bu parametrelere göre çalışır.
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};

exports.getAllTours = async (req, res) => {
  try {
    //console.log(req.query);

    // EXECUTE QUERY
    // Class içindeki her işlevin sonuç objesini (return this;) olarak alıp
    // bir sonraki metota aktarma şeklinde tasarlandı
    const features = new APIFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate(); //method chain
    const tours = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success', //success, fail, error
      results: tours.length, //json standardında bu alan genelde olmaz ama client tarafında işe yarayabilir diye yollanıyor
      data: {
        //tours: tours, //ES6'de aynı isimlileri yazmaya gerek yok ama standart olarak yazılabilir.
        tours,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id); //buradaki "id" tourRoutes içindeki .route('/:id') kısmından geliyor
    // Tour.findOne({ _id: req.params.id })

    res.status(200).json({
      status: 'success', //success, fail, error
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

//create a new tour (client to server)
exports.createTour = async (req, res) => {
  try {
    //-----------------------
    // aşağıdaki iki ayrı kısım sonuçta aynı işi yapıyor aslında ama tamamen farklı şekillerde...

    // save methodu direkt yeni Tour dokümanı üzerine uygulanıyor.
    // const newTour = new Tour({...});
    // newTour.save();

    // create methodu direkt Tour modeli üzerine uygulanıyor. (promise döner) then() kullanmamak
    // için createTour fonksiyonunu yukarıda async yaptık.
    //Tour.create({}).then();
    const newTour = await Tour.create(req.body); // bu promise "rejected" olursa catch kısmına atlanır !!!
    //-----------------------

    // 200 kodu "ok", 201 kodu "created", 404 "not found" demek
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    // catch her zaman err objesine erişir. Hata yakalama bloğudur.
    res.status(400).json({
      //400: bad request
      status: 'fail',
      //message: err,
      message: 'Invalid data sent!', //bu tip bir mesaj, gerçek bir uygulama için önerilmez !!!
    });
  }

  /** aşağıdaki gibi "post" request'i çekilirse gelen cevapta "difficulty" ve "rating" olmayacak.
   *  nedeni ise şemada bu alanların olmaması. Bu alanlar "ignore" edilir yani dikkate alınmaz.
  {
    "name": "Test Tour 2",
    "duration": 5,
    "difficulty": "easy",
    "price": 100,
    "rating": 4.7
  }
  */
};

// Update Tour
exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // return the modified document,
      runValidators: true, // Örn: sayı yerine metin girilmeye çalışılırsa hata verdirir. Şemada tip olarak ne dediysek o olsun diye.
    });

    res.status(200).json({
      status: 'success',
      data: {
        //tour: tour,
        // "tour" property is set to "tour" object. In ES6 this will be no more needed if names are same. like below.
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

// Delete Tour. REST API'de delete için client'e cevap dönülmemesi önerilir.
exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);

    // 204 kodu "no content" demek. Standart gibi bir şey
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

//exports. şeklinde yazılan fonksiyonlar dosya dışına erişime açılmış demektir.

exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          //_id: null, //tüm tour'ları içerecek
          //_id: '$difficulty', //tüm değişik difficulty'ler için işlem yapılacak
          _id: { $toUpper: '$difficulty' },
          numTours: { $sum: 1 }, //her döküman için +1 yapılacak. toplam tour sayısı bulunacak
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: { avgPrice: 1 },
      },
      // {
      //   //_id yukarıda "difficulty" olarak seçildi. Burada çıkan sonuçlar içinden EASY olmayan
      //   //(not equal / $ne) sonuçlar elde edilecek.
      //   $match: { _id: { $ne: 'EASY' } },
      // },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          //month (ay)'a göre grupladık
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        $addFields: { month: '$_id' },
      },
      {
        $project: { _id: 0 },
      },
      {
        $sort: { numTourStarts: -1 }, //numTourStarts'a göre azalan şekilde sırala
      },
      // {
      //   $limit: 6,
      // },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
