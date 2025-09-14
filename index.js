const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const Pino = require('pino');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const axios = require('axios');
const playdl = require('play-dl');
const ytdl = require('ytdl-core');
const https = require('https');
const http = require('http');
const express = require('express');
const localtunnel = require('localtunnel');

// Tambahkan setelah impor modul
const ownerCode = "REZIUM2023"; // Ganti dengan kode yang Anda inginkan
const ownerFile = 'owner.json';

// Variabel global untuk tunnel
let tunnelUrl = null;
const app = express();
const port = process.env.PORT || 3000;

// Buat server sederhana untuk health check
app.get('/', (req, res) => {
    res.send('REZIUM-V2 Bot is running!');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Bot is running',
        timestamp: new Date().toISOString(),
        tunnelUrl: tunnelUrl
    });
});

// Pastikan file owner.json ada dan tambahkan owner default
if (!fs.existsSync(ownerFile)) {
    try {
        const defaultOwners = [
            "6287841109073@s.whatsapp.net",
            "6285765562855@s.whatsapp.net"
        ];
        fs.writeFileSync(ownerFile, JSON.stringify(defaultOwners, null, 2));
        debugLog('File owner.json dibuat dengan owner default');
    } catch (err) {
        debugLog(`Error membuat file owner.json: ${err.message}`);
    }
} else {
    // Cek apakah owner baru sudah ada, jika belum tambahkan
    try {
        const owners = JSON.parse(fs.readFileSync(ownerFile, 'utf-8'));
        const newOwner = "6285765562855@s.whatsapp.net";
        
        if (!owners.includes(newOwner)) {
            owners.push(newOwner);
            fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
            debugLog(`Owner baru ditambahkan: ${newOwner}`);
        }
    } catch (err) {
        debugLog(`Error menambah owner baru: ${err.message}`);
    }
}

// Tambahkan setelah konstanta owner
const premiumFile = 'premium.json';
const premiumCode = "REZIUM2023"; // Kode khusus untuk premium

// Pastikan file premium.json ada
if (!fs.existsSync(premiumFile)) {
    try {
        fs.writeFileSync(premiumFile, JSON.stringify([], null, 2));
        debugLog('File premium.json dibuat');
    } catch (err) {
        debugLog(`Error membuat file premium.json: ${err.message}`);
    }
}

// Fungsi untuk memulai server dan tunnel
async function startServer() {
    try {
        // Mulai server HTTP
        const server = app.listen(port, () => {
            debugLog(`Server berjalan pada port ${port}`);
        });
        
        // Mulai localtunnel
        const tunnel = await localtunnel({ 
            port: port,
            subdomain: 'rezium-v2' // Opsional: custom subdomain jika tersedia
        });
        
        tunnelUrl = tunnel.url;
        debugLog(`Localtunnel aktif: ${tunnelUrl}`);
        
        // Handle tunnel close
        tunnel.on('close', () => {
            debugLog('Localtunnel ditutup');
        });
        
        return { server, tunnelUrl };
    } catch (error) {
        debugLog(`Error memulai server/tunnel: ${error.message}`);
        throw error;
    }
}

// Fungsi untuk menghentikan tunnel (opsional)
async function stopTunnel() {
    // Localtunnel tidak memiliki fungsi stop built-in, 
    // tunnel akan otomatis tertutup saat proses dihentikan
    debugLog('Localtunnel akan otomatis tertutup');
}

// Fungsi untuk memeriksa apakah pengguna adalah owner
const isOwner = async (number) => {
    try {
        if (!fs.existsSync(ownerFile)) {
            return false;
        }
        
        const data = fs.readFileSync(ownerFile, 'utf-8');
        // Tambahkan pengecekan untuk file kosong
        if (!data || data.trim() === '') {
            return false;
        }
        
        const owners = JSON.parse(data);
        return owners.includes(number);
    } catch (err) {
        debugLog(`Error memeriksa owner: ${err.message}`);
        return false;
    }
};

// Fungsi untuk menambahkan owner baru
const addOwner = async (number) => {
    try {
        let owners = [];
        
        // Baca file owner jika ada
        if (fs.existsSync(ownerFile)) {
            try {
                const data = fs.readFileSync(ownerFile, 'utf-8');
                // Tambahkan pengecekan untuk file kosong
                if (data && data.trim() !== '') {
                    owners = JSON.parse(data);
                }
            } catch (err) {
                debugLog(`Error membaca file owner: ${err.message}`);
                // Lanjutkan dengan array kosong jika file rusak
            }
        }
        
        // Pastikan owners adalah array
        if (!Array.isArray(owners)) {
            owners = [];
        }
        
        // Cek apakah sudah menjadi owner
        if (owners.includes(number)) {
            return { success: false, message: 'Anda sudah terdaftar sebagai owner!' };
        }
        
        // Tambahkan owner baru
        owners.push(number);
        
        // Simpan ke file
        fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
        
        debugLog(`Owner baru ditambahkan: ${number}`);
        return { success: true, message: 'Selamat! Anda sekarang adalah owner bot.' };
    } catch (err) {
        debugLog(`Error menambah owner: ${err.message}`);
        return { success: false, message: 'Terjadi kesalahan saat menambah owner.' };
    }
};

// Fungsi untuk memeriksa apakah pengguna adalah premium
const isPremium = async (number) => {
    try {
        if (!fs.existsSync(premiumFile)) {
            return false;
        }
        
        const data = fs.readFileSync(premiumFile, 'utf-8');
        // Tambahkan pengecekan untuk file kosong
        if (!data || data.trim() === '') {
            return false;
        }
        
        const premiums = JSON.parse(data);
        return premiums.includes(number);
    } catch (err) {
        debugLog(`Error memeriksa premium: ${err.message}`);
        return false;
    }
};

// Fungsi untuk menambahkan user premium
const addPremium = async (number) => {
    try {
        let premiums = [];
        
        // Baca file premium jika ada
        if (fs.existsSync(premiumFile)) {
            try {
                const data = fs.readFileSync(premiumFile, 'utf-8');
                // Tambahkan pengecekan untuk file kosong
                if (data && data.trim() !== '') {
                    premiums = JSON.parse(data);
                }
            } catch (err) {
                debugLog(`Error membaca file premium: ${err.message}`);
                // Lanjutkan dengan array kosong jika file rusak
            }
        }
        
        // Pastikan premiums adalah array
        if (!Array.isArray(premiums)) {
            premiums = [];
        }
        
        // Cek apakah sudah premium
        if (premiums.includes(number)) {
            return { success: false, message: 'Pengguna sudah terdaftar sebagai premium!' };
        }
        
        // Tambahkan user premium baru
        premiums.push(number);
        
        // Simpan ke file
        fs.writeFileSync(premiumFile, JSON.stringify(premiums, null, 2));
        
        debugLog(`User premium ditambahkan: ${number}`);
        return { success: true, message: 'Selamat! Anda sekarang adalah user premium bot.' };
    } catch (err) {
        debugLog(`Error menambah premium: ${err.message}`);
        return { success: false, message: 'Terjadi kesalahan saat menambah user premium.' };
    }
};

// Fungsi untuk menghapus user premium
const removePremium = async (number) => {
    try {
        if (!fs.existsSync(premiumFile)) {
            return { success: false, message: 'Belum ada user premium yang terdaftar.' };
        }
        
        let premiums = JSON.parse(fs.readFileSync(premiumFile, 'utf-8'));
        
        // Cek apakah user adalah premium
        if (!premiums.includes(number)) {
            return { success: false, message: 'Pengguna tersebut bukan user premium!' };
        }
        
        // Hapus dari daftar premium
        premiums = premiums.filter(premium => premium !== number);
        
        // Simpan kembali ke file
        fs.writeFileSync(premiumFile, JSON.stringify(premiums, null, 2));
        
        debugLog(`User premium dihapus: ${number}`);
        return { success: true, message: 'User premium berhasil dihapus.' };
    } catch (err) {
        debugLog(`Error menghapus premium: ${err.message}`);
        return { success: false, message: 'Terjadi kesalahan saat menghapus user premium.' };
    }
};

// Fungsi untuk mendapatkan daftar user premium
const getPremiumList = async () => {
    try {
        if (!fs.existsSync(premiumFile)) {
            return [];
        }
        
        const data = fs.readFileSync(premiumFile, 'utf-8');
        // Tambahkan pengecekan untuk file kosong
        if (!data || data.trim() === '') {
            return [];
        }
        
        return JSON.parse(data);
    } catch (err) {
        debugLog(`Error mendapatkan daftar premium: ${err.message}`);
        return [];
    }
};

// Pinterest cache system
const pinterestCache = new Map();
// Bersihkan cache setiap jam
setInterval(() => {
    pinterestCache.clear();
    debugLog('Pinterest cache dibersihkan');
}, 3600000); // 1 jam

// Atur logger untuk debugging
const logger = Pino({
    level: 'warn'
});

// Tambahkan logging ke console untuk debugging
const debugLog = (message) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
};

// Gunakan direktori temporary sistem yang lebih aman
const tempDir = path.join(os.tmpdir(), 'rezium-v2-temp');
fs.ensureDirSync(tempDir);

// Direktori untuk menyimpan file download
const downloadDir = path.join(__dirname, 'downloads');
fs.ensureDirSync(downloadDir);

// Konstanta untuk fitur pp couple
const PP_COUPLE_DIRECTORY = 'assets';
const PP_COUPLE_FILE = 'couple-profile.json';

// Konstanta untuk fitur Furina
const FURINA_DIRECTORY = 'assets';
const FURINA_FILE = 'furina.json';

// Pastikan direktori assets ada
try {
    fs.ensureDirSync(PP_COUPLE_DIRECTORY);
    debugLog('Direktori assets dibuat/ditemukan');
} catch (err) {
    debugLog(`Error membuat direktori assets: ${err.message}`);
}

// Cek apakah file couple-profile.json sudah ada
const coupleProfilePath = path.join(PP_COUPLE_DIRECTORY, PP_COUPLE_FILE);
if (!fs.existsSync(coupleProfilePath)) {
    debugLog('File couple-profile.json tidak ditemukan, membuat file baru...');
    
    // Data pasangan gambar profil dengan link yang sama untuk male dan female
    const coupleData = [
        {
            "male": "https://i.pinimg.com/736x/c4/a9/89/c4a98988a67525af11d2e09c5b7dd1c5.jpg",
            "female": "https://i.pinimg.com/736x/79/af/2e/79af2e06e4e68880ea63e71a7d8418e3.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/f7/d7/90/f7d7906367e9eb059e6712aed573f38a.jpg",
            "female": "https://i.pinimg.com/736x/50/9c/82/509c82063ce797c4695854c22625e883.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/e8/45/33/e84533ad1413f44e80ecaa88540300cf.jpg",
            "female": "https://i.pinimg.com/736x/75/5a/b1/755ab149c23002243eaad6e60b559121.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/ad/68/66/ad6866cae7bc8c8fa30a86128571bc46.jpg",
            "female": "https://i.pinimg.com/736x/9d/1b/b7/9d1bb7c94058bb41073114a94c749923.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/2a/4c/60/2a4c608c7a67e64a4c5f837898e1d709.jpg",
            "female": "https://i.pinimg.com/736x/0e/34/55/0e34553b256312a334edbe6d4ee9b187.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/25/88/39/258839c975c9a0fcdaedf3d26f0f8649.jpg",
            "female": "https://i.pinimg.com/736x/c4/6d/e7/c46de713a9b1749e0d1772c28d269673.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/e8/62/86/e86286508bd9f4f7de18a7dabccc63be.jpg",
            "female": "https://i.pinimg.com/736x/d1/4f/19/d14f19599324e8d07f27b3e071e3f273.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/5f/4b/d8/5f4bd87d8bcf4e31210c57ed8c49128d.jpg",
            "female": "https://i.pinimg.com/736x/74/c3/9c/74c39c868a1605c4899fe131c2434100.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/8d/e4/6e/8de46ec1edf8c4a3c8adebe777fe1c8a.jpg",
            "female": "https://i.pinimg.com/736x/62/89/40/628940ec82555629754b0d69908402cf.jpg"
        },
        {
            "male": "https://i.pinimg.com/736x/63/64/57/63645713e047c5f5fa687df57ba51963.jpg",
            "female": "https://i.pinimg.com/736x/fe/f5/01/fef5017c678d7438ec0123d2abcf5e6b.jpg"
        }
    ];
    
    // Simpan data ke file JSON hanya jika belum ada
    try {
        fs.writeFileSync(coupleProfilePath, JSON.stringify(coupleData, null, 2));
        debugLog('File couple-profile.json berhasil dibuat');
    } catch (err) {
        debugLog(`Error membuat file couple-profile.json: ${err.message}`);
    }
}

// Cek apakah file furina.json sudah ada
const furinaProfilePath = path.join(FURINA_DIRECTORY, FURINA_FILE);
if (!fs.existsSync(furinaProfilePath)) {
    debugLog('File furina.json tidak ditemukan, membuat file baru...');
    
    // Data gambar Furina yang lebih lengkap dan valid
    const furinaData = [
    "https://i.pinimg.com/736x/60/dd/63/60dd635177b5add9b112c4bfac471bdd.jpg",
    "https://i.pinimg.com/736x/3e/ec/de/3eecde57a47183dd187899ad326bbbee.jpg",
    "https://i.pinimg.com/736x/6d/6f/f4/6d6ff45a555f649b1434099f47ca48ce.jpg",
    "https://i.pinimg.com/736x/24/a3/8c/24a38c289a1565af1a2b48de854cad17.jpg",
    "https://i.pinimg.com/1200x/0a/20/36/0a20368f07da659768b4f23a8925c380.jpg",
    "https://i.pinimg.com/736x/a0/b6/70/a0b670d587ac05d46133ad94f152f9aa.jpg",
    "https://i.pinimg.com/736x/28/69/91/286991244c2c5497b6b350fdf379b08f.jpg",
    "https://i.pinimg.com/736x/63/30/bb/6330bb05392817474bd42eb3fb79649e.jpg",
    "https://i.pinimg.com/736x/a5/7f/c9/a57fc965317a75a6ff6a212d6f5cbf5d.jpg",
    "https://i.pinimg.com/736x/22/29/fc/2229fcfad6dd8eb478c121f3c2133969.jpg",
    "https://i.pinimg.com/1200x/20/93/26/20932669f29c906fe04fb248285461b7.jpg",
    "https://i.pinimg.com/736x/a2/1c/f6/a21cf6acabaaf413a48669d8a9e6de99.jpg",
    "https://i.pinimg.com/736x/36/d6/78/36d678c1bc1b50312f4b1bb8fe329f2b.jpg",
    "https://i.pinimg.com/1200x/8c/79/fa/8c79fa556c02a618c8602d4fa640494b.jpg",
    "https://i.pinimg.com/736x/1e/a0/f0/1ea0f0b37077119b204f72996568dc75.jpg",
    "https://i.pinimg.com/736x/ad/fa/6c/adfa6c89a57a41a7c6f2b9876899e59d.jpg",
    "https://i.pinimg.com/736x/26/0f/62/260f62b1f08fb7de0759a83c181e2cd4.jpg",
    "https://i.pinimg.com/736x/6e/a5/ef/6ea5efee6cf0782d39c569f52422a552.jpg",
    "https://i.pinimg.com/1200x/c1/74/32/c17432ce27ad48e7ffb2f51d2c3f32a7.jpg",
    "https://i.pinimg.com/736x/12/65/04/1265041c5b9d37320d9b319be1242101.jpg",
    "https://i.pinimg.com/736x/74/87/64/74876458c530dea3d98c5d3829a367e4.jpg"
    ];
    
    // Simpan data ke file JSON
    try {
        fs.writeFileSync(furinaProfilePath, JSON.stringify(furinaData, null, 2));
        debugLog('File furina.json berhasil dibuat');
    } catch (err) {
        debugLog(`Error membuat file furina.json: ${err.message}`);
    }
}

// Fungsi untuk mendapatkan pasangan gambar profil secara acak
const getCoupleProfilePictures = () => {
    try {
        const couples = JSON.parse(fs.readFileSync(coupleProfilePath, 'utf-8'));
        // Pastikan couples adalah array dan tidak kosong
        if (!Array.isArray(couples) || couples.length === 0) {
            throw new Error('Data pasangan profil tidak valid atau kosong');
        }
        // Pilih acak
        return couples[Math.floor(Math.random() * couples.length)];
    } catch (err) {
        debugLog(`Error membaca file couple-profile.json: ${err.message}`);
        throw err;
    }
};

// Fungsi untuk mendapatkan gambar Furina secara acak
const getFurinaImage = () => {
    try {
        const furinaImages = JSON.parse(fs.readFileSync(furinaProfilePath, 'utf-8'));
        // Pastikan furinaImages adalah array dan tidak kosong
        if (!Array.isArray(furinaImages) || furinaImages.length === 0) {
            throw new Error('Data gambar Furina tidak valid atau kosong');
        }
        // Pilih acak
        return furinaImages[Math.floor(Math.random() * furinaImages.length)];
    } catch (err) {
        debugLog(`Error membaca file furina.json: ${err.message}`);
        throw err;
    }
};

// Fungsi untuk mencari URL gambar dalam data JSON
function findImageUrlInJson(obj) {
    if (!obj || typeof obj !== 'object') return null;
    
    // Cek jika objek memiliki properti url dan url mengandung "i.pinimg.com"
    if (obj.url && typeof obj.url === 'string' && obj.url.includes('i.pinimg.com')) {
        return obj.url;
    }
    
    // Cek jika objek memiliki properti image_src dan image_src mengandung "i.pinimg.com"
    if (obj.image_src && typeof obj.image_src === 'string' && obj.image_src.includes('i.pinimg.com')) {
        return obj.image_src;
    }
    
    // Cek jika objek memiliki properti image dan image.url mengandung "i.pinimg.com"
    if (obj.image && obj.image.url && typeof obj.image.url === 'string' && obj.image.url.includes('i.pinimg.com')) {
        return obj.image.url;
    }
    
    // Rekursif untuk mencari di semua properti
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const result = findImageUrlInJson(obj[key]);
            if (result) return result;
        }
    }
    
    return null;
}

// Fungsi untuk mendapatkan cookie Pinterest
const getPinterestCookie = async () => {
    try {
        // Cookie dasar yang sering digunakan oleh Pinterest
        const baseCookies = [
            '_auth=1; _b="AMZ1YzZmZDQxYjQxYjQxYjQxYjQxYjQxYjQx";',
            'sessionFunnelEventLogged=1; _pinterest_sess=TWc9PSZHam1iWjU0VG9TU1JZTzRmN1p6UWp0Nk5sM3JqVHlVU0p0a3B4N0x3PT0mZk9qV0xUa1ZQT0p6N3V1NzBpWnB1VnN0Yz1nPT0tJm1lc2s9MCZrY2g9PSZkYz0mc2R0PSZ0b2E9PSZ1cmw9aHR0cHMlM0ElMkYlMkZ3d3cucGludGVyZXN0LmNvbSUyRg==',
            'csrftoken=abc123; sessionid=abc123',
            '_pinterest_cm=1; _pinterest_ct=1; _pinterest_dm=1; _pinterest_gtm=1; _pinterest_utm=1'
        ];
        
        // Coba dapatkan cookie fresh dengan mengunjungi halaman Pinterest
        try {
            debugLog('Mendapatkan cookie fresh dari Pinterest...');
            
            const response = await axios.get('https://www.pinterest.com/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 10000
            });
            
            // Ekstrak cookie dari header set-cookie
            const setCookieHeaders = response.headers['set-cookie'];
            if (setCookieHeaders && setCookieHeaders.length > 0) {
                const freshCookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
                debugLog('Cookie fresh berhasil didapatkan');
                return freshCookies;
            }
        } catch (cookieError) {
            debugLog(`Error mendapatkan cookie fresh: ${cookieError.message}`);
        }
        
        // Jika gagal, gunakan cookie dasar
        debugLog('Menggunakan cookie dasar');
        return baseCookies.join(' ');
    } catch (error) {
        debugLog(`Error mendapatkan cookie: ${error.message}`);
        // Return cookie minimal
        return '_auth=1; csrftoken=abc123;';
    }
};

// Fungsi untuk mendapatkan proxy acak (opsional)
const getRandomProxy = async () => {
    try {
        // Daftar proxy publik (ganti dengan proxy Anda sendiri jika ada)
        const proxies = [
            'http://104.248.63.15:80',
            'http://104.248.63.15:8080',
            'http://104.248.63.15:3128',
            'http://104.248.63.15:8888',
            'http://104.248.63.15:8080'
        ];
        
        if (proxies.length === 0) {
            return null;
        }
        
        return proxies[Math.floor(Math.random() * proxies.length)];
    } catch (error) {
        debugLog(`Error mendapatkan proxy: ${error.message}`);
        return null;
    }
};

// Fungsi untuk mengecek koneksi internet
const checkInternetConnection = async () => {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'www.google.com',
            port: 443,
            path: '/',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        
        req.on('error', () => {
            resolve(false);
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
};

// Fungsi untuk mengambil gambar dari URL Pinterest (DIPERBAIKI)
const getPinterestImage = async (url) => {
    try {
        debugLog(`Mengambil gambar dari Pinterest: ${url}`);
        
        // Coba beberapa metode untuk menemukan URL gambar
        
        // Metode 1: Gunakan API Pinterest resmi (jika memungkinkan)
        try {
            debugLog('Mencoba API Pinterest resmi...');
            
            // Ekstrak ID pin dari URL
            const pinIdMatch = url.match(/\/pin\/(\d+)/);
            if (pinIdMatch && pinIdMatch[1]) {
                const pinId = pinIdMatch[1];
                
                // Coba beberapa endpoint API
                const apiEndpoints = [
                    `https://api.pinterest.com/v3/pins/${pinId}/?access_token=YOUR_ACCESS_TOKEN`,
                    `https://www.pinterest.com/resource/PinResource/get/?source_url=/pin/${pinId}/&data={"options":{"pin_id":"${pinId}"}}`
                ];
                
                for (const apiUrl of apiEndpoints) {
                    try {
                        const response = await axios.get(apiUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/json',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Referer': 'https://www.pinterest.com/',
                                'DNT': '1',
                                'Connection': 'keep-alive'
                            },
                            timeout: 10000
                        });
                        
                        if (response.data) {
                            // Ekstrak URL gambar dari respons
                            let imageUrl = null;
                            
                            if (response.data.image && response.data.image.url) {
                                imageUrl = response.data.image.url;
                            } else if (response.data.data && response.data.data.image && response.data.data.image.url) {
                                imageUrl = response.data.data.image.url;
                            } else if (response.data.resource_response && response.data.resource_response.data && response.data.resource_response.data.image && response.data.resource_response.data.image.url) {
                                imageUrl = response.data.resource_response.data.image.url;
                            }
                            
                            if (imageUrl) {
                                debugLog(`URL gambar ditemukan dari API: ${imageUrl}`);
                                return imageUrl;
                            }
                        }
                    } catch (apiError) {
                        debugLog(`Error dengan API ${apiUrl}: ${apiError.message}`);
                    }
                }
            }
        } catch (apiError) {
            debugLog(`Error dengan API Pinterest: ${apiError.message}`);
        }
        
        // Metode 2: Scraping dengan cookie
        try {
            debugLog('Mencoba scraping dengan cookie...');
            
            const cookie = await getPinterestCookie();
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Referer': 'https://www.pinterest.com/',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Cookie': cookie
            };
            
            const response = await axios.get(url, { headers });
            const html = response.data;
            
            // Coba beberapa metode untuk menemukan URL gambar
            
            // Metode A: Cari tag meta og:image
            let match = html.match(/<meta property="og:image" content="(.*?)"/);
            if (match && match[1]) {
                debugLog(`Ditemukan URL gambar (og:image): ${match[1]}`);
                return match[1];
            }
            
            // Metode B: Cari tag meta og:image:url
            match = html.match(/<meta property="og:image:url" content="(.*?)"/);
            if (match && match[1]) {
                debugLog(`Ditemukan URL gambar (og:image:url): ${match[1]}`);
                return match[1];
            }
            
            // Metode C: Cari tag img dengan src yang mengandung "i.pinimg.com"
            match = html.match(/<img[^>]+src="(https:\/\/i\.pinimg\.com\/[^"]+)"[^>]*>/);
            if (match && match[1]) {
                debugLog(`Ditemukan URL gambar (img tag): ${match[1]}`);
                return match[1];
            }
            
            // Metode D: Cari data dalam JSON
            match = html.match(/<script id="initial-state" type="application\/json">(.*?)<\/script>/);
            if (match && match[1]) {
                try {
                    const data = JSON.parse(match[1]);
                    const imageUrl = findImageUrlInJson(data);
                    if (imageUrl) {
                        debugLog(`Ditemukan URL gambar (JSON): ${imageUrl}`);
                        return imageUrl;
                    }
                } catch (e) {
                    debugLog(`Error parsing JSON: ${e.message}`);
                }
            }
            
            // Metode E: Cari tag script dengan data JSON
            match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/);
            if (match && match[1]) {
                try {
                    const data = JSON.parse(match[1]);
                    const imageUrl = findImageUrlInJson(data);
                    if (imageUrl) {
                        debugLog(`Ditemukan URL gambar (LD+JSON): ${imageUrl}`);
                        return imageUrl;
                    }
                } catch (e) {
                    debugLog(`Error parsing LD+JSON: ${e.message}`);
                }
            }
            
            // Metode F: Cari URL gambar dengan regex yang lebih agresif
            match = html.match(/https:\/\/i\.pinimg\.com\/originals\/[^"'\s]+/);
            if (match && match[0]) {
                debugLog(`Ditemukan URL gambar (aggressive): ${match[0]}`);
                return match[0];
            }
            
            // Metode G: Cari URL gambar 736x
            match = html.match(/https:\/\/i\.pinimg\.com\/736x\/[^"'\s]+/);
            if (match && match[0]) {
                debugLog(`Ditemukan URL gambar (736x): ${match[0]}`);
                return match[0];
            }
        } catch (scrapingError) {
            debugLog(`Error dengan scraping: ${scrapingError.message}`);
        }
        
        // Metode 3: Gunakan layanan pihak ketiga
        try {
            debugLog('Mencoba layanan pihak ketiga...');
            
            const thirdPartyServices = [
                {
                    name: 'Pinterest Downloader API',
                    url: `https://pinterestdownloader.com/api?url=${encodeURIComponent(url)}`,
                    handler: (response) => {
                        if (response.data && response.data.url) {
                            return response.data.url;
                        }
                        return null;
                    }
                },
                {
                    name: 'Pinterest Video Downloader',
                    url: `https://pinterestvideodownloader.com/download?url=${encodeURIComponent(url)}`,
                    handler: (response) => {
                        if (response.data && response.data.download_url) {
                            return response.data.download_url;
                        }
                        return null;
                    }
                },
                {
                    name: 'SaveFrom API',
                    url: `https://savefrom.net/api?url=${encodeURIComponent(url)}`,
                    handler: (response) => {
                        if (response.data && response.data.url) {
                            return response.data.url;
                        }
                        return null;
                    }
                }
            ];
            
            for (const service of thirdPartyServices) {
                try {
                    debugLog(`Mencoba layanan: ${service.name}`);
                    
                    const response = await axios.get(service.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 15000
                    });
                    
                    const imageUrl = service.handler(response);
                    if (imageUrl) {
                        debugLog(`URL gambar ditemukan dari ${service.name}: ${imageUrl}`);
                        return imageUrl;
                    }
                } catch (serviceError) {
                    debugLog(`Error dengan ${service.name}: ${serviceError.message}`);
                }
            }
        } catch (thirdPartyError) {
            debugLog(`Error dengan layanan pihak ketiga: ${thirdPartyError.message}`);
        }
        
        // Metode 4: Gunakan browser automation (jika memungkinkan)
        try {
            debugLog('Mencoba browser automation...');
            
            // Ini hanya akan berfungsi jika puppeteer terinstal
            // Anda perlu menginstalnya dengan: npm install puppeteer
            try {
                const puppeteer = require('puppeteer');
                
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                
                const page = await browser.newPage();
                
                // Set user agent dan viewport
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                await page.setViewport({ width: 1366, height: 768 });
                
                // Navigasi ke URL
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // Tunggu beberapa detik untuk memastikan halaman dimuat sepenuhnya
                await page.waitForTimeout(3000);
                
                // Coba dapatkan URL gambar dari berbagai sumber
                const imageUrl = await page.evaluate(() => {
                    // Cari og:image
                    const ogImage = document.querySelector('meta[property="og:image"]');
                    if (ogImage && ogImage.getAttribute('content')) {
                        return ogImage.getAttribute('content');
                    }
                    
                    // Cari gambar dengan kelas tertentu
                    const imageElements = document.querySelectorAll('img');
                    for (const img of imageElements) {
                        const src = img.getAttribute('src');
                        if (src && src.includes('i.pinimg.com') && (src.includes('originals') || src.includes('736x'))) {
                            return src;
                        }
                    }
                    
                    return null;
                });
                
                await browser.close();
                
                if (imageUrl) {
                    debugLog(`URL gambar ditemukan dari browser automation: ${imageUrl}`);
                    return imageUrl;
                }
            } catch (puppeteerError) {
                debugLog(`Error dengan puppeteer: ${puppeteerError.message}`);
                debugLog('Puppeteer tidak terinstal atau gagal dijalankan');
            }
        } catch (automationError) {
            debugLog(`Error dengan browser automation: ${automationError.message}`);
        }
        
        throw new Error('Tidak dapat menemukan URL gambar dengan metode apa pun');
    } catch (error) {
        debugLog(`Error mengambil gambar Pinterest: ${error.message}`);
        throw error;
    }
};

// Fungsi untuk mengambil gambar dari URL dan mengubahnya menjadi buffer (SUPER DIPERBAIKI)
const getImageBuffer = async (url) => {
    try {
        // Jika URL adalah Pinterest, ambil URL gambar langsung
        if (url.includes('pin.it') || url.includes('pinterest.com/pin/')) {
            url = await getPinterestImage(url);
        }
        
        debugLog(`Mencoba mengambil gambar dari: ${url}`);
        
        // Coba banyak metode untuk mengambil gambar
        const methods = [
            // Metode 1: Header lengkap dengan cookie fresh
            async () => {
                debugLog('Metode 1: Header lengkap dengan cookie fresh...');
                
                const cookie = await getPinterestCookie();
                
                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'Referer': 'https://www.pinterest.com/',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'Cookie': cookie,
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Dest': 'image'
                };
                
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: headers,
                    timeout: 20000,
                    maxRedirects: 5,
                    validateStatus: function (status) {
                        return status >= 200 && status < 300;
                    }
                });
                
                // Validasi konten gambar
                const contentType = response.headers['content-type'];
                if (!contentType || !contentType.startsWith('image/')) {
                    throw new Error('Konten yang diunduh bukan gambar');
                }
                
                // Buat buffer dari gambar
                const buffer = Buffer.from(response.data, 'binary');
                
                // Validasi ukuran gambar (minimal 1KB)
                if (buffer.length < 1024) {
                    throw new Error('Ukuran gambar terlalu kecil');
                }
                
                // Coba proses dengan sharp untuk memastikan format valid
                try {
                    await sharp(buffer).metadata();
                } catch (sharpError) {
                    throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                }
                
                return {
                    buffer: buffer,
                    mimetype: contentType || 'image/jpeg'
                };
            },
            
            // Metode 2: Ubah domain Pinterest ke CDN alternatif
            async () => {
                debugLog('Metode 2: Menggunakan CDN alternatif...');
                
                // Ubah URL ke CDN alternatif
                let cdnUrl = url;
                
                // Coba beberapa varian CDN
                const cdnVariants = [
                    url.replace('i.pinimg.com', 'i.pinimg.com'),
                    url.replace('originals', '736x'),
                    url.replace('736x', 'originals'),
                    url.replace('i.pinimg.com', 's.pinimg.com'),
                    url.replace('s.pinimg.com', 'i.pinimg.com')
                ];
                
                for (const variant of cdnVariants) {
                    try {
                        debugLog(`Mencoba CDN variant: ${variant}`);
                        
                        const response = await axios.get(variant, {
                            responseType: 'arraybuffer',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Referer': 'https://www.pinterest.com/',
                                'DNT': '1',
                                'Connection': 'keep-alive'
                            },
                            timeout: 15000
                        });
                        
                        // Validasi konten gambar
                        const contentType = response.headers['content-type'];
                        if (!contentType || !contentType.startsWith('image/')) {
                            throw new Error('Konten yang diunduh bukan gambar');
                        }
                        
                        // Buat buffer dari gambar
                        const buffer = Buffer.from(response.data, 'binary');
                        
                        // Validasi ukuran gambar (minimal 1KB)
                        if (buffer.length < 1024) {
                            throw new Error('Ukuran gambar terlalu kecil');
                        }
                        
                        // Coba proses dengan sharp untuk memastikan format valid
                        try {
                            await sharp(buffer).metadata();
                        } catch (sharpError) {
                            throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                        }
                        
                        return {
                            buffer: buffer,
                            mimetype: contentType || 'image/jpeg'
                        };
                    } catch (variantError) {
                        debugLog(`CDN variant gagal: ${variantError.message}`);
                    }
                }
                
                throw new Error('Semua CDN variant gagal');
            },
            
            // Metode 3: Menggunakan proxy publik
            async () => {
                debugLog('Metode 3: Menggunakan proxy publik...');
                
                // Daftar proxy publik
                const proxyList = [
                    'http://104.248.63.15:80',
                    'http://104.248.63.15:8080',
                    'http://104.248.63.15:3128',
                    'http://104.248.63.15:8888',
                    'http://104.248.63.15:8080'
                ];
                
                for (const proxyUrl of proxyList) {
                    try {
                        debugLog(`Mencoba proxy: ${proxyUrl}`);
                        
                        // Gunakan https-proxy-agent
                        const { HttpsProxyAgent } = require('https-proxy-agent');
                        const httpsAgent = new HttpsProxyAgent(proxyUrl);
                        
                        const response = await axios.get(url, {
                            responseType: 'arraybuffer',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Referer': 'https://www.pinterest.com/',
                                'DNT': '1',
                                'Connection': 'keep-alive'
                            },
                            httpsAgent: httpsAgent,
                            timeout: 30000,
                            proxy: false
                        });
                        
                        // Validasi konten gambar
                        const contentType = response.headers['content-type'];
                        if (!contentType || !contentType.startsWith('image/')) {
                            throw new Error('Konten yang diunduh bukan gambar');
                        }
                        
                        // Buat buffer dari gambar
                        const buffer = Buffer.from(response.data, 'binary');
                        
                        // Validasi ukuran gambar (minimal 1KB)
                        if (buffer.length < 1024) {
                            throw new Error('Ukuran gambar terlalu kecil');
                        }
                        
                        // Coba proses dengan sharp untuk memastikan format valid
                        try {
                            await sharp(buffer).metadata();
                        } catch (sharpError) {
                            throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                        }
                        
                        return {
                            buffer: buffer,
                            mimetype: contentType || 'image/jpeg'
                        };
                    } catch (proxyError) {
                        debugLog(`Proxy gagal: ${proxyError.message}`);
                    }
                }
                
                throw new Error('Semua proxy gagal');
            },
            
            // Metode 4: Menggunakan API pihak ketiga yang lebih andal
            async () => {
                debugLog('Metode 4: API pihak ketiga yang lebih andal...');
                
                const apiList = [
                    {
                        name: 'ImgProxy',
                        url: `https://imgproxy.herokuapp.com/500x500,fit/${encodeURIComponent(url)}`,
                        handler: async (apiUrl) => {
                            const response = await axios.get(apiUrl, {
                                responseType: 'arraybuffer',
                                timeout: 20000
                            });
                            
                            // Validasi konten gambar
                            const contentType = response.headers['content-type'];
                            if (!contentType || !contentType.startsWith('image/')) {
                                throw new Error('Konten yang diunduh bukan gambar');
                            }
                            
                            // Buat buffer dari gambar
                            const buffer = Buffer.from(response.data, 'binary');
                            
                            // Validasi ukuran gambar (minimal 1KB)
                            if (buffer.length < 1024) {
                                throw new Error('Ukuran gambar terlalu kecil');
                            }
                            
                            // Coba proses dengan sharp untuk memastikan format valid
                            try {
                                await sharp(buffer).metadata();
                            } catch (sharpError) {
                                throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                            }
                            
                            return {
                                buffer: buffer,
                                mimetype: contentType || 'image/jpeg'
                            };
                        }
                    },
                    {
                        name: 'AllOrigins',
                        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                        handler: async (apiUrl) => {
                            const response = await axios.get(apiUrl, {
                                responseType: 'arraybuffer',
                                timeout: 20000
                            });
                            
                            // Validasi konten gambar
                            const contentType = response.headers['content-type'];
                            if (!contentType || !contentType.startsWith('image/')) {
                                throw new Error('Konten yang diunduh bukan gambar');
                            }
                            
                            // Buat buffer dari gambar
                            const buffer = Buffer.from(response.data, 'binary');
                            
                            // Validasi ukuran gambar (minimal 1KB)
                            if (buffer.length < 1024) {
                                throw new Error('Ukuran gambar terlalu kecil');
                            }
                            
                            // Coba proses dengan sharp untuk memastikan format valid
                            try {
                                await sharp(buffer).metadata();
                            } catch (sharpError) {
                                throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                            }
                            
                            return {
                                buffer: buffer,
                                mimetype: contentType || 'image/jpeg'
                            };
                        }
                    },
                    {
                        name: 'CodeTabs',
                        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
                        handler: async (apiUrl) => {
                            const response = await axios.get(apiUrl, {
                                responseType: 'arraybuffer',
                                timeout: 20000
                            });
                            
                            // Validasi konten gambar
                            const contentType = response.headers['content-type'];
                            if (!contentType || !contentType.startsWith('image/')) {
                                throw new Error('Konten yang diunduh bukan gambar');
                            }
                            
                            // Buat buffer dari gambar
                            const buffer = Buffer.from(response.data, 'binary');
                            
                            // Validasi ukuran gambar (minimal 1KB)
                            if (buffer.length < 1024) {
                                throw new Error('Ukuran gambar terlalu kecil');
                            }
                            
                            // Coba proses dengan sharp untuk memastikan format valid
                            try {
                                await sharp(buffer).metadata();
                            } catch (sharpError) {
                                throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                            }
                            
                            return {
                                buffer: buffer,
                                mimetype: contentType || 'image/jpeg'
                            };
                        }
                    },
                    {
                        name: 'ThingProxy',
                        url: `https://thingproxy.freeboard.io/resize/${encodeURIComponent(url)}`,
                        handler: async (apiUrl) => {
                            const response = await axios.get(apiUrl, {
                                responseType: 'arraybuffer',
                                timeout: 20000
                            });
                            
                            // Validasi konten gambar
                            const contentType = response.headers['content-type'];
                            if (!contentType || !contentType.startsWith('image/')) {
                                throw new Error('Konten yang diunduh bukan gambar');
                            }
                            
                            // Buat buffer dari gambar
                            const buffer = Buffer.from(response.data, 'binary');
                            
                            // Validasi ukuran gambar (minimal 1KB)
                            if (buffer.length < 1024) {
                                throw new Error('Ukuran gambar terlalu kecil');
                            }
                            
                            // Coba proses dengan sharp untuk memastikan format valid
                            try {
                                await sharp(buffer).metadata();
                            } catch (sharpError) {
                                throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                            }
                            
                            return {
                                buffer: buffer,
                                mimetype: contentType || 'image/jpeg'
                            };
                        }
                    },
                    {
                        name: 'ImageProxy',
                        url: `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=500&h=500`,
                        handler: async (apiUrl) => {
                            const response = await axios.get(apiUrl, {
                                responseType: 'arraybuffer',
                                timeout: 20000
                            });
                            
                            // Validasi konten gambar
                            const contentType = response.headers['content-type'];
                            if (!contentType || !contentType.startsWith('image/')) {
                                throw new Error('Konten yang diunduh bukan gambar');
                            }
                            
                            // Buat buffer dari gambar
                            const buffer = Buffer.from(response.data, 'binary');
                            
                            // Validasi ukuran gambar (minimal 1KB)
                            if (buffer.length < 1024) {
                                throw new Error('Ukuran gambar terlalu kecil');
                            }
                            
                            // Coba proses dengan sharp untuk memastikan format valid
                            try {
                                await sharp(buffer).metadata();
                            } catch (sharpError) {
                                throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                            }
                            
                            return {
                                buffer: buffer,
                                mimetype: contentType || 'image/jpeg'
                            };
                        }
                    }
                ];
                
                for (const api of apiList) {
                    try {
                        debugLog(`Mencoba API: ${api.name}`);
                        const result = await api.handler(api.url);
                        return result;
                    } catch (apiError) {
                        debugLog(`API ${api.name} gagal: ${apiError.message}`);
                    }
                }
                
                throw new Error('Semua API pihak ketiga gagal');
            },
            
            // Metode 5: Browser automation dengan Puppeteer
            async () => {
                debugLog('Metode 5: Browser automation dengan Puppeteer...');
                
                try {
                    const puppeteer = require('puppeteer');
                    
                    const browser = await puppeteer.launch({
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--disable-gpu'
                        ]
                    });
                    
                    const page = await browser.newPage();
                    
                    // Set user agent dan viewport
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    await page.setViewport({ width: 1366, height: 768 });
                    
                    // Set cookie
                    await page.setCookie({
                        name: '_auth',
                        value: '1',
                        domain: '.pinterest.com'
                    });
                    
                    // Navigasi ke URL gambar
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                    
                    // Tunggu gambar dimuat
                    await page.waitForSelector('img', { timeout: 10000 });
                    
                    // Ambil gambar sebagai buffer
                    const imageBuffer = await page.screenshot({
                        type: 'png',
                        encoding: 'binary'
                    });
                    
                    await browser.close();
                    
                    // Validasi ukuran gambar (minimal 1KB)
                    if (imageBuffer.length < 1024) {
                        throw new Error('Ukuran gambar terlalu kecil');
                    }
                    
                    return {
                        buffer: Buffer.from(imageBuffer, 'binary'),
                        mimetype: 'image/png'
                    };
                } catch (puppeteerError) {
                    debugLog(`Puppeteer gagal: ${puppeteerError.message}`);
                    throw puppeteerError;
                }
            },
            
            // Metode 6: Download langsung dengan Node.js https
            async () => {
                debugLog('Metode 6: Download langsung dengan Node.js https...');
                
                return new Promise((resolve, reject) => {
                    const urlObj = new URL(url);
                    const options = {
                        hostname: urlObj.hostname,
                        path: urlObj.pathname + urlObj.search,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Referer': 'https://www.pinterest.com/',
                            'DNT': '1',
                            'Connection': 'keep-alive'
                        }
                    };
                    
                    const req = https.request(options, (res) => {
                        let data = [];
                        
                        res.on('data', (chunk) => {
                            data.push(chunk);
                        });
                        
                        res.on('end', async () => {
                            try {
                                const buffer = Buffer.concat(data);
                                
                                // Validasi ukuran gambar (minimal 1KB)
                                if (buffer.length < 1024) {
                                    throw new Error('Ukuran gambar terlalu kecil');
                                }
                                
                                // Coba proses dengan sharp untuk memastikan format valid
                                try {
                                    await sharp(buffer).metadata();
                                } catch (sharpError) {
                                    throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                                }
                                
                                resolve({
                                    buffer: buffer,
                                    mimetype: res.headers['content-type'] || 'image/jpeg'
                                });
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                    
                    req.on('error', (error) => {
                        reject(error);
                    });
                    
                    req.setTimeout(15000, () => {
                        req.destroy();
                        reject(new Error('Request timeout'));
                    });
                    
                    req.end();
                });
            },
            
            // Metode 7: Fallback ke gambar placeholder
            async () => {
                debugLog('Metode 7: Fallback ke gambar placeholder...');
                
                try {
                    // Coba beberapa layanan placeholder
                    const placeholderServices = [
                        `https://picsum.photos/400/300?random=${Date.now()}`,
                        `https://placekitten.com/400/300`,
                        `https://via.placeholder.com/400x300.png?text=Image+Not+Available`,
                        `https://dummyimage.com/400x300/000/fff.jpg&text=Not+Available`
                    ];
                    
                    for (const service of placeholderServices) {
                        try {
                            debugLog(`Mencoba placeholder: ${service}`);
                            
                            const response = await axios.get(service, {
                                responseType: 'arraybuffer',
                                timeout: 10000
                            });
                            
                            // Validasi konten gambar
                            const contentType = response.headers['content-type'];
                            if (!contentType || !contentType.startsWith('image/')) {
                                throw new Error('Konten yang diunduh bukan gambar');
                            }
                            
                            // Buat buffer dari gambar
                            const buffer = Buffer.from(response.data, 'binary');
                            
                            // Validasi ukuran gambar (minimal 1KB)
                            if (buffer.length < 1024) {
                                throw new Error('Ukuran gambar terlalu kecil');
                            }
                            
                            // Coba proses dengan sharp untuk memastikan format valid
                            try {
                                await sharp(buffer).metadata();
                            } catch (sharpError) {
                                throw new Error(`Format gambar tidak valid: ${sharpError.message}`);
                            }
                            
                            return {
                                buffer: buffer,
                                mimetype: contentType || 'image/jpeg'
                            };
                        } catch (placeholderError) {
                            debugLog(`Placeholder gagal: ${placeholderError.message}`);
                        }
                    }
                    
                    // Jika semua placeholder gagal, buat gambar kosong
                    debugLog('Membuat gambar kosong...');
                    
                    const emptyImage = Buffer.from(
                        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hQF2LwAAAAABJRU5ErkJggg==',
                        'base64'
                    );
                    
                    return {
                        buffer: emptyImage,
                        mimetype: 'image/png'
                    };
                } catch (fallbackError) {
                    debugLog(`Fallback gagal: ${fallbackError.message}`);
                    throw fallbackError;
                }
            }
        ];
        
        // Coba setiap metode secara berurutan
        let lastError = null;
        for (let i = 0; i < methods.length; i++) {
            try {
                debugLog(`Mencoba metode ${i + 1} dari ${methods.length}...`);
                const result = await methods[i]();
                debugLog(`Berhasil mengambil gambar dengan metode ${i + 1}`);
                return result;
            } catch (error) {
                lastError = error;
                debugLog(`Metode ${i + 1} gagal: ${error.message}`);
            }
        }
        
        // Jika semua metode gagal, lempar error terakhir
        throw lastError || new Error('Semua metode pengambilan gambar gagal');
    } catch (err) {
        debugLog(`Error mengambil gambar dari URL: ${err.message}`);
        throw err;
    }
};

// Fungsi untuk mencari gambar di Pinterest (DIPERBAIKI)
const searchPinterest = async (query, limit = 5) => {
    try {
        debugLog(`Mencari gambar Pinterest dengan query: ${query}`);
        
        // Bersihkan query
        const cleanQuery = query.trim().replace(/\s+/g, ' ');
        
        // Coba beberapa metode pencarian
        
        // Metode 1: Scraping Pinterest dengan cookie
        try {
            debugLog('Mencoba scraping Pinterest dengan cookie...');
            
            const cookie = await getPinterestCookie();
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Referer': 'https://www.pinterest.com/',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Cookie': cookie
            };
            
            const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(cleanQuery)}`;
            const response = await axios.get(searchUrl, { headers });
            
            const html = response.data;
            const results = [];
            
            // Coba ekstrak data dari JSON
            const jsonMatch = html.match(/<script id="initial-state" type="application\/json">(.*?)<\/script>/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const data = JSON.parse(jsonMatch[1]);
                    
                    // Ekstrak data pin dari JSON
                    if (data && data.resourceResponses && data.resourceResponses.length > 0) {
                        for (const resource of data.resourceResponses) {
                            if (resource.response && resource.response.data && resource.response.data.results) {
                                for (const pin of resource.response.data.results) {
                                    if (results.length >= limit) break;
                                    
                                    // Ekstrak URL gambar
                                    let imageUrl = null;
                                    let pinUrl = null;
                                    let title = '';
                                    let description = '';
                                    
                                    // Dapatkan URL gambar
                                    if (pin.images && pin.images['736x'] && pin.images['736x'].url) {
                                        imageUrl = pin.images['736x'].url;
                                    } else if (pin.image && pin.image.url) {
                                        imageUrl = pin.image.url;
                                    }
                                    
                                    // Dapatkan URL pin Pinterest
                                    if (pin.id) {
                                        pinUrl = `https://www.pinterest.com/pin/${pin.id}/`;
                                    }
                                    
                                    // Ekstrak judul dan deskripsi
                                    if (pin.title) {
                                        title = pin.title;
                                    } else if (pin.grid_title) {
                                        title = pin.grid_title;
                                    }
                                    
                                    if (pin.description) {
                                        description = pin.description;
                                    }
                                    
                                    if (imageUrl && pinUrl) {
                                        const result = {
                                            url: pinUrl,  // URL Pinterest yang sebenarnya
                                            imageUrl: imageUrl,  // URL gambar langsung
                                            title: title || 'Pinterest Image',
                                            description: description || '',
                                            id: pin.id || Math.random().toString(36).substring(2, 15)
                                        };
                                        results.push(result);
                                        
                                        // Simpan URL ke cache
                                        pinterestCache.set(result.id, imageUrl);
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    debugLog(`Error parsing Pinterest JSON: ${e.message}`);
                }
            }
            
            // Jika JSON gagal, coba dengan regex yang lebih baik
            if (results.length === 0) {
                debugLog('Mencoba metode regex untuk pencarian Pinterest...');
                
                // Cari URL gambar dengan regex yang lebih akurat
                const imageMatches = html.match(/https:\/\/i\.pinimg\.com\/[^"'\s\)\}]+/g);
                
                // Cari ID pin dan URL pin
                const pinMatches = html.match(/\/pin\/(\d+)\//g);
                
                if (imageMatches && pinMatches) {
                    // Hapus duplikat dan batasi hasil
                    const uniqueImages = [...new Set(imageMatches)];
                    const uniquePins = [...new Set(pinMatches)];
                    
                    for (let i = 0; i < Math.min(uniqueImages.length, uniquePins.length, limit); i++) {
                        const imageUrl = uniqueImages[i];
                        const pinId = uniquePins[i].match(/\/pin\/(\d+)\//)[1];
                        const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
                        
                        // Validasi URL gambar
                        if (imageUrl.includes('736x') || imageUrl.includes('originals')) {
                            // Pastikan URL berakhir dengan ekstensi gambar yang valid
                            if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
                                const result = {
                                    url: pinUrl,  // URL Pinterest yang sebenarnya
                                    imageUrl: imageUrl,  // URL gambar langsung
                                    title: `Pinterest Image ${i + 1}`,
                                    description: '',
                                    id: pinId
                                };
                                results.push(result);
                                
                                // Simpan URL ke cache
                                pinterestCache.set(result.id, imageUrl);
                            }
                        }
                    }
                }
            }
            
            if (results.length > 0) {
                debugLog(`Ditemukan ${results.length} hasil dari scraping Pinterest`);
                return results;
            }
        } catch (scrapingError) {
            debugLog(`Error dengan scraping Pinterest: ${scrapingError.message}`);
        }
        
        // Metode 2: Coba dengan query yang lebih spesifik untuk karakter game
        try {
            debugLog('Mencoba dengan query yang lebih spesifik...');
            
            // Untuk karakter game seperti Furina, coba query yang lebih spesifik
            const specificQueries = [
                "Furina Genshin Impact fanart",
                "Furina Genshin Impact artwork",
                "Furina Genshin Impact official art",
                "Furina Genshin Impact wallpaper",
                "Furina Genshin Impact cosplay"
            ];
            
            for (const specificQuery of specificQueries) {
                try {
                    debugLog(`Mencoba query spesifik: ${specificQuery}`);
                    
                    const cookie = await getPinterestCookie();
                    
                    const headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'max-age=0',
                        'Referer': 'https://www.pinterest.com/',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'same-origin',
                        'Sec-Fetch-User': '?1',
                        'Cookie': cookie
                    };
                    
                    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(specificQuery)}`;
                    const response = await axios.get(searchUrl, { headers });
                    
                    const html = response.data;
                    const specificResults = [];
                    
                    // Cari URL gambar dengan regex
                    const imageMatches = html.match(/https:\/\/i\.pinimg\.com\/[^"'\s\)\}]+/g);
                    
                    // Cari ID pin dan URL pin
                    const pinMatches = html.match(/\/pin\/(\d+)\//g);
                    
                    if (imageMatches && pinMatches) {
                        // Hapus duplikat dan batasi hasil
                        const uniqueImages = [...new Set(imageMatches)];
                        const uniquePins = [...new Set(pinMatches)];
                        
                        for (let i = 0; i < Math.min(uniqueImages.length, uniquePins.length, limit); i++) {
                            const imageUrl = uniqueImages[i];
                            const pinId = uniquePins[i].match(/\/pin\/(\d+)\//)[1];
                            const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
                            
                            // Validasi URL gambar
                            if (imageUrl.includes('736x') || imageUrl.includes('originals')) {
                                // Pastikan URL berakhir dengan ekstensi gambar yang valid
                                if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
                                    const result = {
                                        url: pinUrl,  // URL Pinterest yang sebenarnya
                                        imageUrl: imageUrl,  // URL gambar langsung
                                        title: `Furina Genshin Impact ${i + 1}`,
                                        description: `Furina from Genshin Impact`,
                                        id: pinId
                                    };
                                    specificResults.push(result);
                                    
                                    // Simpan URL ke cache
                                    pinterestCache.set(result.id, imageUrl);
                                }
                            }
                        }
                    }
                    
                    if (specificResults.length > 0) {
                        debugLog(`Ditemukan ${specificResults.length} hasil dari query spesifik: ${specificQuery}`);
                        return specificResults;
                    }
                } catch (specificError) {
                    debugLog(`Error dengan query spesifik ${specificQuery}: ${specificError.message}`);
                }
            }
        } catch (specificError) {
            debugLog(`Error dengan query spesifik: ${specificError.message}`);
        }
        
        // Metode 3: Gunakan data Furina yang sudah ada jika query mengandung "furina"
        if (cleanQuery.toLowerCase().includes('furina')) {
            try {
                debugLog('Menggunakan data Furina yang sudah ada...');
                
                // Baca data Furina dari file
                const furinaImages = JSON.parse(fs.readFileSync(furinaProfilePath, 'utf-8'));
                
                if (Array.isArray(furinaImages) && furinaImages.length > 0) {
                    // Acak urutan gambar
                    const shuffledImages = [...furinaImages].sort(() => 0.5 - Math.random());
                    
                    // Ambil sejumlah gambar sesuai limit
                    const selectedImages = shuffledImages.slice(0, Math.min(limit, furinaImages.length));
                    
                    const results = selectedImages.map((imageUrl, index) => ({
                        url: `https://www.pinterest.com/pin/furina-${index + 1}/`,
                        imageUrl: imageUrl,
                        title: `Furina Genshin Impact ${index + 1}`,
                        description: `Furina from Genshin Impact`,
                        id: `furina-${index + 1}`
                    }));
                    
                    debugLog(`Mengembalikan ${results.length} gambar Furina dari data lokal`);
                    return results;
                }
            } catch (furinaError) {
                debugLog(`Error menggunakan data Furina: ${furinaError.message}`);
            }
        }
        
        // Metode 4: Fallback ke sumber gambar gratis
        try {
            debugLog('Mencoba fallback ke sumber gambar gratis...');
            
            // Coba Unsplash tanpa API key
            try {
                const response = await axios.get(`https://source.unsplash.com/featured/?${encodeURIComponent(cleanQuery)}`, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                
                if (response.data) {
                    const result = {
                        url: `https://source.unsplash.com/featured/?${encodeURIComponent(cleanQuery)}`,
                        imageUrl: `https://source.unsplash.com/featured/?${encodeURIComponent(cleanQuery)}`,
                        title: `Image for "${cleanQuery}"`,
                        description: `Image from Unsplash`,
                        id: `unsplash-${Date.now()}`
                    };
                    
                    // Simpan URL ke cache
                    pinterestCache.set(result.id, result.imageUrl);
                    
                    debugLog(`Mengembalikan hasil dari Unsplash`);
                    return [result];
                }
            } catch (unsplashError) {
                debugLog(`Error dengan Unsplash: ${unsplashError.message}`);
            }
            
            // Coba Lorem Picsum
            try {
                const imageUrl = `https://picsum.photos/400/600?random=${Date.now()}`;
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                
                if (response.data) {
                    const result = {
                        url: imageUrl,
                        imageUrl: imageUrl,
                        title: `Image for "${cleanQuery}"`,
                        description: `Random image`,
                        id: `picsum-${Date.now()}`
                    };
                    
                    // Simpan URL ke cache
                    pinterestCache.set(result.id, result.imageUrl);
                    
                    debugLog(`Mengembalikan hasil dari Lorem Picsum`);
                    return [result];
                }
            } catch (picsumError) {
                debugLog(`Error dengan Lorem Picsum: ${picsumError.message}`);
            }
        } catch (fallbackError) {
            debugLog(`Error dengan fallback: ${fallbackError.message}`);
        }
        
        throw new Error('Tidak dapat menemukan hasil pencarian dengan metode apa pun');
    } catch (error) {
        debugLog(`Error pencarian Pinterest: ${error.message}`);
        throw error;
    }
};

// Fungsi untuk mengirim hasil pencarian Pinterest
const sendPinterestResults = async (sock, from, results, query) => {
    try {
        // Buat teks hasil pencarian
        let resultText = `🔍 *Hasil Pencarian Pinterest untuk: "${query}"*\n\n`;
        
        results.forEach((result, index) => {
            resultText += `${index + 1}. ${result.title}\n`;
            // Tampilkan URL Pinterest yang sebenarnya, bukan ID
            resultText += `   URL: ${result.url}\n`;
            if (result.description) {
                resultText += `   Deskripsi: ${result.description.substring(0, 50)}...\n`;
            }
            resultText += '\n';
        });
        
        resultText += `💡 *Ketik .pindl <URL> untuk mengunduh gambar*`;
        
        // Kirim pesan hasil
        await sock.sendMessage(from, { text: resultText });
        
        // Kirim beberapa gambar pertama sebagai preview
        const previewLimit = Math.min(2, results.length);
        let successCount = 0;
        
        for (let i = 0; i < previewLimit; i++) {
            try {
                debugLog(`Mencoba mengirim preview gambar ${i + 1}...`);
                
                // Coba dapatkan gambar dengan beberapa metode
                let imageData = null;
                let imageError = null;
                
                // Metode 1: Coba langsung dari URL
                try {
                    imageData = await getImageBuffer(results[i].imageUrl);
                    debugLog(`Berhasil mendapatkan gambar ${i + 1} dengan metode 1`);
                } catch (error) {
                    imageError = error;
                    debugLog(`Error metode 1 untuk gambar ${i + 1}: ${error.message}`);
                }
                
                // Jika berhasil mendapatkan gambar, kirim
                if (imageData) {
                    await sock.sendMessage(from, {
                        image: imageData.buffer,
                        caption: `${results[i].title}`
                    });
                    
                    successCount++;
                    debugLog(`Berhasil mengirim preview gambar ${i + 1}`);
                } else {
                    // Kirim pesan teks jika gambar tidak tersedia
                    await sock.sendMessage(from, { 
                        text: `❌ Gambar untuk "${results[i].title}" tidak tersedia. Error: ${imageError?.message || 'Unknown error'}` 
                    });
                    
                    debugLog(`Gagal mengirim preview gambar ${i + 1}: ${imageError?.message || 'Unknown error'}`);
                }
            } catch (imgError) {
                debugLog(`Error mengirim preview gambar ${i + 1}: ${imgError.message}`);
                
                // Kirim pesan error
                await sock.sendMessage(from, { 
                    text: `❌ Error mengirim gambar: ${imgError.message}` 
                });
            }
        }
        
        debugLog(`Berhasil mengirim ${successCount} dari ${previewLimit} preview gambar`);
        
        // Kirim pesan informasi jika tidak ada gambar yang berhasil dikirim
        if (successCount === 0) {
            await sock.sendMessage(from, { 
                text: `⚠️ Tidak ada gambar yang dapat dikirim. Pinterest mungkin memblokir akses. Silakan coba lagi nanti atau gunakan perintah .pindl <URL> untuk mengunduh gambar secara langsung.` 
            });
        }
        
    } catch (error) {
        debugLog(`Error mengirim hasil pencarian Pinterest: ${error.message}`);
        
        // Kirim pesan error
        await sock.sendMessage(from, { 
            text: `❌ Error mengirim hasil pencarian: ${error.message}` 
        });
        
        throw error;
    }
};

// Fungsi untuk mencari gambar di Rule34
const searchRule34 = async (query, limit = 5) => {
    try {
        debugLog(`Mencari gambar Rule34 dengan query: ${query}`);
        
        // Bersihkan query
        const cleanQuery = query.trim().replace(/\s+/g, ' ');
        
        // API Rule34
        const apiUrl = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=${limit}&tags=${encodeURIComponent(cleanQuery)}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });
        
        if (!response.data || response.data.length === 0) {
            return [];
        }
        
        // Format hasil
        const results = response.data.map(post => ({
            id: post.id,
            file_url: post.file_url,
            sample_url: post.sample_url,
            preview_url: post.preview_url,
            rating: post.rating,
            width: post.width,
            height: post.height,
            tags: post.tags.split(' ')
        }));
        
        debugLog(`Ditemukan ${results.length} hasil dari Rule34`);
        return results;
    } catch (error) {
        debugLog(`Error pencarian Rule34: ${error.message}`);
        return [];
    }
};

// Fungsi untuk mengirim hasil pencarian Rule34
const sendRule34Results = async (sock, from, results, query) => {
    try {
        // Batasi jumlah hasil yang dikirim
        const sendLimit = Math.min(3, results.length);
        
        for (let i = 0; i < sendLimit; i++) {
            try {
                const result = results[i];
                
                // Kirim gambar
                await sock.sendMessage(from, {
                    image: { url: result.sample_url },
                    caption: `🔞 *Rule34 Result*\nID: ${result.id}\nRating: ${result.rating.toUpperCase()}\nTags: ${result.tags.slice(0, 10).join(', ')}${result.tags.length > 10 ? '...' : ''}\n\nKetik .r34dl ${result.id} untuk mengunduh gambar asli`
                });
                
                // Jeda untuk menghindari spam
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (imgError) {
                debugLog(`Error mengirim gambar Rule34: ${imgError.message}`);
            }
        }
        
        // Kirim pesan informasi
        await sock.sendMessage(from, { 
            text: `💡 *Ketik .r34dl <ID> untuk mengunduh gambar asli*\nContoh: .r34dl ${results[0].id}`
        });
        
    } catch (error) {
        debugLog(`Error mengirim hasil Rule34: ${error.message}`);
        throw error;
    }
};

// Fungsi untuk mengunduh gambar Rule34 berdasarkan ID
const getRule34Image = async (id) => {
    try {
        debugLog(`Mengunduh gambar Rule34 dengan ID: ${id}`);
        
        // Dapatkan info post
        const apiUrl = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&id=${id}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error('Gambar tidak ditemukan');
        }
        
        const post = response.data[0];
        
        // Unduh gambar
        const imageResponse = await axios.get(post.file_url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://rule34.xxx/'
            },
            timeout: 30000
        });
        
        // Simpan gambar ke file temporary
        const timestamp = Date.now();
        const extension = post.file_url.split('.').pop().split('?')[0];
        const outputPath = path.join(downloadDir, `rule34-${id}-${timestamp}.${extension}`);
        
        await fs.writeFile(outputPath, imageResponse.data);
        
        debugLog(`Gambar Rule34 berhasil disimpan ke: ${outputPath}`);
        
        return {
            path: outputPath,
            width: post.width,
            height: post.height,
            format: extension,
            rating: post.rating,
            tags: post.tags.split(' ')
        };
    } catch (error) {
        debugLog(`Error mengunduh gambar Rule34: ${error.message}`);
        throw error;
    }
};

// Fungsi untuk mengambil gambar dari Pixiv (diperbaiki dengan API alternatif)
const getPixivImage = async (id) => {
    try {
        debugLog(`Mengambil gambar dari Pixiv ID: ${id}`);
        
        // Validasi ID harus numerik
        if (!/^\d+$/.test(id)) {
            throw new Error('ID Pixiv harus berupa angka');
        }
        
        // Coba beberapa API Pixiv alternatif terlebih dahulu
        const apiUrls = [
            `https://api.lolicon.app/setu/v2?pid=${id}`,
            `https://api.waifu.im/search/?included_tags=nsfw&pixiv_id=${id}`,
            `https://api.nekos.best/v2/waifu?pixiv_id=${id}`,
            `https://danbooru.donmai.us/posts.json?tags=pixiv_id:${id}&limit=1`
        ];
        
        for (const apiUrl of apiUrls) {
            try {
                debugLog(`Mencoba API: ${apiUrl}`);
                const apiResponse = await axios.get(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 10000
                });
                
                let imageUrl = null;
                
                // Handle response dari berbagai API
                if (apiUrl.includes('lolicon.app')) {
                    if (apiResponse.data && apiResponse.data.data && apiResponse.data.data.length > 0) {
                        imageUrl = apiResponse.data.data[0].urls.original;
                        debugLog(`URL ditemukan dari lolicon API: ${imageUrl}`);
                    }
                } else if (apiUrl.includes('waifu.im')) {
                    if (apiResponse.data && apiResponse.data.images && apiResponse.data.images.length > 0) {
                        imageUrl = apiResponse.data.images[0].url;
                        debugLog(`URL ditemukan dari waifu.im API: ${imageUrl}`);
                    }
                } else if (apiUrl.includes('nekos.best')) {
                    if (apiResponse.data && apiResponse.data.results && apiResponse.data.results.length > 0) {
                        imageUrl = apiResponse.data.results[0].url;
                        debugLog(`URL ditemukan dari nekos.best API: ${imageUrl}`);
                    }
                } else if (apiUrl.includes('danbooru.donmai.us')) {
                    if (apiResponse.data && apiResponse.data.length > 0 && apiResponse.data[0].large_file_url) {
                        imageUrl = apiResponse.data[0].large_file_url;
                        debugLog(`URL ditemukan dari Danbooru API: ${imageUrl}`);
                    }
                }
                
                if (imageUrl) {
                    // Unduh gambar dari URL yang ditemukan
                    debugLog(`Mengunduh gambar dari: ${imageUrl}`);
                    const imageResponse = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': `https://www.pixiv.net/en/artworks/${id}`
                        },
                        timeout: 15000
                    });
                    
                    // Validasi konten gambar
                    const contentType = imageResponse.headers['content-type'];
                    if (!contentType || !contentType.startsWith('image/')) {
                        throw new Error('Konten yang diunduh bukan gambar');
                    }
                    
                    // Buat buffer dari gambar
                    const buffer = Buffer.from(imageResponse.data, 'binary');
                    
                    // Validasi ukuran gambar (minimal 1KB)
                    if (buffer.length < 1024) {
                        throw new Error('Ukuran gambar terlalu kecil');
                    }
                    
                    // Dapatkan metadata gambar
                    const metadata = await sharp(buffer).metadata();
                    debugLog(`Metadata gambar: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
                    
                    // Simpan gambar ke file temporary
                    const timestamp = Date.now();
                    const outputPath = path.join(downloadDir, `pixiv-${id}-${timestamp}.${metadata.format || 'jpg'}`);
                    
                    await fs.writeFile(outputPath, buffer);
                    
                    debugLog(`Gambar Pixiv berhasil disimpan ke: ${outputPath}`);
                    
                    return {
                        path: outputPath,
                        width: metadata.width,
                        height: metadata.height,
                        format: metadata.format || 'jpg',
                        pageCount: 1
                    };
                }
            } catch (apiError) {
                debugLog(`Error dengan API ${apiUrl}: ${apiError.message}`);
                // Lanjut ke API berikutnya
            }
        }
        
        // Jika semua API gagal, coba metode scraping tradisional
        debugLog('Semua API gagal, mencoba metode scraping...');
        
        // Ambil halaman artwork Pixiv dengan headers yang lebih lengkap
        const response = await axios.get(`https://www.pixiv.net/en/artworks/${id}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': `https://www.pixiv.net/en/artworks/${id}`,
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            },
            timeout: 15000
        });
        
        const html = response.data;
        
        // Cek apakah artwork memiliki multiple pages
        let pageCount = 1;
        const pageMatch = html.match(/"pageCount":(\d+)/);
        if (pageMatch && pageMatch[1]) {
            pageCount = parseInt(pageMatch[1]);
            debugLog(`Artwork memiliki ${pageCount} halaman`);
        }
        
        let imageUrl = null;
        
        // Metode 1: Cari di preload-data (prioritas tertinggi)
        let match = html.match(/<meta name="preload-data" id="meta-preload-data" content='([^']+)'/);
        if (match && match[1]) {
            try {
                const data = JSON.parse(decodeURIComponent(match[1]));
                const artworkData = Object.values(data)[0];
                
                if (artworkData && artworkData.urls && artworkData.urls.original) {
                    imageUrl = artworkData.urls.original;
                    debugLog(`URL gambar ditemukan (preload-data): ${imageUrl}`);
                }
            } catch (e) {
                debugLog(`Error parsing preload-data: ${e.message}`);
            }
        }
        
        // Metode 2: Cari di tag script dengan data JSON
        if (!imageUrl) {
            match = html.match(/<script id="meta-preload-data" type="application\/json">([^<]+)<\/script>/);
            if (match && match[1]) {
                try {
                    const data = JSON.parse(match[1]);
                    const artworkData = Object.values(data)[0];
                    
                    if (artworkData && artworkData.urls && artworkData.urls.original) {
                        imageUrl = artworkData.urls.original;
                        debugLog(`URL gambar ditemukan (script JSON): ${imageUrl}`);
                    }
                } catch (e) {
                    debugLog(`Error parsing script JSON: ${e.message}`);
                }
            }
        }
        
        // Metode 3: Cari URL original di HTML dengan regex yang lebih agresif
        if (!imageUrl) {
            match = html.match(/https:\/\/i\.pximg\.net\/img-original\/img\/[^"'\s]+/);
            if (match && match[0]) {
                imageUrl = match[0];
                debugLog(`URL gambar ditemukan (aggressive search): ${match[0]}`);
            }
        }
        
        // Metode 4: Cari URL gambar master sebagai fallback
        if (!imageUrl) {
            match = html.match(/https:\/\/i\.pximg\.net\/img-master\/img\/[^"'\s]+/);
            if (match && match[0]) {
                // Konversi dari img-master ke img-original untuk kualitas terbaik
                imageUrl = match[0].replace('/img-master/', '/img-original/');
                debugLog(`URL gambar ditemukan (master): ${imageUrl}`);
            }
        }
        
        if (!imageUrl) {
            throw new Error('Tidak dapat menemukan URL gambar di halaman Pixiv');
        }
        
        // Validasi URL
        if (!imageUrl.includes('i.pximg.net')) {
            throw new Error('URL gambar tidak valid');
        }
        
        debugLog(`Mengunduh gambar dari: ${imageUrl}`);
        
        // Unduh gambar dengan header yang tepat
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `https://www.pixiv.net/en/artworks/${id}`,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 15000
        });
        
        // Validasi konten gambar
        const contentType = imageResponse.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('Konten yang diunduh bukan gambar');
        }
        
        // Buat buffer dari gambar
        const buffer = Buffer.from(imageResponse.data, 'binary');
        
        // Validasi ukuran gambar (minimal 1KB)
        if (buffer.length < 1024) {
            throw new Error('Ukuran gambar terlalu kecil');
        }
        
        // Dapatkan metadata gambar
        const metadata = await sharp(buffer).metadata();
        debugLog(`Metadata gambar: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
        
        // Simpan gambar ke file temporary
        const timestamp = Date.now();
        const outputPath = path.join(downloadDir, `pixiv-${id}-${timestamp}.${metadata.format || 'jpg'}`);
        
        await fs.writeFile(outputPath, buffer);
        
        debugLog(`Gambar Pixiv berhasil disimpan ke: ${outputPath}`);
        
        return {
            path: outputPath,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format || 'jpg',
            pageCount: pageCount
        };
    } catch (error) {
        debugLog(`Error mengambil gambar Pixiv: ${error.message}`);
        throw error;
    }
};

// Tambahkan fungsi pencarian Pixiv
const searchPixiv = async (query, limit = 5) => {
    try {
        debugLog(`Mencari artwork Pixiv dengan query: ${query}`);
        
        // Bersihkan query
        const cleanQuery = query.trim().replace(/\s+/g, ' ');
        
        // Coba beberapa API untuk pencarian
        const searchApis = [
            {
                url: `https://api.lolicon.app/setu/v2?keyword=${encodeURIComponent(cleanQuery)}&r18=0&num=${limit}`,
                handler: (data) => {
                    if (data && data.data && data.data.length > 0) {
                        return data.data.map(item => ({
                            id: item.pid,
                            title: item.title || `Artwork ${item.pid}`,
                            url: item.urls.original,
                            author: item.author || 'Unknown'
                        }));
                    }
                    return null;
                }
            },
            {
                url: `https://api.waifu.im/search/?is_sfw=true&limit=${limit}&included_tags=${encodeURIComponent(cleanQuery)}`,
                handler: (data) => {
                    if (data && data.images && data.images.length > 0) {
                        return data.images.map(item => ({
                            id: item.pixiv_id || Math.floor(Math.random() * 10000000),
                            title: item.caption || `Artwork ${item.pixiv_id}`,
                            url: item.url,
                            author: item.artist_name || 'Unknown'
                        }));
                    }
                    return null;
                }
            },
            {
                url: `https://nekos.best/api/v2/search?query=${encodeURIComponent(cleanQuery)}&amount=${limit}`,
                handler: (data) => {
                    if (data && data.results && data.results.length > 0) {
                        return data.results.map(item => ({
                            id: item.id || Math.floor(Math.random() * 10000000),
                            title: item.title || `Artwork ${item.id}`,
                            url: item.url,
                            author: item.artist_name || 'Unknown'
                        }));
                    }
                    return null;
                }
            }
        ];
        
        // Coba API dengan query lengkap
        for (const api of searchApis) {
            try {
                debugLog(`Mencoba API pencarian: ${api.url}`);
                const response = await axios.get(api.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 10000
                });
                
                const results = api.handler(response.data);
                if (results && results.length > 0) {
                    debugLog(`Ditemukan ${results.length} hasil dari API`);
                    return results.slice(0, limit);
                }
            } catch (error) {
                debugLog(`Error dengan API pencarian: ${error.message}`);
            }
        }
        
        // Jika query lengkap gagal, coba dengan kata kunci utama saja
        debugLog('Mencoba dengan kata kunci utama...');
        const keywords = cleanQuery.split(' ').filter(word => word.length > 2);
        
        if (keywords.length > 1) {
            // Coba dengan kata kunci pertama
            const mainKeyword = keywords[0];
            debugLog(`Mencoba dengan kata kunci utama: ${mainKeyword}`);
            
            for (const api of searchApis) {
                try {
                    const simplifiedUrl = api.url.replace(encodeURIComponent(cleanQuery), encodeURIComponent(mainKeyword));
                    debugLog(`Mencoba API pencarian dengan kata kunci utama: ${simplifiedUrl}`);
                    
                    const response = await axios.get(simplifiedUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 10000
                    });
                    
                    const results = api.handler(response.data);
                    if (results && results.length > 0) {
                        debugLog(`Ditemukan ${results.length} hasil dengan kata kunci utama`);
                        return results.slice(0, limit);
                    }
                } catch (error) {
                    debugLog(`Error dengan API pencarian kata kunci utama: ${error.message}`);
                }
            }
        }
        
        // Jika semua API gagal, coba scraping langsung (fallback)
        debugLog('Mencoba metode scraping langsung...');
        
        try {
            // Coba dengan query lengkap
            let searchUrl = `https://www.pixiv.net/en/tags/${encodeURIComponent(cleanQuery)}/artworks`;
            let response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': `https://www.pixiv.net/`,
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            });
            
            let html = response.data;
            
            // Cari artwork IDs di HTML
            let idMatches = html.match(/"illustId":"(\d+)"/g);
            if (!idMatches || idMatches.length === 0) {
                // Coba dengan kata kunci pertama
                const mainKeyword = keywords[0];
                searchUrl = `https://www.pixiv.net/en/tags/${encodeURIComponent(mainKeyword)}/artworks`;
                response = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Referer': `https://www.pixiv.net/`,
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    timeout: 15000
                });
                
                html = response.data;
                idMatches = html.match(/"illustId":"(\d+)"/g);
            }
            
            if (idMatches && idMatches.length > 0) {
                const ids = [...new Set(idMatches.map(match => match.match(/"illustId":"(\d+)"/)[1]))].slice(0, limit);
                debugLog(`Ditemukan ${ids.length} ID dari scraping`);
                
                return ids.map(id => ({
                    id: id,
                    title: `Artwork ${id}`,
                    url: null,
                    author: 'Unknown'
                }));
            }
        } catch (scrapeError) {
            debugLog(`Error scraping: ${scrapeError.message}`);
        }
        
        // Fallback terakhir: cari gambar acak terkait
        debugLog('Mencoba fallback dengan gambar acak...');
        
        try {
            const randomApis = [
                `https://api.waifu.im/search/?is_sfw=true&limit=${limit}&included_tags=anime`,
                `https://nekos.best/api/v2/search?query=anime&amount=${limit}`
            ];
            
            for (const apiUrl of randomApis) {
                try {
                    debugLog(`Mencoba API acak: ${apiUrl}`);
                    const response = await axios.get(apiUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 10000
                    });
                    
                    let results = null;
                    if (apiUrl.includes('waifu.im')) {
                        if (response.data && response.data.images && response.data.images.length > 0) {
                            results = response.data.images.map(item => ({
                                id: item.pixiv_id || Math.floor(Math.random() * 10000000),
                                title: item.caption || `Artwork ${item.pixiv_id}`,
                                url: item.url,
                                author: item.artist_name || 'Unknown'
                            }));
                        }
                    } else if (apiUrl.includes('nekos.best')) {
                        if (response.data && response.data.results && response.data.results.length > 0) {
                            results = response.data.results.map(item => ({
                                id: item.id || Math.floor(Math.random() * 10000000),
                                title: item.title || `Artwork ${item.id}`,
                                url: item.url,
                                author: item.artist_name || 'Unknown'
                            }));
                        }
                    }
                    
                    if (results && results.length > 0) {
                        debugLog(`Ditemukan ${results.length} hasil dari API acak`);
                        return results.slice(0, limit);
                    }
                } catch (error) {
                    debugLog(`Error dengan API acak: ${error.message}`);
                }
            }
        } catch (randomError) {
            debugLog(`Error dengan fallback acak: ${randomError.message}`);
        }
        
        throw new Error('Tidak dapat menemukan hasil pencarian');
    } catch (error) {
        debugLog(`Error pencarian Pixiv: ${error.message}`);
        throw error;
    }
};

// Fungsi untuk mengirim hasil pencarian dengan tombol interaktif
const sendSearchResults = async (sock, from, results, query) => {
    try {
        // Buat teks hasil pencarian
        let resultText = `🔍 *Hasil Pencarian Pixiv untuk: "${query}"*\n\n`;
        
        results.forEach((result, index) => {
            resultText += `${index + 1}. ${result.title}\n`;
            resultText += `   ID: ${result.id}\n`;
            resultText += `   Author: ${result.author}\n\n`;
        });
        
        resultText += `💡 *Ketik .pixiv <ID> untuk mengunduh artwork*`;
        
        // Kirim pesan hasil
        await sock.sendMessage(from, { text: resultText });
        
        // Jika ada URL gambar preview, kirim beberapa gambar pertama
        const previewLimit = Math.min(2, results.length);
        for (let i = 0; i < previewLimit; i++) {
            if (results[i].url) {
                try {
                    await sock.sendMessage(from, {
                        image: { url: results[i].url },
                        caption: `${results[i].title} (ID: ${results[i].id})`
                    });
                } catch (imgError) {
                    debugLog(`Error mengirim preview gambar: ${imgError.message}`);
                }
            }
        }
        
    } catch (error) {
        debugLog(`Error mengirim hasil pencarian: ${error.message}`);
        throw error;
    }
};

// Tambahkan flag untuk mencegah multiple instance
let isRunning = false;
let sock = null;

// Fungsi untuk membersihkan session yang bermasalah
async function cleanSession() {
    try {
        debugLog('Membersihkan session yang mungkin bermasalah...');
        const sessionFiles = await fs.readdir('session');
        for (const file of sessionFiles) {
            if (file.endsWith('.json') || file.endsWith('.dat')) {
                try {
                    await fs.remove(path.join('session', file));
                    debugLog(`File ${file} berhasil dihapus`);
                } catch (e) {
                    debugLog(`Gagal menghapus ${file}: ${e.message}`);
                }
            }
        }
    } catch (err) {
        debugLog(`Error saat membersihkan session: ${err.message}`);
    }
}

// Fungsi untuk merestart bot jika terjadi error fatal
const restartBot = async () => {
    debugLog('Merestart bot...');
    isRunning = false;
    
    if (sock) {
        try {
            sock.ev.removeAllListeners();
            sock.ws.close();
        } catch (err) {
            debugLog(`Error menutup socket: ${err.message}`);
        }
    }
    
    // Tunggu sebentar sebelum memulai ulang
    setTimeout(() => {
        startBot().catch(err => {
            debugLog(`Fatal error saat restart: ${err.message}`);
            console.error(err.stack);
        });
    }, 5000);
};

async function startBot() {
    // Cegah multiple instance
    if (isRunning) {
        debugLog('Bot sudah berjalan, tidak dapat menjalankan instance baru...');
        return;
    }
    isRunning = true;
    
    try {
        debugLog('Memulai Rezium-V2 bot...');
        
        // Cek koneksi internet
        const isConnected = await checkInternetConnection();
        if (!isConnected) {
            debugLog('Tidak ada koneksi internet, menunggu 10 detik...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            return restartBot();
        }
        
        // Cek dan bersihkan session jika perlu
        if (fs.existsSync('session')) {
            const sessionFiles = await fs.readdir('session');
            if (sessionFiles.length === 0) {
                debugLog('Folder session ada tapi kosong, membuat ulang...');
                await fs.ensureDir('session');
            }
        } else {
            debugLog('Membuat folder session...');
            await fs.ensureDir('session');
        }
        
        const { state, saveCreds } = await useMultiFileAuthState('session');
        
        // Hapus opsi printQRInTerminal yang sudah deprecated
        sock = makeWASocket({
            logger,
            auth: state,
            browser: ['Rezium-V2', 'Chrome', '3.0'],
            markOnlineOnConnect: false,
            syncFullHistory: false
        });
        
        // Handler untuk koneksi update
        sock.ev.on('connection.update', async (update) => {
            try {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    debugLog('QR code diterima, silakan scan dengan WhatsApp:');
                    qrcode.generate(qr, { small: true });
                }
                
                if (connection === 'close') {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    debugLog(`Koneksi terputus. Alasan: ${reason}`);
                    
                    if (reason === DisconnectReason.loggedOut) {
                        debugLog('Device logged out, menghapus session dan mencoba ulang...');
                        await cleanSession();
                        return restartBot();
                    } else {
                        debugLog('Mencoba koneksi ulang dalam 5 detik...');
                        return restartBot();
                    }
                } else if (connection === 'open') {
                    debugLog('Rezium-V2 Terhubung!');
                    
                    // Tampilkan informasi tunnel jika tersedia
                    if (tunnelUrl) {
                        debugLog(`Bot dapat diakses melalui tunnel: ${tunnelUrl}`);
                        await sock.sendMessage(sock.user.id, { 
                            text: `🌐 Bot dapat diakses melalui tunnel: ${tunnelUrl}` 
                        });
                    }
                }
            } catch (err) {
                debugLog(`Error dalam connection.update handler: ${err.message}`);
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg.message || msg.key.fromMe) return;
                
                const from = msg.key.remoteJid;
                const type = Object.keys(msg.message)[0];
                
                // Ambil teks pesan
                let body = '';
                if (type === 'conversation') {
                    body = msg.message.conversation;
                } else if (type === 'extendedTextMessage') {
                    body = msg.message.extendedTextMessage.text;
                } else if (type === 'imageMessage') {
                    body = msg.message.imageMessage.caption || '';
                }
                
                // Logging untuk debugging
                debugLog(`Pesan diterima: ${body}`);
                
                // Respon otomatis
                if (body.toLowerCase().startsWith('.menu')) {
                    const menu = `
*REZIUM-V2 BOT*
━━━━━━━━━━━━━━━━
📌 *Perintah Tersedia:*
• .menu - Menu ini
• .ping - Cek koneksi
• .owner - Kontak owner bot
• .jadiowner <kode> - Daftar menjadi owner bot
• .daftarowner - Lihat daftar owner bot
• .hapusowner <nomor> - Hapus owner (hanya owner)
• .jadipremium <kode> - Daftar menjadi user premium
• .addpremium <kode> - Tambah user premium (hanya owner utama)
• .delpremium <nomor> - Hapus user premium (hanya owner utama)
• .listpremium - Lihat daftar user premium (hanya owner utama)
• .stiker - Buat stiker (kirim gambar dengan caption .stiker atau balas gambar dengan .stiker)
• .smeme <teks_atas>|<teks_bawah> - Buat meme (kirim gambar dengan caption .smeme atau balas gambar dengan .smeme)
• .ppcouple - Gambar profil pasangan (pria & wanita)
• .furina - Gambar acak Furina (Genshin Impact)
• .pixiv <id/url> - Unduh gambar dari Pixiv (ID atau URL)
• .pixivsearch <query> - Cari artwork di Pixiv
• .pinsearch <query> - Cari gambar di Pinterest
• .pindl <url> - Unduh gambar dari Pinterest
• .pindlid <id> - Unduh gambar Pinterest berdasarkan ID
• .rule34 <query> - Cari gambar Rule34 (hanya premium)
• .r34dl <id> - Unduh gambar Rule34 (hanya premium)
• .quote - Quotes random
• .info - Info bot
• .ytmp3 [url] - Download audio YouTube
• .ytmp4 [url] - Download video YouTube
• .tiktok [url] - Download video TikTok
• .ig [url] - Download media Instagram
• .play [query] - Cari dan download lagu dari YouTube
━━━━━━━━━━━━━━━━
© Rezium-V2 2023
                    `;
                    await sock.sendMessage(from, { text: menu });
                }
                else if (body.toLowerCase() === '.ping') {
                    const startTime = Date.now();
                    await sock.sendMessage(from, { text: `⏳ Mengecek koneksi...` });
                    const responseTime = Date.now() - startTime;
                    await sock.sendMessage(from, { text: `🏓 Pong! 🚀\n⚡ Kecepatan: ${responseTime}ms` });
                }
                else if (body.toLowerCase() === '.quote') {
                    const quotes = [
                        "Hidup itu seperti riding sepeda, agar tetap seimbang kamu harus terus bergerak - Albert Einstein",
                        "Kesuksesan adalah kemampuan untuk pergi dari kegagalan ke kegagalan tanpa kehilangan semangat - Winston Churchill",
                        "Jangan pernah menyerah pada mimpi-mimpi indahmu"
                    ];
                    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                    await sock.sendMessage(from, { text: `💬 *Quotes Hari Ini:*\n\n${randomQuote}` });
                }
                else if (body.toLowerCase() === '.info') {
                    const uptime = process.uptime();
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);
                    
                    await sock.sendMessage(from, { 
                        text: `*REZIUM-V2 INFO*\n\n🤖 Version: 2.0.0\n👨‍💻 Creator: Rezium\n⚡ Status: Online\n⏱️ Runtime: ${hours} jam, ${minutes} menit, ${seconds} detik`
                    });
                }
                
                // Handler untuk owner
                else if (body.toLowerCase() === '.owner') {
                    try {
                        const vcard = 'BEGIN:VCARD\n' +
                            'VERSION:3.0\n' +
                            'FN:Owner\n' + // Nama kontak
                            'ORG:Ajarher;\n' + // Organisasi
                            'TEL;type=CELL;type=VOICE;waid=6287841109073:+62 878-4110-9073\n' + // Nomor WhatsApp,
                            'TEL;type=CELL;type=VOICE;waid=6285765562855:+62 857-6556-2855\n' + // Nomor WhatsApp
                            'END:VCARD';
                            
                        await sock.sendMessage(from, {
                            contacts: {
                                displayName: 'Owner',
                                contacts: [{ vcard }]
                            }
                        });
                        
                        // Kirim pesan teks juga
                        await sock.sendMessage(from, { text: '👤 Ini adalah kontak owner Rezium-V2. Silakan hubungi jika ada pertanyaan.' });
                        
                        debugLog('Kontak owner berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengirim kontak owner: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Maaf, terjadi kesalahan saat mengirim kontak owner. Silakan coba kembali nanti.' });
                    }
                }
                
                // Handler untuk .jadiowner
                else if (body.toLowerCase().startsWith('.jadiowner ')) {
                    const code = body.substring(10).trim();
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    
                    if (!code) {
                        await sock.sendMessage(from, { text: '❌ Silakan masukkan kode owner!\nContoh: .jadiowner KODE_RAHASIA' });
                        return;
                    }
                    
                    if (code !== ownerCode) {
                        await sock.sendMessage(from, { text: '❌ Kode owner salah! Silakan hubungi owner untuk mendapatkan kode yang valid.' });
                        return;
                    }
                    
                    // Cek apakah sudah owner
                    const checkOwner = await isOwner(senderNumber);
                    if (checkOwner) {
                        await sock.sendMessage(from, { text: '❌ Anda sudah terdaftar sebagai owner!' });
                        return;
                    }
                    
                    // Tambahkan sebagai owner
                    const result = await addOwner(senderNumber);
                    await sock.sendMessage(from, { text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
                }
                
                // Handler untuk .daftarowner (opsional, untuk melihat daftar owner)
                else if (body.toLowerCase() === '.daftarowner') {
                    try {
                        if (!fs.existsSync(ownerFile)) {
                            await sock.sendMessage(from, { text: '❌ Belum ada owner yang terdaftar.' });
                            return;
                        }
                        
                        const owners = JSON.parse(fs.readFileSync(ownerFile, 'utf-8'));
                        let ownerList = '📋 *Daftar Owner Bot:*\n\n';
                        
                        for (let i = 0; i < owners.length; i++) {
                            ownerList += `${i + 1}. @${owners[i].split('@')[0]}\n`;
                        }
                        
                        await sock.sendMessage(from, { 
                            text: ownerList,
                            mentions: owners.map(id => id)
                        });
                    } catch (err) {
                        debugLog(`Error menampilkan daftar owner: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat menampilkan daftar owner.' });
                    }
                }
                
                // Handler untuk .hapusowner (hanya untuk owner)
                else if (body.toLowerCase().startsWith('.hapusowner ')) {
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    const targetNumber = body.substring(12).trim() + '@s.whatsapp.net';
                    
                    // Cek apakah pengirim adalah owner
                    const isSenderOwner = await isOwner(senderNumber);
                    if (!isSenderOwner) {
                        await sock.sendMessage(from, { text: '❌ Hanya owner yang dapat menggunakan perintah ini!' });
                        return;
                    }
                    
                    try {
                        if (!fs.existsSync(ownerFile)) {
                            await sock.sendMessage(from, { text: '❌ Belum ada owner yang terdaftar.' });
                            return;
                        }
                        
                        let owners = JSON.parse(fs.readFileSync(ownerFile, 'utf-8'));
                        
                        // Cek apakah target adalah owner
                        if (!owners.includes(targetNumber)) {
                            await sock.sendMessage(from, { text: '❌ Pengguna tersebut bukan owner!' });
                            return;
                        }
                        
                        // Hapus dari daftar owner
                        owners = owners.filter(owner => owner !== targetNumber);
                        
                        // Simpan kembali ke file
                        fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
                        
                        await sock.sendMessage(from, { text: `✅ Berhasil menghapus ${targetNumber.split('@')[0]} dari daftar owner.` });
                        debugLog(`Owner dihapus: ${targetNumber}`);
                    } catch (err) {
                        debugLog(`Error menghapus owner: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat menghapus owner.' });
                    }
                }
                
                // Handler untuk pp couple
                else if (body.toLowerCase() === '.ppcouple') {
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang memuat gambar...' });
                        
                        // Dapatkan pasangan gambar
                        const couple = getCoupleProfilePictures();
                        
                        // Ambil gambar untuk pria
                        const maleImage = await getImageBuffer(couple.male);
                        // Ambil gambar untuk wanita
                        const femaleImage = await getImageBuffer(couple.female);
                        
                        // Kirim gambar perempuan dengan caption "Buat Perempuan"
                        await sock.sendMessage(from, {
                            image: femaleImage.buffer,
                            caption: 'Buat Perempuan'
                        });
                        
                        // Kirim gambar pria dengan caption "Buat Laki-Laki"
                        await sock.sendMessage(from, {
                            image: maleImage.buffer,
                            caption: 'Buat Laki-Laki'
                        });
                        
                        debugLog('Gambar pp couple berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengirim pp couple: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Maaf, terjadi kesalahan saat memuat PP couple. Silahkan coba kembali nanti ya.' });
                    }
                }
                
                // Handler untuk Furina
                else if (body.toLowerCase() === '.furina') {
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang memuat gambar Furina...' });
                        
                        // Dapatkan gambar Furina acak
                        const furinaImageUrl = getFurinaImage();
                        
                        // Ambil gambar
                        const furinaImage = await getImageBuffer(furinaImageUrl);
                        
                        // Kirim gambar dengan caption
                        await sock.sendMessage(from, {
                            image: furinaImage.buffer,
                            caption: '🌊 *Furina - Genshin Impact*\n\n"Mon dieu, vous êtes vraiment incroyable!"'
                        });
                        
                        debugLog('Gambar Furina berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengirim gambar Furina: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Maaf, terjadi kesalahan saat memuat gambar Furina. Silahkan coba kembali nanti ya.' });
                    }
                }
                
                // Handler untuk pencarian Pinterest
                else if (body.toLowerCase().startsWith('.pinsearch ')) {
                    const query = body.substring(11).trim();
                    
                    if (!query) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan kata kunci pencarian!\nContoh: .pinsearch anime girl' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '🔍 Sedang mencari gambar Pinterest...' });
                        
                        // Cari gambar
                        const results = await searchPinterest(query, 5);
                        
                        if (results.length === 0) {
                            await sock.sendMessage(from, { text: '❌ Tidak ditemukan hasil untuk pencarian tersebut.' });
                            return;
                        }
                        
                        // Kirim hasil pencarian
                        await sendPinterestResults(sock, from, results, query);
                        
                        debugLog(`Pencarian Pinterest berhasil: ${results.length} hasil ditemukan`);
                    } catch (err) {
                        debugLog(`Error pencarian Pinterest: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mencari gambar: ${err.message}` });
                    }
                }
                
                // Handler untuk download Pinterest
                else if (body.toLowerCase().startsWith('.pindl ')) {
                    const url = body.substring(7).trim();
                    
                    if (!url) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan URL Pinterest!\nContoh: .pindl https://pin.it/abcdef atau https://pinterest.com/pin/123456/' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mengunduh gambar Pinterest...' });
                        
                        // Ambil gambar dari Pinterest
                        const imageData = await getImageBuffer(url);
                        
                        // Kirim gambar
                        await sock.sendMessage(from, {
                            image: imageData.buffer,
                            caption: '✅ Gambar Pinterest berhasil diunduh!'
                        });
                        
                        debugLog('Gambar Pinterest berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengunduh gambar Pinterest: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mengunduh gambar: ${err.message}` });
                    }
                }
                
                // Handler untuk download Pinterest berdasarkan ID
                else if (body.toLowerCase().startsWith('.pindlid ')) {
                    const id = body.substring(9).trim();
                    
                    if (!id) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan ID gambar!\nContoh: .pindlid pin-1' });
                        return;
                    }
                    
                    const url = pinterestCache.get(id);
                    
                    if (!url) {
                        await sock.sendMessage(from, { text: '❌ ID tidak ditemukan atau sudah kedaluwarsa!' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mengunduh gambar Pinterest...' });
                        
                        // Ambil gambar dari Pinterest
                        const imageData = await getImageBuffer(url);
                        
                        // Kirim gambar
                        await sock.sendMessage(from, {
                            image: imageData.buffer,
                            caption: '✅ Gambar Pinterest berhasil diunduh!'
                        });
                        
                        debugLog('Gambar Pinterest berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengunduh gambar Pinterest: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mengunduh gambar: ${err.message}` });
                    }
                }
                
                // Handler untuk pencarian Pixiv
                else if (body.toLowerCase().startsWith('.pixivsearch ')) {
                    const query = body.substring(12).trim();
                    
                    if (!query) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan kata kunci pencarian!\nContoh: .pixivsearch anime girl' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '🔍 Sedang mencari artwork Pixiv...' });
                        
                        // Cari artwork
                        const results = await searchPixiv(query, 5);
                        
                        if (results.length === 0) {
                            await sock.sendMessage(from, { text: '❌ Tidak ditemukan hasil untuk pencarian tersebut.' });
                            return;
                        }
                        
                        // Kirim hasil pencarian
                        await sendSearchResults(sock, from, results, query);
                        
                        debugLog(`Pencarian Pixiv berhasil: ${results.length} hasil ditemukan`);
                    } catch (err) {
                        debugLog(`Error pencarian Pixiv: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mencari artwork: ${err.message}` });
                    }
                }
                
                // Handler untuk Pixiv (diperbaiki)
                else if (body.toLowerCase().startsWith('.pixiv ')) {
                    let input = body.substring(7).trim();
                    let pixivId;
                    
                    debugLog(`Memproses pixiv dengan input: ${input}`);
                    
                    // Cek apakah input adalah URL atau ID
                    if (input.includes('pixiv.net/en/artworks/')) {
                        // Ekstrak ID dari URL
                        const urlMatch = input.match(/\/artworks\/(\d+)/);
                        if (urlMatch && urlMatch[1]) {
                            pixivId = urlMatch[1];
                            debugLog(`ID diekstrak dari URL: ${pixivId}`);
                        } else {
                            await sock.sendMessage(from, { text: '❌ URL Pixiv tidak valid!\nContoh: https://www.pixiv.net/en/artworks/134939932' });
                            return;
                        }
                    } else if (input.includes('pixiv.net/artworks/')) {
                        // Handle URL tanpa "/en/"
                        const urlMatch = input.match(/\/artworks\/(\d+)/);
                        if (urlMatch && urlMatch[1]) {
                            pixivId = urlMatch[1];
                            debugLog(`ID diekstrak dari URL: ${pixivId}`);
                        } else {
                            await sock.sendMessage(from, { text: '❌ URL Pixiv tidak valid!\nContoh: https://www.pixiv.net/en/artworks/134939932' });
                            return;
                        }
                    } else {
                        // Jika bukan URL, anggap sebagai ID langsung
                        pixivId = input;
                        debugLog(`Menggunakan ID langsung: ${pixivId}`);
                    }
                    
                    // Validasi ID harus numerik
                    if (!pixivId || isNaN(pixivId)) {
                        await sock.sendMessage(from, { text: '❌ ID Pixiv tidak valid!\nContoh: .pixiv 12345678 atau https://www.pixiv.net/en/artworks/134939932' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mengunduh gambar Pixiv...' });
                        
                        // Unduh gambar dari Pixiv
                        const imageInfo = await getPixivImage(pixivId);
                        
                        // Buat caption dengan informasi orientasi
                        const orientation = imageInfo.width > imageInfo.height ? 'Landscape' : 'Potrait';
                        const caption = `🎨 Pixiv Artwork ID: ${pixivId}\n📐 Orientasi: ${orientation} (${imageInfo.width}x${imageInfo.height})`;
                        
                        if (imageInfo.pageCount > 1) {
                            caption += `\n📄 Halaman: 1/${imageInfo.pageCount}`;
                        }
                        
                        // Kirim gambar dengan caption yang informatif
                        await sock.sendMessage(from, {
                            image: fs.readFileSync(imageInfo.path),
                            caption: caption
                        });
                        
                        // Hapus file setelah dikirim
                        setTimeout(async () => {
                            try {
                                await fs.remove(imageInfo.path);
                                debugLog(`File Pixiv dihapus: ${imageInfo.path}`);
                            } catch (err) {
                                debugLog(`Error menghapus file Pixiv: ${err.message}`);
                            }
                        }, 5000);
                        
                        debugLog('Gambar Pixiv berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengunduh gambar Pixiv: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mengunduh gambar Pixiv: ${err.message}` });
                    }
                }
                
                // Handler stiker
                else if (body.toLowerCase() === '.stiker') {
                    // Skenario 1: Pesan adalah gambar dengan caption .stiker
                    if (type === 'imageMessage') {
                        try {
                            debugLog('Memproses stiker dari gambar...');
                            const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                                logger,
                                reuploadRequest: sock.updateMediaMessage
                            });
                            
                            const webpBuffer = await convertToStickerNew(buffer);
                            
                            await sock.sendMessage(from, {
                                sticker: webpBuffer,
                                packname: 'Rezium-V2',
                                author: 'Bot'
                            });
                            
                            debugLog('Stiker berhasil dikirim!');
                        } catch (err) {
                            debugLog(`Error membuat stiker dari gambar: ${err.message}`);
                            await sock.sendMessage(from, { text: `❌ Gagal membuat stiker: ${err.message}` });
                        }
                    }
                    // Skenario 2: Pesan adalah teks yang membalas gambar
                    else if (type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo) {
                        const quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                        
                        if (quotedMessage && quotedMessage.imageMessage) {
                            try {
                                debugLog('Memproses stiker dari gambar yang dibalas...');
                                // Buat objek pesan dari quoted message
                                const quotedMsg = {
                                    key: {
                                        remoteJid: from,
                                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                                        fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id,
                                        participant: msg.message.extendedTextMessage.contextInfo.participant
                                    },
                                    message: quotedMessage
                                };
                                
                                const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, {
                                    logger,
                                    reuploadRequest: sock.updateMediaMessage
                                });
                                
                                const webpBuffer = await convertToStickerNew(buffer);
                                
                                await sock.sendMessage(from, {
                                    sticker: webpBuffer,
                                    packname: 'Rezium-V2',
                                    author: 'Bot'
                                });
                                
                                debugLog('Stiker dari balasan berhasil dikirim!');
                            } catch (err) {
                                debugLog(`Error membuat stiker dari gambar yang dibalas: ${err.message}`);
                                await sock.sendMessage(from, { text: `❌ Gagal membuat stiker: ${err.message}` });
                            }
                        } else {
                            await sock.sendMessage(from, { text: '❌ Silakan balas pesan gambar dengan .stiker!' });
                        }
                    } else {
                        await sock.sendMessage(from, { text: '❌ Kirim gambar dengan caption .stiker atau balas gambar dengan .stiker!' });
                    }
                }
                
                // Handler untuk membuat meme
                else if (body.toLowerCase().startsWith('.smeme ')) {
                    const text = body.substring(7).trim();
                    const textParts = text.split('|');
                    
                    let topText = '';
                    let bottomText = '';
                    
                    if (textParts.length >= 2) {
                        topText = textParts[0].trim();
                        bottomText = textParts[1].trim();
                    } else if (textParts.length === 1) {
                        bottomText = textParts[0].trim();
                    }
                    
                    // Skenario 1: Pesan adalah gambar dengan caption .smeme
                    if (type === 'imageMessage') {
                        try {
                            debugLog('Memproses meme dari gambar...');
                            const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                                logger,
                                reuploadRequest: sock.updateMediaMessage
                            });
                            
                            const memeBuffer = await createMeme(buffer, topText, bottomText);
                            
                            await sock.sendMessage(from, {
                                image: memeBuffer,
                                caption: '✅ Meme berhasil dibuat!'
                            });
                            
                            debugLog('Meme berhasil dikirim!');
                        } catch (err) {
                            debugLog(`Error membuat meme dari gambar: ${err.message}`);
                            await sock.sendMessage(from, { text: `❌ Gagal membuat meme: ${err.message}` });
                        }
                    }
                    // Skenario 2: Pesan adalah teks yang membalas gambar
                    else if (type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo) {
                        const quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                        
                        if (quotedMessage && quotedMessage.imageMessage) {
                            try {
                                debugLog('Memproses meme dari gambar yang dibalas...');
                                // Buat objek pesan dari quoted message
                                const quotedMsg = {
                                    key: {
                                        remoteJid: from,
                                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                                        fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id,
                                        participant: msg.message.extendedTextMessage.contextInfo.participant
                                    },
                                    message: quotedMessage
                                };
                                
                                const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, {
                                    logger,
                                    reuploadRequest: sock.updateMediaMessage
                                });
                                
                                const memeBuffer = await createMeme(buffer, topText, bottomText);
                                
                                await sock.sendMessage(from, {
                                    image: memeBuffer,
                                    caption: '✅ Meme berhasil dibuat!'
                                });
                                
                                debugLog('Meme dari balasan berhasil dikirim!');
                            } catch (err) {
                                debugLog(`Error membuat meme dari gambar yang dibalas: ${err.message}`);
                                await sock.sendMessage(from, { text: `❌ Gagal membuat meme: ${err.message}` });
                            }
                        } else {
                            await sock.sendMessage(from, { text: '❌ Silakan balas pesan gambar dengan .smeme!' });
                        }
                    } else {
                        await sock.sendMessage(from, { text: '❌ Kirim gambar dengan caption .smeme atau balas gambar dengan .smeme!' });
                    }
                }
                
                // Download YouTube Audio
                else if (body.toLowerCase().startsWith('.ytmp3 ')) {
                    const url = body.substring(7).trim();
                    debugLog(`Memproses ytmp3 dengan URL: ${url}`);
                    
                    if (!url || !url.startsWith('http')) {
                        await sock.sendMessage(from, { text: '❌ URL YouTube tidak valid!\nContoh: .ytmp3 https://youtube.com/watch?v=example' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mendownload audio YouTube...' });
                        
                        // Validasi URL dengan ytdl-core
                        const info = await ytdl.getInfo(url);
                        const title = info.videoDetails.title;
                        const duration = parseInt(info.videoDetails.lengthSeconds);
                        
                        debugLog(`Info video: ${title}, Durasi: ${duration} detik`);
                        
                        // Batasi durasi maksimal 10 menit (600 detik)
                        if (duration > 600) {
                            await sock.sendMessage(from, { text: '❌ Video terlalu panjang! Maksimal 10 menit.' });
                            return;
                        }
                        
                        // Pilih format audio terbaik
                        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                        const audioFormat = audioFormats[0];
                        
                        if (!audioFormat) {
                            await sock.sendMessage(from, { text: '❌ Tidak dapat menemukan format audio untuk video ini!' });
                            return;
                        }
                        
                        // Simpan ke file temporary
                        const timestamp = Date.now();
                        const outputPath = path.join(downloadDir, `${timestamp}.mp3`);
                        
                        // Download dengan ytdl-core
                        await new Promise((resolve, reject) => {
                            ytdl(url, { format: audioFormat })
                                .on('error', reject)
                                .on('info', (info) => {
                                    debugLog(`Download progress: ${info.size} bytes`);
                                })
                                .pipe(fs.createWriteStream(outputPath))
                                .on('finish', resolve)
                                .on('error', reject);
                        });
                        
                        // Cek ukuran file
                        const stats = await fs.stat(outputPath);
                        const fileSizeInMB = stats.size / (1024 * 1024);
                        
                        if (fileSizeInMB > 16) {
                            await fs.remove(outputPath);
                            await sock.sendMessage(from, { text: '❌ Ukuran file terlalu besar! Maksimal 16MB.' });
                            return;
                        }
                        
                        // Kirim file
                        await sock.sendMessage(from, {
                            audio: fs.readFileSync(outputPath),
                            mimetype: 'audio/mp4',
                            ptt: false
                        });
                        
                        // Hapus file
                        await fs.remove(outputPath);
                        
                        debugLog('Audio YouTube berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mendownload audio YouTube: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mendownload audio: ${err.message}` });
                    }
                }
                
                // Download YouTube Video
                else if (body.toLowerCase().startsWith('.ytmp4 ')) {
                    const url = body.substring(7).trim();
                    debugLog(`Memproses ytmp4 dengan URL: ${url}`);
                    
                    if (!url || !url.startsWith('http')) {
                        await sock.sendMessage(from, { text: '❌ URL YouTube tidak valid!\nContoh: .ytmp4 https://youtube.com/watch?v=example' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mendownload video YouTube...' });
                        
                        // Validasi URL dengan ytdl-core
                        const info = await ytdl.getInfo(url);
                        const title = info.videoDetails.title;
                        const duration = parseInt(info.videoDetails.lengthSeconds);
                        
                        debugLog(`Info video: ${title}, Durasi: ${duration} detik`);
                        
                        // Batasi durasi maksimal 5 menit (300 detik)
                        if (duration > 300) {
                            await sock.sendMessage(from, { text: '❌ Video terlalu panjang! Maksimal 5 menit.' });
                            return;
                        }
                        
                        // Pilih format video terbaik (prioritaskan mp4)
                        const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
                        const mp4Formats = videoFormats.filter(format => format.container === 'mp4');
                        
                        let videoFormat;
                        if (mp4Formats.length > 0) {
                            // Pilih format dengan kualitas terbaik
                            videoFormat = mp4Formats[0];
                        } else if (videoFormats.length > 0) {
                            videoFormat = videoFormats[0];
                        } else {
                            await sock.sendMessage(from, { text: '❌ Tidak dapat menemukan format video untuk video ini!' });
                            return;
                        }
                        
                        // Simpan ke file temporary
                        const timestamp = Date.now();
                        const outputPath = path.join(downloadDir, `${timestamp}.mp4`);
                        
                        // Download dengan ytdl-core
                        await new Promise((resolve, reject) => {
                            ytdl(url, { format: videoFormat })
                                .on('error', reject)
                                .on('info', (info) => {
                                    debugLog(`Download progress: ${info.size} bytes`);
                                })
                                .pipe(fs.createWriteStream(outputPath))
                                .on('finish', resolve)
                                .on('error', reject);
                        });
                        
                        // Cek ukuran file
                        const stats = await fs.stat(outputPath);
                        const fileSizeInMB = stats.size / (1024 * 1024);
                        
                        if (fileSizeInMB > 16) {
                            await fs.remove(outputPath);
                            await sock.sendMessage(from, { text: '❌ Ukuran file terlalu besar! Maksimal 16MB.' });
                            return;
                        }
                        
                        // Kirim file
                        await sock.sendMessage(from, {
                            video: fs.readFileSync(outputPath),
                            caption: `📹 ${title}`
                        });
                        
                        // Hapus file
                        await fs.remove(outputPath);
                        
                        debugLog('Video YouTube berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mendownload video YouTube: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mendownload video: ${err.message}` });
                    }
                }
                
                // Download TikTok
                else if (body.toLowerCase().startsWith('.tiktok ')) {
                    const url = body.substring(8).trim();
                    debugLog(`Memproses tiktok dengan URL: ${url}`);
                    
                    if (!url) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan URL TikTok!\nContoh: .tiktok https://tiktok.com/@example/video/123456789' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mendownload video TikTok...' });
                        
                        // Gunakan API alternatif untuk TikTok
                        const apiUrl = `https://api.tikapi.io/public/download?url=${encodeURIComponent(url)}`;
                        
                        const response = await axios.get(apiUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        });
                        
                        if (response.data && response.data.success && response.data.video_url) {
                            const videoUrl = response.data.video_url;
                            
                            const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                            const buffer = Buffer.from(videoResponse.data, 'binary');
                            
                            await sock.sendMessage(from, {
                                video: buffer,
                                caption: `🎵 Video TikTok`
                            });
                            
                            debugLog('Video TikTok berhasil dikirim!');
                        } else {
                            await sock.sendMessage(from, { text: '❌ Tidak dapat mengambil data video TikTok!' });
                        }
                    } catch (err) {
                        debugLog(`Error mendownload video TikTok: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mendownload video TikTok: ${err.message}` });
                    }
                }
                
                // Download Instagram
                else if (body.toLowerCase().startsWith('.ig ')) {
                    const url = body.substring(4).trim();
                    debugLog(`Memproses ig dengan URL: ${url}`);
                    
                    if (!url) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan URL Instagram!\nContoh: .ig https://instagram.com/p/ABC123/' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mendownload media Instagram...' });
                        
                        // Gunakan API alternatif untuk Instagram
                        const apiUrl = `https://api.instapi.xyz/media?url=${encodeURIComponent(url)}`;
                        
                        const response = await axios.get(apiUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        });
                        
                        if (response.data && response.data.success) {
                            const mediaUrl = response.data.media_url;
                            
                            if (mediaUrl.includes('.mp4')) {
                                // Video
                                const videoResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                                const buffer = Buffer.from(videoResponse.data, 'binary');
                                
                                await sock.sendMessage(from, {
                                    video: buffer,
                                    caption: `🎬 Instagram Video`
                                });
                            } else {
                                // Gambar
                                const imageResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                                const buffer = Buffer.from(imageResponse.data, 'binary');
                                
                                await sock.sendMessage(from, {
                                    image: buffer,
                                    caption: `📷 Instagram Image`
                                });
                            }
                            
                            debugLog('Media Instagram berhasil dikirim!');
                        } else {
                            // Coba API alternatif
                            debugLog('API alternatif gagal, mencoba API lain...');
                            
                            const fallbackApiUrl = `https://igram.io/api?url=${encodeURIComponent(url)}`;
                            
                            const fallbackResponse = await axios.get(fallbackApiUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                                }
                            });
                            
                            if (fallbackResponse.data && fallbackResponse.data.media_url) {
                                const mediaUrl = fallbackResponse.data.media_url;
                                
                                if (mediaUrl.includes('.mp4')) {
                                    // Video
                                    const videoResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                                    const buffer = Buffer.from(videoResponse.data, 'binary');
                                    
                                    await sock.sendMessage(from, {
                                        video: buffer,
                                        caption: `🎬 Instagram Video`
                                    });
                                } else {
                                    // Gambar
                                    const imageResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                                    const buffer = Buffer.from(imageResponse.data, 'binary');
                                    
                                    await sock.sendMessage(from, {
                                        image: buffer,
                                        caption: `📷 Instagram Image`
                                    });
                                }
                                
                                debugLog('Media Instagram berhasil dikirim dengan API fallback!');
                            } else {
                                await sock.sendMessage(from, { text: '❌ Tidak dapat mengambil media dari URL ini!' });
                            }
                        }
                    } catch (err) {
                        debugLog(`Error mendownload media Instagram: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mendownload media Instagram: ${err.message}` });
                    }
                }
                
                // Play and download from YouTube (PERBAIKAN UTAMA)
                else if (body.toLowerCase().startsWith('.play ')) {
                    const query = body.substring(6).trim();
                    debugLog(`Memproses play dengan query: ${query}`);
                    
                    if (!query) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan judul lagu!\nContoh: .play Alan Walker Faded' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mencari lagu...' });
                        
                        // Coba beberapa metode pencarian
                        let video = null;
                        let searchError = null;
                        
                        // Metode 1: play-dl
                        try {
                            debugLog('Mencoba pencarian dengan play-dl...');
                            const searchResults = await playdl.search(query, {
                                limit: 1,
                                source: { youtube: 'video' }
                            });
                            
                            if (searchResults.length > 0) {
                                video = searchResults[0];
                                debugLog(`Hasil pencarian (play-dl): ${video.title}`);
                            }
                        } catch (err) {
                            searchError = err;
                            debugLog(`Error dengan play-dl: ${err.message}`);
                        }
                        
                        // Metode 2: ytdl-core jika play-dl gagal
                        if (!video) {
                            try {
                                debugLog('Mencoba pencarian dengan ytdl-core...');
                                const searchResults = await ytdl.search(query, {
                                    limit: 1,
                                    type: 'video'
                                });
                                
                                if (searchResults.length > 0) {
                                    video = {
                                        id: searchResults[0].id,
                                        title: searchResults[0].title,
                                        duration: searchResults[0].duration
                                    };
                                    debugLog(`Hasil pencarian (ytdl-core): ${video.title}`);
                                }
                            } catch (err) {
                                debugLog(`Error dengan ytdl-core: ${err.message}`);
                            }
                        }
                        
                        if (!video) {
                            await sock.sendMessage(from, { text: `❌ Tidak ditemukan hasil untuk pencarian tersebut. Error: ${searchError?.message || 'Unknown error'}` });
                            return;
                        }
                        
                        // Gunakan ID video untuk membuat URL yang valid
                        const videoId = video.id;
                        const url = `https://www.youtube.com/watch?v=${videoId}`;
                        const title = video.title;
                        
                        await sock.sendMessage(from, { text: `🎵 Ditemukan: ${title}\n⏳ Sedang mendownload...` });
                        
                        // Coba beberapa metode untuk mendapatkan info video
                        let info = null;
                        let infoError = null;
                        
                        // Metode 1: ytdl-core
                        try {
                            debugLog('Mendapatkan info video dengan ytdl-core...');
                            info = await ytdl.getInfo(url, {
                                requestOptions: {
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                    }
                                }
                            });
                        } catch (err) {
                            infoError = err;
                            debugLog(`Error mendapatkan info dengan ytdl-core: ${err.message}`);
                        }
                        
                        // Metode 2: play-dl jika ytdl-core gagal
                        if (!info) {
                            try {
                                debugLog('Mendapatkan info video dengan play-dl...');
                                const videoDetails = await playdl.video_info(url);
                                info = {
                                    videoDetails: {
                                        title: videoDetails.video_details.title,
                                        lengthSeconds: videoDetails.video_details.duration_in_sec,
                                        formats: videoDetails.format
                                    }
                                };
                            } catch (err) {
                                debugLog(`Error mendapatkan info dengan play-dl: ${err.message}`);
                            }
                        }
                        
                        if (!info) {
                            await sock.sendMessage(from, { text: `❌ Gagal mendapatkan info video. Error: ${infoError?.message || 'Unknown error'}` });
                            return;
                        }
                        
                        const duration = parseInt(info.videoDetails.lengthSeconds);
                        
                        // Batasi durasi maksimal 10 menit (600 detik)
                        if (duration > 600) {
                            await sock.sendMessage(from, { text: '❌ Lagu terlalu panjang! Maksimal 10 menit.' });
                            return;
                        }
                        
                        // Pilih format audio terbaik
                        let audioFormat = null;
                        
                        if (info.formats) {
                            // Dari ytdl-core
                            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                            if (audioFormats.length > 0) {
                                audioFormat = audioFormats[0];
                            }
                        } else if (info.videoDetails.formats) {
                            // Dari play-dl
                            const audioFormats = info.videoDetails.formats.filter(format => 
                                format.mimeType && format.mimeType.includes('audio')
                            );
                            if (audioFormats.length > 0) {
                                audioFormat = audioFormats[0];
                            }
                        }
                        
                        if (!audioFormat) {
                            await sock.sendMessage(from, { text: '❌ Tidak dapat menemukan format audio untuk lagu ini!' });
                            return;
                        }
                        
                        // Simpan ke file temporary
                        const timestamp = Date.now();
                        const outputPath = path.join(downloadDir, `${timestamp}.mp3`);
                        
                        // Download dengan metode yang sesuai
                        try {
                            if (audioFormat.url) {
                                // Jika ada URL langsung, gunakan axios
                                debugLog('Mendownload dengan axios...');
                                const response = await axios({
                                    method: 'GET',
                                    url: audioFormat.url,
                                    responseType: 'stream',
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                    }
                                });
                                
                                const writer = fs.createWriteStream(outputPath);
                                response.data.pipe(writer);
                                
                                await new Promise((resolve, reject) => {
                                    writer.on('finish', resolve);
                                    writer.on('error', reject);
                                });
                            } else {
                                // Gunakan ytdl-core
                                debugLog('Mendownload dengan ytdl-core...');
                                await new Promise((resolve, reject) => {
                                    ytdl(url, { 
                                        format: audioFormat,
                                        requestOptions: {
                                            headers: {
                                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                            }
                                        }
                                    })
                                        .on('error', reject)
                                        .on('info', (info) => {
                                            debugLog(`Download progress: ${info.size} bytes`);
                                        })
                                        .pipe(fs.createWriteStream(outputPath))
                                        .on('finish', resolve)
                                        .on('error', reject);
                                });
                            }
                        } catch (downloadError) {
                            debugLog(`Error mendownload: ${downloadError.message}`);
                            // Coba metode alternatif dengan play-dl
                            try {
                                debugLog('Mencoba download alternatif dengan play-dl...');
                                
                                // Gunakan quality sebagai integer (140 = audio 128kbps)
                                const stream = await playdl.stream(url, { 
                                    quality: 140, // Gunakan integer untuk quality
                                    requestOptions: {
                                        headers: {
                                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                        }
                                    }
                                });
                                
                                const writer = fs.createWriteStream(outputPath);
                                stream.stream.pipe(writer);
                                
                                await new Promise((resolve, reject) => {
                                    writer.on('finish', resolve);
                                    writer.on('error', reject);
                                });
                            } catch (altError) {
                                debugLog(`Error download alternatif: ${altError.message}`);
                                
                                // Coba dengan quality lain
                                try {
                                    debugLog('Mencoba dengan quality lain...');
                                    const stream2 = await playdl.stream(url, { 
                                        quality: 251, // 251 = audio opus 160kbps
                                        requestOptions: {
                                            headers: {
                                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                            }
                                        }
                                    });
                                    
                                    const writer2 = fs.createWriteStream(outputPath);
                                    stream2.stream.pipe(writer2);
                                    
                                    await new Promise((resolve, reject) => {
                                        writer2.on('finish', resolve);
                                        writer2.on('error', reject);
                                    });
                                } catch (altError2) {
                                    debugLog(`Error download alternatif 2: ${altError2.message}`);
                                    throw altError2;
                                }
                            }
                        }
                        
                        // Cek ukuran file
                        const stats = await fs.stat(outputPath);
                        const fileSizeInMB = stats.size / (1024 * 1024);
                        
                        if (fileSizeInMB > 16) {
                            await fs.remove(outputPath);
                            await sock.sendMessage(from, { text: '❌ Ukuran file terlalu besar! Maksimal 16MB.' });
                            return;
                        }
                        
                        // Kirim file
                        await sock.sendMessage(from, {
                            audio: fs.readFileSync(outputPath),
                            mimetype: 'audio/mp4',
                            ptt: false
                        });
                        
                        // Hapus file
                        await fs.remove(outputPath);
                        
                        debugLog('Lagu YouTube berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mendownload lagu YouTube: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mendownload lagu: ${err.message}` });
                    }
                }
                
                // Tambahkan handler untuk .restartbot (hanya untuk owner)
                else if (body.toLowerCase() === '.restartbot') {
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    
                    // Cek apakah pengirim adalah owner
                    const isSenderOwner = await isOwner(senderNumber);
                    if (!isSenderOwner) {
                        await sock.sendMessage(from, { text: '❌ Hanya owner yang dapat menggunakan perintah ini!' });
                        return;
                    }
                    
                    await sock.sendMessage(from, { text: '🔄 Merestart bot...' });
                    debugLog('Bot di-restart oleh owner');
                    restartBot();
                }
                
                // Handler untuk .addpremium (hanya untuk owner utama)
                else if (body.toLowerCase().startsWith('.addpremium ')) {
                    const code = body.substring(12).trim();
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    
                    // Cek apakah pengirim adalah owner utama (hanya Anda)
                    if (senderNumber !== '6287841109073@s.whatsapp.net') { // Ganti dengan nomor Anda
                        await sock.sendMessage(from, { text: '❌ Hanya owner utama yang dapat menggunakan perintah ini!' });
                        return;
                    }
                    
                    if (!code) {
                        await sock.sendMessage(from, { text: '❌ Silakan masukkan kode premium!\nContoh: .addpremium KODE_PREMIUM' });
                        return;
                    }
                    
                    if (code !== premiumCode) {
                        await sock.sendMessage(from, { text: '❌ Kode premium salah! Silakan hubungi owner untuk mendapatkan kode yang valid.' });
                        return;
                    }
                    
                    // Cek apakah sudah premium
                    const checkPremium = await isPremium(senderNumber);
                    if (checkPremium) {
                        await sock.sendMessage(from, { text: '❌ Anda sudah terdaftar sebagai user premium!' });
                        return;
                    }
                    
                    // Tambahkan sebagai premium
                    const result = await addPremium(senderNumber);
                    await sock.sendMessage(from, { text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
                }
                
                // Handler untuk .delpremium (hanya untuk owner utama)
                else if (body.toLowerCase().startsWith('.delpremium ')) {
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    const targetNumber = body.substring(12).trim() + '@s.whatsapp.net';
                    
                    // Cek apakah pengirim adalah owner utama (hanya Anda)
                    if (senderNumber !== '6287841109073@s.whatsapp.net') { // Ganti dengan nomor Anda
                        await sock.sendMessage(from, { text: '❌ Hanya owner utama yang dapat menggunakan perintah ini!' });
                        return;
                    }
                    
                    try {
                        const result = await removePremium(targetNumber);
                        await sock.sendMessage(from, { text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
                    } catch (err) {
                        debugLog(`Error menghapus premium: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat menghapus user premium.' });
                    }
                }
                
                // Handler untuk .listpremium (hanya untuk owner utama)
                else if (body.toLowerCase() === '.listpremium') {
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    
                    // Cek apakah pengirim adalah owner utama (hanya Anda)
                    if (senderNumber !== '6287841109073@s.whatsapp.net') { // Ganti dengan nomor Anda
                        await sock.sendMessage(from, { text: '❌ Hanya owner utama yang dapat menggunakan perintah ini!' });
                        return;
                    }
                    
                    try {
                        const premiums = await getPremiumList();
                        
                        if (premiums.length === 0) {
                            await sock.sendMessage(from, { text: '❌ Belum ada user premium yang terdaftar.' });
                            return;
                        }
                        
                        let premiumList = '📋 *Daftar User Premium:*\n\n';
                        
                        for (let i = 0; i < premiums.length; i++) {
                            premiumList += `${i + 1}. @${premiums[i].split('@')[0]}\n`;
                        }
                        
                        await sock.sendMessage(from, { 
                            text: premiumList,
                            mentions: premiums.map(id => id)
                        });
                    } catch (err) {
                        debugLog(`Error menampilkan daftar premium: ${err.message}`);
                        await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat menampilkan daftar user premium.' });
                    }
                }
                
                // Handler untuk .jadipremium
                else if (body.toLowerCase().startsWith('.jadipremium ')) {
                    const code = body.substring(12).trim();
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    
                    if (!code) {
                        await sock.sendMessage(from, { text: '❌ Silakan masukkan kode premium!\nContoh: .jadipremium KODE_PREMIUM' });
                        return;
                    }
                    
                    if (code !== premiumCode) {
                        await sock.sendMessage(from, { text: '❌ Kode premium salah! Silakan hubungi owner untuk mendapatkan kode yang valid.' });
                        return;
                    }
                    
                    // Cek apakah sudah premium
                    const checkPremium = await isPremium(senderNumber);
                    if (checkPremium) {
                        await sock.sendMessage(from, { text: '❌ Anda sudah terdaftar sebagai user premium!' });
                        return;
                    }
                    
                    // Tambahkan sebagai premium
                    const result = await addPremium(senderNumber);
                    await sock.sendMessage(from, { text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
                }
                
                // Handler untuk pencarian Rule34 (hanya untuk premium)
                else if (body.toLowerCase().startsWith('.rule34 ')) {
                    const query = body.substring(8).trim();
                    
                    if (!query) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan kata kunci pencarian!\nContoh: .rule34 character_name' });
                        return;
                    }
                    
                    // Cek apakah pengirim adalah premium atau owner
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    const isSenderPremium = await isPremium(senderNumber);
                    const isSenderOwner = await isOwner(senderNumber);
                    
                    if (!isSenderPremium && !isSenderOwner) {
                        await sock.sendMessage(from, { text: '❌ Fitur ini hanya untuk user premium!\nKetik .jadipremium <kode> untuk menjadi user premium.' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '🔞 Sedang mencari gambar Rule34...' });
                        
                        // Cari gambar
                        const results = await searchRule34(query, 5);
                        
                        if (results.length === 0) {
                            await sock.sendMessage(from, { text: '❌ Tidak ditemukan hasil untuk pencarian tersebut.' });
                            return;
                        }
                        
                        // Kirim hasil pencarian
                        await sendRule34Results(sock, from, results, query);
                        
                        debugLog(`Pencarian Rule34 berhasil: ${results.length} hasil ditemukan`);
                    } catch (err) {
                        debugLog(`Error pencarian Rule34: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mencari gambar: ${err.message}` });
                    }
                }
                
                // Handler untuk download Rule34 berdasarkan ID (hanya untuk premium)
                else if (body.toLowerCase().startsWith('.r34dl ')) {
                    const id = body.substring(7).trim();
                    
                    if (!id) {
                        await sock.sendMessage(from, { text: '❌ Silakan berikan ID gambar!\nContoh: .r34dl 123456' });
                        return;
                    }
                    
                    // Cek apakah pengirim adalah premium atau owner
                    const senderNumber = msg.key.participant || msg.key.remoteJid;
                    const isSenderPremium = await isPremium(senderNumber);
                    const isSenderOwner = await isOwner(senderNumber);
                    
                    if (!isSenderPremium && !isSenderOwner) {
                        await sock.sendMessage(from, { text: '❌ Fitur ini hanya untuk user premium!\nKetik .jadipremium <kode> untuk menjadi user premium.' });
                        return;
                    }
                    
                    try {
                        await sock.sendMessage(from, { text: '⏳ Sedang mengunduh gambar Rule34...' });
                        
                        // Unduh gambar dari Rule34
                        const imageInfo = await getRule34Image(id);
                        
                        // Buat caption dengan informasi gambar
                        const caption = `🔞 *Rule34 Image*\n` +
                                        `ID: ${id}\n` +
                                        `Rating: ${imageInfo.rating.toUpperCase()}\n` +
                                        `Ukuran: ${imageInfo.width}x${imageInfo.height}\n` +
                                        `Format: ${imageInfo.format.toUpperCase()}\n` +
                                        `Tags: ${imageInfo.tags.slice(0, 10).join(', ')}${imageInfo.tags.length > 10 ? '...' : ''}`;
                        
                        // Kirim gambar dengan caption
                        await sock.sendMessage(from, {
                            image: fs.readFileSync(imageInfo.path),
                            caption: caption
                        });
                        
                        // Hapus file setelah dikirim
                        setTimeout(async () => {
                            try {
                                await fs.remove(imageInfo.path);
                                debugLog(`File Rule34 dihapus: ${imageInfo.path}`);
                            } catch (err) {
                                debugLog(`Error menghapus file Rule34: ${err.message}`);
                            }
                        }, 5000);
                        
                        debugLog('Gambar Rule34 berhasil dikirim!');
                    } catch (err) {
                        debugLog(`Error mengunduh gambar Rule34: ${err.message}`);
                        await sock.sendMessage(from, { text: `❌ Gagal mengunduh gambar: ${err.message}` });
                    }
                }
                
            } catch (err) {
                debugLog(`Error dalam pesan handler: ${err.message}`);
            }
        });
        
        // Tambahkan handler error
        sock.ev.on('error', (err) => {
            debugLog(`Socket error: ${err.message}`);
        });
    } catch (err) {
        debugLog(`Error memulai bot: ${err.message}`);
        return restartBot();
    }
}

// Fungsi untuk mengonversi gambar ke format stiker WebP
async function convertToStickerNew(imageBuffer) {
    try {
        debugLog('Mengkonversi gambar ke stiker menggunakan metode buffer...');
        
        // Proses konversi langsung dari buffer tanpa file temporary
        const webpBuffer = await sharp(imageBuffer)
            .resize(512, 512, { 
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 80 })
            .toBuffer();
        
        debugLog(`Stiker berhasil dikonversi, ukuran: ${webpBuffer.length} bytes`);
        return webpBuffer;
    } catch (err) {
        debugLog(`Error di convertToStickerNew: ${err.message}`);
        
        // Fallback ke metode lama jika metode baru gagal
        debugLog('Mencoba metode fallback...');
        return await convertToStickerFallback(imageBuffer);
    }
}

// Fungsi fallback dengan penanganan file yang lebih aman
async function convertToStickerFallback(imageBuffer) {
    try {
        debugLog('Menggunakan metode fallback dengan file temporary...');
        
        // Buat nama file unik
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const inputPath = path.join(tempDir, `input-${timestamp}-${randomId}.jpg`);
        const outputPath = path.join(tempDir, `output-${timestamp}-${randomId}.webp`);
        
        // Simpan buffer gambar ke file
        await fs.writeFile(inputPath, imageBuffer);
        
        // Proses konversi
        await sharp(inputPath)
            .resize(512, 512, { 
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 80 })
            .toFile(outputPath);
        
        // Baca hasil konversi
        const webpBuffer = await fs.readFile(outputPath);
        
        // Hapus file dengan delay untuk memastikan tidak digunakan
        setTimeout(async () => {
            try {
                await fs.remove(inputPath);
                debugLog(`File input dihapus: ${inputPath}`);
            } catch (err) {
                debugLog(`Error menghapus file input: ${err.message}`);
            }
        }, 1000);
        
        setTimeout(async () => {
            try {
                await fs.remove(outputPath);
                debugLog(`File output dihapus: ${outputPath}`);
            } catch (err) {
                debugLog(`Error menghapus file output: ${err.message}`);
            }
        }, 2000);
        
        return webpBuffer;
    } catch (err) {
        debugLog(`Error di convertToStickerFallback: ${err.message}`);
        throw err;
    }
}

// Fungsi untuk membuat meme menggunakan Sharp (tanpa Jimp)
async function createMeme(imageBuffer, topText = '', bottomText = '') {
    try {
        debugLog('Membuat meme dengan Sharp...');
        
        // Baca gambar dengan Sharp
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        
        const width = metadata.width;
        const height = metadata.height;
        
        // Buat SVG untuk teks atas
        let topTextSvg = null;
        if (topText) {
            const fontSize = Math.floor(width / 15);
            const strokeWidth = Math.max(2, Math.floor(fontSize / 10));
            
            topTextSvg = Buffer.from(`
                <svg width="${width}" height="${height}">
                    <style>
                        .text {
                            font-family: Arial, sans-serif;
                            font-size: ${fontSize}px;
                            font-weight: bold;
                            fill: white;
                            stroke: black;
                            stroke-width: ${strokeWidth}px;
                            text-anchor: middle;
                        }
                    </style>
                    <text x="${width/2}" y="${fontSize * 1.2}" class="text">${topText.toUpperCase()}</text>
                </svg>
            `);
        }
        
        // Buat SVG untuk teks bawah
        let bottomTextSvg = null;
        if (bottomText) {
            const fontSize = Math.floor(width / 15);
            const strokeWidth = Math.max(2, Math.floor(fontSize / 10));
            
            bottomTextSvg = Buffer.from(`
                <svg width="${width}" height="${height}">
                    <style>
                        .text {
                            font-family: Arial, sans-serif;
                            font-size: ${fontSize}px;
                            font-weight: bold;
                            fill: white;
                            stroke: black;
                            stroke-width: ${strokeWidth}px;
                            text-anchor: middle;
                        }
                    </style>
                    <text x="${width/2}" y="${height - fontSize * 0.2}" class="text">${bottomText.toUpperCase()}</text>
                </svg>
            `);
        }
        
        // Gabungkan gambar dengan teks
        let result = image;
        
        if (topTextSvg) {
            const topTextImage = sharp(topTextSvg);
            result = result.composite([{ input: topTextImage, blend: 'over' }]);
        }
        
        if (bottomTextSvg) {
            const bottomTextImage = sharp(bottomTextSvg);
            result = result.composite([{ input: bottomTextImage, blend: 'over' }]);
        }
        
        // Konversi ke buffer
        const buffer = await result.toBuffer();
        
        debugLog('Meme berhasil dibuat dengan Sharp');
        return buffer;
    } catch (err) {
        debugLog(`Error membuat meme dengan Sharp: ${err.message}`);
        throw err;
    }
}

// Tangani proses exit
process.on('SIGINT', async () => {
    debugLog('Menerima SIGINT, mematikan bot dengan aman...');
    if (sock) {
        sock.ev.removeAllListeners();
        sock.ws.close();
    }
    isRunning = false;
    
    // Hentikan tunnel
    await stopTunnel();
    
    // Bersihkan direktori temporary
    try {
        await fs.emptyDir(tempDir);
        debugLog('Direktori temporary dibersihkan');
    } catch (err) {
        debugLog(`Error membersihkan direktori temporary: ${err.message}`);
    }
    
    process.exit(0);
});

// Tangani unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    debugLog(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Tangani uncaught exception
process.on('uncaughtException', (err) => {
    debugLog(`Uncaught Exception: ${err.message}`);
    console.error(err.stack);
});

// Jalankan bot
console.log('╔═════════════════════════════════════════╗');
console.log('║          REZIUM-V2 WHATSAPP BOT          ║');
console.log('╚═════════════════════════════════════════╝');
debugLog('Memulai bot...');

// Mulai server dan tunnel sebelum memulai bot
startServer().then(({ server, tunnelUrl: url }) => {
    tunnelUrl = url;
    debugLog(`Server dan tunnel siap, URL: ${tunnelUrl}`);
    startBot().catch(err => {
        debugLog(`Fatal error: ${err.message}`);
        console.error(err.stack);
    });
}).catch(err => {
    debugLog(`Error memulai server/tunnel: ${err.message}`);
    startBot().catch(err => {
        debugLog(`Fatal error: ${err.message}`);
        console.error(err.stack);
    });
});