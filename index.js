const axios = require('axios');
const cron = require('node-cron');
const http = require('http');

// Server web giữ Render luôn chạy
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write('Bot Discord Seed Checker đang chạy!');
  res.end();
}).listen(PORT, () => console.log(`Server web chay tren port ${PORT}`));

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1541445568327589989/1KGFQE1pn7CrmdcfIepA4PwLTa71wUB5YB6XVCJ0BSAKwSzwyOTeDDUCO8PWEhzVzoMP';
const DISCORD_USER_ID = '1186603863202078733';
const API_URL = 'https://thongbao.shop/api/latest/seed';

// Token và Cookie lấy từ trình duyệt của bạn
const AUTH_TOKEN = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjZhYzkwNDdmNjcxMmZjZDVjZjY3YTMzMDc5NDFkOWZhNDIyODM5NTUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSGnhur91IFBo4bqhbSBUcnVuZyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJY1ZGNXNUellxUDl0UVFRR3VtMzI4VURLQXdRUWw3R0NUXzRNRlluanhKYmhvQWc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcGxheXRvZ2V0aGVyLW5vdGkiLCJhdWQiOiJwbGF5dG9nZXRoZXItbm90aSIsImF1dGhfdGltZSI6MTc4MjA5NjA2OSwidXNlcl9pZCI6Ild1ODVldFJwVUpNejBZcjZXUENXWnN6bHI4SjIiLCJzdWIiOiJXdTg1ZXRScFVKTXowWXI2V1BDV1pzemxyOEoyIiwiaWF0IjoxNzg3NTgxMDcwLCJleHAiOjE3ODc1ODQ2NzAsImVtYWlsIjoiaGlldTA5MTYwMDgyMDJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDUxMDE1OTE3MDU5NzIxNDM2MjEiXSwiZW1haWwiOlsiaGlldTA5MTYwMDgyMDJAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.lM7IgGloHv4p-CwdryjMDQaGpnFiIhBevyZ9DmwWbD7ddFWGW3s6K4_I_ZGLFV61OrMByJLD9j7eBARQh4jlF9nrLCDCiD9SZniywLpyW0GzdXXJZTflOrNAnmELbqjFIWMr8nrm4uAk_u_KreSsdgjEC428ISGFrb8XrCN-DW28qxoSQ5PmL0Nc75wwY9EbhBTVS8rn8mLd3_xOyY6mGH9_ZMgExCDhy-ynIT-iNEGmYgGD8ibg6wad_z6gc6vK3nA6v9rTRFkoxSXJiWwbutvZuLL41IrCvVgnKSvhop9Su_bpxckSbww75JEr8AQh3nSGMZNKPAiPHFhxAhHItg';
const MY_COOKIE = 'i18n_lang=vi; cf_clearance=j8vUWHlDCqmw.PDoJLFAui4GEs8DkqD__lO1NwDEpfc-1787583700-1.2.1.1-_pM0.eaMES0jQZ7aL4SXgkuJ0eh2Dajh4a_omLjXaPqhSMOHA09f0wkSJ65j4D9kiWAqFV5qYSQRKTi.ALxv45sYgI9zEpKmTrPip9VrBAcsNA9DLYFeQhsLRCk3239HESL1jhun5PRzue2AHUniFa1LevK8uPD6EuTchucvSIf0c6e6VkFohzcR.8QJIqTs6yKnwpb_82M6XysnjQqybmaTv2EetRAWk38pUL_xDOUwX1qWu9xWqjILRwG8DIku6tKAbu24ZrgK9g6qP6LsDEyQQ4cAPgqwEqhrVjuHiB1uE1wycIA68zNpY2qiDuv8QReGiFFlAjXITyZ9Z6oPhMXuZMhsqQet6p6E.tB1.b8';

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://thongbao.shop/app',
        'Authorization': AUTH_TOKEN,
        'Cookie': MY_COOKIE
      }
    });

    const dataText = typeof response.data === 'string' ? response.data.toLowerCase() : JSON.stringify(response.data).toLowerCase();
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

// Kiểm tra mỗi 5 phút
cron.schedule('*/5 * * * *', () => {
  console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Đang kiểm tra danh sách hạt giống...`);
  checkSeeds();
});

console.log('Bot Cloud đã khởi tạo thành công!');
checkSeeds();
