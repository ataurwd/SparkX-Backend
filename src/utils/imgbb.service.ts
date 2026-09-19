import axios from 'axios';
import FormData from 'form-data';

export interface ImgBBUploadResult {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  thumbUrl?: string;
  deleteUrl?: string;
  size: number;
}

/**
 * Upload an image to ImgBB API
 * Supports Base64 string (without the data:image/...;base64, prefix) or Buffer
 */
export async function uploadToImgBB(
  imageSource: string | Buffer,
  imageName?: string
): Promise<ImgBBUploadResult> {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    console.warn('[ImgBB] Warning: IMGBB_API_KEY is not configured in .env. Returning placeholder fallback URL.');
    return {
      id: 'mock_img_' + Date.now(),
      title: imageName || 'uploaded_image',
      url: typeof imageSource === 'string' && imageSource.startsWith('http') 
        ? imageSource 
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
      displayUrl: typeof imageSource === 'string' && imageSource.startsWith('http') 
        ? imageSource 
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
      size: 1024
    };
  }

  const formData = new FormData();

  if (Buffer.isBuffer(imageSource)) {
    formData.append('image', imageSource.toString('base64'));
  } else {
    // If it includes the data URL scheme (e.g. data:image/png;base64,...), strip it
    const cleanBase64 = imageSource.replace(/^data:image\/[a-z]+;base64,/, '');
    formData.append('image', cleanBase64);
  }

  if (imageName) {
    formData.append('name', imageName);
  }

  try {
    const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, formData, {
      headers: formData.getHeaders()
    });

    if (response.data && response.data.success) {
      const { data } = response.data;
      return {
        id: data.id,
        title: data.title,
        url: data.url,
        displayUrl: data.display_url,
        thumbUrl: data.thumb?.url,
        deleteUrl: data.delete_url,
        size: Number(data.size)
      };
    } else {
      throw new Error(response.data?.error?.message || 'ImgBB upload failed');
    }
  } catch (error: any) {
    console.error('[ImgBB] Upload Error:', error.response?.data || error.message);
    throw new Error(`ImgBB upload error: ${error.response?.data?.error?.message || error.message}`);
  }
}
