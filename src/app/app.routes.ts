import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { VideoManagerComponent } from './video-manager/video-manager.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'video_manager', component: VideoManagerComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: '' },
];
