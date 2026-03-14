import {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
  SASProtocol,
} from "@azure/storage-blob";
import { ApiError } from "../../lib/ApiError.js";
import { env } from "../../config/env.js";

interface SASTokenOptions {
  expiresInSeconds?: number;
  container?: string;
}

interface CustomSASTokenOptions extends SASTokenOptions {
  permissions?: string;
}

interface SASResult {
  sasUrl: string;
  expiresAt: string;
  expiresIn: number;
  permissions: string;
  contentType?: string;
}

interface ValidationResult {
  isExpired: boolean;
  expiresAt: string;
  timeRemaining: number;
  shouldRefresh: boolean;
}

class SASTokenService {
  private connectionString: string;
  private containerName: string;
  private accountInfo: { accountName: string; accountKey: string };

  constructor() {
    this.connectionString = env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = env.CONTAINER_NAME || "videos";

    if (!this.connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    this.accountInfo = this._parseConnectionString(this.connectionString);
    if (!this.accountInfo.accountName || !this.accountInfo.accountKey) {
      throw new Error(
        "Failed to parse account credentials from connection string"
      );
    }
  }

  private _parseConnectionString(connStr: string) {
    const parts = connStr.split(";").reduce((acc, part) => {
      const [key, ...valueParts] = part.split("=");
      if (key) acc[key as keyof typeof acc] = valueParts.join("=");
      return acc;
    }, {} as Record<string, string>);

    return {
      accountName: parts.AccountName || "",
      accountKey: parts.AccountKey || "",
    };
  }

  generateReadSASUrl(blobName: string, options: SASTokenOptions = {}): SASResult {
    try {
      const expiresInSeconds = options.expiresInSeconds || 60 * 60; // 1 hour default
      const container = options.container || this.containerName;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      if (typeof blobName !== "string" || blobName.length > 1024) {
        throw new ApiError(400, "Invalid blob name format");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // READ ONLY
        startsOn: now,
        expiresOn,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const encodedBlob = blobName.split("/").map(encodeURIComponent).join("/");
      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${encodedBlob}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: expiresInSeconds,
        permissions: "r",
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to generate SAS URL for download"
      );
    }
  }

  generateWriteSASUrl(blobName: string, options: SASTokenOptions = {}): SASResult {
    try {
      let expiresInSeconds = options.expiresInSeconds || 15 * 60; // 15 minutes default
      const maxExpirySeconds = 24 * 60 * 60; // 24 hours max
      expiresInSeconds = Math.min(expiresInSeconds, maxExpirySeconds);
      const container = options.container || this.containerName;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      if (typeof blobName !== "string" || blobName.length > 1024) {
        throw new ApiError(400, "Invalid blob name format");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("cw"), // CREATE + WRITE (no DELETE)
        startsOn: now,
        expiresOn,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${encodeURIComponent(blobName)}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: expiresInSeconds,
        permissions: "cw",
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to generate SAS URL for upload"
      );
    }
  }

  generateHLSPlaylistSASUrl(blobName: string, options: SASTokenOptions = {}): SASResult {
    try {
      const expiresInSeconds = options.expiresInSeconds || 24 * 60 * 60; // 24 hours
      const container = options.container || this.containerName;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // READ ONLY
        startsOn: now,
        expiresOn,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const encodedBlob = blobName.split("/").map(encodeURIComponent).join("/");
      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${encodedBlob}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: expiresInSeconds,
        permissions: "r",
        contentType: "application/x-mpegURL",
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Failed to generate SAS URL for HLS playlist"
      );
    }
  }

  validateSASTokenExpiry(sasUrl: string): ValidationResult {
    try {
      if (!sasUrl) {
        throw new ApiError(400, "SAS URL is required");
      }

      const urlParams = new URL(sasUrl);
      const seParam = urlParams.searchParams.get("se");

      if (!seParam) {
        throw new ApiError(400, "Invalid SAS URL: missing expiry parameter");
      }

      const expiresAt = new Date(seParam);
      const now = new Date();
      const timeRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

      return {
        isExpired: timeRemaining <= 0,
        expiresAt: expiresAt.toISOString(),
        timeRemaining,
        shouldRefresh: timeRemaining < 5 * 60,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, "Invalid SAS URL format");
    }
  }

  generateCustomSASUrl(blobName: string, options: CustomSASTokenOptions = {}): SASResult {
    try {
      const {
        permissions = "r",
        expiresInSeconds = 60 * 60,
        container = this.containerName,
      } = options;

      if (!blobName) {
        throw new ApiError(400, "Blob name is required");
      }

      const allowedPermissions = [
        "r", "c", "w", "d", "rc", "rw", "cd", "cw", "cwd", "rcd", "rcw", "rcwd",
      ];
      const permKey = permissions.split("").sort().join("");

      if (!allowedPermissions.includes(permKey)) {
        throw new ApiError(
          400,
          `Invalid permissions: ${permissions}. Allowed: r, c, w, d and combinations`
        );
      }

      const maxExpirySeconds = 24 * 60 * 60; // 24 hours
      const finalExpiry = Math.min(expiresInSeconds, maxExpirySeconds);

      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountInfo.accountName,
        this.accountInfo.accountKey
      );

      const now = new Date();
      const expiresOn = new Date(now.valueOf() + finalExpiry * 1000);

      const sasOptions = {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: now,
        expiresOn,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();

      const sasUrl = `https://${this.accountInfo.accountName}.blob.core.windows.net/${container}/${encodeURIComponent(blobName)}?${sasToken}`;

      return {
        sasUrl,
        expiresAt: expiresOn.toISOString(),
        expiresIn: finalExpiry,
        permissions,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to generate SAS URL");
    }
  }
}

export const sasTokenService = new SASTokenService();
