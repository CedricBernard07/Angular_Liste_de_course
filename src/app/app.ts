import { Component } from '@angular/core';
import { Articles } from './articles/articles';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Articles],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Liste-de-course';
}

