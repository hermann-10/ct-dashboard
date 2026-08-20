import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ManagedEvent } from './event-management.model';
import { EventInvoice, invoiceTotal } from './invoice.model';

// ── Coordonnées de l'émetteur (HM-Events) ──
export const ISSUER = {
  brand: 'HM-Events',
  name: 'Hermann Manuel',
  addressLines: ['Chemin du Vieux-Bureau 98', '1217 Meyrin, Suisse'],
  phone: '+41 79 193 03 61',
  email: 'info@djherzo.com',
  website: 'djherzo.com',
  city: 'Genève, Suisse',
  ide: 'CHE-343.412.973',
  payment: {
    beneficiary: 'Hermann MANUEL',
    iban: 'CH75 8080 8008 5337 9297 4',
    bank: 'Raiffeisen Schweiz Genossenschaft, Raiffeisenplatz 4, 9001 St. Gallen',
    bic: 'RAIFCH22XXX',
  },
  attestation: [
    "J'atteste être inscrit comme",
    'indépendant auprès de la',
    'caisse de compensation',
    'OCAS.',
  ],
  registration: ['N° affilié : 1716237', 'N° AVS : 756.8027.5667.54', 'N° IDE CHE-343.412.973'],
};

const NAVY: [number, number, number] = [30, 30, 60];
const GRAY_TEXT: [number, number, number] = [130, 130, 145];
const LIGHT_BG: [number, number, number] = [246, 246, 249];

@Injectable({ providedIn: 'root' })
export class InvoicePdfService {
  async exportInvoicePdf(invoice: EventInvoice, event: ManagedEvent | null, filenameSuffix?: string): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;

    // ── Logo ──
    try {
      const logo = await this.loadImage('/hm_logo.png');
      doc.addImage(logo, 'PNG', margin, 14, 16, 16);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...NAVY);
      doc.text('HM', margin, 24);
    }

    // ── Titre ──
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('FACTURE', margin, 42);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.line(margin, 46, pageWidth - margin, 46);

    // ── Blocs DE / FACTURER À / infos ──
    let y = 56;
    const col2 = 82;
    const boxX = 140;
    const boxW = pageWidth - margin - boxX;

    // DE
    this.label(doc, 'DE', margin, y);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(ISSUER.brand, margin, y + 6);
    doc.text(ISSUER.name, margin, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 105);
    let ly = y + 17;
    for (const line of [...ISSUER.addressLines, ISSUER.phone, ISSUER.email]) {
      doc.text(line, margin, ly);
      ly += 4.5;
    }

    // FACTURER À
    this.label(doc, 'FACTURER À', col2, y);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(invoice.client_name, col2, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 105);
    let cy = y + 11.5;
    for (const line of (invoice.client_address ?? '').split('\n').filter(Boolean)) {
      doc.text(line, col2, cy);
      cy += 4.5;
    }
    if (invoice.client_phone) {
      cy += 2;
      doc.text(invoice.client_phone, col2, cy);
    }

    // Encadré infos facture
    doc.setFillColor(...LIGHT_BG);
    doc.rect(boxX, y - 4, boxW, 46, 'F');
    doc.setFillColor(...NAVY);
    doc.rect(boxX, y - 4, 1.2, 46, 'F');
    let by = y + 1;
    const boxPad = boxX + 5;
    const info: [string, string][] = [
      ['N° Facture', String(invoice.invoice_number)],
      ['Date', this.dateLong(invoice.issue_date)],
      ['Échéance', invoice.due_date ? this.dateLong(invoice.due_date) : '—'],
      ['Conditions', invoice.conditions],
    ];
    for (const [lbl, val] of info) {
      this.label(doc, lbl, boxPad, by);
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const wrapped = doc.splitTextToSize(val, boxW - 10);
      doc.text(wrapped, boxPad, by + 4.5);
      by += 4.5 + wrapped.length * 4.5 + 1.5;
    }

    // ── Détail des prestations ──
    y = 112;
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Détail des prestations', margin, y);

    autoTable(doc, {
      startY: y + 4,
      margin: { left: margin, right: margin },
      head: [['Description', 'Montant']],
      body: (invoice.items ?? []).map(it => [
        it.description,
        it.amount !== null && it.amount !== undefined ? `${this.fmt(it.amount)} CHF` : '',
      ]),
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9.5,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9.5,
        cellPadding: 3.2,
        textColor: NAVY,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: LIGHT_BG },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 34, halign: 'right' },
      },
    });

    let afterTable = (doc as any).lastAutoTable.finalY + 8;

    // ── Solde à verser ──
    const total = invoiceTotal(invoice);
    const soldeW = 52;
    const soldeX = pageWidth - margin - soldeW;
    doc.setFillColor(...NAVY);
    doc.rect(soldeX, afterTable, soldeW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('SOLDE À VERSER', soldeX + soldeW - 4, afterTable + 6, { align: 'right' });
    doc.setFontSize(11.5);
    doc.text(`${this.fmt(total)} CHF`, soldeX + soldeW - 4, afterTable + 13.5, { align: 'right' });

    // TVA
    afterTable += 26;
    doc.setTextColor(...GRAY_TEXT);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('TVA : non applicable — prestataire non assujetti à la TVA suisse.', margin, afterTable);

    // ── Coordonnées de paiement ──
    afterTable += 10;
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Coordonnées de paiement', margin, afterTable);
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, afterTable + 2, pageWidth - margin, afterTable + 2);

    let py = afterTable + 9;
    const payRows: [string, string][] = [
      ['Bénéficiaire', ISSUER.payment.beneficiary],
      ['IBAN', ISSUER.payment.iban],
      ['Banque', ISSUER.payment.bank],
      ['BIC/Swift', ISSUER.payment.bic],
      ['Référence', `Facture ${invoice.invoice_number}${event ? ` — ${this.dateLong(event.date)}` : ''}`],
    ];
    for (const [lbl, val] of payRows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(lbl, margin, py);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(val, margin + 46, py);
      py += 5.5;
    }

    // Attestation OCAS
    py += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_TEXT);
    for (const line of ISSUER.attestation) {
      doc.text(line, margin, py);
      py += 3.5;
    }
    py += 2;
    for (const line of ISSUER.registration) {
      doc.text(line, margin, py);
      py += 3.5;
    }

    // Merci
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Merci pour votre confiance.', pageWidth / 2, py + 4, { align: 'center' });

    // ── Footer ──
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(`${ISSUER.city}  ·  ${ISSUER.ide}  |  Page 1`, pageWidth / 2, pageHeight - 16, { align: 'center' });
    doc.text(`${ISSUER.email} – ${ISSUER.website}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    const clientSlug = invoice.client_name.replace(/[^a-z0-9]+/gi, '');
    const eventSlug = (filenameSuffix ?? (event ? event.name : 'Evenement')).replace(/[^a-z0-9]+/gi, '');
    doc.save(`Facture_${invoice.invoice_number}_${clientSlug}_${eventSlug}.pdf`);
  }

  // ── Helpers ──
  private label(doc: jsPDF, text: string, x: number, y: number): void {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(text.toUpperCase(), x, y);
  }

  private fmt(n: number): string {
    return n.toFixed(2);
  }

  private dateLong(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('fr-CH', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  private loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }
}
