import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { NewsletterStore } from './newsletter.store';
import { NewsletterContact, Newsletter, NEWSLETTER_TEMPLATES } from './newsletter.model';
import { ContactDialogComponent } from './components/contact-dialog/contact-dialog.component';
import { NewsletterEditorComponent } from './components/newsletter-editor/newsletter-editor.component';
import { ImportContactsDialogComponent } from './components/import-contacts-dialog/import-contacts-dialog.component';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [
    FormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatChipsModule,
  ],
  providers: [NewsletterStore],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsletterComponent implements OnInit {
  readonly store = inject(NewsletterStore);
  private readonly dialog = inject(MatDialog);
  readonly templates = NEWSLETTER_TEMPLATES;

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
    this.store.loadAll();
  }

  // ── Contact actions ──
  onAddContact(): void {
    const ref = this.dialog.open(ContactDialogComponent, {
      width: '450px',
      data: { mode: 'create' },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        const created = await this.store.addContact(result);
        if (created) this.showNotification('success', `${created.email} ajouté !`);
      }
    });
  }

  onImportContacts(): void {
    const ref = this.dialog.open(ImportContactsDialogComponent, {
      width: '500px',
    });
    ref.afterClosed().subscribe(async (contacts) => {
      if (contacts?.length) {
        const count = await this.store.importContacts(contacts);
        this.showNotification('success', `${count} contacts importés !`);
      }
    });
  }

  async onDeleteContact(contact: NewsletterContact): Promise<void> {
    if (!confirm(`Supprimer ${contact.email} ?`)) return;
    await this.store.deleteContact(contact.id);
  }

  // ── Newsletter actions ──
  onCreateNewsletter(): void {
    const ref = this.dialog.open(NewsletterEditorComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { mode: 'create' },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.createNewsletter(result);
        this.showNotification('success', 'Newsletter créée !');
      }
    });
  }

  onEditNewsletter(newsletter: Newsletter): void {
    const ref = this.dialog.open(NewsletterEditorComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { mode: 'edit', newsletter },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.updateNewsletter(newsletter.id, result);
        this.showNotification('success', 'Newsletter mise à jour !');
      }
    });
  }

  async onDeleteNewsletter(newsletter: Newsletter): Promise<void> {
    if (!confirm(`Supprimer "${newsletter.subject}" ?`)) return;
    await this.store.deleteNewsletter(newsletter.id);
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-CH', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Brouillon',
      scheduled: 'Planifiée',
      sending: 'En cours',
      sent: 'Envoyée',
      active: 'Actif',
      unsubscribed: 'Désabonné',
      bounced: 'Bounce',
    };
    return map[status] ?? status;
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 3000);
  }
}
