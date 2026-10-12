import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Public pricing, mirrored from the AssignPros site's Pricing page (same prices, this site's look).
@Component({
  selector: 'app-pricing',
  imports: [RouterLink],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent {}
