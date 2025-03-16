const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Đọc file service account
const serviceAccount = require('./dung60th1-b0c7b-firebase-adminsdk-4ku3w-104a94b576.json');

// ✅ Khởi tạo Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

app.use(bodyParser.json());

// ✅ Endpoint nhận request từ Flutter app
app.post('/sendFCM', async (req, res) => {
    const { roomNo, paymentMethod } = req.body;

    // 👉 Thay token của chủ trọ ở đây
    const deviceToken = 'dyGJPyCCRJ62gTj3YncHwB:APA91bHn_zrN5erZs53OIqVjKDnhwvNP7zyYP8uTSTxQz0R2E7yFk44lj4jM_VVxOuUEWFTTYsq3s7XJ8FHDWDfdFqXBt1Piy97UIqDnM6F4Lf4bDmf-NfA';

    const message = {
        notification: {
            title: 'Thanh toán phòng trọ',
            body: `Phòng trọ số ${roomNo} - Lựa chọn thanh toán ${paymentMethod}`,
        },
        token: deviceToken,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('✅ Thông báo đã gửi:', response);
        res.status(200).send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi gửi thông báo:', error);
        res.status(500).send({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('🔔 FCM Server is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
