import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component as Component3D, AttributeType } from '../../simple-engine/core/component';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { EditorComponent } from '../editor.component';
import { ContextMenuService } from '../context-menu/context-menu.service';
import { MaterialInputComponent } from '../property-editor/material-input/material-input.component';

@Component({
    selector: 'app-component',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatIconModule,
        MaterialInputComponent
    ],
    templateUrl: './component.component.html',
    styleUrl: './component.component.scss'
})
export class ComponentComponent implements OnInit, OnChanges {

    @Input() component: Component3D;

    attributes: AttributeType[] = [];
    isEditorComponent: boolean = false;

    constructor(
        private contextMenuService: ContextMenuService
    ) {
    }

    ngOnInit() {
        this.loadAttributes();
    }
    
    ngOnChanges(changes: SimpleChanges) {
        if (changes['component']) {
            this.loadAttributes();
        }
    }

    /**
     * Recarga los atributos del componente
     * Este método puede ser llamado desde fuera para actualizar la UI
     */
    public reloadAttributes() {
        this.loadAttributes();
    }

    private loadAttributes() {
        this.attributes = [];
        if (!this.component) return;
        
        // Verificar si es un componente interno del editor
        this.isEditorComponent = (this.component.constructor as any).isEditorComponent === true;
        
        // Si es un componente interno del editor, no cargar atributos
        if (this.isEditorComponent) return;
        
        for (const key in this.component) {
            const metadata: AttributeType = Reflect.getMetadata("isEditable", this.component, key);
            if (metadata) {
                // Actualizar el valor del metadato con el valor actual del componente
                metadata.value = this.component[key];
                this.attributes.push({ ...metadata, name: key });
            }
        }
    }

    onPropertyChange(value: any, attribute: AttributeType) {
        if (attribute.type === "color") {
            value = "#" + new THREE.Color(value).getHexString();
        }
        this.component.set(attribute.name, value);
        
        // Actualizar el valor en el atributo para mantener la UI sincronizada
        attribute.value = value;
    }
    
    /**
     * Maneja el evento de clic derecho en el componente
     * @param event Evento del mouse
     */
    onContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        
        // Mostrar el menú contextual para el componente
        this.contextMenuService.showContextMenu(event, 'component', this.component);
    }
}
