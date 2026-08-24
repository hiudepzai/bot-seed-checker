const axios = require('axios');
const cron = require('node-cron');

// Thông tin Webhook & ID Discord của bạn
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1541445568327589989/1KGFQE1pn7CrmdcfIepA4PwLTa71wUB5YB6XVCJ0BSAKwSzwyOTeDDUCO8PWEhzVzoMP';
const DISCORD_USER_ID = '1186603863202078733';
const API_URL = 'https://thongbao.shop/api/latest/seed';

// Danh sách 7 loại hạt giống theo yêu cầu
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

async function checkSeeds() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://thongbao.shop/app'
      }
    });

    const dataText = JSON.stringify(response.data).toLowerCase();
    
    for (const seed of TARGET_SEEDS) {
      const seedLower = seed.toLowerCase();

      if (dataText.includes(seedLower)) {
        if (!notifiedSeeds.has(seedLower)) {
          await sendDiscordNotification(seed);
          notifiedSeeds.add(seedLower);
        }
      } else {
        // Reset nếu hạt hết hàng
        notifiedSeeds.delete(seedLower);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Lỗi gọi API:`, error.message);
  }
}

async function sendDiscordNotification(seedName) {
  const payload = {
    content: `<@${DISCORD_USER_ID}> 🚨 **ĐÃ CÓ HẠT GIỐNG!**\nSản phẩm **${seedName.toUpperCase()}** đang có trong shop!\n👉 Mua ngay tại: https://thongbao.shop/app`
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log(`[${new Date().toLocaleTimeString()}] Đã gửi thông báo tag bạn cho: ${seedName}`);
  } catch (err) {
    console.error('Lỗi gửi Webhook:', err.message);
  }
}

// Chạy tự động kiểm tra mỗi 5 phút
cron.schedule('*/5 * * * *', () => {
  console.log(`[${new Date().toLocaleTimeString()}] Đang kiểm tra danh sách hạt giống...`);
  checkSeeds();
});

console.log('Bot Cloud đã khởi tạo thành công! Đang quét 7 loại hạt giống...');
checkSeeds();
