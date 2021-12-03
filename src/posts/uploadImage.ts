import express, { NextFunction, Request, Response } from "express";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand
} from "@aws-sdk/client-s3";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: "private.assets.art-flex.co",
      Key: "gary.jpeg"
    });
    const url = await getSignedUrl(req.app.locals.S3Client, command, {
      expiresIn: 3600
    });
    res.send({ url });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

async function createUpload(req: Request, res: Response) {
  try {
    const uploadId = req.headers["x-upload-id"] as string;
    const totalChunks = parseInt(req.headers["x-total-chunks"] as string, 10);

    if (uploadId in req.app.locals.S3Uploads) {
      res.status(500).send({
        statusMessage: `AWS multi-part upload for upload-id ${uploadId} currently in progress.`
      });
    }

    req.app.locals.S3Uploads[uploadId] = {
      chunksProcessed: 0,
      totalChunks,
      chunks: {},
      awsUploadId: null
    };

    const createMultipartUpload = new CreateMultipartUploadCommand({
      Bucket: "private.assets.art-flex.co",
      ContentType: "application/octet-stream",
      Key: uploadId
    });
    const { UploadId: awsUploadId } = await req.app.locals.S3Client.send(
      createMultipartUpload
    );
    req.app.locals.S3Uploads[uploadId].awsUploadId = awsUploadId;
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}

async function uploadPart(req: Request, res: Response, next: NextFunction) {
  try {
    const uploadId = req.headers["x-upload-id"] as string;
    const totalChunks = parseInt(req.headers["x-total-chunks"] as string, 10);
    const currentChunkNumber = parseInt(
      req.headers["x-current-chunk-number"] as string,
      10
    );

    if (
      !("awsUploadId" in req.app.locals.S3Uploads[uploadId]) ||
      req.app.locals.S3Uploads[uploadId].awsUploadId === null
    ) {
      res.sendStatus(500);
    }
    const uploadPartCommand = new UploadPartCommand({
      Bucket: "private.assets.art-flex.co",
      UploadId: req.app.locals.S3Uploads[uploadId].awsUploadId,
      Key: uploadId,
      PartNumber: currentChunkNumber,
      Body: req.body
    });
    const { ETag } = await req.app.locals.S3Client.send(uploadPartCommand);

    req.app.locals.S3Uploads[uploadId].chunksProcessed += 1;
    req.app.locals.S3Uploads[uploadId].chunks[currentChunkNumber] = ETag;

    if (req.app.locals.S3Uploads[uploadId].chunksProcessed === totalChunks) {
      next();
    } else {
      res.sendStatus(206);
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
}
async function completeUpload(req: Request, res: Response) {
  try {
    const uploadId = req.headers["x-upload-id"] as string;
    const completeMultipartUpload = new CompleteMultipartUploadCommand({
      Bucket: "private.assets.art-flex.co",
      Key: uploadId,
      UploadId: req.app.locals.S3Uploads[uploadId].awsUploadId,
      MultipartUpload: {
        Parts: Object.keys(req.app.locals.S3Uploads[uploadId].chunks).map(
          key => ({
            PartNumber: parseInt(key, 10),
            ETag: req.app.locals.S3Uploads[uploadId].chunks[key]
          })
        )
      }
    });
    await req.app.locals.S3Client.send(completeMultipartUpload);
    delete req.app.locals.S3Uploads[uploadId];
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
}

router.post("/createUpload", createUpload);

router.post(
  "/uploadPart",
  express.raw({ limit: "20mb" }),
  uploadPart,
  completeUpload
);

// router.post("/studio/sell_item", async (req, res) => {});

export default router;
