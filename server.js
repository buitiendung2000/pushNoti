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

// Sử dụng middleware để parse dữ liệu JSON và URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ============================================
   ✅ Gửi thông báo cho CHỦ TRọ (Thanh toán)
============================================ */
app.post('/sendFCM', async (req, res) => {
    const { roomNo, paymentMethod, grandTotal } = req.body;  // Thêm số tiền thanh toán vào body
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
                body: `Phòng trọ số ${roomNo} - Lựa chọn thanh toán ${paymentMethod}. Số tiền thanh toán: ${grandTotal} VND`,
            },
            token: deviceToken,
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Thông báo đã gửi cho chủ trọ:', response);
        res.status(200).send({ success: true, response });
    } catch (error) {
        console.error('❌ Lỗi gửi thông báo:', error.message);
        res.status(500).send({ success: false, error: error.message });
    }
});

/* ============================================
   ✅ Gửi thông báo cho NGƯỜI THUÊ TRọ
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
        console.error('❌ Lỗi gửi thông báo người thuê:', error.message);
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
   ✅ Gửi thông báo phản hồi từ người thuê đến CHỦ TRọ
============================================ */
app.post('/sendFeedbackNoti', async (req, res) => {
    // In log toàn bộ dữ liệu nhận được từ request để debug
    console.log('[DEBUG] Incoming feedback notification request:', req.body);

    // Đọc các trường từ request body
    const { roomNo, phoneNumber, selectedIssues, additionalFeedback } = req.body;
    const ownerPhone = '+84906950367'; // Số điện thoại chủ trọ (có thể thay đổi theo logic dự án)

    // Kiểm tra nếu roomNo hoặc phoneNumber chưa có
    if (!roomNo || !phoneNumber) {
        console.error('[ERROR] Thiếu thông tin: roomNo hoặc phoneNumber');
        return res.status(400).send({ success: false, error: 'roomNo và phoneNumber là bắt buộc.' });
    }

    try {
        // Lấy document của chủ trọ từ Firestore dựa trên ownerPhone
        const ownerDoc = await admin.firestore().collection('users').doc(ownerPhone).get();

        if (!ownerDoc.exists) {
            console.error('[ERROR] Không tìm thấy chủ trọ với phone:', ownerPhone);
            return res.status(404).send({ success: false, error: 'Không tìm thấy chủ trọ' });
        }

        const ownerData = ownerDoc.data();
        const deviceToken = ownerData.fcmToken;

        if (!deviceToken) {
            console.error('[ERROR] Chủ trọ chưa đăng ký deviceToken.');
            return res.status(404).send({ success: false, error: 'Chủ trọ chưa đăng ký deviceToken' });
        }

        // Xử lý selectedIssues: nếu là mảng thì nối thành chuỗi, nếu là chuỗi thì dùng trực tiếp
        let issuesText = '';
        if (Array.isArray(selectedIssues)) {
            issuesText = selectedIssues.join(', ');
        } else if (typeof selectedIssues === 'string') {
            issuesText = selectedIssues;
        } else {
            issuesText = 'N/A';
        }

        // Xây dựng payload thông báo với tiêu đề và nội dung hiển thị đúng
        const payload = {
            notification: {
                title: `Bạn nhận góp ý từ phòng trọ số ${roomNo}`,
                body: `Từ người thuê: ${phoneNumber}\nVấn đề: ${issuesText}` +
                    (additionalFeedback ? `\nGóp ý: ${additionalFeedback}` : ''),
            },
            token: deviceToken,
        };

        // In log payload để debug
        console.log('[DEBUG] Payload thông báo:', payload);

        // Gửi thông báo qua Firebase Cloud Messaging
        const sendResponse = await admin.messaging().send(payload);
        console.log('[DEBUG] FCM Response:', sendResponse);

        return res.status(200).send({ success: true, response: sendResponse });
    } catch (error) {
        console.error('[ERROR] Lỗi gửi thông báo phản hồi:', error.message);
        return res.status(500).send({ success: false, error: error.message });
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
