import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { VideoManagerComponent } from './video-manager/video-manager.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	// One form, two set-ups: /demo-request saves a demo request (Source Demo), /contact an info request (Source Contact).
	{
		path: 'demo-request',
		loadComponent: () =>
			import('./demo-request/demo-request.component').then((m) => m.DemoRequestComponent),
		data: { requestType: 'demo' },
	},
	{
		path: 'contact',
		loadComponent: () =>
			import('./demo-request/demo-request.component').then((m) => m.DemoRequestComponent),
		data: { requestType: 'info' },
	},
	{
		path: 'overview',
		loadComponent: () =>
			import('./video-overview/video-overview.component').then((m) => m.VideoOverviewComponent),
	},
	{
		path: 'pricing',
		loadComponent: () => import('./pricing/pricing.component').then((m) => m.PricingComponent),
	},
	{ path: 'login', component: LoginComponent },
	{ path: 'video_manager', component: VideoManagerComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: '' },
];
