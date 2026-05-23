export function getPrimaryImage(imagesOrImage) {
    if (!imagesOrImage) {
        return null;
    }

    if (typeof imagesOrImage === 'string') {
        return {
            url: imagesOrImage,
            alt: '',
        };
    }

    if (!Array.isArray(imagesOrImage)) {
        return imagesOrImage?.url ? imagesOrImage : null;
    }

    if (imagesOrImage.length === 0) {
        return null;
    }

    return (
        imagesOrImage.find((image) => image?.is_primary) ||
        [...imagesOrImage].sort(
            (first, second) => (first?.sort_order || 0) - (second?.sort_order || 0)
        )[0]
    );
}
