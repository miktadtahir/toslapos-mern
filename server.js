// Gerekli modüller import edilir.
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const crypto = require('crypto');
const axios = require('axios');

// dotenv modülü, .env dosyasından çevre değişkenlerini yükler ve process.env içine koyar.
require('dotenv').config();

// Express uygulaması oluşturulur.
const app = express();
// Sunucunun dinleyeceği port belirlenir.
const port = process.env.PORT || 5003;

// Uygulamanın ana rotaları import edilir. Dilerseniz buradaki işlemleri de bir route dosyasına ekleyip, oradan import edebilirsiniz.Aslında o daha sağlıklı bir yöntemdir, karışık olmaması için bu şekilde eklenmiştir.
const mainRoutes = require('./routes/index');

// Middleware fonksiyonları uygulamaya eklenir.
app.use(cors()); // CORS, çeşitli seçeneklerle CORS'u etkinleştirmek için kullanılabilecek bir Connect/Express middleware sağlayan bir node.js paketidir.
app.use(express.json()); // Bu, Express'teki yerleşik bir middleware fonksiyonudur. JSON yükleri olan gelen istekleri ayrıştırır.

// API kimlik bilgileri tanımlanır.
const apiUser = process.env.API_USER; //Toslapos'dan aldığınız APIUser bilginiz.
const apiPass = process.env.API_PASS; //Toslapos'dan aldığınız APIPass bilginiz.
const clientId = process.env.CLIENT_ID; //Toslapos'dan aldığınız ClientId bilginiz.
const productionUrl = process.env.PRODUCTION_URL; // dökümentasyona göre 'https://entegrasyon.tosla.com/api/Payment/' olsa da olası bir güncellemeye karşı dökümentasyonu kontrol ediniz.

// MongoDB veritabanına bağlanmak için fonksiyon.
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {});
        console.log('MongoDB veritabanına bağlandı!');
    } catch (error) {
        console.error('Veritabanına bağlanırken hata:', error);
        process.exit(1);
    }
};

// Hash oluşturmak için fonksiyon.Toslapos için gereklidir.
const generateHash = (rnd, timeSpan) => {
    const hashString = `${apiPass}${clientId}${apiUser}${rnd}${timeSpan}`;
    return crypto.createHash('sha512').update(hashString).digest('base64');
};

// TimeSpan oluşturmak için fonksiyon. Toslapos için gereklidir. Zamanı dökümentasyona uygun saat dilimine çevirir.
const generateTimeSpan = () => {
    const now = new Date();
    // Zaman dilimini ayarlayın. Burada örnek olarak UTC+3 kullanılıyor.
    now.setHours(now.getHours() + 3);
    return now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
};

// 3D ödeme işlemi başlatmak için endpoint oluşturuluyor.
app.post('/api/start-payment', async (req, res) => {
    // İstekten gerekli bilgiler alınıyor.
    const {callbackUrl, amount, currency} = req.body;

    // Rastgele bir değer oluşturuluyor. Bu değer hash oluşturmak için kullanılacak.
    const rnd = crypto.randomBytes(12).toString('hex');

    // TimeSpan değeri oluşturuluyor. Bu değer de hash oluşturmak için kullanılacak.
    const timeSpan = generateTimeSpan();

    // Yukarıda oluşturulan değerlerle bir hash oluşturuluyor.
    const hash = generateHash(rnd, timeSpan);

    try {
        // Oluşturulan bilgilerle birlikte Tosla'ya ödeme başlatma isteği gönderiliyor.
        const response = await axios.post(`${productionUrl}threeDPayment`, {
            clientId,
            apiUser,
            rnd,
            timeSpan,
            hash,
            callbackUrl,
            amount,
            currency
        }, {
            headers: {
                'Content-Type': 'application/json' // İsteğin içeriği JSON formatında olduğu belirtiliyor.
            }
        });

        // Tosla'dan gelen yanıt doğrudan isteği yapan tarafa iletiliyor.
        res.json(response.data);
    } catch (error) {
        // Bir hata oluşursa, hata mesajı ile birlikte 500 durum kodu döndürülüyor.
        res.status(500).json({message: 'API isteği sırasında bir hata oluştu.', error: error.message});
    }
});

// Sunucu başlatılır ve belirtilen portta dinlemeye başlar.
app.listen(port, async () => {
    await connectDB();
    console.log(`Sunucu ${port} portunda dinleniyor.`);
});


