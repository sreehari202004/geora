import { v2 as cloudinary } from 'cloudinary';

import { env } from '../../config/env.js';
import { HttpError } from '../../utils/httpError.js';

type UploadProofImageInput = {
  imageBase64?: string;
  imageMimeType?: string;
  localUuid: string;
  organizationId: string;
  taskId: string;
  userId: string;
  watermarkText: string;
};

type UploadedMedia = {
  secureUrl: string;
  publicId: string;
};

type UploadReportAttachmentInput = {
  fileBase64: string;
  fileMimeType: string;
  fileName: string;
  organizationId: string;
  dailyReportId: string;
};

function hasCloudinaryConfig() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export async function uploadProofImage(input: UploadProofImageInput): Promise<UploadedMedia> {
  if (!input.imageBase64) {
    throw new HttpError(400, 'Proof image is required for Cloudinary upload');
  }

  if (!hasCloudinaryConfig()) {
    throw new HttpError(503, 'Cloudinary is not configured');
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });

  const mimeType = input.imageMimeType ?? 'image/jpeg';
  const dataUri = `data:${mimeType};base64,${input.imageBase64}`;
  const upload = await cloudinary.uploader.upload(dataUri, {
    folder: `${env.CLOUDINARY_PROOF_FOLDER}/${input.organizationId}/${input.taskId}`,
    public_id: input.localUuid,
    overwrite: true,
    resource_type: 'image',
    context: {
      local_uuid: input.localUuid,
      organization_id: input.organizationId,
      task_id: input.taskId,
      user_id: input.userId
    }
  });

  return {
    secureUrl: cloudinary.url(upload.public_id, {
      secure: true,
      transformation: [
        {
          overlay: {
            font_family: 'Arial',
            font_size: 28,
            font_weight: 'bold',
            text: input.watermarkText
          },
          color: 'white',
          background: 'rgb:111827',
          gravity: 'south_west',
          x: 18,
          y: 18,
          crop: 'fit'
        }
      ]
    }),
    publicId: upload.public_id
  };
}

export async function uploadReportAttachment(input: UploadReportAttachmentInput): Promise<UploadedMedia> {
  if (!hasCloudinaryConfig()) {
    throw new HttpError(503, 'Cloudinary is not configured');
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });

  const dataUri = `data:${input.fileMimeType};base64,${input.fileBase64}`;
  const upload = await cloudinary.uploader.upload(dataUri, {
    folder: `geora/report-attachments/${input.organizationId}/${input.dailyReportId}`,
    public_id: input.fileName.replace(/\.[^.]+$/, ''),
    overwrite: true,
    resource_type: 'auto'
  });

  return {
    secureUrl: upload.secure_url,
    publicId: upload.public_id
  };
}
