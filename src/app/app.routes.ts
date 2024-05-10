import { Routes } from '@angular/router';
import { EditorComponent } from './editor/editor.component';
import { ViewerComponent } from './viewer/viewer.component';
import { ViewerXRComponent } from './viewerXR/viewer-xr.component';

export const routes: Routes = [
    {
        path: '',
        component: ViewerComponent
    },
    {
        path: 'xr',
        component: ViewerXRComponent
    },
    {
        path: 'editor',
        component: EditorComponent
    }
];
