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
  ShoppingList,
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
  newListName = '';
  category: Categorie = 'alimentaire';
  private hasLoaded = false;

  // listes disponibles
  lists: ShoppingList[] = [];
  activeListId: number | null = null;
  activeList: ShoppingList | null = null;

  // historique de listes archivees
  archives: ArchiveEntry[] = [];

  // false = page principale, true = historique
  showHistory = false;

  errorMessage = '';
  listErrorMessage = '';
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
    const activeList = this.getActiveList();

    if (!article) {
      this.errorMessage = '';
      return;
    }

    if (!activeList) {
      this.errorMessage = 'Creez ou selectionnez une liste avant d\'ajouter un article.';
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
    const activeList = this.getActiveList();

    if (!activeList) {
      this.errorMessage = 'Creez ou selectionnez une liste avant d\'archiver.';
      return;
    }

    const isEmpty =
      activeList.articlesAlimentaires.length === 0 && activeList.articlesNonAlimentaires.length === 0;

    if (isEmpty) {
      this.errorMessage = 'La liste est vide, rien a archiver.';
      return;
    }

    this.perform(this.articlesService.archiveCurrent());
  }

  clearArchives() {
    this.perform(this.articlesService.clearArchives());
  }

  createList() {
    const name = this.newListName.trim();

    if (!name) {
      this.listErrorMessage = 'Veuillez entrer un nom de liste.';
      return;
    }

    this.perform(this.articlesService.createList(name), {
      resetListInput: true,
      errorTarget: 'list',
    });
  }

  selectList(listId: number) {
    if (!this.hasLoaded) {
      this.refreshFromServer(() => this.selectList(listId));
      return;
    }

    if (this.activeListId === listId) {
      return;
    }

    this.perform(this.articlesService.setActiveList(listId));
  }

  deleteList(listId: number, event?: MouseEvent) {
    event?.stopPropagation();

    if (!this.hasLoaded) {
      this.refreshFromServer(() => this.deleteList(listId));
      return;
    }

    this.perform(this.articlesService.deleteList(listId), {
      errorTarget: 'list',
    });
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
    this.lists = state.lists ?? [];
    this.activeListId =
      typeof state.activeListId === 'number'
        ? state.activeListId
        : this.lists.length > 0
          ? this.lists[0].id
          : null;
    this.activeList = this.getActiveList();
    this.archives = this.activeList?.archives ?? [];
    this.errorMessage = '';
    this.listErrorMessage = '';
  }

  private perform(
    action: Observable<ArticleState>,
    options: {
      resetInput?: boolean;
      resetListInput?: boolean;
      onSuccess?: () => void;
      errorTarget?: 'main' | 'list';
    } = {},
  ) {
    this.loading = true;
    action.subscribe({
      next: (state) => {
        this.applyState(state as ArticleState);
        if (options.resetInput) {
          this.newArticle = '';
        }
        if (options.resetListInput) {
          this.newListName = '';
        }
        options.onSuccess?.();
        // force la vue a prendre les valeurs appliquees (notamment newArticle vide)
        this.cdr.detectChanges();
        this.loading = false;
      },
      error: (error) => {
        const apiMessage = error?.error?.message;
        const message =
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Erreur lors de la communication avec le serveur.';
        if (options.errorTarget === 'list') {
          this.listErrorMessage = message;
          this.errorMessage = '';
        } else {
          this.errorMessage = message;
          this.listErrorMessage = '';
        }
        this.loading = false;
      },
    });
  }

  private getActiveList(): ShoppingList | null {
    return this.lists.find((list) => list.id === this.activeListId) ?? null;
  }
}
