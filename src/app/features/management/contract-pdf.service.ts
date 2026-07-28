import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { ArtistContract } from './management.model';
import { ISSUER } from '../event-management/invoice-pdf.service';

const NAVY: [number, number, number] = [30, 30, 60];
const GRAY_TEXT: [number, number, number] = [130, 130, 145];

@Injectable({ providedIn: 'root' })
export class ContractPdfService {
  async exportContractPdf(contract: ArtistContract, artistName: string): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const width = pageWidth - margin * 2;
    let y = 20;

    // ── Titre ──
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('CONTRAT DE PRESTATION ARTISTIQUE', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // ── Parties ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTRE', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const clientLines = [
      contract.client_name,
      ...(contract.client_address ?? '').split('\n').filter(Boolean),
      'ci-après « l\'Organisateur »',
    ];
    for (const line of clientLines) {
      doc.text(line, margin + 4, y);
      y += 4.5;
    }
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ET', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const artistLines = [
      `${ISSUER.name} — artiste « ${artistName} »`,
      ...ISSUER.addressLines,
      `${ISSUER.phone} · ${ISSUER.email}`,
      `N° IDE ${ISSUER.ide}`,
      'ci-après « l\'Artiste »',
    ];
    for (const line of artistLines) {
      doc.text(line, margin + 4, y);
      y += 4.5;
    }
    y += 6;

    // ── Articles ──
    const dateLong = this.dateLong(contract.event_date);
    const lieu = [contract.venue, contract.city].filter(Boolean).join(', ') || 'à définir';
    const articles: [string, string][] = [
      [
        'Article 1 — Objet',
        `L'Organisateur engage l'Artiste pour une prestation de DJ (« ${artistName} ») dans le cadre de l'événement organisé le ${dateLong}.`,
      ],
      [
        'Article 2 — Date, lieu et horaires',
        `La prestation aura lieu le ${dateLong} à ${lieu}${contract.schedule ? `, de ${contract.schedule}` : ''}. L'Artiste se présentera sur place au minimum 30 minutes avant le début de sa prestation.`,
      ],
      [
        'Article 3 — Cachet et modalités de paiement',
        `En contrepartie de la prestation, l'Organisateur versera à l'Artiste un cachet de ${this.fmt(contract.fee)} CHF net. Modalités : ${contract.payment_terms}. TVA non applicable — prestataire non assujetti à la TVA suisse.`,
      ],
      [
        'Article 4 — Obligations des parties',
        `L'Organisateur met à disposition une installation de sonorisation en état de fonctionnement et adaptée à la prestation (table de mixage, retours, câblage). L'Artiste s'engage à fournir une prestation professionnelle et à respecter les horaires convenus.`,
      ],
      [
        'Article 5 — Annulation',
        `En cas d'annulation par l'Organisateur moins de 14 jours avant l'événement, 50% du cachet reste dû ; moins de 48 heures avant, la totalité du cachet est due. En cas de force majeure dûment justifiée, les parties sont libérées de leurs obligations sans indemnité.`,
      ],
      [
        'Article 6 — Clauses particulières',
        contract.clauses?.trim() || 'Néant.',
      ],
    ];

    for (const [title, body] of articles) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(title, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(body, width);
      doc.text(lines, margin, y);
      y += lines.length * 4.4 + 5;
    }

    // ── Signatures ──
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 25;
    }
    y += 4;
    doc.setFontSize(9.5);
    doc.text(`Fait à ${ISSUER.city.split(',')[0]}, le ${this.dateLong(this.today())}, en deux exemplaires.`, margin, y);
    y += 14;

    const colW = width / 2 - 8;
    doc.setFont('helvetica', 'bold');
    doc.text("L'Organisateur", margin, y);
    doc.text("L'Artiste", margin + width / 2 + 8, y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('« Lu et approuvé », signature :', margin, y + 5);
    doc.text('« Lu et approuvé », signature :', margin + width / 2 + 8, y + 5);
    doc.setDrawColor(180, 180, 195);
    doc.line(margin, y + 28, margin + colW, y + 28);
    doc.line(margin + width / 2 + 8, y + 28, margin + width / 2 + 8 + colW, y + 28);

    // ── Pied de page ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(`${ISSUER.city}  ·  ${ISSUER.ide}`, pageWidth / 2, pageHeight - 12, { align: 'center' });

    const clientSlug = contract.client_name.replace(/[^a-z0-9]+/gi, '');
    doc.save(`Contrat_${artistName.replace(/[^a-z0-9]+/gi, '')}_${clientSlug}_${contract.event_date}.pdf`);
  }

  private fmt(n: number): string {
    return Number(n).toFixed(2);
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateLong(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('fr-CH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
