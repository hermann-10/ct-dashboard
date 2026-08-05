import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { ArtistContract } from './management.model';
import { ISSUER } from '../event-management/invoice-pdf.service';

const NAVY: [number, number, number] = [30, 30, 60];
const GRAY_TEXT: [number, number, number] = [130, 130, 145];

/**
 * Contrat de prestation — structure calquée sur le modèle
 * « Contrat Anniversaire » fourni par Hermann (juillet 2024).
 */
@Injectable({ providedIn: 'root' })
export class ContractPdfService {
  async exportContractPdf(contract: ArtistContract, artistName: string): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const width = pageWidth - margin * 2;
    let y = 18;

    const ensureSpace = (needed: number): void => {
      if (y > pageHeight - needed) {
        doc.addPage();
        y = 20;
      }
    };

    const sectionTitle = (title: string): void => {
      ensureSpace(60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text(title, margin, y);
      y += 6;
    };

    const body = (text: string, indent = 0): void => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 55);
      const lines = doc.splitTextToSize(text, width - indent);
      ensureSpace(lines.length * 4.6 + 30);
      doc.text(lines, margin + indent, y);
      y += lines.length * 4.6 + 2.5;
    };

    const bullet = (label: string, value: string): void => {
      doc.setFontSize(10);
      ensureSpace(35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 55);
      doc.text('•  ' + label + ' : ', margin + 3, y);
      const labelWidth = doc.getTextWidth('•  ' + label + ' :  ');
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, width - labelWidth - 6);
      doc.text(lines, margin + 3 + labelWidth, y);
      y += lines.length * 4.6 + 1.5;
    };

    // ── En-tête : lieu et date du jour ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(`Genève, le ${this.dateLong(this.today())}`, margin, y);
    y += 12;

    // ── Titre ──
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Contrat de prestation', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.line(margin + width / 4, y, pageWidth - margin - width / 4, y);
    y += 10;

    // ── Parties ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Entre', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 55);
    const clientLines = [
      contract.client_name,
      ...(contract.client_address ?? '').split('\n').filter(Boolean),
    ];
    for (const line of clientLines) {
      doc.text(line, margin + 4, y);
      y += 4.6;
    }
    doc.setTextColor(...GRAY_TEXT);
    doc.text('ci-après appelé le client, d\'une part', margin + 4, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Et', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 55);
    const artistLines = [
      `${ISSUER.name} (${artistName})`,
      ...ISSUER.addressLines,
      `${ISSUER.phone} · ${ISSUER.email}`,
    ];
    for (const line of artistLines) {
      doc.text(line, margin + 4, y);
      y += 4.6;
    }
    doc.setTextColor(...GRAY_TEXT);
    doc.text('ci-après appelé le prestataire, d\'autre part.', margin + 4, y);
    y += 8;

    doc.setFont('helvetica', 'italic');
    doc.setTextColor(40, 40, 55);
    doc.text('Il est convenu ce qui suit :', margin, y);
    y += 8;

    // ── 1. Objet ──
    const lieu = [contract.venue, contract.city].filter(Boolean).join(', ') || 'à définir';
    sectionTitle('1. Objet');
    body('Le prestataire s\'engage à fournir une prestation d\'animation DJ, soit :');
    bullet('Lieu de la prestation', lieu);
    bullet('Date de la prestation', this.dateLong(contract.event_date));
    bullet('Détail de la prestation', `animation de l’événement en fournissant une prestation en tant que DJ (${artistName})`);
    bullet('Heures du mandat', contract.schedule || 'à convenir entre les parties');
    y += 3;

    // ── 2. Obligations des parties ──
    sectionTitle('2. Obligations des parties');
    body('Le prestataire s\'engage à mener à bien la tâche précisée dans l\'objet, conformément aux règles de l\'art et de la meilleure manière. Il organise également le transport jusqu\'au lieu de la manifestation.');
    body('Le prestataire se présentera 45 minutes avant le début de sa prestation et s\'adressera au responsable pour l\'installation du matériel.');
    body('Le client s\'engage à mettre à disposition une table.');
    body('Le prestataire viendra avec le matériel suivant : ordinateur, platines et table de mixage.');
    body('Le client peut demander des équipements spécifiques, ce qui risque d\'engendrer des frais supplémentaires à la charge de ce dernier.');
    body('Les frais de logement et de transport sont compris dans l\'offre.');
    y += 3;

    // ── 3. Aspects financiers ──
    sectionTitle('3. Aspects financiers');
    body(`Le client s'engage à verser au prestataire la somme de ${this.fmt(contract.fee)} CHF.`);
    body(`Modalités de paiement : ${contract.payment_terms}.`);
    body(`Versement par virement bancaire sur le compte de : ${ISSUER.payment.beneficiary} — IBAN : ${ISSUER.payment.iban} (${ISSUER.payment.bank}) — ou par Twint au ${ISSUER.phone}.`);
    y += 3;

    // ── 4. Assurances sociales, impôts ──
    sectionTitle('4. Assurances sociales, impôts');
    body('AVS/AI/APG : le client n\'est pas tenu de déclarer cette prestation. Il appartient au prestataire d\'annoncer ses gains à titre de revenu d\'une activité indépendante à une caisse de compensation (directives de l\'AVS sur le salaire déterminant).');
    y += 3;

    // ── 5. Résiliation ──
    sectionTitle('5. Résiliation');
    body(`En cas d'annulation par le client dans les 7 jours précédant l'événement, le client s'engage à verser 50 % du montant cité au point 3, soit ${this.fmt(contract.fee / 2)} CHF.`);
    body('En cas d\'annulation par le prestataire dans les 7 jours, ce dernier s\'engage soit à rembourser la totalité du montant encaissé au moment de l\'annulation, soit à trouver un autre prestataire d\'un niveau équivalent. Le client se réserve le droit de refuser le prestataire proposé.');
    y += 3;

    // ── 6. Clauses particulières (optionnel) ──
    if (contract.clauses?.trim()) {
      sectionTitle('6. Clauses particulières');
      body(contract.clauses.trim());
      y += 3;
    }

    // ── Signatures ──
    ensureSpace(70);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text('Signatures', margin, y);
    y += 8;

    const colW = width / 2 - 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 55);
    doc.text('Le client', margin, y);
    doc.text('Le prestataire', margin + width / 2 + 10, y);
    doc.setDrawColor(160, 160, 175);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 18, margin + colW, y + 18);
    doc.line(margin + width / 2 + 10, y + 18, margin + width / 2 + 10 + colW, y + 18);
    y += 24;

    doc.setFontSize(9);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('« Lu et approuvé »', margin, y);
    doc.text(`Genève, le ${this.dateLong(this.today())}`, margin + width / 2 + 10, y);
    y += 12;

    // ── Attestation OCAS ──
    ensureSpace(35);
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    const attestation = ISSUER.attestation.join(' ') + ' ' + ISSUER.registration.slice(0, 2).join(' · ');
    const attLines = doc.splitTextToSize(attestation, width);
    doc.text(attLines, margin, y);

    // ── Pied de page ──
    doc.setFontSize(7.5);
    doc.text(`${ISSUER.city}  ·  ${ISSUER.ide}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

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
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
