const cloudscraper = require('cloudscraper');
const axios = require('axios');
const cron = require('node-cron');
const http = require('http');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write('Bot Discord Seed Checker đang chạy!');
  res.end();
}).listen(PORT, () => console.log(`Server web chay tren port ${PORT}`));

// WEBHOOK MỚI CỦA BẠN
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1541595620375134324/xo48usphldmVYVzF9WRkdY90KE-ia5PiwEN70ffWqqj82ThQRhIR76Oa9ph3YhisLbST';
const DISCORD_USER_ID = '1186603863202078733';
const API_URL = 'https://thongbao.shop/api/latest/seed';

const FIREBASE_API_KEY = 'AIzaSyB8VyYLMy1oms-BxDWLOofTnZg4xmnfUdc';
const REFRESH_TOKEN = 'AMf-vBz9O-tnffabUrKkGt_CHfXK08_gKbHE1Wjn2PvE39eoJ9TbWrRQc5_9idVInwKDun2RbQc8jlM-HIQNw86tWIe0JmPMh9AwVKQ4DDtWtdxfASYeX1i8VM2MepW_jc-E6ew-7ZHg0zKfpL9hwFa7xcmFCL0x3f8DexetQMqR9hbiEi4sucAVWMyha-uguGPfO5U9SSwu3BrbuLIsVb9kZNSpb76jqvb-1CZfwE1qbGEbhkwjFXAOsHXgsY23tIDtCEduLOYE4A3IuBVwEgjF6FnY99_mG91ULIHc8wDnrmAvGCzcBhlRTpxFmJuCmN6CgBtH2HzhCaDmbzc1ZN3hvo7u49yzK1bPU7-rYJJMh6_DGPIj8WX_kIcO9cyMjWQPGgBZYv7UKqY14aSVczV4mJCL4n6UrGJ0JuRmmwzj_BNwlJaSMIWEyshqkmdBEKRtiUZ_fTK0';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TARGET_SEEDS = {
  'watermelon_seed': 'Dưa Hấu',
  'pumpkin_seed': 'Bí Ngô',
  'rose_seed_white': 'Hoa Hồng (Trắng)',
  'strawberry_seed': 'Cây Dâu',
  'starfruit_seed': 'Khế',
  'sugar_apple_seed': 'Táo Đường',
  'coconut_seed': 'Dừa',
  'carrot_seed': 'Cà Rốt',
  'corn_seed': 'Bắp (Test)',
  'mushroom_seed': 'Nấm (Test)'
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
      await sendDiscordNotification(newFoundSeeds);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString('vi-VN')}] Lỗi gọi API:`, error.message);
  }
}

async function sendDiscordNotification(seedList, retries = 3) {
  if (retries <= 0) {
    console.error('Đã vượt quá số lần thử gửi lại Discord Webhook.');
    return;
  }

  const seedsString = seedList.map(s => `• **HẠT ${s.toUpperCase()}**`).join('\n');
  const payload = {
    content: `<@${DISCORD_USER_ID}> 🚨 **ĐÃ CÓ HẠT GIỐNG CẦN MUA!**\n${seedsString}\n👉 Mua ngay tại: https://thongbao.shop/app`
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đã gửi thông báo cho: ${seedList.join(', ')}`);
  } catch (err) {
    if (err.response && err.response.status === 429) {
      // Đọc chính xác thời gian chờ từ Header/Data trả về của Discord (ms)
      const waitTime = Math.ceil((err.response.data?.retry_after || 2) * 1000);
      console.log(`Dính Rate Limit Discord, tự động đợi ${waitTime}ms để gửi lại...`);
      await sleep(waitTime);
      return sendDiscordNotification(seedList, retries - 1);
    } else {
      console.error('Lỗi gửi Webhook:', err.message);
    }
  }
}

cron.schedule('* * * * *', () => {
  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đang kiểm tra danh sách hạt giống...`);
  checkSeeds();
});

console.log('Bot Cloud đã khởi tạo thành công!');
checkSeeds();
