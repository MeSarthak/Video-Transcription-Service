import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, XCircle, Loader2, Film, X } from "lucide-react";
import api from "../lib/api";
import { fetchVideoStatus, queryKeys } from "../lib/queries";
import type { ApiResponse } from "../types";

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  video: z
    .custom<FileList>()
    .refine((f) => f && f.length > 0, "Video file is required")
    .refine(
      (f) => f && f[0] && f[0].size <= 2000 * 1024 * 1024,
      "Video must be 2GB or less"
    ),
  thumbnail: z.custom<FileList>().optional(),
});

type UploadForm = z.infer<typeof uploadSchema>;

interface UploadResult {
  videoId: string;
  status: "pending";
}

// Number of frames to extract for the picker
const FRAME_COUNT = 5;

/** Extract `count` frames evenly distributed across the video duration.
 *  Returns an array of data-URLs (jpeg). */
async function extractFrames(file: File, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const frames: string[] = [];
    let current = 0;

    const capture = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.85));
      current++;

      if (current < count) {
        // Seek to next position
        const fraction = (current + 1) / (count + 1);
        video.currentTime = video.duration * fraction;
      } else {
        URL.revokeObjectURL(objectUrl);
        resolve(frames);
      }
    };

    video.addEventListener("loadedmetadata", () => {
      // Seek to first position (avoid very start which may be black)
      video.currentTime = video.duration * (1 / (count + 1));
    });

    video.addEventListener("seeked", capture);

    video.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video for frame extraction"));
    });
  });
}

/** Convert a data-URL to a File object */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export function UploadVideo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);

  // Frame picker state
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [extractingFrames, setExtractingFrames] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  // Holds a File derived from a picked frame (injected into the form submission)
  const frameFileRef = useRef<File | null>(null);
  // Whether the user has chosen a real image file (vs a frame)
  const [hasImageFile, setHasImageFile] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
  });

  const { ref: videoRef, onChange: videoOnChange, ...videoRest } = register("video");
  const { ref: thumbRef, onChange: thumbOnChange, ...thumbRest } = register("thumbnail");

  // Poll video status after upload
  const { data: statusData } = useQuery({
    queryKey: queryKeys.videoStatus(uploadedVideoId ?? ""),
    queryFn: () => fetchVideoStatus(uploadedVideoId!),
    enabled: !!uploadedVideoId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "published" || status === "failed") return false;
      return 3000;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UploadForm) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("video", data.video[0]!);

      // Priority: uploaded image file > picked frame
      if (data.thumbnail && data.thumbnail.length > 0) {
        formData.append("thumbnail", data.thumbnail[0]!);
      } else if (frameFileRef.current) {
        formData.append("thumbnail", frameFileRef.current);
      }

      const res = await api.post<ApiResponse<UploadResult>>("/videos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setUploadedVideoId(data.videoId);
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  // Navigate to watch page once published
  useEffect(() => {
    if (statusData?.status === "published" && uploadedVideoId) {
      pollRef.current = setTimeout(() => {
        navigate(`/watch/${uploadedVideoId}`);
      }, 2000);
    }
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [statusData, uploadedVideoId, navigate]);

  const onSubmit = (data: UploadForm) => {
    setUploadProgress(0);
    mutation.mutate(data);
  };

  /** Called when the user selects a video file — extract preview frames */
  const handleVideoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) {
        setVideoName(f.name);
        // Reset any previously picked frame/thumbnail
        setSelectedFrame(null);
        setVideoFrames([]);
        frameFileRef.current = null;
        if (!hasImageFile) setThumbnailPreview(null);

        setExtractingFrames(true);
        try {
          const frames = await extractFrames(f, FRAME_COUNT);
          setVideoFrames(frames);
        } catch {
          // Silently ignore — frame picker just won't show
        } finally {
          setExtractingFrames(false);
        }
      }
      videoOnChange(e);
    },
    [videoOnChange, hasImageFile]
  );

  /** User picks a frame from the picker */
  const handleFramePick = (dataUrl: string) => {
    setSelectedFrame(dataUrl);
    setThumbnailPreview(dataUrl);
    frameFileRef.current = dataUrlToFile(dataUrl, "thumbnail.jpg");
  };

  /** User clears the current thumbnail selection (reverts to auto) */
  const clearThumbnail = () => {
    setThumbnailPreview(null);
    setSelectedFrame(null);
    setHasImageFile(false);
    frameFileRef.current = null;
  };

  // ── Post-upload status screen ─────────────────
  if (uploadedVideoId) {
    const status = statusData?.status;

    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        {status === "published" ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Video Published!</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Redirecting to your video…</p>
          </>
        ) : status === "failed" ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Processing Failed</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Something went wrong during processing. Please try uploading again.
            </p>
            <button
              onClick={() => {
                setUploadedVideoId(null);
                setUploadProgress(0);
                setVideoName(null);
                setThumbnailPreview(null);
                setVideoFrames([]);
                setSelectedFrame(null);
                setHasImageFile(false);
                frameFileRef.current = null;
                mutation.reset();
              }}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-16 h-16 text-indigo-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Processing Video…</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Your video is being transcoded to HLS format. This may take a few minutes.
            </p>
            <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-xs text-gray-400 mt-2 capitalize">Status: {status ?? "pending"}</p>
          </>
        )}
      </div>
    );
  }

  // ── Upload form ───────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upload Video</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {mutation.isError && (
          <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm dark:bg-red-900/30 dark:text-red-400">
            {(mutation.error as any)?.response?.data?.message ?? "Upload failed. Please try again."}
          </div>
        )}

        {/* Video file */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Video File <span className="text-red-500">*</span>
          </label>
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors">
            {videoName ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {videoName}
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click to select or drag & drop your video
                </p>
                <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI — max 2GB</p>
              </>
            )}
            <input
              {...videoRest}
              ref={videoRef}
              type="file"
              accept="video/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleVideoChange}
            />
          </div>
          {errors.video && (
            <p className="mt-1 text-sm text-red-600">{errors.video.message as string}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title")}
            type="text"
            placeholder="Enter video title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Tell viewers about your video…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm resize-none"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
          </label>

          <div className="flex items-start gap-4">
            {/* Preview box */}
            <div className="relative flex-shrink-0">
              {thumbnailPreview ? (
                <>
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-36 aspect-video object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={clearThumbnail}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Clear thumbnail"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="w-36 aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
                  <Film className="w-5 h-5" />
                  <span>Auto</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4" />
                Upload image
                <input
                  {...thumbRest}
                  ref={thumbRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setThumbnailPreview(URL.createObjectURL(f));
                      setSelectedFrame(null);
                      setHasImageFile(true);
                      frameFileRef.current = null;
                    }
                    thumbOnChange(e);
                  }}
                />
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {thumbnailPreview
                  ? hasImageFile
                    ? "Custom image selected"
                    : "Frame selected from video"
                  : "No thumbnail — one will be auto-generated"}
              </p>
            </div>
          </div>

          {/* Frame picker — shown after video is selected and no image file chosen */}
          {videoName && !hasImageFile && (
            <div className="mt-3">
              {extractingFrames ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Extracting frames…
                </div>
              ) : videoFrames.length > 0 ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Or pick a frame from your video:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {videoFrames.map((frame, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleFramePick(frame)}
                        className={`relative rounded-md overflow-hidden border-2 transition-all focus:outline-none ${
                          selectedFrame === frame
                            ? "border-indigo-500 ring-2 ring-indigo-400"
                            : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                        }`}
                        title={`Use frame ${i + 1}`}
                      >
                        <img
                          src={frame}
                          alt={`Frame ${i + 1}`}
                          className="w-24 aspect-video object-cover block"
                        />
                        {selectedFrame === frame && (
                          <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/20">
                            <CheckCircle className="w-5 h-5 text-indigo-600 drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Upload progress */}
        {mutation.isPending && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 text-sm"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload Video
            </>
          )}
        </button>
      </form>
    </div>
  );
}
