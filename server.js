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

/* ============================================
   ✅ Gửi thông báo cho CHỦ TRỌ
============================================ */
app.post('/sendFCM', async (req, res) => {
    const { roomNo, paymentMethod, grandTotal } = req.body;  // Thêm amount vào body
    const ownerPhone = '+84906950367'; // Gán cứng số điện thoại chủ trọ

    try {
        const userDoc = await admin.firestore().collection('users').doc(ownerPhone).get();

        if (!userDoc.exists) {
            return res.status(404).send({ success: false, error: 'Không tìm thấy chủ trọ' });
        }

        const userData = userDoc.data();
        const deviceToken = userData.fcmToken;

        if (!deviceToken) {
            return res.status(404).send({ success: false, error: 'Chủ trọ chưa đăng ký deviceToken' });
        }

        const message = {
            notification: {
                title: 'Thanh toán phòng trọ',
                body: `Phòng trọ số ${roomNo} - Lựa chọn thanh toán ${paymentMethod}. Số tiền thanh toán: ${grandTotal} VND`, // Thêm số tiền vào thông báo
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Thông báo đã gửi cho chủ trọ:', response);
        res.status(200).send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi gửi thông báo:', error);
        res.status(500).send({ success: false, error: error.message });
    }
});


/* ============================================
   ✅ Gửi thông báo cho NGƯỜI THUÊ TRỌ
============================================ */
app.post('/sendTenantNoti', async (req, res) => {
    const { tenantPhone, title, body } = req.body;

    try {
        const tenantDoc = await admin.firestore().collection('users').doc(tenantPhone).get();

        if (!tenantDoc.exists) {
            return res.status(404).send({ success: false, error: 'Không tìm thấy người thuê' });
        }

        const tenantData = tenantDoc.data();
        const deviceToken = tenantData.fcmToken;

        if (!deviceToken) {
            return res.status(404).send({ success: false, error: 'Người thuê chưa đăng ký deviceToken' });
        }

        const message = {
            notification: { title, body },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Thông báo đã gửi cho người thuê:', response);
        res.status(200).send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi gửi thông báo người thuê:', error);
        res.status(500).send({ success: false, error: error.message });
    }
});

/* ============================================
   ✅ Gửi thông báo tin nhắn
============================================ */
app.post('/sendMessageNoti', async (req, res) => {
    const { senderPhone, receiverPhone, message } = req.body;

    try {
        // Lấy thông tin người nhận
        const receiverDoc = await admin.firestore().collection('users').doc(receiverPhone).get();

        if (!receiverDoc.exists) {
            console.log('Lỗi: Không tìm thấy người nhận');
            return res.status(404).send({ success: false, error: 'Không tìm thấy người nhận' });
        }

        const receiverData = receiverDoc.data();
        const deviceToken = receiverData.fcmToken;
        const isOnline = receiverData.isOnline;  // Kiểm tra trạng thái online

        // Kiểm tra trạng thái online của người nhận
        if (isOnline) {
            console.log('Người nhận đang online, không gửi thông báo');
            return res.status(200).send({ success: true, message: 'Người nhận đang online, không gửi thông báo.' });
        }

        if (!deviceToken) {
            console.log('Lỗi: Người nhận chưa đăng ký deviceToken');
            return res.status(404).send({ success: false, error: 'Người nhận chưa đăng ký deviceToken' });
        }

        // Cấu trúc thông báo
        const notificationMessage = {
            notification: {
                title: `Tin nhắn mới từ ${senderPhone}`,
                body: message,
            },
            token: deviceToken,
        };

        // Gửi thông báo
        const response = await admin.messaging().send(notificationMessage);
        console.log('✅ Thông báo đã gửi:', response);

        res.status(200).send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi khi gửi thông báo tin nhắn:', error.message);
        res.status(500).send({ success: false, error: error.message });
    }
});



/* ============================================
   ✅ Kiểm tra server
============================================ */
app.get('/', (req, res) => {
    res.send('🔔 FCM Server is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
