const nodemailer = require('nodemailer');

const requiredEnv = (name) => {
    const value = process.env[name];
    if (!value || !String(value).trim()) {
        throw new Error(`${name} is required for mail configuration`);
    }
    return String(value).trim();
};

const parsePort = (value) => {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('MAIL_PORT must be a valid TCP port');
    }
    return port;
};

const parseSecure = (port) => {
    if (process.env.MAIL_SECURE !== undefined) {
        if (!['true', 'false'].includes(process.env.MAIL_SECURE)) {
            throw new Error('MAIL_SECURE must be true or false');
        }
        return process.env.MAIL_SECURE === 'true';
    }
    return port === 465;
};

const validateEmailAddress = (name) => {
    const email = requiredEnv(name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error(`${name} must be a valid email address`);
    }
    return email;
};

const createTransporter = async () => {
    if (process.env.MAIL_USE_ETHEREAL === 'true') {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('MAIL_USE_ETHEREAL cannot be true in production');
        }

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

    const port = parsePort(requiredEnv('MAIL_PORT'));

    requiredEnv('MAIL_FROM_NAME');
    validateEmailAddress('MAIL_FROM_ADDRESS');

    return nodemailer.createTransport({
        host: requiredEnv('MAIL_HOST'),
        port,
        secure: parseSecure(port),
        auth: {
            user: requiredEnv('MAIL_USER'),
            pass: requiredEnv('MAIL_PASS'),
        },
    });
};

module.exports = createTransporter;
