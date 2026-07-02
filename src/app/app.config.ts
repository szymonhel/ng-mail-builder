import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
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
} from '@ng-icons/lucide';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
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
    }),
  ]
};
