const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Khởi tạo Firebase Admin SDK từ biến môi trường
try {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!serviceAccountJson) {
        throw new Error('Biến môi trường GOOGLE_APPLICATION_CREDENTIALS_JSON chưa được cấu hình.');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin đã khởi tạo thành công');
} catch (error) {
    console.error('❌ Lỗi khởi tạo Firebase Admin:', error.message);
    process.exit(1); // Dừng server nếu chưa khởi tạo Firebase thành công
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================
// ✅ Các route gửi thông báo (giữ nguyên)
// ============================================

app.post('/sendFCM', async (req, res) => {
    const { roomNo, paymentMethod, grandTotal } = req.body;
    const ownerPhone = '+84906950367';

    try {
        const userDoc = await admin.firestore().collection('users').doc(ownerPhone).get();
        if (!userDoc.exists) return res.status(404).send({ success: false, error: 'Không tìm thấy chủ trọ' });

        const deviceToken = userDoc.data()?.fcmToken;
        if (!deviceToken) return res.status(404).send({ success: false, error: 'Chủ trọ chưa đăng ký deviceToken' });

        const message = {
            notification: {
                title: 'Thanh toán phòng trọ',
                body: `Phòng trọ số ${roomNo} - Thanh toán bằng ${paymentMethod}. Tổng: ${grandTotal} VND`,
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Gửi thông báo thành công:', response);
        res.send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi gửi thông báo:', error.message);
        res.status(500).send({ success: false, error: error.message });
    }
});

app.post('/sendCheckOutNoti', async (req, res) => {
    const { roomNo, phoneNumber, fullName } = req.body;
    const ownerPhone = '+84906950367';

    try {
        const ownerDoc = await admin.firestore().collection('users').doc(ownerPhone).get();
        if (!ownerDoc.exists) return res.status(404).send({ success: false, error: 'Không tìm thấy chủ trọ' });

        const deviceToken = ownerDoc.data()?.fcmToken;
        if (!deviceToken) return res.status(404).send({ success: false, error: 'Chủ trọ chưa đăng ký deviceToken' });

        const message = {
            notification: {
                title: 'Thông báo Trả phòng',
                body: `Phòng ${roomNo} - ${fullName} (${phoneNumber}) đã trả phòng.`,
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        res.send({ success: true, response });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

app.post('/sendTenantNoti', async (req, res) => {
    const { tenantPhone, title, body } = req.body;

    try {
        const tenantDoc = await admin.firestore().collection('users').doc(tenantPhone).get();
        if (!tenantDoc.exists) return res.status(404).send({ success: false, error: 'Không tìm thấy người thuê' });

        const deviceToken = tenantDoc.data()?.fcmToken;
        if (!deviceToken) return res.status(404).send({ success: false, error: 'Người thuê chưa đăng ký deviceToken' });

        const message = {
            notification: { title, body },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        res.send({ success: true, response });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

app.post('/sendMessageNoti', async (req, res) => {
    const { senderPhone, receiverPhone, message } = req.body;

    try {
        const receiverDoc = await admin.firestore().collection('users').doc(receiverPhone).get();
        if (!receiverDoc.exists) return res.status(404).send({ success: false, error: 'Không tìm thấy người nhận' });

        const receiverData = receiverDoc.data();
        const deviceToken = receiverData?.fcmToken;
        const isOnline = receiverData?.isOnline;

        if (isOnline) return res.send({ success: true, message: 'Người nhận đang online, không gửi thông báo.' });
        if (!deviceToken) return res.status(404).send({ success: false, error: 'Người nhận chưa đăng ký deviceToken' });

        const notification = {
            notification: {
                title: `Tin nhắn mới từ ${senderPhone}`,
                body: message,
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(notification);
        res.send({ success: true, response });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

app.post('/sendFeedbackNoti', async (req, res) => {
    const { roomNo, phoneNumber, selectedIssues, additionalFeedback } = req.body;
    const ownerPhone = '+84906950367';

    try {
        const ownerDoc = await admin.firestore().collection('users').doc(ownerPhone).get();
        if (!ownerDoc.exists) return res.status(404).send({ success: false, error: 'Không tìm thấy chủ trọ' });

        const deviceToken = ownerDoc.data()?.fcmToken;
        if (!deviceToken) return res.status(404).send({ success: false, error: 'Chủ trọ chưa đăng ký deviceToken' });

        const issues = Array.isArray(selectedIssues) ? selectedIssues.join(', ') : (selectedIssues || 'N/A');

        const payload = {
            notification: {
                title: `Góp ý từ phòng ${roomNo}`,
                body: `Người thuê: ${phoneNumber}\nVấn đề: ${issues}\n${additionalFeedback || ''}`,
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(payload);
        res.send({ success: true, response });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

// ============================================
// ✅ Route kiểm tra server
// ============================================
app.get('/', (req, res) => {
    res.send('🔔 FCM Server is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
