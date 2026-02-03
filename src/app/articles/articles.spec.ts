import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Articles } from './articles';
import {
  ArticlesService,
  ArticleState,
  ArchiveEntry,
  Categorie,
  ShoppingList,
} from './articles.service';

describe('Articles', () => {
  let component: Articles;
  let fixture: ComponentFixture<Articles>;
  let serviceMock: {
    fetchState: jasmine.Spy;
    addArticle: jasmine.Spy;
    removeArticle: jasmine.Spy;
    clearCurrent: jasmine.Spy;
    archiveCurrent: jasmine.Spy;
    clearArchives: jasmine.Spy;
    createList: jasmine.Spy;
    deleteList: jasmine.Spy;
    setActiveList: jasmine.Spy;
    toggleDone: jasmine.Spy;
  };

  const emptyList: ShoppingList = {
    id: 1,
    name: 'Test',
    articlesAlimentaires: [],
    articlesNonAlimentaires: [],
    archives: [] as ArchiveEntry[],
  };

  const emptyState: ArticleState = {
    lists: [emptyList],
    activeListId: emptyList.id,
  };

  beforeEach(async () => {
    serviceMock = {
      fetchState: jasmine.createSpy('fetchState').and.returnValue(of(emptyState)),
      addArticle: jasmine
        .createSpy('addArticle')
        .and.callFake((name: string, category: Categorie) => of(emptyState)),
      removeArticle: jasmine
        .createSpy('removeArticle')
        .and.callFake((name: string, category: Categorie) => of(emptyState)),
      clearCurrent: jasmine.createSpy('clearCurrent').and.returnValue(of(emptyState)),
      archiveCurrent: jasmine.createSpy('archiveCurrent').and.returnValue(of(emptyState)),
      clearArchives: jasmine.createSpy('clearArchives').and.returnValue(of(emptyState)),
      createList: jasmine.createSpy('createList').and.returnValue(of(emptyState)),
      deleteList: jasmine.createSpy('deleteList').and.returnValue(of(emptyState)),
      setActiveList: jasmine.createSpy('setActiveList').and.returnValue(of(emptyState)),
      toggleDone: jasmine
        .createSpy('toggleDone')
        .and.callFake((name: string, category: Categorie) => of(emptyState)),
    };

    await TestBed.configureTestingModule({
      imports: [Articles],
      providers: [{ provide: ArticlesService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Articles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
