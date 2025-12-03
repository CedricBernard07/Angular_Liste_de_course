import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type Categorie = 'alimentaire' | 'nonAlimentaire';

export interface ArticleItem {
  name: string;
  done: boolean;
}

export interface ArchiveEntry {
  id: number;
  createdAt: string;
  articlesAlimentaires: ArticleItem[];
  articlesNonAlimentaires: ArticleItem[];
}

export interface ArticleState {
  articlesAlimentaires: ArticleItem[];
  articlesNonAlimentaires: ArticleItem[];
  archives: ArchiveEntry[];
}

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly baseUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  fetchState(): Observable<ArticleState> {
    return this.http.get<ArticleState>(`${this.baseUrl}/lists`);
  }

  addArticle(name: string, category: Categorie): Observable<ArticleState> {
    return this.http.post<ArticleState>(`${this.baseUrl}/articles`, { name, category });
  }

  removeArticle(name: string, category: Categorie): Observable<ArticleState> {
    return this.http.request<ArticleState>('delete', `${this.baseUrl}/articles`, {
      body: { name, category },
    });
  }

  clearCurrent(): Observable<ArticleState> {
    return this.http.delete<ArticleState>(`${this.baseUrl}/current`);
  }

  archiveCurrent(): Observable<ArticleState> {
    return this.http.post<ArticleState>(`${this.baseUrl}/archive`, {});
  }

  toggleDone(name: string, category: Categorie): Observable<ArticleState> {
    return this.http.patch<ArticleState>(`${this.baseUrl}/articles/toggle`, { name, category });
  }

  clearArchives(): Observable<ArticleState> {
    return this.http.delete<ArticleState>(`${this.baseUrl}/archives`);
  }
}
