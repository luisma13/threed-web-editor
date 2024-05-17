import { Component, OnInit } from "@angular/core";
import { EditorService } from "../editor.service";
import { CommonModule } from "@angular/common";

interface MenuItem {
    label: string;
    action?: () => void;
    disabled?: boolean;
    submenu?: MenuItem[];
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

    ngOnInit(): void {
        
    }

}