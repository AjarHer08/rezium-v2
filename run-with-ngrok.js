const ngrok = require('ngrok');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// Konfigurasi
const config = {
    port: 3000, // Port yang akan digunakan oleh bot
    authtoken: '32dWPhzRrX1qKbZrzuAjSfOAtT0_55aPdA43KXTRq1BiFTsbw', // Ganti dengan ngrok auth token Anda
    region: 'sg', // Region server ngrok (sg = Singapore)
    botPath: path.join(__dirname, 'index.js') // Path ke file index.js
};

// Fungsi untuk log dengan timestamp
const log = (message) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
};

// Fungsi untuk memeriksa apakah port tersedia
const checkPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false);
        });
    });
};

// Fungsi untuk memulai ngrok
const startNgrok = async () => {
    try {
        log('Memulai ngrok tunnel...');
        
        // Cek apakah port tersedia
        const portAvailable = await checkPortAvailable(config.port);
        if (!portAvailable) {
            log(`Port ${config.port} sudah digunakan, mencoba port lain...`);
            config.port = 3001; // Port alternatif jika port utama tidak tersedia
        }
        
        // Set authtoken jika ada
        if (config.authtoken && config.authtoken !== 'YOUR_NGROK_AUTH_TOKEN') {
            ngrok.authtoken(config.authtoken);
        }
        
        // Mulai tunnel ngrok
        const url = await ngrok.connect({
            proto: 'http',
            addr: config.port,
            region: config.region
        });
        
        log(`Ngrok tunnel aktif di: ${url}`);
        
        // Simpan URL ke file
        await fs.writeFile('ngrok-url.txt', url);
        log('URL ngrok disimpan ke file ngrok-url.txt');
        
        return url;
    } catch (error) {
        log(`Error saat memulai ngrok: ${error.message}`);
        throw error;
    }
};

// Fungsi untuk menghentikan ngrok
const stopNgrok = async () => {
    try {
        log('Menghentikan ngrok tunnel...');
        await ngrok.kill();
        log('Ngrok tunnel berhasil dihentikan');
    } catch (error) {
        log(`Error saat menghentikan ngrok: ${error.message}`);
    }
};

// Fungsi untuk memulai bot
const startBot = () => {
    return new Promise((resolve, reject) => {
        log('Memulai bot WhatsApp...');
        
        // Set environment variable untuk port
        process.env.PORT = config.port;
        
        // Jalankan bot sebagai child process
        const botProcess = exec(`node "${config.botPath}"`, (error, stdout, stderr) => {
            if (error) {
                log(`Error menjalankan bot: ${error.message}`);
                reject(error);
                return;
            }
            
            if (stderr) {
                log(`stderr: ${stderr}`);
            }
            
            log(`Bot keluar dengan kode: ${botProcess.exitCode}`);
            resolve();
        });
        
        // Tangani output dari bot
        botProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        
        botProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        // Tangani ketika bot keluar
        botProcess.on('exit', (code) => {
            log(`Bot process exited with code ${code}`);
        });
        
        // Tangani error
        botProcess.on('error', (error) => {
            log(`Bot process error: ${error.message}`);
            reject(error);
        });
    });
};

// Fungsi utama
const main = async () => {
    try {
        // Tampilkan banner
        console.log('╔═════════════════════════════════════════╗');
        console.log('║    REZIUM-V2 WHATSAPP BOT    ║');
        console.log('╚═════════════════════════════════════════╝');
        
        // Mulai ngrok
        const ngrokUrl = await startNgrok();
        
        // Mulai bot
        await startBot();
    } catch (error) {
        log(`Error di main: ${error.message}`);
        process.exit(1);
    } finally {
        // Hentikan ngrok saat bot berhenti
        await stopNgrok();
        log('Aplikasi dihentikan');
    }
};

// Tangani sinyl untuk keluar dengan grace
process.on('SIGINT', async () => {
    log('Menerima SIGINT, menghentikan aplikasi...');
    await stopNgrok();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Menerima SIGTERM, menghentikan aplikasi...');
    await stopNgrok();
    process.exit(0);
});

// Jalankan aplikasi
main();