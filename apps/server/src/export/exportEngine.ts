import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CanvasNode, ExportFormat } from '@collabflow/shared';
import { config } from '../config';

export interface ExportResult {
  filename: string;
  filepath: string;
  contentType: string;
  byteLength: number;
}

export class ExportEngine {
  /**
   * Calculate bounding box enclosing all nodes on the canvas
   */
  static getBoundingBox(nodes: CanvasNode[], padding = 40) {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x + node.width > maxX) maxX = node.x + node.width;
      if (node.y + node.height > maxY) maxY = node.y + node.height;
    }

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = maxX + padding;
    maxY = maxY + padding;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(400, maxX - minX),
      height: Math.max(300, maxY - minY),
    };
  }

  /**
   * Generate vector SVG representation of canvas
   */
  static generateSvg(nodes: CanvasNode[], boardTitle: string): string {
    const bbox = this.getBoundingBox(nodes);
    let elements = '';

    // Sort by zIndex
    const sorted = [...nodes].sort((a, b) => a.zIndex - b.zIndex);

    for (const node of sorted) {
      const relX = node.x - bbox.minX;
      const relY = node.y - bbox.minY;

      if (node.type === 'rectangle') {
        elements += `  <rect x="${relX}" y="${relY}" width="${node.width}" height="${node.height}" rx="8" fill="${node.fill}" stroke="${node.stroke}" stroke-width="${node.strokeWidth}" />\n`;
        if (node.text) {
          elements += `  <text x="${relX + node.width / 2}" y="${relY + node.height / 2}" font-family="sans-serif" font-size="${node.fontSize || 16}" fill="${node.textColor || '#1E293B'}" text-anchor="middle" dominant-baseline="central">${this.escapeXml(node.text)}</text>\n`;
        }
      } else if (node.type === 'circle') {
        const cx = relX + node.width / 2;
        const cy = relY + node.height / 2;
        const r = Math.min(node.width, node.height) / 2;
        elements += `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${node.fill}" stroke="${node.stroke}" stroke-width="${node.strokeWidth}" />\n`;
        if (node.text) {
          elements += `  <text x="${cx}" y="${cy}" font-family="sans-serif" font-size="${node.fontSize || 16}" fill="${node.textColor || '#1E293B'}" text-anchor="middle" dominant-baseline="central">${this.escapeXml(node.text)}</text>\n`;
        }
      } else if (node.type === 'sticky') {
        // Sticky note with drop shadow effect
        elements += `  <g filter="url(#drop-shadow)">\n`;
        elements += `    <rect x="${relX}" y="${relY}" width="${node.width}" height="${node.height}" rx="4" fill="${node.fill}" stroke="${node.stroke}" stroke-width="${node.strokeWidth}" />\n`;
        elements += `    <text x="${relX + 16}" y="${relY + 28}" font-family="sans-serif" font-size="${node.fontSize || 14}" fill="${node.textColor || '#1E293B'}" font-weight="500">${this.escapeXml(node.text || 'Sticky Note')}</text>\n`;
        elements += `  </g>\n`;
      } else if (node.type === 'text') {
        elements += `  <text x="${relX}" y="${relY + (node.fontSize || 18)}" font-family="sans-serif" font-size="${node.fontSize || 18}" fill="${node.textColor || '#F8FAFC'}" font-weight="600">${this.escapeXml(node.text || 'Text')}</text>\n`;
      } else if (node.type === 'arrow') {
        const x2 = relX + node.width;
        const y2 = relY + node.height;
        elements += `  <line x1="${relX}" y1="${relY}" x2="${x2}" y2="${y2}" stroke="${node.stroke}" stroke-width="${Math.max(2, node.strokeWidth)}" marker-end="url(#arrowhead)" />\n`;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">
  <defs>
    <filter id="drop-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity="0.15" />
    </filter>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#64748B" />
    </marker>
  </defs>
  <!-- Background Grid -->
  <rect width="100%" height="100%" fill="#0F172A"/>
  <!-- Title Watermark -->
  <text x="20" y="30" font-family="sans-serif" font-size="12" fill="#475569" font-weight="bold">${this.escapeXml(boardTitle)} • Exported via CollabFlow</text>
  <!-- Canvas Elements -->
${elements}
</svg>`;
  }

  /**
   * Generate PDF document from canvas nodes using pdf-lib
   */
  static async generatePdf(nodes: CanvasNode[], boardTitle: string): Promise<Uint8Array> {
    const bbox = this.getBoundingBox(nodes);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([bbox.width, bbox.height]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw dark background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: bbox.width,
      height: bbox.height,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });

    // Draw header watermark
    page.drawText(`${boardTitle} — CollabFlow Export`, {
      x: 20,
      y: bbox.height - 25,
      size: 10,
      font: boldFont,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });

    const sorted = [...nodes].sort((a, b) => a.zIndex - b.zIndex);

    for (const node of sorted) {
      // In PDF, Y coordinates start from the bottom
      const relX = node.x - bbox.minX;
      const relY = bbox.height - (node.y - bbox.minY) - node.height;
      const color = this.hexToRgb(node.fill);

      if (node.type === 'rectangle' || node.type === 'sticky') {
        page.drawRectangle({
          x: relX,
          y: relY,
          width: node.width,
          height: node.height,
          color: rgb(color.r, color.g, color.b),
        });

        if (node.text) {
          page.drawText(node.text.substring(0, 80), {
            x: relX + 12,
            y: relY + node.height - 24,
            size: 12,
            font: font,
            color: rgb(30 / 255, 41 / 255, 59 / 255),
          });
        }
      } else if (node.type === 'circle') {
        const radius = Math.min(node.width, node.height) / 2;
        page.drawCircle({
          x: relX + radius,
          y: relY + radius,
          size: radius,
          color: rgb(color.r, color.g, color.b),
        });
      } else if (node.type === 'text') {
        page.drawText(node.text || 'Text', {
          x: relX,
          y: relY,
          size: node.fontSize || 16,
          font: boldFont,
          color: rgb(248 / 255, 250 / 255, 252 / 255),
        });
      }
    }

    return await pdfDoc.save();
  }

  static async processExport(
    boardId: string,
    boardTitle: string,
    format: ExportFormat,
    nodes: CanvasNode[]
  ): Promise<ExportResult> {
    const timestamp = Date.now();
    const cleanTitle = boardTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    if (format === 'svg') {
      const svg = this.generateSvg(nodes, boardTitle);
      const filename = `${cleanTitle}_${boardId}_${timestamp}.svg`;
      const filepath = path.join(config.exportsDir, filename);
      await fs.writeFile(filepath, svg, 'utf-8');
      return {
        filename,
        filepath,
        contentType: 'image/svg+xml',
        byteLength: Buffer.byteLength(svg),
      };
    } else if (format === 'pdf') {
      const pdfBytes = await this.generatePdf(nodes, boardTitle);
      const filename = `${cleanTitle}_${boardId}_${timestamp}.pdf`;
      const filepath = path.join(config.exportsDir, filename);
      await fs.writeFile(filepath, Buffer.from(pdfBytes));
      return {
        filename,
        filepath,
        contentType: 'application/pdf',
        byteLength: pdfBytes.byteLength,
      };
    } else if (format === 'json') {
      const json = JSON.stringify(
        {
          boardId,
          boardTitle,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          nodeCount: nodes.length,
          nodes,
        },
        null,
        2
      );
      const filename = `${cleanTitle}_${boardId}_${timestamp}.json`;
      const filepath = path.join(config.exportsDir, filename);
      await fs.writeFile(filepath, json, 'utf-8');
      return {
        filename,
        filepath,
        contentType: 'application/json',
        byteLength: Buffer.byteLength(json),
      };
    } else {
      // Default to high quality SVG labeled as PNG-ready SVG vector image
      const svg = this.generateSvg(nodes, boardTitle);
      const filename = `${cleanTitle}_${boardId}_${timestamp}.svg`;
      const filepath = path.join(config.exportsDir, filename);
      await fs.writeFile(filepath, svg, 'utf-8');
      return {
        filename,
        filepath,
        contentType: 'image/svg+xml',
        byteLength: Buffer.byteLength(svg),
      };
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    if (isNaN(bigint)) return { r: 0.9, g: 0.9, b: 0.9 };
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
    };
  }

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
