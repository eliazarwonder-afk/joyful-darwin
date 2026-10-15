import { describe, it, expect } from 'vitest';
import { ExportEngine } from './exportEngine';
import { CanvasNode } from '@collabflow/shared';

describe('ExportEngine', () => {
  const sampleNodes: CanvasNode[] = [
    {
      id: 'node-1',
      type: 'sticky',
      x: 100,
      y: 100,
      width: 200,
      height: 180,
      fill: '#FEF08A',
      stroke: '#EAB308',
      strokeWidth: 2,
      text: 'Test Sticky Note',
      zIndex: 1,
      updatedBy: 'TestUser',
      updatedAt: Date.now(),
    },
    {
      id: 'node-2',
      type: 'rectangle',
      x: 400,
      y: 200,
      width: 150,
      height: 100,
      fill: '#BFDBFE',
      stroke: '#3B82F6',
      strokeWidth: 2,
      text: 'Test Rect',
      zIndex: 2,
      updatedBy: 'TestUser',
      updatedAt: Date.now(),
    },
  ];

  it('calculates the bounding box with padding', () => {
    const bbox = ExportEngine.getBoundingBox(sampleNodes, 20);
    expect(bbox.minX).toBe(80);
    expect(bbox.minY).toBe(80);
    expect(bbox.maxX).toBe(570);
    expect(bbox.maxY).toBe(320);
    expect(bbox.width).toBeGreaterThanOrEqual(400);
  });

  it('generates a valid SVG containing all nodes', () => {
    const svg = ExportEngine.generateSvg(sampleNodes, 'Test Board');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Test Sticky Note');
    expect(svg).toContain('Test Rect');
    expect(svg).toContain('</svg>');
  });

  it('generates a PDF document with binary byte length > 0', async () => {
    const pdfBytes = await ExportEngine.generatePdf(sampleNodes, 'Test Board');
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.byteLength).toBeGreaterThan(500);
  });
});
