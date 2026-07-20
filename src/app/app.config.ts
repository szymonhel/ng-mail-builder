import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAuth0, authHttpInterceptorFn } from '@auth0/auth0-angular';
import { provideIcons } from '@ng-icons/core';
import {
  lucideType,
  lucideImage,
  lucideRectangleHorizontal,
  lucideMinus,
  lucideArrowUpDown,
  lucideHeading,
  lucideLink,
  lucideVideo,
  lucideCode2,
  lucideSunrise,
  lucideTable,
  lucideRows3,
  lucideMenu,
  lucideGalleryHorizontal,
  lucidePanelTop,
  lucidePanelBottom,
  lucideLayoutGrid,
  lucideMessageSquare,
  lucideColumns2,
  lucideDollarSign,
  lucideShoppingCart,
  lucideBarChart3,
  lucideUndo2,
  lucideRedo2,
  lucideBookmark,
} from '@ng-icons/lucide';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: document.baseURI,
        audience: environment.auth0.audience,
      },
      httpInterceptor: {
        // Attach the Auth0 access token to every call to our API
        allowedList: [`${environment.apiUrl}/*`],
      },
    }),
    provideIcons({
      lucideType,
      lucideImage,
      lucideRectangleHorizontal,
      lucideMinus,
      lucideArrowUpDown,
      lucideHeading,
      lucideLink,
      lucideVideo,
      lucideCode2,
      lucideSunrise,
      lucideTable,
      lucideRows3,
      lucideMenu,
      lucideGalleryHorizontal,
      lucidePanelTop,
      lucidePanelBottom,
      lucideLayoutGrid,
      lucideMessageSquare,
      lucideColumns2,
      lucideDollarSign,
      lucideShoppingCart,
      lucideBarChart3,
      lucideUndo2,
      lucideRedo2,
      lucideBookmark,
    }),
  ]
};
