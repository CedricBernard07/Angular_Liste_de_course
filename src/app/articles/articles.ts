import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Categorie = 'alimentaire' | 'nonAlimentaire';

interface ArchiveEntry {
  id: number;                      // identifiant unique (timestamp)
  createdAt: string;               // date ISO
  articlesAlimentaires: string[];
  articlesNonAlimentaires: string[];
}

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articles.html',
  styleUrl: './articles.css' 
})
export class Articles {
  private readonly STORAGE_KEY_CURRENT = 'articles-list';
  private readonly STORAGE_KEY_ARCHIVES = 'articles-archives';

  newArticle = '';
  category: Categorie = 'alimentaire';

  // liste actuelle
  articlesAlimentaires: string[] = [];
  articlesNonAlimentaires: string[] = [];

  // historique de listes archivées
  archives: ArchiveEntry[] = [];

  // false = page principale, true = historique
  showHistory = false;

  errorMessage = '';

  constructor() {
    this.loadCurrentFromStorage();
    this.loadArchivesFromStorage();
  }

  // --- méthode utilitaire : vérifier qu'on est bien dans un navigateur ---
  private canUseStorage(): boolean {
    // typeof est sûr même si window / localStorage n'existent pas
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  // =======================
  //   PAGE PRINCIPALE
  // =======================

  // méthode pour ajouter un article
  addArticle() {
    const article = this.newArticle.trim();

    if (!article) {
      this.errorMessage = '';
      return;
    }

    const articleLower = article.toLowerCase();

    // On vérifie dans les deux listes (doublon global)
    const allArticles = [
      ...this.articlesAlimentaires,
      ...this.articlesNonAlimentaires,
    ];
    const alreadyExists = allArticles.some(
      (a) => a.toLowerCase() === articleLower
    );

    if (alreadyExists) {
      this.errorMessage = 'Cet article est déjà dans la liste.';
      return;
    }

    if (this.category === 'alimentaire') {
      this.articlesAlimentaires.push(article);
    } else {
      this.articlesNonAlimentaires.push(article);
    }

    this.newArticle = '';
    this.errorMessage = '';
    this.saveCurrentToStorage();
  }

  // méthode pour supprimer un article
  removeArticle(category: Categorie, index: number) {
    if (category === 'alimentaire') {
      this.articlesAlimentaires.splice(index, 1);
    } else {
      this.articlesNonAlimentaires.splice(index, 1);
    }
    this.saveCurrentToStorage();
  }

  // méthode pour tout effacer, vider
  clearAll() {
    this.articlesAlimentaires = [];
    this.articlesNonAlimentaires = [];
    this.errorMessage = '';
    this.saveCurrentToStorage();
  }


  // archiver la liste actuelle dans l'historique et vider la liste
  archiveCurrentList() {
    const isEmpty =
      this.articlesAlimentaires.length === 0 &&
      this.articlesNonAlimentaires.length === 0;

    if (isEmpty) {
      this.errorMessage = 'La liste est vide, rien à archiver.';
      return;
    }

    const now = new Date();
    const snapshot: ArchiveEntry = {
      id: now.getTime(),
      createdAt: now.toISOString(),
      articlesAlimentaires: [...this.articlesAlimentaires],
      articlesNonAlimentaires: [...this.articlesNonAlimentaires],
    };

    // on ajoute en tête (les plus récents d'abord)
    this.archives.unshift(snapshot);
    this.saveArchivesToStorage();

    // puis on vide la liste actuelle
    this.clearAll(); // vide + sauvegarde la liste courante
  }

  // vider complètement l'historique des listes archivées
  clearArchives() {
    this.archives = [];
    this.saveArchivesToStorage();
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
  //   PERSISTANCE
  // =======================

  private saveCurrentToStorage() {
    if (!this.canUseStorage()) return;

    const data = {
      articlesAlimentaires: this.articlesAlimentaires,
      articlesNonAlimentaires: this.articlesNonAlimentaires,
    };
    try {
      window.localStorage.setItem(this.STORAGE_KEY_CURRENT, JSON.stringify(data));
    } catch {
      // on ignore si le stockage échoue (mode privé, quota, etc.)
    }
  }

  private loadCurrentFromStorage() {
    if (!this.canUseStorage()) return;

    const raw = window.localStorage.getItem(this.STORAGE_KEY_CURRENT);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      this.articlesAlimentaires = Array.isArray(data.articlesAlimentaires)
        ? data.articlesAlimentaires
        : [];
      this.articlesNonAlimentaires = Array.isArray(data.articlesNonAlimentaires)
        ? data.articlesNonAlimentaires
        : [];
    } catch {
      this.articlesAlimentaires = [];
      this.articlesNonAlimentaires = [];
    }
  }

  private saveArchivesToStorage() {
    if (!this.canUseStorage()) return;

    try {
      window.localStorage.setItem(this.STORAGE_KEY_ARCHIVES, JSON.stringify(this.archives));
    } catch {
      // ignore erreur
    }
  }

  private loadArchivesFromStorage() {
    if (!this.canUseStorage()) return;

    const raw = window.localStorage.getItem(this.STORAGE_KEY_ARCHIVES);
    if (!raw) {
      this.archives = [];
      return;
    }

    try {
      const data = JSON.parse(raw);
      this.archives = Array.isArray(data) ? data : [];
    } catch {
      this.archives = [];
    }
  }
}
