const mongoose = require('mongoose');
const slugify = require('slugify');

const blogThumbnailSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            trim: true,
        },
        public_id: {
            type: String,
            trim: true,
        },
        alt: {
            type: String,
            trim: true,
            maxlength: 200,
        },
    },
    { _id: false }
);

const blogSeoSchema = new mongoose.Schema(
    {
        meta_title: {
            type: String,
            trim: true,
            maxlength: 160,
        },
        meta_description: {
            type: String,
            trim: true,
            maxlength: 300,
        },
        keywords: {
            type: [String],
            default: [],
        },
    },
    { _id: false }
);

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 180,
        },
        slug: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            maxlength: 220,
        },
        excerpt: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 500,
        },
        content: {
            type: String,
            required: true,
            minlength: 20,
        },
        thumbnail: {
            type: blogThumbnailSchema,
            default: {},
        },
        category: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        tags: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
            default: 'DRAFT',
            index: true,
        },
        author_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        published_at: {
            type: Date,
            default: null,
            index: true,
        },
        view_count: {
            type: Number,
            default: 0,
            min: 0,
        },
        seo: {
            type: blogSeoSchema,
            default: {},
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        collection: 'blogs',
    }
);

blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ status: 1, published_at: -1, created_at: -1 });
blogSchema.index({ category: 1, status: 1, published_at: -1 });
blogSchema.index({ tags: 1, status: 1 });
blogSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });

blogSchema.pre('validate', function (next) {
    if (!this.slug && this.title) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true,
            locale: 'en',
        });
    }

    next();
});

const sanitizeTransform = (_, ret) => {
    delete ret.__v;
    return ret;
};

blogSchema.set('toJSON', { transform: sanitizeTransform });
blogSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('Blog', blogSchema);
