import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  ArchiveEntry,
  ArticleItem,
  ArticleState,
  ArticlesService,
  Categorie,
} from './articles.service';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './articles.html',
  styleUrl: './articles.css',
})
export class Articles implements OnInit, AfterViewInit {
  newArticle = '';
  category: Categorie = 'alimentaire';
  private hasLoaded = false;

  // liste actuelle
  articlesAlimentaires: ArticleItem[] = [];
  articlesNonAlimentaires: ArticleItem[] = [];

  // historique de listes archivees
  archives: ArchiveEntry[] = [];

  // false = page principale, true = historique
  showHistory = false;

  errorMessage = '';
  loading = false;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private readonly articlesService: ArticlesService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshFromServer();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // planifie un chargement apres hydratation pour s'assurer que la liste arrive sans interaction
      setTimeout(() => this.refreshFromServer(), 0);
    }
  }

  // =======================
  //   PAGE PRINCIPALE
  // =======================

  addArticle() {
    const article = this.newArticle.trim();

    if (!article) {
      this.errorMessage = '';
      return;
    }

    if (!this.hasLoaded) {
      this.refreshFromServer(() => this.addArticle());
      return;
    }

    this.perform(this.articlesService.addArticle(article, this.category), { resetInput: true });
  }

  removeArticle(category: Categorie, item: ArticleItem) {
    this.perform(this.articlesService.removeArticle(item.name, category));
  }

  toggleDone(category: Categorie, item: ArticleItem) {
    this.perform(this.articlesService.toggleDone(item.name, category));
  }

  clearAll() {
    this.perform(this.articlesService.clearCurrent());
  }

  archiveCurrentList() {
    const isEmpty =
      this.articlesAlimentaires.length === 0 && this.articlesNonAlimentaires.length === 0;

    if (isEmpty) {
      this.errorMessage = 'La liste est vide, rien a archiver.';
      return;
    }

    this.perform(this.articlesService.archiveCurrent());
  }

  clearArchives() {
    this.perform(this.articlesService.clearArchives());
  }

  // =======================
  //   NAVIGATION SIMPLE
  // =======================

  goToHistory() {
    this.showHistory = true;
  }

  goToCurrent() {
    this.showHistory = false;
  }

  // =======================
  //   UTILITAIRES
  // =======================

  private refreshFromServer(onSuccess?: () => void) {
    this.perform(this.articlesService.fetchState(), {
      onSuccess: () => {
        this.hasLoaded = true;
        onSuccess?.();
      },
    });
  }

  private applyState(state: ArticleState) {
    this.articlesAlimentaires = state.articlesAlimentaires;
    this.articlesNonAlimentaires = state.articlesNonAlimentaires;
    this.archives = state.archives;
    this.errorMessage = '';
  }

  private perform(
    action: Observable<ArticleState>,
    options: { resetInput?: boolean; onSuccess?: () => void } = {},
  ) {
    this.loading = true;
    action.subscribe({
      next: (state) => {
        this.applyState(state as ArticleState);
        if (options.resetInput) {
          this.newArticle = '';
        }
        options.onSuccess?.();
        // force la vue a prendre les valeurs appliquees (notamment newArticle vide)
        this.cdr.detectChanges();
        this.loading = false;
      },
      error: (error) => {
        const apiMessage = error?.error?.message;
        this.errorMessage =
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Erreur lors de la communication avec le serveur.';
        this.loading = false;
      },
    });
  }
}
