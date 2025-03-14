import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameObject } from '../../simple-engine/core/gameobject';
import { Action } from '../history/actions/actions';

/**
 * Service to handle events between EditorService and HistoryService
 * This service breaks the circular dependency between them
 */
@Injectable({
  providedIn: 'root'
})
export class EditorEventsService {
  // Event for transform changes
  private transformChangeSubject = new Subject<any>();
  transformChange$ = this.transformChangeSubject.asObservable();
  
  // Selected object
  private selectedObjectSubject = new BehaviorSubject<GameObject | null>(null);
  selectedObject$ = this.selectedObjectSubject.asObservable();
  
  // Action events
  private actionSubject = new Subject<Action<any>>();
  action$ = this.actionSubject.asObservable();
  
  // Scene change events
  private sceneChangeSubject = new Subject<void>();
  sceneChange$ = this.sceneChangeSubject.asObservable();
  
  constructor() { }
  
  /**
   * Emit a transform change event
   * @param data Transform data
   */
  emitTransformChange(data: any): void {
    this.transformChangeSubject.next(data);
  }
  
  /**
   * Set the selected object
   * @param gameObject The selected GameObject
   */
  setSelectedObject(gameObject: GameObject | null): void {
    this.selectedObjectSubject.next(gameObject);
  }
  
  /**
   * Emit an action event
   * @param action The action to emit
   */
  emitAction(action: Action<any>): void {
    this.actionSubject.next(action);
  }
  
  /**
   * Emit a scene change event
   * This is used to notify components that the scene hierarchy has changed
   */
  emitSceneChanged(): void {
    this.sceneChangeSubject.next();
  }
} 