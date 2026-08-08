import { Injectable } from '@angular/core';
import { EventGuestlist, ManagedEvent } from './event-management.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({ providedIn: 'root' })
export class GuestlistExportService {

  // ── PDF ──────────────────────────────────────────────────
  exportPdf(event: ManagedEvent, guestlists: EventGuestlist[]): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // ── Header ──
    doc.setFillColor(30, 30, 60);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Guestlists — ' + event.name, 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${event.date}  •  ${event.venue}, ${event.city}`, 14, 28);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CH')}`, 14, 35);
    doc.setTextColor(0, 0, 0);
    y = 50;

    // ── Summary ──
    const totalGuests = guestlists.reduce((s, gl) => s + (gl.entries?.length ?? 0), 0);
    const totalPersons = guestlists.reduce(
      (s, gl) => s + (gl.entries ?? []).reduce((a, e) => a + 1 + e.accompagnants, 0), 0,
    );
    const totalCapacity = guestlists.reduce((s, gl) => s + gl.quota, 0);
    const totalCheckedIn = guestlists.reduce(
      (s, gl) => s + (gl.entries ?? []).filter(e => e.is_checked_in).length, 0,
    );

    y = this.drawSectionTitle(doc, 'Résumé', y);
    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Nombre de guestlists', String(guestlists.length)],
        ['Total invités (noms)', String(totalGuests)],
        ['Total personnes (+ accompagnants)', String(totalPersons)],
        ['Capacité totale', String(totalCapacity)],
        ['Check-in effectués', String(totalCheckedIn)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 60] },
      styles: { fontSize: 10 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Per-artist guestlists ──
    for (const gl of guestlists) {
      y = this.checkPageBreak(doc, y, 30);
      const entries = gl.entries ?? [];
      const checkedIn = entries.filter(e => e.is_checked_in).length;
      const subtitle = `${entries.length}/${gl.quota} invités — ${checkedIn} check-in`;
      y = this.drawSectionTitle(doc, `${gl.artist_name}  (${subtitle})`, y);

      if (entries.length === 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('Aucun invité', 14, y);
        y += 8;
      } else {
        autoTable(doc, {
          startY: y,
          head: [['#', 'Nom', 'Acc.', 'Remarques', 'Check-in']],
          body: [...entries]
            .sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'fr'))
            .map((e, i) => [
              String(i + 1),
              e.guest_name,
              e.accompagnants > 0 ? `+${e.accompagnants}` : '—',
              e.remarks ?? '—',
              e.is_checked_in ? '✓' : '',
            ]),
          theme: 'striped',
          headStyles: { fillColor: [111, 66, 193] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 10 },
            2: { cellWidth: 15, halign: 'center' as const },
            4: { cellWidth: 20, halign: 'center' as const },
          },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `HM-Events — Guestlists ${event.name} — Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    }

    doc.save(`guestlists_${event.slug}_${event.date}.pdf`);
  }

  // ── PDF regroupé (A→Z, sans artistes ni résumé) ──────────
  exportMergedPdf(event: ManagedEvent, guestlists: EventGuestlist[]): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Header ──
    doc.setFillColor(30, 30, 60);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Guestlist — ' + event.name, 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${event.date}  •  ${event.venue}, ${event.city}`, 14, 28);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CH')}`, 14, 35);
    doc.setTextColor(0, 0, 0);

    // ── Toutes les entrées fusionnées, triées A→Z ──
    const entries = guestlists
      .flatMap(gl => gl.entries ?? [])
      .sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'fr'));

    if (entries.length === 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('Aucun invité', 14, 55);
    } else {
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Nom', 'Acc.', 'Remarques', 'Check-in']],
        body: entries.map((e, i) => [
          String(i + 1),
          e.guest_name,
          e.accompagnants > 0 ? `+${e.accompagnants}` : '—',
          e.remarks ?? '—',
          e.is_checked_in ? '✓' : '',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [111, 66, 193] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          2: { cellWidth: 15, halign: 'center' as const },
          4: { cellWidth: 20, halign: 'center' as const },
        },
        margin: { top: 45 },
      });
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `HM-Events — Guestlist ${event.name} — Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    }

    doc.save(`guestlist_az_${event.slug}_${event.date}.pdf`);
  }

  // ── Excel ────────────────────────────────────────────────
  async exportExcel(event: ManagedEvent, guestlists: EventGuestlist[]): Promise<void> {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = guestlists.map(gl => {
      const entries = gl.entries ?? [];
      return {
        Artiste: gl.artist_name,
        Invités: entries.length,
        Quota: gl.quota,
        Accompagnants: entries.reduce((s, e) => s + e.accompagnants, 0),
        'Total personnes': entries.reduce((s, e) => s + 1 + e.accompagnants, 0),
        'Check-in': entries.filter(e => e.is_checked_in).length,
      };
    });
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Résumé');

    // Per-artist sheets
    for (const gl of guestlists) {
      const entries = [...(gl.entries ?? [])]
        .sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'fr'))
        .map((e, i) => ({
          '#': i + 1,
          Nom: e.guest_name,
          Accompagnants: e.accompagnants,
          Remarques: e.remarks ?? '',
          'Check-in': e.is_checked_in ? 'Oui' : 'Non',
        }));

      // Excel sheet name max 31 chars, no special chars
      const sheetName = gl.artist_name
        .replace(/[\\/*?[\]:]/g, '')
        .substring(0, 31);

      const sheet = XLSX.utils.json_to_sheet(
        entries.length > 0 ? entries : [{ Nom: 'Aucun invité' }],
      );
      sheet['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 14 }, { wch: 25 }, { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }

    XLSX.writeFile(wb, `guestlists_${event.slug}_${event.date}.xlsx`);
  }

  // ── Clipboard ────────────────────────────────────────────
  copyAllToClipboard(guestlists: EventGuestlist[]): void {
    if (guestlists.length === 0) return;

    const blocks = guestlists.map(gl => {
      const entries = [...(gl.entries ?? [])]
        .sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'fr'))
        .map(e => {
          let line = `  ${e.guest_name}`;
          if (e.accompagnants > 0) line += ` (+${e.accompagnants})`;
          if (e.remarks) line += ` — ${e.remarks}`;
          if (e.is_checked_in) line += ` ✓`;
          return line;
        });
      const count = (gl.entries ?? []).length;
      return `${gl.artist_name} (${count}/${gl.quota})\n${'—'.repeat(30)}\n${entries.join('\n')}`;
    });

    navigator.clipboard.writeText(blocks.join('\n\n'));
  }

  // ── Helpers ──────────────────────────────────────────────
  private drawSectionTitle(doc: jsPDF, title: string, y: number): number {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 60);
    doc.text(title, 14, y);
    doc.setTextColor(0, 0, 0);
    return y + 6;
  }

  private checkPageBreak(doc: jsPDF, y: number, needed: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      return 15;
    }
    return y;
  }
}
