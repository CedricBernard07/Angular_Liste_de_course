import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articles.html',
  styleUrl: './articles.css' 
})
export class Articles {
  private readonly STORAGE_KEY = 'articles-list';

  newArticle = '';
  category: 'alimentaire' | 'nonAlimentaire' = 'alimentaire';

  articlesAlimentaires: string[] = [];
  articlesNonAlimentaires: string[] = [];

  errorMessage = '';

  constructor() {
    this.loadFromStorage();
  }

  // --- méthode utilitaire : vérifier qu'on est bien dans un navigateur ---
  private canUseStorage(): boolean {
    // typeof est sûr même si window / localStorage n'existent pas
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

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
    this.saveToStorage();
  }

  // méthode pour supprimer un article
  removeArticle(category: 'alimentaire' | 'nonAlimentaire', index: number) {
    if (category === 'alimentaire') {
      this.articlesAlimentaires.splice(index, 1);
    } else {
      this.articlesNonAlimentaires.splice(index, 1);
    }
    this.saveToStorage();
  }

  // méthode pour tout effacer, vider
  clearAll() {
    this.articlesAlimentaires = [];
    this.articlesNonAlimentaires = [];
    this.errorMessage = '';
    this.saveToStorage();
  }

  // --- persistance dans localStorage ---

  private saveToStorage() {
    if (!this.canUseStorage()) return;

    const data = {
      articlesAlimentaires: this.articlesAlimentaires,
      articlesNonAlimentaires: this.articlesNonAlimentaires,
    };
    try {
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // on ignore si le stockage échoue (mode privé, quota, etc.)
    }
  }

  private loadFromStorage() {
    if (!this.canUseStorage()) return;

    const raw = window.localStorage.getItem(this.STORAGE_KEY);
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
}
