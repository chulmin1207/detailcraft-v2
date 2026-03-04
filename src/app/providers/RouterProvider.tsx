import { createBrowserRouter, RouterProvider as ReactRouterProvider } from 'react-router-dom';
import { AppLayout } from '@/widgets/header/ui/AppLayout';
import { HomePage } from '@/pages/home';
import { AboutPage } from '@/pages/about';

const basename = import.meta.env.BASE_URL;

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
    ],
  },
], { basename });

export function RouterProvider() {
  return <ReactRouterProvider router={router} />;
}
