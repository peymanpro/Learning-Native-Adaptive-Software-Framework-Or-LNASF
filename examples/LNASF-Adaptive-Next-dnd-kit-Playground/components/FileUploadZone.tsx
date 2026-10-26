
/**
 * FileUploadZone Component
 * 
 * A drag-and-drop file upload zone component for image files.
 * 
 * @description This component provides a complete file upload interface with:
 * - Drag-and-drop functionality with visual feedback during drag operations
 * - File selection via traditional file input dialog
 * - File validation (image types only: JPEG, PNG, GIF, WEBP, max size: 5MB)
 * - Preview thumbnails for uploaded images
 * - Individual file removal and bulk clear functionality
 * - Error messaging for invalid file types or sizes
 * - Responsive grid layout for preview thumbnails
 * 
 * @dependencies
 * - useState, useCallback from React
 * - Card component from "@/components/ui/Card"
 * - FileWithPreview type from "@/types"
 * 
 * @state
 * - files: Array of uploaded files with preview URLs
 * - isDragging: Boolean for visual drag-over state
 * - error: Error message string for validation failures
 * 
 * @performance
 * - Uses URL.createObjectURL() for image previews and properly revokes them on file removal
 * - Callbacks are memoized with useCallback to prevent unnecessary re-renders
 * 
 * @accessibility
 * - Hidden file input with label for keyboard navigation
 * - Visual hover states for interactive elements
 * 
 * @cleanup
 * - Preview URLs are revoked when files are removed or cleared to prevent memory leaks
 */

"use client";

import { useState, useCallback } from "react";
import { Card } from "./ui/Card";
import { FileWithPreview } from "@/types";

export function FileUploadZone() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setError("❌ فقط فایل‌های تصویری (JPEG, PNG, GIF, WEBP) مجاز هستند");
      return false;
    }

    if (file.size > maxSize) {
      setError("❌ حجم فایل نباید بیشتر از 5 مگابایت باشد");
      return false;
    }

    setError("");
    return true;
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles: FileWithPreview[] = [];
    
    // تبدیل FileList به آرایه
    const filesArray = Array.from(fileList);
    
    for (const file of filesArray) {
      if (validateFile(file)) {
        const fileWithPreview = Object.assign(file, {
          preview: URL.createObjectURL(file),
        }) as FileWithPreview;
        newFiles.push(fileWithPreview);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  }, []);

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">📁 آپلود فایل با درگ</h2>
      <p className="text-sm text-gray-500 mb-4">فایل را بکشید و داخل جعبه رها کنید</p>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50 scale-105"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        <div className="text-4xl mb-3">📤</div>
        <p className="text-gray-600 mb-2">فایل را اینجا رها کنید یا</p>
        <label className="cursor-pointer">
          <span className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors inline-block">
            انتخاب فایل
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-400 mt-3">پشتیبانی از JPEG, PNG, GIF, WEBP (حداکثر 5MB)</p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">فایل‌های آپلود شده ({files.length})</h3>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              حذف همه
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
                <p className="text-xs text-gray-500 mt-1 truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}