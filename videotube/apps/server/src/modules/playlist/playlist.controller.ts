import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { playlistService } from './playlist.service.js';
import type { AuthenticatedRequest } from '../../lib/types.js';

export const createPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const { user } = req as AuthenticatedRequest;

  const playlist = await playlistService.createPlaylist(name, description, user._id);
  ApiResponse.send(res, 201, playlist, 'Playlist created successfully');
});

export const getUserPlaylists = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const playlists = await playlistService.getUserPlaylists(userId as string);
  ApiResponse.send(res, 200, playlists, 'User playlists fetched successfully');
});

export const getPlaylistById = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId } = req.params;

  const playlist = await playlistService.getPlaylistById(playlistId as string);
  ApiResponse.send(res, 200, playlist, 'Playlist fetched successfully');
});

export const addVideoToPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId, videoId } = req.params;
  const { user } = req as AuthenticatedRequest;

  const playlist = await playlistService.addVideoToPlaylist(playlistId as string, videoId as string, user._id);
  ApiResponse.send(res, 200, playlist, 'Video added to playlist successfully');
});

export const removeVideoFromPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId, videoId } = req.params;
  const { user } = req as AuthenticatedRequest;

  const playlist = await playlistService.removeVideoFromPlaylist(playlistId as string, videoId as string, user._id);
  ApiResponse.send(res, 200, playlist, 'Video removed from playlist successfully');
});

export const updatePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const { user } = req as AuthenticatedRequest;

  const playlist = await playlistService.updatePlaylist(playlistId as string, { name, description }, user._id);
  ApiResponse.send(res, 200, playlist, 'Playlist updated successfully');
});

export const deletePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId } = req.params;
  const { user } = req as AuthenticatedRequest;

  await playlistService.deletePlaylist(playlistId as string, user._id);
  ApiResponse.send(res, 200, null, 'Playlist deleted successfully');
});
