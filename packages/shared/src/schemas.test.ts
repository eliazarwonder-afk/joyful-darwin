import { describe, it, expect } from 'vitest';
import { CreateBoardSchema, CanvasNodeSchema, ExportRequestSchema } from './schemas';

describe('Shared Schemas Validation', () => {
  it('validates a correct CreateBoard payload', () => {
    const valid = { title: 'Sprint Retrospective', description: 'Q3 planning' };
    const result = CreateBoardSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects an empty board title', () => {
    const invalid = { title: '' };
    const result = CreateBoardSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates a valid CanvasNode', () => {
    const node = {
      id: 'node-1',
      type: 'sticky',
      x: 100,
      y: 200,
      width: 150,
      height: 150,
      fill: '#FEF08A',
      stroke: '#EAB308',
      strokeWidth: 2,
      text: 'Production deployment checklist',
      zIndex: 1,
      updatedBy: 'user-123',
      updatedAt: Date.now(),
    };
    const result = CanvasNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('validates export formats', () => {
    expect(ExportRequestSchema.safeParse({ boardId: 'b1', format: 'png' }).success).toBe(true);
    expect(ExportRequestSchema.safeParse({ boardId: 'b1', format: 'pdf' }).success).toBe(true);
    expect(ExportRequestSchema.safeParse({ boardId: 'b1', format: 'mp4' }).success).toBe(false);
  });
});
