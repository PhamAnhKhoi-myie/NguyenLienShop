const asyncHandler = require('../../utils/asyncHandler.util');
const BlogService = require('./blog.service');

const getActorId = (user) => user?.id || user?.userId;

const getPublishedBlogs = asyncHandler(async (req, res) => {
    const result = await BlogService.getPublishedBlogs(
        req.query.page,
        req.query.limit,
        {
            category: req.query.category,
            tag: req.query.tag,
            content_type: req.query.content_type,
            search: req.query.search,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getPublishedBlogsByCategory = asyncHandler(async (req, res) => {
    const result = await BlogService.getPublishedBlogs(
        req.query.page,
        req.query.limit,
        {
            category: req.params.category,
            tag: req.query.tag,
            content_type: req.query.content_type,
            search: req.query.search,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getPublishedBlogBySlug = asyncHandler(async (req, res) => {
    const blog = await BlogService.getPublishedBlogBySlug(req.params.slug);

    res.status(200).json({
        success: true,
        data: blog,
    });
});

const getAdminBlogs = asyncHandler(async (req, res) => {
    const result = await BlogService.getAdminBlogs(
        req.query.page,
        req.query.limit,
        {
            status: req.query.status,
            content_type: req.query.content_type,
            category: req.query.category,
            tag: req.query.tag,
            search: req.query.search,
        }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const getAdminBlogById = asyncHandler(async (req, res) => {
    const blog = await BlogService.getAdminBlogById(req.params.id);

    res.status(200).json({
        success: true,
        data: blog,
    });
});

const createBlog = asyncHandler(async (req, res) => {
    const blog = await BlogService.createBlog(getActorId(req.user), req.body);

    res.status(201).json({
        success: true,
        data: blog,
        message: 'Blog created successfully',
    });
});

const updateBlog = asyncHandler(async (req, res) => {
    const blog = await BlogService.updateBlog(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: blog,
        message: 'Blog updated successfully',
    });
});

const publishBlog = asyncHandler(async (req, res) => {
    const blog = await BlogService.publishBlog(req.params.id);

    res.status(200).json({
        success: true,
        data: blog,
        message: 'Blog published successfully',
    });
});

const archiveBlog = asyncHandler(async (req, res) => {
    const blog = await BlogService.archiveBlog(req.params.id);

    res.status(200).json({
        success: true,
        data: blog,
        message: 'Blog archived successfully',
    });
});

module.exports = {
    getPublishedBlogs,
    getPublishedBlogsByCategory,
    getPublishedBlogBySlug,
    getAdminBlogs,
    getAdminBlogById,
    createBlog,
    updateBlog,
    publishBlog,
    archiveBlog,
};
