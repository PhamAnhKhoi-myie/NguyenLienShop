const crypto = require('crypto');
const AppError = require('../../utils/appError.util');

const ASSET_TYPE_FOLDER = {
    product: 'products',
    banner: 'banners',
    announcement: 'announcements',
    shop_info: 'shop-info',
    misc: 'misc',
};

class UploadService {
    static createCloudinarySignature({
        asset_type,
        folder,
        public_id,
        tags = [],
        overwrite = false,
        invalidate = true,
    }) {
        const config = this.getCloudinaryConfig();
        const timestamp = Math.floor(Date.now() / 1000);
        const normalizedFolder = this.normalizeFolder(folder, asset_type);

        const paramsToSign = this.compactParams({
            timestamp,
            folder: normalizedFolder,
            public_id,
            tags: tags.length > 0 ? tags.join(',') : undefined,
            overwrite,
            invalidate,
        });

        const signature = this.signParams(paramsToSign, config.apiSecret);

        return {
            cloud_name: config.cloudName,
            api_key: config.apiKey,
            upload_url: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
            signature,
            timestamp: paramsToSign.timestamp,
            folder: paramsToSign.folder,
            public_id: paramsToSign.public_id,
            tags: paramsToSign.tags,
            overwrite: paramsToSign.overwrite,
            invalidate: paramsToSign.invalidate,
            params: {
                ...paramsToSign,
                signature,
            },
        };
    }

    static getCloudinaryConfig() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            throw new AppError(
                'Cloudinary config is missing',
                500,
                'CLOUDINARY_CONFIG_MISSING'
            );
        }

        return {
            cloudName,
            apiKey,
            apiSecret,
        };
    }

    static normalizeFolder(folder, assetType = 'misc') {
        const root = (process.env.CLOUDINARY_UPLOAD_FOLDER || 'nguyen-lien-shop')
            .trim()
            .replace(/^\/+|\/+$/g, '');

        const child = (folder || ASSET_TYPE_FOLDER[assetType] || ASSET_TYPE_FOLDER.misc)
            .trim()
            .replace(/^\/+|\/+$/g, '')
            .replace(/\/+/g, '/');

        if (!root) {
            return child;
        }

        if (child === root || child.startsWith(`${root}/`)) {
            return child;
        }

        return `${root}/${child}`;
    }

    static compactParams(params) {
        return Object.fromEntries(
            Object.entries(params).filter(([, value]) => (
                value !== undefined &&
                value !== null &&
                value !== ''
            ))
        );
    }

    static signParams(params, apiSecret) {
        const signData = Object.keys(params)
            .sort()
            .map((key) => `${key}=${params[key]}`)
            .join('&');

        return crypto
            .createHash('sha1')
            .update(`${signData}${apiSecret}`)
            .digest('hex');
    }
}

module.exports = UploadService;
