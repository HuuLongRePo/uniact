import ExcelJS from 'exceljs';

export type ExcelPrimitive = string | number | boolean | null | undefined | Date;
export type ExcelRow = ExcelPrimitive[];

function applyColumnWidths(worksheet: ExcelJS.Worksheet, widths?: number[]) {
  if (!widths || widths.length === 0) return;
  worksheet.columns = widths.map((width) => ({ width }));
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function createWorkbookFromSheets(
  sheets: Array<{
    name: string;
    rows: ExcelRow[];
    widths?: number[];
  }>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    applyColumnWidths(worksheet, sheet.widths);
    sheet.rows.forEach((row) => worksheet.addRow(row));
  }

  return workbookToBuffer(workbook);
}

export async function createWorkbookFromJsonSheets(
  sheets: Array<{
    name: string;
    rows: Record<string, ExcelPrimitive>[];
  }>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    const keys = Array.from(
      sheet.rows.reduce((acc, row) => {
        Object.keys(row).forEach((key) => acc.add(key));
        return acc;
      }, new Set<string>())
    );

    if (keys.length > 0) {
      worksheet.columns = keys.map((key) => ({ header: key, key }));
      sheet.rows.forEach((row) => worksheet.addRow(row));
    }
  }

  return workbookToBuffer(workbook);
}
