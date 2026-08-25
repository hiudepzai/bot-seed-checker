const cloudscraper = require('cloudscraper');
const axios = require('axios');
const cron = require('node-cron');
const http = require('http');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write('Bot Telegram Seed Checker đang chạy!');
  res.end();
}).listen(PORT, () => console.log(`Server web chay tren port ${PORT}`));

const TELEGRAM_BOT_TOKEN = '8969138348:AAFsq9_oVq2Jp4iN5oG8hxjDtnqQxNrtAq0';
const TELEGRAM_CHAT_ID = '6394160170';

const API_URL = 'https://thongbao.shop/api/latest/seed';
const FIREBASE_API_KEY = 'AIzaSyB8VyYLMy1oms-BxDWLOofTnZg4xmnfUdc';
const REFRESH_TOKEN = 'AMf-vBz9O-tnffabUrKkGt_CHfXK08_gKbHE1Wjn2PvE39eoJ9TbWrRQc5_9idVInwKDun2RbQc8jlM-HIQNw86tWIe0JmPMh9AwVKQ4DDtWtdxfASYeX1i8VM2MepW_jc-E6ew-7ZHg0zKfpL9hwFa7xcmFCL0x3f8DexetQMqR9hbiEi4sucAVWMyha-uguGPfO5U9SSwu3BrbuLIsVb9kZNSpb76jqvb-1CZfwE1qbGEbhkwjFXAOsHXgsY23tIDtCEduLOYE4A3IuBVwEgjF6FnY99_mG91ULIHc8wDnrmAvGCzcBhlRTpxFmJuCmN6CgBtH2HzhCaDmbzc1ZN3hvo7u49yzK1bPU7-rYJJMh6_DGPIj8WX_kIcO9cyMjWQPGgBZYv7UKqY14aSVczV4mJCL4n6UrGJ0JuRmmwzj_BNwlJaSMIWEyshqkmdBEKRtiUZ_fTK0';

const TARGET_SEEDS = {
  'watermelon_seed': 'Dưa Hấu',
  'pumpkin_seed': 'Bí Ngô',
  'rose_seed_white': 'Hoa Hồng (Trắng)',
  'starfruit_seed': 'Khế',
  'sugar_apple_seed': 'Táo Đường',
  'coconut_seed': 'Dừa',
  'papaya_seed': 'Đu đủ'
};

let notifiedSeeds = new Set();
let currentBearerToken = '';
let lastTokenFetchTime = 0;

async function getFreshAccessToken() {
  const now = Date.now();
  if (currentBearerToken && (now - lastTokenFetchTime < 45 * 60 * 1000)) {
    return currentBearerToken;
  }

  try {
    const res = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN
      })
    );
    currentBearerToken = `Bearer ${res.data.id_token}`;
    lastTokenFetchTime = now;
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đã cập nhật Token mới!`);
    return currentBearerToken;
  } catch (err) {
    console.error('Lỗi khi đổi Refresh Token:', err.message);
    return currentBearerToken;
  }
}

async function checkSeeds() {
  try {
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

    const parsedData = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    const currentItemList = parsedData?.data?.data || [];

    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Lấy dữ liệu thành công! Tìm thấy ${currentItemList.length} món.`);
    
    // In danh sách ID hạt chi tiết ra bảng Log Render
    console.log('Danh sách ID hạt đang bán:', currentItemList.map(item => `${item.name} (${item.count})`).join(', '));

    const availableSeedIds = currentItemList.map(item => item.name);
    const newFoundSeeds = [];

    for (const [seedId, displayName] of Object.entries(TARGET_SEEDS)) {
      if (availableSeedIds.includes(seedId)) {
        if (!notifiedSeeds.has(seedId)) {
          newFoundSeeds.push(displayName);
          notifiedSeeds.add(seedId);
        }
      } else {
        notifiedSeeds.delete(seedId);
      }
    }

    if (newFoundSeeds.length > 0) {
      await sendTelegramNotification(newFoundSeeds);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString('vi-VN')}] Lỗi gọi API:`, error.message);
  }
}

async function sendTelegramNotification(seedList) {
  const seedsString = seedList.map(s => `• <b>HẠT ${s.toUpperCase()}</b>`).join('\n');
  const message = `🚨 <b>ĐÃ CÓ HẠT GIỐNG CẦN MUA!</b>\n\n${seedsString}\n\n👉 Vào game mua đi`;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đã gửi thông báo Telegram cho: ${seedList.join(', ')}`);
  } catch (err) {
    console.error('Lỗi gửi Telegram:', err.message);
  }
}

cron.schedule('* * * * *', () => {
  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đang kiểm tra danh sách hạt giống...`);
  checkSeeds();
});

console.log('Bot Cloud đã khởi tạo thành công!');
checkSeeds();
