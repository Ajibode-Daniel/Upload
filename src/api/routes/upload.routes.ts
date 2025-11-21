import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', upload.single('file'), uploadController.uploadFile);
router.get('/info', uploadController.getUploadInfo);

export default router;