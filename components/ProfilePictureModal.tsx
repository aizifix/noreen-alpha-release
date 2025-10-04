"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import {
  Upload,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Save,
  X,
} from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { apiPost } from "@/app/utils/api";

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (filePath: string) => void;
  uploadEndpoint: string | any; // Support both string URL and API utility
  userId: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ProfilePictureModal({
  isOpen,
  onClose,
  onUploadSuccess,
  uploadEndpoint,
  userId,
}: ProfilePictureModalProps) {
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || "")
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        setCrop(undefined);
        const reader = new FileReader();
        reader.addEventListener("load", () =>
          setImgSrc(reader.result?.toString() || "")
        );
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = "high";

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    const rotateRads = rotate * (Math.PI / 180);
    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.rotate(rotateRads);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    ctx.restore();
  }, [completedCrop, scale, rotate]);

  const handleUpload = async () => {
    if (!previewCanvasRef.current || !completedCrop) {
      toast({
        title: "Error",
        description: "Please select an area to crop",
        variant: "destructive",
      });
      return;
    }

    if (!userId || userId <= 0) {
      toast({
        title: "Error",
        description: "Invalid user ID",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvasRef.current!.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create image blob"));
            }
          },
          "image/jpeg",
          0.95
        );
      });

      // Create form data
      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");
      formData.append("operation", "uploadProfilePicture");
      formData.append("user_id", userId.toString());
      formData.append("fileType", "profile");

      // Upload to server
      let response;

      if (typeof uploadEndpoint === "string") {
        // String URL - use axios directly
        response = await axios.post(uploadEndpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (typeof uploadEndpoint === "object" && uploadEndpoint.post) {
        // API utility object
        response = await uploadEndpoint.post(formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        throw new Error("Invalid upload endpoint");
      }

      if (response.status === "success") {
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
        onUploadSuccess(response.data.filePath);
        onClose();
        // Reset state
        setImgSrc("");
        setCrop(undefined);
        setCompletedCrop(undefined);
        setScale(1);
        setRotate(0);
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Profile picture upload error:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setRotate(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload Profile Picture</DialogTitle>
          <DialogDescription>
            Upload and crop your profile picture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!imgSrc && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop your image here, or click to select
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Image
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="hidden"
              />
            </div>
          )}

          {imgSrc && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Crop Area */}
                <div>
                  <Label>Crop Area</Label>
                  <div className="mt-2 relative bg-gray-100 rounded-lg overflow-hidden">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      circularCrop
                    >
                      <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imgSrc}
                        style={{
                          transform: `scale(${scale}) rotate(${rotate}deg)`,
                        }}
                        onLoad={onImageLoad}
                        className="max-h-[400px] w-auto mx-auto"
                      />
                    </ReactCrop>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <Label>Preview</Label>
                  <div className="mt-2 flex justify-center items-center bg-gray-100 rounded-lg h-[400px]">
                    <div className="relative">
                      <canvas
                        ref={previewCanvasRef}
                        className="rounded-full border-4 border-white shadow-lg"
                        style={{
                          width: "200px",
                          height: "200px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom: {scale.toFixed(2)}x
                  </Label>
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    max={3}
                    min={0.5}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    Rotate: {rotate}°
                  </Label>
                  <Slider
                    value={[rotate]}
                    onValueChange={(value) => setRotate(value[0])}
                    max={180}
                    min={-180}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImgSrc("");
                    setCrop(undefined);
                    setCompletedCrop(undefined);
                    setScale(1);
                    setRotate(0);
                  }}
                >
                  Change Image
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!completedCrop || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile Picture
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
