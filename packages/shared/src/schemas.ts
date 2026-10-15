import { z } from 'zod';

export const NodeTypeSchema = z.enum(['rectangle', 'circle', 'sticky', 'text', 'arrow']);

export const CanvasNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().nonnegative(),
  text: z.string().optional(),
  fontSize: z.number().positive().optional(),
  textColor: z.string().optional(),
  rotation: z.number().optional(),
  zIndex: z.number(),
  updatedBy: z.string(),
  updatedAt: z.number(),
});

export const CreateBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().max(500).optional(),
});

export const UpdateBoardSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const ExportRequestSchema = z.object({
  boardId: z.string().min(1),
  format: z.enum(['png', 'svg', 'pdf', 'json']),
  scale: z.number().min(1).max(4).default(2),
});

export const AuthRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(50),
});

export const AuthLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;
export type ExportRequestInput = z.infer<typeof ExportRequestSchema>;
export type AuthRegisterInput = z.infer<typeof AuthRegisterSchema>;
export type AuthLoginInput = z.infer<typeof AuthLoginSchema>;
