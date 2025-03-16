import 'package:http/http.dart' as http;
import 'dart:convert';

void main() async {
  // Sửa: thêm async
  const serverUrl = 'http://localhost:3000/sendFCM'; // hoặc URL của bạn

  final response = await http.post(
    // OK vì đã có import http
    Uri.parse(serverUrl),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'roomNo': '1', 'paymentMethod': 'Tiền mặt'}),
  );

  if (response.statusCode == 200) {
    print('✅ Đã gửi thông báo thành công: ${response.body}');
  } else {
    print('❌ Lỗi gửi: ${response.statusCode} - ${response.body}');
  }
}
