import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import 'zone.js'; // Polyfill requerido para cambio de estado en Angular

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
