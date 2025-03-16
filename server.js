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
    const { roomNo, paymentMethod, ownerPhone } = req.body;

    if (!ownerPhone) {
        return res.status(400).send({ success: false, error: 'ownerPhone is required' });
    }

    try {
        // 🔍 Tìm người dùng chủ trọ theo số điện thoại
        const userDoc = await admin.firestore().collection('users').doc(ownerPhone).get();

        if (!userDoc.exists) {
            return res.status(404).send({ success: false, error: 'Không tìm thấy chủ trọ' });
        }

        const userData = userDoc.data();
        const deviceToken = userData.deviceToken;

        if (!deviceToken) {
            return res.status(404).send({ success: false, error: 'Chủ trọ chưa đăng ký deviceToken' });
        }

        // 📨 Gửi thông báo FCM
        const message = {
            notification: {
                title: 'Thanh toán phòng trọ',
                body: `Phòng trọ số ${roomNo} - Lựa chọn thanh toán ${paymentMethod}`,
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Thông báo đã gửi:', response);
        res.status(200).send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi gửi thông báo:', error);
        res.status(500).send({ success: false, error: error.message });
    }
});

// ✅ Kiểm tra server
app.get('/', (req, res) => {
    res.send('🔔 FCM Server is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
