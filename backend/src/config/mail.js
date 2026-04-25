const nodemailer = require('nodemailer');

const createTransporter = async () => {
    // Nếu dùng Ethereal (môi trường test)
    if (process.env.MAIL_USE_ETHEREAL === 'true') {
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    // Nếu dùng Gmail (môi trường staging/prod)
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: false, // true cho port 465, false cho port 587
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
};

module.exports = createTransporter;