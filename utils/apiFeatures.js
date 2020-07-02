//Burada amaç dağınık kalan bir sürü ara fonksiyonu bir class altında toplamaktır.
class APIFeatures {
  //query mongoose, queryString express'ten gelen (req.query) parametreler
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // BUILD QUERY
  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryString }; //hard copy alındı "..." ile distructor işlemi yapılıp, {} ile yeni obje oluşturuldu.
    const excludedFields = ['page', 'sort', 'limit', 'fields'];

    excludedFields.forEach((el) => delete queryObj[el]); //page için mesela queryObj[page] olan yerleri siler

    // 1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    //\b ile tam eşleşme /g ile ilk bulduğu yerden sonra aramaya devam ettirilir.
    //replace işlevinin callback fonksiyonu vardır. ${match} kısmı bulunan değer biz başına $ ekledik. ondan iki $ var.

    //console.log(JSON.parse(queryStr));
    // { difficulty: 'easy', duration: { gte: '5' } }
    // { difficulty: 'easy', duration: { $gte: 5} } }  üsttekini buna çevirmek için uğraştık.

    //.find() metodu promise döner. Aynı zamanda da query döner
    //bir kere await ile beklenirse sort gibi işlevler yapılamaz. Bu nedenle
    //bulanacak ve tours içine kaydedilecek veriler için aşağıda const tours = await query; kullanıldı.
    this.query = this.query.find(JSON.parse(queryStr));

    //bunu yazmazsak class içinde yapılan işlemden geriye dönen bir şey olmaz. (Burada "this" objenin kendisi)
    //istediğimiz, class içindekileri metot zinciri şeklinde kullanmak ( .filter().sort() şeklinde )
    return this;
  }

  sort() {
    // 2) Sorting
    if (this.queryString.sort) {
      //her bir sort parametresi ayrılır ve dizi olarak depolanır.
      //join ile aralarında boşluk olacak şekilde tekrar birleştirilir.
      const sortBy = this.queryString.sort.split(',').join(' ');

      this.query = this.query.sort(sortBy);
    } else {
      //eğer herhangi bir sort parametresi gelmezse default olarak en son yaratılan dökümanı önce listeleyecek
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    // 3) Field Limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' '); //(name duration difficulty price) gibi alanları alacak

      this.query = this.query.select(fields);
    } else {
      //mongoDB'nin kendi içinde kullandığı "__v:0" değerlerini geri dönecek data'dan çıkartır
      //sadece __v:0 alanları çıkartılır. diğer herşey aynen kalır
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    // 4) Pagination
    //string'i sayıya çevirmek için kısa yol 1 ile çarpmak
    //eğer ki page parametresi gelmezse diye "|| 1" ile default olarak 1 yapılıyor.
    const page = this.queryString.page * 1 || 1;

    //eğer ki limit parametresi gelmezse diye "|| 100 ile default olarak 100 yapılıyor.
    const limit = this.queryString.limit * 1 || 100;

    const skip = (page - 1) * limit;

    // page=2&limit=10 >> 1-10 on page 1, 11-20 on page2, 21-30 on page 3
    // query = query.skip(page).limit(limit); //eğer 3. sayfa istenirse ve limit 10 ise skip(20) olması lazım
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
