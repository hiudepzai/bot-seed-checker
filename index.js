const cloudscraper = require('cloudscraper');
const axios = require('axios');
const cron = require('node-cron');
const http = require('http');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write('Bot Discord Seed Checker đang chạy!');
  res.end();
}).listen(PORT, () => console.log(`Server web chay tren port ${PORT}`));

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1541585345836228689/Ns0zm5wB2xioNM3XYhxpGLC0szB43pFAJ7LJGqRTRR66TzZtw6xBHhzpqO6E2KOtrfQD';
const DISCORD_USER_ID = '1186603863202078733';
const API_URL = 'https://thongbao.shop/api/latest/seed';

const FIREBASE_API_KEY = 'AIzaSyB8VyYLMy1oms-BxDWLOofTnZg4xmnfUdc';
const REFRESH_TOKEN = 'AMf-vBz9O-tnffabUrKkGt_CHfXK08_gKbHE1Wjn2PvE39eoJ9TbWrRQc5_9idVInwKDun2RbQc8jlM-HIQNw86tWIe0JmPMh9AwVKQ4DDtWtdxfASYeX1i8VM2MepW_jc-E6ew-7ZHg0zKfpL9hwFa7xcmFCL0x3f8DexetQMqR9hbiEi4sucAVWMyha-uguGPfO5U9SSwu3BrbuLIsVb9kZNSpb76jqvb-1CZfwE1qbGEbhkwjFXAOsHXgsY23tIDtCEduLOYE4A3IuBVwEgjF6FnY99_mG91ULIHc8wDnrmAvGCzcBhlRTpxFmJuCmN6CgBtH2HzhCaDmbzc1ZN3hvo7u49yzK1bPU7-rYJJMh6_DGPIj8WX_kIcO9cyMjWQPGgBZYv7UKqY14aSVczV4mJCL4n6UrGJ0JuRmmwzj_BNwlJaSMIWEyshqkmdBEKRtiUZ_fTK0';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TARGET_SEEDS = [
  'watermelon_seed',
  'pumpkin_seed',
  'rose_seed_white',
  'strawberry_seed',
  'starfruit_seed',
  'apple_seed',
  'coconut_seed',
  'carrot_seed'
];

let currentBearerToken = '';
let lastTokenFetchTime = 0;
let lastNotifiedSeeds = ''; // Lưu lại trạng thái hạt đã thông báo đợt trước

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://thongbao.shop/app',
        'Authorization': token
      }
    });

    const rawData = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    const cleanDataText = rawData.toLowerCase();

    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Lấy dữ liệu thành công!`);

    const newFoundSeeds = [];

    for (const seed of TARGET_SEEDS) {
      if (cleanDataText.includes(seed)) {
        newFoundSeeds.push(seed.replace('_seed', '').toUpperCase());
      }
    }

    const currentSeedsKey = newFoundSeeds.sort().join(',');

    // Chỉ gửi thông báo nếu có hạt mới VÀ khác với lần đã thông báo gần nhất
    if (newFoundSeeds.length > 0 && currentSeedsKey !== lastNotifiedSeeds) {
      lastNotifiedSeeds = currentSeedsKey;
      await sendDiscordNotification(newFoundSeeds);
    } else if (newFoundSeeds.length === 0) {
      lastNotifiedSeeds = ''; // Reset lại khi shop hết hạt
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString('vi-VN')}] Lỗi gọi API:`, error.message);
  }
}

async function sendDiscordNotification(seedList, retries = 3) {
  const seedsString = seedList.map(s => `• **HẠT ${s}**`).join('\n');
  const payload = {
    content: `<@${DISCORD_USER_ID}> 🚨 **ĐÃ CÓ HẠT GIỐNG CẦN MUA!**\n${seedsString}\n👉 Mua ngay tại: https://thongbao.shop/app`
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đã gửi thông báo thành công cho: ${seedList.join(', ')}`);
  } catch (err) {
    if (err.response && err.response.status === 429 && retries > 0) {
      const retryAfter = (err.response.data.retry_after || 5) * 1000;
      console.log(`Bị Rate Limit Discord, tự động đợi ${retryAfter}ms...`);
      await sleep(retryAfter);
      return sendDiscordNotification(seedList, retries - 1);
    }
    console.error('Lỗi gửi Webhook:', err.message);
  }
}

cron.schedule('* * * * *', () => {
  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đang kiểm tra danh sách hạt giống...`);
  checkSeeds();
});

console.log('Bot Cloud đã khởi tạo thành công!');
checkSeeds();
