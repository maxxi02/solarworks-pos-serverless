"use client";

import { useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { Attachment, AttachmentType } from "@/types/chat.types";

function generateTempId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getMimeCategory(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("text/")
  )
    return "document";
  return "other";
}

export function useFileUpload() {
  const { addUploadingFile, updateUploadProgress, removeUploadingFile } =
    useChatStore();

  const uploadFile = useCallback(
    async (file: File): Promise<Attachment | null> => {
      const tempId = generateTempId();
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;

      addUploadingFile({
        id: tempId,
        name: file.name,
        progress: 0,
        previewUrl,
        mimeType: file.type,
        size: file.size,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Use XHR for progress tracking
        const attachment = await new Promise<Attachment>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              updateUploadProgress(tempId, pct);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data as Attachment);
              } catch {
                reject(new Error("Invalid response"));
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Network error")),
          );
          xhr.addEventListener("abort", () =>
            reject(new Error("Upload aborted")),
          );

          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });

        removeUploadingFile(tempId);
        if (previewUrl) URL.revokeObjectURL(previewUrl);

        return {
          ...attachment,
          type: getMimeCategory(file.type),
          name: file.name,
          size: file.size,
          mimeType: file.type,
        };
      } catch (err) {
        console.error("File upload error:", err);
        removeUploadingFile(tempId);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        return null;
      }
    },
    [addUploadingFile, updateUploadProgress, removeUploadingFile],
  );

  const uploadFiles = useCallback(
    async (files: File[]): Promise<Attachment[]> => {
      const results = await Promise.allSettled(files.map(uploadFile));
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Attachment> =>
            r.status === "fulfilled" && r.value !== null,
        )
        .map((r) => r.value);
    },
    [uploadFile],
  );

  return { uploadFile, uploadFiles };
}
