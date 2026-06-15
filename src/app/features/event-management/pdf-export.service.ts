import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  ManagedEvent, EventCharge, EventRevenue, EventLineup, BudgetSummary,
  CHARGE_CATEGORIES, REVENUE_SOURCES, ARTIST_ROLES,
} from './event-management.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClickStats {
  totalClicks: number;
  uniqueVisitors: number;
  deviceBreakdown: { device: string; count: number }[];
  utmBreakdown: { source: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly supabase = inject(SupabaseService);

  private readonly categoryMap = new Map(CHARGE_CATEGORIES.map(c => [c.value, c.label]));
  private readonly sourceMap = new Map(REVENUE_SOURCES.map(s => [s.value, s.label]));
  private readonly roleMap = new Map(ARTIST_ROLES.map(r => [r.value, r.label]));

  async exportEventPdf(
    event: ManagedEvent,
    charges: EventCharge[],
    revenues: EventRevenue[],
    lineup: EventLineup[],
    budget: BudgetSummary,
  ): Promise<void> {
    const clickStats = await this.loadClickStats(event.slug);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // ── Header ──
    doc.setFillColor(30, 30, 60);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Bilan — ' + event.name, 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${event.date}  •  ${event.venue}, ${event.city}`, 14, 28);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CH')}`, 14, 35);
    doc.setTextColor(0, 0, 0);
    y = 50;

    // ── Budget summary ──
    y = this.drawSectionTitle(doc, 'Résumé financier', y);
    const profitColor = budget.profit >= 0 ? [34, 139, 34] : [220, 20, 20];

    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Montant (CHF)']],
      body: [
        ['Total charges', this.fmt(budget.totalCharges)],
        ['  dont payées', this.fmt(budget.chargesPaid)],
        ['  dont impayées', this.fmt(budget.chargesUnpaid)],
        ['Total recettes', this.fmt(budget.totalRevenues)],
        ['  dont reçues', this.fmt(budget.revenuesReceived)],
        ['  dont en attente', this.fmt(budget.revenuesPending)],
        ['Résultat net', this.fmt(budget.profit)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 60] },
      styles: { fontSize: 10 },
      didParseCell: (data) => {
        if (data.row.index === 6 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = profitColor as [number, number, number];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Charges detail ──
    if (charges.length > 0) {
      y = this.checkPageBreak(doc, y, 30);
      y = this.drawSectionTitle(doc, 'Détail des charges', y);
      autoTable(doc, {
        startY: y,
        head: [['Catégorie', 'Libellé', 'Montant (CHF)', 'Payé']],
        body: charges.map(c => [
          this.categoryMap.get(c.category) ?? c.category,
          c.label,
          this.fmt(c.amount),
          c.is_paid ? 'Oui' : 'Non',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [220, 53, 69] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Revenues detail ──
    if (revenues.length > 0) {
      y = this.checkPageBreak(doc, y, 30);
      y = this.drawSectionTitle(doc, 'Détail des recettes', y);
      autoTable(doc, {
        startY: y,
        head: [['Source', 'Libellé', 'Montant (CHF)', 'Reçu']],
        body: revenues.map(r => [
          this.sourceMap.get(r.source) ?? r.source,
          r.label,
          this.fmt(r.amount),
          r.is_received ? 'Oui' : 'Non',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [40, 167, 69] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Lineup ──
    if (lineup.length > 0) {
      y = this.checkPageBreak(doc, y, 30);
      y = this.drawSectionTitle(doc, 'Lineup', y);
      autoTable(doc, {
        startY: y,
        head: [['Artiste', 'Rôle', 'Horaire', 'Cachet (CHF)', 'Confirmé']],
        body: lineup.map(a => [
          a.artist_name,
          this.roleMap.get(a.role) ?? a.role,
          a.set_time ?? '—',
          this.fmt(a.fee ?? 0),
          a.is_confirmed ? 'Oui' : 'En attente',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [111, 66, 193] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Click stats ──
    y = this.checkPageBreak(doc, y, 50);
    y = this.drawSectionTitle(doc, 'Statistiques de clics', y);
    autoTable(doc, {
      startY: y,
      head: [['Métrique', 'Valeur']],
      body: [
        ['Total clics', String(clickStats.totalClicks)],
        ['Visiteurs uniques', String(clickStats.uniqueVisitors)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 60] },
      styles: { fontSize: 10 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Device breakdown ──
    if (clickStats.deviceBreakdown.length > 0) {
      y = this.checkPageBreak(doc, y, 25);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Répartition par appareil', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Appareil', 'Clics']],
        body: clickStats.deviceBreakdown.map(d => [d.device, String(d.count)]),
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── UTM breakdown ──
    if (clickStats.utmBreakdown.length > 0) {
      y = this.checkPageBreak(doc, y, 25);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Sources de trafic (UTM)', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Source', 'Clics']],
        body: clickStats.utmBreakdown.map(u => [u.source, String(u.count)]),
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34] },
        styles: { fontSize: 9 },
      });
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `HM-Events — ${event.name} — Page ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    }

    // Save
    const filename = `bilan_${event.slug}_${event.date}.pdf`;
    doc.save(filename);
  }

  private async loadClickStats(eventSlug: string): Promise<ClickStats> {
    try {
      const [totalClicks, uniqueVisitors, deviceBreakdown, utmBreakdown] = await Promise.all([
        this.supabase.getClicksCount(eventSlug),
        this.supabase.getUniqueVisitors(eventSlug),
        this.supabase.getDeviceBreakdown(eventSlug),
        this.supabase.getUtmBreakdown(eventSlug),
      ]);
      return { totalClicks, uniqueVisitors, deviceBreakdown, utmBreakdown };
    } catch {
      return { totalClicks: 0, uniqueVisitors: 0, deviceBreakdown: [], utmBreakdown: [] };
    }
  }

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

  private fmt(amount: number): string {
    return amount.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
