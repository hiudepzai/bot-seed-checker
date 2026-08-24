const cloudscraper = require('cloudscraper');
const axios = require('axios');
const cron = require('node-cron');
const http = require('http');

// Server web duy trì Render hoạt động
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write('Bot Discord Seed Checker đang chạy!');
  res.end();
}).listen(PORT, () => console.log(`Server web chay tren port ${PORT}`));

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1541445568327589989/1KGFQE1pn7CrmdcfIepA4PwLTa71wUB5YB6XVCJ0BSAKwSzwyOTeDDUCO8PWEhzVzoMP';
const DISCORD_USER_ID = '1186603863202078733';
const API_URL = 'https://thongbao.shop/api/latest/seed';

// Firebase Credentials tự động gia hạn token vĩnh viễn
const FIREBASE_API_KEY = 'AIzaSyB8VyYLMy1oms-BxDWLOofTnZg4xmnfUdc';
const REFRESH_TOKEN = 'AMf-vBz9O-tnffabUrKkGt_CHfXK08_gKbHE1Wjn2PvE39eoJ9TbWrRQc5_9idVInwKDun2RbQc8jlM-HIQNw86tWIe0JmPMh9AwVKQ4DDtWtdxfASYeX1i8VM2MepW_jc-E6ew-7ZHg0zKfpL9hwFa7xcmFCL0x3f8DexetQMqR9hbiEi4sucAVWMyha-uguGPfO5U9SSwu3BrbuLIsVb9kZNSpb76jqvb-1CZfwE1qbGEbhkwjFXAOsHXgsY23tIDtCEduLOYE4A3IuBVwEgjF6FnY99_mG91ULIHc8wDnrmAvGCzcBhlRTpxFmJuCmN6CgBtH2HzhCaDmbzc1ZN3hvo7u49yzK1bPU7-rYJJMh6_DGPIj8WX_kIcO9cyMjWQPGgBZYv7UKqY14aSVczV4mJCL4n6UrGJ0JuRmmwzj_BNwlJaSMIWEyshqkmdBEKRtiUZ_fTK0';

const TARGET_SEEDS = [
  'hạt dưa hấu',
  'hạt bí ngô',
  'hạt giống hoa hồng (trắng)',
  'hạt cây đậu',
  'hạt khế',
  'hạt táo đường',
  'hạt dừa'
];

let notifiedSeeds = new Set();
let currentBearerToken = '';

// Tự động trao đổi Refresh Token lấy ID Token mới từ Google Firebase
async function getFreshAccessToken() {
  try {
    const res = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN
      })
    );
    currentBearerToken = `Bearer ${res.data.id_token}`;
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đã tự động đổi Token mới thành công!`);
    return currentBearerToken;
  } catch (err) {
    console.error('Lỗi khi đổi Refresh Token:', err.message);
    return currentBearerToken;
  }
}

async function checkSeeds() {
  try {
    // Tự động lấy token mới nhất trước mỗi lần kiểm tra
    const token = await getFreshAccessToken();

    const responseBody = await cloudscraper({
      method: 'GET',
      url: API_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://thongbao.shop/app',
        'Authorization': token
      }
    });

    const dataText = typeof responseBody === 'string' ? responseBody.toLowerCase() : JSON.stringify(responseBody).toLowerCase();
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Lấy dữ liệu thành công!`);

    for (const seed of TARGET_SEEDS) {
      const seedLower = seed.toLowerCase();

      if (dataText.includes(seedLower)) {
        if (!notifiedSeeds.has(seedLower)) {
          await sendDiscordNotification(seed);
          notifiedSeeds.add(seedLower);
        }
      } else {
        notifiedSeeds.delete(seedLower);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString('vi-VN')}] Lỗi gọi API:`, error.message);
  }
}

async function sendDiscordNotification(seedName) {
  const payload = {
    content: `<@${DISCORD_USER_ID}> 🚨 **ĐÃ CÓ HẠT GIỐNG!**\nSản phẩm **${seedName.toUpperCase()}** đang có trong shop!\n👉 Mua ngay tại: https://thongbao.shop/app`
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đã gửi thông báo tag bạn cho: ${seedName}`);
  } catch (err) {
    console.error('Lỗi gửi Webhook:', err.message);
  }
}

// Kiểm tra tự động mỗi 5 phút
cron.schedule('*/5 * * * *', () => {
  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đang kiểm tra danh sách hạt giống...`);
  checkSeeds();
});

console.log('Bot Cloud đã khởi tạo thành công!');
checkSeeds();
