import { Request, Response } from 'express';
import { uploadToImgBB } from '../../utils/imgbb.service';

export async function uploadImageHandler(req: Request, res: Response): Promise<void> {
  try {
    const { image, name } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Image data (base64 string) is required' });
      return;
    }

    const result = await uploadToImgBB(image, name);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Image upload failed'
    });
  }
}
