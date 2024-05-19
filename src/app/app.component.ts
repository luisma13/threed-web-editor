import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GameObjectsDatabase } from './editor/draggable-tree-gameobjects/draggable-tree-gameobjects.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [GameObjectsDatabase]
})
export class AppComponent {
  title = 'threed-web-editor';
}
