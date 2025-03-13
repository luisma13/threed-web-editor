import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialInputComponent } from './material-input/material-input.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialInputComponent
  ],
  exports: [
    MaterialInputComponent
  ],
  declarations: []
})
export class PropertyEditorModule { } 